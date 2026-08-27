/**
 * 盤面のデータモデル。
 *
 * 座標はすべて「正規化座標」で持ちます（x: 0〜1 / y: 0〜1）。
 * 画面ピクセルに依存しないので、PC・スマホ・タブレット・PNG出力で
 * 同じ配置が再現できます。実ピクセルへの変換は lib/board.ts が担当します。
 */

export type Side = 'self' | 'opponent'

export type GameMode = 'singles' | 'doubles'

export type ShotType = 'topspin' | 'slice' | 'flat' | 'lob' | 'drop'

export type ShotPower = 'weak' | 'strong'

export type DrawingType = 'pen' | 'arrow' | 'line' | 'circle' | 'rectangle'

export interface Point {
  x: number
  y: number
}

/** キャラクター定義（データとして管理。画像を足す→ここに1行足すだけで一覧へ反映） */
export interface Character {
  id: string
  name: string
  image: string
  enabled: boolean
}

/** コート上に置かれたキャラクター */
export interface PlacedCharacter {
  id: string
  characterId: string
  side: Side
  x: number
  y: number
}

export interface Ball {
  id: string
  x: number
  y: number
}

/** 配球 */
export interface Shot {
  id: string
  start: Point
  end: Point
  type: ShotType
  power: ShotPower
  /** 左右の曲がり。-1（左）〜 0（なし）〜 +1（右） */
  curve: number
}

/** キャラクターの移動 */
export interface Movement {
  id: string
  /** 起点になった配置キャラクターの id（無い場合は空文字） */
  characterId: string
  start: Point
  end: Point
}

/** ペン・図形 */
export interface Drawing {
  id: string
  type: DrawingType
  points: Point[]
  color: string
  /** 線の太さ（盤面ユニット） */
  width: number
  opacity: number
}

export interface TextItem {
  id: string
  text: string
  x: number
  y: number
  fontSize: number
  color: string
}

/** 履歴（Undo / Redo）の対象になる盤面まるごと */
export interface Scene {
  characters: PlacedCharacter[]
  balls: Ball[]
  shots: Shot[]
  movements: Movement[]
  drawings: Drawing[]
  texts: TextItem[]
}

export type ObjectType = 'character' | 'ball' | 'shot' | 'movement' | 'drawing' | 'text'

export interface SelectionRef {
  type: ObjectType
  id: string
}

export type Tool =
  | 'select'
  | 'character'
  | 'shot'
  | 'movement'
  | 'pen'
  | 'highlight'
  | 'arrow'
  | 'line'
  | 'circle'
  | 'rectangle'
  | 'text'
  | 'eraser'

export type PenWidth = 'thin' | 'medium' | 'thick'

export type ExportRatio = 'original' | '16:9' | '1:1' | '9:16'
