import {
  CompleteStepInputSchema,
  ProfileSchema,
  SIGNUP_BONUS,
  STEP_REWARDS,
  ShowFreeInputSchema,
  SignupInputSchema,
  TimetableInputSchema,
  type LedgerEntry,
  type Profile,
} from "@tutorial/shared";
import { ChatError, charge, listLedger, readChat, sendChat } from "./chat.js";
import {
  MeetError,
  createRoom,
  invite,
  joinRoom,
  leaveRoom,
  listRequests,
  listRooms,
  respondRequest,
  sendDm,
} from "./meet.js";
import {
  MissionError,
  createMission,
  listMissions,
  listSubmissions,
  reviewSubmission,
  submitMission,
  toggleRecommend,
} from "./missions.js";
import {
  MarketError,
  cancelTask,
  confirmTask,
  createTask,
  listTasks,
  reportTask,
  takeTask,
} from "./market.js";
import { getRecord, putRecord } from "./records.js";
import { buildSnapshot, listStudents } from "./sync.js";
import { readWamSessionToken, type WamSession } from "./wam-session.js";

/**
 * 타공사의 자체 HTTP API.
 *
 * Channel Function이 아니라 평범한 Worker 라우트다. Function은 새 이름마다
 * 운영진의 등록 갱신이 필요하지만 이 경로는 배포만 하면 바로 동작한다.
 *
 * 모든 요청은 `x-taggongsa-session` 토큰으로 신원을 증명한다. 사용자 id는
 * 토큰에서만 나오며 body에서 읽지 않는다.
 */

const SESSION_HEADER = "x-taggongsa-session";
const AVATAR_TONES = 5;

