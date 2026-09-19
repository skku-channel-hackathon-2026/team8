import { useEffect, useMemo, useRef, useState } from 'react'
import { useWamClose, useWamData, useWamSize } from '@channel.io/app-sdk-wam'
import './taggongsa.css'
import { AppProvider } from './store/AppProvider'
import {
  NavContext,
  useApp,
  type GlobalSheet,
  type NavValue,
  type Route,
} from './store/context'
import type { Toast } from './types'
import { useChannelIdentity } from './lib/identity'
import { DAY_LABELS, fmt } from './lib/time'
import { Icon } from './ui/Icon'
import { Leaf, Mascot } from './ui/Mascot'
import { Empty, IconButton } from './ui/primitives'
import { MarketScreen } from './screens/Market'
import { MeetScreen, RoomScreen } from './screens/Meet'
import { MenuScreen } from './screens/Menu'
import { ChargeSheet, ClockSheet, MyPage } from './screens/MyPage'
import { Login, Signup, Welcome } from './screens/Onboarding'
import { TimetableScreen } from './screens/Timetable'
import { TutorialScreen } from './screens/Tutorial'

const WAM_SIZE = { width: 400, height: 660 }

const ROUTE_TITLE: Record<Route['name'], string> = {
  tutorial: '튜토리얼',
  meet: '너 지금 공강이야?',
  market: '공강 마켓',
  my: '마이페이지',
  timetable: '시간표',
  room: '모임방',
}

function ToastItem({ toast }: { toast: Toast }) {
  const { dispatch } = useApp()
  useEffect(() => {
    const timer = window.setTimeout(
      () => dispatch({ type: 'DISMISS_TOAST', id: toast.id }),
      2800
    )
    return () => window.clearTimeout(timer)
  }, [toast.id, dispatch])
  return (
    <div
      className="tg-toast"
      role="status"
    >
      {toast.tone === 'leaf' && <Leaf size={16} />}
      {toast.text}
    </div>
  )
}

function Toasts() {
  const { state } = useApp()
  return (
    <div
      className="tg-toasts"
      aria-live="polite"
    >
      {state.toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
        />
      ))}
    </div>
  )
}

function Logo() {
  return (
    <span className="tg-logo">
      <Mascot
        size={30}
        color="gold"
      />
      타공사
    </span>
  )
}

function renderRoute(route: Route) {
  switch (route.name) {
    case 'tutorial':
      return <TutorialScreen />
    case 'meet':
      return <MeetScreen />
    case 'market':
      return <MarketScreen />
    case 'my':
      return <MyPage />
    case 'timetable':
      return <TimetableScreen />
    case 'room':
      return (
        <RoomScreen
          key={route.roomId}
          roomId={route.roomId}
        />
      )
  }
}

function Shell() {
  const { state, me } = useApp()
  const { close } = useWamClose()
  const [stack, setStack] = useState<Route[]>([])
  const [sheet, setSheet] = useState<GlobalSheet>(null)
  const [onboard, setOnboard] = useState<'welcome' | 'login' | 'signup'>(
    'welcome'
  )
  const scrollRef = useRef<HTMLDivElement>(null)
  const loggedIn = me !== null

  // 로그인·로그아웃할 때마다 첫 화면부터 다시 시작한다.
  useEffect(() => {
    setStack([])
    setSheet(null)
    setOnboard('welcome')
  }, [loggedIn])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
  }, [stack.length])

  const nav = useMemo<NavValue>(
    () => ({
      stack,
      push: (route) => setStack((prev) => [...prev, route]),
      back: () => setStack((prev) => prev.slice(0, -1)),
      openSheet: setSheet,
    }),
    [stack]
  )

  const top = stack[stack.length - 1]
  const closeButton = (
    <IconButton
      icon="close"
      label="닫기"
      onClick={close}
    />
  )

  if (!me) {
    return (
      <NavContext.Provider value={nav}>
        <header className="tg-header">
          <span className="tg-header__spacer" />
          {closeButton}
        </header>
        {onboard === 'welcome' && (
          <Welcome
            onLogin={() => setOnboard('login')}
            onSignup={() => setOnboard('signup')}
          />
        )}
        {onboard === 'login' && (
          <Login
            onBack={() => setOnboard('welcome')}
            onSignup={() => setOnboard('signup')}
          />
        )}
        {onboard === 'signup' && (
          <Signup onBack={() => setOnboard('welcome')} />
        )}
        <Toasts />
      </NavContext.Provider>
    )
  }

  return (
    <NavContext.Provider value={nav}>
      <header className="tg-header">
        {top ? (
          <>
            <IconButton
              icon="back"
              label="뒤로"
              onClick={nav.back}
            />
            <span className="tg-header__title">{ROUTE_TITLE[top.name]}</span>
            {state.clock.mode === 'demo' && (
              <button
                type="button"
                className="tg-clockchip"
                onClick={() => setSheet('clock')}
                title="기준 시각 바꾸기"
              >
                <Icon
                  name="clock"
                  size={14}
                />
                {DAY_LABELS[state.clock.day]} {fmt(state.clock.minutes)}
              </button>
            )}
            <button
              type="button"
              className="tg-leafchip"
              onClick={() => setSheet('charge')}
              aria-label={`보유 은행잎 ${me.leaves}잎, 충전하기`}
            >
              <Leaf size={18} />
              {me.leaves.toLocaleString('ko-KR')}
            </button>
          </>
        ) : (
          <>
            <Logo />
            <span className="tg-header__spacer" />
          </>
        )}
        {closeButton}
      </header>

      <div
        ref={scrollRef}
        className="tg-scroll"
      >
        {top ? renderRoute(top) : <MenuScreen />}
      </div>
      {sheet === 'charge' && <ChargeSheet onClose={() => setSheet(null)} />}
      {sheet === 'clock' && <ClockSheet onClose={() => setSheet(null)} />}
      <Toasts />
    </NavContext.Provider>
  )
}

function readTheme(appearance: unknown): 'light' | 'dark' {
  try {
    const forced = new URLSearchParams(window.location.search).get('theme')
    if (forced === 'dark' || forced === 'light') return forced
  } catch {
    // 주소를 읽을 수 없으면 채널톡 설정을 따른다.
  }
  return appearance === 'dark' ? 'dark' : 'light'
}

export default function TaggongsaApp() {
  const { setSize } = useWamSize()
  const appearance = useWamData('appearance')
  const theme = readTheme(appearance)
  const identity = useChannelIdentity()

  useEffect(() => {
    setSize(WAM_SIZE)
  }, [setSize])

  // 신원을 못 받으면 남의 기록을 건드릴 수 있으므로 화면을 열지 않는다.
  if (identity.status === 'error') {
    return (
      <div
        className="tg-app"
        data-theme={theme}
      >
        <Empty
          mood="wow"
          title="사용자 정보를 확인하지 못했어요"
          body={identity.message}
        />
      </div>
    )
  }

  return (
    <AppProvider identity={identity.identity}>
      <div
        className="tg-app"
        data-theme={theme}
      >
        <Shell />
      </div>
    </AppProvider>
  )
}
