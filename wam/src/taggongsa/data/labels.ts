import type { MeetTheme, MissionCategory, Role, TaskCategory } from '../types'

export const ROLE_LABEL: Record<Role, string> = {
  fresh: '새내기',
  senior: '헌내기',
}

export const THEME_LABEL: Record<MeetTheme, string> = {
  play: '오락',
  study: '스터디',
}

export const THEME_HINT: Record<MeetTheme, string> = {
  play: '보드게임, 산책, 노래방, 수다',
  study: '과제, 시험공부, 카공',
}

export const MISSION_CATEGORY_LABEL: Record<MissionCategory, string> = {
  campus: '캠퍼스',
  academic: '학사',
  life: '생활',
  digital: '디지털',
}

export const TASK_CATEGORY_LABEL: Record<TaskCategory, string> = {
  errand: '심부름',
  queue: '줄서기',
  study: '공부 도움',
  etc: '기타',
}

export const REWARDS = {
  signup: 10,
  steps: [5, 10, 10, 10],
  missionCreate: 15,
} as const

export const STEP_INFO = [
  {
    title: '시간표 올리기',
    summary: '시간표 사진을 올리면 AI가 공강과 강의실을 정리해요',
  },
  {
    title: 'GLS 탐방하기',
    summary: '학사 정보가 모두 모여 있는 GLS와 친해져요',
  },
  {
    title: '졸업 요건 확인하기',
    summary: '졸업까지 필요한 학점과 필수 과목을 미리 알아둬요',
  },
  {
    title: '기본 앱 확인하기',
    summary: '학교생활에 꼭 필요한 앱 네 가지를 설치해요',
  },
] as const

export const GLS_CHECKS = [
  { key: 'gls-login', label: 'GLS에 학번으로 로그인하기' },
  { key: 'gls-course', label: '수강신청 내역과 강의시간표 메뉴 찾기' },
  { key: 'gls-record', label: '학적·성적 조회 메뉴 위치 알아두기' },
]

export const GRAD_CHECKS = [
  { key: 'grad-credit', label: '우리 학과 졸업 이수 학점 확인하기' },
  { key: 'grad-liberal', label: '교양 필수 과목 목록 확인하기' },
  { key: 'grad-major', label: '전공 필수·전공 기초 과목 확인하기' },
]

export const BASIC_APPS = [
  {
    key: 'app-learningx',
    name: '러닝X',
    mark: 'LX',
    desc: '강의자료 확인, 과제 제출, 온라인 강의 수강',
  },
  {
    key: 'app-kingom',
    name: '킹고엠',
    mark: 'KM',
    desc: '모바일 학생증과 학사 공지, 식단 확인',
  },
  {
    key: 'app-attendance',
    name: '전자출결',
    mark: '출',
    desc: '수업 시작할 때 출석 체크',
  },
  {
    key: 'app-library',
    name: '삼성학술정보관',
    mark: '도',
    desc: '열람실 좌석 배정과 도서 대출·연장',
  },
]
