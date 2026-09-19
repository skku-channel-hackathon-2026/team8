import { useMemo, useState, type ReactNode } from 'react'
import { useApp, useMe, useNav } from '../store/context'
import { ME, findPerson, type AppState } from '../store/state'
import {
  BASIC_APPS,
  GLS_CHECKS,
  GRAD_CHECKS,
  MISSION_CATEGORY_LABEL,
  REWARDS,
  STEP_INFO,
} from '../data/labels'
import type { Mission, MissionCategory, StepId, Submission } from '../types'
import { cx } from '../lib/cx'
import { downscaleImage } from '../lib/image'
import { timeAgo } from '../lib/time'
import { Icon } from '../ui/Icon'
import { Mascot } from '../ui/Mascot'
import {
  Avatar,
  Button,
  Card,
  CheckRow,
  Chip,
  ChipButton,
  Empty,
  Field,
  LeafAmount,
  Progress,
  RoleChip,
  SectionHead,
  Segmented,
  Sheet,
} from '../ui/primitives'
import { AiUploadSheet } from './Timetable'

type SortKey = 'reco' | 'popular' | 'new'

function sortMissions(missions: Mission[], key: SortKey): Mission[] {
  const list = [...missions]
  if (key === 'reco')
    list.sort((a, b) => b.recommenders.length - a.recommenders.length)
  if (key === 'popular')
    list.sort((a, b) => b.completedCount - a.completedCount)
  if (key === 'new') list.sort((a, b) => b.createdAt - a.createdAt)
  return list
}

function mySubmission(
  state: AppState,
  missionId: string
): Submission | undefined {
  return state.submissions.find(
    (s) =>
      s.userId === ME && s.missionId === missionId && s.status !== 'rejected'
  )
}

/* ---------------- 단계 타임라인 ---------------- */

function StepItem({
  step,
  status,
  last,
  children,
}: {
  step: StepId
  status: 'done' | 'current' | 'locked'
  last: boolean
  children?: ReactNode
}) {
  const info = STEP_INFO[step]
  return (
    <div className={cx('tg-step', status === 'locked' && 'tg-step--locked')}>
      <div className="tg-step__rail">
        <span className={cx('tg-step__marker', `tg-step__marker--${status}`)}>
          {status === 'done' ? (
            <Icon
              name="check"
              size={18}
              strokeWidth={3}
            />
          ) : status === 'locked' ? (
            <Icon
              name="lock"
              size={15}
            />
          ) : (
            step
          )}
        </span>
        {!last && (
          <span
            className={cx(
              'tg-step__line',
              status === 'done' && 'tg-step__line--done'
            )}
          />
        )}
      </div>
      <div className="tg-step__body">
        <div className="tg-step__head">
          <span className="tg-step__title">
            {step}단계 · {info.title}
          </span>
          {status === 'done' ? (
            <Chip tone="ink">완료</Chip>
          ) : (
            <Chip tone="gold">+{REWARDS.steps[step]}잎</Chip>
          )}
        </div>
        <p className="tg-caption">{info.summary}</p>
        {children && (
          <div
            className="tg-stack tg-stack--sm"
            style={{ marginTop: 12 }}
          >
            {children}
          </div>
        )}
      </div>
    </div>
  )
}

function StepZero({ done }: { done: boolean }) {
  const { push } = useNav()
  const [aiOpen, setAiOpen] = useState(false)
  if (done) {
    return (
      <Button
        style={{ alignSelf: 'flex-start' }}
        size="sm"
        variant="soft"
        icon="calendar"
        onClick={() => push({ name: 'timetable' })}
      >
        내 시간표 보기
      </Button>
    )
  }
  return (
    <>
      <Card>
        <div className="tg-stack tg-stack--sm">
          <p className="tg-body">
            시간표 캡처 한 장이면 충분해요. AI가 공강 시간과 강의실을 자동으로
            정리해서 공강 친구 찾기와 마켓에 써요.
          </p>
          <div className="tg-row">
            <Button
              size="md"
              icon="sparkle"
              onClick={() => setAiOpen(true)}
            >
              시간표 이미지 올리기
            </Button>
            <Button
              size="md"
              variant="ghost"
              onClick={() => push({ name: 'timetable' })}
            >
              직접 입력
            </Button>
          </div>
        </div>
      </Card>
      {aiOpen && <AiUploadSheet onClose={() => setAiOpen(false)} />}
    </>
  )
}

