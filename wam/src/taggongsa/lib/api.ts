import {
  ProfileSchema,
  SnapshotSchema,
  type ClassBlock,
  type Profile,
  type SignupInput,
  type Snapshot,
} from '@tutorial/shared'

/**
 * 타공사 서버 API 클라이언트.
 *
 * 모든 요청에 채널톡이 발급한 세션 토큰을 붙인다. 서버는 그 토큰으로만
 * 사용자를 판단하므로 사용자 id를 body에 실어 보내지 않는다.
 */

const TIMEOUT_MS = 15_000

export class ApiError extends Error {
  constructor(
    readonly code: string,
    /** 서버가 돌려준 상태. 모르는 오류일 때 화면에 같이 띄워 단서를 남긴다. */
    readonly status = 0
  ) {
    super(code)
  }
}

const MESSAGES: Record<string, string> = {
  unauthorized: '채널톡에서 앱을 다시 열고 시도해 주세요.',
  already_signed_up: '이미 가입된 계정이에요.',
  not_signed_up: '먼저 가입해 주세요.',
  bad_request: '입력을 다시 확인해 주세요.',
  network: '서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.',
  timeout: '서버 응답이 너무 늦어요. 다시 시도해 주세요.',
  forbidden: '권한이 없어요.',
  insufficient_leaves: '은행잎이 부족해요. 충전 후 다시 시도해 주세요.',
  task_changed: '방금 다른 사람이 먼저 처리했어요.',
  task_not_found: '이미 사라진 부탁이에요.',
  room_full: '자리가 모두 찼어요.',
  room_not_found: '이미 사라진 모임이에요.',
  already_requested: '이미 보낸 신청이 기다리고 있어요.',
  request_changed: '이미 답한 신청이에요.',
  request_not_found: '이미 사라진 신청이에요.',
  already_submitted: '이미 낸 인증이 심사를 기다리고 있어요.',
  submission_changed: '이미 심사가 끝난 인증이에요.',
  mission_not_found: '이미 사라진 튜토리얼이에요.',
  step_locked: '앞 단계를 먼저 끝내 주세요.',
  submission_not_found: '이미 사라진 인증이에요.',
  method_not_allowed: '앱과 서버 버전이 안 맞아요. 창을 닫고 다시 열어 주세요.',
  bad_response: '서버가 보낸 값을 읽지 못했어요. 창을 닫고 다시 열어 주세요.',
}

/**
 * 모르는 오류는 "처리하지 못했어요"로 뭉뚱그리지 않는다.
 *
 * 그렇게 적어 두면 무엇이 잘못됐는지 화면만 봐서는 알 수 없고, 고치려면
 * 개발자 도구를 열어야 한다. 모르는 것은 모르는 대로 코드와 상태를 적어
 * 둬야 스크린샷 한 장으로 원인을 좁힐 수 있다.
 */
export function apiErrorMessage(code: string, status = 0): string {
  const known = MESSAGES[code]
  if (known) return known
  const detail = status ? `${code} ${status}` : code
  return `요청을 처리하지 못했어요 (${detail})`
}

async function call<T>(
  path: string,
  sessionToken: string,
  init: { method: string; body?: unknown } = { method: 'GET' }
): Promise<T> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS)

  let response: Response
  try {
    response = await fetch(path, {
      method: init.method,
      headers: {
        'content-type': 'application/json',
        ...(sessionToken ? { 'x-taggongsa-session': sessionToken } : {}),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: controller.signal,
    })
  } catch {
    throw new ApiError(controller.signal.aborted ? 'timeout' : 'network')
  } finally {
    window.clearTimeout(timer)
  }

  const body = (await response.json().catch(() => null)) as
    (T & { error?: string }) | null

  if (!response.ok || !body) {
    // JSON이 아니면 서버가 아니라 그 앞단(프록시·CDN)이 답했을 수 있다.
    throw new ApiError(body?.error ?? 'failed', response.status)
  }
  return body
}

function parseProfile(body: { profile: unknown }): Profile | null {
  if (body.profile === null) return null
  const parsed = ProfileSchema.safeParse(body.profile)
  if (!parsed.success) throw new ApiError('bad_response')
  return parsed.data
}

