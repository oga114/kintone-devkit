---
description: 開発環境と本番環境のkintoneスキーマ差分を検出
allowed-tools: Bash(npm run schema:*), Bash(KINTONE_ENV*), Read, Glob
argument-hint: [app-name] [--from=dev] [--to=prod]
---

# kintoneスキーマ差分検出

開発環境と本番環境のkintoneアプリスキーマを比較し、差分を表示します。

## 使用方法

引数: $ARGUMENTS

### 前提条件

事前に両環境のスキーマを取得しておく必要があります：

```bash
# 開発環境のスキーマを取得
KINTONE_ENV=dev npm run schema

# 本番環境のスキーマを取得
KINTONE_ENV=prod npm run schema
```

### 差分検出の実行

```bash
# デフォルト（dev vs prod）
npm run schema:diff

# 特定アプリのみ
npm run schema:diff -- <app-name>

# 環境を指定
KINTONE_ENV_FROM=staging KINTONE_ENV_TO=prod npm run schema:diff
```

### 検出される差分

- **追加されたフィールド**: 開発環境にのみ存在
- **削除されたフィールド**: 本番環境にのみ存在
- **型が変更されたフィールド**: 両環境で型が異なる
- **ビューの差分**: ビューの追加/削除

### 差分がある場合の対応

1. 差分を確認
2. 本番環境に反映が必要か判断
3. kintoneの管理画面から手動で反映、またはREST APIで更新

引数からアプリ名や環境を解析して適切なコマンドを実行してください。
