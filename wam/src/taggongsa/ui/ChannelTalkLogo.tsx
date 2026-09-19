const BLUE = '#2b57ec'

/**
 * 채널톡 로고. 파란 사각형 안에 오른쪽 아래 모서리가 꼬리처럼 각진
 * 흰 말풍선과 미소를 그린다. 헤더의 채널톡 버튼에 쓴다.
 */
export function ChannelTalkLogo({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <rect
        width="24"
        height="24"
        rx="8"
        fill={BLUE}
      />
      <path
        d="M18 12A6 6 0 1 0 12 18H17a1 1 0 0 0 1-1Z"
        fill="#fff"
      />
      <path
        d="M9.7 12.9Q12 15.3 14.3 12.9"
        fill="none"
        stroke={BLUE}
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  )
}
