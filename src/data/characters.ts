import type { Character } from '../types'
import { assetUrl } from '../lib/assets'

/**
 * ============================================================
 * キャラクター定義
 * ============================================================
 *
 * ■ キャラクターを追加するとき
 *   1. 画像を public/characters/ に置く（例: public/characters/ch39.png）
 *   2. 下の CHARACTER_DEFS に 1 行足す
 *        { id: 'ch39', name: '新キャラ' },
 *   3. 以上。キャラクター一覧・配置・保存・PNG出力はすべて
 *      この配列から自動生成されるので、アプリ本体のコード変更は不要です。
 *
 * ■ 使わないキャラクターを一時的に隠す
 *      { id: 'ch07', name: '…', enabled: false }
 *
 * ■ 画像の拡張子が png 以外のとき
 *      { id: 'ch08', name: '…', image: 'characters/ch08.webp' }
 *
 * ■ 画像がまだ無いとき
 *      画像が読み込めない場合は、色付きの丸＋番号のプレースホルダーが
 *      自動で表示されます。あとから同じファイル名で画像を置けば差し替わります。
 */
export interface CharacterDef {
  id: string
  name: string
  /** public/ からの相対パス。省略時は characters/<id>.png */
  image?: string
  /** false にすると一覧に出さない。省略時は true */
  enabled?: boolean
}

export const CHARACTER_DEFS: CharacterDef[] = [
  { id: 'ch01', name: 'マリオ' },
  { id: 'ch02', name: 'ルイージ' },
  { id: 'ch03', name: 'ピーチ' },
  { id: 'ch04', name: 'デイジー' },
  { id: 'ch05', name: 'ロゼッタ' },
  { id: 'ch06', name: 'ポリーン' },
  { id: 'ch07', name: 'ワリオ' },
  { id: 'ch08', name: 'ワルイージ' },
  { id: 'ch09', name: 'キノピオ' },
  { id: 'ch10', name: 'キノピコ' },
  { id: 'ch11', name: 'チコ' },
  { id: 'ch12', name: 'ヨッシー' },
  { id: 'ch13', name: 'クッパ' },
  { id: 'ch14', name: 'クッパJr.' },
  { id: 'ch15', name: 'ドンキー' },
  { id: 'ch16', name: 'テレサ' },
  { id: 'ch17', name: 'ヘイホー' },
  { id: 'ch18', name: 'ノコノコ' },
  { id: 'ch19', name: 'カメック' },
  { id: 'ch20', name: 'ガボン' },
  { id: 'ch21', name: 'ディディー' },
  { id: 'ch22', name: 'ワンワン' },
  { id: 'ch23', name: 'キャサリン' },
  { id: 'ch24', name: 'パタパタ' },
  { id: 'ch25', name: 'ボスパックン' },
  { id: 'ch26', name: 'パックンフラワー' },
  { id: 'ch27', name: 'ブンブン' },
  { id: 'ch28', name: 'ゲッソー' },
  { id: 'ch29', name: 'ホネクッパ' },
  { id: 'ch30', name: 'カロン' },
  { id: 'ch31', name: 'ベビィマリオ' },
  { id: 'ch32', name: 'ベビィルイージ' },
  { id: 'ch33', name: 'ベビィピーチ' },
  { id: 'ch34', name: 'ハナチャン' },
  { id: 'ch35', name: 'トッテン' },
  { id: 'ch36', name: 'クリボー' },
  { id: 'ch37', name: 'ベビィワリオ' },
  { id: 'ch38', name: 'ベビィワルイージ' },
]

export const CHARACTERS: Character[] = CHARACTER_DEFS.map((def) => ({
  id: def.id,
  name: def.name,
  image: assetUrl(def.image ?? `characters/${def.id}.png`),
  enabled: def.enabled ?? true,
}))

export const ENABLED_CHARACTERS: Character[] = CHARACTERS.filter((c) => c.enabled)

const byId = new Map(CHARACTERS.map((c) => [c.id, c]))

export const getCharacter = (id: string): Character | undefined => byId.get(id)

const indexById = new Map(CHARACTERS.map((c, i) => [c.id, i]))

/** 画像が無いときのプレースホルダー色（キャラクターごとに固定） */
export function placeholderColor(characterId: string): string {
  const i = indexById.get(characterId) ?? 0
  const hue = (i * 360) / Math.max(1, CHARACTERS.length)
  return `hsl(${Math.round(hue)} 62% 48%)`
}

/** プレースホルダーに出す短いラベル */
export function placeholderLabel(characterId: string): string {
  const c = byId.get(characterId)
  if (!c) return '?'
  const digits = c.id.match(/\d+/)
  if (digits) return String(Number(digits[0]))
  return c.name.slice(0, 2)
}
