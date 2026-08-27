import { useEffect, useRef, useState } from 'react'

interface Props {
  initialValue: string
  onSubmit: (value: string) => void
  onCancel: () => void
}

/** テキスト入力用の軽量ダイアログ（スマホのソフトキーボードでも扱いやすいように） */
export function TextInputDialog({ initialValue, onSubmit, onCancel }: Props) {
  const [value, setValue] = useState(initialValue)
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    ref.current?.focus()
    ref.current?.select()
  }, [])

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/60 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-4 shadow-xl">
        <p className="mb-2 text-sm font-bold text-slate-700">テキスト</p>
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={3}
          placeholder="ここを狙う / 前衛がポーチ / ロブ警戒 …"
          className="w-full resize-none rounded-lg border border-slate-300 p-2 text-base text-slate-900 outline-none focus:border-sky-500"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onSubmit(value)
            if (e.key === 'Escape') onCancel()
          }}
        />
        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-lg px-3 py-2 text-sm font-bold text-slate-500"
            onClick={onCancel}
          >
            キャンセル
          </button>
          <button
            type="button"
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-bold text-white"
            onClick={() => onSubmit(value)}
          >
            決定
          </button>
        </div>
      </div>
    </div>
  )
}
