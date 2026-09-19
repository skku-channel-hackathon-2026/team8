import { useMemo, useState } from 'react'
import { useApp, useMe, useNav } from '../store/context'
import { ME, findPerson } from '../store/state'
import { THEME_HINT, THEME_LABEL } from '../data/labels'
import type {
  ClassBlock,
  MeetRequest,
  MeetTheme,
  Moment,
  Room,
  Student,
} from '../types'
import { cx } from '../lib/cx'
import { uid } from '../lib/id'
import {
  describeFree,
  fmt,
  fmtDuration,
  freeUntil,
  getFreeState,
  isVisiblyFree,
  parseHM,
  timeAgo,
} from '../lib/time'
import { Icon, type IconName } from '../ui/Icon'
import {
  Avatar,
  AvatarStack,
  Button,
  Card,
  CheckRow,
  Chip,
  ChipButton,
  Empty,
  Field,
  NumberStepper,
  RoleChip,
  SectionHead,
  Segmented,
  Sheet,
  StatusDot,
  Switch,
} from '../ui/primitives'

const THEME_ICON: Record<MeetTheme, IconName> = { play: 'game', study: 'book' }

export function ThemeChip({ theme }: { theme: MeetTheme }) {
  return (
    <Chip
      tone={theme === 'play' ? 'gold' : 'blue'}
      icon={THEME_ICON[theme]}
    >
      {THEME_LABEL[theme]}
    </Chip>
  )
}

function lastPlace(timetable: ClassBlock[], now: Moment): string | null {
  const earlier = timetable
    .filter((b) => b.day === now.day && b.end <= now.minutes)
    .sort((a, b) => b.end - a.end)[0]
  return earlier ? earlier.place.split(' ')[0] : null
}

function FreeLine({ person, now }: { person: Student; now: Moment }) {
  const until = freeUntil(person.timetable, now)
  if (until === null) return null
  const near = lastPlace(person.timetable, now)
  return (
    <span className="tg-person__free">
      <StatusDot tone="free" />
      {fmt(until)}까지 공강 · {fmtDuration(until - now.minutes)}
      {near && <span className="tg-caption"> · {near} 근처</span>}
    </span>
  )
}

function ThemePicker({
  value,
  onChange,
}: {
  value: MeetTheme
  onChange: (theme: MeetTheme) => void
}) {
  return (
    <div
      className="tg-theme-pick"
      role="radiogroup"
      aria-label="테마"
    >
      {(['play', 'study'] as MeetTheme[]).map((theme) => (
        <button
          key={theme}
          type="button"
          role="radio"
          aria-checked={value === theme}
          className="tg-choice"
          onClick={() => onChange(theme)}
        >
          <span className="tg-choice__icon">
            <Icon
              name={THEME_ICON[theme]}
              size={22}
            />
          </span>
          <span>
            <span className="tg-choice__title">{THEME_LABEL[theme]}</span>
            <span
              className="tg-choice__body"
              style={{ display: 'block' }}
            >
              {THEME_HINT[theme]}
            </span>
          </span>
        </button>
      ))}
    </div>
  )
}

const DM_TEMPLATE: Record<MeetTheme, string> = {
  play: '공강 겹치는데 같이 놀아요! 가볍게 산책이나 보드게임 어때요?',
  study: '공강 시간에 같이 공부해요! 각자 과제하면서 모르는 거 물어봐요.',
}

function DmSheet({
  target,
  onClose,
}: {
  target: Student
  onClose: () => void
}) {
  const { dispatch, now } = useApp()
  const [theme, setTheme] = useState<MeetTheme>('play')
  const [message, setMessage] = useState(DM_TEMPLATE.play)
  const [edited, setEdited] = useState(false)

  const changeTheme = (next: MeetTheme) => {
    setTheme(next)
    if (!edited) setMessage(DM_TEMPLATE[next])
  }

  return (
    <Sheet
      title="1대1 공강 신청"
      onClose={onClose}
      footer={
        <Button
          block
          variant="dark"
          icon="send"
          onClick={() => {
            dispatch({
              type: 'SEND_DM',
              toId: target.id,
              theme,
              message: message.trim() || DM_TEMPLATE[theme],
            })
            onClose()
          }}
        >
          {THEME_LABEL[theme]} 신청 보내기
        </Button>
      }
    >
      <div className="tg-stack">
        <Card>
          <div className="tg-row">
            <Avatar
              person={target}
              size={48}
            />
            <div className="tg-grow">
              <div className="tg-row">
                <span className="tg-h3">{target.nickname}</span>
                <RoleChip role={target.role} />
              </div>
              <p className="tg-caption">{target.department}</p>
              <FreeLine
                person={target}
                now={now}
              />
            </div>
          </div>
        </Card>
        <div className="tg-field">
          <span className="tg-label">무엇을 함께할까요?</span>
          <ThemePicker
            value={theme}
            onChange={changeTheme}
          />
        </div>
        <Field label="한마디">
          {(id) => (
            <textarea
              id={id}
              className="tg-textarea"
              value={message}
              maxLength={120}
              onChange={(event) => {
                setEdited(true)
                setMessage(event.target.value)
              }}
            />
          )}
        </Field>
      </div>
    </Sheet>
  )
}

