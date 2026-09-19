import { useCallback, useEffect, useRef, type Dispatch } from 'react'
import { CHARGE_PACKS } from '@tutorial/shared'
import { ApiError, api, apiErrorMessage } from '../lib/api'
import { toLocalSnapshot } from './mirror'
import type { Action, AppState } from './state'

/**
 * 화면의 동작을 서버로 넘기는 다리.
 *
 * 화면은 지금까지처럼 dispatch만 부른다. 여기서 그 동작에 해당하는 요청을
 * 서버로 보내고, 응답이 오면 스냅샷을 다시 받아 화면을 서버 값으로 맞춘다.
 * 그래서 화면 코드는 한 줄도 바꾸지 않아도 여러 사람이 같은 데이터를 본다.
 *
 * 화면은 먼저 그리고 서버가 뒤따른다. 서버가 거절하면 곧바로 오는 스냅샷이
 * 화면을 되돌려 놓고, 토스트로 이유를 알린다. 판정 자체는 언제나 서버가
 * 한다 — 두 사람이 같은 부탁을 동시에 맡으면 한 명만 맡게 되는 식이다.
 *
 * 새로 고침은 두 가지로 온다.
 *  - 내가 뭔가 한 직후 (요청이 끝나자마자)
 *  - 일정 간격 (다른 사람이 한 일을 알아채려고)
 */

const POLL_MS = 3000

/** 내 id가 아직 없을 때 쓰는 값. 서버는 `채널:매니저` 꼴을 쓴다. */
function myServerId(state: AppState): string {
  const { channelId, managerId } = state.identity
  return `${channelId}:${managerId}`
}

export function useServerBridge(
  state: AppState,
  dispatch: Dispatch<Action>
): Dispatch<Action> {
  const token = state.identity.sessionToken
  // 요청 처리 중에 최신 상태를 읽어야 해서 ref로 들고 있는다.
  const latest = useRef(state)
  latest.current = state

  // 지난번과 똑같은 스냅샷이면 화면을 건드리지 않는다. 몇 초마다 같은 값으로
  // 상태를 갈아 끼우면 아무것도 바뀌지 않았는데 화면 전체가 다시 그려진다.
  const seen = useRef('')

  const refresh = useCallback(
    async (force = false): Promise<void> => {
      try {
        const snapshot = await api.getSnapshot(token)
        const fingerprint = JSON.stringify(snapshot)
        // 내가 방금 뭔가 했으면 값이 같아도 반영한다. 서버가 거절했을 때
        // 화면에 먼저 그려 둔 것을 되돌려야 하기 때문이다.
        if (!force && fingerprint === seen.current) return
        seen.current = fingerprint
        dispatch({
          type: 'SYNC',
          snapshot: toLocalSnapshot(snapshot, myServerId(latest.current)),
        })
      } catch {
        // 서버에 못 닿아도 화면은 계속 쓴다. 다음 차례에 다시 시도한다.
      }
    },
    [dispatch, token]
  )

  /** 서버 호출 하나를 보내고, 끝나면 화면을 서버 값으로 맞춘다. */
  const send = useCallback(
    (work: Promise<unknown>): void => {
      void work
        .catch((error: unknown) => {
          const code = error instanceof ApiError ? error.code : 'failed'
          dispatch({ type: 'TOAST', text: apiErrorMessage(code) })
        })
        .then(() => refresh(true))
    },
    [dispatch, refresh]
  )

  const bridged = useCallback(
    (action: Action): void => {
      // 화면은 먼저 그린다.
      dispatch(action)

      switch (action.type) {
        case 'COMPLETE_STEP':
          return send(api.completeStep(token, action.step))
        case 'SET_SHOW_FREE':
          return send(api.setShowFree(token, action.value))
        case 'CHARGE': {
          // 상품 번호만 보낸다. 지급량은 서버가 상품표에서 읽는다.
          const index = CHARGE_PACKS.findIndex(
            (pack) => pack.amount === action.amount
          )
          if (index < 0) return
          return send(api.charge(token, index))
        }

        case 'CREATE_MISSION':
          return send(api.createMission(token, action.draft))
        case 'TOGGLE_RECOMMEND':
          return send(api.toggleRecommend(token, action.missionId))
        case 'SUBMIT_MISSION':
          // 사진은 아직 서버에 올리지 않는다. 글로 남긴 인증만 보낸다.
          return send(api.submitMission(token, action.missionId, action.note))
        case 'REVIEW_SUBMISSION':
          return send(api.reviewSubmission(token, action.id, action.approve))

        case 'SEND_DM':
          return send(
            api.sendDm(token, {
              toId: action.toId,
              theme: action.theme,
              message: action.message,
            })
          )
        case 'RESPOND_REQUEST':
          return send(api.respondRequest(token, action.id, action.accept))
        case 'CREATE_ROOM': {
          // 방 id는 서버가 붙인다. 화면이 먼저 만든 id는 스냅샷이 대신한다.
          const { title, theme, place, until, max, note } = action.draft
          return send(
            api.createRoom(token, { title, theme, place, until, max, note })
          )
        }
        case 'JOIN_ROOM':
          return send(api.joinRoom(token, action.roomId))
        case 'LEAVE_ROOM':
          return send(api.leaveRoom(token, action.roomId))
        case 'INVITE':
          return send(api.invite(token, action.roomId, action.toIds))

        case 'POST_TASK':
          return send(api.createTask(token, action.draft))
        case 'TAKE_TASK':
          return send(api.takeTask(token, action.taskId))
        case 'REPORT_TASK':
          return send(api.reportTask(token, action.taskId))
        case 'CONFIRM_TASK':
          return send(api.confirmTask(token, action.taskId))
        case 'CANCEL_TASK':
          return send(api.cancelTask(token, action.taskId))

        case 'SEND_CHAT_MESSAGE': {
          const text = action.text.trim()
          if (!text) return
          return send(api.sendChat(token, action.chatId, text))
        }

        default:
          // 나머지는 이 기기 안에서만 쓰는 상태다. 서버로 보낼 것이 없다.
          return
      }
    },
    [dispatch, send, token]
  )

  // 다른 사람이 한 일을 알아채려고 일정 간격으로 다시 받아 온다.
  useEffect(() => {
    void refresh()
    const timer = window.setInterval(() => void refresh(), POLL_MS)
    return () => window.clearInterval(timer)
  }, [refresh])

  return bridged
}
