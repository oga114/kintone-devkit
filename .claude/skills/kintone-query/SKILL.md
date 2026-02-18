---
name: kintone-query
description: kintoneのクエリ文字列を構築する。自然言語からkintoneクエリ構文に変換。検索条件の作成を支援。
argument-hint: [検索条件の説明]
---

# kintone Query 構築スキル

自然言語の検索条件からkintoneクエリ文字列を生成します。

## 使用例

```
/kintone-query 今月作成されたレコード
/kintone-query ステータスが完了で、担当者が田中さん
/kintone-query 金額が10000以上、かつ日付が先月
```

## クエリ構文リファレンス

### 比較演算子

| 演算子 | 意味 | 例 |
|--------|------|-----|
| `=` | 等しい | `status = "完了"` |
| `!=` | 等しくない | `status != "未着手"` |
| `>` | より大きい | `金額 > 10000` |
| `>=` | 以上 | `金額 >= 10000` |
| `<` | より小さい | `金額 < 10000` |
| `<=` | 以下 | `金額 <= 10000` |
| `like` | 部分一致 | `会社名 like "株式会社"` |
| `not like` | 部分不一致 | `会社名 not like "テスト"` |
| `in` | いずれかに一致 | `status in ("完了", "対応中")` |
| `not in` | いずれにも不一致 | `status not in ("完了")` |

### 論理演算子

| 演算子 | 意味 | 例 |
|--------|------|-----|
| `and` | かつ | `status = "完了" and 担当者 in ("田中")` |
| `or` | または | `status = "完了" or status = "対応中"` |

### 日付・時刻関数

| 関数 | 意味 | 例 |
|------|------|-----|
| `TODAY()` | 今日 | `日付 = TODAY()` |
| `NOW()` | 現在日時 | `作成日時 < NOW()` |
| `THIS_MONTH()` | 今月 | `日付 = THIS_MONTH()` |
| `LAST_MONTH()` | 先月 | `日付 = LAST_MONTH()` |
| `THIS_YEAR()` | 今年 | `日付 = THIS_YEAR()` |

### システムフィールド

| フィールド | 意味 |
|-----------|------|
| `$id` | レコードID |
| `$revision` | リビジョン |
| `作成日時` / `created_time` | 作成日時 |
| `更新日時` / `updated_time` | 更新日時 |
| `作成者` / `creator` | 作成者 |
| `更新者` / `modifier` | 更新者 |

### ソート・リミット

```
order by 作成日時 desc
order by 金額 asc, 日付 desc
limit 100
offset 50
```

## 変換例

### 入力: 「今月作成されたレコード」
```
created_time = THIS_MONTH()
```

### 入力: 「ステータスが完了で担当者が田中さん」
```
status = "完了" and 担当者 in ("田中")
```

### 入力: 「金額が10000以上、日付が先月、新しい順に10件」
```
金額 >= 10000 and 日付 = LAST_MONTH() order by 日付 desc limit 10
```

### 入力: 「会社名に"株式会社"を含む、未完了のもの」
```
会社名 like "株式会社" and status not in ("完了")
```

## 出力フォーマット

クエリを生成したら、以下の形式で出力：

```
## 生成されたクエリ

\`\`\`
{生成したクエリ}
\`\`\`

## 使用方法

### REST APIで使用
\`\`\`bash
curl -X GET "https://{DOMAIN}/k/v1/records.json?app={APP_ID}&query={URLエンコードしたクエリ}" \
  -H "{AUTH_HEADER}"
\`\`\`

### JavaScriptで使用
\`\`\`javascript
kintone.api('/k/v1/records', 'GET', {
  app: APP_ID,
  query: '{生成したクエリ}'
});
\`\`\`
```

## 注意事項

- 文字列は必ずダブルクォートで囲む
- フィールドコードに日本語を使用可能
- `in`演算子の値はカンマ区切りの配列形式
- URLで使用する場合はURLエンコードが必要

---

**ユーザーの指示**: $ARGUMENTS
