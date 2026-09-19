import type {
  ClassBlock,
  MeetRequest,
  Mission,
  Room,
  Student,
  Submission,
  Task,
} from '../types'
import { DEPARTMENTS_BY_CAMPUS } from './departments'

/**
 * 데모용 초기 데이터. 서버와 DB가 붙기 전까지 다른 학생·미션·모임·마켓 요청을 대신한다.
 * 기본 데모 시각(수요일 13:10)에 공강인 학생이 여럿 보이도록 시간표를 짰다.
 */

export const ME = 'me'

function hm(value: string): number {
  const [h, m] = value.split(':').map(Number)
  return h * 60 + m
}

let classSeq = 0
function c(
  name: string,
  day: number,
  start: string,
  end: string,
  place: string
): ClassBlock {
  classSeq += 1
  return {
    id: `seed_c${classSeq}`,
    name,
    day,
    start: hm(start),
    end: hm(end),
    place,
  }
}

function student(
  id: string,
  nickname: string,
  department: string,
  role: Student['role'],
  tone: number,
  timetable: ClassBlock[],
  showFree = true
): Student {
  const campus = DEPARTMENTS_BY_CAMPUS.natural.includes(department)
    ? 'natural'
    : 'humanities'
  return { id, nickname, department, campus, role, tone, timetable, showFree }
}

