import { useMemo, useState } from 'react'
import { useApp } from '../store/context'
import { DEPARTMENTS } from '../data/departments'
import { REWARDS, ROLE_LABEL } from '../data/labels'
import type { Role } from '../types'
import { Icon } from '../ui/Icon'
import { Leaf, Mascot, Sparkle } from '../ui/Mascot'
import { Avatar, Button, Card, Chip, RoleChip } from '../ui/primitives'

export function Welcome({ onStart }: { onStart: () => void }) {
  return (
    <>
      <div className="tg-scroll">
        <div className="tg-stack tg-stack--lg">
          <div className="tg-hero">
            <Sparkle
              className="tg-hero__spark"
              size={20}
            />
            <Mascot
              className="tg-hero__leaf tg-hero__leaf--l"
              size={92}
              color="green"
              mood="wink"
            />
            <Mascot
              className="tg-hero__leaf"
              size={128}
              color="gold"
            />
            <Mascot
              className="tg-hero__leaf tg-hero__leaf--r"
              size={92}
              color="orange"
              mood="wow"
            />
            <span className="tg-hero__ground" />
          </div>

          <div
            className="tg-stack tg-stack--sm"
            style={{ textAlign: 'center' }}
          >
            <p className="tg-caption tg-strong">타인의 공강을 사자</p>
            <h1 className="tg-display">
              빈 시간이
              <br />
              서로를 돕는 시간으로
            </h1>
            <p className="tg-body">
              새내기의 첫 학기 적응부터 선후배가 서로의 공강을 나누는 일까지,
              성균관대 학생을 위한 공강 플랫폼이에요.
            </p>
          </div>

          <div
            className="tg-chips"
            style={{ justifyContent: 'center' }}
          >
            <Chip icon="flag">새내기 튜토리얼</Chip>
            <Chip icon="people">공강 친구 찾기</Chip>
            <Chip icon="bag">공강 마켓</Chip>
          </div>

          <Card
            stack
            tone="gold"
          >
            <div className="tg-row">
              <Leaf size={36} />
              <div className="tg-grow">
                <p className="tg-strong">
                  가입하면 은행잎 {REWARDS.signup}잎을 드려요
                </p>
                <p className="tg-caption">
                  은행잎은 미션 보상과 공강 마켓에서 쓰는 포인트예요
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
      <div className="tg-footer-cta">
        <Button
          block
          onClick={onStart}
        >
          로그인 / 회원가입
        </Button>
      </div>
    </>
  )
}

const ROLE_OPTIONS: Array<{ role: Role; title: string; body: string }> = [
  {
    role: 'fresh',
    title: '올해 입학한 새내기예요',
    body: '튜토리얼 미션으로 학교에 적응하고 은행잎을 모아요',
  },
  {
    role: 'senior',
    title: '학교가 익숙한 헌내기예요',
    body: '새내기를 위한 미션을 만들고 인증을 도와줘요',
  },
]

const NICK_MAX = 10