function roundUp(minutes: number, step = 10): number {
  return Math.ceil(minutes / step) * step
}

function CreateRoomSheet({ onClose }: { onClose: () => void }) {
  const { dispatch, now } = useApp()
  const me = useMe()
  const { push } = useNav()
  const defaultUntil = freeUntil(me.timetable, now) ?? roundUp(now.minutes + 60)
  const [title, setTitle] = useState('')
  const [theme, setTheme] = useState<MeetTheme>('play')
  const [place, setPlace] = useState('')
  const [until, setUntil] = useState(fmt(Math.min(defaultUntil, 23 * 60 + 50)))
  const [max, setMax] = useState(4)
  const [note, setNote] = useState('')
  const untilMin = parseHM(until)
  const valid =
    title.trim().length >= 2 &&
    place.trim() !== '' &&
    untilMin !== null &&
    untilMin > now.minutes

  return (
    <Sheet
      title="모임방 만들기"
      onClose={onClose}
      footer={
        <Button
          block
          variant="dark"
          disabled={!valid}
          onClick={() => {
            if (untilMin === null) return
            const id = uid('r')
            dispatch({
              type: 'CREATE_ROOM',
              draft: {
                id,
                title: title.trim(),
                theme,
                place: place.trim(),
                until: untilMin,
                max,
                note: note.trim(),
              },
            })
            onClose()
            push({ name: 'room', roomId: id })
          }}
        >
          모임방 열기
        </Button>
      }
    >
      <div className="tg-stack">
        <div className="tg-field">
          <span className="tg-label">테마</span>
          <ThemePicker
            value={theme}
            onChange={setTheme}
          />
        </div>
        <Field label="모임 이름">
          {(id) => (
            <input
              id={id}
              className="tg-input"
              placeholder={
                theme === 'play'
                  ? '예: 할리갈리 한 판 할 사람'
                  : '예: 미적분 과제 같이 풀어요'
              }
              value={title}
              maxLength={24}
              onChange={(event) => setTitle(event.target.value)}
            />
          )}
        </Field>
        <Field label="모이는 곳">
          {(id) => (
            <input
              id={id}
              className="tg-input"
              placeholder="예: 학생회관 3층 라운지"
              value={place}
              onChange={(event) => setPlace(event.target.value)}
            />
          )}
        </Field>
        <div className="tg-grid2">
          <Field
            label="몇 시까지"
            hint={
              untilMin !== null && untilMin <= now.minutes
                ? '지금보다 늦은 시각을 골라주세요'
                : undefined
            }
          >
            {(id) => (
              <input
                id={id}
                type="time"
                className="tg-input"
                value={until}
                step={600}
                onChange={(event) => setUntil(event.target.value)}
              />
            )}
          </Field>
          <div className="tg-field">
            <span className="tg-label">최대 인원</span>
            <NumberStepper
              label="최대 인원"
              value={max}
              min={2}
              max={8}
              suffix="명"
              onChange={setMax}
            />
          </div>
        </div>
        <Field label="한마디 (선택)">
          {(id) => (
            <input
              id={id}
              className="tg-input"
              placeholder="예: 보드게임 챙겨왔어요"
              value={note}
              maxLength={40}
              onChange={(event) => setNote(event.target.value)}
            />
          )}
        </Field>
      </div>
    </Sheet>
  )
}

