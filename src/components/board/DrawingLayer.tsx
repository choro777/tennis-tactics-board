import type { Drawing } from '../../types'
import { toUnits } from '../../lib/board'
import { arrowHeadPoints, rectFrom, smoothPathD, trimEnd } from '../../lib/geometry'

interface Props {
  drawing: Omit<Drawing, 'id'>
  id?: string
  interactive?: boolean
  preview?: boolean
}

export function DrawingShape({ drawing, id, interactive, preview }: Props) {
  const pts = drawing.points.map(toUnits)
  if (pts.length === 0) return null

  const common = {
    stroke: drawing.color,
    strokeWidth: drawing.width,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  }
  const hit = interactive ? (
    <HitArea drawing={drawing} pts={pts} />
  ) : null

  let shape: import('react').ReactNode = null

  if (drawing.type === 'pen') {
    shape = <path d={smoothPathD(pts)} {...common} />
  } else if (drawing.type === 'line') {
    const [a, b] = [pts[0], pts[pts.length - 1]]
    shape = <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} {...common} />
  } else if (drawing.type === 'arrow') {
    const [a, b] = [pts[0], pts[pts.length - 1]]
    const size = Math.max(28, drawing.width * 3.2)
    const shaft = trimEnd(a, b, size * 0.6)
    shape = (
      <g>
        <line x1={a.x} y1={a.y} x2={shaft.x} y2={shaft.y} {...common} />
        <polygon points={arrowHeadPoints(b, a, size)} fill={drawing.color} />
      </g>
    )
  } else if (drawing.type === 'circle') {
    const r = rectFrom(pts[0], pts[pts.length - 1])
    shape = (
      <ellipse
        cx={r.x + r.width / 2}
        cy={r.y + r.height / 2}
        rx={Math.max(1, r.width / 2)}
        ry={Math.max(1, r.height / 2)}
        {...common}
      />
    )
  } else {
    const r = rectFrom(pts[0], pts[pts.length - 1])
    shape = <rect x={r.x} y={r.y} width={Math.max(1, r.width)} height={Math.max(1, r.height)} {...common} />
  }

  return (
    <g
      data-id={id}
      data-type={id ? 'drawing' : undefined}
      opacity={(preview ? 0.8 : 1) * drawing.opacity}
      style={interactive ? { cursor: 'move' } : undefined}
    >
      {hit}
      {shape}
    </g>
  )
}

function HitArea({ drawing, pts }: { drawing: Omit<Drawing, 'id'>; pts: { x: number; y: number }[] }) {
  const stroke = 'rgba(0,0,0,0)'
  const strokeWidth = drawing.width + 30
  if (drawing.type === 'pen') {
    return (
      <path d={smoothPathD(pts)} fill="none" stroke={stroke} strokeWidth={strokeWidth} pointerEvents="stroke" />
    )
  }
  if (drawing.type === 'line' || drawing.type === 'arrow') {
    const [a, b] = [pts[0], pts[pts.length - 1]]
    return (
      <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={stroke} strokeWidth={strokeWidth} pointerEvents="stroke" />
    )
  }
  const r = rectFrom(pts[0], pts[pts.length - 1])
  if (drawing.type === 'circle') {
    return (
      <ellipse
        cx={r.x + r.width / 2}
        cy={r.y + r.height / 2}
        rx={Math.max(1, r.width / 2)}
        ry={Math.max(1, r.height / 2)}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        pointerEvents="stroke"
      />
    )
  }
  return (
    <rect
      x={r.x}
      y={r.y}
      width={Math.max(1, r.width)}
      height={Math.max(1, r.height)}
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      pointerEvents="stroke"
    />
  )
}

export function DrawingLayer({ drawings, interactive }: { drawings: Drawing[]; interactive: boolean }) {
  return (
    <g data-layer="drawing">
      {drawings.map((d) => (
        <DrawingShape key={d.id} id={d.id} drawing={d} interactive={interactive} />
      ))}
    </g>
  )
}
