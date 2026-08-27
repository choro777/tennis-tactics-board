import { ENABLED_CHARACTERS, placeholderColor, placeholderLabel } from '../data/characters'
import { markImageFailed, useImageFailed } from '../lib/imageStatus'
import { characterLimit, useBoardStore } from '../store/useBoardStore'

/**
 * キャラクター一覧。CHARACTERS 配列から自動生成しているので、
 * キャラクターが 38 → 40 に増えてもこのコンポーネントは変更不要です。
 */
export function CharacterPalette() {
  const pendingId = useBoardStore((s) => s.pendingCharacterId)
  const setPending = useBoardStore((s) => s.setPendingCharacter)
  const mode = useBoardStore((s) => s.mode)
  const characters = useBoardStore((s) => s.scene.characters)

  const limit = characterLimit(mode)
  const selfCount = characters.filter((c) => c.side === 'self').length
  const oppCount = characters.filter((c) => c.side === 'opponent').length

  return (
    <div className="flex h-full min-h-0 flex-col">
      <p className="text-[11px] font-bold tracking-wide text-slate-400">
        CHARACTERS（{ENABLED_CHARACTERS.length}）
      </p>
      <p className="mt-1 text-[11px] font-bold">
        <span className="text-sky-400">
          自分 {selfCount}/{limit}
        </span>
        <span className="mx-1 text-slate-600">|</span>
        <span className="text-rose-400">
          相手 {oppCount}/{limit}
        </span>
      </p>
      <p className="mb-2 mt-1 text-[11px] leading-snug text-slate-400">
        選んでからコートをタップで配置。上半分が相手／下半分が自分になります。
      </p>
      <div className="grid min-h-0 grid-cols-4 gap-1.5 overflow-y-auto no-scrollbar sm:grid-cols-5 lg:grid-cols-3">
        {ENABLED_CHARACTERS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setPending(pendingId === c.id ? null : c.id)}
            title={c.name}
            className={[
              'flex flex-col items-center gap-1 rounded-lg p-1.5 transition',
              pendingId === c.id ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700',
            ].join(' ')}
          >
            <CharacterThumb id={c.id} src={c.image} />
            <span className="w-full truncate text-center text-[9px] font-bold leading-tight">
              {c.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

function CharacterThumb({ id, src }: { id: string; src: string }) {
  const failed = useImageFailed(src)
  if (failed) {
    return (
      <span
        className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-black text-white"
        style={{ background: placeholderColor(id) }}
      >
        {placeholderLabel(id)}
      </span>
    )
  }
  return (
    <img
      src={src}
      alt=""
      draggable={false}
      onError={() => markImageFailed(src)}
      className="h-10 w-10 rounded-full bg-white object-cover"
    />
  )
}
