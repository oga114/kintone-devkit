import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

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
 * 秘密鍵が存在するか確認、なければ生成
 */
function ensurePrivateKey(pluginName: string): string {
  const keysDir = resolve(__dirname, '../.keys');
  const keyPath = resolve(keysDir, `${pluginName}.ppk`);

  if (!existsSync(keysDir)) {
    mkdirSync(keysDir, { recursive: true });
  }

  if (!existsSync(keyPath)) {
    console.log(`   🔑 秘密鍵を生成中...`);
    // @kintone/plugin-packerが鍵を自動生成するので、ここでは空のまま
    return '';
  }

  console.log(`   🔑 既存の秘密鍵を使用: ${keyPath}`);
  return keyPath;
}

/**
 * プラグインをパッケージング
 */
async function packPlugin(pluginName: string): Promise<void> {
  const pluginDir = resolve(__dirname, '../dist/plugins', pluginName);
  const manifestPath = resolve(pluginDir, 'manifest.json');

  if (!existsSync(manifestPath)) {
    console.error(`❌ ビルドされたプラグインが見つかりません: ${pluginName}`);
    console.error(`   先に npm run build:plugin -- ${pluginName} を実行してください`);
    process.exit(1);
  }

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
  console.log(`\n📦 ${pluginName} (v${manifest.version}) をパッケージング中...\n`);

  const keysDir = resolve(__dirname, '../.keys');
  const keyPath = resolve(keysDir, `${pluginName}.ppk`);
  const outputZip = resolve(__dirname, '../dist/plugins', `${pluginName}.zip`);

  // kintone-plugin-packerを実行
  const keyOption = existsSync(keyPath) ? `--ppk "${keyPath}"` : '';

  try {
    const cmd = `npx kintone-plugin-packer ${keyOption} --out "${outputZip}" "${pluginDir}"`;
    console.log(`   実行: ${cmd}\n`);

    const output = execSync(cmd, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });

    console.log(output);

    // 生成された秘密鍵を探して保存
    if (!existsSync(keyPath)) {
      const outputDir = resolve(__dirname, '../dist/plugins');
      const ppkFiles = readdirSync(outputDir).filter(f => f.endsWith('.ppk'));

      if (ppkFiles.length > 0) {
        mkdirSync(keysDir, { recursive: true });
        const generatedKeyPath = resolve(outputDir, ppkFiles[0]);
        const keyContent = readFileSync(generatedKeyPath);
        writeFileSync(keyPath, keyContent);
        // 元のファイルを削除
        unlinkSync(generatedKeyPath);

        console.log(`   🔑 秘密鍵を保存: .keys/${pluginName}.ppk`);
        console.log(`   ⚠️  この鍵は安全に保管してください。紛失するとプラグインを更新できなくなります。`);
      }
    }

    console.log(`\n✅ パッケージング完了！`);
    console.log(`\n📄 出力ファイル:`);
    console.log(`   dist/plugins/${pluginName}.zip`);
    console.log(`\n💡 次のステップ:`);
    console.log(`   npm run upload:plugin -- ${pluginName} でアップロード`);
    console.log(`   または kintone管理画面から手動でアップロード`);

  } catch (err: any) {
    console.error('❌ パッケージングエラー:', err.message);
    if (err.stderr) {
      console.error(err.stderr);
    }
    process.exit(1);
  }
}

/**
 * メイン処理
 */
async function main(): Promise<void> {
  const pluginName = getTargetPlugin();

  if (!pluginName) {
    console.log('使用方法: npm run pack:plugin -- <plugin-name>');
    console.log('\n利用可能なプラグイン:');

    const pluginsDir = resolve(__dirname, '../dist/plugins');
    if (existsSync(pluginsDir)) {
      const { readdirSync } = await import('fs');
      const plugins = readdirSync(pluginsDir, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name);

      if (plugins.length > 0) {
        plugins.forEach(p => console.log(`   - ${p}`));
      } else {
        console.log('   (ビルドされたプラグインがありません)');
      }
    } else {
      console.log('   (ビルドされたプラグインがありません)');
    }

    process.exit(1);
  }

  await packPlugin(pluginName);
}

main().catch(err => {
  console.error('❌ エラー:', err.message);
  process.exit(1);
});
