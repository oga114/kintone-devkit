import chokidar from 'chokidar';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { resolve, dirname, relative } from 'path';
import { fileURLToPath } from 'url';
import { execSync, spawn, ChildProcess } from 'child_process';
import { getKintoneConfig } from '../kintone.config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// WSL環境かどうかを判定
const isWSL = process.platform === 'linux' && existsSync('/proc/version') &&
  readFileSync('/proc/version', 'utf-8').toLowerCase().includes('microsoft');

// --no-watch オプション（アップローダーを起動しない）
const noWatch = process.argv.includes('--no-watch');

/**
 * ターゲットプラグインを取得
 */
function getTargetPlugins(): string[] {
  const args = process.argv.slice(2).filter(arg => !arg.startsWith('--'));
  const pluginsDir = resolve(__dirname, '../src/plugins');

  if (!existsSync(pluginsDir)) {
    return [];
  }

  const allPlugins = readdirSync(pluginsDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  if (args.length === 0) {
    return allPlugins;
  }

  const targetNames = args[0].split(',').map(n => n.trim());
  return allPlugins.filter(p => targetNames.includes(p));
}

// アップローダープロセスを保持
const uploaderProcesses: Map<string, ChildProcess> = new Map();

/**
 * 公式アップローダーを起動（--watchモード）
 */
function startUploader(pluginName: string): ChildProcess | null {
  const environment = process.env.KINTONE_ENV || 'dev';
  const config = getKintoneConfig(environment);
  const baseUrl = config.baseUrl;

  if (!baseUrl) {
    console.error(`   ⚠️  ${environment}環境のKINTONE_BASE_URLが設定されていません`);
    return null;
  }

  const zipPath = resolve(__dirname, '../dist/plugins', `${pluginName}.zip`);

  // 環境変数を設定
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    KINTONE_BASE_URL: baseUrl,
  };

  if (config.auth.username && config.auth.password) {
    env.KINTONE_USERNAME = config.auth.username;
    env.KINTONE_PASSWORD = config.auth.password;
  }

  console.log(`\n📤 アップローダー起動: ${pluginName}`);
  console.log(`   接続先: ${baseUrl}`);

  const proc = spawn('npx', [
    'kintone-plugin-uploader',
    '--watch',
    '--base-url', baseUrl,
    zipPath
  ], {
    env,
    stdio: 'inherit',
    shell: true
  });

  proc.on('error', (err) => {
    console.error(`   ⚠️  アップローダーエラー: ${err.message}`);
    showManualUploadInfo(baseUrl, zipPath);
  });

  proc.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`\n   ⚠️  アップローダーが終了しました (code: ${code})`);
      showManualUploadInfo(baseUrl, zipPath);
    }
    uploaderProcesses.delete(pluginName);
  });

  return proc;
}

/**
 * 手動アップロード情報を表示
 */
function showManualUploadInfo(baseUrl: string, zipPath: string): void {
  const pluginUrl = `${baseUrl}/k/admin/system/plugin/`;

  console.log(`\n📋 手動アップロード方法:`);
  console.log(`   1. ${pluginUrl} を開く`);
  console.log(`   2. 「読み込む」をクリック`);
  console.log(`   3. ${zipPath} をアップロード`);
  console.log(`\n   ※ ファイル変更時は自動でビルドされるので、手動で再アップロードしてください`);

  // WSL環境ではWindowsブラウザで開く
  if (isWSL) {
    try {
      execSync(`explorer.exe "${pluginUrl}"`, { stdio: 'ignore' });
      console.log(`\n   🌐 Windowsブラウザでプラグイン管理画面を開きました`);
    } catch {
      // explorer.exeが使えない場合は無視
    }
  }
}

/**
 * プラグインをビルド＆パッケージング
 */
