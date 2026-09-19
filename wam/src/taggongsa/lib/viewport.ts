import { useEffect } from 'react'

/**
 * 휴대폰에서 키보드가 올라오면 앱 높이를 키보드 위 보이는 영역에 맞춘다.
 * 앱 높이가 화면 전체로 고정돼 있으면 입력란과 아래쪽 버튼이 키보드에 가려지기 때문이다.
 *
 * - visualViewport 높이와 위치를 CSS 변수로 넘겨 `.tg-app` 높이와 위치를 맞춘다.
 * - 입력란을 누르면 키보드가 다 올라온 뒤 그 입력란이 보이도록 스크롤한다.
 */
export function useKeyboardAwareViewport(): void {
  useEffect(() => {
    const viewport = window.visualViewport
    const root = document.documentElement

    const update = () => {
      if (!viewport) return
      root.style.setProperty(
        '--tg-viewport-height',
        `${Math.round(viewport.height)}px`
      )
      root.style.setProperty(
        '--tg-viewport-top',
        `${Math.round(viewport.offsetTop)}px`
      )
    }

    let timer: number | undefined
    const onFocus = (event: FocusEvent) => {
      const target = event.target
      if (
        !(target instanceof HTMLInputElement) &&
        !(target instanceof HTMLTextAreaElement)
      ) {
        return
      }
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        target.scrollIntoView({ block: 'nearest' })
      }, 320)
    }

    update()
    viewport?.addEventListener('resize', update)
    viewport?.addEventListener('scroll', update)
    document.addEventListener('focusin', onFocus)
    return () => {
      viewport?.removeEventListener('resize', update)
      viewport?.removeEventListener('scroll', update)
      document.removeEventListener('focusin', onFocus)
      window.clearTimeout(timer)
    }
  }, [])
}

/** 키보드가 올라오거나 내려가 화면 높이가 바뀔 때마다 콜백을 부른다. */
export function useViewportResize(callback: () => void): void {
  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return
    viewport.addEventListener('resize', callback)
    return () => viewport.removeEventListener('resize', callback)
  }, [callback])
}
