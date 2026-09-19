import { createContext, useContext, type Dispatch } from 'react'
import type { ChannelIdentity } from '../lib/identity'
import type { Moment, Profile } from '../types'
import type { Action, AppState } from './state'

export interface AppContextValue {
  state: AppState
  dispatch: Dispatch<Action>
  now: Moment
  me: Profile | null
  /** 채널톡이 보증한 현재 사용자. 서버 호출과 저장소 구분의 기준이다. */
  identity: ChannelIdentity
}

export const AppContext = createContext<AppContextValue | null>(null)

export function useApp(): AppContextValue {
  const value = useContext(AppContext)
  if (!value) throw new Error('useApp must be used inside AppProvider')
  return value
}

/** 로그인 후에만 쓰는 화면에서 사용한다. */
export function useMe(): Profile {
  const { me } = useApp()
  if (!me) throw new Error('로그인이 필요한 화면이에요')
  return me
}

/** 첫 화면의 메뉴 버튼으로 여는 화면과, 그 안에서 이어지는 화면 */
export type Route =
  | { name: 'tutorial' }
  | { name: 'meet' }
  | { name: 'market' }
  | { name: 'my' }
  | { name: 'timetable' }
  | { name: 'room'; roomId: string }
  | { name: 'chat'; chatId: string; title?: string }

export type GlobalSheet = 'charge' | 'clock' | null

export interface NavValue {
  stack: Route[]
  push: (route: Route) => void
  back: () => void
  openSheet: (sheet: GlobalSheet) => void
}

export const NavContext = createContext<NavValue | null>(null)

export function useNav(): NavValue {
  const value = useContext(NavContext)
  if (!value) throw new Error('useNav must be used inside the app shell')
  return value
}

/** 서버·DB 기록에 쓸 현재 사용자 키. */
export function useIdentity(): ChannelIdentity {
  return useApp().identity
}
