import { useMemo, useState, type ReactNode } from 'react'
import { useApp } from '../store/context'
import type { AppState } from '../store/state'
import { DEPARTMENTS_BY_CAMPUS } from '../data/departments'
import {
  CAMPUS_LABEL,
  CAMPUS_PLACE,
  CAMPUS_SHORT,
  ROLE_LABEL,
} from '../data/labels'
import type { Campus, Role } from '../types'
import { scopeOf } from '../lib/identity'
import { loadAccounts } from '../lib/storage'
import { Icon } from '../ui/Icon'
import { Mascot } from '../ui/Mascot'
import logoUrl from '../assets/logo.png'
import { Avatar, Button, Card, RoleChip } from '../ui/primitives'

export function Welcome({
  onLogin,
  onSignup,
}: {
  onLogin: () => void
  onSignup: () => void
}) {
  return (
    <div className="tg-welcome">
      <div className="tg-welcome__logo">
        <img
          src={logoUrl}
          alt="타공사 · 타인의 공강을 사다"
        />
      </div>
      <div className="tg-welcome__actions">
        <Button
          block
          variant="soft"
          onClick={onLogin}
        >
          로그인
        </Button>
        <Button
          block
          onClick={onSignup}
        >
          회원가입
        </Button>
      </div>
    </div>
  )
}

function BackRow({
  onBack,
  children,
}: {
  onBack: () => void
  children?: ReactNode
}) {
  return (
    <div className="tg-row">
      <button
        type="button"
        className="tg-iconbtn"
        aria-label="이전"
        onClick={onBack}
        style={{ marginLeft: -8 }}
      >
        <Icon name="back" />
      </button>
      {children}
    </div>
  )
}