export interface ApiEnv {
  APP_SECRET?: string;
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function isLocal(url: URL): boolean {
  return url.hostname === "127.0.0.1" || url.hostname === "localhost";
}

/** 로컬 개발 서버에서는 채널톡 없이도 시험할 수 있게 고정 신원을 쓴다. */
const LOCAL_SESSION: WamSession = {
  channelId: "local-preview",
  managerId: "local-preview-manager",
  expiresAt: 0,
};

const LOCAL_PREFIX = "local:";

/**
 * 로컬에서 여러 사람인 척한다.
 *
 * 창을 두 개 열어도 주소가 같으면 서버는 둘을 한 사람으로 본다. 그러면
 * 새내기와 헌내기가 주고받는 것을 혼자서는 볼 수 없다. 그래서 localhost에
 * 한해 `local:<이름>` 토큰으로 사람을 나눈다.
 *
 * 이 길은 isLocal 안에서만 열린다. 배포된 주소에서는 서명 토큰만 통한다.
 */
function localSession(header: string): WamSession {
  if (!header.startsWith(LOCAL_PREFIX)) return LOCAL_SESSION;
  const managerId = header.slice(LOCAL_PREFIX.length).trim().slice(0, 40);
  if (!managerId) return LOCAL_SESSION;
  return { channelId: LOCAL_SESSION.channelId, managerId, expiresAt: 0 };
}

export function readSession(
  request: Request,
  env: ApiEnv,
): WamSession | undefined {
  if (isLocal(new URL(request.url))) {
    return localSession(request.headers.get(SESSION_HEADER) ?? "");
  }
  if (!env.APP_SECRET) return undefined;
  const session = readWamSessionToken(
    request.headers.get(SESSION_HEADER) ?? "",
    env.APP_SECRET,
  );
  if (!session || session.expiresAt <= Date.now()) return undefined;
  return session;
}

function userKey(session: WamSession): string {
  return `${session.channelId}:${session.managerId}`;
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

async function loadProfile(session: WamSession): Promise<Profile | null> {
  const stored = await getRecord<unknown>("user", userKey(session));
  if (!stored) return null;
  const parsed = ProfileSchema.safeParse(stored);
  return parsed.success ? parsed.data : null;
}

/** 은행잎이 움직인 자리마다 내역을 한 줄 남긴다. */
async function addEntry(
  userId: string,
  delta: number,
  label: string,
): Promise<void> {
  const entry: LedgerEntry = {
    id: `lg_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    userId,
    delta,
    label,
    at: Date.now(),
  };
  await putRecord("ledger", entry.id, entry);
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

/**
 * 이 모듈이 담당하는 경로. 여기 없는 /api/* 는 undefined를 돌려 Nest 앱으로
 * 흘려보낸다. 그러지 않으면 기존 /api/health 같은 경로를 삼켜 버린다.
 */
const ROUTES: Record<string, string> = {
  "/api/sync": "GET",
  "/api/me": "GET",
  "/api/me/step": "POST",
  "/api/me/signup": "POST",
  "/api/me/timetable": "PUT",
  "/api/me/show-free": "PUT",
  "/api/students": "GET",
  "/api/tasks": "GET",
  "/api/tasks/create": "POST",
  "/api/tasks/take": "POST",
  "/api/tasks/report": "POST",
  "/api/tasks/confirm": "POST",
  "/api/tasks/cancel": "POST",
  "/api/missions": "GET",
  "/api/missions/create": "POST",
  "/api/missions/recommend": "POST",
  "/api/submissions": "GET",
  "/api/submissions/create": "POST",
  "/api/submissions/review": "POST",
  "/api/rooms": "GET",
  "/api/rooms/create": "POST",
  "/api/rooms/join": "POST",
  "/api/rooms/leave": "POST",
  "/api/rooms/invite": "POST",
  "/api/requests": "GET",
  "/api/requests/dm": "POST",
  "/api/requests/respond": "POST",
  "/api/chat": "POST",
  "/api/chat/send": "POST",
  "/api/leaves/charge": "POST",
  "/api/leaves/ledger": "GET",
};

export async function handleApiRequest(
  request: Request,
  env: ApiEnv,
): Promise<Response | undefined> {
  const path = new URL(request.url).pathname;
  const method = ROUTES[path];
  if (!method) return undefined;
  if (method !== request.method) {
    return json({ error: "method_not_allowed" }, 405);
  }

  // 신원은 담당 경로에만 요구한다.
  const session = readSession(request, env);
  if (!session) return json({ error: "unauthorized" }, 401);
  const key = userKey(session);

  // ---- 한 번에 받아오는 스냅샷 ---------------------------------------------
  // 화면들이 저마다 목록을 부르지 않게, 볼 수 있는 모든 것을 한 응답에 담는다.
  if (path === "/api/sync") {
    return json(await buildSnapshot(key, session.channelId));
  }

  // ---- 내 프로필 ----------------------------------------------------------
  if (path === "/api/me") {
    return json({ profile: await loadProfile(session) });
  }

  if (path === "/api/me/signup") {
    if (await loadProfile(session)) {
      return json({ error: "already_signed_up" }, 409);
    }
    const input = SignupInputSchema.safeParse(await readJson(request));
    if (!input.success) return json({ error: "bad_request" }, 400);

    const profile: Profile = {
      id: key,
      channelId: session.channelId,
      managerId: session.managerId,
      nickname: input.data.nickname,
      department: input.data.department,
      campus: input.data.campus,
      role: input.data.role,
      showFree: true,
      tone: hashString(input.data.nickname) % AVATAR_TONES,
      leaves: SIGNUP_BONUS,
      timetable: [],
      steps: [false, false, false, false],
      createdAt: Date.now(),
    };
    await putRecord("user", key, profile);
    await addEntry(key, SIGNUP_BONUS, "가입 축하 은행잎");
    return json({ profile }, 201);
  }

  if (path === "/api/me/timetable") {
    const profile = await loadProfile(session);
    if (!profile) return json({ error: "not_signed_up" }, 404);
    const input = TimetableInputSchema.safeParse(await readJson(request));
    if (!input.success) return json({ error: "bad_request" }, 400);

    const next: Profile = { ...profile, timetable: input.data.blocks };
    await putRecord("user", key, next);
    return json({ profile: next });
  }

  if (path === "/api/me/step") {
    const profile = await loadProfile(session);
    if (!profile) return json({ error: "not_signed_up" }, 404);
    const input = CompleteStepInputSchema.safeParse(await readJson(request));
    if (!input.success) return json({ error: "bad_request" }, 400);

    const step = input.data.step;
    // 앞 단계를 건너뛰고 보상만 받아 가지 못하게 한다.
    if (profile.steps.slice(0, step).some((done) => !done)) {
      return json({ error: "step_locked" }, 409);
    }
    // 같은 단계로 두 번 받지 못하게 한다.
    if (profile.steps[step]) return json({ profile });

    const steps = [...profile.steps];
    steps[step] = true;
    const reward = STEP_REWARDS[step];
    const next: Profile = {
      ...profile,
      steps,
      leaves: profile.leaves + reward,
    };
    await putRecord("user", key, next);
    await addEntry(key, reward, `튜토리얼 ${step}단계`);
    return json({ profile: next });
  }

  if (path === "/api/me/show-free") {
    const profile = await loadProfile(session);
    if (!profile) return json({ error: "not_signed_up" }, 404);
    const input = ShowFreeInputSchema.safeParse(await readJson(request));
    if (!input.success) return json({ error: "bad_request" }, 400);

    const next: Profile = { ...profile, showFree: input.data.value };
    await putRecord("user", key, next);
    return json({ profile: next });
  }

  // ---- 공강 마켓 ----------------------------------------------------------
  // 상태 전이와 보수 이동은 서버가 판정한다. 화면은 결과를 반영만 한다.
  if (path.startsWith("/api/tasks")) {
    try {
      if (path === "/api/tasks") {
        return json({ tasks: await listTasks(session.channelId) });
      }
      const body = await readJson(request);
      if (path === "/api/tasks/create") {
        return json(await createTask(key, session.channelId, body), 201);
      }
      if (path === "/api/tasks/take") return json(await takeTask(key, body));
      if (path === "/api/tasks/report")
        return json(await reportTask(key, body));
      if (path === "/api/tasks/confirm") {
        return json(await confirmTask(key, body));
      }
      return json(await cancelTask(key, body));
    } catch (error) {
      if (error instanceof MarketError) {
        return json({ error: error.code }, error.status);
      }
      throw error;
    }
  }

  // ---- 튜토리얼 미션과 인증 ------------------------------------------------
  if (path.startsWith("/api/missions") || path.startsWith("/api/submissions")) {
    try {
      if (path === "/api/missions") {
        return json({ missions: await listMissions(session.channelId) });
      }
      if (path === "/api/submissions") {
        return json({
          submissions: await listSubmissions(key, session.channelId),
        });
      }
      const body = await readJson(request);
      if (path === "/api/missions/create") {
        return json(await createMission(key, session.channelId, body), 201);
      }
      if (path === "/api/missions/recommend") {
        return json(await toggleRecommend(key, body));
      }
      if (path === "/api/submissions/create") {
        return json(await submitMission(key, session.channelId, body), 201);
      }
      return json(await reviewSubmission(key, body));
    } catch (error) {
      if (error instanceof MissionError) {
        return json({ error: error.code }, error.status);
      }
      throw error;
    }
  }

  // ---- 만남 신청과 모임방 --------------------------------------------------
  if (path.startsWith("/api/rooms") || path.startsWith("/api/requests")) {
    try {
      if (path === "/api/rooms") {
        return json({ rooms: await listRooms(session.channelId) });
      }
      if (path === "/api/requests") {
        return json({ requests: await listRequests(key, session.channelId) });
      }
      const body = await readJson(request);
      if (path === "/api/rooms/create") {
        return json(await createRoom(key, session.channelId, body), 201);
      }
      if (path === "/api/rooms/join") return json(await joinRoom(key, body));
      if (path === "/api/rooms/leave") return json(await leaveRoom(key, body));
      if (path === "/api/rooms/invite") {
        return json(await invite(key, session.channelId, body), 201);
      }
      if (path === "/api/requests/dm") {
        return json(await sendDm(key, session.channelId, body), 201);
      }
      return json(await respondRequest(key, body));
    } catch (error) {
      if (error instanceof MeetError) {
        return json({ error: error.code }, error.status);
      }
      throw error;
    }
  }

  // ---- 채팅과 은행잎 --------------------------------------------------------
  if (path.startsWith("/api/chat") || path.startsWith("/api/leaves")) {
    try {
      if (path === "/api/leaves/ledger") {
        return json({ entries: await listLedger(key) });
      }
      const body = await readJson(request);
      if (path === "/api/chat") {
        return json(await readChat(key, session.channelId, body));
      }
      if (path === "/api/chat/send") {
        return json(await sendChat(key, session.channelId, body), 201);
      }
      return json(await charge(key, body));
    } catch (error) {
      if (error instanceof ChatError) {
        return json({ error: error.code }, error.status);
      }
      throw error;
    }
  }

  // ---- 공강 매칭용 학생 목록 ----------------------------------------------
  return json({ students: await listStudents(key, session.channelId) });
}
