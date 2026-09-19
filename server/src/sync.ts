import {
  ChatMessageSchema,
  ProfileSchema,
  type ChatMessage,
  type Peer,
  type Profile,
  type Snapshot,
} from "@tutorial/shared";
import { listLedger, viewChatId } from "./chat.js";
import { listRooms, listRequests } from "./meet.js";
import { listMissions, listSubmissions } from "./missions.js";
import { listTasks } from "./market.js";
import { listRecords } from "./records.js";

/**
 * 한 사람이 지금 볼 수 있는 모든 것을 한 번에 담는다.
 *
 * 화면이 다섯 개라고 목록을 다섯 번 부르면, 몇 초마다 새로 고칠 때
 * 요청이 눈덩이처럼 불어난다. 대신 한 응답에 모아 보낸다.
 *
 * 무엇을 담을지는 목록 함수들이 이미 정한 규칙을 그대로 따른다.
 * 남의 신청, 남의 인증, 내가 못 들어가는 대화는 여기에도 담기지 않는다.
 */

export function toPeer(profile: Profile): Peer {
  const {
    managerId: _m,
    channelId: _c,
    leaves: _l,
    createdAt: _t,
    ...peer
  } = profile;
  return peer;
}

/** 같은 채널에서 공강을 공개한 사람들. 나는 뺀다. */
export async function listStudents(
  userId: string,
  channelId: string,
): Promise<Peer[]> {
  const peers: Peer[] = [];
  for (const row of await listRecords<unknown>("user")) {
    const parsed = ProfileSchema.safeParse(row);
    if (!parsed.success) continue;
    if (parsed.data.channelId !== channelId) continue;
    if (!parsed.data.showFree) continue;
    if (parsed.data.id === userId) continue;
    peers.push(toPeer(parsed.data));
  }
  return peers;
}

/**
 * 내가 들어갈 수 있는 대화의 저장된 이름들.
 *
 * chat.ts의 canJoinChat을 대화마다 부르면 그때마다 목록을 다시 읽는다.
 * 여기서는 같은 규칙을 한 번에 적용한다.
 */
function myChatIds(
  userId: string,
  rooms: { id: string; memberIds: string[] }[],
  tasks: { id: string; requesterId: string; workerId: string | null }[],
  requests: {
    kind: string;
    status: string;
    fromId: string;
    toId: string;
  }[],
): Set<string> {
  const ids = new Set<string>();
  for (const room of rooms) {
    if (room.memberIds.includes(userId)) ids.add(`room:${room.id}`);
  }
  for (const task of tasks) {
    if (task.requesterId === userId || task.workerId === userId) {
      ids.add(`task:${task.id}`);
    }
  }
  for (const request of requests) {
    if (request.kind !== "dm" || request.status !== "accepted") continue;
    const other =
      request.fromId === userId
        ? request.toId
        : request.toId === userId
          ? request.fromId
          : null;
    if (other) ids.add(`dm:${[userId, other].sort().join("|")}`);
  }
  return ids;
}

export async function buildSnapshot(
  userId: string,
  channelId: string,
): Promise<Snapshot> {
  const stored = await listRecords<unknown>("user");
  let profile: Profile | null = null;
  for (const row of stored) {
    const parsed = ProfileSchema.safeParse(row);
    if (parsed.success && parsed.data.id === userId) profile = parsed.data;
  }

  const [students, missions, submissions, rooms, requests, tasks, ledger] =
    await Promise.all([
      listStudents(userId, channelId),
      listMissions(channelId),
      listSubmissions(userId, channelId),
      listRooms(channelId),
      listRequests(userId, channelId),
      listTasks(channelId),
      listLedger(userId),
    ]);

  const mine = myChatIds(userId, rooms, tasks, requests);
  const messages: ChatMessage[] = [];
  for (const row of await listRecords<unknown>("chat")) {
    const parsed = ChatMessageSchema.safeParse(row);
    if (!parsed.success) continue;
    if (parsed.data.channelId !== channelId) continue;
    if (!mine.has(parsed.data.chatId)) continue;
    // 저장된 이름은 1대1일 때 두 사람 id를 합친 꼴이라, 보는 사람 기준으로 되돌린다.
    messages.push({
      ...parsed.data,
      chatId: viewChatId(userId, parsed.data.chatId),
    });
  }
  // 같은 밀리초에 들어온 두 메시지의 순서가 뒤집히지 않게 id로 갈음한다.
  messages.sort((a, b) => a.at - b.at || (a.id < b.id ? -1 : 1));

  return {
    profile,
    students,
    missions,
    submissions,
    rooms,
    requests,
    tasks,
    ledger,
    messages,
  };
}
