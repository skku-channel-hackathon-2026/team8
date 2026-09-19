const KEY = 'taggongsa:v2'
const ACCOUNTS_KEY = 'taggongsa:accounts:v2'

export function loadSaved<T>(): T | null {
  try {
    const raw = window.localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export function save(value: unknown): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(value))
  } catch {
    // 저장소를 쓸 수 없는 환경에서는 메모리 상태만 유지한다.
  }
}

/**
 * 데모용 계정 목록. 학교 계정 연동 전까지는 이 기기에 별명별로 기록을 남겨 두고,
 * 같은 별명으로 로그인하면 그 기록을 다시 불러온다.
 */
export function loadAccounts<T>(): Record<string, T> {
  try {
    const raw = window.localStorage.getItem(ACCOUNTS_KEY)
    return raw ? (JSON.parse(raw) as Record<string, T>) : {}
  } catch {
    return {}
  }
}

export function saveAccount(nickname: string, value: unknown): void {
  try {
    const accounts = loadAccounts<unknown>()
    accounts[nickname] = value
    window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts))
  } catch {
    // 저장 공간이 부족하면 계정 기록만 건너뛴다.
  }
}
