import { defineConfig } from 'vite';
import { resolve } from 'path';
import { readdirSync, existsSync } from 'fs';

// appsディレクトリ内の全アプリを自動検出
const appsDir = resolve(__dirname, 'src/apps');
const appEntries: Record<string, string> = {};

if (existsSync(appsDir)) {
  try {
    const apps = readdirSync(appsDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    apps.forEach(app => {
      // TypeScriptファイルを優先
      const tsPath = resolve(appsDir, app, 'index.ts');
      const jsPath = resolve(appsDir, app, 'index.js');

      if (existsSync(tsPath)) {
        appEntries[app] = tsPath;
      } else if (existsSync(jsPath)) {
        appEntries[app] = jsPath;
      }
    });
  } catch (e) {
    console.log('src/apps ディレクトリの読み込みに失敗しました');
  }
}

export default defineConfig(({ mode }) => ({
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: appEntries,
      output: {
        entryFileNames: (chunkInfo) => {
          // アプリ名を使ったファイル名: app-name/app-name.js
          return `[name]/[name].js`;
        },
        chunkFileNames: 'shared/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          // CSSファイルの場合、アプリ名を使う: app-name/app-name.css
          if (assetInfo.name && assetInfo.name.endsWith('.css')) {
            return '[name]/[name].css';
          }
          return 'assets/[name]-[hash][extname]';
        }
      }
    },
    // CSSを各エントリーポイントごとに分割
    cssCodeSplit: true,
    // 開発モードでは難読化なし、本番では難読化
    minify: mode === 'production' ? 'terser' : false,
    sourcemap: mode === 'development'
  },
  server: {
    port: 3000,
    open: false
  }
}));
