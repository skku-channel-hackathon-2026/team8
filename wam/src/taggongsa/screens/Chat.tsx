import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp, useNav } from '../store/context'
import { ME, resolveChatPeer } from '../store/state'
import { cx } from '../lib/cx'
import { timeAgo } from '../lib/time'
import { Icon } from '../ui/Icon'
import { Avatar, Empty, RoleChip } from '../ui/primitives'

function chatLabel(chatId: string): string {
  if (chatId.startsWith('room:')) return '모임 채팅'
  if (chatId.startsWith('task:')) return '공강 마켓 채팅'
  return '1대1 채팅'
}

export function ChatScreen({ chatId }: { chatId: string }) {
  const { state, dispatch } = useApp()
  const { back } = useNav()
  const [text, setText] = useState('')
  const listRef = useRef<HTMLDivElement>(null)

  const peer = resolveChatPeer(state, chatId)
  const messages = useMemo(
    () => state.chatMessages.filter((m) => m.chatId === chatId),
    [state.chatMessages, chatId]
  )
  const waiting = state.chatPending.some((p) => p.chatId === chatId)

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [messages.length, waiting])

  const send = () => {
    const value = text.trim()
    if (!value) return
    dispatch({ type: 'SEND_CHAT_MESSAGE', chatId, text: value })
    setText('')
  }

  if (!peer) {
    return (
      <Empty
        title="채팅 상대를 찾을 수 없어요"
        body="모임이나 부탁이 아직 진행 중인지 확인해 주세요"
        mood="wow"
        action={
          <button
            type="button"
            className="tg-linkbtn"
            onClick={back}
          >
            돌아가기
          </button>
        }
      />
    )
  }

  return (
    <div className="tg-chatscreen">
      <div className="tg-chat__peer">
        <Avatar person={peer} />
        <div className="tg-grow">
          <div className="tg-row">
            <span className="tg-strong">{peer.nickname}</span>
            <RoleChip role={peer.role} />
          </div>
          <p className="tg-caption">
            {chatLabel(chatId)} · {peer.department}
          </p>
        </div>
      </div>

      <div
        ref={listRef}
        className="tg-chat__list"
      >
        {messages.length === 0 && !waiting && (
          <p className="tg-chat__hint">
            첫 메시지를 보내 보세요. {peer.nickname}님에게 바로 전달돼요.
          </p>
        )}
        {messages.map((message) => {
          const mine = message.senderId === ME
          return (
            <div
              key={message.id}
              className={cx('tg-bubblerow', mine && 'tg-bubblerow--mine')}
            >
              {!mine && (
                <Avatar
                  person={peer}
                  size={28}
                />
              )}
              <div className="tg-bubblecol">
                <span className={cx('tg-bubble', mine && 'tg-bubble--mine')}>
                  {message.text}
                </span>
                <span className="tg-bubble__time">{timeAgo(message.at)}</span>
              </div>
            </div>
          )
        })}
        {waiting && (
          <div className="tg-bubblerow">
            <Avatar
              person={peer}
              size={28}
            />
            <span className="tg-bubble tg-bubble--typing">
              <i />
              <i />
              <i />
            </span>
          </div>
        )}
      </div>

      <div className="tg-chat__input">
        <input
          className="tg-input"
          placeholder="메시지 보내기"
          value={text}
          maxLength={200}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') send()
          }}
        />
        <button
          type="button"
          className="tg-chat__send"
          aria-label="보내기"
          disabled={text.trim() === ''}
          onClick={send}
        >
          <Icon
            name="send"
            size={18}
          />
        </button>
      </div>
    </div>
  )
}
