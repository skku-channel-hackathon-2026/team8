import {
  ProfileSchema,
  type ClassBlock,
  type Profile,
  type SignupInput,
} from '@tutorial/shared'

/**
 * 타공사 서버 API 클라이언트.
 *
 * 모든 요청에 채널톡이 발급한 세션 토큰을 붙인다. 서버는 그 토큰으로만
 * 사용자를 판단하므로 사용자 id를 body에 실어 보내지 않는다.
 */

const TIMEOUT_MS = 15_000

export class ApiError extends Error {
  constructor(readonly code: string) {
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
}

export function apiErrorMessage(code: string): string {
  return (
    MESSAGES[code] ?? '요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.'
  )
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
    throw new ApiError(body?.error ?? 'failed')
  }
  return body
}

function parseProfile(body: { profile: unknown }): Profile | null {
  if (body.profile === null) return null
  const parsed = ProfileSchema.safeParse(body.profile)
  if (!parsed.success) throw new ApiError('bad_response')
  return parsed.data
}

export const api = {
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
}
