import type { ClassBlock } from '../types'
import { hashString, uid } from './id'

type Sample = Array<
  [name: string, day: number, start: string, end: string, place: string]
>

const SAMPLES: Sample[] = [
  [
    ['경영학원론', 0, '10:30', '11:45', '경영관 33101'],
    ['경영학원론', 2, '10:30', '11:45', '경영관 33101'],
    ['대학글쓰기', 1, '09:00', '10:15', '호암관 50212'],
    ['대학글쓰기', 3, '09:00', '10:15', '호암관 50212'],
    ['미적분학1', 0, '15:00', '16:15', '수선관 61234'],
    ['미적분학1', 2, '15:00', '16:15', '수선관 61234'],
    ['성균인성', 1, '13:30', '15:15', '600주년기념관 9B107'],
    ['컴퓨팅사고', 3, '15:00', '16:45', '국제관 9B310'],
    ['영어회화', 4, '10:30', '12:15', '퇴계인문관 31207'],
  ],
  [
    ['사회학개론', 0, '09:00', '10:15', '수선관 61102'],
    ['사회학개론', 2, '09:00', '10:15', '수선관 61102'],
    ['통계학입문', 1, '12:00', '13:15', '다산경제관 32304'],
    ['통계학입문', 3, '12:00', '13:15', '다산경제관 32304'],
    ['성균인성', 2, '14:00', '15:45', '600주년기념관 9B107'],
    ['대학글쓰기', 4, '09:00', '10:45', '호암관 50212'],
    ['심리학개론', 0, '13:30', '14:45', '호암관 50401'],
  ],
]

function toMinutes(value: string): number {
  const [h, m] = value.split(':').map(Number)
  return h * 60 + m
}

/**
 * 시간표 이미지에서 수업 목록을 읽는다.
 *
 * 지금은 데모용 모의 구현이라 파일 이름에 따라 예시 시간표 중 하나를 돌려준다.
 * 실제 서비스에서는 서버 Function이 이미지를 비전 모델에 보내고,
 * 과목명·요일·시간·강의실을 JSON으로 받아 이 형태로 돌려주도록 바꾸면 된다.
 */
export async function recognizeTimetable(file: File): Promise<ClassBlock[]> {
  await new Promise((resolve) => setTimeout(resolve, 2200))
  const sample = SAMPLES[hashString(file.name) % SAMPLES.length]
  return sample.map(([name, day, start, end, place]) => ({
    id: uid('c'),
    name,
    day,
    start: toMinutes(start),
    end: toMinutes(end),
    place,
  }))
}