function IncomingRequest({ request }: { request: MeetRequest }) {
  const { state, dispatch } = useApp()
  const from = findPerson(state, request.fromId)
  const room = request.roomId
    ? state.rooms.find((r) => r.id === request.roomId)
    : undefined
  if (!from) return null
  return (
    <div className="tg-request">
      <div className="tg-row">
        <Avatar person={from} />
        <div className="tg-grow">
          <div className="tg-row">
            <span className="tg-strong">{from.nickname}</span>
            <ThemeChip theme={request.theme} />
          </div>
          <p className="tg-caption">
            {request.kind === 'room' ? '모임 초대' : '1대1 신청'} ·{' '}
            {from.department} · {timeAgo(request.createdAt)}
          </p>
        </div>
      </div>
      <p className="tg-body">{request.message}</p>
      {room && (
        <p className="tg-meta">
          <span>
            <Icon
              name="pin"
              size={13}
            />
            {room.place}
          </span>
          <span>
            <Icon
              name="clock"
              size={13}
            />
            {fmt(room.until)}까지
          </span>
        </p>
      )}
      <div className="tg-row">
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            dispatch({ type: 'RESPOND_REQUEST', id: request.id, accept: false })
          }
        >
          거절
        </Button>
        <Button
          size="sm"
          variant="dark"
          className="tg-grow"
          onClick={() =>
            dispatch({ type: 'RESPOND_REQUEST', id: request.id, accept: true })
          }
        >
          수락하기
        </Button>
      </div>
    </div>
  )
}

function RoomCard({ room, now }: { room: Room; now: Moment }) {
  const { state } = useApp()
  const { push } = useNav()
  const members = room.memberIds
    .map((id) => findPerson(state, id))
    .filter((p): p is Student => Boolean(p))
  const mine = room.memberIds.includes(ME)
  const ended = room.until <= now.minutes
  return (
    <button
      type="button"
      className={cx('tg-room', mine && 'tg-room--mine')}
      style={ended ? { opacity: 0.5 } : undefined}
      onClick={() => push({ name: 'room', roomId: room.id })}
    >
      <div className="tg-row tg-row--between">
        <div className="tg-row">
          <ThemeChip theme={room.theme} />
          {mine && <Chip tone="ink">참여 중</Chip>}
          {ended && <Chip>끝남</Chip>}
        </div>
        <AvatarStack people={members} />
      </div>
      <span className="tg-h3">{room.title}</span>
      <div className="tg-meta">
        <span>
          <Icon
            name="pin"
            size={13}
          />
          {room.place}
        </span>
        <span>
          <Icon
            name="clock"
            size={13}
          />
          {fmt(room.until)}까지
        </span>
        <span>
          <Icon
            name="people"
            size={13}
          />
          {room.memberIds.length}/{room.max}명
        </span>
      </div>
    </button>
  )
}

type Filter = 'all' | 'fresh' | 'senior'

