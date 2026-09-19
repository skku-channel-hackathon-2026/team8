import { useEffect, useMemo, useRef, useState } from 'react'
import { useWamClose, useWamData, useWamSize } from '@channel.io/app-sdk-wam'
import './taggongsa.css'
import { AppProvider } from './store/AppProvider'
import { useHydrateProfile } from './store/sync'
import {
  NavContext,
  useApp,
  type GlobalSheet,
  type NavValue,
  type Route,
} from './store/context'
import { ThemeContext } from './store/theme'
import type { Toast } from './types'
import { useChannelIdentity } from './lib/identity'
import { loadThemePref, saveThemePref, type ThemePref } from './lib/theme'
import { Icon } from './ui/Icon'
import { Leaf, Mascot } from './ui/Mascot'
import { Empty, IconButton } from './ui/primitives'
import { ChatListScreen, ChatScreen } from './screens/Chat'
import { MarketScreen } from './screens/Market'
import { MeetScreen, RoomScreen } from './screens/Meet'
import { MenuScreen } from './screens/Menu'
import { ChargeSheet, MyPage } from './screens/MyPage'
import { NotificationsScreen } from './screens/Notifications'
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
  chat: '채팅',
  chats: '참여한 채팅방',
  notifications: '알림',
}

function routeTitle(route: Route): string {
  if (route.name === 'chat') return route.title ?? ROUTE_TITLE.chat
  return ROUTE_TITLE[route.name]
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
    case 'chat':
      return (
        <ChatScreen
          key={route.chatId}
          chatId={route.chatId}
        />
      )
    case 'chats':
      return <ChatListScreen />
    case 'notifications':
      return <NotificationsScreen />
  }
}

function Shell() {
  const { state, me, dispatch } = useApp()
  // 서버에 저장된 프로필이 있으면 가져와 맞춘다. 기기를 바꿔도 이어서 쓰게 한다.
  useHydrateProfile()
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
  const unread = (state.notifications ?? []).filter((n) => !n.read).length
  // 기본 튜토리얼을 다 끝내지 않았고 건너뛴 적도 없는 새내기는 메뉴보다 튜토리얼을 먼저 본다.
  const showIntro =
    me?.role === 'fresh' &&
    !state.tutorial.introSkipped &&
    !state.tutorial.done.slice(0, 4).every(Boolean)
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
            <span className="tg-header__title">{routeTitle(top)}</span>
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
            <button
              type="button"
              className="tg-iconbtn tg-bell"
              aria-label={
                unread > 0 ? `알림, 안 읽은 알림 ${unread}개` : '알림'
              }
              title="알림"
              onClick={() => nav.push({ name: 'notifications' })}
            >
              <Icon name="bell" />
              {unread > 0 && (
                <span className="tg-badge tg-bell__badge">
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </button>
          </>
        )}
        {closeButton}
      </header>

      <div
        ref={scrollRef}
        className="tg-scroll"
      >
        {top ? (
          renderRoute(top)
        ) : showIntro ? (
          <TutorialScreen intro />
        ) : (
          <MenuScreen />
        )}
      </div>
      {!top && showIntro && (
        <button
          type="button"
          className="tg-skip"
          onClick={() => dispatch({ type: 'SKIP_INTRO' })}
        >
          건너뛰기
        </button>
      )}
      {sheet === 'charge' && <ChargeSheet onClose={() => setSheet(null)} />}
      <Toasts />
    </NavContext.Provider>
  )
}

/**
 * 우선순위: 주소창 ?theme= (시연·테스트용) > 사용자가 이 기기에서 고른 값 >
 * 채널톡 호스트의 라이트/다크 설정.
 */
function readTheme(appearance: unknown, pref: ThemePref): 'light' | 'dark' {
  try {
    const forced = new URLSearchParams(window.location.search).get('theme')
    if (forced === 'dark' || forced === 'light') return forced
  } catch {
    // 주소를 읽을 수 없으면 다음 우선순위로 넘어간다.
  }
  if (pref === 'light' || pref === 'dark') return pref
  return appearance === 'dark' ? 'dark' : 'light'
}

export default function TaggongsaApp() {
  const { setSize } = useWamSize()
  const appearance = useWamData('appearance')
  const [pref, setPref] = useState<ThemePref>(loadThemePref)
  const theme = readTheme(appearance, pref)
  const identity = useChannelIdentity()

  useEffect(() => {
    setSize(WAM_SIZE)
  }, [setSize])

  useEffect(() => {
    saveThemePref(pref)
  }, [pref])

  const themeValue = useMemo(() => ({ theme, pref, setPref }), [theme, pref])

  // 신원을 못 받으면 남의 기록을 건드릴 수 있으므로 화면을 열지 않는다.
  if (identity.status === 'error') {
    return (
      <ThemeContext.Provider value={themeValue}>
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
      </ThemeContext.Provider>
    )
  }

  return (
    <ThemeContext.Provider value={themeValue}>
      <AppProvider identity={identity.identity}>
        <div
          className="tg-app"
          data-theme={theme}
        >
          <Shell />
        </div>
      </AppProvider>
    </ThemeContext.Provider>
  )
}
