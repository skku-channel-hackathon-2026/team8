import { useMemo, useState } from 'react'
import { useApp, useMe, useNav } from '../store/context'
import { ME, findPerson } from '../store/state'
import { TASK_CATEGORY_LABEL } from '../data/labels'
import type { Moment, Task, TaskCategory } from '../types'
import { cx } from '../lib/cx'
import {
  fmt,
  fmtDuration,
  freeUntil,
  getFreeState,
  isVisiblyFree,
  parseHM,
} from '../lib/time'
import { Icon } from '../ui/Icon'
import { Leaf } from '../ui/Mascot'
import {
  Avatar,
  Button,
  Card,
  Chip,
  ChipButton,
  Empty,
  Field,
  LeafAmount,
  NumberStepper,
  SectionHead,
  Segmented,
  Sheet,
} from '../ui/primitives'

type Mode = 'sell' | 'buy'

function Price({ value }: { value: number }) {
  return (
    <span className="tg-price">
      <LeafAmount
        value={value}
        size="sm"
      />
    </span>
  )
}

function TaskMeta({ task, now }: { task: Task; now: Moment }) {
  const left = task.deadline - now.minutes
  return (
    <div className="tg-meta">
      <span>
        <Icon
          name="pin"
          size={13}
        />
        {task.place}
      </span>
      <span>
        <Icon
          name="clock"
          size={13}
        />
        {fmt(task.deadline)}까지
        {left > 0 ? ` · ${fmtDuration(left)} 남음` : ''}
      </span>
      <span>
        <Icon
          name="bolt"
          size={13}
        />
        약 {task.duration}분
      </span>
    </div>
  )
}

function TakeSheet({ task, onClose }: { task: Task; onClose: () => void }) {
  const { state, dispatch, now } = useApp()
  const me = useMe()
  const requester = findPerson(state, task.requesterId)
  const myUntil = freeUntil(me.timetable, now)
  const tight = myUntil !== null && now.minutes + task.duration > myUntil

  return (
    <Sheet
      title="공강 팔기"
      onClose={onClose}
      footer={
        <Button
          block
          variant="dark"
          onClick={() => {
            dispatch({ type: 'TAKE_TASK', taskId: task.id })
            onClose()
          }}
        >
          수락하고 {task.reward}잎 받기
        </Button>
      }
    >
      <div className="tg-stack">
        <div className="tg-row tg-row--between">
          <Chip tone="outline">{TASK_CATEGORY_LABEL[task.category]}</Chip>
          <Price value={task.reward} />
        </div>
        <h2 className="tg-h2">{task.title}</h2>
        <p className="tg-body">{task.detail}</p>
        <TaskMeta
          task={task}
          now={now}
        />
        {requester && (
          <Card>
            <div className="tg-row">
              <Avatar person={requester} />
              <div className="tg-grow">
                <p className="tg-strong">{requester.nickname}님의 부탁</p>
                <p className="tg-caption">
                  {requester.department} ·{' '}
                  {getFreeState(requester.timetable, now).kind === 'class'
                    ? '지금 수업 중'
                    : '바쁜 일정 중'}
                </p>
              </div>
            </div>
          </Card>
        )}
        {tight && myUntil !== null && (
          <div className="tg-banner">
            <Icon
              name="bell"
              size={16}
            />
            내 공강은 {fmt(myUntil)}까지예요. 다음 수업 전에 끝낼 수 있는지
            확인해 주세요.
          </div>
        )}
        <p className="tg-caption">
          보수는 부탁한 사람이 미리 맡겨 두었어요. 일을 마치고 완료 보고를 하면,
          상대가 확인하는 즉시 은행잎이 들어와요.
        </p>
      </div>
    </Sheet>
  )
}

const DURATIONS = [10, 20, 30, 60]
const CATEGORIES = Object.keys(TASK_CATEGORY_LABEL) as TaskCategory[]

function suggestedReward(duration: number): number {
  return Math.max(3, Math.round((duration / 10) * 4))
}

