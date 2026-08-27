import type { Shot } from '../../types'
import { toUnits } from '../../lib/board'
import { arrowHeadPoints, shotPathD, shotTangentFrom } from '../../lib/geometry'
import { SHOT_COLORS, shotArrowSize, shotStrokeWidth } from '../../lib/shot'

interface ShotShapeProps {
  shot: Omit<Shot, 'id'>
  interactive?: boolean
  id?: string
  preview?: boolean
}

/** 配球1本分の描画。ドラッグ中のプレビューにも同じものを使う */
export function ShotShape({ shot, interactive, id, preview }: ShotShapeProps) {
  const start = toUnits(shot.start)
  const end = toUnits(shot.end)
  const color = SHOT_COLORS[shot.type]
  const width = shotStrokeWidth(shot.power)
  const arrow = shotArrowSize(shot.power)
  const d = shotPathD(start, end, shot.curve)
  // 矢じりと線の丸端が重なって団子にならないよう、線は少し手前で止める
  const dTrimmed = shotPathD(start, end, shot.curve, arrow * 0.55)
  const tangentFrom = shotTangentFrom(start, end, shot.curve)

  return (
    <g
      data-id={id}
      data-type={id ? 'shot' : undefined}
      opacity={preview ? 0.85 : 1}
      style={interactive ? { cursor: 'move' } : undefined}
    >
      {/* 当たり判定を広げるための透明な線 */}
      {interactive && (
        <path d={d} fill="none" stroke="rgba(0,0,0,0)" strokeWidth={width + 34} pointerEvents="stroke" />
      )}
      {/* 白い縁取りでコート上でも見やすくする */}
      <path
        d={dTrimmed}
        fill="none"
        stroke="#ffffff"
        strokeOpacity={0.85}
        strokeWidth={width + 6}
        strokeLinecap="round"
      />
      <path d={dTrimmed} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" />
      <polygon
        points={arrowHeadPoints(end, tangentFrom, arrow)}
        fill={color}
        stroke="#ffffff"
        strokeOpacity={0.85}
        strokeWidth={3}
      />
      <circle cx={start.x} cy={start.y} r={width * 0.85} fill={color} stroke="#ffffff" strokeWidth={3} />
    </g>
  )
}

export function ShotLayer({ shots, interactive }: { shots: Shot[]; interactive: boolean }) {
  return (
    <g data-layer="shot">
      {shots.map((shot) => (
        <ShotShape key={shot.id} id={shot.id} shot={shot} interactive={interactive} />
      ))}
    </g>
  )
}
