import { useEffect, useState } from 'react'
import type { RefObject } from 'react'
import type { ExportRatio } from '../types'
import {
  EXPORT_SIZES,
  canShareFiles,
  downloadBlob,
  makeFileName,
  renderBoardPng,
  shareBlob,
} from '../lib/exportImage'

const RATIOS: ExportRatio[] = ['original', '16:9', '1:1', '9:16']

export function ExportDialog({
  svgRef,
  onClose,
}: {
  svgRef: RefObject<SVGSVGElement>
  onClose: () => void
}) {
  const [ratio, setRatio] = useState<ExportRatio>('original')
  const [busy, setBusy] = useState<'save' | 'share' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const shareable = canShareFiles()

  useEffect(() => {
    let revoked: string | null = null
    let cancelled = false
    const run = async () => {
      const svg = svgRef.current
      if (!svg) return
      try {
        const blob = await renderBoardPng(svg, ratio)
        if (cancelled) return
        const url = URL.createObjectURL(blob)
        revoked = url
        setPreview(url)
      } catch {
        /* プレビューは失敗しても致命的ではないので黙って諦める */
      }
    }
    run()
    return () => {
      cancelled = true
      if (revoked) URL.revokeObjectURL(revoked)
    }
  }, [ratio, svgRef])

  const handle = async (kind: 'save' | 'share') => {
    const svg = svgRef.current
    if (!svg) return
    setBusy(kind)
    setError(null)
    try {
      const blob = await renderBoardPng(svg, ratio)
      const name = makeFileName()
      if (kind === 'share') {
        const ok = await shareBlob(blob, name)
        if (!ok) {
          downloadBlob(blob, name)
          setError('この環境では共有が使えないため、画像を保存しました')
        }
      } else {
        downloadBlob(blob, name)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '画像の出力に失敗しました')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 p-4" onClick={onClose}>
      <div
        className="max-h-full w-full max-w-md overflow-y-auto rounded-2xl bg-slate-900 p-4 text-slate-100 shadow-2xl ring-1 ring-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold">画像として出力</h2>
          <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-slate-400 hover:text-white">
            ✕
          </button>
        </div>

        <p className="mb-2 text-[11px] font-bold tracking-wide text-slate-400">画像サイズ</p>
        <div className="mb-4 grid grid-cols-4 gap-1.5">
          {RATIOS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRatio(r)}
              className={[
                'rounded-lg px-2 py-2 text-xs font-bold transition',
                ratio === r ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700',
              ].join(' ')}
            >
              {EXPORT_SIZES[r].label}
            </button>
          ))}
        </div>

        <div className="mb-4 flex items-center justify-center rounded-xl bg-slate-800 p-2">
          {preview ? (
            <img src={preview} alt="プレビュー" className="max-h-56 w-auto rounded-lg" />
          ) : (
            <p className="py-10 text-xs text-slate-500">プレビューを準備中…</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => handle('save')}
            className="rounded-xl bg-sky-600 px-4 py-3 text-sm font-bold text-white hover:bg-sky-500 disabled:opacity-50"
          >
            {busy === 'save' ? '出力中…' : '画像として保存'}
          </button>
          <button
            type="button"
            disabled={busy !== null || !shareable}
            onClick={() => handle('share')}
            className="rounded-xl bg-slate-700 px-4 py-3 text-sm font-bold text-white hover:bg-slate-600 disabled:opacity-40"
          >
            {busy === 'share' ? '共有中…' : shareable ? '画像を共有' : '画像を共有（この環境では未対応）'}
          </button>
        </div>

        <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
          画面のスクリーンショットではなく、盤面を高解像度で描き直して出力します。
          {EXPORT_SIZES[ratio].width}×{EXPORT_SIZES[ratio].height}px
        </p>
        {error && <p className="mt-2 text-xs font-bold text-amber-400">{error}</p>}
      </div>
    </div>
  )
}
