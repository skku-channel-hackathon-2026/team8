import {
  CHARGE_PACKS,
  ChargeInputSchema,
  ChatHistoryInputSchema,
  ChatMessageSchema,
  MeetRequestSchema,
  RoomSchema,
  SendChatInputSchema,
  TaskSchema,
  type ChatMessage,
  type LedgerEntry,
} from "@tutorial/shared";
import { addLeaves, getRecord, listRecords, putRecord } from "./records.js";

/**
 * 채팅과 은행잎 충전.
 *
 * 채팅은 **그 대화에 속한 사람만** 읽고 쓴다. chatId를 지어내 남의 대화를
 * 엿보지 못하게, 대화별로 소속을 확인한다.
 *
 * 충전은 잔액을 늘리므로 지급량을 서버가 정한다. 요청은 상품 번호만 보낸다.
 */

export class ChatError extends Error {
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

/**
 * 이 사람이 그 대화에 들어갈 수 있는지 본다.
 *   dm:<상대>   서로 수락한 신청이 있어야 한다
 *   room:<방>   그 방의 멤버여야 한다
 *   task:<부탁> 요청자이거나 작업자여야 한다
 */
async function canJoinChat(
  userId: string,
  channelId: string,
  chatId: string,
): Promise<boolean> {
  const separator = chatId.indexOf(":");
  const kind = chatId.slice(0, separator);
  const target = chatId.slice(separator + 1);

  if (kind === "room") {
    const room = RoomSchema.safeParse(await getRecord<unknown>("room", target));
    return (
      room.success &&
      room.data.channelId === channelId &&
      room.data.memberIds.includes(userId)
    );
  }

  if (kind === "task") {
    const task = TaskSchema.safeParse(await getRecord<unknown>("task", target));
    return (
      task.success &&
      task.data.channelId === channelId &&
      (task.data.requesterId === userId || task.data.workerId === userId)
    );
  }

  // dm: 둘 사이에 수락된 신청이 있을 때만 열린다.
  for (const row of await listRecords<unknown>("request")) {
    const parsed = MeetRequestSchema.safeParse(row);
    if (!parsed.success) continue;
    const request = parsed.data;
    if (request.channelId !== channelId) continue;
    if (request.kind !== "dm" || request.status !== "accepted") continue;
    const pair =
      (request.fromId === userId && request.toId === target) ||
      (request.toId === userId && request.fromId === target);
    if (pair) return true;
  }
  return false;
}

export async function readChat(
  userId: string,
  channelId: string,
  body: unknown,
): Promise<{ messages: ChatMessage[] }> {
  const input = ChatHistoryInputSchema.safeParse(body);
  if (!input.success) throw new ChatError("bad_request", 400);
  if (!(await canJoinChat(userId, channelId, input.data.chatId))) {
    throw new ChatError("forbidden", 403);
  }

  const messages: ChatMessage[] = [];
  for (const row of await listRecords<unknown>("chat")) {
    const parsed = ChatMessageSchema.safeParse(row);
    if (!parsed.success) continue;
    if (parsed.data.channelId !== channelId) continue;
    if (parsed.data.chatId !== input.data.chatId) continue;
    messages.push(parsed.data);
  }
  messages.sort((a, b) => a.at - b.at);
  return { messages };
}

export async function sendChat(
  userId: string,
  channelId: string,
  body: unknown,
): Promise<{ message: ChatMessage }> {
  const input = SendChatInputSchema.safeParse(body);
  if (!input.success) throw new ChatError("bad_request", 400);
  if (!(await canJoinChat(userId, channelId, input.data.chatId))) {
    throw new ChatError("forbidden", 403);
  }

  const message: ChatMessage = {
    id: newId("msg"),
    channelId,
    chatId: input.data.chatId,
    senderId: userId,
    text: input.data.text,
    at: Date.now(),
  };
  await putRecord("chat", message.id, message);
  return { message };
}

export async function charge(
  userId: string,
  body: unknown,
): Promise<{ leaves: number; amount: number; price: number }> {
  const input = ChargeInputSchema.safeParse(body);
  if (!input.success) throw new ChatError("bad_request", 400);

  // 지급량은 상품표에서 읽는다. 요청이 금액을 정하지 못한다.
  const pack = CHARGE_PACKS[input.data.packIndex];
  const leaves = await addLeaves(userId, pack.amount);
  if (leaves === null) throw new ChatError("not_signed_up", 404);

  const entry: LedgerEntry = {
    id: newId("lg"),
    userId,
    delta: pack.amount,
    label: `은행잎 충전 · ${pack.price.toLocaleString("ko-KR")}원`,
    at: Date.now(),
  };
  await putRecord("ledger", entry.id, entry);
  return { leaves, amount: pack.amount, price: pack.price };
}

/** 내 적립·사용 내역. */
export async function listLedger(userId: string): Promise<LedgerEntry[]> {
  const entries: LedgerEntry[] = [];
  for (const row of await listRecords<unknown>("ledger")) {
    const entry = row as LedgerEntry;
    if (entry && entry.userId === userId) entries.push(entry);
  }
  entries.sort((a, b) => b.at - a.at);
  return entries;
}
