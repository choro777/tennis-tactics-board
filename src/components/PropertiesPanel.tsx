import type { PenWidth, ShotPower, ShotType } from '../types'
import { SIZES } from '../lib/board'
import { CURVE_PRESETS, POWER_LABELS, SHOT_COLORS, SHOT_LABELS, SHOT_TYPES } from '../lib/shot'
import { getCharacter, placeholderColor, placeholderLabel } from '../data/characters'
import { markImageFailed, useImageFailed } from '../lib/imageStatus'
import { useBoardStore } from '../store/useBoardStore'

const PEN_COLORS = ['#111827', '#ef4444', '#2563eb', '#16a34a', '#f59e0b', '#a855f7', '#ffffff']

const HIGHLIGHT_COLORS = ['#fde047', '#4ade80', '#38bdf8', '#fb7185', '#c084fc', '#ffffff']

const PEN_WIDTHS: { value: PenWidth; label: string }[] = [
  { value: 'thin', label: '細' },
  { value: 'medium', label: '中' },
  { value: 'thick', label: '太' },
]

const TEXT_SIZES = [
  { value: SIZES.textSize.small, label: '小' },
  { value: SIZES.textSize.medium, label: '中' },
  { value: SIZES.textSize.large, label: '大' },
]

export function PropertiesPanel() {
  const selection = useBoardStore((s) => s.selection)
  const tool = useBoardStore((s) => s.tool)
  const scene = useBoardStore((s) => s.scene)
  const deleteObject = useBoardStore((s) => s.deleteObject)

  const selectedShot = selection?.type === 'shot' ? scene.shots.find((s) => s.id === selection.id) : undefined
  const selectedChar =
    selection?.type === 'character' ? scene.characters.find((c) => c.id === selection.id) : undefined
  const selectedText = selection?.type === 'text' ? scene.texts.find((t) => t.id === selection.id) : undefined
  const selectedDrawing =
    selection?.type === 'drawing' ? scene.drawings.find((d) => d.id === selection.id) : undefined

  return (
    <div className="flex flex-col gap-4 text-slate-200">
      {selectedChar && <CharacterProps id={selectedChar.id} characterId={selectedChar.characterId} side={selectedChar.side} />}
      {selectedText && <TextProps />}
      {selectedDrawing && <DrawingProps id={selectedDrawing.id} color={selectedDrawing.color} />}
      {(selectedShot || (!selection && tool === 'shot')) && <ShotProps />}
      {!selection && (tool === 'pen' || tool === 'highlight' || tool === 'arrow' || tool === 'line' || tool === 'circle' || tool === 'rectangle') && (
        <PenProps highlight={tool === 'highlight'} />
      )}
      {!selection && tool === 'text' && <TextProps />}
      {!selection && tool === 'character' && (
        <Section title="キャラクター">
          <p className="text-xs leading-relaxed text-slate-400">
            左（スマホは下）の一覧からキャラクターを選び、コートをタップすると配置できます。
            同じキャラクターを何体でも置けます。
          </p>
        </Section>
      )}
      {!selection && tool === 'select' && (
        <Section title="操作のヒント">
          <ul className="list-disc space-y-1 pl-4 text-xs leading-relaxed text-slate-400">
            <li>オブジェクトをタップで選択、ドラッグで移動</li>
            <li>何もない所をドラッグで盤面を移動（パン）</li>
            <li>ホイール／ピンチで拡大縮小</li>
            <li>Delete / BackSpace で削除</li>
            <li>テキストはダブルクリックで編集</li>
          </ul>
        </Section>
      )}
      {!selection && tool === 'movement' && (
        <Section title="移動">
          <p className="text-xs leading-relaxed text-slate-400">
            キャラクターの上からドラッグすると、その位置を始点に移動矢印を引けます。
            配球（色付きの実線）とは別のオブジェクトです。
          </p>
        </Section>
      )}
      {!selection && tool === 'ball' && (
        <Section title="ボール">
          <p className="text-xs leading-relaxed text-slate-400">コートをタップするとボールを置けます。</p>
        </Section>
      )}
      {!selection && tool === 'eraser' && (
        <Section title="消しゴム">
          <p className="text-xs leading-relaxed text-slate-400">
            消したいオブジェクトをタップ、またはなぞると削除します。
          </p>
        </Section>
      )}

      {selection && (
        <button
          type="button"
          onClick={() => deleteObject(selection)}
          className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-bold text-white hover:bg-rose-500"
        >
          このオブジェクトを削除
        </button>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-bold tracking-wide text-slate-400">{title}</p>
      {children}
    </div>
  )
}

function Chip({
  active,
  onClick,
  children,
  color,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  color?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-bold transition',
        active ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700',
      ].join(' ')}
    >
      {color && <span className="h-3 w-3 rounded-full" style={{ background: color }} />}
      {children}
    </button>
  )
}

