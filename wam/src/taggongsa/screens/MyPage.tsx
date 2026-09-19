import { useState } from 'react'
import { useApp, useMe, useNav } from '../store/context'
import { DEFAULT_CLOCK, ME } from '../store/state'
import { CAMPUS_LABEL, ROLE_LABEL } from '../data/labels'
import type { ClockSetting } from '../types'
import { cx } from '../lib/cx'
import {
  DAY_LABELS,
  describeFree,
  fmt,
  getFreeState,
  momentFromDate,
  parseHM,
  timeAgo,
} from '../lib/time'
import { Icon } from '../ui/Icon'
import { Leaf } from '../ui/Mascot'
import {
  Avatar,
  Button,
  Card,
  Field,
  LeafAmount,
  RoleChip,
  SectionHead,
  Segmented,
  Sheet,
  StatusDot,
  Switch,
} from '../ui/primitives'
import { TimetableGrid } from './Timetable'

const PACKS = [
  { amount: 10, price: 1000 },
  { amount: 30, price: 2900, tag: '3% 할인' },
  { amount: 50, price: 4500, tag: '인기' },
  { amount: 100, price: 8500, tag: '15% 할인' },
]

export function ChargeSheet({ onClose }: { onClose: () => void }) {
  const { dispatch } = useApp()
  const me = useMe()
  const [selected, setSelected] = useState(2)
  const pack = PACKS[selected]

  return (
    <Sheet
      title="은행잎 충전"
      onClose={onClose}
      footer={
        <Button
          block
          variant="dark"
          onClick={() => {
            dispatch({ type: 'CHARGE', amount: pack.amount, price: pack.price })
            onClose()
          }}
        >
          {pack.price.toLocaleString('ko-KR')}원 결제하기
        </Button>
      }
    >
      <div className="tg-stack">
        <div className="tg-row">
          <span className="tg-caption">지금 보유</span>
          <LeafAmount
            value={me.leaves}
            size="sm"
          />
        </div>
        <div
          className="tg-grid2"
          role="radiogroup"
          aria-label="충전 상품"
        >
          {PACKS.map((item, index) => (
            <button
              key={item.amount}
              type="button"
              role="radio"
              aria-checked={selected === index}
              className="tg-pack"
              onClick={() => setSelected(index)}
            >
              <span
                className="tg-row tg-row--between"
                style={{ width: '100%' }}
              >
                <LeafAmount value={item.amount} />
                {item.tag && (
                  <span className="tg-chip tg-chip--red">{item.tag}</span>
                )}
              </span>
              <span className="tg-pack__price">
                {item.price.toLocaleString('ko-KR')}원
              </span>
            </button>
          ))}
        </div>
        <div className="tg-banner">
          <Icon
            name="bell"
            size={16}
          />
          데모 버전이라 실제 결제는 일어나지 않고 은행잎만 채워져요.
        </div>
      </div>
    </Sheet>
  )
}

