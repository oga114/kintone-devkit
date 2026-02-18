---
name: kintone-deploy
description: kintoneへのデプロイを実行する。カスタマイズ（JS/CSS）のアップロードと、スキーマ（フィールド/ビュー/レイアウト）の環境間デプロイの両方に対応。
argument-hint: [アプリ名|アプリID] [customize|schema] [--execute] [--from=dev] [--to=prod]
---

# kintone Deploy スキル

kintoneへのデプロイを実行します。2つのデプロイモードがあります：

1. **カスタマイズデプロイ**: JavaScript/CSSファイルをkintoneアプリにアップロード
2. **スキーマデプロイ**: フィールド・ビュー・レイアウトを環境間で同期

## 1. カスタマイズデプロイ（JS/CSS）

プロジェクトのビルド成果物をkintoneにアップロードします。

### プロジェクトスクリプト経由（推奨）

```bash
# ビルド＋アップロード
npm run build -- my-app
npm run upload -- my-app

# 開発モード（ファイル変更時に自動ビルド＆アップロード）
npm run dev -- my-app
```

### @kintone/customize-uploader 直接使用

```bash
npx @kintone/customize-uploader \
  --base-url "https://{DOMAIN}" \
  --username "{USER}" \
  --password "{PASSWORD}" \
  customize-manifest.json
```

### マニフェストファイル形式

```json
{
  "app": "123",
  "scope": "ALL",
  "desktop": {
    "js": ["dist/desktop.js"],
    "css": ["dist/style.css"]
  },
  "mobile": {
    "js": ["dist/mobile.js"],
    "css": []
  }
}
```

### プラグインのデプロイ

```bash
# プロジェクトスクリプト
npm run build:plugin -- my-plugin
npm run upload:plugin -- my-plugin

# 直接使用
npx @kintone/plugin-uploader \
  --base-url "https://{DOMAIN}" \
  --username "{USER}" \
  --password "{PASSWORD}" \
  dist/plugin.zip
```

## 2. スキーマデプロイ（フィールド/ビュー/レイアウト）

開発環境のスキーマ定義を本番環境（またはその逆）にデプロイします。

### デプロイの流れ

1. 引数から方向（--from/--to）を解析
2. 差分を検出してデプロイ計画を表示（ドライラン）
3. ユーザーが確認後、--execute オプション付きで実行

### コマンド例

```bash
# 開発 → 本番（ドライラン：確認のみ）
npm run schema:deploy

# 開発 → 本番（実行）
npm run schema:deploy -- --execute

# 本番 → 開発（ドライラン）
npm run schema:deploy -- --from prod --to dev

# 本番 → 開発（実行）
npm run schema:deploy -- --from prod --to dev --execute

# 特定アプリのみ
npm run schema:deploy -- my-app --execute
```

### デプロイされる内容

- **フィールド**: 追加、更新、削除
- **ビュー**: 追加、更新、削除
- **レイアウト**: フォームレイアウトの同期

### 注意事項

- システムフィールド（レコード番号、作成者など）は変更されません
- フィールドの型は変更できません（kintone APIの制約）
- 本番環境への反映前に必ずドライランで確認してください

### 事前準備

両環境のスキーマを取得しておく必要があります：

```bash
npm run schema                    # 開発環境
KINTONE_ENV=prod npm run schema   # 本番環境
```

## トラブルシューティング

| 問題 | 対処 |
|------|------|
| 認証エラー | ユーザー名/パスワードを確認 |
| ファイルが見つからない | マニフェストのパスを確認 |
| 権限エラー | アプリ管理権限があるか確認 |
| 反映されない | ブラウザキャッシュをクリア |
| フィールド型変更エラー | 型は変更不可。フィールドを削除→再作成 |

## 使用例

```
/kintone-deploy my-app                          # カスタマイズをデプロイ
/kintone-deploy my-app schema                   # スキーマのドライラン
/kintone-deploy my-app schema --execute         # スキーマを実行
/kintone-deploy schema --from prod --to dev     # 本番→開発にスキーマ同期
```

引数が指定されていれば、そのアプリのみを対象にしてください。
--from/--to が指定されていればその方向を使用し、なければ dev → prod をデフォルトとします。
ユーザーが「実行」を希望した場合のみ --execute を付けてください。

---

**ユーザーの指示**: $ARGUMENTS
