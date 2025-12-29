import { existsSync, rmSync, readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';
import { toEnvVarName } from './utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query: string): Promise<string> {
  return new Promise(resolve => rl.question(query, resolve));
}

async function removeApp(): Promise<void> {
  console.log('🗑️  アプリを削除します\n');

  // アプリ名を入力
  const appName = await question('削除するアプリ名を入力してください (例: my-app): ');

  if (!appName) {
    console.error('❌ アプリ名が入力されていません');
    rl.close();
    process.exit(1);
  }

  // アプリディレクトリのパス
  const appDir = resolve(__dirname, '../src/apps', appName);

  // 存在するかチェック
  if (!existsSync(appDir)) {
    console.error(`❌ アプリ "${appName}" が見つかりません`);
    rl.close();
    process.exit(1);
  }

  const envVarName = toEnvVarName(appName);

  // 確認
  console.log(`\n⚠️  以下のファイルとディレクトリが削除されます:`);
  console.log(`   - src/apps/${appName}`);
  console.log(`   - .env の ${envVarName}`);
  console.log(`   - kintone.config.ts の設定`);
  console.log(`   - dist/${appName}/ (ビルド出力)`);
  console.log(`   - .kintone/${appName}/ (同期ファイル)`);
  console.log();

  const confirm = await question('本当に削除しますか？ (yes/no): ');

  if (confirm.toLowerCase() !== 'yes') {
    console.log('❌ キャンセルされました');
    rl.close();
    process.exit(0);
  }

  console.log(`\n🗑️  削除中...\n`);

  // 1. アプリディレクトリを削除
  try {
    rmSync(appDir, { recursive: true, force: true });
    console.log(`✅ ディレクトリ削除: src/apps/${appName}`);
  } catch (error) {
    console.error(`❌ ディレクトリ削除エラー: ${(error as Error).message}`);
  }

  // 2. distディレクトリを削除
  const distDir = resolve(__dirname, '../dist', appName);
  if (existsSync(distDir)) {
    try {
      rmSync(distDir, { recursive: true, force: true });
      console.log(`✅ ビルド出力削除: dist/${appName}`);
    } catch (error) {
      console.error(`❌ ビルド出力削除エラー: ${(error as Error).message}`);
    }
  }

  // 3. .kintoneディレクトリを削除
  const kintoneDir = resolve(__dirname, '../.kintone', appName);
  if (existsSync(kintoneDir)) {
    try {
      rmSync(kintoneDir, { recursive: true, force: true });
      console.log(`✅ 同期ファイル削除: .kintone/${appName}`);
    } catch (error) {
      console.error(`❌ 同期ファイル削除エラー: ${(error as Error).message}`);
    }
  }

  // 4. .envファイルから削除
  const envPath = resolve(__dirname, '../.env');

  if (existsSync(envPath)) {
    try {
      let envContent = readFileSync(envPath, 'utf-8');
      const lines = envContent.split('\n');

      // 該当する行とその前のコメント行を削除
      const filteredLines: string[] = [];
      let skipNext = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // 次の行がターゲットの場合、コメント行もスキップ
        if (i < lines.length - 1 && lines[i + 1].startsWith(envVarName)) {
          if (line.startsWith('#')) {
            skipNext = true;
            continue;
          }
        }

        if (line.startsWith(envVarName)) {
          continue; // この行をスキップ
        }

        if (!skipNext) {
          filteredLines.push(line);
        }
        skipNext = false;
      }

      envContent = filteredLines.join('\n');
      writeFileSync(envPath, envContent);
      console.log(`✅ .envファイルから削除: ${envVarName}`);
    } catch (error) {
      console.error(`❌ .envファイル更新エラー: ${(error as Error).message}`);
    }
  }

  // 5. kintone.config.tsから削除
  const configPath = resolve(__dirname, '../kintone.config.ts');

  if (existsSync(configPath)) {
    try {
      let configContent = readFileSync(configPath, 'utf-8');

      // アプリエントリを削除（ネストした{}を考慮）
      // パターン: 'app-name': { ... }  または  "app-name": { ... }
      const appEntryRegex = new RegExp(
        `\\s*['"]${appName}['"]:\\s*\\{[\\s\\S]*?\\n\\s*\\},?`,
        'g'
      );

      configContent = configContent.replace(appEntryRegex, '');

      // 最後のカンマが残っている場合は削除
      configContent = configContent.replace(/,(\s*)\n(\s*)\};/g, '$1\n$2};');

      // 空のappsオブジェクトの場合、整形
      configContent = configContent.replace(
        /export const apps: Apps = \{\s*\};/,
        'export const apps: Apps = {\n};'
      );

      writeFileSync(configPath, configContent);
      console.log(`✅ kintone.config.tsから削除: ${appName}`);
    } catch (error) {
      console.error(`❌ kintone.config.ts更新エラー: ${(error as Error).message}`);
    }
  }

  console.log(`\n✅ アプリ "${appName}" の削除が完了しました！\n`);

  rl.close();
}

removeApp().catch(error => {
  console.error('❌ エラーが発生しました:', error);
  rl.close();
  process.exit(1);
});
