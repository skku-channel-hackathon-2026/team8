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
  type TabId,
} from './store/context'
import { ME } from './store/state'
import type { Toast } from './types'
import { cx } from './lib/cx'
import { DAY_LABELS, fmt } from './lib/time'
import { Icon, type IconName } from './ui/Icon'
import { Leaf } from './ui/Mascot'
import { IconButton } from './ui/primitives'
import { Home } from './screens/Home'
import { MarketScreen } from './screens/Market'
import { MeetScreen, RoomScreen } from './screens/Meet'
import { ChargeSheet, ClockSheet, MyPage } from './screens/MyPage'
import { Signup, Welcome } from './screens/Onboarding'
import { TimetableScreen } from './screens/Timetable'
import { TutorialScreen } from './screens/Tutorial'

const WAM_SIZE = { width: 400, height: 660 }

const TABS: Array<{ id: TabId; label: string; icon: IconName }> = [
  { id: 'home', label: '홈', icon: 'home' },
  { id: 'meet', label: '공강이야?', icon: 'people' },
  { id: 'market', label: '공강 마켓', icon: 'bag' },
  { id: 'my', label: '마이', icon: 'user' },
]

const ROUTE_TITLE: Record<Route['name'], string> = {
  tutorial: '튜토리얼',
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
      <Leaf size={24} />
      타공사
    </span>
  )
}

function TabBar({
  tab,
  onSelect,
}: {
  tab: TabId
  onSelect: (tab: TabId) => void
}) {
  const { state } = useApp()
  const badges: Partial<Record<TabId, number>> = {
    meet: state.requests.filter((r) => r.toId === ME && r.status === 'pending')
      .length,
    market: state.tasks.filter(
      (t) =>
        (t.requesterId === ME && t.status === 'reported') ||
        (t.workerId === ME && t.status === 'assigned')
    ).length,
  }
  return (
    <nav
      className="tg-tabbar"
      role="tablist"
      aria-label="메뉴"
    >
      {TABS.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={tab === item.id}
          className="tg-tab"
          onClick={() => onSelect(item.id)}
        >
          <Icon
            name={item.icon}
            size={20}
          />
          {item.label}
          {badges[item.id] ? (
            <span className="tg-badge">{badges[item.id]}</span>
          ) : null}
        </button>
      ))}
    </nav>
  )
}

function Shell() {
  const { state, me } = useApp()
  const { close } = useWamClose()
  const [tab, setTab] = useState<TabId>('home')
  const [hint, setHint] = useState<string | null>(null)
  const [stack, setStack] = useState<Route[]>([])
  const [sheet, setSheet] = useState<GlobalSheet>(null)
  const [onboard, setOnboard] = useState<'welcome' | 'signup'>('welcome')
  const scrollRef = useRef<HTMLDivElement>(null)
  const loggedIn = me !== null

  useEffect(() => {
    if (!loggedIn) {
      setTab('home')
      setHint(null)
      setStack([])
      setSheet(null)
      setOnboard('welcome')
    }
  }, [loggedIn])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
  }, [tab, hint, stack.length])

  const nav = useMemo<NavValue>(
    () => ({
      tab,
      hint,
      stack,
      goTab: (next, nextHint) => {
        setTab(next)
        setHint(nextHint ?? null)
        setStack([])
      },
      push: (route) => setStack((prev) => [...prev, route]),
      back: () => setStack((prev) => prev.slice(0, -1)),
      openSheet: setSheet,
    }),
    [tab, hint, stack]
  )

  const top = stack[stack.length - 1]

  const renderScreen = () => {
    if (top?.name === 'tutorial') return <TutorialScreen />
    if (top?.name === 'timetable') return <TimetableScreen />
    if (top?.name === 'room') {
      return (
        <RoomScreen
          key={top.roomId}
          roomId={top.roomId}
        />
      )
    }
    if (tab === 'meet') return <MeetScreen key={hint ?? 'meet'} />
    if (tab === 'market') return <MarketScreen key={hint ?? 'market'} />
    if (tab === 'my') return <MyPage />
    return <Home />
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
              className="tg-header__back"
            />
            <span className="tg-header__title">{ROUTE_TITLE[top.name]}</span>
          </>
        ) : (
          <>
            <Logo />
            <span className="tg-header__spacer" />
          </>
        )}
        {me && (
          <>
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
        )}
        <IconButton
          icon="close"
          label="닫기"
          onClick={close}
        />
      </header>

      {!me ? (
        onboard === 'welcome' ? (
          <Welcome onStart={() => setOnboard('signup')} />
        ) : (
          <Signup onBack={() => setOnboard('welcome')} />
        )
      ) : (
        <>
          <div
            ref={scrollRef}
            className={cx('tg-scroll', !top && 'tg-scroll--tabs')}
          >
            {renderScreen()}
          </div>
          {!top && (
            <TabBar
              tab={tab}
              onSelect={(next) => nav.goTab(next)}
            />
          )}
          {sheet === 'charge' && <ChargeSheet onClose={() => setSheet(null)} />}
          {sheet === 'clock' && <ClockSheet onClose={() => setSheet(null)} />}
        </>
      )}
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

  useEffect(() => {
    setSize(WAM_SIZE)
  }, [setSize])

  return (
    <AppProvider>
      <div
        className="tg-app"
        data-theme={theme}
      >
        <Shell />
      </div>
    </AppProvider>
  )
}