/** 응답 본문을 쓰지 않는 요청. 결과는 다음 스냅샷으로 확인한다. */
function post(
  path: string,
  sessionToken: string,
  body: unknown
): Promise<unknown> {
  return call<Record<string, unknown>>(path, sessionToken, {
    method: 'POST',
    body,
  })
}

export const api = {
  /**
   * 지금 이 사람이 볼 수 있는 모든 것을 한 번에 받아온다.
   * 화면마다 목록을 따로 부르지 않는 이유는 서버 sync.ts에 적어 뒀다.
   */
  async getSnapshot(sessionToken: string): Promise<Snapshot> {
    const parsed = SnapshotSchema.safeParse(
      await call<unknown>('/api/sync', sessionToken)
    )
    if (!parsed.success) throw new ApiError('bad_response')
    return parsed.data
  },

  async getProfile(sessionToken: string): Promise<Profile | null> {
    return parseProfile(
      await call<{ profile: unknown }>('/api/me', sessionToken)
    )
  },

  async signup(sessionToken: string, input: SignupInput): Promise<Profile> {
    const profile = parseProfile(
      await call<{ profile: unknown }>('/api/me/signup', sessionToken, {
        method: 'POST',
        body: input,
      })
    )
    if (!profile) throw new ApiError('bad_response')
    return profile
  },

  async saveTimetable(
    sessionToken: string,
    blocks: ClassBlock[]
  ): Promise<Profile> {
    const profile = parseProfile(
      await call<{ profile: unknown }>('/api/me/timetable', sessionToken, {
        method: 'PUT',
        body: { blocks },
      })
    )
    if (!profile) throw new ApiError('bad_response')
    return profile
  },

  // ---- 튜토리얼 ----
  completeStep: (token: string, step: number) =>
    post('/api/me/step', token, { step }),
  setShowFree: (token: string, value: boolean) =>
    call('/api/me/show-free', token, { method: 'PUT', body: { value } }),
  charge: (token: string, packIndex: number) =>
    post('/api/leaves/charge', token, { packIndex }),

  // ---- 튜토리얼 미션과 인증 ----
  createMission: (token: string, draft: unknown) =>
    post('/api/missions/create', token, draft),
  toggleRecommend: (token: string, missionId: string) =>
    post('/api/missions/recommend', token, { missionId }),
  submitMission: (token: string, missionId: string, note: string) =>
    post('/api/submissions/create', token, { missionId, note }),
  reviewSubmission: (token: string, submissionId: string, approve: boolean) =>
    post('/api/submissions/review', token, { submissionId, approve }),

  // ---- 만남 신청과 모임방 ----
  sendDm: (token: string, body: unknown) =>
    post('/api/requests/dm', token, body),
  respondRequest: (token: string, requestId: string, accept: boolean) =>
    post('/api/requests/respond', token, { requestId, accept }),
  createRoom: (token: string, draft: unknown) =>
    post('/api/rooms/create', token, draft),
  joinRoom: (token: string, roomId: string) =>
    post('/api/rooms/join', token, { roomId }),
  leaveRoom: (token: string, roomId: string) =>
    post('/api/rooms/leave', token, { roomId }),
  invite: (token: string, roomId: string, toIds: string[]) =>
    post('/api/rooms/invite', token, { roomId, toIds }),

  // ---- 공강 마켓 ----
  createTask: (token: string, draft: unknown) =>
    post('/api/tasks/create', token, draft),
  takeTask: (token: string, taskId: string) =>
    post('/api/tasks/take', token, { taskId }),
  reportTask: (token: string, taskId: string) =>
    post('/api/tasks/report', token, { taskId }),
  confirmTask: (token: string, taskId: string) =>
    post('/api/tasks/confirm', token, { taskId }),
  cancelTask: (token: string, taskId: string) =>
    post('/api/tasks/cancel', token, { taskId }),

  // ---- 채팅 ----
  sendChat: (token: string, chatId: string, text: string) =>
    post('/api/chat/send', token, { chatId, text }),
}
