export type Role = 'fresh' | 'senior'
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
  role: Role
  timetable: ClassBlock[]
  showFree: boolean
  tone: number
}

export interface Profile extends Student {
  leaves: number
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
  autoAt?: number
}

export interface LedgerEntry {
  id: string
  delta: number
  label: string
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

export interface ClockSetting {
  mode: 'demo' | 'real'
  day: number
  minutes: number
}
