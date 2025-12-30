import { existsSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { getKintoneConfig } from '../kintone.config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * ターゲットプラグインを取得
 */
function getTargetPlugin(): string | null {
  const args = process.argv.slice(2).filter(arg => !arg.startsWith('--'));
  return args[0] || null;
}

/**
 * プラグインをアップロード
 */
async function uploadPlugin(pluginName: string): Promise<void> {
  const environment = process.env.KINTONE_ENV || 'dev';
  const config = getKintoneConfig(environment);

  if (!config.baseUrl) {
    console.error(`❌ ${environment}環境のKINTONE_BASE_URLが設定されていません`);
    process.exit(1);
  }

  // ZIPファイルを探す
  const pluginsDir = resolve(__dirname, '../dist/plugins');
  const zipFiles = readdirSync(pluginsDir).filter(f => f.startsWith(pluginName) && f.endsWith('.zip'));

  if (zipFiles.length === 0) {
    console.error(`❌ パッケージされたプラグインが見つかりません: ${pluginName}`);
    console.error(`   先に npm run pack:plugin -- ${pluginName} を実行してください`);
    process.exit(1);
  }

  // 最新のZIPファイルを使用
  const zipFile = zipFiles.sort().reverse()[0];
  const zipPath = resolve(pluginsDir, zipFile);

  console.log(`\n📤 プラグインをアップロード中...\n`);
  console.log(`   ファイル: ${zipFile}`);
  console.log(`   接続先: ${config.baseUrl}`);
  console.log(`   環境: ${environment}\n`);

  // 認証情報を環境変数で渡す
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    KINTONE_BASE_URL: config.baseUrl,
  };

  if (config.auth.username && config.auth.password) {
    env.KINTONE_USERNAME = config.auth.username;
    env.KINTONE_PASSWORD = config.auth.password;
  }

  try {
    // kintone-plugin-uploaderを実行
    const cmd = `npx kintone-plugin-uploader --base-url "${config.baseUrl}" "${zipPath}"`;
    console.log(`   実行: ${cmd}\n`);

    execSync(cmd, {
      encoding: 'utf-8',
      stdio: 'inherit',
      env
    });

    console.log(`\n✅ アップロード完了！`);
    console.log(`\n💡 kintone管理画面でプラグインを有効化してください:`);
    console.log(`   ${config.baseUrl}/k/admin/system/plugin/`);

  } catch (err: any) {
    console.error('\n⚠️  アップロードに失敗しました');
    console.error('\n📋 手動アップロード手順:');
    console.error(`   1. ${config.baseUrl}/k/admin/system/plugin/ を開く`);
    console.error(`   2. 「プラグインを読み込む」をクリック`);
    console.error(`   3. ${zipPath} をアップロード`);
    console.error('\n💡 または --watch モードを使用:');
    console.error(`   npx kintone-plugin-uploader --watch "${zipPath}"`);
  }
}

/**
 * メイン処理
 */
async function main(): Promise<void> {
  const pluginName = getTargetPlugin();

  if (!pluginName) {
    console.log('使用方法: npm run upload:plugin -- <plugin-name>');
    console.log('\n利用可能なプラグイン:');

    const pluginsDir = resolve(__dirname, '../dist/plugins');
    if (existsSync(pluginsDir)) {
      const zipFiles = readdirSync(pluginsDir).filter(f => f.endsWith('.zip'));

      if (zipFiles.length > 0) {
        zipFiles.forEach(f => {
          const name = f.replace(/\.zip$/, '').replace(/_.*$/, '');
          console.log(`   - ${name} (${f})`);
        });
      } else {
        console.log('   (パッケージされたプラグインがありません)');
        console.log('   npm run pack:plugin -- <plugin-name> を実行してください');
      }
    } else {
      console.log('   (ビルドされたプラグインがありません)');
    }

    process.exit(1);
  }

  await uploadPlugin(pluginName);
}

main().catch(err => {
  console.error('❌ エラー:', err.message);
  process.exit(1);
});
