# Kintone Customize Vite

TypeScript対応のkintoneカスタマイズ開発環境です。Viteによる高速ビルド、ホットリロード、複数アプリの管理機能を提供します。

## 特徴

- **TypeScript対応**: 型安全なkintoneカスタマイズ開発
- **高速ビルド**: Viteによる高速なビルド
- **ホットリロード**: ファイル変更を検知して自動ビルド＆アップロード
- **複数アプリ管理**: 複数のkintoneアプリを一つのプロジェクトで管理
- **既存ファイル保持**: kintone上の既存ファイルを同期して保持
- **対話式セットアップ**: `npm run create`で新規アプリを即座に作成

## クイックスタート

### 初回セットアップ

```bash
# 1. 依存パッケージをインストール
npm install

# 2. 環境設定ファイルを作成
cp .env.example .env

# 3. .envファイルを編集してkintone環境情報を設定
```

### 開発を始める

```bash
# アプリを対話的に作成
npm run create

# 開発モードで起動（ホットリロード）
npm run dev -- my-app
```

## ディレクトリ構造

```
kintone-customize-vite/
├── src/
│   ├── apps/                    # カスタマイズソースコード
│   │   ├── my-app/
│   │   │   ├── index.ts         # エントリーポイント
│   │   │   └── style.css        # スタイル
│   │   └── another-app/
│   │       ├── index.ts
│   │       └── style.css
│   └── types/
│       └── kintone.d.ts         # kintone型定義
├── dist/                        # ビルド出力
│   └── my-app/
│       ├── my-app.js
│       └── my-app.css
├── .kintone/                    # 同期された既存ファイル
│   └── my-app/
│       ├── manifest.json
│       └── existing.js
├── scripts/                     # ビルド・管理スクリプト
├── kintone.config.ts            # アプリ設定
├── vite.config.ts               # Vite設定
├── tsconfig.json                # TypeScript設定
├── .env                         # 環境変数（要作成）
└── .env.example                 # 環境変数テンプレート
```

## コマンド一覧

| コマンド | 説明 |
|---------|------|
| `npm run create` | 新しいアプリを対話的に作成 |
| `npm run remove` | アプリを削除 |
| `npm run dev` | 開発モード（全アプリ） |
| `npm run dev -- <app>` | 開発モード（特定アプリ） |
| `npm run build` | 本番ビルド（全アプリ） |
| `npm run build -- <app>` | 本番ビルド（特定アプリ） |
| `npm run upload` | アップロード（全アプリ） |
| `npm run upload -- <app>` | アップロード（特定アプリ） |
| `npm run sync` | 既存ファイルを同期（全アプリ） |
| `npm run sync -- <app>` | 既存ファイルを同期（特定アプリ） |
| `npm run typecheck` | TypeScript型チェック |

## 使い方

### 1. 新規アプリを作成

```bash
npm run create
```

対話形式でアプリ名とkintoneアプリIDを入力すると、以下が自動生成されます：

- `src/apps/<appName>/index.ts` - エントリーポイント
- `src/apps/<appName>/style.css` - スタイル
- `.env`への設定追加
- `kintone.config.ts`への設定追加

### 2. 開発モード（ホットリロード）

ファイルの変更を監視して、自動的にビルド＆kintoneへアップロードします。

```bash
# 全てのアプリ
npm run dev

# 特定のアプリのみ
npm run dev -- my-app

# 複数のアプリ（カンマ区切り）
npm run dev -- my-app,another-app
```

### 3. 本番用ビルド

```bash
# 全てのアプリ
npm run build

# 特定のアプリのみ
npm run build -- my-app
```

### 4. 既存ファイルの同期

kintoneに既にアップロードされているJS/CSSファイルをダウンロードします。

```bash
# 全てのアプリ
npm run sync

# 特定のアプリのみ
npm run sync -- my-app
```

同期されたファイルは`.kintone/<appName>/`に保存され、以降のアップロード時に自動的に再アップロードされます。

### 5. アプリの削除

```bash
npm run remove
```

## 環境変数の設定

`.env`ファイルに以下を設定：

```env
# kintone環境設定
KINTONE_BASE_URL=https://your-domain.cybozu.com
KINTONE_USERNAME=your-username
KINTONE_PASSWORD=your-password

# または APIトークンを使用
# KINTONE_API_TOKEN=your-api-token

# アプリIDの設定（npm run createで自動追加）
MY_APP_ID=123
```

## TypeScriptでの開発

kintoneの型定義が`src/types/kintone.d.ts`に含まれています。

```typescript
// src/apps/my-app/index.ts
import './style.css';

(() => {
  'use strict';

  kintone.events.on('app.record.index.show', (event) => {
    console.log('レコード一覧を表示:', event.records);
    return event;
  });

  kintone.events.on('app.record.detail.show', (event) => {
    const record = event.record;
    if (record) {
      console.log('レコードID:', record.$id?.value);
    }
    return event;
  });
})();
```

## ビルドの仕組み

- **開発モード**: 難読化なし、ソースマップあり
- **本番モード**: Terserで難読化、ソースマップなし

ビルドされたファイルは以下の形式で出力：
- `dist/<appName>/<appName>.js`
- `dist/<appName>/<appName>.css`

## 既存ファイルの保持

アップロード時、以下の順序でファイルが設定されます：

1. 同期されたFILEファイル（既存のカスタマイズ）
2. URL型ファイル（CDNなど）
3. 新しいビルドファイル

## トラブルシューティング

### アップロードエラー

- `.env`ファイルのkintone接続情報を確認
- アプリIDが正しいか確認
- アプリ管理権限があるか確認

### ビルドエラー

```bash
# node_modulesを再インストール
rm -rf node_modules && npm install

# Viteのキャッシュをクリア
rm -rf node_modules/.vite
```

### 型エラー

```bash
# 型チェックを実行
npm run typecheck
```

## ライセンス

MIT
