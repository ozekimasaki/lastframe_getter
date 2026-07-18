# Last Frame Getter

動画（MP4 / WebM）の指定したフレームを PNG 画像として書き出すブラウザ完結型の Web ツールです。動画ファイルはサーバーにアップロードされず、すべてブラウザ上で処理されます。

公開 URL: <https://lastframe.umaibo.dev/>

## 主な機能

- **ドラッグ＆ドロップ / ファイル選択**による動画の読み込み（対応形式: `mp4`, `webm`）
- 動画の読み込み後、**自動的に最終フレームを抽出**してプレビュー表示
- **FPS**（1〜120）と**フレーム番号**の指定によって任意のフレームを選択（数値入力・スライダー対応）
- 選択したフレームを **PNG 画像としてダウンロード**（ファイル名は `<元動画名>-frame-<番号>.png`）
- すべてブラウザ内（`<video>` + `<canvas>`）で処理され、動画ファイルは外部に送信されない
- キーボード操作（ドロップゾーンで Enter / Space でファイル選択を開く）などのアクセシビリティ対応

## 動作要件

- Node.js **20.19+** または **22.12+**（Vite 7 の要件）
- npm

## インストール

```bash
npm install
```

## 使い方（ローカル開発）

Vite 開発サーバーを起動します。

```bash
npm run dev
```

Cloudflare Workers 環境をローカルで再現して確認したい場合は、ビルド後に Wrangler の開発サーバーを利用できます。

```bash
npm run build
npm run dev:wrangler
```

## 開発コマンド

| コマンド | 説明 |
| --- | --- |
| `npm run dev` | Vite 開発サーバーを起動（HMR 有効） |
| `npm run build` | 型チェック（`tsc -b`）後に本番ビルドを実行。出力先は `dist/client` |
| `npm run preview` | ビルド成果物をローカルでプレビュー |
| `npm run lint` | ESLint によるコードチェック |
| `npm run deploy` | ビルド後に Cloudflare Workers へデプロイ（`wrangler deploy`） |
| `npm run dev:wrangler` | Wrangler のローカル開発サーバーを起動（`wrangler dev`） |

> 型チェックだけを行う専用コマンドはありません。`npm run build` の `tsc -b` で型チェックが実行されます。

## 構成

```
.
├── index.html            # エントリ HTML（メタ情報・OGP・構造化データを含む）
├── src/
│   ├── main.tsx          # React アプリのエントリポイント
│   ├── App.tsx           # メイン UI とフレーム抽出ロジック
│   ├── worker.ts         # Cloudflare Workers エントリ（静的アセット配信 + SPA フォールバック）
│   ├── App.css / index.css
│   └── vite-env.d.ts
├── public/               # 静的アセット（favicon, OGP 画像, sitemap, robots など）
├── vite.config.ts        # Vite 設定（React プラグイン, 出力先 dist/client）
├── wrangler.toml         # Cloudflare Workers 設定（アセットバインディング, カスタムドメイン）
├── eslint.config.js      # ESLint フラット設定
├── tsconfig*.json        # TypeScript 設定（app / node に分割）
└── package.json
```

### 技術スタック

- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite 7](https://vite.dev/)（`@vitejs/plugin-react`）
- [Cloudflare Workers](https://developers.cloudflare.com/workers/) + [Wrangler](https://developers.cloudflare.com/workers/wrangler/)（ホスティング / デプロイ）
- [ESLint 9](https://eslint.org/)（`typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`）

### デプロイの仕組み

`vite build` でクライアント資産を `dist/client` に出力し、`src/worker.ts` の Worker がそれらを `ASSETS` バインディング経由で配信します。存在しないパスへの GET リクエストは `/index.html` にフォールバックし、SPA として動作します。`wrangler.toml` では `lastframe.umaibo.dev` をカスタムドメインとして設定しています。

## ライセンス

リポジトリにライセンスファイルは含まれていません。
