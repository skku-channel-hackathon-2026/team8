import type { ClassBlock, Moment } from '../types'

export const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일']
export const SCHOOL_START = 9 * 60
export const SCHOOL_END = 18 * 60

export function fmt(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function parseHM(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!match) return null
  const h = Number(match[1])
  const m = Number(match[2])
  if (h > 23 || m > 59) return null
  return h * 60 + m
}

export function fmtDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}분`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h}시간 ${m}분` : `${h}시간`
}

export function timeAgo(timestamp: number, now = Date.now()): string {
  const minutes = Math.max(0, Math.round((now - timestamp) / 60_000))
  if (minutes < 1) return '방금'
  if (minutes < 60) return `${minutes}분 전`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}시간 전`
  return `${Math.round(hours / 24)}일 전`
}

export function momentFromDate(date: Date): Moment {
  return {
    day: (date.getDay() + 6) % 7,
    minutes: date.getHours() * 60 + date.getMinutes(),
  }
}

export type FreeState =
  | { kind: 'none' }
  | { kind: 'weekend' }
  | { kind: 'off' }
  | { kind: 'class'; block: ClassBlock }
  | { kind: 'free'; until: number; next: ClassBlock | null }

/** 시간표와 현재 시각으로 공강 여부를 계산한다. 공강은 평일 09:00–18:00 사이 수업이 없는 시간이다. */
export function getFreeState(timetable: ClassBlock[], now: Moment): FreeState {
  if (timetable.length === 0) return { kind: 'none' }
  if (now.day > 4) return { kind: 'weekend' }
  if (now.minutes < SCHOOL_START || now.minutes >= SCHOOL_END) {
    return { kind: 'off' }
  }
  const today = timetable
    .filter((block) => block.day === now.day)
    .sort((a, b) => a.start - b.start)
  const current = today.find(
    (block) => block.start <= now.minutes && now.minutes < block.end
  )
  if (current) return { kind: 'class', block: current }
  const next = today.find((block) => block.start > now.minutes) ?? null
  return { kind: 'free', until: next ? next.start : SCHOOL_END, next }
}

export function isVisiblyFree(
  person: { timetable: ClassBlock[]; showFree: boolean },
  now: Moment
): boolean {
  return person.showFree && getFreeState(person.timetable, now).kind === 'free'
}

export function freeUntil(timetable: ClassBlock[], now: Moment): number | null {
  const state = getFreeState(timetable, now)
  return state.kind === 'free' ? state.until : null
}

export interface FreeCopy {
  title: string
  detail: string
}

export function describeFree(state: FreeState, now: Moment): FreeCopy {
  switch (state.kind) {
    case 'none':
      return {
        title: '시간표가 아직 없어요',
        detail: '시간표를 등록하면 지금 공강인지 알려드려요',
      }
    case 'weekend':
      return {
        title: '주말이에요',
        detail: '공강 상태는 평일 09:00–18:00에 표시돼요',
      }
    case 'off':
      return {
        title: '수업 시간이 아니에요',
        detail: '공강 상태는 평일 09:00–18:00에 표시돼요',
      }
    case 'class':
      return {
        title: '수업 중이에요',
        detail: `${state.block.name} · ${state.block.place} · ${fmt(state.block.end)} 종료`,
      }
    case 'free': {
      const left = fmtDuration(state.until - now.minutes)
      return {
        title: '지금은 공강이에요',
        detail: state.next
          ? `${fmt(state.until)} ${state.next.name} 전까지 · ${left} 남음`
          : `오늘 남은 수업이 없어요 · ${fmt(state.until)}까지 ${left}`,
      }
    }
  }
}