export function Login({
  onBack,
  onSignup,
}: {
  onBack: () => void
  onSignup: () => void
}) {
  const { dispatch, identity } = useApp()
  const scope = scopeOf(identity)
  const accounts = useMemo(() => loadAccounts<AppState>(scope), [scope])
  const saved = Object.values(accounts).filter(
    (account) => account.version === 4 && account.profile
  )
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState('')

  const login = (name: string) => {
    const account = accounts[name.trim()]
    if (!account || account.version !== 4 || !account.profile) {
      setError(`'${name.trim()}' 별명으로 가입한 계정이 이 기기에 없어요.`)
      return
    }
    dispatch({ type: 'LOAD_ACCOUNT', state: account })
  }

  return (
    <>
      <div className="tg-scroll">
        <div className="tg-stack tg-stack--lg">
          <div className="tg-stack tg-stack--sm">
            <BackRow onBack={onBack} />
            <h1 className="tg-h1">다시 만나서 반가워요</h1>
            <p className="tg-body">가입할 때 정한 별명으로 로그인해요.</p>
          </div>

          {saved.length > 0 && (
            <div className="tg-stack tg-stack--sm">
              <p className="tg-label">이 기기에서 쓴 계정</p>
              <div className="tg-list">
                {saved.map((account) => {
                  const profile = account.profile
                  if (!profile) return null
                  return (
                    <button
                      key={profile.nickname}
                      type="button"
                      className="tg-listitem tg-checkrow"
                      onClick={() => login(profile.nickname)}
                    >
                      <Avatar person={profile} />
                      <span className="tg-grow">
                        <span className="tg-row">
                          <span className="tg-strong">{profile.nickname}</span>
                          <RoleChip role={profile.role} />
                        </span>
                        <span
                          className="tg-caption"
                          style={{ display: 'block' }}
                        >
                          {CAMPUS_SHORT[profile.campus]} · {profile.department}
                        </span>
                      </span>
                      <Icon
                        name="chevron"
                        size={16}
                      />
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div className="tg-field">
            <label
              className="tg-label"
              htmlFor="tg-login-nick"
            >
              별명으로 로그인
            </label>
            <input
              id="tg-login-nick"
              className="tg-input"
              placeholder="가입할 때 정한 별명"
              value={nickname}
              maxLength={10}
              onChange={(event) => {
                setNickname(event.target.value)
                setError('')
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && nickname.trim()) login(nickname)
              }}
            />
            {error && (
              <p
                className="tg-hint"
                style={{ color: 'var(--tg-heart)' }}
              >
                {error}{' '}
                <button
                  type="button"
                  className="tg-linkbtn"
                  onClick={onSignup}
                >
                  회원가입하기
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="tg-footer-cta">
        <Button
          block
          disabled={nickname.trim().length < 2}
          onClick={() => login(nickname)}
        >
          로그인
        </Button>
      </div>
    </>
  )
}

const ROLE_OPTIONS: Array<{ role: Role; title: string; body: string }> = [
  {
    role: 'fresh',
    title: '올해 입학한 새내기예요',
    body: '튜토리얼로 학교에 적응하고 은행잎을 모아요',
  },
  {
    role: 'senior',
    title: '학교가 익숙한 헌내기예요',
    body: '새내기를 위한 튜토리얼을 만들고 인증을 도와줘요',
  },
]

const CAMPUSES: Campus[] = ['humanities', 'natural']
const NICK_MAX = 10

export function Signup({ onBack }: { onBack: () => void }) {
  const { dispatch, identity } = useApp()
  const scope = scopeOf(identity)
  const [step, setStep] = useState(0)
  const [role, setRole] = useState<Role | null>(null)
  const [campus, setCampus] = useState<Campus | null>(null)
  const [department, setDepartment] = useState('')
  const [query, setQuery] = useState('')
  const [nickname, setNickname] = useState('')

  const filtered = useMemo(() => {
    if (!campus) return []
    const q = query.trim()
    const list = DEPARTMENTS_BY_CAMPUS[campus]
    return q ? list.filter((d) => d.includes(q)) : list
  }, [campus, query])

  const trimmedNick = nickname.trim()
  const taken = useMemo(
    () => trimmedNick !== '' && trimmedNick in loadAccounts(scope),
    [trimmedNick, scope]
  )
  const nickError =
    trimmedNick.length > 0 && trimmedNick.length < 2
      ? '별명은 2자 이상으로 지어주세요'
      : taken
        ? '이 기기에서 이미 쓰는 별명이에요. 다른 별명을 쓰거나 로그인해 주세요.'
        : ''
  const canNext =
    step === 0
      ? role !== null
      : step === 1
        ? campus !== null && department !== ''
        : trimmedNick.length >= 2 && !taken

  const goBack = () => (step === 0 ? onBack() : setStep(step - 1))
  const goNext = () => {
    if (!canNext) return
    if (step < 2) {
      setStep(step + 1)
      return
    }
    if (role && campus) {
      dispatch({
        type: 'SIGN_UP',
        role,
        campus,
        department,
        nickname: trimmedNick,
      })
    }
  }

  const chooseCampus = (next: Campus) => {
    setCampus(next)
    setQuery('')
    if (!DEPARTMENTS_BY_CAMPUS[next].includes(department)) setDepartment('')
  }

  const customDept = query.trim()
  const showCustom = customDept.length >= 2 && filtered.length === 0

  return (
    <>
      <div className="tg-scroll">
        <div className="tg-stack tg-stack--lg">
          <div className="tg-stack tg-stack--sm">
            <BackRow onBack={goBack}>
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
            </BackRow>
            <p className="tg-caption tg-strong">회원가입 {step + 1}/3</p>
            <h1 className="tg-h1">
              {step === 0 && '먼저, 어떤 학생인가요?'}
              {step === 1 && '캠퍼스와 학과를 알려주세요'}
              {step === 2 && '어떻게 불러드릴까요?'}
            </h1>
            <p className="tg-body">
              {step === 0 &&
                '선택에 따라 튜토리얼에서 할 수 있는 일이 달라져요.'}
              {step === 1 && '같은 캠퍼스, 같은 학과 선후배를 찾을 때 쓰여요.'}
              {step === 2 &&
                '다른 학생들에게 보여질 이름이에요. 로그인할 때도 이 별명을 써요.'}
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
                    color={option.role === 'fresh' ? 'green' : 'orange'}
                    mood={option.role === 'fresh' ? 'wow' : 'smile'}
                  />
                  <span className="tg-grow">
                    <span className="tg-choice__title">
                      {ROLE_LABEL[option.role]}
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
            <div className="tg-stack">
              <div className="tg-field">
                <span className="tg-label">소속 캠퍼스</span>
                <div
                  className="tg-campus-pick"
                  role="radiogroup"
                  aria-label="소속 캠퍼스"
                >
                  {CAMPUSES.map((value) => (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={campus === value}
                      className="tg-choice"
                      onClick={() => chooseCampus(value)}
                    >
                      <span>
                        <span className="tg-choice__title">
                          {CAMPUS_LABEL[value]}
                        </span>
                        <span
                          className="tg-choice__body"
                          style={{ display: 'block' }}
                        >
                          {CAMPUS_PLACE[value]}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {campus && (
                <div className="tg-field">
                  <span className="tg-label">학과</span>
                  <div className="tg-inputwrap">
                    <Icon
                      name="search"
                      size={18}
                    />
                    <input
                      className="tg-input"
                      placeholder={`${CAMPUS_SHORT[campus]} 학과 검색`}
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
            </div>
          )}

          {step === 2 && role && campus && (
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
                    <p className="tg-caption">
                      {CAMPUS_SHORT[campus]} · {department}
                    </p>
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
