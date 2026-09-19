export type ThemePref = 'system' | 'light' | 'dark'

const KEY = 'taggongsa:theme-pref'

export function loadThemePref(): ThemePref {
  try {
    const raw = window.localStorage.getItem(KEY)
    return raw === 'light' || raw === 'dark' ? raw : 'system'
  } catch {
    return 'system'
  }
}

export function saveThemePref(pref: ThemePref): void {
  try {
    window.localStorage.setItem(KEY, pref)
  } catch {
    // 저장소를 쓸 수 없는 환경에서는 이번 세션에서만 적용된다.
  }
}
