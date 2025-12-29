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
| `npm run schema` | アプリスキーマを取得（全アプリ） |
| `npm run schema -- <app>` | アプリスキーマを取得（特定アプリ） |
| `npm run schema:diff` | 環境間のスキーマ差分を検出 |
| `npm run schema:deploy` | スキーマを別環境にデプロイ（ドライラン） |
| `npm run schema:deploy -- --execute` | スキーマを別環境にデプロイ（実行） |
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

### 6. スキーマ（設計情報）の取得

kintoneアプリのフィールド、ビュー、レイアウト情報を取得してJSONファイルに保存します。

```bash
# 開発環境のスキーマを取得
npm run schema

# 本番環境のスキーマを取得
KINTONE_ENV=prod npm run schema

# 特定のアプリのみ
npm run schema -- my-app
```

取得したスキーマは`.kintone/<appName>/schema.<env>.json`に保存されます。

### 7. 環境間のスキーマ差分を検出

開発環境と本番環境のスキーマを比較して差分を表示します。

```bash
# 事前に両環境のスキーマを取得
KINTONE_ENV=dev npm run schema
KINTONE_ENV=prod npm run schema

# 差分を検出
npm run schema:diff
```

### 8. スキーマを別環境にデプロイ

開発環境のフィールド、ビュー、レイアウトを本番環境に反映します。

```bash
# ドライラン（確認のみ、変更は行わない）
npm run schema:deploy

# 実行（実際にデプロイ）
npm run schema:deploy -- --execute

# 方向を指定（本番 → 開発）
npm run schema:deploy -- --from prod --to dev

# 特定アプリのみデプロイ
npm run schema:deploy -- my-app --execute
```

**デプロイされる内容:**

| 項目 | 追加 | 更新 | 削除 |
|------|------|------|------|
| フィールド | ○ | ○（ラベル、設定のみ） | ○ |
| ビュー | ○ | ○ | ○ |
| レイアウト | - | ○ | - |

**注意事項:**

- システムフィールド（レコード番号、作成者など）は変更されません
- フィールドの型は変更できません（kintone APIの制約）
- 本番環境へ反映する前に必ずドライランで確認してください
- カスタマイズ（JS/CSS）は同期されません（アプリID依存のため）

## 環境変数の設定

`.env`ファイルに以下を設定：

```env
# kintone環境設定
KINTONE_BASE_URL=https://your-domain.cybozu.com
KINTONE_USERNAME=your-username
KINTONE_PASSWORD=your-password

# または APIトークンを使用
# KINTONE_API_TOKEN=your-api-token

# 環境識別子（スキーマ取得時に使用）
KINTONE_ENV=dev

# アプリIDの設定（npm run createで自動追加）
MY_APP_ID=123
```

## マルチ環境対応

開発環境と本番環境を分離して運用できます。2つのパターンに対応しています。

### ケース1: 同一アカウント内でスペース分離

同じkintoneアカウント内で、開発用スペースと本番用スペースに別々のアプリがある場合の設定です。

```
例: https://example.cybozu.com
    ├── 開発スペース
    │   └── 顧客管理アプリ (ID: 100)  ← 開発・テスト用
    └── 本番スペース
        └── 顧客管理アプリ (ID: 200)  ← 本番運用
```

**.env設定例:**

```env
# 接続設定（開発/本番で共通）
KINTONE_BASE_URL=https://example.cybozu.com
KINTONE_USERNAME=admin@example.com
KINTONE_PASSWORD=password

# 本番環境の接続設定は省略（開発環境と同じ値を使用）

# アプリIDを環境別に設定
CUSTOMER_APP_DEV_ID=100
CUSTOMER_APP_PROD_ID=200
```

**運用フロー:**

```bash
# 開発環境のスキーマを取得
npm run schema

# 本番環境のスキーマを取得（接続先は同じ、アプリIDが異なる）
KINTONE_ENV=prod npm run schema

# 差分を比較
npm run schema:diff
```

### ケース2: アカウント分離

開発環境と本番環境で別々のkintoneアカウント（サブドメイン）を使用する場合の設定です。

```
開発: https://dev.cybozu.com
      └── 顧客管理アプリ (ID: 100)

本番: https://prod.cybozu.com
      └── 顧客管理アプリ (ID: 100)  ← 同じIDでもOK
```

**.env設定例:**

```env
# 開発環境の接続設定
KINTONE_BASE_URL=https://dev.cybozu.com
KINTONE_USERNAME=dev-admin@example.com
KINTONE_PASSWORD=dev-password

# 本番環境の接続設定（別アカウント）
KINTONE_PROD_BASE_URL=https://prod.cybozu.com
KINTONE_PROD_USERNAME=prod-admin@example.com
KINTONE_PROD_PASSWORD=prod-password

# アプリID（両環境で同じIDの場合）
CUSTOMER_APP_DEV_ID=100
# CUSTOMER_APP_PROD_ID を省略すると DEV_ID が使用される
```

**運用フロー:**

```bash
# 開発環境のスキーマを取得
npm run schema

# 本番環境のスキーマを取得（別アカウントに接続）
KINTONE_ENV=prod npm run schema

# 差分を比較
npm run schema:diff
```

### フォールバック動作

| 設定 | 値がある場合 | 省略時 |
|------|-------------|--------|
| `KINTONE_PROD_BASE_URL` | その値を使用 | `KINTONE_BASE_URL`を使用 |
| `KINTONE_PROD_USERNAME` | その値を使用 | `KINTONE_USERNAME`を使用 |
| `KINTONE_PROD_PASSWORD` | その値を使用 | `KINTONE_PASSWORD`を使用 |
| `<APP>_PROD_ID` | その値を使用 | `<APP>_DEV_ID`または`<APP>_ID`を使用 |

これにより、ケース1では本番用接続設定を省略でき、ケース2では完全に分離した設定が可能です。

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

## Claude Codeカスタムコマンド

Claude Codeで使用できるカスタムコマンドが`.claude/commands/`に定義されています。

| コマンド | 説明 |
|---------|------|
| `/kintone-schema` | アプリのスキーマを取得 |
| `/kintone-diff` | 環境間のスキーマ差分を検出 |
| `/kintone-fields` | フィールド一覧を表示 |
| `/kintone-deploy` | スキーマを別環境にデプロイ |

## ライセンス

MIT
