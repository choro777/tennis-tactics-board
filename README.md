# テニス戦術ボード

テニスコート専用のホワイトボード。コート上にキャラクター・ボール・配球・移動矢印・
ペン・図形・テキストを自由に配置して、1枚の戦術図をつくり、PNG画像として保存・共有できます。

- フロントエンドのみ（バックエンド・ログイン不要）
- React + TypeScript + Vite + Tailwind CSS + Zustand
- 描画は SVG
- GitHub Pages にそのまま公開できます

## 開発

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # dist/ を出力
npm run preview    # ビルド結果の確認
npm run typecheck  # 型チェック（ビルドとは分離してあるので、デプロイを止めません）
```

## GitHub Pages への公開

1. GitHub にリポジトリを作って push する

   ```bash
   git init
   git add .
   git commit -m "first commit"
   git branch -M main
   git remote add origin https://github.com/<ユーザー名>/<リポジトリ名>.git
   git push -u origin main
   ```

2. GitHub のリポジトリ画面で **Settings → Pages → Build and deployment → Source** を
   **GitHub Actions** に変更する

3. 以降は `git push` するたびに `.github/workflows/deploy.yml` が動いて自動デプロイされます

   ```
   git push → GitHub Actions → GitHub Pages → https://<ユーザー名>.github.io/<リポジトリ名>/
   ```

### サブパス公開について

`vite.config.ts` の `base` は `'./'`（相対パス）にしてあります。
そのため `https://<ユーザー名>.github.io/<リポジトリ名>/` のようなサブパスでも、
**リポジトリ名をコードに書く必要がありません**。リポジトリ名を変えても設定変更は不要です。

絶対パスにしたい場合だけ環境変数で上書きできます。

```bash
VITE_BASE=/my-repo/ npm run build
```

## キャラクターの追加

`38体` という数字はコードにハードコードしていません。すべて
`src/data/characters.ts` の配列から自動生成されます。

1. `public/characters/` に画像を置く（例: `ch39.png`）
2. `src/data/characters.ts` の `CHARACTER_DEFS` に 1 行足す

   ```ts
   { id: 'ch39', name: '新キャラ' },
   ```

これだけで、一覧UI・配置処理・保存処理・PNG出力すべてに反映されます。
アプリ本体のロジック変更は不要です。

画像がまだ無い場合は、色付きの丸＋番号のプレースホルダーが自動表示されます。

## 使い方

| ツール | 操作 |
| --- | --- |
| 選択 | タップで選択 / ドラッグで移動 / 何もない所をドラッグでパン |
| キャラ | 一覧で選んでからコートをタップ（上半分＝相手、下半分＝自分） |
| ボール | コートをタップ |
| 配球 | 始点から終点へドラッグ。球種・強さ・曲がりは右パネルで設定 |
| 移動 | キャラクターの上からドラッグして移動矢印を引く |
| ペン / ハイライト | ドラッグで自由描画（ハイライトは半透明） |
| 矢印 / 直線 / 円 / 四角 | ドラッグで作成 |
| テキスト | タップして文字を入力 |
| 消しゴム | タップ / なぞって削除 |

- 拡大縮小: マウスホイール、ピンチ、右下の ＋ − ボタン
- パン: 何もない所をドラッグ、Alt+ドラッグ、中ボタンドラッグ、2本指ドラッグ
- Undo / Redo: ヘッダーのボタン、`Ctrl/⌘ + Z` / `Ctrl/⌘ + Shift + Z`
- 削除: `Delete` / `BackSpace`
- 画像出力: ヘッダーの「画像」→ サイズを選んで「画像として保存」または「画像を共有」

### 球種と色

| 球種 | 色 |
| --- | --- |
| トップスピン | 赤 `#FF0000` |
| スライス | 青 `#0000FF` |
| フラット | 紫 `#800080` |
| ロブ | 黄 `#FFD700` |
| ドロップ | 灰 `#808080` |

## 構成

```
src/
├── types.ts                 データモデル（正規化座標 0〜1）
├── data/characters.ts       キャラクター定義（ここを増やすだけで拡張できる）
├── lib/
│   ├── board.ts             コート実寸・座標変換・サイズ定義
│   ├── geometry.ts          曲線・矢印・外接矩形などの計算
│   ├── shot.ts              球種の色とラベル
│   ├── exportImage.ts       PNG出力 / Web Share API
│   ├── assets.ts            base パス対応
│   └── imageStatus.ts       画像未配置時のフォールバック
├── store/useBoardStore.ts   Zustand ストア（Undo / Redo 込み）
└── components/
    ├── board/               SVG のレイヤー群
    └── ...                  ツールバー / プロパティ / 出力ダイアログ
```

### レイヤー順

`Background → Court → Drawing → Movement → Shot → Ball → Character → Text`

キャラクターとボールは配球ラインより上に描かれます。