function ChecklistStep({
  step,
  items,
  extra,
}: {
  step: StepId
  items: Array<{ key: string; label: string }>
  extra?: ReactNode
}) {
  const { state, dispatch } = useApp()
  const checks = state.tutorial.checks
  const allChecked = items.every((item) => checks[item.key])
  return (
    <>
      <div className="tg-list">
        {items.map((item) => (
          <CheckRow
            key={item.key}
            strike
            checked={Boolean(checks[item.key])}
            onToggle={() => dispatch({ type: 'TOGGLE_CHECK', key: item.key })}
          >
            {item.label}
          </CheckRow>
        ))}
      </div>
      {extra}
      <Button
        variant="dark"
        block
        disabled={!allChecked}
        onClick={() => dispatch({ type: 'COMPLETE_STEP', step })}
      >
        {allChecked
          ? `인증하고 ${step}단계 완료하기`
          : '모두 체크하면 완료할 수 있어요'}
      </Button>
    </>
  )
}

function AppsStep() {
  const { state, dispatch } = useApp()
  const checks = state.tutorial.checks
  const allChecked = BASIC_APPS.every((app) => checks[app.key])
  return (
    <>
      <div className="tg-applist">
        {BASIC_APPS.map((app) => (
          <button
            key={app.key}
            type="button"
            role="checkbox"
            aria-checked={Boolean(checks[app.key])}
            className="tg-app-tile"
            onClick={() => dispatch({ type: 'TOGGLE_CHECK', key: app.key })}
          >
            <span
              className="tg-row tg-row--between"
              style={{ width: '100%' }}
            >
              <span className="tg-app-tile__mark">{app.mark}</span>
              {checks[app.key] && (
                <Icon
                  name="check"
                  size={18}
                  strokeWidth={2.6}
                />
              )}
            </span>
            <span className="tg-app-tile__name">{app.name}</span>
            <span className="tg-app-tile__desc">{app.desc}</span>
          </button>
        ))}
      </div>
      <p className="tg-caption">
        설치하고 한 번씩 로그인해 본 앱을 눌러 체크하세요.
      </p>
      <Button
        variant="dark"
        block
        disabled={!allChecked}
        onClick={() => dispatch({ type: 'COMPLETE_STEP', step: 3 })}
      >
        {allChecked
          ? '인증하고 3단계 완료하기'
          : '네 가지 앱을 모두 확인해 주세요'}
      </Button>
    </>
  )
}

/* ---------------- 튜토리얼 카드와 시트 ---------------- */

function MissionStats({ mission }: { mission: Mission }) {
  return (
    <div className="tg-mission__stats">
      <span>
        <Icon
          name="check"
          size={14}
          strokeWidth={2.4}
        />
        새내기 <strong>{mission.completedCount}명</strong> 완료
      </span>
      <span>
        <Icon
          name="thumb"
          size={14}
        />
        헌내기 <strong>{mission.recommenders.length}명</strong> 추천
      </span>
    </div>
  )
}

function MissionHead({ mission }: { mission: Mission }) {
  return (
    <div className="tg-row tg-row--between">
      <Chip tone="outline">{MISSION_CATEGORY_LABEL[mission.category]}</Chip>
      <span className="tg-price">
        <LeafAmount
          value={mission.reward}
          size="sm"
          sign
        />
      </span>
    </div>
  )
}

function SubmissionChip({ submission }: { submission?: Submission }) {
  if (!submission) return null
  if (submission.status === 'approved') {
    return (
      <Chip
        tone="green"
        icon="check"
      >
        인증 완료
      </Chip>
    )
  }
  return (
    <Chip
      tone="blue"
      icon="clock"
    >
      선배 확인 중
    </Chip>
  )
}