export function Signup({ onBack }: { onBack: () => void }) {
  const { dispatch } = useApp()
  const [step, setStep] = useState(0)
  const [role, setRole] = useState<Role | null>(null)
  const [department, setDepartment] = useState('')
  const [query, setQuery] = useState('')
  const [nickname, setNickname] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim()
    return q ? DEPARTMENTS.filter((d) => d.includes(q)) : DEPARTMENTS
  }, [query])

  const trimmedNick = nickname.trim()
  const nickError =
    trimmedNick.length > 0 && trimmedNick.length < 2
      ? '별명은 2자 이상으로 지어주세요'
      : ''
  const canNext =
    step === 0
      ? role !== null
      : step === 1
        ? department !== ''
        : trimmedNick.length >= 2

  const goBack = () => (step === 0 ? onBack() : setStep(step - 1))
  const goNext = () => {
    if (!canNext) return
    if (step < 2) {
      setStep(step + 1)
      return
    }
    if (role) {
      dispatch({ type: 'SIGN_UP', role, department, nickname: trimmedNick })
    }
  }

  const customDept = query.trim()
  const showCustom = customDept.length >= 2 && filtered.length === 0

  return (
    <>
      <div className="tg-scroll">
        <div className="tg-stack tg-stack--lg">
          <div className="tg-stack tg-stack--sm">
            <div className="tg-row">
              <button
                type="button"
                className="tg-iconbtn"
                aria-label="이전"
                onClick={goBack}
                style={{ marginLeft: -8 }}
              >
                <Icon name="back" />
              </button>
              <div
                className="tg-onboard-progress tg-grow"
                aria-label={`3단계 중 ${step + 1}단계`}
              >
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    data-on={i <= step}
                  />
                ))}
              </div>
            </div>
            <p className="tg-caption tg-strong">회원가입 {step + 1}/3</p>
            <h1 className="tg-h1">
              {step === 0 && '먼저, 어떤 학생인가요?'}
              {step === 1 && '학과를 알려주세요'}
              {step === 2 && '어떻게 불러드릴까요?'}
            </h1>
            <p className="tg-body">
              {step === 0 &&
                '선택에 따라 튜토리얼에서 할 수 있는 일이 달라져요.'}
              {step === 1 && '같은 학과 선후배를 찾을 때 쓰여요.'}
              {step === 2 &&
                '다른 학생들에게 보여질 이름이에요. 실명이 아니어도 괜찮아요.'}
            </p>
          </div>

          {step === 0 && (
            <div
              className="tg-stack tg-stack--sm"
              role="radiogroup"
              aria-label="학생 유형"
            >
              {ROLE_OPTIONS.map((option) => (
                <button
                  key={option.role}
                  type="button"
                  role="radio"
                  aria-checked={role === option.role}
                  className="tg-choice"
                  onClick={() => setRole(option.role)}
                >
                  <Mascot
                    size={52}
                    color={option.role === 'fresh' ? 'green' : 'gold'}
                    mood={option.role === 'fresh' ? 'wow' : 'smile'}
                  />
                  <span className="tg-grow">
                    <span className="tg-row">
                      <span className="tg-choice__title">
                        {ROLE_LABEL[option.role]}
                      </span>
                    </span>
                    <span
                      className="tg-choice__body"
                      style={{ display: 'block' }}
                    >
                      {option.title}
                      <br />
                      {option.body}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}

          {step === 1 && (
            <div className="tg-stack tg-stack--sm">
              <div className="tg-inputwrap">
                <Icon
                  name="search"
                  size={18}
                />
                <input
                  className="tg-input"
                  placeholder="학과 이름으로 검색"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  aria-label="학과 검색"
                />
              </div>
              <div
                className="tg-deptlist"
                role="listbox"
                aria-label="학과 목록"
              >
                {showCustom && (
                  <button
                    type="button"
                    role="option"
                    aria-selected={department === customDept}
                    className="tg-deptitem"
                    onClick={() => setDepartment(customDept)}
                  >
                    <span>&lsquo;{customDept}&rsquo; 직접 입력</span>
                    <Icon
                      name="plus"
                      size={16}
                    />
                  </button>
                )}
                {filtered.map((dept) => (
                  <button
                    key={dept}
                    type="button"
                    role="option"
                    aria-selected={department === dept}
                    className="tg-deptitem"
                    onClick={() => setDepartment(dept)}
                  >
                    <span>{dept}</span>
                    {department === dept && (
                      <Icon
                        name="check"
                        size={16}
                        strokeWidth={2.6}
                      />
                    )}
                  </button>
                ))}
                {filtered.length === 0 && !showCustom && (
                  <p
                    className="tg-caption"
                    style={{ padding: 14 }}
                  >
                    검색 결과가 없어요. 두 글자 이상 입력하면 직접 추가할 수
                    있어요.
                  </p>
                )}
              </div>
            </div>
          )}

          {step === 2 && role && (
            <div className="tg-stack">
              <div className="tg-inputwrap">
                <input
                  className="tg-input"
                  placeholder="예: 은행잎러버"
                  value={nickname}
                  maxLength={NICK_MAX}
                  onChange={(event) => setNickname(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') goNext()
                  }}
                  aria-label="별명"
                  aria-invalid={nickError !== ''}
                  autoFocus
                  style={{ paddingLeft: 14, paddingRight: 56 }}
                />
                <span className="tg-counter">
                  {nickname.length}/{NICK_MAX}
                </span>
              </div>
              {nickError && (
                <p
                  className="tg-hint"
                  style={{ color: 'var(--tg-heart)' }}
                >
                  {nickError}
                </p>
              )}
              <Card stack>
                <p
                  className="tg-caption"
                  style={{ marginBottom: 10 }}
                >
                  이렇게 보여요
                </p>
                <div className="tg-row">
                  <Avatar
                    person={{ nickname: trimmedNick || '?', tone: 0 }}
                    size={48}
                  />
                  <div className="tg-grow">
                    <div className="tg-row">
                      <span className="tg-h3">{trimmedNick || '별명'}</span>
                      <RoleChip role={role} />
                    </div>
                    <p className="tg-caption">{department}</p>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
      <div className="tg-footer-cta">
        <Button
          block
          variant={step === 2 ? 'dark' : 'primary'}
          disabled={!canNext}
          onClick={goNext}
        >
          {step === 2 ? '타공사 시작하기' : '다음'}
        </Button>
      </div>
    </>
  )
}
