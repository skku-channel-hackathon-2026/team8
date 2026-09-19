import { useApp, useMe, useNav } from '../store/context'
import { ME } from '../store/state'
import { ROLE_LABEL, STEP_INFO } from '../data/labels'
import { describeFree, getFreeState, isVisiblyFree } from '../lib/time'
import { Icon } from '../ui/Icon'
import { Mascot } from '../ui/Mascot'
import { Button, Card, Progress, StatusDot } from '../ui/primitives'

export function FreeStatusCard() {
  const { now } = useApp()
  const me = useMe()
  const { goTab, push } = useNav()
  const free = getFreeState(me.timetable, now)
  const copy = describeFree(free, now)
  const tone =
    free.kind === 'free' ? 'free' : free.kind === 'class' ? 'busy' : 'idle'

  return (
    <Card stack>
      <div className="tg-stack tg-stack--sm">
        <div className="tg-status">
          <StatusDot tone={tone} />
          <span className="tg-status__title">{copy.title}</span>
        </div>
        <p className="tg-body">{copy.detail}</p>
        {free.kind === 'free' && !me.showFree && (
          <p className="tg-caption">
            내 공강은 비공개 상태예요. 마이페이지에서 공개할 수 있어요.
          </p>
        )}
        <div
          className="tg-row"
          style={{ marginTop: 6 }}
        >
          {free.kind === 'none' && (
            <Button
              size="md"
              icon="calendar"
              onClick={() => push({ name: 'timetable' })}
            >
              시간표 추가하기
            </Button>
          )}
          {free.kind === 'free' && (
            <>
              <Button
                size="md"
                variant="dark"
                icon="people"
                onClick={() => goTab('meet')}
              >
                공강 친구 찾기
              </Button>
              <Button
                size="md"
                variant="outline"
                onClick={() => goTab('market', 'sell')}
              >
                공강 팔기
              </Button>
            </>
          )}
          {free.kind === 'class' && (
            <Button
              size="md"
              variant="dark"
              icon="bag"
              onClick={() => goTab('market', 'buy')}
            >
              바쁠 땐 공강 사기
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}

export function Home() {
  const { state, now } = useApp()
  const me = useMe()
  const { goTab, push } = useNav()

  const done = state.tutorial.done
  const requiredDone = done.filter(Boolean).length
  const nextStep = done.findIndex((d) => !d)
  const freeCount = state.students.filter((s) => isVisiblyFree(s, now)).length
  const openTasks = state.tasks.filter(
    (t) => t.status === 'open' && t.requesterId !== ME
  ).length
  const pendingReviews = state.submissions.filter(
    (s) => s.status === 'pending' && s.userId !== ME
  ).length

  return (
    <div className="tg-stack tg-stack--lg">
      <div className="tg-stack tg-stack--sm">
        <p className="tg-caption tg-strong">
          {ROLE_LABEL[me.role]} · {me.department}
        </p>
        <h1 className="tg-h1">{me.nickname}님, 반가워요</h1>
      </div>

      <FreeStatusCard />

      {me.role === 'fresh' ? (
        <Card tone="blue">
          <div className="tg-stack">
            <div className="tg-row">
              <div className="tg-grow">
                <p className="tg-caption tg-strong">새내기 튜토리얼</p>
                <h2 className="tg-h2">
                  {nextStep === -1
                    ? '기본 단계를 모두 마쳤어요!'
                    : `${nextStep}단계 · ${STEP_INFO[nextStep].title}`}
                </h2>
              </div>
              <Mascot
                size={56}
                color="green"
                mood={nextStep === -1 ? 'wink' : 'smile'}
              />
            </div>
            <div className="tg-stack tg-stack--sm">
              <Progress
                value={requiredDone}
                max={4}
              />
              <p className="tg-caption">
                {nextStep === -1
                  ? '이제 선배들이 만든 자유 미션에 도전해 보세요'
                  : `4단계 중 ${requiredDone}단계 완료 · 단계를 마치면 은행잎을 받아요`}
              </p>
            </div>
            <Button
              variant="dark"
              block
              onClick={() => push({ name: 'tutorial' })}
            >
              {requiredDone === 0 ? '튜토리얼 진행하기' : '이어서 진행하기'}
            </Button>
          </div>
        </Card>
      ) : (
        <Card tone="gold">
          <div className="tg-stack">
            <div className="tg-row">
              <div className="tg-grow">
                <p className="tg-caption tg-strong">헌내기 미션 스튜디오</p>
                <h2 className="tg-h2">
                  새내기에게 필요한 미션을 만들어 주세요
                </h2>
              </div>
              <Mascot
                size={56}
                color="gold"
                mood="wink"
              />
            </div>
            <p className="tg-body">
              미션을 만들면 은행잎을 받아요. 새내기의 인증을 확인해 주는 것도
              헌내기의 역할이에요.
            </p>
            <Button
              variant="dark"
              block
              onClick={() => push({ name: 'tutorial' })}
            >
              튜토리얼 열기
              {pendingReviews > 0 && (
                <span className="tg-badge">{pendingReviews}</span>
              )}
            </Button>
          </div>
        </Card>
      )}

      <div className="tg-quick">
        <button
          type="button"
          className="tg-tile"
          onClick={() => goTab('meet')}
        >
          <span className="tg-row tg-caption tg-strong">
            <StatusDot tone="free" /> 지금 공강인 학생
          </span>
          <span className="tg-quick__num">{freeCount}명</span>
          <span className="tg-row tg-caption">
            너 지금 공강이야?
            <Icon
              name="chevron"
              size={14}
            />
          </span>
        </button>
        <button
          type="button"
          className="tg-tile"
          onClick={() => goTab('market', 'sell')}
        >
          <span className="tg-row tg-caption tg-strong">
            <Icon
              name="bag"
              size={14}
            />
            마켓의 새 부탁
          </span>
          <span className="tg-quick__num">{openTasks}건</span>
          <span className="tg-row tg-caption">
            공강 마켓
            <Icon
              name="chevron"
              size={14}
            />
          </span>
        </button>
      </div>
    </div>
  )
}
