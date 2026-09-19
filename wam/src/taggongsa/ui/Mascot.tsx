import { cx } from '../lib/cx'

type LeafColor = 'gold' | 'green' | 'orange'

const FILL: Record<LeafColor, string> = {
  gold: 'var(--tg-ginkgo)',
  green: 'var(--tg-sprout)',
  orange: 'var(--tg-orange)',
}

/** 타공사의 마스코트 '은행이'. 새내기는 초록 잎, 헌내기는 노란 잎으로 그린다. */
export function Mascot({
  size = 96,
  color = 'gold',
  mood = 'smile',
  className,
}: {
  size?: number
  color?: LeafColor
  mood?: 'smile' | 'wink' | 'wow'
  className?: string
}) {
  return (
    <svg
      className={cx('tg-mascot', className)}
      width={size}
      height={size}
      viewBox="0 0 120 120"
      aria-hidden="true"
    >
      <path
        d="M60 94 Q57 106 65 114"
        fill="none"
        stroke="#1f1b16"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <path
        d="M60 94C37 93 15 75 11 44c14-14 37-16 45 1l4 9 4-9c8-17 31-15 45-1-4 31-26 49-49 50Z"
        fill={FILL[color]}
        stroke="#1f1b16"
        strokeWidth="3.2"
        strokeLinejoin="round"
      />
      <path
        d="M60 90 35 52M60 90 48 46M60 90l12-44M60 90l25-38"
        stroke="#1f1b16"
        strokeOpacity="0.18"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {mood === 'wink' ? (
        <path
          d="M42 66q5-4 10 0"
          fill="none"
          stroke="#1f1b16"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
      ) : (
        <circle
          cx="47"
          cy="66"
          r={mood === 'wow' ? 4.5 : 3.8}
          fill="#1f1b16"
        />
      )}
      <circle
        cx="73"
        cy="66"
        r={mood === 'wow' ? 4.5 : 3.8}
        fill="#1f1b16"
      />
      <circle
        cx="48.4"
        cy="64.6"
        r="1.2"
        fill="#fff"
        opacity={mood === 'wink' ? 0 : 1}
      />
      <circle
        cx="74.4"
        cy="64.6"
        r="1.2"
        fill="#fff"
      />
      <ellipse
        cx="38"
        cy="75"
        rx="5.5"
        ry="3.2"
        fill="var(--tg-heart)"
        opacity="0.35"
      />
      <ellipse
        cx="82"
        cy="75"
        rx="5.5"
        ry="3.2"
        fill="var(--tg-heart)"
        opacity="0.35"
      />
      {mood === 'wow' ? (
        <ellipse
          cx="60"
          cy="77"
          rx="4"
          ry="5"
          fill="#1f1b16"
        />
      ) : (
        <path
          d="M53 74q7 7 14 0"
          fill="none"
          stroke="#1f1b16"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
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
        stroke="#1f1b16"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M12 16.4C7.3 16.2 3 12.6 2.3 6.6 5 4.1 9.2 3.8 11.2 7.2l.8 1.8.8-1.8c2-3.4 6.2-3.1 8.9-.6-.7 6-5 9.6-9.7 9.8Z"
        fill="var(--tg-ginkgo)"
        stroke="#1f1b16"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}
