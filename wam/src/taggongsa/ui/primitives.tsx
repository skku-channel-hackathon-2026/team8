import {
  useEffect,
  useId,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { cx } from '../lib/cx'
import type { Role } from '../types'
import { ROLE_LABEL } from '../data/labels'
import { Icon, type IconName } from './Icon'
import { Leaf, Mascot } from './Mascot'

type ButtonVariant =
  'primary' | 'dark' | 'outline' | 'soft' | 'ghost' | 'danger'
type ButtonSize = 'lg' | 'md' | 'sm'

export function Button({
  variant = 'primary',
  size = 'lg',
  block,
  icon,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  block?: boolean
  icon?: IconName
}) {
  return (
    <button
      type={type}
      className={cx(
        'tg-btn',
        `tg-btn--${variant}`,
        `tg-btn--${size}`,
        block && 'tg-btn--block',
        className
      )}
      {...rest}
    >
      {icon && (
        <Icon
          name={icon}
          size={size === 'sm' ? 16 : 18}
        />
      )}
      {children}
    </button>
  )
}

export function IconButton({
  icon,
  label,
  onClick,
  className,
}: {
  icon: IconName
  label: string
  onClick: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      className={cx('tg-iconbtn', className)}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      <Icon name={icon} />
    </button>
  )
}

type CardTone = 'plain' | 'blue' | 'gold' | 'tan' | 'green'

export function Card({
  tone = 'plain',
  stack,
  className,
  children,
}: {
  tone?: CardTone
  stack?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <div
      className={cx(
        'tg-card',
        `tg-card--${tone}`,
        stack && 'tg-card--stack',
        className
      )}
    >
      {children}
    </div>
  )
}

type ChipTone = 'tan' | 'outline' | 'green' | 'gold' | 'blue' | 'red' | 'ink'

export function Chip({
  tone = 'tan',
  icon,
  children,
}: {
  tone?: ChipTone
  icon?: IconName
  children: ReactNode
}) {
  return (
    <span className={cx('tg-chip', `tg-chip--${tone}`)}>
      {icon && (
        <Icon
          name={icon}
          size={13}
          strokeWidth={2}
        />
      )}
      {children}
    </span>
  )
}

export function ChipButton({
  pressed,
  onClick,
  icon,
  children,
}: {
  pressed: boolean
  onClick: () => void
  icon?: IconName
  children: ReactNode
}) {
  return (
    <button
      type="button"
      className="tg-chipbtn"
      aria-pressed={pressed}
      onClick={onClick}
    >
      {icon && (
        <Icon
          name={icon}
          size={15}
        />
      )}
      {children}
    </button>
  )
}

export function RoleChip({ role }: { role: Role }) {
  return (
    <Chip tone={role === 'fresh' ? 'green' : 'gold'}>{ROLE_LABEL[role]}</Chip>
  )
}

export function Avatar({
  person,
  size = 40,
}: {
  person: { nickname: string; tone: number; role?: Role }
  size?: number
}) {
  return (
    <span
      className={cx('tg-avatar', `tg-avatar--t${person.tone}`)}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
      aria-hidden="true"
    >
      {person.nickname.slice(0, 1)}
    </span>
  )
}

export function AvatarStack({
  people,
  max = 4,
}: {
  people: Array<{ id: string; nickname: string; tone: number }>
  max?: number
}) {
  const shown = people.slice(0, max)
  const rest = people.length - shown.length
  return (
    <span className="tg-avatarstack">
      {shown.map((p) => (
        <Avatar
          key={p.id}
          person={p}
          size={26}
        />
      ))}
      {rest > 0 && <span className="tg-avatarstack__more">+{rest}</span>}
    </span>
  )
}

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className="tg-switch"
      onClick={() => onChange(!checked)}
    >
      <span className="tg-switch__knob" />
    </button>
  )
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T
  options: Array<{ value: T; label: string; badge?: number }>
  onChange: (value: T) => void
  label: string
}) {
  return (
    <div
      className="tg-seg"
      role="tablist"
      aria-label={label}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={option.value === value}
          className="tg-seg__item"
          onClick={() => onChange(option.value)}
        >
          {option.label}
          {option.badge ? (
            <span className="tg-badge">{option.badge}</span>
          ) : null}
        </button>
      ))}
    </div>
  )
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: ReactNode
  children: (id: string) => ReactNode
}) {
  const id = useId()
  return (
    <div className="tg-field">
      <label
        className="tg-label"
        htmlFor={id}
      >
        {label}
      </label>
      {children(id)}
      {hint && <p className="tg-hint">{hint}</p>}
    </div>
  )
}

