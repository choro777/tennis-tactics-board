import type { GameMode } from '../types'
import { useBoardStore } from '../store/useBoardStore'

export function Header({ onExport }: { onExport: () => void }) {
  const mode = useBoardStore((s) => s.mode)
  const setMode = useBoardStore((s) => s.setMode)
  const undo = useBoardStore((s) => s.undo)
  const redo = useBoardStore((s) => s.redo)
  const clearBoard = useBoardStore((s) => s.clearBoard)
  const canUndo = useBoardStore((s) => s.past.length > 0)
  const canRedo = useBoardStore((s) => s.future.length > 0)

  const modeBtn = (m: GameMode, label: string) => (
    <button
      key={m}
      type="button"
      onClick={() => setMode(m)}
      className={[
        'rounded-lg px-3 py-1.5 text-xs font-bold transition',
        mode === m ? 'bg-sky-500 text-white' : 'text-slate-300 hover:bg-slate-700',
      ].join(' ')}
    >
      {label}
    </button>
  )

  const iconBtn =
    'whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-700 disabled:opacity-30'

  return (
    <header className="flex items-center gap-2 border-b border-slate-800 bg-slate-900 px-3 py-2">
      <h1 className="hidden shrink-0 text-sm font-bold text-slate-100 sm:block">テニス戦術ボード</h1>
      <div className="flex shrink-0 rounded-lg bg-slate-800 p-0.5">
        {modeBtn('singles', 'シングルス')}
        {modeBtn('doubles', 'ダブルス')}
      </div>

      <div className="ml-auto flex items-center gap-1">
        <button
          type="button"
          className={iconBtn}
          onClick={undo}
          disabled={!canUndo}
          aria-label="戻す"
          title="元に戻す"
        >
          ↶<span className="ml-1 hidden sm:inline">戻す</span>
        </button>
        <button
          type="button"
          className={iconBtn}
          onClick={redo}
          disabled={!canRedo}
          aria-label="進む"
          title="やり直す"
        >
          ↷<span className="ml-1 hidden sm:inline">進む</span>
        </button>
        <button
          type="button"
          className="whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-400 hover:bg-slate-700 hover:text-rose-300"
          onClick={() => {
            if (confirm('盤面をすべて消去します。よろしいですか？')) clearBoard()
          }}
        >
          クリア
        </button>
        <button
          type="button"
          onClick={onExport}
          className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-sky-500"
        >
          画像
        </button>
      </div>
    </header>
  )
}
