import type { Movement } from '../../types'
import { SIZES, toUnits } from '../../lib/board'
import { arrowHeadPoints, trimEnd } from '../../lib/geometry'

export const MOVEMENT_COLOR = '#0f172a'

interface Props {
  movement: Omit<Movement, 'id'>
  id?: string
  interactive?: boolean
  preview?: boolean
}

/**
 * 移動矢印。配球（実線＋色）と区別できるよう、
 * 破線＋白フチ＋抜きの矢じりで描く。
 */
export function MovementShape({ movement, id, interactive, preview }: Props) {
  const start = toUnits(movement.start)
  const end = toUnits(movement.end)
  const w = SIZES.movementWidth
  const arrow = SIZES.movementArrow
  const shaftEnd = trimEnd(start, end, arrow * 0.7)

  return (
    <g
      data-id={id}
      data-type={id ? 'movement' : undefined}
      opacity={preview ? 0.85 : 1}
      style={interactive ? { cursor: 'move' } : undefined}
    >
      {interactive && (
        <line
          x1={start.x}
          y1={start.y}
          x2={end.x}
          y2={end.y}
          stroke="rgba(0,0,0,0)"
          strokeWidth={w + 34}
          pointerEvents="stroke"
        />
      )}
      <line
        x1={start.x}
        y1={start.y}
        x2={shaftEnd.x}
        y2={shaftEnd.y}
        stroke="#ffffff"
        strokeWidth={w + 8}
        strokeLinecap="round"
      />
      <line
        x1={start.x}
        y1={start.y}
        x2={shaftEnd.x}
        y2={shaftEnd.y}
        stroke={MOVEMENT_COLOR}
        strokeWidth={w}
        strokeLinecap="round"
        strokeDasharray={`${w * 2.4} ${w * 1.8}`}
      />
      <polygon
        points={arrowHeadPoints(end, start, arrow)}
        fill="#ffffff"
        stroke={MOVEMENT_COLOR}
        strokeWidth={w * 0.8}
        strokeLinejoin="round"
      />
    </g>
  )
}

export function MovementLayer({
  movements,
  interactive,
}: {
  movements: Movement[]
  interactive: boolean
}) {
  return (
    <g data-layer="movement">
      {movements.map((mv) => (
        <MovementShape key={mv.id} id={mv.id} movement={mv} interactive={interactive} />
      ))}
    </g>
  )
}
