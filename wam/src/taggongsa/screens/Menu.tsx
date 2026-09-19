import { useApp, useMe, useNav, type Route } from '../store/context'
import { ME } from '../store/state'
import { cx } from '../lib/cx'
import { Icon, type IconName } from '../ui/Icon'

interface MenuItem {
  route: Route
  label: string
  icon: IconName
  tone: 'blue' | 'gold' | 'green' | 'plain'
  badge: number
}

/** 로그인 후 첫 화면. 네 가지 메뉴로 가는 버튼만 둔다. */
export function MenuScreen() {
  const { state } = useApp()
  const me = useMe()
  const { push } = useNav()

  const items: MenuItem[] = [
    {
      route: { name: 'tutorial' },
      label: '튜토리얼',
      icon: 'flag',
      tone: 'blue',
      badge:
        me.role === 'senior'
          ? state.submissions.filter(
              (s) => s.status === 'pending' && s.userId !== ME
            ).length
          : 0,
    },
    {
      route: { name: 'meet' },
      label: '너 지금 공강이야?',
      icon: 'people',
      tone: 'gold',
      badge: state.requests.filter(
        (r) => r.toId === ME && r.status === 'pending'
      ).length,
    },
    {
      route: { name: 'market' },
      label: '공강 마켓',
      icon: 'bag',
      tone: 'green',
      badge: state.tasks.filter(
        (t) =>
          (t.requesterId === ME && t.status === 'reported') ||
          (t.workerId === ME && t.status === 'assigned')
      ).length,
    },
    {
      route: { name: 'my' },
      label: '마이페이지',
      icon: 'user',
      tone: 'plain',
      badge: 0,
    },
  ]

  return (
    <nav
      className="tg-menu"
      aria-label="메뉴"
    >
      {items.map((item) => (
        <button
          key={item.route.name}
          type="button"
          className={cx('tg-menu__item', `tg-menu__item--${item.tone}`)}
          onClick={() => push(item.route)}
        >
          <span className="tg-menu__icon">
            <Icon
              name={item.icon}
              size={26}
            />
          </span>
          <span className="tg-menu__label">{item.label}</span>
          {item.badge > 0 && (
            <span
              className="tg-badge"
              aria-label={`새 알림 ${item.badge}개`}
            >
              {item.badge}
            </span>
          )}
          <Icon
            name="chevron"
            size={20}
          />
        </button>
      ))}
    </nav>
  )
}
