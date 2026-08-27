import {
  BOARD_H,
  BOARD_W,
  COURT_LINES,
  COURT_RECT,
  NET_Y,
  SIZES,
  m2u,
} from '../../lib/board'

const NET_HALF = m2u(0.42)
const POST = m2u(0.9)

/** 背景＋コート。オブジェクトより下に敷かれる固定レイヤー */
export function CourtLayer() {
  return (
    <g data-layer="court">
      {/* Background */}
      <rect x={0} y={0} width={BOARD_W} height={BOARD_H} fill="#1f7a4d" />
      {/* Court surface */}
      <rect
        x={COURT_RECT.left}
        y={COURT_RECT.top}
        width={COURT_RECT.right - COURT_RECT.left}
        height={COURT_RECT.bottom - COURT_RECT.top}
        fill="#2f6fb5"
      />

      {COURT_LINES.map((line) => (
        <line
          key={line.key}
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          stroke="#ffffff"
          strokeWidth={line.width ?? SIZES.courtLine}
          strokeLinecap="square"
        />
      ))}

      {/* ネット */}
      <g data-part="net">
        <rect
          x={COURT_RECT.left - POST}
          y={NET_Y - NET_HALF}
          width={COURT_RECT.right - COURT_RECT.left + POST * 2}
          height={NET_HALF * 2}
          fill="url(#netPattern)"
          stroke="#e2e8f0"
          strokeWidth={3}
        />
        <rect
          x={COURT_RECT.left - POST}
          y={NET_Y - NET_HALF}
          width={COURT_RECT.right - COURT_RECT.left + POST * 2}
          height={m2u(0.14)}
          fill="#f8fafc"
        />
        <rect x={COURT_RECT.left - POST - 6} y={NET_Y - NET_HALF - 8} width={12} height={NET_HALF * 2 + 16} fill="#e2e8f0" />
        <rect x={COURT_RECT.right + POST - 6} y={NET_Y - NET_HALF - 8} width={12} height={NET_HALF * 2 + 16} fill="#e2e8f0" />
      </g>
    </g>
  )
}

/** SVG の defs（PNG 出力でもそのまま使えるよう、盤面 SVG 内に置く） */
export function BoardDefs() {
  return (
    <defs>
      <pattern id="netPattern" width="14" height="14" patternUnits="userSpaceOnUse">
        <rect width="14" height="14" fill="#0f172a" fillOpacity="0.55" />
        <path d="M 14 0 L 0 0 0 14" fill="none" stroke="#e2e8f0" strokeOpacity="0.55" strokeWidth="2" />
      </pattern>
    </defs>
  )
}
