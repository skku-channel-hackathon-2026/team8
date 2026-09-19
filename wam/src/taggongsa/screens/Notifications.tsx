import { useEffect, useState } from 'react'
import { useApp, useNav } from '../store/context'
import { cx } from '../lib/cx'
import { timeAgo } from '../lib/time'
import { Icon } from '../ui/Icon'
import { Leaf } from '../ui/Mascot'
import { Empty } from '../ui/primitives'

/** 지금까지 받은 알림을 최신순으로 보여 준다. 열면 모두 읽음으로 바뀐다. */
export function NotificationsScreen() {
  const { state, dispatch } = useApp()
  const { push } = useNav()
  const notifications = state.notifications ?? []
  // 이번에 열기 전까지 안 읽었던 알림은 표시를 남겨 둔다.
  const [unreadIds] = useState(
    () => new Set(notifications.filter((n) => !n.read).map((n) => n.id))
  )

  useEffect(() => {
    dispatch({ type: 'MARK_NOTIFICATIONS_READ' })
  }, [dispatch, notifications.length])

  if (notifications.length === 0) {
    return (
      <Empty
        title="아직 받은 알림이 없어요"
        body="신청, 인증, 채팅, 마켓 소식이 여기에 모여요"
      />
    )
  }

  const sorted = [...notifications].sort((a, b) => b.at - a.at)

  return (
    <div className="tg-list">
      {sorted.map((item) => {
        const content = (
          <>
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
            {unreadIds.has(item.id) && (
              <span
                className="tg-noti__dot"
                aria-label="새 알림"
              />
            )}
            {item.link && (
              <Icon
                name="chevron"
                size={16}
              />
            )}
          </>
        )
        return item.link ? (
          <button
            key={item.id}
            type="button"
            className={cx('tg-noti', unreadIds.has(item.id) && 'tg-noti--new')}
            onClick={() => item.link && push(item.link)}
          >
            {content}
          </button>
        ) : (
          <div
            key={item.id}
            className={cx('tg-noti', unreadIds.has(item.id) && 'tg-noti--new')}
          >
            {content}
          </div>
        )
      })}
    </div>
  )
}
