import type { Drawing, Point, Shot, TextItem } from '../types'
import { BOARD_H, BOARD_W, SIZES, toUnits } from './board'

export const dist = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y)

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/**
 * 配球の制御点。始点→終点に対して垂直方向へ curve に応じてずらす。
 * curve が 0 なら直線、±1 で大きく曲がる。
 */
export function shotControlPoint(start: Point, end: Point, curve: number): Point {
  const mx = (start.x + end.x) / 2
  const my = (start.y + end.y) / 2
  if (!curve) return { x: mx, y: my }
  const dx = end.x - start.x
  const dy = end.y - start.y
  const len = Math.hypot(dx, dy) || 1
  // 進行方向に対する左手方向の法線
  const nx = -dy / len
  const ny = dx / len
  const amount = len * 0.42 * curve
  return { x: mx + nx * amount, y: my + ny * amount }
}

const lerpPoint = (a: Point, b: Point, t: number): Point => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
})

/**
 * 2次ベジェの配球パス（盤面ユニット）。
 * trim を渡すと終端をその分だけ手前で止める（矢じりと線の丸端が重ならないように）。
 */
export function shotPathD(startU: Point, endU: Point, curve: number, trim = 0): string {
  const c = shotControlPoint(startU, endU, curve)
  if (trim > 0) {
    const approxLen = (dist(startU, c) + dist(c, endU) + dist(startU, endU)) / 2
    const t = Math.min(0.98, Math.max(0.05, 1 - trim / Math.max(1, approxLen)))
    const q0 = lerpPoint(startU, c, t)
    const q1 = lerpPoint(c, endU, t)
    const r = lerpPoint(q0, q1, t)
    return `M ${startU.x} ${startU.y} Q ${q0.x} ${q0.y} ${r.x} ${r.y}`
  }
  return `M ${startU.x} ${startU.y} Q ${c.x} ${c.y} ${endU.x} ${endU.y}`
}

/** 線分の終端を trim だけ手前で止めた点 */
export function trimEnd(start: Point, end: Point, trim: number): Point {
  const len = dist(start, end)
  if (len <= trim) return start
  return lerpPoint(start, end, (len - trim) / len)
}

/** 矢印の三角形。tip を先端、dirFrom から tip に向かう向きに描く */
export function arrowHeadPoints(tip: Point, dirFrom: Point, size: number): string {
  const dx = tip.x - dirFrom.x
  const dy = tip.y - dirFrom.y
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len
  const uy = dy / len
  const nx = -uy
  const ny = ux
  const backX = tip.x - ux * size
  const backY = tip.y - uy * size
  const half = size * 0.46
  return [
    `${tip.x},${tip.y}`,
    `${backX + nx * half},${backY + ny * half}`,
    `${backX - nx * half},${backY - ny * half}`,
  ].join(' ')
}

/** 配球の終端における接線方向（矢印の向き） */
export function shotTangentFrom(startU: Point, endU: Point, curve: number): Point {
  const c = shotControlPoint(startU, endU, curve)
  // 2次ベジェの t=1 における方向は end - control
  return c
}

/** フリーハンドを滑らかな曲線にする */
export function smoothPathD(points: Point[]): string {
  if (points.length === 0) return ''
  if (points.length === 1) {
    const p = points[0]
    return `M ${p.x} ${p.y} L ${p.x + 0.01} ${p.y}`
  }
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`
  }
  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i]
    const next = points[i + 1]
    d += ` Q ${p.x} ${p.y} ${(p.x + next.x) / 2} ${(p.y + next.y) / 2}`
  }
  const last = points[points.length - 1]
  d += ` L ${last.x} ${last.y}`
  return d
}

/** 2点から矩形（左上と幅高さ）を作る */
export function rectFrom(a: Point, b: Point) {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(b.x - a.x),
    height: Math.abs(b.y - a.y),
  }
}

export interface BBox {
  x: number
  y: number
  width: number
  height: number
}

const padBox = (b: BBox, pad: number): BBox => ({
  x: b.x - pad,
  y: b.y - pad,
  width: b.width + pad * 2,
  height: b.height + pad * 2,
})

const boxOfPoints = (pts: Point[]): BBox => {
  const xs = pts.map((p) => p.x)
  const ys = pts.map((p) => p.y)
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y }
}

/** 選択枠を描くための外接矩形（盤面ユニット） */
export function pointBox(p: Point, radius: number): BBox {
  const u = toUnits(p)
  return { x: u.x - radius, y: u.y - radius, width: radius * 2, height: radius * 2 }
}

export function shotBox(shot: Shot): BBox {
  const s = toUnits(shot.start)
  const e = toUnits(shot.end)
  const c = shotControlPoint(s, e, shot.curve)
  return padBox(boxOfPoints([s, e, c]), SIZES.shotWidth.strong)
}

export function segmentBox(start: Point, end: Point, pad: number): BBox {
  return padBox(boxOfPoints([toUnits(start), toUnits(end)]), pad)
}

export function drawingBox(d: Drawing): BBox {
  const pts = d.points.map(toUnits)
  if (pts.length === 0) return { x: 0, y: 0, width: 0, height: 0 }
  if (d.type === 'circle' || d.type === 'rectangle') {
    return padBox(rectFrom(pts[0], pts[1]), d.width)
  }
  return padBox(boxOfPoints(pts), d.width)
}

export function textBox(t: TextItem): BBox {
  const u = toUnits({ x: t.x, y: t.y })
  // 日本語を想定して 1 文字 ≒ fontSize でざっくり見積もる
  const lines = t.text.split('\n')
  const longest = lines.reduce((m, l) => Math.max(m, charWidth(l)), 0)
  const w = longest * t.fontSize
  const h = lines.length * t.fontSize * 1.25
  return padBox({ x: u.x - w / 2, y: u.y - h / 2, width: w, height: h }, 8)
}

function charWidth(s: string): number {
  let w = 0
  for (const ch of s) w += /[\x20-\x7e｡-ﾟ]/.test(ch) ? 0.55 : 1
  return w
}

/** 盤面の外へ出ないよう、正規化座標に収める */
export function clampNorm(p: Point): Point {
  return { x: Math.min(1, Math.max(0, p.x)), y: Math.min(1, Math.max(0, p.y)) }
}

export const BOARD_SIZE = { width: BOARD_W, height: BOARD_H }
