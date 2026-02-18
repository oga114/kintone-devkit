---
name: kintone-fields
description: kintoneアプリのフィールド一覧を表示する。スキーマJSONからフィールドコード、型、ラベル、必須設定などを一覧表示。
argument-hint: [アプリ名]
---

# kintone フィールド一覧表示スキル

指定されたアプリのフィールド情報を `.kintone/<app-name>/schema.*.json` から読み取り、一覧表示します。

## 手順

1. `.kintone/<app-name>/` ディレクトリからスキーマファイルを探す
2. 最新のスキーマファイルを読み込む
3. フィールド一覧を見やすく表示

スキーマファイルがない場合は `npm run schema -- <app-name>` の実行を促してください。

## 表示形式

| フィールドコード | 型 | ラベル | 必須 |
|-----------------|-----|--------|------|
| field_code      | SINGLE_LINE_TEXT | 名前 | ○ |

サブテーブル内のフィールドはインデントして表示してください。

## フィールド型の説明

| 型 | 説明 |
|-----|------|
| `SINGLE_LINE_TEXT` | 文字列（1行） |
| `MULTI_LINE_TEXT` | 文字列（複数行） |
| `RICH_TEXT` | リッチエディター |
| `NUMBER` | 数値 |
| `CALC` | 計算 |
| `DATE` | 日付 |
| `TIME` | 時刻 |
| `DATETIME` | 日時 |
| `DROP_DOWN` | ドロップダウン |
| `CHECK_BOX` | チェックボックス |
| `RADIO_BUTTON` | ラジオボタン |
| `MULTI_SELECT` | 複数選択 |
| `SUBTABLE` | テーブル |
| `USER_SELECT` | ユーザー選択 |
| `ORGANIZATION_SELECT` | 組織選択 |
| `GROUP_SELECT` | グループ選択 |
| `LINK` | リンク |
| `FILE` | 添付ファイル |
| `REFERENCE_TABLE` | 関連レコード一覧 |

## 使用例

```
/kintone-fields my-app          # アプリのフィールド一覧（dev環境のスキーマ）
/kintone-fields my-app prod     # 本番環境のスキーマからフィールド一覧
```

---

**ユーザーの指示**: $ARGUMENTS
