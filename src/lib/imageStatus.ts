import { useSyncExternalStore } from 'react'

/**
 * キャラクター画像がまだ用意されていない場合でもアプリが破綻しないよう、
 * 読み込みに失敗した URL を覚えておき、プレースホルダー表示に切り替えます。
 */
const failed = new Set<string>()
const listeners = new Set<() => void>()

export function markImageFailed(src: string) {
  if (failed.has(src)) return
  failed.add(src)
  listeners.forEach((l) => l())
}

export function isImageFailed(src: string) {
  return failed.has(src)
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useImageFailed(src: string): boolean {
  return useSyncExternalStore(
    subscribe,
    () => failed.has(src),
    () => false,
  )
}
