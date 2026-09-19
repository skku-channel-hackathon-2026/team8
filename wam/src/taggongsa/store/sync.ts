import { useCallback, useEffect, useMemo } from 'react'
import type { ClassBlock, SignupInput } from '@tutorial/shared'
import { ApiError, api, apiErrorMessage } from '../lib/api'
import { useApp } from './context'

/**
 * 서버를 프로필·시간표의 보관처로 쓴다.
 *
 * 화면은 지금까지처럼 reducer로 즉시 그린다. 은행잎·토스트·튜토리얼 단계가
 * 아직 reducer 안에 있어서, 서버 응답을 기다리게 하면 데모가 네트워크에
 * 묶인다. 대신 저장이 실패하면 조용히 넘기지 않고 토스트로 알린다.
 *
 * 원장이 서버로 옮겨가면 그때 "성공한 뒤에만 반영"으로 바꾼다.
 */
export function useProfileSync() {
  const { dispatch, identity } = useApp()
  const token = identity.sessionToken

  const warn = useCallback(
    (error: unknown, what: string) => {
      const failure = error instanceof ApiError ? error : new ApiError('failed')
      dispatch({
        type: 'TOAST',
        text: `${what}을 서버에 저장하지 못했어요. ${apiErrorMessage(
          failure.code,
          failure.status
        )}`,
      })
    },
    [dispatch]
  )

  const signup = useCallback(
    async (input: SignupInput): Promise<void> => {
      try {
        const profile = await api.signup(token, input)
        dispatch({ type: 'HYDRATE_PROFILE', profile })
      } catch (error) {
        // 이미 가입된 계정이면 서버 값을 가져와 맞춘다.
        if (error instanceof ApiError && error.code === 'already_signed_up') {
          const profile = await api.getProfile(token).catch(() => null)
          if (profile) {
            dispatch({ type: 'HYDRATE_PROFILE', profile })
            return
          }
        }
        warn(error, '가입 정보')
      }
    },
    [dispatch, token, warn]
  )

  const saveTimetable = useCallback(
    async (blocks: ClassBlock[]): Promise<void> => {
      try {
        await api.saveTimetable(token, blocks)
      } catch (error) {
        warn(error, '시간표')
      }
    },
    [token, warn]
  )

  return useMemo(() => ({ signup, saveTimetable }), [signup, saveTimetable])
}

/** 앱이 열릴 때 서버에 저장된 프로필을 한 번 불러온다. */
export function useHydrateProfile(): void {
  const { dispatch, identity } = useApp()
  const token = identity.sessionToken

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const profile = await api.getProfile(token)
        if (!cancelled && profile) {
          dispatch({ type: 'HYDRATE_PROFILE', profile })
        }
      } catch (error) {
        // 서버에 못 닿으면 로컬 상태로 계속 쓴다. 첫 화면을 막지 않는다.
        if (!(error instanceof ApiError)) throw error
      }
    })()
    return () => {
      cancelled = true
    }
  }, [dispatch, token])
}
