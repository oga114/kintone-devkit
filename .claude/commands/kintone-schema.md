---
description: kintoneアプリのスキーマ（設計情報）を取得
allowed-tools: Bash(npm run schema:*), Bash(KINTONE_ENV=*), Read, Glob
argument-hint: [app-name] [--env=dev|prod]
---

# kintoneスキーマ取得

kintoneアプリの設計情報（フィールド、ビュー、レイアウト）を取得してJSONファイルに保存します。

## 使用方法

引数: $ARGUMENTS

### 実行内容

1. 引数からアプリ名と環境を解析
2. 指定された環境のスキーマを取得
3. `.kintone/<app-name>/schema.<env>.json` に保存

### コマンド例

```bash
# 開発環境（デフォルト）
npm run schema -- <app-name>

# 本番環境
KINTONE_ENV=prod npm run schema -- <app-name>

# 全アプリ
npm run schema
```

### 取得される情報

- **アプリ設定**: 名前、説明、アイコンなど
- **フィールド情報**: フィールドコード、型、ラベル、設定
- **フォームレイアウト**: フィールドの配置
- **ビュー設定**: 一覧の設定

引数が指定されていれば、そのアプリのみを対象にしてください。
環境が指定されていれば、KINTONE_ENV環境変数を設定して実行してください。
