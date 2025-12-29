# kintoneスキーマデプロイ

開発環境のスキーマ（フィールド、ビュー、レイアウト）を本番環境にデプロイします。

## 使用方法

引数: $ARGUMENTS

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

引数が指定されていれば、そのアプリのみを対象にしてください。
--from/--to が指定されていればその方向を使用し、なければ dev → prod をデフォルトとします。
ユーザーが「実行」を希望した場合のみ --execute を付けてください。
