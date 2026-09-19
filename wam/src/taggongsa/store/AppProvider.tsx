import { useEffect, useMemo, useReducer, useState, type ReactNode } from 'react'
import { loadSaved, save, saveAccount } from '../lib/storage'
import { scopeOf, type ChannelIdentity } from '../lib/identity'
import { momentFromDate } from '../lib/time'
import { AppContext } from './context'
import { createInitialState, reducer, type AppState } from './state'

function loadInitial(identity: ChannelIdentity): AppState {
  const initial = createInitialState(identity)
  const saved = loadSaved<AppState>(scopeOf(identity))
  if (!saved || saved.version !== 3) return initial
  // 저장된 신원은 믿지 않고 지금 호스트가 준 신원으로 덮어쓴다.
  return { ...initial, ...saved, identity, toasts: [] }
}

export function AppProvider({
  identity,
  children,
}: {
  identity: ChannelIdentity
  children: ReactNode
}) {
  const [state, dispatch] = useReducer(reducer, identity, loadInitial)
  const [realNow, setRealNow] = useState(() => new Date())
  const scope = scopeOf(identity)

  useEffect(() => {
    const snapshot = { ...state, toasts: [] }
    save(scope, snapshot)
    if (state.profile) saveAccount(scope, state.profile.nickname, snapshot)
  }, [state, scope])

  // 인증 승인·초대 수락 같은 데모 응답을 시간에 맞춰 처리한다.
  useEffect(() => {
    const timer = window.setInterval(() => {
      dispatch({ type: 'TICK', now: Date.now() })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (state.clock.mode !== 'real') return
    const timer = window.setInterval(() => setRealNow(new Date()), 30_000)
    return () => window.clearInterval(timer)
  }, [state.clock.mode])

  const { mode, day, minutes } = state.clock
  const now = useMemo(
    () => (mode === 'demo' ? { day, minutes } : momentFromDate(realNow)),
    [mode, day, minutes, realNow]
  )

  const value = useMemo(
    () => ({ state, dispatch, now, me: state.profile, identity }),
    [state, now, identity]
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
