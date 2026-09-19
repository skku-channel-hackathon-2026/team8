import { cx } from '../lib/cx'

type Variant = 'gold' | 'green' | 'orange'

const BODY = '#f8df78'
const SPROUT = '#32b802'
const EYE = '#3b2e24'
const BEAK = '#ef9a4a'

/**
 * 타공사 로고의 새싹 병아리.
 * green은 막 돋은 새싹(새내기), gold는 잎이 자란 새싹(헌내기), orange는 볼이 빨간 병아리.
 */
export function Mascot({
  size = 96,
  color = 'gold',
  mood = 'smile',
  className,
}: {
  size?: number
  color?: Variant
  mood?: 'smile' | 'wink' | 'wow'
  className?: string
}) {
  const bigLeaves = color !== 'green'
  const eyeR = mood === 'wow' ? 4.6 : 3.8
  return (
    <svg
      className={cx('tg-mascot', className)}
      width={size}
      height={size}
      viewBox="0 0 120 120"
      aria-hidden="true"
    >
      <path
        d="M60 44V30"
        stroke={SPROUT}
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      {bigLeaves ? (
        <>
          <path
            d="M60 31c-6-10-18-13-28-9 5 9 17 13 28 9Z"
            fill={SPROUT}
          />
          <path
            d="M60 31c7-11 20-14 31-9-5 10-19 14-31 9Z"
            fill={SPROUT}
          />
        </>
      ) : (
        <>
          <path
            d="M60 33c-4-7-11-9-17-6 3 6 10 8 17 6Z"
            fill={SPROUT}
          />
          <path
            d="M60 33c4-7 12-9 18-6-3 6-11 8-18 6Z"
            fill={SPROUT}
          />
        </>
      )}
      <path
        d="M20 108V82c0-22 18-40 40-40s40 18 40 40v26Z"
        fill={BODY}
      />
      {mood === 'wink' ? (
        <path
          d="M40 78q5-4 10 0"
          fill="none"
          stroke={EYE}
          strokeWidth="3"
          strokeLinecap="round"
        />
      ) : (
        <circle
          cx="45"
          cy="78"
          r={eyeR}
          fill={EYE}
        />
      )}
      <circle
        cx="76"
        cy="78"
        r={eyeR}
        fill={EYE}
      />
      <path
        d="M59 82c3-1 6 1 5 4-1 3-4 4-6 3 2-2 2-4 1-7Z"
        fill={BEAK}
      />
      {color === 'orange' && (
        <>
          <ellipse
            cx="36"
            cy="90"
            rx="6"
            ry="3.5"
            fill="#ff8a7a"
            opacity="0.45"
          />
          <ellipse
            cx="85"
            cy="90"
            rx="6"
            ry="3.5"
            fill="#ff8a7a"
            opacity="0.45"
          />
        </>
      )}
    </svg>
  )
}

/** 포인트 단위인 은행잎 아이콘 */
export function Leaf({ size = 16 }: { size?: number }) {
  return (
    <svg
      className="tg-leaf"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        d="M12 16.2v5.3"
        stroke="#112170"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M12 16.4C7.3 16.2 3 12.6 2.3 6.6 5 4.1 9.2 3.8 11.2 7.2l.8 1.8.8-1.8c2-3.4 6.2-3.1 8.9-.6-.7 6-5 9.6-9.7 9.8Z"
        fill="#f8df78"
        stroke="#112170"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  )
}
