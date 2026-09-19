import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp, useNav } from '../store/context'
import { ME, findPerson, joinedChats, resolveChatPeer } from '../store/state'
import { SYSTEM_SENDER, type Student } from '../types'
import { THEME_LABEL } from '../data/labels'
import { cx } from '../lib/cx'
import { timeAgo } from '../lib/time'
import { Icon } from '../ui/Icon'
import {
  Avatar,
  AvatarStack,
  Button,
  Chip,
  Empty,
  RoleChip,
} from '../ui/primitives'

function chatLabel(chatId: string): string {
  if (chatId.startsWith('room:')) return '모임 채팅'
  if (chatId.startsWith('task:')) return '공강 마켓 채팅'
  return '1대1 채팅'
}

export function ChatScreen({ chatId }: { chatId: string }) {
  const { state, dispatch } = useApp()
  const { back, push } = useNav()
  const [text, setText] = useState('')
  const listRef = useRef<HTMLDivElement>(null)

  const isRoom = chatId.startsWith('room:')
  const room = isRoom
    ? state.rooms.find((r) => r.id === chatId.slice('room:'.length))
    : undefined
  const peer = isRoom ? undefined : resolveChatPeer(state, chatId)
  const messages = useMemo(
    () =>
      state.chatMessages
        .filter((m) => m.chatId === chatId)
        .sort((a, b) => a.at - b.at),
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

  const inRoom = room?.memberIds.includes(ME) ?? false
  if ((isRoom && !inRoom) || (!isRoom && !peer)) {
    return (
      <Empty
        title={
          isRoom ? '참여 중인 모임이 아니에요' : '채팅 상대를 찾을 수 없어요'
        }
        body={
          isRoom
            ? '모임에서 나왔거나 모임이 끝났어요'
            : '모임이나 부탁이 아직 진행 중인지 확인해 주세요'
        }
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

  const members = (room?.memberIds ?? [])
    .map((id) => findPerson(state, id))
    .filter((p): p is Student => Boolean(p))

  return (
    <div className="tg-chatscreen">
      {room ? (
        <div className="tg-chat__peer">
          <AvatarStack people={members} />
          <div className="tg-grow">
            <span className="tg-strong">{room.title}</span>
            <p className="tg-caption">
              모임 채팅 · {THEME_LABEL[room.theme]} · {room.memberIds.length}명
            </p>
          </div>
          <Button
            size="sm"
            variant="soft"
            onClick={() => push({ name: 'room', roomId: room.id })}
          >
            모임 정보
          </Button>
        </div>
      ) : (
        peer && (
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
        )
      )}

      <div
        ref={listRef}
        className="tg-chat__list"
      >
        {messages.length === 0 && !waiting && (
          <p className="tg-chat__hint">
            첫 메시지를 보내 보세요.
            {peer ? ` ${peer.nickname}님에게 바로 전달돼요.` : ''}
          </p>
        )}
        {messages.map((message) => {
          if (message.senderId === SYSTEM_SENDER) {
            return (
              <p
                key={message.id}
                className="tg-chat__system"
              >
                {message.text}
              </p>
            )
          }
          const mine = message.senderId === ME
          const sender = findPerson(state, message.senderId)
          return (
            <div
              key={message.id}
              className={cx('tg-bubblerow', mine && 'tg-bubblerow--mine')}
            >
              {!mine && sender && (
                <Avatar
                  person={sender}
                  size={28}
                />
              )}
              <div className="tg-bubblecol">
                {!mine && isRoom && sender && (
                  <span className="tg-bubble__name">{sender.nickname}</span>
                )}
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

/** "너 지금 공강이야?"에서 성사된 1대1과 참여 중인 모임의 채팅방 목록 */
export function ChatListScreen() {
  const { state } = useApp()
  const { push } = useNav()
  const chats = useMemo(() => joinedChats(state), [state])

  if (chats.length === 0) {
    return (
      <Empty
        title="아직 참여한 채팅방이 없어요"
        body="1대1 신청이 수락되거나 모임에 참여하면 여기에 채팅방이 생겨요"
      />
    )
  }

  return (
    <div className="tg-stack tg-stack--sm">
      <p className="tg-caption">
        성사된 1대1과 참여 중인 모임의 채팅방이에요. 최근 대화순으로 보여요.
      </p>
      <div className="tg-list">
        {chats.map((chat) => {
          const people = chat.peopleIds
            .filter((id) => chat.kind === 'dm' || id !== ME)
            .map((id) => findPerson(state, id))
            .filter((p): p is Student => Boolean(p))
          return (
            <button
              key={chat.chatId}
              type="button"
              className="tg-chatitem"
              onClick={() =>
                push({ name: 'chat', chatId: chat.chatId, title: chat.title })
              }
            >
              {chat.kind === 'dm' && people[0] ? (
                <Avatar person={people[0]} />
              ) : people.length > 0 ? (
                <AvatarStack
                  people={people}
                  max={3}
                />
              ) : (
                <span className="tg-chatitem__icon">
                  <Icon
                    name="people"
                    size={18}
                  />
                </span>
              )}
              <span className="tg-grow">
                <span className="tg-row">
                  <span className="tg-strong tg-chatitem__title">
                    {chat.title}
                  </span>
                  <Chip tone={chat.kind === 'dm' ? 'blue' : 'gold'}>
                    {chat.kind === 'dm'
                      ? '1대1'
                      : `모임 ${chat.peopleIds.length}명`}
                  </Chip>
                </span>
                <span className="tg-chatitem__last">{chat.lastText}</span>
              </span>
              <span className="tg-caption">{timeAgo(chat.lastAt)}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
