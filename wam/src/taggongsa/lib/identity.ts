import { useMemo } from 'react'
import { useTypedWamData } from '@channel.io/app-sdk-wam'

/**
 * 현재 사용자는 채널톡이 보증한다. 앱이 직접 신원을 만들지 않는다.
 * 서버가 command action에서 내려준 wamArgs를 그대로 읽으며,
 * 같은 값이 server/src/wam-session.ts의 서명 토큰에도 담겨 있어
 * 서버는 이 신원을 위조 불가능하게 확인할 수 있다.
 */
export interface ChannelIdentity {
  channelId: string
  managerId: string
  chatId: string
  chatType: string
  /** 서버 API를 부를 때 붙이는 서명 토큰. 채널톡 밖에서는 비어 있다. */
  sessionToken: string
  /** 'channel' = Desk에서 받은 실제 매니저, 'local' = 채널톡 밖 미리보기 */
  source: 'channel' | 'local'
}

export type IdentityState =
  | { status: 'ready'; identity: ChannelIdentity }
  | { status: 'error'; message: string }

/**
 * pnpm dev:wam으로 화면만 볼 때 쓰는 미리보기 신원.
 *
 * 주소에 `?as=이름`을 붙이면 그 이름이 곧 사람이 된다. 창을 두 개 열어
 * 한쪽은 `?as=sunbae`, 한쪽은 `?as=sinip`으로 두면 혼자서도 헌내기와
 * 새내기가 주고받는 것을 볼 수 있다. 서버도 localhost에서만 이 토큰을
 * 받아들인다 — 배포된 주소에서는 채널톡의 서명 토큰만 통한다.
 */
function localIdentity(): ChannelIdentity {
  let who = ''
  try {
    who = new URLSearchParams(window.location.search).get('as') ?? ''
  } catch {
    who = ''
  }
  const managerId = who.trim().slice(0, 40) || 'local-preview-manager'
  return {
    channelId: 'local-preview',
    managerId,
    chatId: '',
    chatType: '',
    sessionToken: `local:${managerId}`,
    source: 'local',
  }
}

function inChannelHost(): boolean {
  try {
    return typeof window !== 'undefined' && Boolean(window.ChannelIOWam)
  } catch {
    return false
  }
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

/** 이 매니저의 저장소를 가리키는 키. */
export function scopeOf(identity: ChannelIdentity): string {
  return `${identity.channelId}:${identity.managerId}`
}

export function useChannelIdentity(): IdentityState {
  const channelId = useTypedWamData('channelId')
  const managerId = useTypedWamData('managerId')
  const chatId = useTypedWamData('chatId')
  const chatType = useTypedWamData('chatType')
  const sessionToken = useTypedWamData('sessionToken')

  return useMemo(() => {
    const identity: ChannelIdentity = {
      channelId: text(channelId),
      managerId: text(managerId),
      chatId: text(chatId),
      chatType: text(chatType),
      sessionToken: text(sessionToken),
      source: 'channel',
    }

    if (identity.channelId && identity.managerId) {
      return { status: 'ready', identity }
    }

    if (!inChannelHost()) {
      return { status: 'ready', identity: localIdentity() }
    }

    // Desk 안인데 신원이 없으면 남의 기록을 건드릴 수 있으므로 진행하지 않는다.
    return {
      status: 'error',
      message:
        '채널톡에서 사용자 정보를 받지 못했어요. 창을 닫고 커맨드를 다시 실행해 주세요.',
    }
  }, [channelId, managerId, chatId, chatType, sessionToken])
}
