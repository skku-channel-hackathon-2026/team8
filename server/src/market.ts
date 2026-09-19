import {
  TaskDraftSchema,
  TaskIdInputSchema,
  TaskSchema,
  type LedgerEntry,
  type Task,
} from "@tutorial/shared";
import {
  addLeaves,
  getRecord,
  listRecords,
  putRecord,
  replaceIfStatus,
} from "./records.js";

/**
 * 공강 마켓.
 *
 * 부탁을 누가 맡는지, 보수가 언제 움직이는지는 **서버가 판정한다.** 화면은
 * 결과를 반영만 한다. 두 사람이 같은 부탁을 동시에 누르면 한 명만 맡아야
 * 하는데, 클라이언트는 그걸 알 방법이 없기 때문이다.
 *
 * 상태 전이는 모두 조건부 갱신이라, 그 사이 남이 먼저 바꿨으면 실패한다.
 *   open -> assigned   (맡기, 요청자 본인은 못 맡음)
 *   assigned -> reported  (작업자가 완료 보고)
 *   reported -> completed (요청자가 확정, 이때 보수가 작업자에게 간다)
 *   open -> cancelled     (요청자가 취소, 예치금 환불)
 */

export class MarketError extends Error {
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

/** 원장은 추가만 한다. 잔액은 이미 SQL 안에서 움직인 뒤다. */
async function record(
  userId: string,
  delta: number,
  label: string,
): Promise<void> {
  const entry: LedgerEntry = {
    id: newId("lg"),
    userId,
    delta,
    label,
    at: Date.now(),
  };
  await putRecord("ledger", entry.id, entry);
}

async function loadTask(taskId: string): Promise<Task> {
  const stored = await getRecord<unknown>("task", taskId);
  if (!stored) throw new MarketError("task_not_found", 404);
  const parsed = TaskSchema.safeParse(stored);
  if (!parsed.success) throw new MarketError("task_not_found", 404);
  return parsed.data;
}

/** 상태를 옮긴다. 그 사이 남이 먼저 바꿨으면 task_changed로 거절한다. */
async function transition(task: Task, next: Task): Promise<Task> {
  const moved = await replaceIfStatus("task", task.id, task.status, next);
  if (!moved) throw new MarketError("task_changed", 409);
  return next;
}

export async function listTasks(channelId: string): Promise<Task[]> {
  const stored = await listRecords<unknown>("task");
  const tasks: Task[] = [];
  for (const row of stored) {
    const parsed = TaskSchema.safeParse(row);
    if (parsed.success && parsed.data.channelId === channelId) {
      tasks.push(parsed.data);
    }
  }
  tasks.sort((a, b) => b.createdAt - a.createdAt);
  return tasks;
}

export async function createTask(
  userId: string,
  channelId: string,
  body: unknown,
): Promise<{ task: Task; leaves: number }> {
  const draft = TaskDraftSchema.safeParse(body);
  if (!draft.success) throw new MarketError("bad_request", 400);

  // 보수를 먼저 예치한다. 잔액이 모자라면 여기서 멈춘다.
  const leaves = await addLeaves(userId, -draft.data.reward);
  if (leaves === null) throw new MarketError("insufficient_leaves", 409);

  const task: Task = {
    ...draft.data,
    id: newId("t"),
    channelId,
    requesterId: userId,
    workerId: null,
    status: "open",
    createdAt: Date.now(),
  };
  await putRecord("task", task.id, task);
  await record(userId, -task.reward, `공강 사기 · ${task.title} (보수 예치)`);
  return { task, leaves };
}

export async function takeTask(
  userId: string,
  body: unknown,
): Promise<{ task: Task }> {
  const input = TaskIdInputSchema.safeParse(body);
  if (!input.success) throw new MarketError("bad_request", 400);

  const task = await loadTask(input.data.taskId);
  if (task.status !== "open") throw new MarketError("task_changed", 409);
  if (task.requesterId === userId) throw new MarketError("forbidden", 403);

  return {
    task: await transition(task, {
      ...task,
      status: "assigned",
      workerId: userId,
    }),
  };
}

export async function reportTask(
  userId: string,
  body: unknown,
): Promise<{ task: Task }> {
  const input = TaskIdInputSchema.safeParse(body);
  if (!input.success) throw new MarketError("bad_request", 400);

  const task = await loadTask(input.data.taskId);
  if (task.workerId !== userId) throw new MarketError("forbidden", 403);
  if (task.status !== "assigned") throw new MarketError("task_changed", 409);

  return { task: await transition(task, { ...task, status: "reported" }) };
}

export async function confirmTask(
  userId: string,
  body: unknown,
): Promise<{ task: Task }> {
  const input = TaskIdInputSchema.safeParse(body);
  if (!input.success) throw new MarketError("bad_request", 400);

  const task = await loadTask(input.data.taskId);
  if (task.requesterId !== userId) throw new MarketError("forbidden", 403);
  if (task.status !== "reported") throw new MarketError("task_changed", 409);
  if (!task.workerId) throw new MarketError("task_changed", 409);

  // 상태를 먼저 옮긴다. 여기서 이기면 보수를 두 번 지급할 일이 없다.
  const moved = await transition(task, { ...task, status: "completed" });
  await addLeaves(task.workerId, task.reward);
  await record(task.workerId, task.reward, `공강 팔기 · ${task.title}`);
  return { task: moved };
}

export async function cancelTask(
  userId: string,
  body: unknown,
): Promise<{ task: Task; leaves: number | null }> {
  const input = TaskIdInputSchema.safeParse(body);
  if (!input.success) throw new MarketError("bad_request", 400);

  const task = await loadTask(input.data.taskId);
  if (task.requesterId !== userId) throw new MarketError("forbidden", 403);
  if (task.status !== "open") throw new MarketError("task_changed", 409);

  const moved = await transition(task, { ...task, status: "cancelled" });
  const leaves = await addLeaves(userId, task.reward);
  await record(userId, task.reward, `공강 사기 취소 · ${task.title} (환불)`);
  return { task: moved, leaves };
}
