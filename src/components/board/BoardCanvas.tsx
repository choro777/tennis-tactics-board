import { useCallback, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, RefObject } from 'react'
import type { Drawing, DrawingType, Point, SelectionRef } from '../../types'
import {
  BOARD_H,
  BOARD_W,
  SIZES,
  ZOOM_MAX,
  ZOOM_MIN,
  clampPoint,
  toUnits,
} from '../../lib/board'
import { dist } from '../../lib/geometry'
import { useBoardStore } from '../../store/useBoardStore'
import { BoardDefs, CourtLayer } from './CourtLayer'
import { DrawingLayer, DrawingShape } from './DrawingLayer'
import { MovementLayer, MovementShape } from './MovementLayer'
import { ShotLayer, ShotShape } from './ShotLayer'
import { BallLayer } from './BallLayer'
import { CharacterLayer } from './CharacterLayer'
import { TextLayer } from './TextLayer'
import { SelectionOverlay } from './SelectionOverlay'
import { TextInputDialog } from '../TextInputDialog'

type Gesture =
  | { kind: 'pinch'; startDist: number; startZoom: number; startMid: Point; startPan: Point }
  | { kind: 'move'; ref: SelectionRef; last: Point }
  | { kind: 'endpoint'; ref: SelectionRef; which: 'start' | 'end' }
  // `last` はドラッグ中に毎回 pointermove 側で直接書き換える「最後に成功した終点」。
  // React の state（draft）越しに読むと、同期的に立て続けにイベントが来たときに
  // 再レンダーがまだ反映されておらず古い値を掴んでしまうことがあるため、
  // ref（gestureRef.current 自体）に直接持たせて常に最新値を参照できるようにする。
  | { kind: 'shot'; start: Point; last: Point }
  | { kind: 'movement'; start: Point; characterId: string; last: Point }
  | { kind: 'draw'; drawing: Omit<Drawing, 'id'> }
  | { kind: 'erase' }

/** ドラッグ中のプレビュー（確定前の見た目） */
type Draft =
  | { kind: 'shot'; start: Point; end: Point }
  | { kind: 'movement'; start: Point; end: Point; characterId: string }
  | { kind: 'draw'; drawing: Omit<Drawing, 'id'> }

const DRAG_THRESHOLD = 0.02

const DRAW_TOOLS: DrawingType[] = ['pen', 'arrow', 'line', 'circle', 'rectangle']

/**
 * 実機（特にSafari）でしか再現しない座標バグの調査用。
 * URL に `?debug` を付けたときだけ、画面上部にポインタ座標の生ログを
 * 表示する。通常利用には一切影響しない。
 */
const DEBUG_TOUCH =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('debug')

