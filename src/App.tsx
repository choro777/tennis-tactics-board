import { useEffect, useRef, useState } from 'react'
import { BoardCanvas } from './components/board/BoardCanvas'
import { CharacterPalette } from './components/CharacterPalette'
import { ExportDialog } from './components/ExportDialog'
import { Header } from './components/Header'
import { ModeDialog } from './components/ModeDialog'
import { PropertiesPanel } from './components/PropertiesPanel'
import { Toolbar } from './components/Toolbar'
import { useBoardStore } from './store/useBoardStore'

type Sheet = 'none' | 'characters' | 'properties'

export default function App() {
  const svgRef = useRef<SVGSVGElement>(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [sheet, setSheet] = useState<Sheet>('none')

  const modeChosen = useBoardStore((s) => s.modeChosen)
  const tool = useBoardStore((s) => s.tool)
  const notice = useBoardStore((s) => s.notice)
  const setNotice = useBoardStore((s) => s.setNotice)

  // キャラクターツールを選んだらスマホでは一覧を自動で開く
  useEffect(() => {
    if (tool === 'character') setSheet((s) => (s === 'none' ? 'characters' : s))
  }, [tool])

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(null), 2600)
    return () => clearTimeout(timer)
  }, [notice, setNotice])

  // キーボードショートカット
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return
      const state = useBoardStore.getState()

      if ((e.key === 'Delete' || e.key === 'Backspace') && state.selection) {
        e.preventDefault()
        state.deleteObject(state.selection)
        return
      }
      const mod = e.ctrlKey || e.metaKey
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) state.redo()
        else state.undo()
        return
      }
      if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        state.redo()
        return
      }
      if (e.key === 'Escape') state.setSelection(null)
      if (e.key === 'v') state.setTool('select')
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <div className="flex h-full flex-col bg-slate-950">
      <Header onExport={() => setExportOpen(true)} />

      <div className="flex min-h-0 flex-1">
        {/* PC: 左ツールバー */}
        <aside className="hidden w-60 shrink-0 flex-col gap-4 overflow-hidden border-r border-slate-800 bg-slate-900 p-3 lg:flex">
          <Toolbar />
          <div className="min-h-0 flex-1 overflow-hidden">
            <CharacterPalette />
          </div>
        </aside>

        {/* コート */}
        <main className="relative min-h-0 flex-1 bg-slate-900">
          <BoardCanvas svgRef={svgRef} />
          {notice && (
            <div className="pointer-events-none absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-lg bg-slate-950/90 px-3 py-2 text-xs font-bold text-amber-300 shadow ring-1 ring-white/10">
              {notice}
            </div>
          )}
        </main>

        {/* PC: 右プロパティ */}
        <aside className="hidden w-64 shrink-0 overflow-y-auto border-l border-slate-800 bg-slate-900 p-3 lg:block">
          <PropertiesPanel />
        </aside>
      </div>

      {/* スマホ・タブレット: 下部ツール */}
      <div className="border-t border-slate-800 bg-slate-900 px-2 pb-[env(safe-area-inset-bottom)] pt-2 lg:hidden">
        <Toolbar orientation="horizontal" />
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          <SheetButton active={sheet === 'characters'} onClick={() => setSheet(sheet === 'characters' ? 'none' : 'characters')}>
            キャラ一覧
          </SheetButton>
          <SheetButton active={sheet === 'properties'} onClick={() => setSheet(sheet === 'properties' ? 'none' : 'properties')}>
            設定
          </SheetButton>
          <SheetButton active={false} onClick={() => setExportOpen(true)}>
            保存 / 共有
          </SheetButton>
        </div>
      </div>

      {sheet !== 'none' && (
        <div className="fixed inset-x-0 bottom-0 z-30 max-h-[58vh] overflow-y-auto rounded-t-2xl border-t border-slate-700 bg-slate-900 p-3 pb-[calc(env(safe-area-inset-bottom)+12px)] shadow-2xl lg:hidden">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-bold text-slate-300">
              {sheet === 'characters' ? 'キャラクター' : '設定'}
            </p>
            <button
              type="button"
              onClick={() => setSheet('none')}
              className="rounded-lg px-2 py-1 text-slate-400"
            >
              閉じる ✕
            </button>
          </div>
          {sheet === 'characters' ? <CharacterPalette /> : <PropertiesPanel />}
        </div>
      )}

      {!modeChosen && <ModeDialog />}
      {exportOpen && <ExportDialog svgRef={svgRef} onClose={() => setExportOpen(false)} />}
    </div>
  )
}

function SheetButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'rounded-lg px-2 py-2 text-xs font-bold transition',
        active ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-300',
      ].join(' ')}
    >
      {children}
    </button>
  )
}
