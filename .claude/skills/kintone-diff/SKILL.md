---
name: kintone-diff
description: 開発環境と本番環境のkintoneスキーマ差分を検出する。フィールド、ビュー、レイアウトの追加・変更・削除を比較表示。
argument-hint: [アプリ名] [--from=dev] [--to=prod]
---

# kintone Schema 差分検出スキル

開発環境と本番環境のkintoneアプリスキーマを比較し、差分を表示します。

## 前提条件

事前に両環境のスキーマを取得しておく必要があります：

```bash
# 開発環境のスキーマを取得
npm run schema
# または
KINTONE_ENV=dev npm run schema

# 本番環境のスキーマを取得
KINTONE_ENV=prod npm run schema
```

スキーマファイルは `.kintone/<app-name>/schema.<env>.json` に保存されます。

## 差分検出の実行

```bash
# デフォルト（dev vs prod）
npm run schema:diff

# 特定アプリのみ
npm run schema:diff -- <app-name>

# 環境を指定
KINTONE_ENV_FROM=staging KINTONE_ENV_TO=prod npm run schema:diff
```

## 検出される差分

- **追加されたフィールド**: 開発環境にのみ存在
- **削除されたフィールド**: 本番環境にのみ存在
- **型が変更されたフィールド**: 両環境で型が異なる
- **設定が変更されたフィールド**: ラベル、必須設定、選択肢など
- **ビューの差分**: ビューの追加/削除/変更
- **レイアウトの差分**: フォームレイアウトの変更

## 差分がある場合の対応

1. 差分を確認
2. 本番環境に反映が必要か判断
3. 以下のいずれかで反映：
   - `npm run schema:deploy` でスキーマデプロイ（推奨）
   - kintoneの管理画面から手動で反映
   - REST APIで個別に更新

## 手順

引数からアプリ名や環境を解析して適切なコマンドを実行してください。

1. スキーマファイルの存在を確認（`.kintone/<app-name>/schema.dev.json` と `schema.prod.json`）
2. ファイルがなければ取得を促す
3. `npm run schema:diff` を実行して差分を表示
4. 差分がある場合は対応方法を提案

## 使用例

```
/kintone-diff                    # 全アプリの差分を検出
/kintone-diff my-app             # 特定アプリの差分を検出
/kintone-diff --from=dev --to=prod  # 環境を明示的に指定
```

---

**ユーザーの指示**: $ARGUMENTS
