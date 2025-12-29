import { build } from 'vite';
import chokidar from 'chokidar';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { uploadToKintone } from './upload.js';
import { getTargetApps, getFilteredEntries } from './utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

const targetApps = getTargetApps();

console.log('🚀 Kintone開発モードを起動しています...\n');

let isBuilding = false;
let buildQueue = false;

async function buildAndUpload(): Promise<void> {
  if (isBuilding) {
    buildQueue = true;
    return;
  }

  isBuilding = true;
  console.log('📦 ビルド中...');

  try {
    const entries = getFilteredEntries(targetApps);

    if (Object.keys(entries).length === 0) {
      console.error('❌ ビルド対象のアプリが見つかりません');
      console.error('   npm run create でアプリを作成してください');
      return;
    }

    await build({
      configFile: './vite.config.ts',
      mode: 'development',
      build: {
        rollupOptions: {
          input: entries
        }
      }
    });
    console.log('✅ ビルド完了\n');

    // kintoneにアップロード
    await uploadToKintone(targetApps);
  } catch (error) {
    console.error('❌ ビルドエラー:', error);
  } finally {
    isBuilding = false;
    if (buildQueue) {
      buildQueue = false;
      buildAndUpload();
    }
  }
}

// 初回ビルド
await buildAndUpload();

// ファイル監視の設定
// 特定アプリのみの場合は、そのアプリのディレクトリのみ監視（絶対パスを使用）
const watchPatterns = targetApps
  ? targetApps.map(app => resolve(projectRoot, 'src/apps', app))
  : [resolve(projectRoot, 'src/apps')];

const watcher = chokidar.watch(watchPatterns, {
  persistent: true,
  ignoreInitial: true,
  ignored: [
    '**/node_modules/**',
    '**/.git/**'
  ],
  // WSL環境でファイル監視を有効にするための設定
  usePolling: true,
  interval: 1000
});

watcher.on('ready', () => {
  console.log('👀 ファイルの変更を監視中...');
  console.log(`   監視パターン: ${watchPatterns.join(', ')}`);
  console.log('ℹ️  Ctrl+C で終了します\n');
});

watcher.on('change', (path: string) => {
  console.log(`\n📝 ファイルが変更されました: ${path}`);
  buildAndUpload();
});

watcher.on('add', (path: string) => {
  console.log(`\n➕ ファイルが追加されました: ${path}`);
  buildAndUpload();
});

watcher.on('unlink', (path: string) => {
  console.log(`\n➖ ファイルが削除されました: ${path}`);
  buildAndUpload();
});

watcher.on('error', (error: unknown) => {
  console.error('❌ 監視エラー:', error);
});
