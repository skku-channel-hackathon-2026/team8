import { useEffect, useMemo, useState } from 'react'
import { useWamData } from '@channel.io/app-sdk-wam'
import { useApp, useMe } from '../store/context'
import type { ClassBlock, Moment } from '../types'
import { cx } from '../lib/cx'
import { hashString, uid } from '../lib/id'
import {
  DAY_LABELS,
  SCHOOL_END,
  SCHOOL_START,
  describeFree,
  fmt,
  getFreeState,
  parseHM,
} from '../lib/time'
import {
  TimetableAiError,
  aiErrorMessage,
  recognizeTimetable,
} from '../lib/timetableAi'
import { Icon } from '../ui/Icon'
import {
  Button,
  CheckRow,
  IconButton,
  Empty,
  Field,
  Sheet,
  StatusDot,
} from '../ui/primitives'

export function TimetableGrid({
  blocks,
  now,
  compact,
  onBlockClick,
}: {
  blocks: ClassBlock[]
  now: Moment
  compact?: boolean
  onBlockClick?: (block: ClassBlock) => void
}) {
  const hourHeight = compact ? 24 : 40
  const startHour = Math.min(
    SCHOOL_START / 60,
    ...blocks.map((b) => Math.floor(b.start / 60))
  )
  const endHour = Math.max(
    SCHOOL_END / 60,
    ...blocks.map((b) => Math.ceil(b.end / 60))
  )
  const hours = Array.from(
    { length: endHour - startHour },
    (_, i) => startHour + i
  )
  const height = hours.length * hourHeight
  const top = (minutes: number) =>
    ((minutes - startHour * 60) / 60) * hourHeight
  const nowVisible =
    now.day <= 4 && now.minutes >= startHour * 60 && now.minutes <= endHour * 60

  return (
    <div
      className="tg-tt"
      aria-label="주간 시간표"
    >
      <div className="tg-tt__corner" />
      {DAY_LABELS.slice(0, 5).map((label, day) => (
        <div
          key={label}
          className={cx(
            'tg-tt__dayhead',
            day === now.day && 'tg-tt__dayhead--today'
          )}
        >
          {label}
        </div>
      ))}
      <div
        className="tg-tt__hours"
        style={{ height }}
      >
        {hours.map((hour) => (
          <span
            key={hour}
            className="tg-tt__hour"
            style={{ top: top(hour * 60) + (hour === startHour ? 8 : 0) }}
          >
            {hour}
          </span>
        ))}
      </div>
      {[0, 1, 2, 3, 4].map((day) => (
        <div
          key={day}
          className="tg-tt__col"
          style={{ height, backgroundSize: `100% ${hourHeight}px` }}
        >
          {blocks
            .filter((block) => block.day === day)
            .map((block) => (
              <button
                key={block.id}
                type="button"
                className={cx(
                  'tg-tt__block',
                  `tg-tt__block--c${hashString(block.name) % 5}`
                )}
                style={{
                  top: top(block.start) + 1,
                  height: ((block.end - block.start) / 60) * hourHeight - 2,
                }}
                onClick={() => onBlockClick?.(block)}
                tabIndex={onBlockClick ? 0 : -1}
                aria-label={`${DAY_LABELS[day]} ${fmt(block.start)} ${block.name} ${block.place}`}
              >
                <strong>{block.name}</strong>
                {!compact && <span>{block.place}</span>}
              </button>
            ))}
          {nowVisible && now.day === day && (
            <span
              className="tg-tt__now"
              style={{ top: top(now.minutes) }}
            />
          )}
        </div>
      ))}
    </div>
  )
}

function blockLabel(block: ClassBlock): string {
  return `${DAY_LABELS[block.day]} ${fmt(block.start)}–${fmt(block.end)}`
}

