import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query: string): Promise<string> {
  return new Promise(resolve => rl.question(query, resolve));
}

/**
 * アプリ名を環境変数名に変換
 * 例: order-entry-dev → ORDER_ENTRY_DEV_ID
 */
function toEnvVarName(appName: string): string {
  return `${appName.toUpperCase().replace(/-/g, '_')}_ID`;
}

interface AppSetup {
  appName: string;
  appId: string;
  envVarName: string;
}

async function createApp(): Promise<void> {
  console.log('🎯 新しいkintoneアプリを作成します\n');

  // 開発/本番環境の設定を聞く
  console.log('📌 環境設定について:');
  console.log('   開発環境と本番環境で別々のソースコードを管理できます。');
  console.log('   例: customer-app-dev（開発用）、customer-app-prod（本番用）\n');

  const setupType = await question('環境タイプを選択してください:\n  1. 開発環境のみ\n  2. 開発環境 + 本番環境（両方作成）\n選択 [1/2]: ');

  const createBoth = setupType.trim() === '2';

  // 開発環境の設定
  console.log('\n--- 開発環境の設定 ---\n');

  let devAppName = await question('開発環境のアプリ名を入力してください (例: customer-app-dev): ');
  devAppName = devAppName.trim();

  if (!devAppName) {
    console.error('❌ アプリ名が入力されていません');
    rl.close();
    process.exit(1);
  }

  // アプリ名のバリデーション
  if (!/^[a-z][a-z0-9-]*$/.test(devAppName)) {
    console.error('❌ アプリ名は小文字英字で始まり、小文字英数字とハイフンのみ使用できます');
    rl.close();
    process.exit(1);
  }

  // 既に存在するかチェック
  const devAppDir = resolve(__dirname, '../src/apps', devAppName);
  if (existsSync(devAppDir)) {
    console.error(`❌ アプリ "${devAppName}" は既に存在します`);
    rl.close();
    process.exit(1);
  }

  const devAppId = await question('開発環境のkintoneアプリIDを入力してください: ');
  if (!devAppId || isNaN(Number(devAppId))) {
    console.error('❌ 有効なアプリIDを入力してください');
    rl.close();
    process.exit(1);
  }

  const devSetup: AppSetup = {
    appName: devAppName,
    appId: devAppId.trim(),
    envVarName: toEnvVarName(devAppName)
  };

  // 本番環境の設定
  let prodSetup: AppSetup | null = null;

  if (createBoth) {
    console.log('\n--- 本番環境の設定 ---\n');

    // デフォルトの本番アプリ名を提案
    const defaultProdName = devAppName.replace(/-dev$/, '-prod');
    let prodAppName = await question(`本番環境のアプリ名を入力してください [${defaultProdName}]: `);
    prodAppName = prodAppName.trim() || defaultProdName;

    if (!/^[a-z][a-z0-9-]*$/.test(prodAppName)) {
      console.error('❌ アプリ名は小文字英字で始まり、小文字英数字とハイフンのみ使用できます');
      rl.close();
      process.exit(1);
    }

    const prodAppDir = resolve(__dirname, '../src/apps', prodAppName);
    if (existsSync(prodAppDir)) {
      console.error(`❌ アプリ "${prodAppName}" は既に存在します`);
      rl.close();
      process.exit(1);
    }

    const prodAppId = await question('本番環境のkintoneアプリIDを入力してください: ');
    if (!prodAppId || isNaN(Number(prodAppId))) {
      console.error('❌ 有効なアプリIDを入力してください');
      rl.close();
      process.exit(1);
    }

    prodSetup = {
      appName: prodAppName,
      appId: prodAppId.trim(),
      envVarName: toEnvVarName(prodAppName)
    };
  }

  // 確認
  console.log('\n--- 作成内容の確認 ---\n');
  console.log(`開発環境: ${devSetup.appName} (App ID: ${devSetup.appId})`);
  if (prodSetup) {
    console.log(`本番環境: ${prodSetup.appName} (App ID: ${prodSetup.appId})`);
  }

  const confirm = await question('\nこの内容で作成しますか? [Y/n]: ');
  if (confirm.toLowerCase() === 'n') {
    console.log('キャンセルしました');
    rl.close();
    process.exit(0);
  }

  // アプリを作成
  console.log('\n📁 アプリを作成中...\n');

  await createAppFiles(devSetup);
  if (prodSetup) {
    await createAppFiles(prodSetup);
  }

  // .envファイルに追加
  await updateEnvFile(devSetup);
  if (prodSetup) {
    await updateEnvFile(prodSetup);
  }

  // kintone.config.tsに追加
  await updateConfigFile(devSetup);
  if (prodSetup) {
    await updateConfigFile(prodSetup);
  }

  console.log(`\n✅ アプリの作成が完了しました！\n`);
  console.log('📝 次のステップ:');
  console.log(`   1. npm run dev -- ${devSetup.appName}`);
  console.log('   2. ファイルを編集してカスタマイズを開発');
  if (prodSetup) {
    console.log(`   3. 本番デプロイ: npm run build -- ${prodSetup.appName} && npm run upload -- ${prodSetup.appName}`);
  }
  console.log('');

  rl.close();
}

