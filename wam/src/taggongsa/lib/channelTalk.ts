/**
 * 채널톡 버튼(웹 메신저). 앱 헤더의 채널톡 버튼을 누르면 메신저가 열린다.
 *
 * 채널톡이 기본으로 띄우는 오른쪽 아래 버튼은 채팅 입력란과 하단 버튼을
 * 가리므로 숨기고, 헤더 버튼으로만 연다.
 * 플러그인 키는 공개되는 값이다. Access Secret은 절대 여기에 넣지 않는다.
 */
const PLUGIN_KEY = 'a7d6086d-46c8-4593-8532-296829c7af40'
const SCRIPT_SRC = 'https://cdn.channel.io/plugin/ch-plugin-web.js'

type ChannelIOCommand = (...args: unknown[]) => void

interface ChannelIOStub extends ChannelIOCommand {
  q: unknown[][]
  c: (args: unknown[]) => void
}

declare global {
  interface Window {
    ChannelIO?: ChannelIOCommand
    ChannelIOInitialized?: boolean
  }
}

let booted = false

/** 채널톡 스크립트를 한 번만 불러오고 부팅한다. 불러오기 전 호출은 줄 세워 둔다. */
export function bootChannelTalk(): void {
  if (booted || typeof window === 'undefined') return
  booted = true

  if (!window.ChannelIO) {
    const stub = ((...args: unknown[]) => stub.c(args)) as ChannelIOStub
    stub.q = []
    stub.c = (args) => {
      stub.q.push(args)
    }
    window.ChannelIO = stub
  }

  if (!window.ChannelIOInitialized) {
    window.ChannelIOInitialized = true
    const script = document.createElement('script')
    script.async = true
    script.src = SCRIPT_SRC
    document.head.appendChild(script)
  }

  window.ChannelIO('boot', {
    pluginKey: PLUGIN_KEY,
    hideChannelButtonOnBoot: true,
  })
}

export function openChannelTalk(): void {
  bootChannelTalk()
  window.ChannelIO?.('showMessenger')
}