async function buildAndPack(pluginName: string): Promise<boolean> {
  try {
    console.log(`\n🔄 ${pluginName} をビルド中...`);

    // ビルド
    execSync(`npx tsx scripts/build-plugin.ts ${pluginName}`, {
      encoding: 'utf-8',
      stdio: 'pipe'
    });

    // パッケージング
    execSync(`npx tsx scripts/pack-plugin.ts ${pluginName}`, {
      encoding: 'utf-8',
      stdio: 'pipe'
    });

    console.log(`   ✅ ビルド完了 → dist/plugins/${pluginName}.zip`);
    return true;

  } catch (err: any) {
    console.error(`❌ ${pluginName} のビルドに失敗:`, err.message);
    if (err.stderr) {
      console.error(`   ${err.stderr.split('\n').slice(-3).join('\n')}`);
    }
    return false;
  }
}

/**
 * ファイル監視を開始
 */
function startWatching(plugins: string[]): void {
  const watchPaths = plugins.map(p => resolve(__dirname, '../src/plugins', p));

  console.log(`\n👀 ファイル監視中...`);
  console.log(`   対象: ${plugins.join(', ')}`);
  console.log(`   Ctrl+C で終了\n`);

  // debounce用のタイマー
  const debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  const DEBOUNCE_MS = 500;

  const watcher = chokidar.watch(watchPaths, {
    ignored: /(^|[\/\\])\../,
    persistent: true,
    ignoreInitial: true,
    // WSL環境ではポーリングを使用
    usePolling: isWSL,
    interval: isWSL ? 1000 : undefined
  });

  watcher.on('change', (filePath) => {
    // どのプラグインのファイルか特定
    const relativePath = relative(resolve(__dirname, '../src/plugins'), filePath);
    const pluginName = relativePath.split(/[\/\\]/)[0];

    if (!plugins.includes(pluginName)) return;

    // debounce処理
    const existingTimer = debounceTimers.get(pluginName);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(async () => {
      debounceTimers.delete(pluginName);
      console.log(`\n📝 変更検出: ${relative(resolve(__dirname, '..'), filePath)}`);
      await buildAndPack(pluginName);
    }, DEBOUNCE_MS);

    debounceTimers.set(pluginName, timer);
  });

  watcher.on('add', (filePath) => {
    const relativePath = relative(resolve(__dirname, '../src/plugins'), filePath);
    const pluginName = relativePath.split(/[\/\\]/)[0];

    if (!plugins.includes(pluginName)) return;

    const existingTimer = debounceTimers.get(pluginName);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(async () => {
      debounceTimers.delete(pluginName);
      console.log(`\n📝 ファイル追加: ${relative(resolve(__dirname, '..'), filePath)}`);
      await buildAndPack(pluginName);
    }, DEBOUNCE_MS);

    debounceTimers.set(pluginName, timer);
  });

  watcher.on('error', (err: unknown) => {
    console.error('❌ 監視エラー:', (err as Error).message);
  });

  // 終了処理
  process.on('SIGINT', () => {
    console.log('\n\n👋 開発モードを終了します');
    watcher.close();
    // アップローダープロセスを終了
    for (const [name, proc] of uploaderProcesses) {
      console.log(`   アップローダー停止: ${name}`);
      proc.kill();
    }
    process.exit(0);
  });
}

/**
 * メイン処理
 */
async function main(): Promise<void> {
  const plugins = getTargetPlugins();

  if (plugins.length === 0) {
    console.log('⚠️  開発対象のプラグインがありません');
    console.log('   npm run create:plugin でプラグインを作成するか、プラグイン名を指定してください');
    process.exit(1);
  }

  console.log('🔌 プラグイン開発モード');
  console.log(`   対象: ${plugins.join(', ')}`);
  if (noWatch) {
    console.log(`   ⚠️  アップローダーは起動しません（--no-watch）`);
  }

  // 初回ビルド
  console.log('\n📦 初回ビルド中...');
  for (const plugin of plugins) {
    await buildAndPack(plugin);
  }

  // アップローダーを起動（--no-watchがない場合）
  if (!noWatch) {
    for (const plugin of plugins) {
      const proc = startUploader(plugin);
      if (proc) {
        uploaderProcesses.set(plugin, proc);
      }
    }
  }

  // ファイル監視開始
  startWatching(plugins);
}

main().catch(err => {
  console.error('❌ エラー:', err.message);
  process.exit(1);
});
