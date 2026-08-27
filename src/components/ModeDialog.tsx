import { useBoardStore } from '../store/useBoardStore'

/** 起動時のモード選択。裏ではすでにコートが表示されています */
export function ModeDialog() {
  const setMode = useBoardStore((s) => s.setMode)

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 p-6">
      <div className="w-full max-w-sm rounded-2xl bg-slate-900 p-6 text-center text-slate-100 shadow-2xl ring-1 ring-white/10">
        <h1 className="text-lg font-bold">テニス戦術ボード</h1>
        <p className="mt-2 text-xs leading-relaxed text-slate-400">
          コートの上に配球・移動・書き込みを自由に置いて、1枚の戦術図をつくれます。
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setMode('singles')}
            className="rounded-xl bg-sky-600 px-4 py-4 text-sm font-bold text-white hover:bg-sky-500"
          >
            シングルス
            <span className="mt-1 block text-[10px] font-normal opacity-80">自分1 / 相手1</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('doubles')}
            className="rounded-xl bg-emerald-600 px-4 py-4 text-sm font-bold text-white hover:bg-emerald-500"
          >
            ダブルス
            <span className="mt-1 block text-[10px] font-normal opacity-80">自分2 / 相手2</span>
          </button>
        </div>
        <p className="mt-4 text-[10px] text-slate-500">あとからヘッダーで切り替えられます</p>
      </div>
    </div>
  )
}
