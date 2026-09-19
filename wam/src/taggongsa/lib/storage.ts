const KEY = 'taggongsa:v1'

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
