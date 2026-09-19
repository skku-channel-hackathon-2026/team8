import type { Snapshot } from '@tutorial/shared'
import type {
  ChatMessage,
  LedgerEntry,
  MeetRequest,
  Mission,
  Room,
  Student,
  Submission,
  Task,
} from '../types'
import { ME } from '../data/seed'

/**
 * 서버가 보낸 스냅샷을 화면이 쓰는 모양으로 옮긴다.
 *
 * 두 가지가 다르다.
 *  - 서버의 내 id는 `채널:매니저`인데, 화면은 나를 언제나 'me'로 부른다.
 *    화면 곳곳에 `x.authorId === ME` 같은 비교가 있어서, 여기서 한 번 바꿔
 *    두면 화면은 손댈 것이 없다.
 *  - 서버는 비어 있음을 null로, 화면은 undefined로 쓴다.
 */

export interface LocalSnapshot {
  leaves: number
  steps: boolean[]
  timetable: Student['timetable']
  showFree: boolean
  students: Student[]
  missions: Mission[]
  submissions: Submission[]
  rooms: Room[]
  requests: MeetRequest[]
  tasks: Task[]
  ledger: LedgerEntry[]
  chatMessages: ChatMessage[]
}

export function toLocalSnapshot(
  snapshot: Snapshot,
  myId: string
): LocalSnapshot {
  /** 서버의 내 id는 화면에서 'me'가 된다. 남의 id는 그대로 둔다. */
  const mine = (id: string) => (id === myId ? ME : id)
  const mineOrNone = (id: string | null) => (id === null ? undefined : mine(id))

  return {
    leaves: snapshot.profile?.leaves ?? 0,
    steps: snapshot.profile?.steps ?? [false, false, false, false],
    timetable: snapshot.profile?.timetable ?? [],
    showFree: snapshot.profile?.showFree ?? true,

    students: snapshot.students.map((peer) => ({
      id: peer.id,
      nickname: peer.nickname,
      department: peer.department,
      campus: peer.campus,
      role: peer.role,
      timetable: peer.timetable,
      showFree: peer.showFree,
      tone: peer.tone,
    })),

    missions: snapshot.missions.map((m) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      proof: m.proof,
      reward: m.reward,
      category: m.category,
      authorId: mine(m.authorId),
      createdAt: m.createdAt,
      recommenders: m.recommenders.map(mine),
      completedCount: m.completedCount,
    })),

    submissions: snapshot.submissions.map((s) => ({
      id: s.id,
      missionId: s.missionId,
      userId: mine(s.userId),
      note: s.note,
      status: s.status,
      reviewerId: mineOrNone(s.reviewerId),
      createdAt: s.createdAt,
    })),

    rooms: snapshot.rooms.map((r) => ({
      id: r.id,
      title: r.title,
      theme: r.theme,
      place: r.place,
      until: r.until,
      max: r.max,
      hostId: mine(r.hostId),
      memberIds: r.memberIds.map(mine),
      note: r.note,
      createdAt: r.createdAt,
    })),

    requests: snapshot.requests.map((q) => ({
      id: q.id,
      kind: q.kind,
      fromId: mine(q.fromId),
      toId: mine(q.toId),
      theme: q.theme,
      message: q.message,
      roomId: q.roomId ?? undefined,
      status: q.status,
      createdAt: q.createdAt,
    })),

    tasks: snapshot.tasks.map((t) => ({
      id: t.id,
      title: t.title,
      detail: t.detail,
      place: t.place,
      deadline: t.deadline,
      duration: t.duration,
      reward: t.reward,
      category: t.category,
      requesterId: mine(t.requesterId),
      workerId: mineOrNone(t.workerId),
      status: t.status,
      createdAt: t.createdAt,
    })),

    ledger: snapshot.ledger.map((e) => ({
      id: e.id,
      delta: e.delta,
      label: e.label,
      at: e.at,
    })),

    chatMessages: snapshot.messages.map((m) => ({
      id: m.id,
      chatId: m.chatId,
      senderId: mine(m.senderId),
      text: m.text,
      at: m.at,
    })),
  }
}
