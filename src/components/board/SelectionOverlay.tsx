import type { Scene, SelectionRef } from '../../types'
import { SIZES, toUnits } from '../../lib/board'
import { drawingBox, pointBox, segmentBox, shotBox, textBox } from '../../lib/geometry'

interface Props {
  scene: Scene
  selection: SelectionRef | null
  zoom: number
}

/**
 * 選択中オブジェクトの枠と、配球・移動矢印の端点ハンドル。
 * PNG 出力時にはこのレイヤーごと取り除かれます。
 */
export function SelectionOverlay({ scene, selection, zoom }: Props) {
  if (!selection) return null
  const strokeWidth = 5 / zoom
  const handleR = 20 / Math.max(0.8, zoom)

  let box: { x: number; y: number; width: number; height: number } | null = null
  let handles: { which: 'start' | 'end'; x: number; y: number }[] = []

  if (selection.type === 'character') {
    const c = scene.characters.find((o) => o.id === selection.id)
    if (c) box = pointBox(c, SIZES.characterRadius + 10)
  } else if (selection.type === 'ball') {
    const b = scene.balls.find((o) => o.id === selection.id)
    if (b) box = pointBox(b, SIZES.ballRadius + 14)
  } else if (selection.type === 'shot') {
    const s = scene.shots.find((o) => o.id === selection.id)
    if (s) {
      box = shotBox(s)
      const su = toUnits(s.start)
      const eu = toUnits(s.end)
      handles = [
        { which: 'start', x: su.x, y: su.y },
        { which: 'end', x: eu.x, y: eu.y },
      ]
    }
  } else if (selection.type === 'movement') {
    const m = scene.movements.find((o) => o.id === selection.id)
    if (m) {
      box = segmentBox(m.start, m.end, SIZES.movementArrow)
      const su = toUnits(m.start)
      const eu = toUnits(m.end)
      handles = [
        { which: 'start', x: su.x, y: su.y },
        { which: 'end', x: eu.x, y: eu.y },
      ]
    }
  } else if (selection.type === 'drawing') {
    const d = scene.drawings.find((o) => o.id === selection.id)
    if (d) box = drawingBox(d)
  } else if (selection.type === 'text') {
    const t = scene.texts.find((o) => o.id === selection.id)
    if (t) box = textBox(t)
  }

  if (!box) return null

  return (
    <g data-layer="selection">
      <rect
        x={box.x}
        y={box.y}
        width={Math.max(box.width, 4)}
        height={Math.max(box.height, 4)}
        fill="none"
        stroke="#facc15"
        strokeWidth={strokeWidth}
        strokeDasharray={`${14 / zoom} ${10 / zoom}`}
        rx={10 / zoom}
      />
      {handles.map((h) => (
        <circle
          key={h.which}
          data-handle={h.which}
          cx={h.x}
          cy={h.y}
          r={handleR}
          fill="#facc15"
          stroke="#0f172a"
          strokeWidth={strokeWidth}
          pointerEvents="all"
          style={{ cursor: 'grab' }}
        />
      ))}
    </g>
  )
}