export function Sheet({
  title,
  onClose,
  children,
  footer,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const sheet = (
    <div
      className="tg-sheet-backdrop"
      onClick={onClose}
    >
      <div
        className="tg-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="tg-sheet__grip" />
        <div className="tg-sheet__head">
          <h2 className="tg-h3">{title}</h2>
          <IconButton
            icon="close"
            label="닫기"
            onClick={onClose}
          />
        </div>
        <div className="tg-sheet__body">{children}</div>
        {footer && <div className="tg-sheet__foot">{footer}</div>}
      </div>
    </div>
  )

  // 스크롤 영역 안에서 열어도 앱 전체를 덮도록 앱 루트에 그린다.
  const root = document.querySelector('.tg-app')
  return root ? createPortal(sheet, root) : sheet
}

export function Empty({
  title,
  body,
  action,
  mood = 'smile',
}: {
  title: string
  body?: ReactNode
  action?: ReactNode
  mood?: 'smile' | 'wink' | 'wow'
}) {
  return (
    <div className="tg-empty">
      <Mascot
        size={72}
        mood={mood}
      />
      <p className="tg-empty__title">{title}</p>
      {body && <p className="tg-empty__body">{body}</p>}
      {action}
    </div>
  )
}

export function LeafAmount({
  value,
  size = 'md',
  sign,
}: {
  value: number
  size?: 'sm' | 'md' | 'lg'
  sign?: boolean
}) {
  const iconSize = size === 'lg' ? 28 : size === 'md' ? 18 : 14
  return (
    <span className={cx('tg-leafamt', `tg-leafamt--${size}`)}>
      <Leaf size={iconSize} />
      <span>
        {sign && value > 0 ? '+' : ''}
        {value.toLocaleString('ko-KR')}
      </span>
    </span>
  )
}

export function SectionHead({
  title,
  caption,
  action,
}: {
  title: string
  caption?: string
  action?: ReactNode
}) {
  return (
    <div className="tg-sectionhead">
      <div>
        <h2 className="tg-h3">{title}</h2>
        {caption && <p className="tg-caption">{caption}</p>}
      </div>
      {action}
    </div>
  )
}

export function Progress({ value, max }: { value: number; max: number }) {
  const percent = max === 0 ? 0 : Math.round((value / max) * 100)
  return (
    <div
      className="tg-progress"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
    >
      <span style={{ width: `${percent}%` }} />
    </div>
  )
}

export function NumberStepper({
  value,
  min,
  max,
  step = 1,
  onChange,
  suffix,
  label,
}: {
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
  suffix?: string
  label: string
}) {
  return (
    <div
      className="tg-stepper"
      role="group"
      aria-label={label}
    >
      <button
        type="button"
        aria-label="줄이기"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - step))}
      >
        −
      </button>
      <span className="tg-stepper__value">
        {value}
        {suffix}
      </span>
      <button
        type="button"
        aria-label="늘리기"
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + step))}
      >
        +
      </button>
    </div>
  )
}

export function CheckRow({
  checked,
  onToggle,
  children,
  aside,
  strike,
}: {
  checked: boolean
  onToggle: () => void
  children: ReactNode
  aside?: ReactNode
  strike?: boolean
}) {
  return (
    <button
      type="button"
      className={cx('tg-checkrow', strike && 'tg-checkrow--strike')}
      role="checkbox"
      aria-checked={checked}
      onClick={onToggle}
    >
      <span className="tg-checkbox">
        {checked && (
          <Icon
            name="check"
            size={14}
            strokeWidth={3}
          />
        )}
      </span>
      <span className="tg-checkrow__label">{children}</span>
      {aside}
    </button>
  )
}

export function StatusDot({ tone }: { tone: 'free' | 'busy' | 'idle' }) {
  return (
    <span
      className={cx('tg-dot', `tg-dot--${tone}`)}
      aria-hidden="true"
    />
  )
}
