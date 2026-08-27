import { useCallback, useEffect, useRef, useState } from 'react'
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
  | { kind: 'pan'; lastX: number; lastY: number }
  | { kind: 'pinch'; startDist: number; startZoom: number; startMid: Point; startPan: Point }
  | { kind: 'move'; ref: SelectionRef; last: Point }
  | { kind: 'endpoint'; ref: SelectionRef; which: 'start' | 'end' }
  | { kind: 'shot'; start: Point }
  | { kind: 'movement'; start: Point; characterId: string }
  | { kind: 'draw'; drawing: Omit<Drawing, 'id'> }
  | { kind: 'erase' }

/** ドラッグ中のプレビュー（確定前の見た目） */
type Draft =
  | { kind: 'shot'; start: Point; end: Point }
  | { kind: 'movement'; start: Point; end: Point; characterId: string }
  | { kind: 'draw'; drawing: Omit<Drawing, 'id'> }

const DRAG_THRESHOLD = 0.02

const DRAW_TOOLS: DrawingType[] = ['pen', 'arrow', 'line', 'circle', 'rectangle']

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

  const interactive = tool === 'select' || tool === 'eraser'

  /** クライアント座標 → viewBox 座標 */
  const clientToView = useCallback(
    (clientX: number, clientY: number): Point => {
      const svg = svgRef.current
      if (!svg) return { x: 0, y: 0 }
      const ctm = svg.getScreenCTM()
      if (!ctm) return { x: 0, y: 0 }
      const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse())
      return { x: p.x, y: p.y }
    },
    [svgRef],
  )

  /** クライアント座標 → 正規化座標（ズーム／パンを考慮） */
  const clientToBoard = useCallback(
    (clientX: number, clientY: number): Point => {
      const v = clientToView(clientX, clientY)
      const { zoom, panX, panY } = useBoardStore.getState().view
      return { x: (v.x - panX) / zoom / BOARD_W, y: (v.y - panY) / zoom / BOARD_H }
    },
    [clientToView],
  )

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

    if (pointersRef.current.size === 2) {
      startPinch()
      return
    }
    if (pointersRef.current.size > 2) return

    const state = useBoardStore.getState()
    const boardPoint = clampPoint(clientToBoard(e.clientX, e.clientY))

    // 中ボタン／Alt ドラッグはいつでもパン
    if (e.button === 1 || e.altKey) {
      gestureRef.current = { kind: 'pan', lastX: e.clientX, lastY: e.clientY }
      return
    }

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
        gestureRef.current = { kind: 'pan', lastX: e.clientX, lastY: e.clientY }
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

    if (state.tool === 'ball') {
      state.addBall(boardPoint)
      return
    }

    if (state.tool === 'shot') {
      gestureRef.current = { kind: 'shot', start: boardPoint }
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
      gestureRef.current = { kind: 'movement', start, characterId }
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
    if (!gesture) return
    const state = useBoardStore.getState()

    if (gesture.kind === 'pinch') {
      const pts = [...pointersRef.current.values()]
      if (pts.length < 2) return
      const a = clientToView(pts[0].x, pts[0].y)
      const b = clientToView(pts[1].x, pts[1].y)
      const d = Math.hypot(b.x - a.x, b.y - a.y) || 1
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      const zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, (gesture.startZoom * d) / gesture.startDist))
      const bx = (gesture.startMid.x - gesture.startPan.x) / gesture.startZoom
      const by = (gesture.startMid.y - gesture.startPan.y) / gesture.startZoom
      state.setView({ zoom, panX: mid.x - bx * zoom, panY: mid.y - by * zoom })
      return
    }

    if (gesture.kind === 'pan') {
      const prev = clientToView(gesture.lastX, gesture.lastY)
      const now = clientToView(e.clientX, e.clientY)
      state.setView({
        panX: state.view.panX + (now.x - prev.x),
        panY: state.view.panY + (now.y - prev.y),
      })
      gesture.lastX = e.clientX
      gesture.lastY = e.clientY
      return
    }

    const boardPoint = clampPoint(clientToBoard(e.clientX, e.clientY))

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
      setDraft({ kind: 'shot', start: gesture.start, end: boardPoint })
      return
    }

    if (gesture.kind === 'movement') {
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

  const finishGesture = (e: ReactPointerEvent<SVGSVGElement>) => {
    pointersRef.current.delete(e.pointerId)
    const gesture = gestureRef.current
    const state = useBoardStore.getState()

    if (gesture && (gesture.kind === 'shot' || gesture.kind === 'movement')) {
      const end = clampPoint(clientToBoard(e.clientX, e.clientY))
      if (dist(gesture.start, end) >= DRAG_THRESHOLD) {
        if (gesture.kind === 'shot') {
          const s = state.shotSettings
          state.addShot({ start: gesture.start, end, type: s.type, power: s.power, curve: s.curve })
        } else {
          state.addMovement({ start: gesture.start, end, characterId: gesture.characterId })
        }
      }
    }

    if (gesture && gesture.kind === 'draw') {
      const d = gesture.drawing
      const valid =
        d.type === 'pen'
          ? d.points.length > 1
          : d.points.length > 1 && dist(d.points[0], d.points[1]) >= 0.008
      if (valid) state.addDrawing(d)
    }

    if (pointersRef.current.size < 2) {
      gestureRef.current = null
      setDraft(null)
    }
    if (pointersRef.current.size === 1 && gesture?.kind === 'pinch') {
      const [only] = [...pointersRef.current.values()]
      gestureRef.current = { kind: 'pan', lastX: only.x, lastY: only.y }
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

  // ホイールでのズーム（passive:false で登録する必要があるため手動で addEventListener）
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const v = clientToView(e.clientX, e.clientY)
      useBoardStore.getState().zoomAt(Math.exp(-e.deltaY * 0.0016), v.x, v.y)
    }
    svg.addEventListener('wheel', onWheel, { passive: false })
    return () => svg.removeEventListener('wheel', onWheel)
  }, [clientToView, svgRef])

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
        onPointerCancel={finishGesture}
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
