import { useEffect, useMemo, useReducer, useState, type ReactNode } from 'react'
import { loadSaved, save } from '../lib/storage'
import { momentFromDate } from '../lib/time'
import { AppContext } from './context'
import { createInitialState, reducer, type AppState } from './state'

function loadInitial(): AppState {
  const initial = createInitialState()
  const saved = loadSaved<AppState>()
  if (!saved || saved.version !== 1) return initial
  return { ...initial, ...saved, toasts: [] }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadInitial)
  const [realNow, setRealNow] = useState(() => new Date())

  useEffect(() => {
    save({ ...state, toasts: [] })
  }, [state])

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
    () => ({ state, dispatch, now, me: state.profile }),
    [state, now]
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