export function ClockSheet({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useApp()
  const [draft, setDraft] = useState<ClockSetting>(state.clock)
  const [time, setTime] = useState(fmt(state.clock.minutes))
  const minutes = parseHM(time)
  const real = momentFromDate(new Date())

  return (
    <Sheet
      title="기준 시각"
      onClose={onClose}
      footer={
        <>
          <Button
            variant="outline"
            onClick={() => {
              setDraft(DEFAULT_CLOCK)
              setTime(fmt(DEFAULT_CLOCK.minutes))
            }}
          >
            초기화
          </Button>
          <Button
            className="tg-grow"
            variant="dark"
            disabled={draft.mode === 'demo' && minutes === null}
            onClick={() => {
              dispatch({
                type: 'SET_CLOCK',
                clock: { ...draft, minutes: minutes ?? draft.minutes },
              })
              onClose()
            }}
          >
            적용하기
          </Button>
        </>
      }
    >
      <div className="tg-stack">
        <p className="tg-body">
          공강 여부는 기준 시각으로 계산해요. 주말이나 밤에 시연할 때는 평일 낮
          시각을 골라 주세요.
        </p>
        <Segmented
          label="시각 기준"
          value={draft.mode}
          onChange={(mode) => setDraft({ ...draft, mode })}
          options={[
            { value: 'demo', label: '데모 시각' },
            { value: 'real', label: '실제 시각' },
          ]}
        />
        {draft.mode === 'demo' ? (
          <>
            <div className="tg-field">
              <span className="tg-label">요일</span>
              <div className="tg-daypick tg-daypick--7">
                {DAY_LABELS.map((label, index) => (
                  <button
                    key={label}
                    type="button"
                    aria-pressed={draft.day === index}
                    onClick={() => setDraft({ ...draft, day: index })}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <Field label="시각">
              {(id) => (
                <input
                  id={id}
                  type="time"
                  className="tg-input"
                  value={time}
                  step={300}
                  onChange={(event) => setTime(event.target.value)}
                />
              )}
            </Field>
          </>
        ) : (
          <Card tone="tan">
            <p className="tg-strong">
              지금 {DAY_LABELS[real.day]}요일 {fmt(real.minutes)}
            </p>
            <p className="tg-caption">기기의 현재 시각을 그대로 써요</p>
          </Card>
        )}
      </div>
    </Sheet>
  )
}

function LogoutSheet({ onClose }: { onClose: () => void }) {
  const { dispatch } = useApp()
  return (
    <Sheet
      title="로그아웃할까요?"
      onClose={onClose}
      footer={
        <>
          <Button
            variant="outline"
            className="tg-grow"
            onClick={onClose}
          >
            취소
          </Button>
          <Button
            variant="dark"
            className="tg-grow"
            onClick={() => dispatch({ type: 'LOG_OUT' })}
          >
            로그아웃
          </Button>
        </>
      }
    >
      <p className="tg-body">
        기록은 이 기기에 계정별로 저장돼요. 같은 별명으로 다시 로그인하면
        은행잎, 시간표, 튜토리얼 기록을 이어서 쓸 수 있어요.
      </p>
    </Sheet>
  )
}

export function MyPage() {
  const { state, dispatch, now } = useApp()
  const me = useMe()
  const { push, openSheet } = useNav()
  const [showLedger, setShowLedger] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)

  const free = getFreeState(me.timetable, now)
  const copy = describeFree(free, now)
  const basicDone = [1, 2, 3].filter((step) => state.tutorial.done[step]).length
  const approved = state.submissions.filter(
    (s) => s.userId === ME && s.status === 'approved'
  ).length
  const madeMissions = state.missions.filter((m) => m.authorId === ME).length
  const reviewed = state.submissions.filter((s) => s.reviewerId === ME).length

  return (
    <div className="tg-stack tg-stack--lg">
      <Card stack>
        <div className="tg-row">
          <Avatar
            person={me}
            size={64}
          />
          <div className="tg-grow">
            <div className="tg-row">
              <h1 className="tg-h2">{me.nickname}</h1>
              <RoleChip role={me.role} />
            </div>
            <p className="tg-caption">
              {CAMPUS_LABEL[me.campus]} · {me.department}
            </p>
          </div>
        </div>
        <hr
          className="tg-divider"
          style={{ margin: '14px 0' }}
        />
        <div className="tg-stack tg-stack--sm">
          {(me.role === 'fresh'
            ? [
                ['기본 튜토리얼', `${basicDone}/3단계`],
                ['추가 튜토리얼', `${approved}개`],
              ]
            : [
                ['만든 미션', `${madeMissions}개`],
                ['확인한 인증', `${reviewed}건`],
              ]
          ).map(([label, value]) => (
            <p
              key={label}
              className="tg-stat"
            >
              {label}: <b>{value}</b>
            </p>
          ))}
        </div>
        {state.tutorial.gradCredits && (
          <p
            className="tg-caption"
            style={{ marginTop: 10 }}
          >
            졸업 이수 학점 메모 · {state.tutorial.gradCredits}학점
          </p>
        )}
      </Card>

      <Card tone="gold">
        <div className="tg-stack tg-stack--sm">
          <p className="tg-caption tg-strong">보유 은행잎</p>
          <div className="tg-row tg-row--between">
            <LeafAmount
              value={me.leaves}
              size="lg"
            />
            <Button
              variant="dark"
              size="md"
              icon="plus"
              onClick={() => openSheet('charge')}
            >
              충전하기
            </Button>
          </div>
          <button
            type="button"
            className="tg-linkbtn"
            style={{ alignSelf: 'flex-start' }}
            aria-expanded={showLedger}
            onClick={() => setShowLedger(!showLedger)}
          >
            {showLedger ? '내역 접기' : '적립·사용 내역 보기'}
          </button>
          {showLedger && (
            <div className="tg-list">
              {state.ledger.length === 0 ? (
                <p
                  className="tg-caption"
                  style={{ padding: 14 }}
                >
                  아직 내역이 없어요
                </p>
              ) : (
                state.ledger.slice(0, 12).map((entry) => (
                  <div
                    key={entry.id}
                    className="tg-ledger"
                  >
                    <Leaf size={14} />
                    <span className="tg-ledger__label">{entry.label}</span>
                    <span className="tg-caption">{timeAgo(entry.at)}</span>
                    <span
                      className={cx(
                        'tg-ledger__delta',
                        entry.delta > 0 && 'tg-ledger__delta--plus'
                      )}
                    >
                      {entry.delta > 0 ? '+' : ''}
                      {entry.delta}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </Card>

      <div className="tg-stack tg-stack--sm">
        <SectionHead
          title="내 시간표"
          action={
            <Button
              size="sm"
              variant="soft"
              icon={me.timetable.length ? 'edit' : 'plus'}
              onClick={() => push({ name: 'timetable' })}
            >
              {me.timetable.length ? '편집' : '시간표 추가'}
            </Button>
          }
        />
        <Card>
          <div className="tg-stack tg-stack--sm">
            <div className="tg-row">
              <StatusDot
                tone={
                  free.kind === 'free'
                    ? 'free'
                    : free.kind === 'class'
                      ? 'busy'
                      : 'idle'
                }
              />
              <div className="tg-grow">
                <p className="tg-strong">{copy.title}</p>
                <p className="tg-caption">{copy.detail}</p>
              </div>
            </div>
            {me.timetable.length > 0 && (
              <TimetableGrid
                blocks={me.timetable}
                now={now}
                compact
                onBlockClick={() => push({ name: 'timetable' })}
              />
            )}
          </div>
        </Card>
        <Card>
          <div className="tg-row">
            <Icon name="eye" />
            <div className="tg-grow">
              <p className="tg-strong">공강 상태 공개</p>
              <p className="tg-caption">
                끄면 공강 친구 찾기와 모임 초대 목록에 내가 보이지 않아요
              </p>
            </div>
            <Switch
              label="공강 상태 공개"
              checked={me.showFree}
              onChange={(value) => dispatch({ type: 'SET_SHOW_FREE', value })}
            />
          </div>
        </Card>
      </div>

      <div className="tg-stack tg-stack--sm">
        <SectionHead title="설정" />
        <div className="tg-list">
          <button
            type="button"
            className="tg-listitem tg-checkrow"
            onClick={() => openSheet('clock')}
          >
            <Icon name="clock" />
            <span className="tg-grow tg-strong">기준 시각</span>
            <span className="tg-caption">
              {state.clock.mode === 'demo'
                ? `데모 · ${DAY_LABELS[state.clock.day]} ${fmt(state.clock.minutes)}`
                : '실제 시각'}
            </span>
            <Icon
              name="chevron"
              size={16}
            />
          </button>
          <button
            type="button"
            className="tg-listitem tg-checkrow"
            onClick={() => setLogoutOpen(true)}
          >
            <Icon name="logout" />
            <span className="tg-grow tg-strong">로그아웃</span>
            <span className="tg-caption">{ROLE_LABEL[me.role]} 계정</span>
          </button>
        </div>
      </div>

      {logoutOpen && <LogoutSheet onClose={() => setLogoutOpen(false)} />}
    </div>
  )
}
