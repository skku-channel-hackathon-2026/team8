import type { ReactNode } from 'react'

const PATHS = {
  home: (
    <path d="M3.5 10.5 12 3.5l8.5 7V20a1 1 0 0 1-1 1H15v-6H9v6H4.5a1 1 0 0 1-1-1z" />
  ),
  people: (
    <>
      <circle
        cx="9"
        cy="8"
        r="3.5"
      />
      <path d="M2.5 20c.6-3.6 3.3-6 6.5-6s5.9 2.4 6.5 6" />
      <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8" />
      <path d="M18 14.3c2 .8 3.3 2.9 3.6 5.7" />
    </>
  ),
  bag: (
    <>
      <path d="M4 8h16l-1.2 11.2a2 2 0 0 1-2 1.8H7.2a2 2 0 0 1-2-1.8z" />
      <path d="M8.5 8V6.5a3.5 3.5 0 0 1 7 0V8" />
    </>
  ),
  user: (
    <>
      <circle
        cx="12"
        cy="8"
        r="4"
      />
      <path d="M4 21c.8-4 4-6.5 8-6.5s7.2 2.5 8 6.5" />
    </>
  ),
  back: <path d="m15 18-6-6 6-6" />,
  chevron: <path d="m9 18 6-6-6-6" />,
  close: <path d="M18 6 6 18M6 6l12 12" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  lock: (
    <>
      <rect
        x="5"
        y="11"
        width="14"
        height="10"
        rx="2"
      />
      <path d="M8 11V7.5a4 4 0 0 1 8 0V11" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  clock: (
    <>
      <circle
        cx="12"
        cy="12"
        r="9"
      />
      <path d="M12 7v5l3 2" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
      <circle
        cx="12"
        cy="9.5"
        r="2.5"
      />
    </>
  ),
  image: (
    <>
      <rect
        x="3"
        y="4"
        width="18"
        height="16"
        rx="2.5"
      />
      <circle
        cx="8.5"
        cy="9.5"
        r="1.8"
      />
      <path d="m21 16-5-5-9 9" />
    </>
  ),
  sparkle: (
    <path d="M12 3c.6 4.4 2.6 6.4 7 7-4.4.6-6.4 2.6-7 7-.6-4.4-2.6-6.4-7-7 4.4-.6 6.4-2.6 7-7z" />
  ),
  game: (
    <>
      <rect
        x="2.5"
        y="7"
        width="19"
        height="11"
        rx="5.5"
      />
      <path d="M7.5 10.5v4M5.5 12.5h4" />
      <path d="M15.5 11.5h.01M17.5 13.5h.01" />
    </>
  ),
  book: (
    <>
      <path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v14H7.5A2.5 2.5 0 0 0 5 19.5z" />
      <path d="M5 19.5A2.5 2.5 0 0 0 7.5 22H19v-5" />
    </>
  ),
  thumb: (
    <>
      <path d="M7 10v10H4.5a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1z" />
      <path d="M7 10l3.8-6.6a2.3 2.3 0 0 1 2.7 2.3V9h5.1a2 2 0 0 1 2 2.3l-1.2 7A2 2 0 0 1 17.4 20H7" />
    </>
  ),
  send: (
    <>
      <path d="M21 3 10 14" />
      <path d="M21 3 14.5 21 10 14 3 9.5z" />
    </>
  ),
  calendar: (
    <>
      <rect
        x="3"
        y="4.5"
        width="18"
        height="16.5"
        rx="2.5"
      />
      <path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
    </>
  ),
  upload: (
    <>
      <path d="M12 15V4M7.5 8.5 12 4l4.5 4.5" />
      <path d="M4 15v3.5A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5V15" />
    </>
  ),
  trash: <path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13" />,
  search: (
    <>
      <circle
        cx="11"
        cy="11"
        r="7"
      />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  flag: <path d="M5 21V4h11l-2 4 2 4H5" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  logout: (
    <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M5 12h11" />
  ),
  edit: <path d="M4 20h4L19 9l-4-4L4 16z" />,
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle
        cx="12"
        cy="12"
        r="3"
      />
    </>
  ),
  bell: (
    <>
      <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" />
      <path d="M10 20.5a2 2 0 0 0 4 0" />
    </>
  ),
  inbox: (
    <>
      <path d="M3 13.5 5.5 5h13l2.5 8.5V19a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 19z" />
      <path d="M3 13.5h5l1.5 2.5h5l1.5-2.5h5" />
    </>
  ),
  bolt: <path d="M13 2.5 4.5 13.5H11l-1 8 8.5-11H12z" />,
} satisfies Record<string, ReactNode>

export type IconName = keyof typeof PATHS

export function Icon({
  name,
  size = 20,
  strokeWidth = 1.8,
  className,
}: {
  name: IconName
  size?: number
  strokeWidth?: number
  className?: string
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  )
}
