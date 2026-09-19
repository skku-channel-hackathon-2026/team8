import {
  ProfileSchema,
  ShowFreeInputSchema,
  SignupInputSchema,
  TimetableInputSchema,
  type Peer,
  type Profile,
} from "@tutorial/shared";
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
import { getRecord, listRecords, putRecord } from "./records.js";
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

export function readSession(
  request: Request,
  env: ApiEnv,
): WamSession | undefined {
  if (isLocal(new URL(request.url))) return LOCAL_SESSION;
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

function toPeer(profile: Profile): Peer {
  const {
    managerId: _m,
    channelId: _c,
    leaves: _l,
    createdAt: _t,
    ...peer
  } = profile;
  return peer;
}

async function loadProfile(session: WamSession): Promise<Profile | null> {
  const stored = await getRecord<unknown>("user", userKey(session));
  if (!stored) return null;
  const parsed = ProfileSchema.safeParse(stored);
  return parsed.success ? parsed.data : null;
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
  "/api/me": "GET",
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
      leaves: 0,
      timetable: [],
      createdAt: Date.now(),
    };
    await putRecord("user", key, profile);
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

  // ---- 공강 매칭용 학생 목록 ----------------------------------------------
  const stored = await listRecords<unknown>("user");
  const peers: Peer[] = [];
  for (const row of stored) {
    const parsed = ProfileSchema.safeParse(row);
    if (!parsed.success) continue;
    // 같은 채널 안에서만, 공개한 사람만, 나는 빼고
    if (parsed.data.channelId !== session.channelId) continue;
    if (!parsed.data.showFree) continue;
    if (parsed.data.id === key) continue;
    peers.push(toPeer(parsed.data));
  }
  return json({ students: peers });
}
