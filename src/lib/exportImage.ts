import type { ExportRatio } from '../types'
import { BOARD_ASPECT, BOARD_H, BOARD_W } from './board'

/** 出力サイズ（画面のスクリーンショットではなく、SVG を再レンダリングする） */
export const EXPORT_SIZES: Record<ExportRatio, { width: number; height: number; label: string }> = {
  original: { width: 1200, height: Math.round(1200 * BOARD_ASPECT), label: 'オリジナル' },
  '16:9': { width: 1920, height: 1080, label: '16:9' },
  '1:1': { width: 1600, height: 1600, label: '1:1' },
  '9:16': { width: 1200, height: 2133, label: '9:16' },
}

const BACKGROUND = '#1f7a4d'

const dataUrlCache = new Map<string, string>()

async function toDataUrl(url: string): Promise<string | null> {
  if (dataUrlCache.has(url)) return dataUrlCache.get(url)!
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const blob = await res.blob()
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
    dataUrlCache.set(url, dataUrl)
    return dataUrl
  } catch {
    return null
  }
}

/**
 * 盤面 SVG を複製して、ズーム／パンと選択枠を取り除いた
 * 「素の盤面」だけの SVG 文字列を作る。
 */
async function buildStandaloneSvg(source: SVGSVGElement): Promise<string> {
  const clone = source.cloneNode(true) as SVGSVGElement
  clone.querySelector('#board-overlay')?.remove()

  const content = clone.querySelector('#board-content') as SVGGElement | null
  if (content) {
    content.removeAttribute('transform')
    content.removeAttribute('style')
  }

  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink')
  clone.setAttribute('width', String(BOARD_W))
  clone.setAttribute('height', String(BOARD_H))
  clone.setAttribute('viewBox', `0 0 ${BOARD_W} ${BOARD_H}`)
  clone.removeAttribute('class')
  clone.removeAttribute('style')

  // キャラクター画像は data URL に埋め込む（そうしないと canvas が汚染されて出力できない）
  const images = Array.from(clone.querySelectorAll('image'))
  await Promise.all(
    images.map(async (img) => {
      const href = img.getAttribute('href') || img.getAttribute('xlink:href')
      if (!href || href.startsWith('data:')) return
      const dataUrl = await toDataUrl(href)
      if (dataUrl) {
        img.setAttribute('href', dataUrl)
        img.removeAttribute('xlink:href')
      } else {
        img.remove()
      }
    }),
  )

  return new XMLSerializer().serializeToString(clone)
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('画像の生成に失敗しました'))
    img.src = src
  })
}

/** 盤面を PNG の Blob にする */
export async function renderBoardPng(source: SVGSVGElement, ratio: ExportRatio): Promise<Blob> {
  const svgText = await buildStandaloneSvg(source)
  const src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`
  const img = await loadImage(src)

  const { width, height } = EXPORT_SIZES[ratio]
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas を利用できません')

  ctx.fillStyle = BACKGROUND
  ctx.fillRect(0, 0, width, height)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  const scale = Math.min(width / BOARD_W, height / BOARD_H)
  const drawW = BOARD_W * scale
  const drawH = BOARD_H * scale
  ctx.drawImage(img, (width - drawW) / 2, (height - drawH) / 2, drawW, drawH)

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('PNG の生成に失敗しました'))
    }, 'image/png')
  })
}

export function makeFileName(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `tennis-board-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(
    d.getMinutes(),
  )}${p(d.getSeconds())}.png`
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function canShareFiles(): boolean {
  if (typeof navigator === 'undefined' || !navigator.share || !navigator.canShare) return false
  try {
    const probe = new File([new Blob(['a'], { type: 'image/png' })], 'probe.png', {
      type: 'image/png',
    })
    return navigator.canShare({ files: [probe] })
  } catch {
    return false
  }
}

/** Web Share API で画像を直接共有する。使えない環境では false を返す */
export async function shareBlob(blob: Blob, fileName: string): Promise<boolean> {
  if (!canShareFiles()) return false
  const file = new File([blob], fileName, { type: 'image/png' })
  try {
    await navigator.share({ files: [file], title: 'テニス戦術ボード' })
    return true
  } catch (err) {
    if ((err as DOMException)?.name === 'AbortError') return true
    return false
  }
}
