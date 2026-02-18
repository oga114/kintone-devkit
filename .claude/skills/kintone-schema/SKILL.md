---
name: kintone-schema
description: kintoneアプリのスキーマ（設計情報）を取得する。プロジェクトスクリプト（npm run schema）または直接REST APIでフィールド、レイアウト、ビュー情報を取得。
argument-hint: [アプリ名|アプリID] [取得情報: fields|layout|views|app|dts|all] [--env=dev|prod]
---

# kintone Schema 取得スキル

kintoneアプリの設計情報（フィールド、ビュー、レイアウト）を取得します。

## 方法1: プロジェクトスクリプト経由（推奨）

このプロジェクトには `npm run schema` スクリプトが用意されています。
`kintone.config.ts` に登録されたアプリ名で指定できます。

### 実行コマンド

```bash
# 開発環境（デフォルト）
npm run schema -- <app-name>

# 本番環境
KINTONE_ENV=prod npm run schema -- <app-name>

# 全アプリ
npm run schema
```

### 保存先

`.kintone/<app-name>/schema.<env>.json` に保存されます。

### 取得される情報

- **アプリ設定**: 名前、説明、アイコンなど
- **フィールド情報**: フィールドコード、型、ラベル、設定
- **フォームレイアウト**: フィールドの配置
- **ビュー設定**: 一覧の設定

### 手順

1. 引数からアプリ名と環境を解析
2. 指定された環境のスキーマを取得
3. `.kintone/<app-name>/schema.<env>.json` に保存

引数が指定されていれば、そのアプリのみを対象にしてください。
環境が指定されていれば、KINTONE_ENV環境変数を設定して実行してください。

## 方法2: REST API 直接呼び出し

`kintone.config.ts` に未登録のアプリや、アプリIDで直接指定したい場合に使用します。

### 事前準備

プロジェクトの`.env`ファイルから以下の情報を取得してください：

**必須項目**:
- `KINTONE_URL` または `KINTONE_DOMAIN`: kintoneのURL/ドメイン
- 認証情報（以下のいずれか）:
  - `KINTONE_USER` + `KINTONE_PASSWORD`: ユーザー認証
  - `KINTONE_API_TOKEN`: APIトークン認証

### 認証ヘッダーの生成

```bash
# Basic認証（ユーザー名/パスワード）
AUTH_HEADER="X-Cybozu-Authorization: $(echo -n '{USER}:{PASSWORD}' | base64)"

# APIトークン認証
AUTH_HEADER="X-Cybozu-API-Token: {API_TOKEN}"
```

### 取得可能な情報

| 種類 | 説明 | API エンドポイント |
|------|------|-------------------|
| **fields** | フィールド一覧・型情報 | `/k/v1/app/form/fields.json` |
| **layout** | フォームレイアウト | `/k/v1/app/form/layout.json` |
| **views** | ビュー（一覧）設定 | `/k/v1/app/views.json` |
| **app** | アプリ基本情報 | `/k/v1/app.json` |
| **dts** | TypeScript型定義生成 | @kintone/dts-gen使用 |
| **all** | 上記すべて | - |

### 実行コマンド

```bash
# フィールド情報
curl -s "https://{DOMAIN}/k/v1/app/form/fields.json?app={APP_ID}" \
  -H "{AUTH_HEADER}" | jq .

# フォームレイアウト
curl -s "https://{DOMAIN}/k/v1/app/form/layout.json?app={APP_ID}" \
  -H "{AUTH_HEADER}" | jq .

# ビュー情報
curl -s "https://{DOMAIN}/k/v1/app/views.json?app={APP_ID}" \
  -H "{AUTH_HEADER}" | jq .

# アプリ基本情報
curl -s "https://{DOMAIN}/k/v1/app.json?id={APP_ID}" \
  -H "{AUTH_HEADER}" | jq .
```

### TypeScript型定義生成

```bash
npx @kintone/dts-gen \
  --base-url "https://{DOMAIN}" \
  -u "{USER}" \
  -p "{PASSWORD}" \
  --app-id {APP_ID} \
  --type-name "App{APP_ID}Fields" \
  -o "types/kintone-app-{APP_ID}.d.ts"
```

## 出力フォーマット

取得したフィールド情報は以下の形式で整理して報告：

| フィールドコード | 型 | ラベル | 必須 | 備考 |
|-----------------|-----|--------|------|------|
| `field_code` | SINGLE_LINE_TEXT | フィールド名 | ○ | - |

## kintoneフィールドタイプ一覧

| タイプ | 説明 |
|--------|------|
| SINGLE_LINE_TEXT | 文字列（1行） |
| MULTI_LINE_TEXT | 文字列（複数行） |
| RICH_TEXT | リッチエディター |
| NUMBER | 数値 |
| CALC | 計算 |
| CHECK_BOX | チェックボックス |
| RADIO_BUTTON | ラジオボタン |
| DROP_DOWN | ドロップダウン |
| MULTI_SELECT | 複数選択 |
| DATE | 日付 |
| TIME | 時刻 |
| DATETIME | 日時 |
| LINK | リンク |
| USER_SELECT | ユーザー選択 |
| ORGANIZATION_SELECT | 組織選択 |
| GROUP_SELECT | グループ選択 |
| FILE | 添付ファイル |
| SUBTABLE | テーブル |
| REFERENCE_TABLE | 関連レコード一覧 |
| RECORD_NUMBER | レコード番号 |
| CREATOR | 作成者 |
| CREATED_TIME | 作成日時 |
| MODIFIER | 更新者 |
| UPDATED_TIME | 更新日時 |
| STATUS | ステータス |
| STATUS_ASSIGNEE | 作業者 |
| CATEGORY | カテゴリー |

## 使用例

```
/kintone-schema my-app              # プロジェクトスクリプトでスキーマ取得
/kintone-schema my-app --env=prod   # 本番環境のスキーマ取得
/kintone-schema 123 fields          # アプリ123のフィールド一覧（API直接）
/kintone-schema 123 layout          # アプリ123のフォームレイアウト
/kintone-schema 123 views           # アプリ123のビュー設定
/kintone-schema 123 all             # アプリ123の全情報取得
```

## アプリID確認方法

kintoneアプリのURLからアプリIDを確認：
```
https://{domain}.cybozu.com/k/{APP_ID}/
                              ^^^^^^^^
                              この数字がアプリID
```

## トラブルシューティング

| エラー | 原因 | 対処 |
|--------|------|------|
| 401 Unauthorized | 認証失敗 | 認証情報を確認 |
| 403 Forbidden | アクセス権限なし | APIトークンの権限設定を確認 |
| 404 Not Found | アプリが存在しない | アプリIDを確認 |
| CBNT... エラー | kintone固有エラー | エラーコードを検索 |

---

**ユーザーの指示**: $ARGUMENTS
