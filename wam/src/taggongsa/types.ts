export type Role = 'fresh' | 'senior'
export type Campus = 'humanities' | 'natural'
export type MeetTheme = 'play' | 'study'
export type StepId = 0 | 1 | 2 | 3

/** 수업 한 칸. day: 0=월 … 4=금, start/end: 자정부터 흐른 분 */
export interface ClassBlock {
  id: string
  name: string
  day: number
  start: number
  end: number
  place: string
}

export interface Student {
  id: string
  nickname: string
  department: string
  campus: Campus
  role: Role
  timetable: ClassBlock[]
  showFree: boolean
  tone: number
}

export interface Profile extends Student {
  leaves: number
  /** 채널톡이 보증한 신원. 서버·DB에 기록을 저장할 때 이 값이 키가 된다. */
  channelId: string
  managerId: string
}

export type MissionCategory = 'campus' | 'academic' | 'life' | 'digital'

export interface Mission {
  id: string
  title: string
  description: string
  proof: string
  reward: number
  category: MissionCategory
  authorId: string
  createdAt: number
  recommenders: string[]
  completedCount: number
}

export type SubmissionStatus = 'pending' | 'approved' | 'rejected'

export interface Submission {
  id: string
  missionId: string
  userId: string
  note: string
  photo?: string
  status: SubmissionStatus
  reviewerId?: string
  createdAt: number
  /** 데모에서 선배의 심사를 흉내 낼 시각 */
  resolveAt?: number
}

export type RequestStatus = 'pending' | 'accepted' | 'declined'

export interface MeetRequest {
  id: string
  kind: 'dm' | 'room'
  fromId: string
  toId: string
  theme: MeetTheme
  message: string
  roomId?: string
  status: RequestStatus
  createdAt: number
  /** 데모에서 상대의 응답을 흉내 낼 시각 */
  resolveAt?: number
}

export interface Room {
  id: string
  title: string
  theme: MeetTheme
  place: string
  until: number
  max: number
  hostId: string
  memberIds: string[]
  note: string
  createdAt: number
}

export type TaskCategory = 'errand' | 'queue' | 'study' | 'etc'
export type TaskStatus =
  'open' | 'assigned' | 'reported' | 'completed' | 'cancelled'

export interface Task {
  id: string
  title: string
  detail: string
  place: string
  deadline: number
  duration: number
  reward: number
  category: TaskCategory
  requesterId: string
  workerId?: string
  status: TaskStatus
  createdAt: number
  /** 데모에서 다음 단계로 넘어갈 시각 */
  autoAt?: number
}

export interface LedgerEntry {
  id: string
  delta: number
  label: string
  at: number
}

/**
 * chatId 형식: `dm:<상대ID>` · `room:<모임ID>` · `task:<부탁ID>`.
 * 서버 없이 도는 데모에서는 상대의 답장을 tick()이 흉내 낸다.
 */
export interface ChatMessage {
  id: string
  chatId: string
  /** 보낸 사람 id. `system`이면 입장 안내 같은 시스템 메시지다. */
  senderId: string
  text: string
  at: number
}

export const SYSTEM_SENDER = 'system'

/** 알림을 눌렀을 때 이동할 화면 */
export type NotificationLink =
  | { name: 'tutorial' }
  | { name: 'meet' }
  | { name: 'market' }
  | { name: 'my' }
  | { name: 'chats' }
  | { name: 'chat'; chatId: string; title?: string }

export interface AppNotification {
  id: string
  text: string
  tone: ToastTone
  at: number
  read: boolean
  link?: NotificationLink
}

export interface ChatPending {
  chatId: string
  at: number
}

export type ToastTone = 'default' | 'leaf'

export interface Toast {
  id: string
  text: string
  tone: ToastTone
}

/** day: 0=월 … 6=일 */
export interface Moment {
  day: number
  minutes: number
}
