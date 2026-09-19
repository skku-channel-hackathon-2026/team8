const PREFIX = 'taggongsa:v3'
const ACCOUNTS_PREFIX = 'taggongsa:accounts:v3'

/**
 * 채널톡 매니저마다 저장소를 나눈다. 같은 브라우저를 써도 다른 매니저의
 * 기록이 섞이지 않으며, 아래 데모 계정 목록도 매니저 안에서만 공유된다.
 */
function keyFor(prefix: string, scope: string): string {
  return `${prefix}:${scope}`
}

export function loadSaved<T>(scope: string): T | null {
  try {
    const raw = window.localStorage.getItem(keyFor(PREFIX, scope))
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export function save(scope: string, value: unknown): void {
  try {
    window.localStorage.setItem(keyFor(PREFIX, scope), JSON.stringify(value))
  } catch {
    // 저장소를 쓸 수 없는 환경에서는 메모리 상태만 유지한다.
  }
}

/**
 * 데모용 계정 목록. 학교 계정 연동 전까지는 이 기기에 별명별로 기록을 남겨 두고,
 * 같은 별명으로 로그인하면 그 기록을 다시 불러온다.
 */
export function loadAccounts<T>(scope: string): Record<string, T> {
  try {
    const raw = window.localStorage.getItem(keyFor(ACCOUNTS_PREFIX, scope))
    return raw ? (JSON.parse(raw) as Record<string, T>) : {}
  } catch {
    return {}
  }
}

export function saveAccount(
  scope: string,
  nickname: string,
  value: unknown
): void {
  try {
    const accounts = loadAccounts<unknown>(scope)
    accounts[nickname] = value
    window.localStorage.setItem(
      keyFor(ACCOUNTS_PREFIX, scope),
      JSON.stringify(accounts)
    )
  } catch {
    // 저장 공간이 부족하면 계정 기록만 건너뛴다.
  }
}