function MissionSheet({
  mission,
  onClose,
}: {
  mission: Mission
  onClose: () => void
}) {
  const { state, dispatch } = useApp()
  const submission = mySubmission(state, mission.id)
  const author = findPerson(state, mission.authorId)
  const reviewer = submission?.reviewerId
    ? findPerson(state, submission.reviewerId)
    : undefined
  const [note, setNote] = useState('')
  const [photo, setPhoto] = useState<string | undefined>()
  const [photoError, setPhotoError] = useState('')
  const canSubmit = !submission && (note.trim().length >= 5 || Boolean(photo))

  const onPhoto = async (file: File | undefined) => {
    if (!file) return
    try {
      setPhoto(await downscaleImage(file))
      setPhotoError('')
    } catch {
      setPhotoError('사진을 불러오지 못했어요')
    }
  }

  return (
    <Sheet
      title="튜토리얼 인증"
      onClose={onClose}
      footer={
        submission ? undefined : (
          <Button
            block
            variant="dark"
            icon="send"
            disabled={!canSubmit}
            onClick={() => {
              dispatch({
                type: 'SUBMIT_MISSION',
                missionId: mission.id,
                note: note.trim(),
                photo,
              })
              onClose()
            }}
          >
            인증 요청 보내기
          </Button>
        )
      }
    >
      <div className="tg-stack">
        <MissionHead mission={mission} />
        <div className="tg-stack tg-stack--sm">
          <h2 className="tg-h2">{mission.title}</h2>
          <p className="tg-body">{mission.description}</p>
          <MissionStats mission={mission} />
        </div>
        <div className="tg-banner">
          <Icon
            name="flag"
            size={16}
          />
          <span>
            <b className="tg-strong">인증 방법</b> · {mission.proof}
          </span>
        </div>
        {author && (
          <p className="tg-caption">
            {author.nickname} 선배({author.department})가 만든 튜토리얼이에요
          </p>
        )}

        {submission?.status === 'approved' && (
          <Card tone="green">
            <div className="tg-row">
              <Mascot
                size={44}
                color="green"
                mood="wink"
              />
              <div className="tg-grow">
                <p className="tg-strong">인증 완료! +{mission.reward}잎</p>
                <p className="tg-caption">
                  {reviewer?.nickname ?? '선배'}님이 인증을 인정했어요
                </p>
              </div>
            </div>
          </Card>
        )}
        {submission?.status === 'pending' && (
          <Card tone="blue">
            <div className="tg-row">
              <Icon name="clock" />
              <div className="tg-grow">
                <p className="tg-strong">
                  헌내기 선배의 확인을 기다리고 있어요
                </p>
                <p className="tg-caption">
                  선배 1명이 인정하면 은행잎이 들어와요
                </p>
              </div>
            </div>
          </Card>
        )}

        {!submission && (
          <>
            <hr className="tg-divider" />
            {photo ? (
              <div className="tg-stack tg-stack--sm">
                <img
                  className="tg-photo"
                  src={photo}
                  alt="인증 사진 미리보기"
                />
                <button
                  type="button"
                  className="tg-linkbtn"
                  onClick={() => setPhoto(undefined)}
                >
                  사진 지우기
                </button>
              </div>
            ) : (
              <label className="tg-dropzone">
                <Icon
                  name="image"
                  size={26}
                />
                인증 사진 올리기
                <span className="tg-caption">선택 사항이에요</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => void onPhoto(event.target.files?.[0])}
                />
              </label>
            )}
            {photoError && (
              <p
                className="tg-hint"
                style={{ color: 'var(--tg-heart)' }}
              >
                {photoError}
              </p>
            )}
            <Field
              label="한 줄 인증"
              hint="사진이 없다면 5자 이상 적어 주세요"
            >
              {(id) => (
                <textarea
                  id={id}
                  className="tg-textarea"
                  placeholder="무엇을 했는지 선배에게 알려주세요"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                />
              )}
            </Field>
          </>
        )}
      </div>
    </Sheet>
  )
}

