import type {
  Campus,
  ClassBlock,
  ClockSetting,
  LedgerEntry,
  MeetRequest,
  MeetTheme,
  Mission,
  MissionCategory,
  Moment,
  Profile,
  Role,
  Room,
  StepId,
  Student,
  Submission,
  Task,
  TaskCategory,
  Toast,
  ToastTone,
} from '../types'
import { ME, buildSeed } from '../data/seed'
import { REWARDS, STEP_INFO, THEME_LABEL } from '../data/labels'
import { hashPick, hashString, uid } from '../lib/id'
import { isVisiblyFree, momentFromDate } from '../lib/time'

export { ME }

export interface TutorialState {
  done: boolean[]
  checks: Record<string, boolean>
  gradCredits: string
}

export interface AppState {
  version: 2
  profile: Profile | null
  tutorial: TutorialState
  students: Student[]
  missions: Mission[]
  submissions: Submission[]
  requests: MeetRequest[]
  rooms: Room[]
  tasks: Task[]
  ledger: LedgerEntry[]
  clock: ClockSetting
  toasts: Toast[]
}

export interface MissionDraft {
  title: string
  description: string
  proof: string
  reward: number
  category: MissionCategory
}

export interface RoomDraft {
  id: string
  title: string
  theme: MeetTheme
  place: string
  until: number
  max: number
  note: string
}

export interface TaskDraft {
  title: string
  detail: string
  place: string
  deadline: number
  duration: number
  reward: number
  category: TaskCategory
}

export type Action =
  | {
      type: 'SIGN_UP'
      role: Role
      campus: Campus
      department: string
      nickname: string
    }
  | { type: 'LOAD_ACCOUNT'; state: AppState }
  | { type: 'LOG_OUT' }
  | { type: 'SET_TIMETABLE'; blocks: ClassBlock[] }
  | { type: 'SET_SHOW_FREE'; value: boolean }
  | { type: 'CHARGE'; amount: number; price: number }
  | { type: 'TOGGLE_CHECK'; key: string }
  | { type: 'SET_GRAD_CREDITS'; value: string }
  | { type: 'COMPLETE_STEP'; step: StepId }
  | { type: 'CREATE_MISSION'; draft: MissionDraft }
  | { type: 'TOGGLE_RECOMMEND'; missionId: string }
  | { type: 'SUBMIT_MISSION'; missionId: string; note: string; photo?: string }
  | { type: 'REVIEW_SUBMISSION'; id: string; approve: boolean }
  | { type: 'SEND_DM'; toId: string; theme: MeetTheme; message: string }
  | { type: 'RESPOND_REQUEST'; id: string; accept: boolean }
  | { type: 'CREATE_ROOM'; draft: RoomDraft }
  | { type: 'JOIN_ROOM'; roomId: string }
  | { type: 'LEAVE_ROOM'; roomId: string }
  | { type: 'INVITE'; roomId: string; toIds: string[] }
  | { type: 'POST_TASK'; draft: TaskDraft }
  | { type: 'CANCEL_TASK'; taskId: string }
  | { type: 'TAKE_TASK'; taskId: string }
  | { type: 'REPORT_TASK'; taskId: string }
  | { type: 'CONFIRM_TASK'; taskId: string }
  | { type: 'SET_CLOCK'; clock: ClockSetting }
  | { type: 'TICK'; now: number }
  | { type: 'TOAST'; text: string; tone?: ToastTone }
  | { type: 'DISMISS_TOAST'; id: string }

export const AVATAR_TONES = 5

/** 데모 시각의 기본값은 수요일 13:10이다. 주말이나 밤에 시연해도 공강인 학생이 보이게 하기 위함이다. */
export const DEFAULT_CLOCK: ClockSetting = {
  mode: 'demo',
  day: 2,
  minutes: 13 * 60 + 10,
}

export function createInitialState(): AppState {
  return {
    version: 2,
    profile: null,
    tutorial: {
      done: [false, false, false, false],
      checks: {},
      gradCredits: '',
    },
    ...buildSeed(),
    ledger: [],
    clock: DEFAULT_CLOCK,
    toasts: [],
  }
}