function ShotProps() {
  const settings = useBoardStore((s) => s.shotSettings)
  const setSettings = useBoardStore((s) => s.setShotSettings)
  const selection = useBoardStore((s) => s.selection)
  const shot = useBoardStore((s) =>
    selection?.type === 'shot' ? s.scene.shots.find((x) => x.id === selection.id) : undefined,
  )
  const current = shot ?? settings

  return (
    <div className="flex flex-col gap-3">
      <Section title={shot ? '配球（選択中）' : '配球（次に引く線の設定）'}>
        <div className="grid grid-cols-2 gap-1.5">
          {SHOT_TYPES.map((t: ShotType) => (
            <Chip
              key={t}
              active={current.type === t}
              color={SHOT_COLORS[t]}
              onClick={() => setSettings({ type: t })}
            >
              {SHOT_LABELS[t]}
            </Chip>
          ))}
        </div>
      </Section>

      <Section title="強さ">
        <div className="grid grid-cols-2 gap-1.5">
          {(['weak', 'strong'] as ShotPower[]).map((p) => (
            <Chip key={p} active={current.power === p} onClick={() => setSettings({ power: p })}>
              {POWER_LABELS[p]}
            </Chip>
          ))}
        </div>
      </Section>

      <Section title="曲がり">
        <div className="grid grid-cols-3 gap-1.5">
          {CURVE_PRESETS.map((c) => (
            <Chip
              key={c.label}
              active={Math.abs(current.curve - c.value) < 0.05}
              onClick={() => setSettings({ curve: c.value })}
            >
              {c.label}
            </Chip>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-[10px] text-slate-500">左</span>
          <input
            type="range"
            min={-1}
            max={1}
            step={0.05}
            value={current.curve}
            onChange={(e) => setSettings({ curve: Number(e.target.value) })}
            className="w-full accent-sky-500"
          />
          <span className="text-[10px] text-slate-500">右</span>
        </div>
      </Section>
    </div>
  )
}

function PenProps({ highlight }: { highlight: boolean }) {
  const pen = useBoardStore((s) => s.penSettings)
  const setPen = useBoardStore((s) => s.setPenSettings)
  const colors = highlight ? HIGHLIGHT_COLORS : PEN_COLORS
  const current = highlight ? pen.highlightColor : pen.color
  return (
    <div className="flex flex-col gap-3">
      <Section title={highlight ? 'ハイライト' : 'ペン・図形'}>
        <div className="flex flex-wrap gap-1.5">
          {colors.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setPen(highlight ? { highlightColor: c } : { color: c })}
              aria-label={c}
              className={[
                'h-8 w-8 rounded-full border-2 transition',
                current === c ? 'border-sky-400 scale-110' : 'border-slate-600',
              ].join(' ')}
              style={{ background: c }}
            />
          ))}
        </div>
      </Section>
      <Section title="太さ">
        <div className="grid grid-cols-3 gap-1.5">
          {PEN_WIDTHS.map((w) => (
            <Chip key={w.value} active={pen.width === w.value} onClick={() => setPen({ width: w.value })}>
              {w.label}
            </Chip>
          ))}
        </div>
      </Section>
    </div>
  )
}

function TextProps() {
  const text = useBoardStore((s) => s.textSettings)
  const setText = useBoardStore((s) => s.setTextSettings)
  return (
    <div className="flex flex-col gap-3">
      <Section title="文字サイズ">
        <div className="grid grid-cols-3 gap-1.5">
          {TEXT_SIZES.map((t) => (
            <Chip key={t.label} active={text.fontSize === t.value} onClick={() => setText({ fontSize: t.value })}>
              {t.label}
            </Chip>
          ))}
        </div>
      </Section>
      <Section title="文字色">
        <div className="flex flex-wrap gap-1.5">
          {PEN_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setText({ color: c })}
              aria-label={c}
              className={[
                'h-8 w-8 rounded-full border-2 transition',
                text.color === c ? 'border-sky-400 scale-110' : 'border-slate-600',
              ].join(' ')}
              style={{ background: c }}
            />
          ))}
        </div>
      </Section>
    </div>
  )
}

function DrawingProps({ id, color }: { id: string; color: string }) {
  const updateDrawing = useBoardStore((s) => s.updateDrawing)
  return (
    <Section title="ペン・図形（選択中）">
      <div className="flex flex-wrap gap-1.5">
        {PEN_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => updateDrawing(id, { color: c })}
            aria-label={c}
            className={[
              'h-8 w-8 rounded-full border-2 transition',
              color === c ? 'border-sky-400 scale-110' : 'border-slate-600',
            ].join(' ')}
            style={{ background: c }}
          />
        ))}
      </div>
    </Section>
  )
}

function CharacterProps({
  id,
  characterId,
  side,
}: {
  id: string
  characterId: string
  side: 'self' | 'opponent'
}) {
  const setCharacterSide = useBoardStore((s) => s.setCharacterSide)
  const character = getCharacter(characterId)
  const src = character?.image ?? ''
  const failed = useImageFailed(src)

  return (
    <Section title="キャラクター">
      <div className="flex items-center gap-3">
        {failed || !src ? (
          <span
            className="flex h-14 w-14 items-center justify-center rounded-full text-lg font-black text-white"
            style={{ background: placeholderColor(characterId) }}
          >
            {placeholderLabel(characterId)}
          </span>
        ) : (
          <img
            src={src}
            alt=""
            onError={() => markImageFailed(src)}
            className="h-14 w-14 rounded-full bg-white object-cover"
          />
        )}
        <div className="grid flex-1 grid-cols-2 gap-1.5">
          <Chip active={side === 'self'} onClick={() => setCharacterSide(id, 'self')}>
            自分
          </Chip>
          <Chip active={side === 'opponent'} onClick={() => setCharacterSide(id, 'opponent')}>
            相手
          </Chip>
        </div>
      </div>
    </Section>
  )
}
