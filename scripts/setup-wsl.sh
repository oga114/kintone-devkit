#!/bin/bash
# WSL環境セットアップスクリプト
# kintoneプラグイン開発に必要な依存関係をインストールします

set -e

echo "🔧 WSL環境セットアップを開始します..."
echo ""

# WSL環境チェック
if ! grep -qi microsoft /proc/version 2>/dev/null; then
  echo "⚠️  WSL環境ではないようです。このスクリプトはWSL専用です。"
  exit 1
fi

echo "📦 Puppeteer/Chrome用の依存ライブラリをインストール中..."
echo "   (sudoパスワードが必要な場合があります)"
echo ""

sudo apt-get update

# Chrome/Puppeteer用の依存ライブラリ
sudo apt-get install -y \
  libnss3 \
  libnspr4 \
  libasound2t64 \
  libatk1.0-0t64 \
  libatk-bridge2.0-0t64 \
  libcups2t64 \
  libdrm2 \
  libxkbcommon0 \
  libxcomposite1 \
  libxdamage1 \
  libxfixes3 \
  libxrandr2 \
  libgbm1 \
  libpango-1.0-0 \
  libcairo2

echo ""
echo "✅ セットアップ完了！"
echo ""
echo "💡 次のステップ:"
echo "   npm install        # 依存パッケージをインストール"
echo "   npm run dev:plugin # プラグイン開発モードを起動"
