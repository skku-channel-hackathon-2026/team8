import { useApp, useNav } from '../store/context'
import type { AppNotification } from '../types'
import { cx } from '../lib/cx'
import { timeAgo } from '../lib/time'
import { Icon } from '../ui/Icon'
import { Leaf } from '../ui/Mascot'
import { Empty } from '../ui/primitives'

/**
 * 지금까지 받은 알림을 최신순으로 보여 준다.
 * 목록을 여는 것만으로는 읽음이 되지 않고, 누른 알림 하나만 읽음으로 바뀐다.
 */
export function NotificationsScreen() {
  const { state, dispatch } = useApp()
  const { push } = useNav()
  const notifications = state.notifications ?? []

  if (notifications.length === 0) {
    return (
      <Empty
        title="아직 받은 알림이 없어요"
        body="신청, 인증, 채팅, 마켓 소식이 여기에 모여요"
      />
    )
  }

  const sorted = [...notifications].sort((a, b) => b.at - a.at)
  const open = (item: AppNotification) => {
    if (!item.read) dispatch({ type: 'MARK_NOTIFICATION_READ', id: item.id })
    if (item.link) push(item.link)
  }

  return (
    <div className="tg-list tg-list--noti">
      {sorted.map((item) => (
        <button
          key={item.id}
          type="button"
          className={cx('tg-noti', !item.read && 'tg-noti--new')}
          onClick={() => open(item)}
        >
          <span className="tg-noti__icon">
            {item.tone === 'leaf' ? (
              <Leaf size={18} />
            ) : (
              <Icon
                name="bell"
                size={16}
              />
            )}
          </span>
          <span className="tg-grow">
            <span className="tg-noti__text">{item.text}</span>
            <span className="tg-caption">{timeAgo(item.at)}</span>
          </span>
          {!item.read && (
            <span
              className="tg-noti__dot"
              aria-label="안 읽음"
            />
          )}
          {item.link && (
            <Icon
              name="chevron"
              size={16}
            />
          )}
        </button>
      ))}
    </div>
  )
}