export function buildSeed(base = Date.now()) {
  const minutesAgo = (m: number) => base - m * 60_000

  const students: Student[] = [
    student('s1', '햄찌', '경영학과', 'fresh', 0, [
      c('경영학원론', 0, '10:30', '11:45', '경영관 33101'),
      c('경영학원론', 2, '10:30', '11:45', '경영관 33101'),
      c('미적분학1', 0, '15:00', '16:15', '수선관 61234'),
      c('미적분학1', 2, '15:00', '16:15', '수선관 61234'),
      c('대학글쓰기', 1, '09:00', '10:15', '호암관 50212'),
      c('대학글쓰기', 3, '09:00', '10:15', '호암관 50212'),
      c('영어회화', 4, '10:30', '12:15', '퇴계인문관 31207'),
    ]),
    student('s2', '와플', '소프트웨어학과', 'fresh', 1, [
      c('프로그래밍기초', 0, '09:00', '10:45', '제2공학관 27312'),
      c('이산수학', 2, '16:30', '17:45', '제2공학관 27315'),
      c('이산수학', 4, '16:30', '17:45', '제2공학관 27315'),
      c('성균인성', 1, '13:30', '15:15', '제1공학관 21101'),
    ]),
    student('s3', '도토리', '사회학과', 'fresh', 2, [
      c('사회학개론', 0, '09:00', '10:15', '수선관 61102'),
      c('사회학개론', 2, '09:00', '10:15', '수선관 61102'),
      c('성균인성', 2, '14:00', '15:45', '600주년기념관 9B107'),
      c('통계학입문', 1, '12:00', '13:15', '다산경제관 32304'),
    ]),
    student('s4', '밤톨', '경제학과', 'fresh', 3, [
      c('경제학원론', 0, '12:00', '13:15', '다산경제관 32201'),
      c('경제학원론', 2, '12:00', '13:15', '다산경제관 32201'),
      c('미적분학1', 1, '10:30', '11:45', '수선관 61234'),
    ]),
    student('s5', '라떼', '심리학과', 'fresh', 4, [
      c('심리학개론', 0, '10:30', '11:45', '호암관 50401'),
      c('심리학개론', 2, '10:30', '11:45', '호암관 50401'),
      c('대학글쓰기', 3, '13:30', '15:15', '호암관 50212'),
    ]),
    student('s6', '무지개', '영어영문학과', 'fresh', 1, [
      c('영미문학입문', 0, '13:00', '14:15', '퇴계인문관 31301'),
      c('영미문학입문', 2, '13:00', '14:15', '퇴계인문관 31301'),
      c('영어학개론', 1, '10:30', '11:45', '퇴계인문관 31205'),
    ]),
    student('s7', '곰돌', '행정학과', 'senior', 2, [
      c('행정법', 0, '15:00', '16:15', '법학관 50302'),
      c('행정법', 2, '15:00', '16:15', '법학관 50302'),
      c('정책학원론', 1, '09:00', '10:15', '법학관 50210'),
    ]),
    student('s8', '수선화', '국어국문학과', 'senior', 4, [
      c('현대소설론', 2, '12:00', '13:45', '퇴계인문관 31108'),
      c('고전시가론', 3, '10:30', '11:45', '퇴계인문관 31110'),
    ]),
    student('s9', '코코넛', '글로벌경영학과', 'senior', 0, [
      c('마케팅원론', 2, '16:30', '17:45', '경영관 33305'),
      c('재무관리', 0, '13:30', '14:45', '경영관 33207'),
      c('재무관리', 4, '13:30', '14:45', '경영관 33207'),
    ]),
    student('s10', '비버', '정치외교학과', 'senior', 3, [
      c('국제정치론', 2, '09:00', '10:15', '법학관 50201'),
      c('비교정치론', 1, '15:00', '16:15', '법학관 50203'),
    ]),
    student(
      's11',
      '구름',
      '미디어커뮤니케이션학과',
      'fresh',
      2,
      [c('미디어의이해', 1, '10:30', '11:45', '국제관 9B201')],
      false
    ),
    student('s12', '호두', '법학과', 'senior', 1, [
      c('민법총칙', 0, '13:00', '14:45', '법학관 50105'),
      c('민법총칙', 2, '13:00', '14:45', '법학관 50105'),
      c('형법총론', 3, '10:30', '12:15', '법학관 50107'),
    ]),
  ]

  const missions: Mission[] = [
    {
      id: 'm1',
      title: '챌린지 스퀘어 1개 인증하기',
      description:
        '챌린지 스퀘어에서 진행 중인 챌린지 하나에 참여해 보세요. 선후배를 자연스럽게 만날 수 있어요.',
      proof: '참여 화면 캡처 또는 현장 사진',
      reward: 10,
      category: 'campus',
      authorId: 's7',
      createdAt: minutesAgo(60 * 30),
      recommenders: ['s9', 's10', 's12'],
      completedCount: 14,
    },
    {
      id: 'm2',
      title: '마이크로소프트 계정 만들기',
      description:
        '학교 이메일로 Microsoft 365 계정을 만들면 Word, PowerPoint, Excel을 무료로 쓸 수 있어요.',
      proof: '로그인된 화면 캡처',
      reward: 5,
      category: 'digital',
      authorId: 's9',
      createdAt: minutesAgo(60 * 50),
      recommenders: ['s7', 's8', 's10', 's12'],
      completedCount: 23,
    },
    {
      id: 'm3',
      title: '교내 학생식당 두 곳에서 밥 먹기',
      description:
        '캠퍼스 안 학생식당 두 곳을 찾아가서 한 끼씩 먹어 보세요. 공강 시간 밥 약속이 쉬워져요.',
      proof: '식판 또는 식당 입구 사진 두 장',
      reward: 10,
      category: 'life',
      authorId: 's8',
      createdAt: minutesAgo(60 * 20),
      recommenders: ['s7'],
      completedCount: 9,
    },
    {
      id: 'm4',
      title: '동아리 박람회 부스 3곳 방문하기',
      description:
        '관심 있는 동아리 부스 세 곳에 들러 이야기를 들어 보세요. 가입하지 않아도 괜찮아요.',
      proof: '부스에서 받은 리플릿이나 사진',
      reward: 15,
      category: 'life',
      authorId: 's10',
      createdAt: minutesAgo(60 * 8),
      recommenders: ['s9'],
      completedCount: 5,
    },
    {
      id: 'm5',
      title: '교수님 오피스아워 한 번 가보기',
      description:
        '수업 질문 하나를 준비해서 교수님 오피스아워에 찾아가 보세요. 생각보다 훨씬 반겨주세요.',
      proof: '준비한 질문과 느낀 점 한 줄',
      reward: 20,
      category: 'academic',
      authorId: 's12',
      createdAt: minutesAgo(60 * 70),
      recommenders: ['s7', 's8', 's9', 's10'],
      completedCount: 3,
    },
    {
      id: 'm6',
      title: '명륜당 앞에서 사진 남기기',
      description:
        '성균관의 상징인 명륜당 앞에서 사진을 찍어 보세요. 가을엔 은행나무가 정말 예뻐요.',
      proof: '명륜당이 보이는 사진',
      reward: 5,
      category: 'campus',
      authorId: 's7',
      createdAt: minutesAgo(60 * 90),
      recommenders: ['s12'],
      completedCount: 31,
    },
  ]

  const submissions: Submission[] = [
    {
      id: 'sub1',
      missionId: 'm2',
      userId: 's1',
      note: '학교 메일로 가입하고 PPT까지 열어봤어요!',
      status: 'pending',
      createdAt: minutesAgo(12),
    },
    {
      id: 'sub2',
      missionId: 'm6',
      userId: 's3',
      note: '명륜당 앞 은행나무가 너무 예뻐서 여러 장 찍었어요.',
      status: 'pending',
      createdAt: minutesAgo(35),
    },
  ]

  const rooms: Room[] = [
    {
      id: 'r1',
      title: '보드게임 한 판 할 사람',
      theme: 'play',
      place: '학생회관 3층 라운지',
      until: hm('14:30'),
      max: 5,
      hostId: 's1',
      memberIds: ['s1', 's5'],
      note: '할리갈리랑 루미큐브 챙겨왔어요',
      createdAt: minutesAgo(15),
    },
    {
      id: 'r2',
      title: '미적분 과제 같이 풀어요',
      theme: 'study',
      place: '수선관 1층 스터디카페',
      until: hm('15:00'),
      max: 4,
      hostId: 's2',
      memberIds: ['s2', 's3', 's9'],
      note: '3장 연습문제 위주로 봐요',
      createdAt: minutesAgo(25),
    },
    {
      id: 'r3',
      title: '명륜당 산책하고 사진 찍기',
      theme: 'play',
      place: '명륜당 앞',
      until: hm('14:00'),
      max: 6,
      hostId: 's7',
      memberIds: ['s7'],
      note: '새내기 환영! 캠퍼스 명소 알려줄게요',
      createdAt: minutesAgo(5),
    },
    {
      id: 'r4',
      title: '중간고사 대비 카공',
      theme: 'study',
      place: '600주년기념관 카페',
      until: hm('16:30'),
      max: 6,
      hostId: 's10',
      memberIds: ['s10'],
      note: '각자 공부하다가 모르는 거 서로 물어봐요',
      createdAt: minutesAgo(40),
    },
  ]

  const requests: MeetRequest[] = [
    {
      id: 'q1',
      kind: 'dm',
      fromId: 's2',
      toId: ME,
      theme: 'study',
      message: '혹시 미적분 과제 같이 할래요? 수선관 1층에 있어요!',
      status: 'pending',
      createdAt: minutesAgo(3),
    },
    {
      id: 'q2',
      kind: 'room',
      fromId: 's5',
      toId: ME,
      theme: 'play',
      roomId: 'r1',
      message: "'보드게임 한 판 할 사람' 모임에 초대해요",
      status: 'pending',
      createdAt: minutesAgo(8),
    },
  ]

  const tasks: Task[] = [
    {
      id: 't1',
      title: '프린트 10장 대신 뽑아주세요',
      detail:
        '학생회관 2층 프린터에서 PDF 10장을 출력해서 경영관 1층 로비로 가져다 주세요. 파일은 수락하면 바로 보내드려요.',
      place: '학생회관 → 경영관 1층',
      deadline: hm('13:50'),
      duration: 20,
      reward: 10,
      category: 'errand',
      requesterId: 's4',
      status: 'open',
      createdAt: minutesAgo(6),
    },
    {
      id: 't2',
      title: '학식 줄 대신 서 주실 분',
      detail:
        '14:15에 수업이 끝나자마자 먹을 수 있게 13:55쯤부터 줄을 서 주세요. 제 식권은 미리 사둘게요.',
      place: '학생회관 식당',
      deadline: hm('14:15'),
      duration: 20,
      reward: 8,
      category: 'queue',
      requesterId: 's6',
      status: 'open',
      createdAt: minutesAgo(10),
    },
    {
      id: 't3',
      title: '경제수학 과제 질문 봐주실 분',
      detail: '편미분 부분에서 막혔어요. 30분만 같이 봐 주시면 돼요.',
      place: '다산경제관 1층 라운지',
      deadline: hm('15:30'),
      duration: 30,
      reward: 20,
      category: 'study',
      requesterId: 's4',
      status: 'open',
      createdAt: minutesAgo(18),
    },
    {
      id: 't4',
      title: '사물함에서 교재 전달',
      detail:
        '법학관 4층 사물함에서 민법 교재를 꺼내 14:45 수업 끝날 때 강의실 앞으로 가져다 주세요. 비밀번호는 수락 후 알려드려요.',
      place: '법학관 4층',
      deadline: hm('14:45'),
      duration: 15,
      reward: 8,
      category: 'errand',
      requesterId: 's12',
      status: 'open',
      createdAt: minutesAgo(22),
    },
    {
      id: 't5',
      title: '동아리 포스터 5장 붙이기',
      detail:
        '문학 동아리 모집 포스터를 게시판 다섯 곳에 붙여 주세요. 위치는 사진으로 알려드려요.',
      place: '호암관·수선관 게시판',
      deadline: hm('16:30'),
      duration: 30,
      reward: 12,
      category: 'etc',
      requesterId: 's8',
      status: 'open',
      createdAt: minutesAgo(30),
    },
    {
      id: 't6',
      title: '커피 두 잔 사다주세요',
      detail:
        '수업 끝나고 바로 회의라 시간이 없어요. 아이스 아메리카노 두 잔 부탁해요. 커피값은 따로 보내드려요.',
      place: '퇴계인문관 1층',
      deadline: hm('13:45'),
      duration: 15,
      reward: 6,
      category: 'errand',
      requesterId: 's8',
      status: 'open',
      createdAt: minutesAgo(2),
    },
  ]

  return { students, missions, submissions, rooms, requests, tasks }
}