function PostTaskSheet({ onClose }: { onClose: () => void }) {
  const { state, dispatch, now } = useApp()
  const me = useMe()
  const { openSheet } = useNav()
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<TaskCategory>('errand')
  const [detail, setDetail] = useState('')
  const [place, setPlace] = useState('')
  const [deadline, setDeadline] = useState(
    fmt(Math.min(Math.ceil((now.minutes + 60) / 10) * 10, 23 * 60 + 50))
  )
  const [duration, setDuration] = useState(20)
  const [reward, setReward] = useState(suggestedReward(20))
  const deadlineMin = parseHM(deadline)
  const lacking = reward > me.leaves
  const freeCount = state.students.filter((s) => isVisiblyFree(s, now)).length
  const deadlineError =
    deadlineMin === null
      ? '시간을 확인해 주세요'
      : deadlineMin < now.minutes + duration
        ? '마감까지 소요 시간보다 여유가 있어야 해요'
        : ''
  const valid =
    title.trim().length >= 4 &&
    place.trim() !== '' &&
    deadlineError === '' &&
    !lacking

  return (
    <Sheet
      title="공강 사기 · 부탁 올리기"
      onClose={onClose}
      footer={
        <Button
          block
          variant="dark"
          disabled={!valid}
          onClick={() => {
            if (deadlineMin === null) return
            dispatch({
              type: 'POST_TASK',
              draft: {
                title: title.trim(),
                detail: detail.trim() || title.trim(),
                place: place.trim(),
                deadline: deadlineMin,
                duration,
                reward,
                category,
              },
            })
            onClose()
          }}
        >
          {reward}잎 맡기고 부탁 올리기
        </Button>
      }
    >
      <div className="tg-stack">
        <div className="tg-banner tg-banner--blue">
          <Icon
            name="people"
            size={16}
          />
          지금 공강인 학생 {freeCount}명에게 바로 보여요.
        </div>
        <Field label="무엇을 부탁할까요?">
          {(id) => (
            <input
              id={id}
              className="tg-input"
              placeholder="예: 프린트 10장 대신 뽑아주세요"
              value={title}
              maxLength={30}
              onChange={(event) => setTitle(event.target.value)}
            />
          )}
        </Field>
        <div className="tg-field">
          <span className="tg-label">종류</span>
          <div className="tg-chips">
            {CATEGORIES.map((c) => (
              <ChipButton
                key={c}
                pressed={category === c}
                onClick={() => setCategory(c)}
              >
                {TASK_CATEGORY_LABEL[c]}
              </ChipButton>
            ))}
          </div>
        </div>
        <Field label="자세한 내용 (선택)">
          {(id) => (
            <textarea
              id={id}
              className="tg-textarea"
              placeholder="어디서 무엇을 어떻게 하면 되는지 적어주세요"
              value={detail}
              onChange={(event) => setDetail(event.target.value)}
            />
          )}
        </Field>
        <Field label="장소">
          {(id) => (
            <input
              id={id}
              className="tg-input"
              placeholder="예: 학생회관 2층 → 경영관 1층"
              value={place}
              onChange={(event) => setPlace(event.target.value)}
            />
          )}
        </Field>
        <div className="tg-field">
          <span className="tg-label">예상 소요 시간</span>
          <div className="tg-chips">
            {DURATIONS.map((value) => (
              <ChipButton
                key={value}
                pressed={duration === value}
                onClick={() => {
                  setDuration(value)
                  setReward(suggestedReward(value))
                }}
              >
                {value}분
              </ChipButton>
            ))}
          </div>
        </div>
        <Field
          label="마감 시각"
          hint={deadlineError || undefined}
        >
          {(id) => (
            <input
              id={id}
              type="time"
              className="tg-input"
              value={deadline}
              step={600}
              onChange={(event) => setDeadline(event.target.value)}
            />
          )}
        </Field>
        <div className="tg-field">
          <span className="tg-label">보수</span>
          <div className="tg-row tg-row--between">
            <NumberStepper
              label="보수"
              value={reward}
              min={1}
              max={50}
              suffix="잎"
              onChange={setReward}
            />
            <span className="tg-caption">
              {duration}분 기준 추천 {suggestedReward(duration)}잎
            </span>
          </div>
          <p
            className="tg-hint"
            style={lacking ? { color: 'var(--tg-heart)' } : undefined}
          >
            보유 {me.leaves}잎 →{' '}
            {lacking ? '은행잎이 부족해요' : `올리면 ${me.leaves - reward}잎`}
            {lacking && (
              <>
                {' '}
                <button
                  type="button"
                  className="tg-linkbtn"
                  onClick={() => openSheet('charge')}
                >
                  충전하기
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </Sheet>
  )
}

function TaskCard({
  task,
  now,
  onTake,
  fits,
}: {
  task: Task
  now: Moment
  onTake: () => void
  fits: boolean
}) {
  const { state } = useApp()
  const requester = findPerson(state, task.requesterId)
  const expired = task.deadline <= now.minutes
  return (
    <div className={cx('tg-task', expired && 'tg-task--expired')}>
      <div className="tg-row tg-row--between">
        <div className="tg-row">
          <Chip tone="outline">{TASK_CATEGORY_LABEL[task.category]}</Chip>
          {expired ? (
            <Chip>마감</Chip>
          ) : (
            fits && (
              <Chip
                tone="green"
                icon="check"
              >
                내 공강에 딱
              </Chip>
            )
          )}
        </div>
        <Price value={task.reward} />
      </div>
      <span className="tg-h3">{task.title}</span>
      <p className="tg-mission__desc">{task.detail}</p>
      <TaskMeta
        task={task}
        now={now}
      />
      <div className="tg-row tg-row--between">
        {requester && (
          <span className="tg-row tg-caption">
            <Avatar
              person={requester}
              size={24}
            />
            {requester.nickname} · {requester.department}
          </span>
        )}
        <Button
          size="sm"
          variant="dark"
          disabled={expired}
          onClick={onTake}
        >
          이 공강 팔기
        </Button>
      </div>
    </div>
  )
}

function MyJob({ task }: { task: Task }) {
  const { state, dispatch, now } = useApp()
  const requester = findPerson(state, task.requesterId)
  return (
    <Card tone="blue">
      <div className="tg-stack tg-stack--sm">
        <div className="tg-row tg-row--between">
          <Chip tone="ink">내가 하는 일</Chip>
          <Price value={task.reward} />
        </div>
        <span className="tg-h3">{task.title}</span>
        <TaskMeta
          task={task}
          now={now}
        />
        <p className="tg-caption">{requester?.nickname}님의 부탁이에요</p>
        {task.status === 'assigned' ? (
          <Button
            variant="dark"
            icon="check"
            onClick={() => dispatch({ type: 'REPORT_TASK', taskId: task.id })}
          >
            완료 보고하기
          </Button>
        ) : (
          <Button
            variant="soft"
            disabled
          >
            {requester?.nickname}님의 확인을 기다리는 중
          </Button>
        )}
      </div>
    </Card>
  )
}

function MyRequest({ task }: { task: Task }) {
  const { state, dispatch, now } = useApp()
  const worker = task.workerId ? findPerson(state, task.workerId) : undefined
  const label: Record<Task['status'], string> = {
    open: '공강인 사람을 찾는 중',
    assigned: `${worker?.nickname ?? '누군가'}님이 하는 중`,
    reported: `${worker?.nickname ?? '누군가'}님이 완료를 보고했어요`,
    completed: `완료 · ${worker?.nickname ?? '누군가'}님에게 보수 전달`,
    cancelled: '취소됨',
  }
  return (
    <div className="tg-task">
      <div className="tg-row tg-row--between">
        <Chip
          tone={
            task.status === 'completed'
              ? 'green'
              : task.status === 'reported'
                ? 'red'
                : task.status === 'open'
                  ? 'tan'
                  : 'blue'
          }
          icon={task.status === 'completed' ? 'check' : 'clock'}
        >
          {label[task.status]}
        </Chip>
        <Price value={task.reward} />
      </div>
      <span className="tg-h3">{task.title}</span>
      <TaskMeta
        task={task}
        now={now}
      />
      {worker && task.status !== 'open' && (
        <span className="tg-row tg-caption">
          <Avatar
            person={worker}
            size={24}
          />
          {worker.nickname} · {worker.department}
        </span>
      )}
      {task.status === 'open' && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => dispatch({ type: 'CANCEL_TASK', taskId: task.id })}
        >
          부탁 취소하고 환불받기
        </Button>
      )}
      {task.status === 'reported' && (
        <Button
          variant="dark"
          icon="check"
          onClick={() => dispatch({ type: 'CONFIRM_TASK', taskId: task.id })}
        >
          완료 확인하고 {task.reward}잎 보내기
        </Button>
      )}
    </div>
  )
}

