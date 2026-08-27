import type { Ball } from '../../types'
import { SIZES, toUnits } from '../../lib/board'

export function BallShape({ ball, id, interactive }: { ball: { x: number; y: number }; id?: string; interactive?: boolean }) {
  const u = toUnits(ball)
  const r = SIZES.ballRadius
  return (
    <g data-id={id} data-type={id ? 'ball' : undefined} style={interactive ? { cursor: 'move' } : undefined}>
      {interactive && <circle cx={u.x} cy={u.y} r={r + 16} fill="rgba(0,0,0,0)" />}
      <circle cx={u.x} cy={u.y} r={r} fill="#e3f732" stroke="#3f4a08" strokeWidth={2.5} />
      <path
        d={`M ${u.x - r} ${u.y} A ${r * 1.35} ${r * 1.35} 0 0 1 ${u.x + r} ${u.y}`}
        fill="none"
        stroke="#ffffff"
        strokeWidth={2.5}
      />
      <path
        d={`M ${u.x - r} ${u.y} A ${r * 1.35} ${r * 1.35} 0 0 0 ${u.x + r} ${u.y}`}
        fill="none"
        stroke="#ffffff"
        strokeWidth={2.5}
      />
    </g>
  )
}

export function BallLayer({ balls, interactive }: { balls: Ball[]; interactive: boolean }) {
  return (
    <g data-layer="ball">
      {balls.map((b) => (
        <BallShape key={b.id} id={b.id} ball={b} interactive={interactive} />
      ))}
    </g>
  )
}
