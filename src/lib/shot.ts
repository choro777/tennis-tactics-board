import type { ShotPower, ShotType } from '../types'
import { SIZES } from './board'

/** 球種ごとの色は固定（ユーザーが変更する機能は持たせない） */
export const SHOT_COLORS: Record<ShotType, string> = {
  topspin: '#FF0000',
  slice: '#0000FF',
  flat: '#800080',
  lob: '#FFD700',
  drop: '#808080',
}

export const SHOT_LABELS: Record<ShotType, string> = {
  topspin: 'トップスピン',
  slice: 'スライス',
  flat: 'フラット',
  lob: 'ロブ',
  drop: 'ドロップ',
}

export const SHOT_TYPES: ShotType[] = ['topspin', 'slice', 'flat', 'lob', 'drop']

export const POWER_LABELS: Record<ShotPower, string> = {
  weak: '弱',
  strong: '強',
}

export const shotStrokeWidth = (power: ShotPower) => SIZES.shotWidth[power]
export const shotArrowSize = (power: ShotPower) => SIZES.shotArrow[power]

/** 曲がりのプリセット */
export const CURVE_PRESETS = [
  { label: '左', value: -0.6 },
  { label: 'なし', value: 0 },
  { label: '右', value: 0.6 },
] as const
