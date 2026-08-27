import type { Tool } from '../types'
import { useBoardStore } from '../store/useBoardStore'
import { ToolIcon } from './ToolIcon'

export const TOOLS: { tool: Tool; label: string }[] = [
  { tool: 'select', label: '選択' },
  { tool: 'character', label: 'キャラ' },
  { tool: 'shot', label: '配球' },
  { tool: 'movement', label: '移動' },
  { tool: 'pen', label: 'ペン' },
  { tool: 'highlight', label: 'ハイライト' },
  { tool: 'arrow', label: '矢印' },
  { tool: 'line', label: '直線' },
  { tool: 'circle', label: '円' },
  { tool: 'rectangle', label: '四角' },
  { tool: 'text', label: 'テキスト' },
  { tool: 'eraser', label: '消しゴム' },
]

export function Toolbar({ orientation = 'vertical' }: { orientation?: 'vertical' | 'horizontal' }) {
  const tool = useBoardStore((s) => s.tool)
  const setTool = useBoardStore((s) => s.setTool)

  const wrapper =
    orientation === 'vertical'
      ? 'grid grid-cols-2 gap-1.5'
      : 'flex gap-1.5 overflow-x-auto no-scrollbar pb-1'

  return (
    <div className={wrapper}>
      {TOOLS.map(({ tool: t, label }) => {
        const active = tool === t
        return (
          <button
            key={t}
            type="button"
            onClick={() => setTool(t)}
            aria-pressed={active}
            title={label}
            className={[
              'flex shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-2 text-[10px] font-bold transition',
              orientation === 'horizontal' ? 'min-w-[58px]' : '',
              active
                ? 'bg-sky-500 text-white shadow'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700',
            ].join(' ')}
          >
            <ToolIcon tool={t} />
            <span>{label}</span>
          </button>
        )
      })}
    </div>
  )
}
