# dotirast

CLI からドット絵を描き、ブラウザでリアルタイムに表示するピクセルアートツール。

## Features

- **CLI でドット配置** — ターミナルからコマンドで 1 ドットずつ描画
- **ブラウザでリアルタイム表示** — WebSocket で即座に反映
- **ターミナル表示** — ANSI カラーでターミナル上にも描画
- **PNG 保存** — ブラウザ UI からワンクリックで PNG ダウンロード
- **複数キャンバス** — 16x16 / 32x32 のキャンバスを複数管理
- **認証** — トークンベースの簡易認証（無効化も可能）

## Quick Start

```bash
# インストール
npm install
npm run build
npm link

# キャンバスを作成
dotirast new myart

# サーバーを起動（ブラウザで http://localhost:3000 を開く）
dotirast serve --no-auth

# ドットを配置
dotirast place 5 5 "#10b981"
dotirast place 6 5 "#0d9488"

# ターミナルで確認
dotirast show
```

## CLI Commands

| コマンド | 説明 |
|---|---|
| `dotirast new <name> [-s 16\|32]` | 新しいキャンバスを作成（デフォルト 16x16） |
| `dotirast place <x> <y> <color>` | 指定座標にドットを配置 |
| `dotirast clear <x> <y>` | 指定座標のドットを消去 |
| `dotirast reset` | キャンバス全体をクリア |
| `dotirast show` | ターミナルにキャンバスを表示 |
| `dotirast list` | キャンバス一覧を表示 |
| `dotirast serve [--no-auth]` | ブラウザ表示用サーバーを起動 |

## Architecture

```
src/
├── cli/           # Commander.js ベースの CLI
│   └── commands/  # 各コマンドの実装
├── server/        # Express + WebSocket サーバー
├── public/        # ブラウザ UI（HTML / CSS / JS）
└── shared/        # キャンバスデータの永続化・型定義
```

- **データ保存先**: `~/.dotirast/canvases/` に JSON ファイルとして永続化
- **リアルタイム通信**: WebSocket でサーバーからブラウザへ変更をプッシュ
- **PNG エクスポート**: HTML5 Canvas API によるクライアントサイド生成

## Tech Stack

- TypeScript / Node.js
- Express 5 + ws (WebSocket)
- Commander.js (CLI)
- tsup (ビルド)

## License

MIT
