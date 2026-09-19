import {
  InviteInputSchema,
  MeetRequestSchema,
  RespondRequestInputSchema,
  RoomDraftSchema,
  RoomIdInputSchema,
  RoomSchema,
  SendDmInputSchema,
  type MeetRequest,
  type Room,
} from "@tutorial/shared";
import {
  getRecord,
  joinRoomSlot,
  listRecords,
  putRecord,
  replaceIfStatus,
} from "./records.js";

/**
 * 만남 신청과 모임방.
 *
 * 신청을 받을지는 **받는 사람**이 정하고, 그 결과가 보낸 사람 화면을 바꾼다.
 * 모임 자리는 먼저 누른 사람이 가져간다. 둘 다 클라이언트가 알 수 없는
 * 판정이라 서버에서 한다.
 */

export class MeetError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
  ) {
    super(code);
  }
}

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function parseAll<T extends { channelId: string }>(
  rows: unknown[],
  schema: { safeParse(v: unknown): { success: boolean; data?: T } },
  channelId: string,
): T[] {
  const kept: T[] = [];
  for (const row of rows) {
    const parsed = schema.safeParse(row);
    if (parsed.success && parsed.data && parsed.data.channelId === channelId) {
      kept.push(parsed.data);
    }
  }
  return kept;
}

async function loadRoom(roomId: string): Promise<Room> {
  const parsed = RoomSchema.safeParse(await getRecord<unknown>("room", roomId));
  if (!parsed.success) throw new MeetError("room_not_found", 404);
  return parsed.data;
}

export async function listRooms(channelId: string): Promise<Room[]> {
  const rooms = parseAll<Room>(
    await listRecords<unknown>("room"),
    RoomSchema,
    channelId,
  );
  rooms.sort((a, b) => b.createdAt - a.createdAt);
  return rooms;
}

/** 나와 관련된 신청만 돌려준다. 남들끼리 주고받은 것은 보이지 않는다. */
export async function listRequests(
  userId: string,
  channelId: string,
): Promise<MeetRequest[]> {
  const all = parseAll<MeetRequest>(
    await listRecords<unknown>("request"),
    MeetRequestSchema,
    channelId,
  );
  const mine = all.filter((r) => r.fromId === userId || r.toId === userId);
  mine.sort((a, b) => b.createdAt - a.createdAt);
  return mine;
}

export async function sendDm(
  userId: string,
  channelId: string,
  body: unknown,
): Promise<{ request: MeetRequest }> {
  const input = SendDmInputSchema.safeParse(body);
  if (!input.success) throw new MeetError("bad_request", 400);
  if (input.data.toId === userId) throw new MeetError("forbidden", 403);

  // 같은 사람에게 이미 보낸 신청이 대기 중이면 또 보내지 못한다.
  const pending = (await listRequests(userId, channelId)).some(
    (r) =>
      r.kind === "dm" &&
      r.fromId === userId &&
      r.toId === input.data.toId &&
      r.status === "pending",
  );
  if (pending) throw new MeetError("already_requested", 409);

  const request: MeetRequest = {
    id: newId("q"),
    channelId,
    kind: "dm",
    fromId: userId,
    toId: input.data.toId,
    roomId: null,
    theme: input.data.theme,
    message: input.data.message,
    status: "pending",
    createdAt: Date.now(),
    resolvedAt: null,
  };
  await putRecord("request", request.id, request);
  return { request };
}

export async function createRoom(
  userId: string,
  channelId: string,
  body: unknown,
): Promise<{ room: Room }> {
  const draft = RoomDraftSchema.safeParse(body);
  if (!draft.success) throw new MeetError("bad_request", 400);

  const room: Room = {
    ...draft.data,
    id: newId("r"),
    channelId,
    hostId: userId,
    memberIds: [userId],
    createdAt: Date.now(),
  };
  await putRecord("room", room.id, room);
  return { room };
}

export async function joinRoom(
  userId: string,
  body: unknown,
): Promise<{ room: Room }> {
  const input = RoomIdInputSchema.safeParse(body);
  if (!input.success) throw new MeetError("bad_request", 400);

  const room = await loadRoom(input.data.roomId);
  const members = await joinRoomSlot(room.id, userId);
  // 정원이 찼거나 이미 들어와 있으면 자리를 얻지 못한다.
  if (!members) throw new MeetError("room_full", 409);
  return { room: { ...room, memberIds: members } };
}

export async function leaveRoom(
  userId: string,
  body: unknown,
): Promise<{ room: Room | null }> {
  const input = RoomIdInputSchema.safeParse(body);
  if (!input.success) throw new MeetError("bad_request", 400);

  const room = await loadRoom(input.data.roomId);
  if (!room.memberIds.includes(userId)) throw new MeetError("forbidden", 403);

  const memberIds = room.memberIds.filter((id) => id !== userId);
  const next = { ...room, memberIds };
  await putRecord("room", room.id, next);
  // 아무도 남지 않은 방은 목록에서 비워 둔다.
  return { room: memberIds.length > 0 ? next : null };
}

export async function invite(
  userId: string,
  channelId: string,
  body: unknown,
): Promise<{ requests: MeetRequest[] }> {
  const input = InviteInputSchema.safeParse(body);
  if (!input.success) throw new MeetError("bad_request", 400);

  const room = await loadRoom(input.data.roomId);
  if (!room.memberIds.includes(userId)) throw new MeetError("forbidden", 403);

  const already = new Set(
    (await listRequests(userId, channelId))
      .filter((r) => r.roomId === room.id && r.fromId === userId)
      .map((r) => r.toId),
  );
  const targets = input.data.toIds.filter(
    (id) => id !== userId && !already.has(id) && !room.memberIds.includes(id),
  );

  const requests: MeetRequest[] = [];
  for (const toId of targets) {
    const request: MeetRequest = {
      id: newId("q"),
      channelId,
      kind: "room",
      fromId: userId,
      toId,
      roomId: room.id,
      theme: room.theme,
      message: room.title,
      status: "pending",
      createdAt: Date.now(),
      resolvedAt: null,
    };
    await putRecord("request", request.id, request);
    requests.push(request);
  }
  return { requests };
}

export async function respondRequest(
  userId: string,
  body: unknown,
): Promise<{ request: MeetRequest; room: Room | null }> {
  const input = RespondRequestInputSchema.safeParse(body);
  if (!input.success) throw new MeetError("bad_request", 400);

  const parsed = MeetRequestSchema.safeParse(
    await getRecord<unknown>("request", input.data.requestId),
  );
  if (!parsed.success) throw new MeetError("request_not_found", 404);
  const request = parsed.data;

  // 받은 사람만 답한다.
  if (request.toId !== userId) throw new MeetError("forbidden", 403);
  if (request.status !== "pending") {
    throw new MeetError("request_changed", 409);
  }

  const next: MeetRequest = {
    ...request,
    status: input.data.accept ? "accepted" : "declined",
    resolvedAt: Date.now(),
  };
  const moved = await replaceIfStatus("request", request.id, "pending", next);
  if (!moved) throw new MeetError("request_changed", 409);

  if (!input.data.accept || request.kind !== "room" || !request.roomId) {
    return { request: next, room: null };
  }

  // 초대를 수락했으면 자리를 잡는다. 그새 방이 찼을 수도 있다.
  const room = await loadRoom(request.roomId);
  const members = await joinRoomSlot(room.id, userId);
  return {
    request: next,
    room: members ? { ...room, memberIds: members } : null,
  };
}