export function AiUploadSheet({ onClose }: { onClose: () => void }) {
  const { dispatch } = useApp()
  const me = useMe()
  const sessionToken = useWamData('sessionToken')
  const [preview, setPreview] = useState<string | null>(null)
  const [phase, setPhase] = useState<'pick' | 'scanning' | 'result'>('pick')
  const [found, setFound] = useState<ClassBlock[]>([])
  const [skipped, setSkipped] = useState(0)
  const [excluded, setExcluded] = useState<Set<string>>(new Set())
  const [editing, setEditing] = useState<ClassBlock | null>(null)
  const [error, setError] = useState('')
  // 실패 원인을 Desk에서도 구분할 수 있게 코드를 함께 보여 준다.
  const [errorCode, setErrorCode] = useState('')

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

  const onFile = async (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('이미지 파일만 올릴 수 있어요')
      setErrorCode('')
      return
    }
    setError('')
    setErrorCode('')
    setPreview(URL.createObjectURL(file))
    setPhase('scanning')
    try {
      const result = await recognizeTimetable(
        file,
        typeof sessionToken === 'string' ? sessionToken : undefined
      )
      setFound(result.classes)
      setSkipped(result.skipped)
      setExcluded(new Set())
      setPhase('result')
    } catch (caught) {
      const code = caught instanceof TimetableAiError ? caught.code : 'failed'
      setError(aiErrorMessage(code))
      setErrorCode(code)
      setPreview(null)
      setPhase('pick')
    }
  }

  const selected = found.filter((block) => !excluded.has(block.id))
  const toggle = (id: string) => {
    setExcluded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const save = () => {
    dispatch({ type: 'SET_TIMETABLE', blocks: selected })
    onClose()
  }

  if (editing) {
    return (
      <ClassSheet
        initial={editing}
        others={found}
        onSave={(block) => {
          setFound((prev) => prev.map((b) => (b.id === block.id ? block : b)))
          setEditing(null)
        }}
        onDelete={() => {
          setFound((prev) => prev.filter((b) => b.id !== editing.id))
          setEditing(null)
        }}
        onClose={() => setEditing(null)}
      />
    )
  }

  return (
    <Sheet
      title="시간표 이미지로 추가"
      onClose={onClose}
      footer={
        phase === 'result' ? (
          <>
            <Button
              variant="outline"
              onClick={() => {
                setPhase('pick')
                setPreview(null)
              }}
            >
              다시 올리기
            </Button>
            <Button
              className="tg-grow"
              variant="dark"
              disabled={selected.length === 0}
              onClick={save}
            >
              {selected.length}개 수업 저장
            </Button>
          </>
        ) : undefined
      }
    >
      <div className="tg-stack">
        {phase === 'pick' && (
          <>
            <p className="tg-body">
              에브리타임, GLS, 킹고엠의 시간표 화면을 캡처해서 올려주세요. AI가
              수업 칸에 적힌 과목명, 강의실, 시간을 그대로 읽어 와요.
            </p>
            <label className="tg-dropzone">
              <Icon
                name="upload"
                size={28}
              />
              시간표 이미지 선택
              <span className="tg-caption">PNG, JPG · 한 장</span>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => {
                  void onFile(event.target.files?.[0])
                  event.target.value = ''
                }}
              />
            </label>
            {error && (
              <>
                <div className="tg-banner tg-banner--error">
                  <Icon
                    name="bell"
                    size={16}
                  />
                  {error}
                </div>
                {errorCode && (
                  <p className="tg-caption">오류 코드: {errorCode}</p>
                )}
              </>
            )}
            <p className="tg-caption">
              잘 읽히는 이미지: 시간표 전체가 한 화면에 보이고, 과목명과 강의실
              글자가 잘리지 않은 캡처
            </p>
            {me.timetable.length > 0 && (
              <div className="tg-banner">
                <Icon
                  name="bell"
                  size={16}
                />
                저장하면 지금 등록된 시간표를 새 시간표로 바꿔요.
              </div>
            )}
          </>
        )}

        {phase === 'scanning' && (
          <>
            {preview && (
              <div className="tg-scan">
                <img
                  src={preview}
                  alt="올린 시간표"
                />
              </div>
            )}
            <div className="tg-row">
              <Icon
                name="sparkle"
                size={18}
              />
              <p className="tg-strong">AI가 시간표를 읽고 있어요…</p>
            </div>
            <p className="tg-caption">
              과목명, 요일, 시간, 강의실을 한 칸씩 옮겨 적는 중이에요. 30초에서
              1분 정도 걸려요.
            </p>
          </>
        )}

        {phase === 'result' && (
          <>
            <div className="tg-banner tg-banner--blue">
              <Icon
                name="sparkle"
                size={16}
              />
              <span>
                <b>{found.length}개 수업</b>을 읽었어요. 틀린 곳은 연필 버튼으로
                고치고, 필요 없는 수업은 체크를 풀어 주세요.
              </span>
            </div>
            {skipped > 0 && (
              <p className="tg-caption">
                시간을 알아보기 어렵거나 주말에 있는 칸 {skipped}개는 뺐어요.
                필요하면 저장 후 직접 추가해 주세요.
              </p>
            )}
            <div className="tg-list">
              {found.map((block) => (
                <div
                  key={block.id}
                  className="tg-editrow"
                >
                  <CheckRow
                    checked={!excluded.has(block.id)}
                    onToggle={() => toggle(block.id)}
                  >
                    {block.name}
                    <span
                      className="tg-caption"
                      style={{ display: 'block' }}
                    >
                      {blockLabel(block)} · {block.place || '강의실 없음'}
                    </span>
                  </CheckRow>
                  <IconButton
                    icon="edit"
                    label={`${block.name} 고치기`}
                    onClick={() => setEditing(block)}
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </Sheet>
  )
}

function ClassSheet({
  initial,
  others,
  onSave,
  onDelete,
  onClose,
}: {
  initial: ClassBlock | null
  others: ClassBlock[]
  onSave: (block: ClassBlock) => void
  onDelete?: () => void
  onClose: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [day, setDay] = useState(initial?.day ?? 0)
  const [start, setStart] = useState(fmt(initial?.start ?? 9 * 60))
  const [end, setEnd] = useState(fmt(initial?.end ?? 10 * 60 + 15))
  const [place, setPlace] = useState(initial?.place ?? '')

  const startMin = parseHM(start)
  const endMin = parseHM(end)
  const overlap = useMemo(
    () =>
      startMin !== null &&
      endMin !== null &&
      others.some(
        (b) =>
          b.id !== initial?.id &&
          b.day === day &&
          b.start < endMin &&
          startMin < b.end
      ),
    [others, initial, day, startMin, endMin]
  )
  const error =
    startMin === null || endMin === null
      ? '시간을 확인해 주세요'
      : endMin <= startMin
        ? '끝나는 시간이 시작 시간보다 늦어야 해요'
        : overlap
          ? '같은 시간에 다른 수업이 있어요'
          : ''
  const valid = name.trim() !== '' && error === ''

  return (
    <Sheet
      title={initial ? '수업 수정' : '수업 직접 추가'}
      onClose={onClose}
      footer={
        <>
          {onDelete && (
            <Button
              variant="outline"
              icon="trash"
              onClick={onDelete}
            >
              삭제
            </Button>
          )}
          <Button
            className="tg-grow"
            variant="dark"
            disabled={!valid}
            onClick={() =>
              startMin !== null &&
              endMin !== null &&
              onSave({
                id: initial?.id ?? uid('c'),
                name: name.trim(),
                day,
                start: startMin,
                end: endMin,
                place: place.trim() || '장소 미정',
              })
            }
          >
            저장
          </Button>
        </>
      }
    >
      <div className="tg-stack">
        <Field label="과목명">
          {(id) => (
            <input
              id={id}
              className="tg-input"
              placeholder="예: 경영학원론"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          )}
        </Field>
        <div className="tg-field">
          <span className="tg-label">요일</span>
          <div className="tg-daypick">
            {DAY_LABELS.slice(0, 5).map((label, index) => (
              <button
                key={label}
                type="button"
                aria-pressed={day === index}
                onClick={() => setDay(index)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="tg-grid2">
          <Field label="시작">
            {(id) => (
              <input
                id={id}
                type="time"
                className="tg-input"
                value={start}
                step={300}
                onChange={(event) => setStart(event.target.value)}
              />
            )}
          </Field>
          <Field label="끝">
            {(id) => (
              <input
                id={id}
                type="time"
                className="tg-input"
                value={end}
                step={300}
                onChange={(event) => setEnd(event.target.value)}
              />
            )}
          </Field>
        </div>
        <Field label="강의실">
          {(id) => (
            <input
              id={id}
              className="tg-input"
              placeholder="예: 경영관 33101"
              value={place}
              onChange={(event) => setPlace(event.target.value)}
            />
          )}
        </Field>
        {error && name.trim() !== '' && (
          <p
            className="tg-hint"
            style={{ color: 'var(--tg-heart)' }}
          >
            {error}
          </p>
        )}
      </div>
    </Sheet>
  )
}

export function TimetableScreen() {
  const { dispatch, now } = useApp()
  const me = useMe()
  const [aiOpen, setAiOpen] = useState(false)
  const [editing, setEditing] = useState<ClassBlock | 'new' | null>(null)
  const blocks = me.timetable
  const free = getFreeState(blocks, now)
  const copy = describeFree(free, now)

  const saveBlock = (block: ClassBlock) => {
    const exists = blocks.some((b) => b.id === block.id)
    dispatch({
      type: 'SET_TIMETABLE',
      blocks: exists
        ? blocks.map((b) => (b.id === block.id ? block : b))
        : [...blocks, block],
    })
    setEditing(null)
  }

  const deleteBlock = (id: string) => {
    dispatch({
      type: 'SET_TIMETABLE',
      blocks: blocks.filter((b) => b.id !== id),
    })
    setEditing(null)
  }

  return (
    <div className="tg-stack">
      <div className="tg-stack tg-stack--sm">
        <h1 className="tg-h1">내 시간표</h1>
        <div className="tg-row">
          <StatusDot
            tone={
              free.kind === 'free'
                ? 'free'
                : free.kind === 'class'
                  ? 'busy'
                  : 'idle'
            }
          />
          <p className="tg-body">
            <b className="tg-strong">{copy.title}</b> · {copy.detail}
          </p>
        </div>
      </div>

      <div className="tg-grid2">
        <Button
          size="md"
          icon="sparkle"
          onClick={() => setAiOpen(true)}
        >
          이미지로 추가
        </Button>
        <Button
          size="md"
          variant="outline"
          icon="plus"
          onClick={() => setEditing('new')}
        >
          직접 추가
        </Button>
      </div>

      {blocks.length === 0 ? (
        <Empty
          title="아직 등록된 수업이 없어요"
          body="시간표 사진을 올리면 AI가 알아서 정리해 줘요"
        />
      ) : (
        <>
          <TimetableGrid
            blocks={blocks}
            now={now}
            onBlockClick={(block) => setEditing(block)}
          />
          <p className="tg-caption">
            수업을 누르면 수정하거나 지울 수 있어요. 빨간 선은 지금 시각이에요.
          </p>
        </>
      )}

      {aiOpen && <AiUploadSheet onClose={() => setAiOpen(false)} />}
      {editing && (
        <ClassSheet
          initial={editing === 'new' ? null : editing}
          others={blocks}
          onSave={saveBlock}
          onDelete={
            editing === 'new' ? undefined : () => deleteBlock(editing.id)
          }
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
