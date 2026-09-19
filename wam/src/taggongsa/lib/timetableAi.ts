import type { ClassBlock } from '../types'
import { uid } from './id'

const ENDPOINT = '/api/timetable/parse'
const MAX_EDGE = 2000
/** 서버가 스트리밍으로 받아도 이미지 한 장은 이 안에 끝난다. */
const TIMEOUT_MS = 180_000

export class TimetableAiError extends Error {
  constructor(readonly code: string) {
    super(code)
  }
}

const MESSAGES: Record<string, string> = {
  ai_not_configured:
    'AI 시간표 인식이 아직 켜지지 않았어요. 운영진이 AI 키를 등록하면 쓸 수 있어요. 지금은 직접 입력해 주세요.',
  ai_key_rejected:
    'AI 키가 거부됐어요. 운영진에게 키를 확인해 달라고 알려 주세요. 지금은 직접 입력해 주세요.',
  unauthorized: '채널톡에서 앱을 다시 열고 시도해 주세요.',
  not_timetable: '시간표 이미지가 아닌 것 같아요. 시간표 화면을 캡처해 주세요.',
  no_classes:
    '수업을 찾지 못했어요. 시간표 전체가 보이도록 더 선명하게 캡처해 주세요.',
  busy: '지금 요청이 많아요. 잠시 후 다시 시도해 주세요.',
  too_large: '이미지가 너무 커요. 화면 캡처 한 장으로 올려 주세요.',
  bad_image: '이미지를 읽을 수 없어요. PNG나 JPG로 다시 올려 주세요.',
  refused: '이 이미지는 처리할 수 없어요. 시간표 캡처만 올려 주세요.',
  network: '서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.',
  timeout: '시간표를 읽는 데 너무 오래 걸렸어요. 다시 시도해 주세요.',
}

export function aiErrorMessage(code: string): string {
  return (
    MESSAGES[code] ??
    '시간표를 읽지 못했어요. 잠시 후 다시 시도하거나 직접 입력해 주세요.'
  )
}

/** 글자가 잘 보이도록 해상도를 넉넉히 두고 JPEG로 줄인다. */
function encodeImage(file: File): Promise<{ mediaType: string; data: string }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new TimetableAiError('bad_image'))
    }
    image.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, MAX_EDGE / Math.max(image.width, image.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(image.width * scale)
      canvas.height = Math.round(image.height * scale)
      const context = canvas.getContext('2d')
      if (!context) {
        reject(new TimetableAiError('bad_image'))
        return
      }
      context.fillStyle = '#ffffff'
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.drawImage(image, 0, 0, canvas.width, canvas.height)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
      resolve({
        mediaType: 'image/jpeg',
        data: dataUrl.slice(dataUrl.indexOf(',') + 1),
      })
    }
    image.src = url
  })
}

interface ServerClass {
  name: string
  day: number
  start: number
  end: number
  room: string
}

/**
 * 시간표 이미지를 서버로 보내 AI가 읽은 수업 목록을 받는다.
 * 서버는 Claude로 이미지 속 글자를 그대로 옮겨 적고, 시간과 요일을 한 번 더 검증한다.
 */
export async function recognizeTimetable(
  file: File,
  sessionToken?: string
): Promise<{ classes: ClassBlock[]; skipped: number }> {
  const image = await encodeImage(file)

  // 응답이 오지 않으면 화면이 '읽는 중'에 영원히 머무르므로 스스로 끊는다.
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS)

  let response: Response
  try {
    response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(sessionToken ? { 'x-taggongsa-session': sessionToken } : {}),
      },
      body: JSON.stringify(image),
      signal: controller.signal,
    })
  } catch {
    throw new TimetableAiError(
      controller.signal.aborted ? 'timeout' : 'network'
    )
  } finally {
    window.clearTimeout(timer)
  }

  const body = (await response.json().catch(() => null)) as {
    classes?: ServerClass[]
    skipped?: number
    error?: string
  } | null

  if (!response.ok || !body?.classes) {
    throw new TimetableAiError(body?.error ?? 'failed')
  }

  return {
    classes: body.classes.map((item) => ({
      id: uid('c'),
      name: item.name,
      day: item.day,
      start: item.start,
      end: item.end,
      place: item.room,
    })),
    skipped: body.skipped ?? 0,
  }
}