export function BoardCanvas({ svgRef }: { svgRef: RefObject<SVGSVGElement> }) {
  const scene = useBoardStore((s) => s.scene)
  const tool = useBoardStore((s) => s.tool)
  const view = useBoardStore((s) => s.view)
  const selection = useBoardStore((s) => s.selection)

  const pointersRef = useRef(new Map<number, { x: number; y: number }>())
  const gestureRef = useRef<Gesture | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [textDialog, setTextDialog] = useState<{ point: Point; value: string; id?: string } | null>(
    null,
  )
  const [debugLog, setDebugLog] = useState<string[]>([])
  // clientToBoard は後で定義するため、ref 経由で参照する
  const clientToBoardRef = useRef<((x: number, y: number) => Point | null) | null>(null)

  const logDebug = useCallback(
    (label: string, e: { pointerId: number; pointerType: string; isPrimary: boolean; clientX: number; clientY: number }) => {
      if (!DEBUG_TOUCH) return
      const svg = svgRef.current
      const rect = svg?.getBoundingClientRect()
      const board = clientToBoardRef.current?.(e.clientX, e.clientY)
      const vv = window.visualViewport
      const line =
        `${label} id=${e.pointerId} type=${e.pointerType} primary=${e.isPrimary} ` +
        `client=(${e.clientX.toFixed(1)},${e.clientY.toFixed(1)}) ` +
        `rect=${rect ? `${rect.width.toFixed(1)}x${rect.height.toFixed(1)}@(${rect.left.toFixed(1)},${rect.top.toFixed(1)})` : 'null'} ` +
        `board=${board ? `(${board.x.toFixed(3)},${board.y.toFixed(3)})` : 'NULL!'} ` +
        `pointers=${pointersRef.current.size} ` +
        `vv=${vv ? `scale=${vv.scale.toFixed(2)} off=(${vv.offsetLeft.toFixed(1)},${vv.offsetTop.toFixed(1)})` : 'n/a'}`
      setDebugLog((prev) => [...prev.slice(-24), line])
    },
    [svgRef],
  )

  const interactive = tool === 'select' || tool === 'eraser'

  /**
   * クライアント座標 → viewBox 座標。
   *
   * 以前は `getScreenCTM()` を使っていたが、一部のモバイルブラウザでは
   * レイアウト直後などに一時的に null を返すことがあり、その際の
   * フォールバック（0,0）に座標が飛ぶことで「配球を押すと左上にカーソルが
   * 行ってしまう」ような不具合につながっていた。
   * `getBoundingClientRect()` に変更した後も、レイアウトが確定する前の
   * ごく短い間は `rect` のサイズが 0 になり得るため、そのケースでは
   * 「(0,0) 扱いにする」のではなく `null` を返す。呼び出し側は null の
   * ときはその座標を一切使わず、その回のポインタ操作を無視する
   * （＝誤った位置で確定させるより、その一瞬だけ操作を取りこぼす方が安全）。
   */
  const clientToView = useCallback(
    (clientX: number, clientY: number): Point | null => {
      const svg = svgRef.current
      if (!svg) return null
      const rect = svg.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) return null
      const scale = Math.min(rect.width / BOARD_W, rect.height / BOARD_H)
      const offsetX = (rect.width - BOARD_W * scale) / 2
      const offsetY = (rect.height - BOARD_H * scale) / 2
      return {
        x: (clientX - rect.left - offsetX) / scale,
        y: (clientY - rect.top - offsetY) / scale,
      }
    },
    [svgRef],
  )

  /** クライアント座標 → 正規化座標（ズーム／パンを考慮） */
  const clientToBoard = useCallback(
    (clientX: number, clientY: number): Point | null => {
      const v = clientToView(clientX, clientY)
      if (!v) return null
      const { zoom, panX, panY } = useBoardStore.getState().view
      return { x: (v.x - panX) / zoom / BOARD_W, y: (v.y - panY) / zoom / BOARD_H }
    },
    [clientToView],
  )
  clientToBoardRef.current = clientToBoard

  const findCharacterNear = useCallback((p: Point): string => {
    const { scene: current } = useBoardStore.getState()
    const target = toUnits(p)
    let best = ''
    let bestDist = SIZES.characterRadius * 1.4
    for (const c of current.characters) {
      const u = toUnits(c)
      const d = Math.hypot(u.x - target.x, u.y - target.y)
      if (d < bestDist) {
        bestDist = d
        best = c.id
      }
    }
    return best
  }, [])

  const refFromElement = (el: Element | null): SelectionRef | null => {
    const node = el?.closest('[data-id]')
    if (!node) return null
    const id = node.getAttribute('data-id')
    const type = node.getAttribute('data-type')
    if (!id || !type) return null
    return { type: type as SelectionRef['type'], id }
  }

  const startPinch = useCallback(() => {
    const pts = [...pointersRef.current.values()]
    if (pts.length < 2) return
    const a = clientToView(pts[0].x, pts[0].y)
    const b = clientToView(pts[1].x, pts[1].y)
    if (!a || !b) return
    const state = useBoardStore.getState()
    gestureRef.current = {
      kind: 'pinch',
      startDist: Math.hypot(b.x - a.x, b.y - a.y) || 1,
      startZoom: state.view.zoom,
      startMid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      startPan: { x: state.view.panX, y: state.view.panY },
    }
    setDraft(null)
  }, [clientToView])

  const handlePointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current
    if (!svg) return
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    svg.setPointerCapture(e.pointerId)
    logDebug('down', e)

    if (pointersRef.current.size === 2) {
      startPinch()
      return
    }
    if (pointersRef.current.size > 2) return

    // 盤面（コート）自体はドラッグでは動かさない仕様のため、中ボタン／Alt
    // ドラッグでのパンは行わない（無視する）
    if (e.button === 1) return

    const boardPointRaw = clientToBoard(e.clientX, e.clientY)
    // 座標変換がまだできない場合（レイアウト確定前など）はこの操作を無視する。
    // (0,0) 等にフォールバックさせないことで「左上に飛ぶ」不具合を防ぐ。
    if (!boardPointRaw) return
    const boardPoint = clampPoint(boardPointRaw)

    const state = useBoardStore.getState()

    if (state.tool === 'select') {
      const handle = (e.target as Element).closest('[data-handle]')
      if (handle && state.selection) {
        state.pushHistory()
        gestureRef.current = {
          kind: 'endpoint',
          ref: state.selection,
          which: handle.getAttribute('data-handle') as 'start' | 'end',
        }
        return
      }
      const ref = refFromElement(e.target as Element)
      if (ref) {
        state.setSelection(ref)
        state.pushHistory()
        gestureRef.current = { kind: 'move', ref, last: boardPoint }
      } else {
        state.setSelection(null)
      }
      return
    }

    if (state.tool === 'eraser') {
      const ref = refFromElement(e.target as Element)
      if (ref) state.deleteObject(ref)
      gestureRef.current = { kind: 'erase' }
      return
    }

    if (state.tool === 'character') {
      if (!state.pendingCharacterId) {
        state.setNotice('先に一覧からキャラクターを選んでください')
        return
      }
      state.addCharacter(state.pendingCharacterId, boardPoint)
      return
    }

    if (state.tool === 'shot') {
      gestureRef.current = { kind: 'shot', start: boardPoint, last: boardPoint }
      setDraft({ kind: 'shot', start: boardPoint, end: boardPoint })
      return
    }

    if (state.tool === 'movement') {
      const characterId = findCharacterNear(boardPoint)
      const start = characterId
        ? (() => {
            const c = state.scene.characters.find((x) => x.id === characterId)!
            return { x: c.x, y: c.y }
          })()
        : boardPoint
      gestureRef.current = { kind: 'movement', start, characterId, last: start }
      setDraft({ kind: 'movement', start, end: start, characterId })
      return
    }

    if (state.tool === 'text') {
      setTextDialog({ point: boardPoint, value: '' })
      return
    }

    if (DRAW_TOOLS.includes(state.tool as DrawingType)) {
      const type = state.tool as DrawingType
      const isHighlight = false
      const drawing = makeDrawing(type, boardPoint, isHighlight)
      gestureRef.current = { kind: 'draw', drawing }
      setDraft({ kind: 'draw', drawing })
      return
    }

    if (state.tool === 'highlight') {
      const drawing = makeDrawing('pen', boardPoint, true)
      gestureRef.current = { kind: 'draw', drawing }
      setDraft({ kind: 'draw', drawing })
    }
  }

  const handlePointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!pointersRef.current.has(e.pointerId)) return
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const gesture = gestureRef.current
    logDebug(`move gesture=${gesture?.kind ?? 'none'}`, e)
    if (!gesture) return
    const state = useBoardStore.getState()

    if (gesture.kind === 'pinch') {
      const pts = [...pointersRef.current.values()]
      if (pts.length < 2) return
      const a = clientToView(pts[0].x, pts[0].y)
      const b = clientToView(pts[1].x, pts[1].y)
      if (!a || !b) return
      const d = Math.hypot(b.x - a.x, b.y - a.y) || 1
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      const zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, (gesture.startZoom * d) / gesture.startDist))
      const bx = (gesture.startMid.x - gesture.startPan.x) / gesture.startZoom
      const by = (gesture.startMid.y - gesture.startPan.y) / gesture.startZoom
      state.setView({ zoom, panX: mid.x - bx * zoom, panY: mid.y - by * zoom })
      return
    }

    const boardPointRaw = clientToBoard(e.clientX, e.clientY)
    // 変換できない一瞬だけ移動を無視する（直前の描画状態をそのまま保持する）
    if (!boardPointRaw) return
    const boardPoint = clampPoint(boardPointRaw)

    if (gesture.kind === 'move') {
      state.translateObject(gesture.ref, boardPoint.x - gesture.last.x, boardPoint.y - gesture.last.y)
      gesture.last = boardPoint
      return
    }

    if (gesture.kind === 'endpoint') {
      state.setEndpoint(gesture.ref, gesture.which, boardPoint)
      return
    }

    if (gesture.kind === 'erase') {
      const el = document.elementFromPoint(e.clientX, e.clientY)
      const ref = refFromElement(el)
      if (ref) state.deleteObject(ref)
      return
    }

    if (gesture.kind === 'shot') {
      // ref を直接書き換える（React の再レンダーを待たない）。
      // pointerup/pointercancel がこの直後に同期的に来ても、確定処理は
      // このステートではなく gesture.last（ref側）を見るので取りこぼさない。
      gesture.last = boardPoint
      setDraft({ kind: 'shot', start: gesture.start, end: boardPoint })
      return
    }

    if (gesture.kind === 'movement') {
      gesture.last = boardPoint
      setDraft({
        kind: 'movement',
        start: gesture.start,
        end: boardPoint,
        characterId: gesture.characterId,
      })
      return
    }

    if (gesture.kind === 'draw') {
      const d = gesture.drawing
      if (d.type === 'pen') {
        const last = d.points[d.points.length - 1]
        if (dist(last, boardPoint) > 0.004) d.points.push(boardPoint)
      } else {
        d.points[1] = boardPoint
      }
      setDraft({ kind: 'draw', drawing: { ...d, points: [...d.points] } })
    }
  }

  /**
   * ドラッグ確定処理の共通部分。
   *
   * `endRaw` に「そのポインタイベント自身の座標から計算した終点」を渡すか、
   * `null`（＝使わない）を渡すかは呼び出し側が決める。pointercancel は
   * 渡さない ―― 一部のブラウザ（特にSafari）は pointercancel の
   * clientX/clientY を 0 で送ってくることがあり、そのまま使うと
   * 「盤面の左上に矢印が飛ぶ」不具合になるため。その場合は代わりに
   * 直前まで pointermove で更新し続けていた `gesture.last`（ref）を使う。
   *
   * 注意: フォールバック先は React の state（draft）ではなく gesture.last
   * にすること。pointerdown → pointermove → pointerup/cancel が実ブラウザの
   * イベントループを介さず同期的に立て続けに発生するケース（Safari の
   * ジェスチャー割り込みなど）では、setDraft による再レンダーがまだ
   * 反映されておらず、draft を読むと1つ前の（古い）値を掴んでしまう。
   * gestureRef.current 自体に直接書き込む last は常に最新なので安全。
   */
  const commitGesture = (gesture: Gesture, endRaw: Point | null) => {
    const state = useBoardStore.getState()
    if (gesture.kind === 'shot' || gesture.kind === 'movement') {
      const end = clampPoint(endRaw ?? gesture.last)
      if (DEBUG_TOUCH) {
        setDebugLog((prev) => [
          ...prev.slice(-24),
          `  -> commit end=${endRaw ? 'event' : 'fallback'} start=(${gesture.start.x.toFixed(3)},${gesture.start.y.toFixed(3)}) end=(${end.x.toFixed(3)},${end.y.toFixed(3)})`,
        ])
      }
      if (dist(gesture.start, end) >= DRAG_THRESHOLD) {
        if (gesture.kind === 'shot') {
          const s = state.shotSettings
          state.addShot({ start: gesture.start, end, type: s.type, power: s.power, curve: s.curve })
        } else {
          state.addMovement({ start: gesture.start, end, characterId: gesture.characterId })
        }
      }
    }

    if (gesture.kind === 'draw') {
      const d = gesture.drawing
      const valid =
        d.type === 'pen'
          ? d.points.length > 1
          : d.points.length > 1 && dist(d.points[0], d.points[1]) >= 0.008
      if (valid) state.addDrawing(d)
    }
  }

  /** pointerup: 指を離した位置を、成功すれば使う */
  const finishGesture = (e: ReactPointerEvent<SVGSVGElement>) => {
    logDebug(`up gesture=${gestureRef.current?.kind ?? 'none'}`, e)
    pointersRef.current.delete(e.pointerId)
    const gesture = gestureRef.current
    if (gesture) commitGesture(gesture, clientToBoard(e.clientX, e.clientY))
    if (pointersRef.current.size < 2) {
      gestureRef.current = null
      setDraft(null)
    }
  }

  /**
   * pointercancel: OSのジェスチャー（長押しコールアウト・エッジスワイプ等）
   * に割り込まれた場合。イベント自体の座標は信用せず、直前のプレビュー
   * 位置（フォールバック）で確定させる。
   */
  const cancelGesture = (e: ReactPointerEvent<SVGSVGElement>) => {
    logDebug(`cancel gesture=${gestureRef.current?.kind ?? 'none'}`, e)
    pointersRef.current.delete(e.pointerId)
    const gesture = gestureRef.current
    if (gesture) commitGesture(gesture, null)
    if (pointersRef.current.size < 2) {
      gestureRef.current = null
      setDraft(null)
    }
  }

  const handleDoubleClick = (e: ReactMouseEvent<SVGSVGElement>) => {
    const state = useBoardStore.getState()
    if (state.tool !== 'select') return
    const ref = refFromElement(e.target as Element)
    if (ref?.type === 'text') {
      const item = state.scene.texts.find((t) => t.id === ref.id)
      if (item) setTextDialog({ point: { x: item.x, y: item.y }, value: item.text, id: item.id })
    }
  }

  const transform = `translate(${view.panX} ${view.panY}) scale(${view.zoom})`

  return (
    <div className="relative h-full w-full">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${BOARD_W} ${BOARD_H}`}
        preserveAspectRatio="xMidYMid meet"
        className="board-surface h-full w-full"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishGesture}
        onPointerCancel={cancelGesture}
        onDoubleClick={handleDoubleClick}
      >
        <BoardDefs />
        <g id="board-content" transform={transform} style={{ pointerEvents: interactive ? 'auto' : 'none' }}>
          <CourtLayer />
          <DrawingLayer drawings={scene.drawings} interactive={interactive} />
          <MovementLayer movements={scene.movements} interactive={interactive} />
          <ShotLayer shots={scene.shots} interactive={interactive} />
          <BallLayer balls={scene.balls} interactive={interactive} />
          <CharacterLayer characters={scene.characters} interactive={interactive} />
          <TextLayer texts={scene.texts} interactive={interactive} />
        </g>
        <g id="board-overlay" transform={transform} pointerEvents="none">
          <DraftShapes draft={draft} />
          <SelectionOverlay scene={scene} selection={selection} zoom={view.zoom} />
        </g>
      </svg>

      <ZoomControls />

      {DEBUG_TOUCH && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-50 max-h-[45%] overflow-y-auto bg-black/85 p-2 font-mono text-[9px] leading-tight text-lime-300">
          <div className="pointer-events-auto mb-1 flex gap-2">
            <button
              type="button"
              className="rounded bg-white/20 px-2 py-0.5 text-white"
              onClick={() => setDebugLog([])}
            >
              クリア
            </button>
            <button
              type="button"
              className="rounded bg-white/20 px-2 py-0.5 text-white"
              onClick={() => {
                const text = debugLog.join('\n')
                if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).catch(() => undefined)
              }}
            >
              コピー
            </button>
          </div>
          {debugLog.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      )}

      {textDialog && (
        <TextInputDialog
          initialValue={textDialog.value}
          onCancel={() => setTextDialog(null)}
          onSubmit={(value) => {
            const state = useBoardStore.getState()
            const trimmed = value.trim()
            if (textDialog.id) {
              if (!trimmed) {
                state.deleteObject({ type: 'text', id: textDialog.id })
              } else {
                state.pushHistory()
                state.updateText(textDialog.id, { text: trimmed })
              }
            } else if (trimmed) {
              state.addText({
                text: trimmed,
                x: textDialog.point.x,
                y: textDialog.point.y,
                fontSize: state.textSettings.fontSize,
                color: state.textSettings.color,
              })
            }
            setTextDialog(null)
          }}
        />
      )}
    </div>
  )
}

function DraftShapes({ draft }: { draft: Draft | null }) {
  const shotSettings = useBoardStore((s) => s.shotSettings)
  if (!draft) return null
  if (draft.kind === 'shot') {
    return (
      <ShotShape
        preview
        shot={{
          start: draft.start,
          end: draft.end,
          type: shotSettings.type,
          power: shotSettings.power,
          curve: shotSettings.curve,
        }}
      />
    )
  }
  if (draft.kind === 'movement') {
    return (
      <MovementShape
        preview
        movement={{ start: draft.start, end: draft.end, characterId: draft.characterId }}
      />
    )
  }
  if (draft.kind === 'draw') {
    return <DrawingShape preview drawing={draft.drawing} />
  }
  return null
}

function ZoomControls() {
  const zoom = useBoardStore((s) => s.view.zoom)
  const zoomAt = useBoardStore((s) => s.zoomAt)
  const resetView = useBoardStore((s) => s.resetView)
  const center = { x: BOARD_W / 2, y: BOARD_H / 2 }

  const btn =
    'flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900/80 text-lg font-bold text-white shadow ring-1 ring-white/20 active:scale-95'

  return (
    <div className="pointer-events-none absolute bottom-3 right-3 flex flex-col items-end gap-2">
      <div className="pointer-events-auto flex flex-col gap-2">
        <button type="button" className={btn} onClick={() => zoomAt(1.25, center.x, center.y)} aria-label="拡大">
          ＋
        </button>
        <button type="button" className={btn} onClick={() => zoomAt(0.8, center.x, center.y)} aria-label="縮小">
          －
        </button>
        <button
          type="button"
          className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900/80 text-[10px] font-bold text-white shadow ring-1 ring-white/20 active:scale-95"
          onClick={resetView}
          aria-label="表示をリセット"
        >
          {Math.round(zoom * 100)}%
        </button>
      </div>
    </div>
  )
}

function makeDrawing(type: DrawingType, start: Point, highlight: boolean): Omit<Drawing, 'id'> {
  const { penSettings } = useBoardStore.getState()
  const width = highlight ? SIZES.highlightWidth[penSettings.width] : SIZES.penWidth[penSettings.width]
  return {
    type,
    points: type === 'pen' ? [start] : [start, start],
    color: highlight ? penSettings.highlightColor : penSettings.color,
    width,
    opacity: highlight ? 0.42 : 1,
  }
}
