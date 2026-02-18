---
name: kintone-record
description: kintone REST APIでレコードのCRUD操作を実行する。レコードの取得、作成、更新、削除をCLIから実行。
argument-hint: [操作: get|create|update|delete] [アプリID] [条件/データ]
---

# kintone Record 操作スキル

kintone REST APIを使用してレコードのCRUD操作を実行します。

## 事前準備

プロジェクトの`.env`ファイルから認証情報を取得してください：

- `KINTONE_URL` / `KINTONE_DOMAIN`
- `KINTONE_USER` + `KINTONE_PASSWORD` または `KINTONE_API_TOKEN`

## 操作一覧

| 操作 | 説明 | 例 |
|------|------|-----|
| `get` | レコード取得 | `/kintone-record get 123 $id=1` |
| `list` | レコード一覧取得 | `/kintone-record list 123 status="完了"` |
| `create` | レコード作成 | `/kintone-record create 123 {データ}` |
| `update` | レコード更新 | `/kintone-record update 123 id=1 {データ}` |
| `delete` | レコード削除 | `/kintone-record delete 123 id=1` |

## API実行コマンド

### 1. 単一レコード取得

```bash
curl -s "https://{DOMAIN}/k/v1/record.json?app={APP_ID}&id={RECORD_ID}" \
  -H "{AUTH_HEADER}" | jq .
```

### 2. レコード一覧取得

```bash
curl -s "https://{DOMAIN}/k/v1/records.json?app={APP_ID}&query={QUERY}" \
  -H "{AUTH_HEADER}" | jq .
```

### 3. レコード作成

```bash
curl -s -X POST "https://{DOMAIN}/k/v1/record.json" \
  -H "{AUTH_HEADER}" \
  -H "Content-Type: application/json" \
  -d '{
    "app": {APP_ID},
    "record": {
      "フィールドコード": { "value": "値" }
    }
  }' | jq .
```

### 4. レコード更新

```bash
curl -s -X PUT "https://{DOMAIN}/k/v1/record.json" \
  -H "{AUTH_HEADER}" \
  -H "Content-Type: application/json" \
  -d '{
    "app": {APP_ID},
    "id": {RECORD_ID},
    "record": {
      "フィールドコード": { "value": "新しい値" }
    }
  }' | jq .
```

### 5. レコード削除

```bash
curl -s -X DELETE "https://{DOMAIN}/k/v1/records.json" \
  -H "{AUTH_HEADER}" \
  -H "Content-Type: application/json" \
  -d '{
    "app": {APP_ID},
    "ids": [{RECORD_ID}]
  }' | jq .
```

### 6. 複数レコード一括作成

```bash
curl -s -X POST "https://{DOMAIN}/k/v1/records.json" \
  -H "{AUTH_HEADER}" \
  -H "Content-Type: application/json" \
  -d '{
    "app": {APP_ID},
    "records": [
      { "フィールド1": { "value": "値1" } },
      { "フィールド2": { "value": "値2" } }
    ]
  }' | jq .
```

## フィールド値のフォーマット

### 基本型

```json
{
  "文字列フィールド": { "value": "テキスト" },
  "数値フィールド": { "value": "12345" },
  "日付フィールド": { "value": "2026-02-03" },
  "日時フィールド": { "value": "2026-02-03T10:00:00Z" }
}
```

### 選択系

```json
{
  "ドロップダウン": { "value": "選択肢1" },
  "ラジオボタン": { "value": "選択肢A" },
  "チェックボックス": { "value": ["選択肢1", "選択肢2"] },
  "複数選択": { "value": ["A", "B", "C"] }
}
```

### ユーザー選択

```json
{
  "ユーザー選択": {
    "value": [
      { "code": "user1@example.com" },
      { "code": "user2@example.com" }
    ]
  }
}
```

### テーブル（サブテーブル）

```json
{
  "テーブル": {
    "value": [
      {
        "value": {
          "テーブル内フィールド1": { "value": "値1" },
          "テーブル内フィールド2": { "value": "値2" }
        }
      }
    ]
  }
}
```

## 使用例

### 例1: レコードを1件取得
```
/kintone-record get 123 1
```

### 例2: 条件に合うレコードを検索
```
/kintone-record list 123 status="完了" and 担当者 in ("田中")
```

### 例3: 新規レコード作成
```
/kintone-record create 123 会社名="テスト株式会社" 金額=10000
```

### 例4: レコード更新
```
/kintone-record update 123 1 status="完了"
```

## エラーハンドリング

| エラーコード | 意味 | 対処 |
|-------------|------|------|
| GAIA_RE01 | レコードが存在しない | レコードIDを確認 |
| GAIA_RE02 | 権限なし | APIトークンの権限を確認 |
| GAIA_IL02 | 必須項目が未入力 | 必須フィールドを追加 |
| GAIA_IL26 | フィールド値が不正 | 値のフォーマットを確認 |

---

**ユーザーの指示**: $ARGUMENTS