function FreshMissionBoard({ unlocked }: { unlocked: boolean }) {
  const { state } = useApp()
  const [sort, setSort] = useState<SortKey>('reco')
  const [open, setOpen] = useState<Mission | null>(null)
  const missions = useMemo(
    () => sortMissions(state.missions, sort),
    [state.missions, sort]
  )
  const doneCount = state.submissions.filter(
    (s) => s.userId === ME && s.status === 'approved'
  ).length

  if (!unlocked) {
    return (
      <Card tone="tan">
        <div className="tg-row">
          <Icon
            name="lock"
            size={22}
          />
          <div className="tg-grow">
            <p className="tg-strong">추가 튜토리얼은 3단계 뒤에 열려요</p>
            <p className="tg-caption">
              헌내기 선배들이 만든 튜토리얼 {state.missions.length}개가 기다리고
              있어요
            </p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="tg-stack">
      <SectionHead
        title="추가 튜토리얼"
        caption={`원하는 튜토리얼을 골라 도전해요 · 완료 ${doneCount}개`}
      />
      <div className="tg-chips">
        <ChipButton
          pressed={sort === 'reco'}
          onClick={() => setSort('reco')}
        >
          추천순
        </ChipButton>
        <ChipButton
          pressed={sort === 'popular'}
          onClick={() => setSort('popular')}
        >
          많이 완료한 순
        </ChipButton>
        <ChipButton
          pressed={sort === 'new'}
          onClick={() => setSort('new')}
        >
          최신순
        </ChipButton>
      </div>
      <div className="tg-stack tg-stack--sm">
        {missions.map((mission) => (
          <button
            key={mission.id}
            type="button"
            className="tg-mission"
            onClick={() => setOpen(mission)}
          >
            <MissionHead mission={mission} />
            <div className="tg-row tg-row--between">
              <span className="tg-h3">{mission.title}</span>
              <SubmissionChip submission={mySubmission(state, mission.id)} />
            </div>
            <p className="tg-mission__desc">{mission.description}</p>
            <MissionStats mission={mission} />
          </button>
        ))}
      </div>
      {open && (
        <MissionSheet
          mission={state.missions.find((m) => m.id === open.id) ?? open}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  )
}

/* ---------------- 헌내기 튜토리얼 스튜디오 ---------------- */

const CATEGORIES = Object.keys(MISSION_CATEGORY_LABEL) as MissionCategory[]

function MissionFormSheet({ onClose }: { onClose: () => void }) {
  const { dispatch } = useApp()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [proof, setProof] = useState('')
  const [category, setCategory] = useState<MissionCategory>('campus')
  const valid =
    title.trim().length >= 4 &&
    description.trim().length >= 10 &&
    proof.trim() !== ''

  return (
    <Sheet
      title="새 튜토리얼 만들기"
      onClose={onClose}
      footer={
        <Button
          block
          variant="dark"
          disabled={!valid}
          onClick={() => {
            dispatch({
              type: 'CREATE_MISSION',
              draft: {
                title: title.trim(),
                description: description.trim(),
                proof: proof.trim(),
                category,
              },
            })
            onClose()
          }}
        >
          튜토리얼 올리고 {REWARDS.missionCreate}잎 받기
        </Button>
      }
    >
      <div className="tg-stack">
        <div className="tg-banner tg-banner--blue">
          <Icon
            name="sparkle"
            size={16}
          />
          <span>
            예: 챌린지 스퀘어 1개 인증하기, 마이크로소프트 계정 만들기처럼
            새내기가 한 번에 해볼 수 있는 일이면 좋아요.
          </span>
        </div>
        <Field label="튜토리얼 이름">
          {(id) => (
            <input
              id={id}
              className="tg-input"
              placeholder="예: 학생회관 게시판에서 동아리 공고 찾기"
              value={title}
              maxLength={30}
              onChange={(event) => setTitle(event.target.value)}
            />
          )}
        </Field>
        <div className="tg-field">
          <span className="tg-label">분류</span>
          <div className="tg-chips">
            {CATEGORIES.map((c) => (
              <ChipButton
                key={c}
                pressed={category === c}
                onClick={() => setCategory(c)}
              >
                {MISSION_CATEGORY_LABEL[c]}
              </ChipButton>
            ))}
          </div>
        </div>
        <Field
          label="설명"
          hint="왜 해보면 좋은지 한두 문장으로 알려주세요"
        >
          {(id) => (
            <textarea
              id={id}
              className="tg-textarea"
              placeholder="새내기에게 이 튜토리얼이 왜 도움이 되는지 적어주세요"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          )}
        </Field>
        <Field label="인증 방법">
          {(id) => (
            <input
              id={id}
              className="tg-input"
              placeholder="예: 현장 사진 한 장"
              value={proof}
              onChange={(event) => setProof(event.target.value)}
            />
          )}
        </Field>
        <div className="tg-field">
          <span className="tg-label">새내기 보상</span>
          <div className="tg-row tg-row--between">
            <LeafAmount
              value={REWARDS.tutorialReward}
              size="sm"
            />
            <span className="tg-caption">모든 튜토리얼이 동일해요</span>
          </div>
          <p className="tg-hint">보상은 새내기가 인증을 받으면 지급돼요</p>
        </div>
      </div>
    </Sheet>
  )
}

function ReviewItem({ submission }: { submission: Submission }) {
  const { state, dispatch } = useApp()
  const student = findPerson(state, submission.userId)
  const mission = state.missions.find((m) => m.id === submission.missionId)
  if (!student || !mission) return null
  return (
    <Card>
      <div className="tg-stack tg-stack--sm">
        <div className="tg-row">
          <Avatar person={student} />
          <div className="tg-grow">
            <div className="tg-row">
              <span className="tg-strong">{student.nickname}</span>
              <RoleChip role={student.role} />
            </div>
            <p className="tg-caption">
              {student.department} · {timeAgo(submission.createdAt)}
            </p>
          </div>
        </div>
        <div className="tg-banner">
          <Icon
            name="flag"
            size={16}
          />
          <span>
            <b className="tg-strong">{mission.title}</b>
            <br />
            인증 방법 · {mission.proof}
          </span>
        </div>
        {submission.photo && (
          <img
            className="tg-photo"
            src={submission.photo}
            alt={`${student.nickname}님의 인증 사진`}
          />
        )}
        <p className="tg-body">&ldquo;{submission.note}&rdquo;</p>
        <div className="tg-row">
          <Button
            size="md"
            variant="outline"
            onClick={() =>
              dispatch({
                type: 'REVIEW_SUBMISSION',
                id: submission.id,
                approve: false,
              })
            }
          >
            반려
          </Button>
          <Button
            size="md"
            variant="dark"
            className="tg-grow"
            icon="check"
            onClick={() =>
              dispatch({
                type: 'REVIEW_SUBMISSION',
                id: submission.id,
                approve: true,
              })
            }
          >
            인정하기
          </Button>
        </div>
      </div>
    </Card>
  )
}

function SeniorStudio() {
  const { state, dispatch } = useApp()
  const [tab, setTab] = useState<'missions' | 'reviews'>('missions')
  const [sort, setSort] = useState<SortKey>('reco')
  const [formOpen, setFormOpen] = useState(false)
  const pending = state.submissions.filter(
    (s) => s.status === 'pending' && s.userId !== ME
  )
  const missions = useMemo(
    () => sortMissions(state.missions, sort),
    [state.missions, sort]
  )
  const mine = state.missions.filter((m) => m.authorId === ME).length

  return (
    <div className="tg-stack">
      <Card
        stack
        tone="gold"
      >
        <div className="tg-row">
          <Mascot
            size={56}
            color="gold"
            mood="wink"
          />
          <div className="tg-grow">
            <p className="tg-strong">
              튜토리얼을 만들면 {REWARDS.missionCreate}잎!
            </p>
            <p className="tg-caption">
              새내기가 3단계 이후에 도전할 튜토리얼을 만들어 주세요 · 내가 만든
              튜토리얼 {mine}개
            </p>
          </div>
        </div>
        <Button
          block
          variant="dark"
          icon="plus"
          onClick={() => setFormOpen(true)}
          style={{ marginTop: 14 }}
        >
          새 튜토리얼 만들기
        </Button>
      </Card>

      <Segmented
        label="튜토리얼 스튜디오"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'missions', label: '튜토리얼 목록' },
          { value: 'reviews', label: '인증 요청', badge: pending.length },
        ]}
      />

      {tab === 'missions' && (
        <>
          <div className="tg-chips">
            <ChipButton
              pressed={sort === 'reco'}
              onClick={() => setSort('reco')}
            >
              추천순
            </ChipButton>
            <ChipButton
              pressed={sort === 'popular'}
              onClick={() => setSort('popular')}
            >
              많이 완료한 순
            </ChipButton>
            <ChipButton
              pressed={sort === 'new'}
              onClick={() => setSort('new')}
            >
              최신순
            </ChipButton>
          </div>
          <div className="tg-stack tg-stack--sm">
            {missions.map((mission) => {
              const own = mission.authorId === ME
              const on = mission.recommenders.includes(ME)
              const author = findPerson(state, mission.authorId)
              return (
                <div
                  key={mission.id}
                  className="tg-mission"
                >
                  <MissionHead mission={mission} />
                  <span className="tg-h3">{mission.title}</span>
                  <p className="tg-mission__desc">{mission.description}</p>
                  <MissionStats mission={mission} />
                  <div className="tg-row tg-row--between">
                    <span className="tg-caption">
                      {own
                        ? '내가 만든 튜토리얼'
                        : `by ${author?.nickname ?? '선배'}`}{' '}
                      · {timeAgo(mission.createdAt)}
                    </span>
                    <button
                      type="button"
                      className="tg-reco"
                      aria-pressed={on}
                      disabled={own}
                      title={own ? '내 튜토리얼은 추천할 수 없어요' : undefined}
                      onClick={() =>
                        dispatch({
                          type: 'TOGGLE_RECOMMEND',
                          missionId: mission.id,
                        })
                      }
                    >
                      <Icon
                        name="thumb"
                        size={15}
                      />
                      {on ? '추천함' : '추천'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {tab === 'reviews' && (
        <div className="tg-stack tg-stack--sm">
          <p className="tg-caption">
            새내기의 인증은 헌내기 1명이 인정하면 완료돼요. 인증 방법에 맞는지
            확인해 주세요.
          </p>
          {pending.length === 0 ? (
            <Empty
              title="확인할 인증이 없어요"
              body="새내기가 인증을 올리면 여기에 모여요"
              mood="wink"
            />
          ) : (
            pending.map((submission) => (
              <ReviewItem
                key={submission.id}
                submission={submission}
              />
            ))
          )}
        </div>
      )}

      {formOpen && <MissionFormSheet onClose={() => setFormOpen(false)} />}
    </div>
  )
}

/* ---------------- 화면 ---------------- */

export function TutorialScreen() {
  const { state, dispatch } = useApp()
  const me = useMe()
  const done = state.tutorial.done
  const isFresh = me.role === 'fresh'
  const steps: StepId[] = isFresh ? [0, 1, 2, 3] : [0]
  const current = steps.find((s) => !done[s])
  const basicDone = [1, 2, 3].filter((s) => done[s]).length
  const boardUnlocked = done[1] && done[2] && done[3]

  const statusOf = (step: StepId): 'done' | 'current' | 'locked' =>
    done[step] ? 'done' : step === current ? 'current' : 'locked'

  const content = (step: StepId): ReactNode => {
    const status = statusOf(step)
    if (step === 0)
      return status === 'locked' ? null : <StepZero done={done[0]} />
    if (status !== 'current') return null
    if (step === 1) {
      return (
        <ChecklistStep
          step={1}
          items={GLS_CHECKS}
          extra={
            <div className="tg-banner">
              <Icon
                name="sparkle"
                size={16}
              />
              GLS는 수강신청, 성적, 학적, 졸업 정보를 관리하는 학교 학사
              시스템이에요.
            </div>
          }
        />
      )
    }
    if (step === 2) {
      return (
        <ChecklistStep
          step={2}
          items={GRAD_CHECKS}
          extra={
            <Field
              label="내 졸업 이수 학점 메모"
              hint="선택 사항 · 나중에 마이페이지에서 다시 볼 수 있게 저장돼요"
            >
              {(id) => (
                <input
                  id={id}
                  className="tg-input"
                  inputMode="numeric"
                  placeholder="예: 130"
                  value={state.tutorial.gradCredits}
                  onChange={(event) =>
                    dispatch({
                      type: 'SET_GRAD_CREDITS',
                      value: event.target.value
                        .replace(/[^0-9]/g, '')
                        .slice(0, 3),
                    })
                  }
                />
              )}
            </Field>
          }
        />
      )
    }
    return <AppsStep />
  }

  return (
    <div className="tg-stack tg-stack--lg">
      <div className="tg-stack tg-stack--sm">
        <p className="tg-caption tg-strong">
          {isFresh ? '새내기 튜토리얼' : '헌내기 튜토리얼'}
        </p>
        <h1 className="tg-h1">
          {isFresh
            ? '한 단계씩, 학교와 친해지기'
            : '새내기의 길잡이가 되어 주세요'}
        </h1>
        <p className="tg-body">
          {isFresh
            ? '0단계로 시간표를 올리고 1~3단계 기본 튜토리얼을 마치면, 선배들이 만든 추가 튜토리얼이 열려요.'
            : '헌내기는 시간표만 올리면 돼요. 그다음엔 튜토리얼을 만들고 새내기의 인증을 확인해 주세요.'}
        </p>
        {isFresh && (
          <div
            className="tg-row"
            style={{ marginTop: 4 }}
          >
            <span className="tg-caption tg-strong">기본 튜토리얼</span>
            <div className="tg-grow">
              <Progress
                value={basicDone}
                max={3}
              />
            </div>
            <span className="tg-caption tg-strong">{basicDone}/3단계</span>
          </div>
        )}
      </div>

      <div className="tg-steps">
        {steps.map((step, index) => (
          <StepItem
            key={step}
            step={step}
            status={statusOf(step)}
            last={index === steps.length - 1}
          >
            {content(step)}
          </StepItem>
        ))}
      </div>

      {isFresh ? (
        <FreshMissionBoard unlocked={boardUnlocked} />
      ) : (
        <SeniorStudio />
      )}
    </div>
  )
}
