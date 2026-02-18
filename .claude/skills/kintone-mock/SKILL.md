---
name: kintone-mock
description: kintone開発・テスト用のモックデータを生成する。フィールド定義に基づいてサンプルレコードを作成。
argument-hint: [アプリID] [件数]
---

# kintone Mock データ生成スキル

テスト・開発用のモックデータを生成します。

## 使用フロー

1. **フィールド情報取得**: `/kintone-schema`でアプリのフィールド定義を取得
2. **モックデータ生成**: フィールド型に応じたサンプルデータを生成
3. **レコード作成**: 生成したデータでレコードを作成（オプション）

## フィールド型別のモックデータ

### 文字列型

| 型 | サンプル値 |
|-----|-----------|
| SINGLE_LINE_TEXT | `テストデータ_001`, `サンプル文字列` |
| MULTI_LINE_TEXT | `これはテスト用の\n複数行テキストです。` |
| RICH_TEXT | `<p>リッチテキスト<strong>サンプル</strong></p>` |
| LINK | `https://example.com/test` |

### 数値型

| 型 | サンプル値 |
|-----|-----------|
| NUMBER | `12345`, `999.99` |
| CALC | （計算フィールドは自動計算） |

### 日付・時刻型

| 型 | サンプル値 |
|-----|-----------|
| DATE | `2026-02-03` |
| TIME | `10:30` |
| DATETIME | `2026-02-03T10:30:00Z` |

### 選択型

| 型 | サンプル値 |
|-----|-----------|
| DROP_DOWN | 選択肢から1つをランダム選択 |
| RADIO_BUTTON | 選択肢から1つをランダム選択 |
| CHECK_BOX | 選択肢から複数をランダム選択 |
| MULTI_SELECT | 選択肢から複数をランダム選択 |

### ユーザー型

| 型 | サンプル値 |
|-----|-----------|
| USER_SELECT | `[{"code": "test-user@example.com"}]` |
| ORGANIZATION_SELECT | `[{"code": "org-code"}]` |
| GROUP_SELECT | `[{"code": "group-code"}]` |

## モックデータ生成ルール

### 日本語サンプル

```javascript
const mockData = {
  // 会社名
  company: ["株式会社テスト", "サンプル商事", "テストホールディングス"],

  // 人名
  name: ["田中太郎", "佐藤花子", "鈴木一郎"],

  // 住所
  address: ["東京都渋谷区1-2-3", "大阪府大阪市北区4-5-6"],

  // 電話番号
  phone: ["03-1234-5678", "06-9876-5432"],

  // メールアドレス
  email: ["test@example.com", "sample@example.jp"]
};
```

### 連番生成

```javascript
// 連番付きデータ
for (let i = 1; i <= count; i++) {
  const record = {
    "管理番号": { "value": `TEST-${String(i).padStart(4, '0')}` },
    "作成日": { "value": new Date().toISOString().split('T')[0] }
  };
}
```

## 出力フォーマット

### JSON形式（REST API用）

```json
{
  "app": 123,
  "records": [
    {
      "会社名": { "value": "株式会社テスト" },
      "金額": { "value": "10000" },
      "日付": { "value": "2026-02-03" }
    },
    {
      "会社名": { "value": "サンプル商事" },
      "金額": { "value": "20000" },
      "日付": { "value": "2026-02-04" }
    }
  ]
}
```

### CSV形式（インポート用）

```csv
会社名,金額,日付
株式会社テスト,10000,2026-02-03
サンプル商事,20000,2026-02-04
```

## 使用例

```
/kintone-mock 123 10
# → アプリ123用のモックデータを10件生成

/kintone-mock 123 5 csv
# → CSV形式で5件生成

/kintone-mock 123 3 create
# → 3件生成してkintoneに登録
```

## 注意事項

- 本番環境では実行しないでください
- 必須フィールドは必ず値を設定
- ユニーク制約があるフィールドは重複しないよう注意
- ルックアップフィールドは参照先レコードが必要

## 生成後の操作

生成したデータは `/kintone-record create` で登録可能：

```bash
curl -X POST "https://{DOMAIN}/k/v1/records.json" \
  -H "{AUTH_HEADER}" \
  -H "Content-Type: application/json" \
  -d '{生成したJSON}'
```

---

**ユーザーの指示**: $ARGUMENTS
