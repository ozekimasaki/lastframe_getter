# AGENTS.md

このリポジトリでコーディングエージェントが作業する際のガイドです。

## プロジェクト概要

Last Frame Getter は、動画（MP4 / WebM）の指定フレームを PNG 画像として書き出すブラウザ完結型の Web ツールです。動画処理は `<video>` と `<canvas>` を用いてすべてクライアント側で行われ、ファイルは外部送信されません。React 19 + TypeScript + Vite で構築され、Cloudflare Workers 上でホスティングされています。

## プロジェクト構成 / エントリポイント

- `index.html` — HTML エントリ。メタ情報・OGP・JSON-LD 構造化データを含む。`/src/main.tsx` を読み込む。
- `src/main.tsx` — React アプリのエントリポイント。`#root` に `App` をマウント。
- `src/App.tsx` — メイン UI と中心ロジック。ファイル読み込み（ドロップ / ファイル選択）、`<video>` のシーク、`<canvas>` へ描画して PNG を生成、ダウンロード処理を実装。
- `src/worker.ts` — Cloudflare Workers のエントリ。`ASSETS` バインディングで静的アセットを配信し、404 の GET は `/index.html` にフォールバック（SPA 対応）。
- `src/App.css` / `src/index.css` — スタイル。
- `public/` — 静的アセット（favicon, `get_ogp.png`, `sitemap.xml`, `robots.txt`, `manifest.webmanifest` など）。

## セットアップ

```bash
npm install
```

- Node.js は **20.19+** または **22.12+** が必要（Vite 7 の要件）。
- パッケージマネージャは npm（`package-lock.json` が存在）。依存を追加する場合は `package-lock.json` も更新すること。

## ビルド / テスト / lint / 型チェック

実在するコマンドは `package.json` の `scripts` に定義されているもののみ:

- `npm run dev` — Vite 開発サーバー（HMR）。
- `npm run build` — `tsc -b` で型チェック後に `vite build`。出力は `dist/client`。
- `npm run preview` — ビルド成果物のプレビュー。
- `npm run lint` — `eslint .` を実行。
- `npm run deploy` — `vite build && wrangler deploy`（Cloudflare Workers へデプロイ、認証が必要）。
- `npm run dev:wrangler` — `wrangler dev`（ローカルの Workers 実行。事前に `npm run build` が必要）。

補足:

- **型チェック専用のスクリプトはない**。型チェックは `npm run build` に含まれる `tsc -b` で行う。
- **テストフレームワークやテストスクリプトは存在しない**。テストを追加するよう明示的に指示されていない限り、テストコマンドを前提にしないこと。
- 変更後は少なくとも `npm run lint` と `npm run build` を実行して通ることを確認する。

## コーディング規約

- 言語は **TypeScript**（`strict: true`）。`any` は使用しない。`noUnusedLocals` / `noUnusedParameters` が有効なため、未使用の変数・引数を残さない。
- **インデントはタブ**（`src/App.tsx`, `src/worker.ts` 参照）。設定ファイル（`eslint.config.js`, `tsconfig*.json` など）はスペース 2 が使われている。既存ファイルのスタイルに合わせること。
- 文字列はシングルクォート、セミコロンなしのスタイルがソースで使われている。周囲のコードに合わせる。
- React は関数コンポーネント + Hooks。`eslint-plugin-react-hooks` と `eslint-plugin-react-refresh` が有効。
- UI テキスト・コメントは日本語で書かれている。既存のトーンに合わせる。
- ESLint はフラット設定（`eslint.config.js`）。`dist` は lint 対象外。

## 注意点

- 現在 `npm run lint` は `src/App.tsx` の `useEffect` に関する **warning が 2 件**存在する（`react-hooks/exhaustive-deps`）。エラーではないが、依存配列を変更する際は挙動を理解した上で行うこと。
- 動画処理はブラウザ API（`<video>` / `<canvas>` / `URL.createObjectURL`）に依存する。`URL.createObjectURL` で生成した Object URL は `revokeObjectURL` で確実に解放すること（既存コードはこれを行っている）。
- 対応形式は `mp4` と `webm` のみ（`accept` 属性とドロップ時の MIME チェックで制限）。
- Git フックや pre-commit の設定はない（`.husky/` や `.pre-commit-config.yaml` は存在しない）。
- ビルド出力先は `dist/client`（`vite.config.ts`）で、`wrangler.toml` の `[assets] directory` と一致している。片方を変更する場合は両方を合わせること。
- デプロイ（`npm run deploy`）は Cloudflare の認証情報が必要。認証なしで実行しないこと。
- カスタムドメイン `lastframe.umaibo.dev` は `wrangler.toml` に設定されている。