export function MarketScreen() {
  const { state, now } = useApp()
  const me = useMe()

  const [mode, setMode] = useState<Mode>('sell')
  const [fitOnly, setFitOnly] = useState(false)
  const [taking, setTaking] = useState<Task | null>(null)
  const [postOpen, setPostOpen] = useState(false)

  const myUntil = freeUntil(me.timetable, now)
  const fits = (task: Task) =>
    myUntil !== null &&
    now.minutes + task.duration <= myUntil &&
    now.minutes + task.duration <= task.deadline

  const openTasks = useMemo(
    () =>
      state.tasks
        .filter((t) => t.status === 'open' && t.requesterId !== ME)
        .sort((a, b) => {
          const endA = a.deadline <= now.minutes ? 1 : 0
          const endB = b.deadline <= now.minutes ? 1 : 0
          return endA - endB || a.deadline - b.deadline
        }),
    [state.tasks, now.minutes]
  )
  const shown = fitOnly ? openTasks.filter(fits) : openTasks
  const myJobs = state.tasks.filter(
    (t) =>
      t.workerId === ME && (t.status === 'assigned' || t.status === 'reported')
  )
  const myRequests = state.tasks
    .filter((t) => t.requesterId === ME && t.status !== 'cancelled')
    .sort((a, b) => b.createdAt - a.createdAt)
  const needConfirm = myRequests.filter((t) => t.status === 'reported').length

  return (
    <div className="tg-stack tg-stack--lg">
      <div className="tg-stack tg-stack--sm">
        <p className="tg-body">
          바쁜 사람은 은행잎으로 공강을 사고, 시간이 남는 사람은 공강을 팔아
          은행잎을 벌어요.
        </p>
      </div>

      <Segmented
        label="마켓 모드"
        value={mode}
        onChange={setMode}
        options={[
          { value: 'sell', label: '공강 팔기' },
          { value: 'buy', label: '공강 사기', badge: needConfirm },
        ]}
      />

      {mode === 'sell' && (
        <div className="tg-stack">
          <Card
            tone="gold"
            stack
          >
            <div className="tg-row">
              <Leaf size={30} />
              <div className="tg-grow">
                <p className="tg-strong">내 남는 시간으로 은행잎 벌기</p>
                <p className="tg-caption">
                  {myUntil !== null
                    ? `지금부터 ${fmt(myUntil)}까지 ${fmtDuration(myUntil - now.minutes)} 공강이에요`
                    : '공강일 때 부탁을 들어주면 보수를 받아요'}
                </p>
              </div>
            </div>
          </Card>

          {myJobs.length > 0 && (
            <div className="tg-stack tg-stack--sm">
              <SectionHead title="진행 중인 내 일" />
              {myJobs.map((task) => (
                <MyJob
                  key={task.id}
                  task={task}
                />
              ))}
            </div>
          )}

          <div className="tg-stack tg-stack--sm">
            <SectionHead
              title={`도움이 필요한 부탁 ${shown.length}`}
              action={
                myUntil !== null ? (
                  <ChipButton
                    pressed={fitOnly}
                    onClick={() => setFitOnly(!fitOnly)}
                    icon="check"
                  >
                    내 공강에 맞는 일
                  </ChipButton>
                ) : undefined
              }
            />
            {shown.length === 0 ? (
              <Empty
                title={
                  fitOnly
                    ? '내 공강에 맞는 부탁이 없어요'
                    : '아직 올라온 부탁이 없어요'
                }
                body="조금 뒤에 다시 확인해 보세요"
                mood="wow"
              />
            ) : (
              shown.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  now={now}
                  fits={fits(task)}
                  onTake={() => setTaking(task)}
                />
              ))
            )}
          </div>
        </div>
      )}

      {mode === 'buy' && (
        <div className="tg-stack">
          <Card
            tone="blue"
            stack
          >
            <div className="tg-stack tg-stack--sm">
              <p className="tg-strong">바쁠 땐 다른 사람의 공강을 사세요</p>
              <p className="tg-caption">
                은행잎을 보수로 맡겨 두고 부탁을 올리면, 공강인 학생이 대신
                해줘요. 완료를 확인해야 보수가 전달돼요.
              </p>
              <Button
                variant="dark"
                icon="plus"
                block
                onClick={() => setPostOpen(true)}
              >
                부탁 올리기
              </Button>
            </div>
          </Card>

          <div className="tg-stack tg-stack--sm">
            <SectionHead title={`내 부탁 ${myRequests.length}`} />
            {myRequests.length === 0 ? (
              <Empty
                title="아직 올린 부탁이 없어요"
                body="프린트, 줄서기, 과제 질문처럼 작은 일부터 부탁해 보세요"
              />
            ) : (
              myRequests.map((task) => (
                <MyRequest
                  key={task.id}
                  task={task}
                />
              ))
            )}
          </div>
        </div>
      )}

      {taking && (
        <TakeSheet
          task={taking}
          onClose={() => setTaking(null)}
        />
      )}
      {postOpen && <PostTaskSheet onClose={() => setPostOpen(false)} />}
    </div>
  )
}
