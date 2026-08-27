/**
 * GitHub Pages のサブパス公開に対応するため、
 * public/ 以下のファイルは必ずこの関数経由で参照します。
 * vite.config.ts の base が './' なので、どのサブパスでも同じコードで動きます。
 */
export const assetUrl = (path: string): string => {
  const base = import.meta.env.BASE_URL || './'
  const clean = path.replace(/^\//, '')
  return base.endsWith('/') ? base + clean : `${base}/${clean}`
}