export function MeetScreen() {
  const { state, now, dispatch } = useApp()
  const me = useMe()
  const { hint, push } = useNav()
  const [mode, setMode] = useState<'room' | 'dm'>(hint === 'dm' ? 'dm' : 'room')
  const [filter, setFilter] = useState<Filter>('all')
  const [dmTarget, setDmTarget] = useState<Student | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const myFree = getFreeState(me.timetable, now)
  const myCopy = describeFree(myFree, now)
  const free = state.students.filter((s) => isVisiblyFree(s, now))
  const shown = free.filter((s) => filter === 'all' || s.role === filter)
  const incoming = state.requests.filter(
    (r) => r.toId === ME && r.status === 'pending'
  )
  const rooms = useMemo(
    () =>
      [...state.rooms].sort((a, b) => {
        const mineA = a.memberIds.includes(ME) ? 0 : 1
        const mineB = b.memberIds.includes(ME) ? 0 : 1
        const endA = a.until <= now.minutes ? 1 : 0
        const endB = b.until <= now.minutes ? 1 : 0
        return mineA - mineB || endA - endB || a.until - b.until
      }),
    [state.rooms, now.minutes]
  )

  const sentTo = (id: string) =>
    state.requests.find(
      (r) => r.kind === 'dm' && r.fromId === ME && r.toId === id
    )

  return (
    <div className="tg-stack tg-stack--lg">
      <div className="tg-stack tg-stack--sm">
        <h1 className="tg-h1">너 지금 공강이야?</h1>
        <p className="tg-body">
          공강이 겹치는 학생과 오락이나 스터디를 함께해요. 모임방에 모이거나
          1대1로 신청할 수 있어요.
        </p>
      </div>

      <Card>
        <div className="tg-row">
          <StatusDot
            tone={
              myFree.kind === 'free'
                ? 'free'
                : myFree.kind === 'class'
                  ? 'busy'
                  : 'idle'
            }
          />
          <div className="tg-grow">
            <p className="tg-strong">나 · {myCopy.title}</p>
            <p className="tg-caption">
              {me.showFree
                ? '다른 학생에게 내 공강이 보여요'
                : '내 공강은 숨김 상태예요'}
            </p>
          </div>
          {myFree.kind === 'none' ? (
            <Button
              size="sm"
              onClick={() => push({ name: 'timetable' })}
            >
              시간표 추가
            </Button>
          ) : (
            <Switch
              label="내 공강 공개"
              checked={me.showFree}
              onChange={(value) => dispatch({ type: 'SET_SHOW_FREE', value })}
            />
          )}
        </div>
      </Card>

      {incoming.length > 0 && (
        <div className="tg-stack tg-stack--sm">
          <SectionHead
            title={`받은 신청 ${incoming.length}`}
            caption="수락하면 상대에게 바로 알려줘요"
          />
          {incoming.map((request) => (
            <IncomingRequest
              key={request.id}
              request={request}
            />
          ))}
        </div>
      )}

      <Segmented
        label="만남 방식"
        value={mode}
        onChange={setMode}
        options={[
          { value: 'room', label: `모임 ${rooms.length}` },
          { value: 'dm', label: `1대1 · 공강 ${free.length}명` },
        ]}
      />

      {mode === 'room' && (
        <div className="tg-stack tg-stack--sm">
          <Button
            variant="dark"
            icon="plus"
            block
            onClick={() => setCreateOpen(true)}
          >
            모임방 만들기
          </Button>
          {rooms.length === 0 ? (
            <Empty
              title="아직 열린 모임이 없어요"
              body="첫 모임방을 열고 공강인 친구를 초대해 보세요"
            />
          ) : (
            rooms.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                now={now}
              />
            ))
          )}
        </div>
      )}

      {mode === 'dm' && (
        <div className="tg-stack tg-stack--sm">
          <div className="tg-chips">
            {(
              [
                ['all', `전체 ${free.length}`],
                ['fresh', '새내기'],
                ['senior', '헌내기'],
              ] as Array<[Filter, string]>
            ).map(([value, label]) => (
              <ChipButton
                key={value}
                pressed={filter === value}
                onClick={() => setFilter(value)}
              >
                {label}
              </ChipButton>
            ))}
          </div>
          {shown.length === 0 ? (
            <Empty
              title="지금 공강인 학생이 없어요"
              body="수업이 끝나는 시간에 다시 들러 보세요"
              mood="wow"
            />
          ) : (
            <div className="tg-list">
              {shown.map((student) => {
                const sent = sentTo(student.id)
                return (
                  <div
                    key={student.id}
                    className="tg-person"
                  >
                    <Avatar person={student} />
                    <div className="tg-grow">
                      <div className="tg-person__name">
                        {student.nickname}
                        <RoleChip role={student.role} />
                      </div>
                      <p className="tg-person__meta">{student.department}</p>
                      <FreeLine
                        person={student}
                        now={now}
                      />
                    </div>
                    {sent?.status === 'accepted' ? (
                      <Chip
                        tone="green"
                        icon="check"
                      >
                        수락함
                      </Chip>
                    ) : sent?.status === 'pending' ? (
                      <Button
                        size="sm"
                        variant="soft"
                        disabled
                      >
                        대기 중
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => setDmTarget(student)}
                      >
                        신청
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {dmTarget && (
        <DmSheet
          target={dmTarget}
          onClose={() => setDmTarget(null)}
        />
      )}
      {createOpen && <CreateRoomSheet onClose={() => setCreateOpen(false)} />}
    </div>
  )
}

export function RoomScreen({ roomId }: { roomId: string }) {
  const { state, now, dispatch } = useApp()
  const { back } = useNav()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const room = state.rooms.find((r) => r.id === roomId)

  if (!room) {
    return (
      <Empty
        title="모임이 끝났어요"
        body="모든 사람이 나가면 모임방은 사라져요"
        action={
          <Button
            variant="outline"
            onClick={back}
          >
            돌아가기
          </Button>
        }
      />
    )
  }

  const isMember = room.memberIds.includes(ME)
  const full = room.memberIds.length >= room.max
  const members = room.memberIds
    .map((id) => findPerson(state, id))
    .filter((p): p is Student => Boolean(p))
  const invitable = state.students.filter(
    (s) => isVisiblyFree(s, now) && !room.memberIds.includes(s.id)
  )
  const inviteState = (id: string) =>
    state.requests.find(
      (r) => r.roomId === room.id && r.fromId === ME && r.toId === id
    )
  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <div className="tg-stack tg-stack--lg">
      <div className="tg-stack tg-stack--sm">
        <div className="tg-row">
          <ThemeChip theme={room.theme} />
          {full && <Chip tone="red">정원 마감</Chip>}
        </div>
        <h1 className="tg-h1">{room.title}</h1>
        <div className="tg-meta">
          <span>
            <Icon
              name="pin"
              size={13}
            />
            {room.place}
          </span>
          <span>
            <Icon
              name="clock"
              size={13}
            />
            {fmt(room.until)}까지
          </span>
          <span>
            <Icon
              name="people"
              size={13}
            />
            {room.memberIds.length}/{room.max}명
          </span>
        </div>
        {room.note && (
          <div className="tg-banner">
            <Icon
              name="sparkle"
              size={16}
            />
            {room.note}
          </div>
        )}
      </div>

      {!isMember && (
        <Button
          variant="dark"
          block
          disabled={full}
          onClick={() => dispatch({ type: 'JOIN_ROOM', roomId: room.id })}
        >
          {full ? '정원이 다 찼어요' : '이 모임에 참여하기'}
        </Button>
      )}

      <div className="tg-stack tg-stack--sm">
        <SectionHead title={`함께하는 사람 ${members.length}`} />
        <div className="tg-list">
          {members.map((person) => (
            <div
              key={person.id}
              className="tg-person"
            >
              <Avatar person={person} />
              <div className="tg-grow">
                <div className="tg-person__name">
                  {person.id === ME
                    ? `${person.nickname} (나)`
                    : person.nickname}
                  <RoleChip role={person.role} />
                  {person.id === room.hostId && <Chip tone="ink">방장</Chip>}
                </div>
                <p className="tg-person__meta">{person.department}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {isMember && (
        <div className="tg-stack tg-stack--sm">
          <SectionHead
            title="공강인 친구 초대하기"
            caption="지금 공강이고 상태를 공개한 학생만 보여요"
          />
          {invitable.length === 0 ? (
            <Empty
              title="초대할 수 있는 학생이 없어요"
              mood="wow"
            />
          ) : (
            <div className="tg-list">
              {invitable.map((student) => {
                const invited = inviteState(student.id)
                if (invited) {
                  return (
                    <div
                      key={student.id}
                      className="tg-person"
                    >
                      <Avatar person={student} />
                      <div className="tg-grow">
                        <div className="tg-person__name">
                          {student.nickname}
                        </div>
                        <FreeLine
                          person={student}
                          now={now}
                        />
                      </div>
                      <Chip
                        tone={invited.status === 'accepted' ? 'green' : 'blue'}
                      >
                        {invited.status === 'accepted' ? '참여함' : '초대함'}
                      </Chip>
                    </div>
                  )
                }
                return (
                  <CheckRow
                    key={student.id}
                    checked={selected.has(student.id)}
                    onToggle={() => toggle(student.id)}
                    aside={<RoleChip role={student.role} />}
                  >
                    {student.nickname}
                    <span
                      className="tg-caption"
                      style={{ display: 'block', textDecoration: 'none' }}
                    >
                      {student.department} ·{' '}
                      {fmt(freeUntil(student.timetable, now) ?? 0)}까지 공강
                    </span>
                  </CheckRow>
                )
              })}
            </div>
          )}
          <Button
            block
            icon="send"
            disabled={selected.size === 0 || full}
            onClick={() => {
              dispatch({
                type: 'INVITE',
                roomId: room.id,
                toIds: [...selected],
              })
              setSelected(new Set())
            }}
          >
            {selected.size > 0
              ? `${selected.size}명에게 초대 보내기`
              : '초대할 친구를 골라주세요'}
          </Button>
        </div>
      )}

      {isMember && (
        <Button
          variant="danger"
          size="md"
          icon="logout"
          onClick={() => {
            dispatch({ type: 'LEAVE_ROOM', roomId: room.id })
            back()
          }}
        >
          모임 나가기
        </Button>
      )}
    </div>
  )
}
