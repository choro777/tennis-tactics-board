import type { Point } from '../types'

/**
 * コートの実寸（メートル）。
 * ここを変えればコート全体の比率が変わります。
 */
export const COURT_M = {
  doublesWidth: 10.97,
  singlesWidth: 8.23,
  length: 23.77,
  /** ネットからサービスラインまで */
  serviceFromNet: 6.4,
  /** サイドラインの外側にとる余白 */
  marginSide: 2.6,
  /** ベースラインの外側にとる余白（ここに選手が下がれる） */
  marginEnd: 3.4,
} as const

/** 盤面の内部座標系（正規化座標 0〜1 を掛けるとこの単位になる） */
export const BOARD_W = 1000
export const U_PER_M = BOARD_W / (COURT_M.doublesWidth + COURT_M.marginSide * 2)
export const BOARD_H = Math.round((COURT_M.length + COURT_M.marginEnd * 2) * U_PER_M)
export const BOARD_ASPECT = BOARD_H / BOARD_W

/** メートル → 盤面ユニット */
export const m2u = (m: number) => m * U_PER_M

/** コート矩形（ダブルスサイドラインの外周） */
export const COURT_RECT = {
  left: m2u(COURT_M.marginSide),
  right: m2u(COURT_M.marginSide + COURT_M.doublesWidth),
  top: m2u(COURT_M.marginEnd),
  bottom: m2u(COURT_M.marginEnd + COURT_M.length),
}
export const COURT_CENTER_X = (COURT_RECT.left + COURT_RECT.right) / 2
export const NET_Y = (COURT_RECT.top + COURT_RECT.bottom) / 2

export const SINGLES_LEFT = COURT_CENTER_X - m2u(COURT_M.singlesWidth / 2)
export const SINGLES_RIGHT = COURT_CENTER_X + m2u(COURT_M.singlesWidth / 2)
export const SERVICE_TOP_Y = NET_Y - m2u(COURT_M.serviceFromNet)
export const SERVICE_BOTTOM_Y = NET_Y + m2u(COURT_M.serviceFromNet)

/** 見た目のサイズ（盤面ユニット） */
export const SIZES = {
  courtLine: 5,
  characterRadius: 46,
  ballRadius: 15,
  shotWidth: { weak: 9, strong: 17 },
  shotArrow: { weak: 30, strong: 44 },
  movementWidth: 9,
  movementArrow: 36,
  penWidth: { thin: 7, medium: 14, thick: 24 },
  highlightWidth: { thin: 28, medium: 44, thick: 66 },
  textSize: { small: 34, medium: 46, large: 64 },
} as const

/** 正規化座標 → 盤面ユニット */
export const toUnits = (p: Point): Point => ({ x: p.x * BOARD_W, y: p.y * BOARD_H })

/** 盤面ユニット → 正規化座標 */
export const toNorm = (x: number, y: number): Point => ({ x: x / BOARD_W, y: y / BOARD_H })

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)

export const clampPoint = (p: Point): Point => ({ x: clamp01(p.x), y: clamp01(p.y) })

/** y 座標（正規化）から所属サイドを推測する。下半分＝自分 / 上半分＝相手 */
export const sideFromY = (y: number): 'self' | 'opponent' =>
  y * BOARD_H >= NET_Y ? 'self' : 'opponent'

export interface CourtLine {
  key: string
  x1: number
  y1: number
  x2: number
  y2: number
  width?: number
}

/** コートのライン一覧（盤面ユニット） */
export const COURT_LINES: CourtLine[] = [
  // ダブルスサイドライン
  { key: 'doubles-l', x1: COURT_RECT.left, y1: COURT_RECT.top, x2: COURT_RECT.left, y2: COURT_RECT.bottom },
  { key: 'doubles-r', x1: COURT_RECT.right, y1: COURT_RECT.top, x2: COURT_RECT.right, y2: COURT_RECT.bottom },
  // シングルスサイドライン
  { key: 'singles-l', x1: SINGLES_LEFT, y1: COURT_RECT.top, x2: SINGLES_LEFT, y2: COURT_RECT.bottom },
  { key: 'singles-r', x1: SINGLES_RIGHT, y1: COURT_RECT.top, x2: SINGLES_RIGHT, y2: COURT_RECT.bottom },
  // ベースライン
  { key: 'base-top', x1: COURT_RECT.left, y1: COURT_RECT.top, x2: COURT_RECT.right, y2: COURT_RECT.top },
  { key: 'base-bottom', x1: COURT_RECT.left, y1: COURT_RECT.bottom, x2: COURT_RECT.right, y2: COURT_RECT.bottom },
  // サービスライン（シングルスサイドライン間）
  { key: 'service-top', x1: SINGLES_LEFT, y1: SERVICE_TOP_Y, x2: SINGLES_RIGHT, y2: SERVICE_TOP_Y },
  { key: 'service-bottom', x1: SINGLES_LEFT, y1: SERVICE_BOTTOM_Y, x2: SINGLES_RIGHT, y2: SERVICE_BOTTOM_Y },
  // センターサービスライン
  { key: 'center-service', x1: COURT_CENTER_X, y1: SERVICE_TOP_Y, x2: COURT_CENTER_X, y2: SERVICE_BOTTOM_Y },
  // センターマーク
  { key: 'center-mark-top', x1: COURT_CENTER_X, y1: COURT_RECT.top, x2: COURT_CENTER_X, y2: COURT_RECT.top + m2u(0.3) },
  {
    key: 'center-mark-bottom',
    x1: COURT_CENTER_X,
    y1: COURT_RECT.bottom - m2u(0.3),
    x2: COURT_CENTER_X,
    y2: COURT_RECT.bottom,
  },
]

/** ズームの下限・上限 */
export const ZOOM_MIN = 0.6
export const ZOOM_MAX = 5
