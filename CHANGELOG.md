# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-12-30

### Added
- **カスタマイズ開発**
  - TypeScript対応のkintoneカスタマイズ開発環境
  - Viteによる高速ビルド
  - ホットリロード（ファイル変更検知→自動ビルド＆アップロード）
  - 複数アプリの一括・個別ビルド対応
  - 既存kintoneファイルの同期機能

- **プラグイン開発**
  - 対話式プラグイン作成（`npm run create:plugin`）
  - プラグインビルド・パッケージング・署名
  - 開発モードでの自動アップロード（`npm run dev:plugin`）
  - 設定画面・モバイル対応のテンプレート

- **スキーマ管理**
  - アプリスキーマ（フィールド・ビュー・レイアウト）の取得
  - 環境間（dev/prod）の差分検出
  - スキーマのデプロイ（フィールド追加・更新・削除）

- **バックアップ・復元**
  - レコードのバックアップ（JSON形式）
  - 添付ファイルのダウンロード対応
  - バックアップからの復元（ファイル自動アップロード）
  - 大量レコード対応（カーソルベースページネーション）

- **マルチ環境対応**
  - 開発/本番環境の分離設定
  - 同一アカウント内スペース分離
  - 別アカウント（サブドメイン）分離

- **その他**
  - WSL環境セットアップスクリプト
  - 対話式アプリ作成・削除
  - Claude Code用カスタムコマンド