/**
 * アプリのファイルを作成
 */
async function createAppFiles(setup: AppSetup): Promise<void> {
  const appDir = resolve(__dirname, '../src/apps', setup.appName);

  // ディレクトリを作成
  mkdirSync(appDir, { recursive: true });
  console.log(`✅ ディレクトリ作成: src/apps/${setup.appName}`);

  // index.tsを作成
  const indexContent = `// ${setup.appName} エントリーポイント
import './style.css';

(() => {
  'use strict';

  // レコード一覧画面の表示イベント
  kintone.events.on('app.record.index.show', (event) => {
    console.log('${setup.appName}: レコード一覧画面を表示しました');
    return event;
  });

  // レコード詳細画面の表示イベント
  kintone.events.on('app.record.detail.show', (event) => {
    console.log('${setup.appName}: レコード詳細画面を表示しました');
    return event;
  });

  // レコード追加/編集画面の表示イベント
  kintone.events.on(['app.record.create.show', 'app.record.edit.show'], (event) => {
    console.log('${setup.appName}: レコード編集画面を表示しました');
    return event;
  });

  console.log('${setup.appName}: カスタマイズが読み込まれました');
})();
`;

  writeFileSync(resolve(appDir, 'index.ts'), indexContent);
  console.log(`✅ ファイル作成: src/apps/${setup.appName}/index.ts`);

  // style.cssを作成
  const styleContent = `/* ${setup.appName} スタイル */

.${setup.appName}-custom-button {
  background-color: #3498db;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s;
}

.${setup.appName}-custom-button:hover {
  background-color: #2980b9;
}

.${setup.appName}-header {
  background-color: #f8f9fa;
  padding: 15px;
  margin-bottom: 20px;
  border-left: 4px solid #3498db;
}
`;

  writeFileSync(resolve(appDir, 'style.css'), styleContent);
  console.log(`✅ ファイル作成: src/apps/${setup.appName}/style.css`);
}

/**
 * .envファイルにアプリIDを追加
 */
async function updateEnvFile(setup: AppSetup): Promise<void> {
  const envPath = resolve(__dirname, '../.env');

  if (existsSync(envPath)) {
    let envContent = readFileSync(envPath, 'utf-8');

    if (!envContent.includes(setup.envVarName)) {
      envContent += `\n# ${setup.appName}のアプリID\n${setup.envVarName}=${setup.appId}\n`;
      writeFileSync(envPath, envContent);
      console.log(`✅ .envファイルに追加: ${setup.envVarName}=${setup.appId}`);
    } else {
      console.log(`⚠️  .envファイルに既に ${setup.envVarName} が存在します`);
    }
  } else {
    const envContent = `# kintone環境設定
KINTONE_BASE_URL=https://your-domain.cybozu.com
KINTONE_USERNAME=your-username
KINTONE_PASSWORD=your-password

# ${setup.appName}のアプリID
${setup.envVarName}=${setup.appId}
`;
    writeFileSync(envPath, envContent);
    console.log(`✅ .envファイルを作成: ${setup.envVarName}=${setup.appId}`);
  }
}

/**
 * kintone.config.tsにアプリ設定を追加
 */
async function updateConfigFile(setup: AppSetup): Promise<void> {
  const configPath = resolve(__dirname, '../kintone.config.ts');
  let configContent = readFileSync(configPath, 'utf-8');

  // 新しい形式のエントリ
  const newAppEntry = `  '${setup.appName}': {
    name: '${setup.appName}',
    ids: {
      dev: process.env.${setup.envVarName}
    }
  }`;

  // apps オブジェクトを探す
  const appsMatch = configContent.match(/export const apps: Apps = \{([\s\S]*?)\n\};/);

  if (appsMatch) {
    const currentApps = appsMatch[1];
    let updatedApps: string;

    const trimmedApps = currentApps.trim();
    if (trimmedApps === '' || (trimmedApps.startsWith('//') && !trimmedApps.includes('{'))) {
      // 空の場合
      updatedApps = `\n${newAppEntry}\n`;
    } else {
      // 既存のエントリがある場合
      updatedApps = trimmedApps.endsWith(',')
        ? `${currentApps}\n${newAppEntry}\n`
        : `${currentApps},\n${newAppEntry}\n`;
    }

    configContent = configContent.replace(
      /export const apps: Apps = \{[\s\S]*?\n\};/,
      `export const apps: Apps = {${updatedApps}};`
    );

    writeFileSync(configPath, configContent);
    console.log(`✅ kintone.config.tsに追加: ${setup.appName}`);
  } else {
    console.log('⚠️  kintone.config.tsの更新に失敗しました。手動で追加してください。');
  }
}

createApp().catch(error => {
  console.error('❌ エラーが発生しました:', error);
  rl.close();
  process.exit(1);
});
