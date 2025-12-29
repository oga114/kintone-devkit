---
description: kintoneアプリのフィールド一覧を表示
allowed-tools: Read, Glob, Bash(npm run schema:*)
argument-hint: [app-name]
---

# kintoneフィールド一覧

指定されたアプリのフィールド情報を `.kintone/<app-name>/schema.*.json` から読み取り、一覧表示します。

## 使用方法

引数: $ARGUMENTS

### 手順

1. `.kintone/<app-name>/` ディレクトリからスキーマファイルを探す
2. 最新のスキーマファイルを読み込む
3. フィールド一覧を見やすく表示

### 表示形式

| フィールドコード | 型 | ラベル | 必須 |
|-----------------|-----|--------|------|
| field_code      | SINGLE_LINE_TEXT | 名前 | ○ |

### フィールド型の説明

- `SINGLE_LINE_TEXT`: 文字列（1行）
- `MULTI_LINE_TEXT`: 文字列（複数行）
- `NUMBER`: 数値
- `CALC`: 計算
- `DATE`: 日付
- `DATETIME`: 日時
- `DROP_DOWN`: ドロップダウン
- `CHECK_BOX`: チェックボックス
- `RADIO_BUTTON`: ラジオボタン
- `SUBTABLE`: テーブル
- `USER_SELECT`: ユーザー選択
- `LINK`: リンク
- `FILE`: 添付ファイル

スキーマファイルがない場合は `npm run schema -- <app-name>` の実行を促してください。
