import {
  MISSION_CLEAR_REWARD,
  MISSION_CREATE_REWARD,
  MissionDraftSchema,
  MissionIdInputSchema,
  MissionSchema,
  ProfileSchema,
  ReviewSubmissionInputSchema,
  SubmissionSchema,
  SubmitMissionInputSchema,
  type LedgerEntry,
  type Mission,
  type Profile,
  type Submission,
} from "@tutorial/shared";
import {
  addLeaves,
  getRecord,
  listRecords,
  putRecord,
  replaceIfStatus,
} from "./records.js";

/**
 * 튜토리얼 미션과 인증.
 *
 * 마켓과 같은 이유로 **서버가 판정한다.** 인증을 인정할지는 선배가 정하고
 * 그 결과가 새내기의 잔액을 바꾸므로, 클라이언트는 성공 여부를 알 수 없다.
 *
 * 보상 금액도 서버가 정한다. 클라이언트가 보낸 reward는 쓰지 않는다.
 */

export class MissionError extends Error {
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

async function loadUser(userId: string): Promise<Profile> {
  const stored = await getRecord<unknown>("user", userId);
  const parsed = ProfileSchema.safeParse(stored);
  if (!parsed.success) throw new MissionError("not_signed_up", 404);
  return parsed.data;
}

async function loadMission(missionId: string): Promise<Mission> {
  const parsed = MissionSchema.safeParse(
    await getRecord<unknown>("mission", missionId),
  );
  if (!parsed.success) throw new MissionError("mission_not_found", 404);
  return parsed.data;
}

function inChannel<T extends { channelId: string }>(
  rows: unknown[],
  schema: { safeParse(value: unknown): { success: boolean; data?: T } },
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

export async function listMissions(channelId: string): Promise<Mission[]> {
  const missions = inChannel<Mission>(
    await listRecords<unknown>("mission"),
    MissionSchema,
    channelId,
  );
  missions.sort((a, b) => b.createdAt - a.createdAt);
  return missions;
}

/** 내가 낸 인증과, 내가 만든 미션에 들어온 인증을 함께 돌려준다. */
export async function listSubmissions(
  userId: string,
  channelId: string,
): Promise<Submission[]> {
  const all = inChannel<Submission>(
    await listRecords<unknown>("submission"),
    SubmissionSchema,
    channelId,
  );
  const mine = new Set(
    (await listMissions(channelId))
      .filter((m) => m.authorId === userId)
      .map((m) => m.id),
  );
  const visible = all.filter(
    (s) => s.userId === userId || mine.has(s.missionId),
  );
  visible.sort((a, b) => b.createdAt - a.createdAt);
  return visible;
}

export async function createMission(
  userId: string,
  channelId: string,
  body: unknown,
): Promise<{ mission: Mission; leaves: number | null }> {
  const author = await loadUser(userId);
  if (author.role !== "senior") throw new MissionError("forbidden", 403);

  const draft = MissionDraftSchema.safeParse(body);
  if (!draft.success) throw new MissionError("bad_request", 400);

  const mission: Mission = {
    ...draft.data,
    id: newId("m"),
    channelId,
    authorId: userId,
    reward: MISSION_CLEAR_REWARD,
    recommenders: [],
    completedCount: 0,
    createdAt: Date.now(),
  };
  await putRecord("mission", mission.id, mission);

  const leaves = await addLeaves(userId, MISSION_CREATE_REWARD);
  await record(
    userId,
    MISSION_CREATE_REWARD,
    `튜토리얼 제작 · ${mission.title}`,
  );
  return { mission, leaves };
}

export async function toggleRecommend(
  userId: string,
  body: unknown,
): Promise<{ mission: Mission }> {
  const user = await loadUser(userId);
  if (user.role !== "senior") throw new MissionError("forbidden", 403);

  const input = MissionIdInputSchema.safeParse(body);
  if (!input.success) throw new MissionError("bad_request", 400);

  const mission = await loadMission(input.data.missionId);
  if (mission.authorId === userId) throw new MissionError("forbidden", 403);

  const on = mission.recommenders.includes(userId);
  const next: Mission = {
    ...mission,
    recommenders: on
      ? mission.recommenders.filter((id) => id !== userId)
      : [...mission.recommenders, userId],
  };
  await putRecord("mission", mission.id, next);
  return { mission: next };
}

export async function submitMission(
  userId: string,
  channelId: string,
  body: unknown,
): Promise<{ submission: Submission }> {
  const input = SubmitMissionInputSchema.safeParse(body);
  if (!input.success) throw new MissionError("bad_request", 400);

  const mission = await loadMission(input.data.missionId);
  if (mission.authorId === userId) throw new MissionError("forbidden", 403);

  // 같은 미션에 이미 살아 있는 인증이 있으면 또 내지 못한다.
  const mine = (await listSubmissions(userId, channelId)).filter(
    (s) =>
      s.userId === userId &&
      s.missionId === mission.id &&
      s.status !== "rejected",
  );
  if (mine.length > 0) throw new MissionError("already_submitted", 409);

  const submission: Submission = {
    id: newId("sub"),
    channelId,
    missionId: mission.id,
    userId,
    note: input.data.note,
    status: "pending",
    reviewerId: null,
    createdAt: Date.now(),
    reviewedAt: null,
  };
  await putRecord("submission", submission.id, submission);
  return { submission };
}

export async function reviewSubmission(
  userId: string,
  body: unknown,
): Promise<{ submission: Submission }> {
  const input = ReviewSubmissionInputSchema.safeParse(body);
  if (!input.success) throw new MissionError("bad_request", 400);

  const parsed = SubmissionSchema.safeParse(
    await getRecord<unknown>("submission", input.data.submissionId),
  );
  if (!parsed.success) throw new MissionError("submission_not_found", 404);
  const submission = parsed.data;

  if (submission.userId === userId) throw new MissionError("forbidden", 403);
  if (submission.status !== "pending") {
    throw new MissionError("submission_changed", 409);
  }

  const mission = await loadMission(submission.missionId);
  // 심사는 미션을 만든 선배만 한다.
  if (mission.authorId !== userId) throw new MissionError("forbidden", 403);

  const next: Submission = {
    ...submission,
    status: input.data.approve ? "approved" : "rejected",
    reviewerId: userId,
    reviewedAt: Date.now(),
  };
  // 상태를 먼저 옮긴다. 여기서 이기면 보상을 두 번 줄 일이 없다.
  const moved = await replaceIfStatus(
    "submission",
    submission.id,
    "pending",
    next,
  );
  if (!moved) throw new MissionError("submission_changed", 409);

  if (input.data.approve) {
    await addLeaves(submission.userId, mission.reward);
    await record(
      submission.userId,
      mission.reward,
      `튜토리얼 완료 · ${mission.title}`,
    );
    await putRecord("mission", mission.id, {
      ...mission,
      completedCount: mission.completedCount + 1,
    });
  }
  return { submission: next };
}
