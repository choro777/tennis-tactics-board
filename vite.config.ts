import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * GitHub Pages 対応。
 *
 * base は既定で './'（相対パス）にしています。
 * こうしておくと
 *   https://<user>.github.io/<repo>/
 * のようなサブパス公開でも、リポジトリ名をコードに書かずにそのまま動きます。
 * リポジトリ名を変更しても設定変更は不要です。
 *
 * 絶対パスにしたい場合だけ、環境変数で上書きしてください。
 *   VITE_BASE=/my-repo/ npm run build
 */
export default defineConfig({
  base: process.env.VITE_BASE ?? './',
  plugins: [react(), tailwindcss()],
})