export function momentOf(clock: ClockSetting): Moment {
  return clock.mode === 'demo'
    ? { day: clock.day, minutes: clock.minutes }
    : momentFromDate(new Date())
}

export function findPerson(
  state: AppState,
  id: string
): Student | Profile | undefined {
  if (id === ME) return state.profile ?? undefined
  return state.students.find((s) => s.id === id)
}

function nick(state: AppState, id: string | undefined): string {
  if (!id) return '누군가'
  return findPerson(state, id)?.nickname ?? '누군가'
}

function toast(
  state: AppState,
  text: string,
  tone: ToastTone = 'default'
): AppState {
  return {
    ...state,
    toasts: [...state.toasts, { id: uid('toast'), text, tone }].slice(-3),
  }
}

function grant(state: AppState, delta: number, label: string): AppState {
  if (!state.profile) return state
  return {
    ...state,
    profile: { ...state.profile, leaves: state.profile.leaves + delta },
    ledger: [
      { id: uid('l'), delta, label, at: Date.now() },
      ...state.ledger,
    ].slice(0, 60),
  }
}

function patchTask(
  state: AppState,
  id: string,
  patch: Partial<Task>
): AppState {
  return {
    ...state,
    tasks: state.tasks.map((task) =>
      task.id === id ? { ...task, ...patch } : task
    ),
  }
}

function completeStep(state: AppState, step: StepId): AppState {
  if (state.tutorial.done[step]) return state
  const done = [...state.tutorial.done]
  done[step] = true
  const reward = REWARDS.steps[step]
  let next: AppState = { ...state, tutorial: { ...state.tutorial, done } }
  next = grant(next, reward, `튜토리얼 ${step}단계 · ${STEP_INFO[step].title}`)
  return toast(next, `${step}단계 완료! 은행잎 ${reward}잎을 받았어요`, 'leaf')
}

