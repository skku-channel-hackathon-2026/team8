import { createContext, useContext } from 'react'
import type { ThemePref } from '../lib/theme'

export interface ThemeValue {
  /** 실제로 화면에 적용되는 값 */
  theme: 'light' | 'dark'
  /** 사용자가 고른 값. 'system'이면 채널톡 호스트 설정을 따른다. */
  pref: ThemePref
  setPref: (pref: ThemePref) => void
}

export const ThemeContext = createContext<ThemeValue | null>(null)

export function useTheme(): ThemeValue {
  const value = useContext(ThemeContext)
  if (!value) throw new Error('useTheme must be used inside ThemeContext')
  return value
}