function tick(state: AppState, now: number): AppState {
  let next = state
  const moment = momentOf(state.clock)

  for (const sub of state.submissions) {
    if (
      sub.userId !== ME ||
      sub.status !== 'pending' ||
      !sub.resolveAt ||
      sub.resolveAt > now
    ) {
      continue
    }
    const reviewer = hashPick(
      state.students.filter((s) => s.role === 'senior'),
      sub.id
    )
    const mission = state.missions.find((m) => m.id === sub.missionId)
    next = {
      ...next,
      submissions: next.submissions.map((s) =>
        s.id === sub.id
          ? {
              ...s,
              status: 'approved',
              reviewerId: reviewer.id,
              resolveAt: undefined,
            }
          : s
      ),
      missions: next.missions.map((m) =>
        m.id === sub.missionId
          ? { ...m, completedCount: m.completedCount + 1 }
          : m
      ),
    }
    if (mission) {
      next = grant(next, mission.reward, `미션 인증 · ${mission.title}`)
      next = toast(
        next,
        `${reviewer.nickname}님이 인증을 인정했어요 · +${mission.reward}잎`,
        'leaf'
      )
    }
  }

  for (const req of state.requests) {
    if (
      req.fromId !== ME ||
      req.status !== 'pending' ||
      !req.resolveAt ||
      req.resolveAt > now
    ) {
      continue
    }
    next = {
      ...next,
      requests: next.requests.map((r) =>
        r.id === req.id ? { ...r, status: 'accepted', resolveAt: undefined } : r
      ),
    }
    const who = nick(state, req.toId)
    if (req.kind === 'room' && req.roomId) {
      next = {
        ...next,
        rooms: next.rooms.map((room) =>
          room.id === req.roomId &&
          !room.memberIds.includes(req.toId) &&
          room.memberIds.length < room.max
            ? { ...room, memberIds: [...room.memberIds, req.toId] }
            : room
        ),
      }
      next = toast(next, `${who}님이 모임에 들어왔어요`)
    } else {
      next = toast(
        next,
        `${who}님이 ${THEME_LABEL[req.theme]} 신청을 수락했어요!`
      )
    }
  }

  for (const task of state.tasks) {
    if (!task.autoAt || task.autoAt > now) continue
    if (task.requesterId === ME && task.status === 'open') {
      const free = state.students.filter((s) => isVisiblyFree(s, moment))
      const worker = hashPick(free.length > 0 ? free : state.students, task.id)
      next = patchTask(next, task.id, {
        status: 'assigned',
        workerId: worker.id,
        autoAt: now + 8000,
      })
      next = toast(
        next,
        `${worker.nickname}님이 공강을 팔았어요 · ${task.title}`
      )
    } else if (task.requesterId === ME && task.status === 'assigned') {
      next = patchTask(next, task.id, { status: 'reported', autoAt: undefined })
      next = toast(next, `${nick(state, task.workerId)}님이 완료를 보고했어요`)
    } else if (task.workerId === ME && task.status === 'reported') {
      next = patchTask(next, task.id, {
        status: 'completed',
        autoAt: undefined,
      })
      next = grant(next, task.reward, `공강 판매 · ${task.title}`)
      next = toast(
        next,
        `${nick(state, task.requesterId)}님이 완료를 확인했어요 · +${task.reward}잎`,
        'leaf'
      )
    } else {
      next = patchTask(next, task.id, { autoAt: undefined })
    }
  }

  return next
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SIGN_UP': {
      const profile: Profile = {
        id: ME,
        nickname: action.nickname,
        department: action.department,
        campus: action.campus,
        role: action.role,
        timetable: [],
        showFree: true,
        tone: hashString(action.nickname) % AVATAR_TONES,
        leaves: 0,
      }
      const next = grant(
        { ...state, profile },
        REWARDS.signup,
        '가입 축하 은행잎'
      )
      return toast(
        next,
        `환영해요, ${action.nickname}님! 은행잎 ${REWARDS.signup}잎을 드렸어요`,
        'leaf'
      )
    }

    case 'LOAD_ACCOUNT':
      return toast(
        {
          ...action.state,
          clock: action.state.clock ?? DEFAULT_CLOCK,
          toasts: [],
        },
        `다시 만나서 반가워요, ${action.state.profile?.nickname ?? ''}님`
      )

    case 'LOG_OUT':
      return createInitialState()

    case 'SET_TIMETABLE': {
      if (!state.profile) return state
      const next: AppState = {
        ...state,
        profile: { ...state.profile, timetable: action.blocks },
      }
      return action.blocks.length > 0 ? completeStep(next, 0) : next
    }

    case 'SET_SHOW_FREE':
      if (!state.profile) return state
      return toast(
        { ...state, profile: { ...state.profile, showFree: action.value } },
        action.value ? '공강 상태를 공개했어요' : '공강 상태를 숨겼어요'
      )

    case 'CHARGE':
      return toast(
        grant(
          state,
          action.amount,
          `은행잎 충전 · ${action.price.toLocaleString('ko-KR')}원`
        ),
        `은행잎 ${action.amount}잎을 충전했어요`,
        'leaf'
      )

    case 'TOGGLE_CHECK':
      return {
        ...state,
        tutorial: {
          ...state.tutorial,
          checks: {
            ...state.tutorial.checks,
            [action.key]: !state.tutorial.checks[action.key],
          },
        },
      }

    case 'SET_GRAD_CREDITS':
      return {
        ...state,
        tutorial: { ...state.tutorial, gradCredits: action.value },
      }

    case 'COMPLETE_STEP': {
      const previous = state.tutorial.done.slice(0, action.step)
      if (!previous.every(Boolean)) return state
      return completeStep(state, action.step)
    }

    case 'CREATE_MISSION': {
      if (!state.profile || state.profile.role !== 'senior') return state
      const mission: Mission = {
        id: uid('m'),
        ...action.draft,
        authorId: ME,
        createdAt: Date.now(),
        recommenders: [],
        completedCount: 0,
      }
      const next = grant(
        { ...state, missions: [mission, ...state.missions] },
        REWARDS.missionCreate,
        `미션 제작 · ${mission.title}`
      )
      return toast(
        next,
        `미션을 올렸어요! 은행잎 ${REWARDS.missionCreate}잎을 받았어요`,
        'leaf'
      )
    }

    case 'TOGGLE_RECOMMEND': {
      if (state.profile?.role !== 'senior') return state
      return {
        ...state,
        missions: state.missions.map((m) => {
          if (m.id !== action.missionId || m.authorId === ME) return m
          const on = m.recommenders.includes(ME)
          return {
            ...m,
            recommenders: on
              ? m.recommenders.filter((id) => id !== ME)
              : [...m.recommenders, ME],
          }
        }),
      }
    }

    case 'SUBMIT_MISSION': {
      const exists = state.submissions.some(
        (s) =>
          s.userId === ME &&
          s.missionId === action.missionId &&
          s.status !== 'rejected'
      )
      if (exists) return state
      const submission: Submission = {
        id: uid('sub'),
        missionId: action.missionId,
        userId: ME,
        note: action.note,
        photo: action.photo,
        status: 'pending',
        createdAt: Date.now(),
        resolveAt: Date.now() + 4500,
      }
      return toast(
        { ...state, submissions: [submission, ...state.submissions] },
        '인증을 보냈어요. 헌내기 선배가 확인하면 완료돼요'
      )
    }

    case 'REVIEW_SUBMISSION': {
      const target = state.submissions.find((s) => s.id === action.id)
      if (!target || target.status !== 'pending' || target.userId === ME)
        return state
      const next: AppState = {
        ...state,
        submissions: state.submissions.map((s) =>
          s.id === action.id
            ? {
                ...s,
                status: action.approve ? 'approved' : 'rejected',
                reviewerId: ME,
              }
            : s
        ),
        missions: action.approve
          ? state.missions.map((m) =>
              m.id === target.missionId
                ? { ...m, completedCount: m.completedCount + 1 }
                : m
            )
          : state.missions,
      }
      return toast(
        next,
        action.approve
          ? `${nick(state, target.userId)}님의 인증을 인정했어요`
          : `${nick(state, target.userId)}님의 인증을 반려했어요`
      )
    }

    case 'SEND_DM': {
      const exists = state.requests.some(
        (r) =>
          r.kind === 'dm' &&
          r.fromId === ME &&
          r.toId === action.toId &&
          r.status === 'pending'
      )
      if (exists) return state
      const request: MeetRequest = {
        id: uid('q'),
        kind: 'dm',
        fromId: ME,
        toId: action.toId,
        theme: action.theme,
        message: action.message,
        status: 'pending',
        createdAt: Date.now(),
        resolveAt: Date.now() + 5000,
      }
      return toast(
        { ...state, requests: [request, ...state.requests] },
        `${nick(state, action.toId)}님에게 ${THEME_LABEL[action.theme]} 신청을 보냈어요`
      )
    }

    case 'RESPOND_REQUEST': {
      const target = state.requests.find((r) => r.id === action.id)
      if (!target || target.toId !== ME || target.status !== 'pending')
        return state
      let next: AppState = {
        ...state,
        requests: state.requests.map((r) =>
          r.id === action.id
            ? { ...r, status: action.accept ? 'accepted' : 'declined' }
            : r
        ),
      }
      if (action.accept && target.kind === 'room' && target.roomId) {
        next = {
          ...next,
          rooms: next.rooms.map((room) =>
            room.id === target.roomId &&
            !room.memberIds.includes(ME) &&
            room.memberIds.length < room.max
              ? { ...room, memberIds: [...room.memberIds, ME] }
              : room
          ),
        }
      }
      return toast(
        next,
        action.accept
          ? `${nick(state, target.fromId)}님의 신청을 수락했어요`
          : '신청을 거절했어요'
      )
    }

    case 'CREATE_ROOM': {
      const room: Room = {
        ...action.draft,
        hostId: ME,
        memberIds: [ME],
        createdAt: Date.now(),
      }
      return toast(
        { ...state, rooms: [room, ...state.rooms] },
        '모임방을 만들었어요'
      )
    }

    case 'JOIN_ROOM':
      return toast(
        {
          ...state,
          rooms: state.rooms.map((room) =>
            room.id === action.roomId &&
            !room.memberIds.includes(ME) &&
            room.memberIds.length < room.max
              ? { ...room, memberIds: [...room.memberIds, ME] }
              : room
          ),
        },
        '모임에 참여했어요'
      )

    case 'LEAVE_ROOM':
      return toast(
        {
          ...state,
          rooms: state.rooms
            .map((room) =>
              room.id === action.roomId
                ? {
                    ...room,
                    memberIds: room.memberIds.filter((id) => id !== ME),
                  }
                : room
            )
            .filter((room) => room.memberIds.length > 0),
        },
        '모임에서 나왔어요'
      )

    case 'INVITE': {
      const room = state.rooms.find((r) => r.id === action.roomId)
      if (!room) return state
      const already = new Set(
        state.requests
          .filter((r) => r.roomId === room.id && r.fromId === ME)
          .map((r) => r.toId)
      )
      const targets = action.toIds.filter(
        (id) => !already.has(id) && !room.memberIds.includes(id)
      )
      if (targets.length === 0) return state
      const created: MeetRequest[] = targets.map((toId, index) => ({
        id: uid('q'),
        kind: 'room',
        fromId: ME,
        toId,
        theme: room.theme,
        roomId: room.id,
        message: `'${room.title}' 모임에 초대해요`,
        status: 'pending',
        createdAt: Date.now(),
        resolveAt: Date.now() + 3000 + index * 1800,
      }))
      return toast(
        { ...state, requests: [...created, ...state.requests] },
        `${targets.length}명에게 초대를 보냈어요`
      )
    }

    case 'POST_TASK': {
      if (!state.profile) return state
      if (state.profile.leaves < action.draft.reward) {
        return toast(state, '은행잎이 부족해요. 충전 후 다시 시도해 주세요')
      }
      const task: Task = {
        id: uid('t'),
        ...action.draft,
        requesterId: ME,
        status: 'open',
        createdAt: Date.now(),
        autoAt: Date.now() + 6000,
      }
      const next = grant(
        { ...state, tasks: [task, ...state.tasks] },
        -task.reward,
        `공강 사기 · ${task.title} (보수 예치)`
      )
      return toast(next, '부탁을 올렸어요. 공강인 사람을 찾고 있어요')
    }

    case 'CANCEL_TASK': {
      const task = state.tasks.find((t) => t.id === action.taskId)
      if (!task || task.requesterId !== ME || task.status !== 'open')
        return state
      const next = grant(
        patchTask(state, task.id, { status: 'cancelled', autoAt: undefined }),
        task.reward,
        `공강 사기 취소 · ${task.title} (환불)`
      )
      return toast(next, `부탁을 취소하고 ${task.reward}잎을 돌려받았어요`)
    }

    case 'TAKE_TASK': {
      const task = state.tasks.find((t) => t.id === action.taskId)
      if (!task || task.status !== 'open' || task.requesterId === ME)
        return state
      return toast(
        patchTask(state, task.id, { status: 'assigned', workerId: ME }),
        '공강을 팔았어요! 일을 마치면 완료 보고를 눌러 주세요'
      )
    }

    case 'REPORT_TASK': {
      const task = state.tasks.find((t) => t.id === action.taskId)
      if (!task || task.workerId !== ME || task.status !== 'assigned')
        return state
      return toast(
        patchTask(state, task.id, {
          status: 'reported',
          autoAt: Date.now() + 4000,
        }),
        '완료를 보고했어요. 확인되면 보수가 들어와요'
      )
    }

    case 'CONFIRM_TASK': {
      const task = state.tasks.find((t) => t.id === action.taskId)
      if (!task || task.requesterId !== ME || task.status !== 'reported')
        return state
      return toast(
        patchTask(state, task.id, { status: 'completed' }),
        `${nick(state, task.workerId)}님에게 ${task.reward}잎을 보냈어요`,
        'leaf'
      )
    }

    case 'SET_CLOCK':
      return { ...state, clock: action.clock }

    case 'TICK':
      return tick(state, action.now)

    case 'TOAST':
      return toast(state, action.text, action.tone)

    case 'DISMISS_TOAST':
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.id),
      }
  }
}
