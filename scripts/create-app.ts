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
 * 例: order-entry → ORDER_ENTRY
 */
function toEnvVarPrefix(appName: string): string {
  return appName.toUpperCase().replace(/-/g, '_');
}

interface AppSetup {
  appName: string;
  envVarPrefix: string;
  devAppId: string;
  prodAppId?: string;
}

async function createApp(): Promise<void> {
  console.log('🎯 新しいkintoneアプリを作成します\n');

  // 環境パターンの選択
  console.log('📌 環境パターンを選択してください:\n');
  console.log('  1. 単一環境');
  console.log('     → 開発環境のみ。シンプルな構成。\n');
  console.log('  2. ソースコード分離（開発用 + 本番用）');
  console.log('     → 開発用と本番用で別々のソースコードを管理。');
  console.log('     → アプリID依存のコードがある場合に推奨。');
  console.log('     → 例: customer-app-dev/, customer-app-prod/\n');
  console.log('  3. スキーマ同期用（1つのソース、複数環境ID）');
  console.log('     → 1つのソースコードで開発/本番両方のIDを管理。');
  console.log('     → npm run schema:diff で差分検出可能。');
  console.log('     → 例: customer-app/ (ids.dev=100, ids.prod=200)\n');

  const patternChoice = await question('選択 [1/2/3]: ');
  const pattern = patternChoice.trim();

  if (!['1', '2', '3'].includes(pattern)) {
    console.error('❌ 無効な選択です');
    rl.close();
    process.exit(1);
  }

  if (pattern === '1') {
    await createSingleEnvApp();
  } else if (pattern === '2') {
    await createSeparateSourceApps();
  } else {
    await createSchemasSyncApp();
  }

  rl.close();
}

/**
 * パターン1: 単一環境（開発環境のみ）
 */
async function createSingleEnvApp(): Promise<void> {
  console.log('\n--- 単一環境アプリの作成 ---\n');

  const appName = await promptAppName('アプリ名を入力してください (例: my-app): ');
  const appId = await promptAppId('kintoneアプリIDを入力してください: ');

  const setup: AppSetup = {
    appName,
    envVarPrefix: toEnvVarPrefix(appName),
    devAppId: appId
  };

  await confirmAndCreate([setup], 'single');
}

/**
 * パターン2: ソースコード分離（開発用 + 本番用で別々のソース）
 */
async function createSeparateSourceApps(): Promise<void> {
  console.log('\n--- ソースコード分離アプリの作成 ---\n');

  // 開発環境
  console.log('[開発環境]');
  const devAppName = await promptAppName('開発環境のアプリ名を入力してください (例: customer-app-dev): ');
  const devAppId = await promptAppId('開発環境のkintoneアプリIDを入力してください: ');

  // 本番環境
  console.log('\n[本番環境]');
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

  const prodAppId = await promptAppId('本番環境のkintoneアプリIDを入力してください: ');

  const devSetup: AppSetup = {
    appName: devAppName,
    envVarPrefix: toEnvVarPrefix(devAppName),
    devAppId: devAppId
  };

  const prodSetup: AppSetup = {
    appName: prodAppName,
    envVarPrefix: toEnvVarPrefix(prodAppName),
    devAppId: prodAppId
  };

  await confirmAndCreate([devSetup, prodSetup], 'separate');
}

/**
 * パターン3: スキーマ同期用（1つのソース、開発/本番両方のID）
 */
async function createSchemasSyncApp(): Promise<void> {
  console.log('\n--- スキーマ同期用アプリの作成 ---\n');

  const appName = await promptAppName('アプリ名を入力してください (例: customer-app): ');

  console.log('\n[開発環境]');
  const devAppId = await promptAppId('開発環境のkintoneアプリIDを入力してください: ');

  console.log('\n[本番環境]');
  const prodAppId = await promptAppId('本番環境のkintoneアプリIDを入力してください: ');

  const setup: AppSetup = {
    appName,
    envVarPrefix: toEnvVarPrefix(appName),
    devAppId,
    prodAppId
  };

  await confirmAndCreate([setup], 'schema-sync');
}

/**
 * アプリ名の入力とバリデーション
 */
async function promptAppName(prompt: string): Promise<string> {
  const appName = (await question(prompt)).trim();

  if (!appName) {
    console.error('❌ アプリ名が入力されていません');
    rl.close();
    process.exit(1);
  }

  if (!/^[a-z][a-z0-9-]*$/.test(appName)) {
    console.error('❌ アプリ名は小文字英字で始まり、小文字英数字とハイフンのみ使用できます');
    rl.close();
    process.exit(1);
  }

  const appDir = resolve(__dirname, '../src/apps', appName);
  if (existsSync(appDir)) {
    console.error(`❌ アプリ "${appName}" は既に存在します`);
    rl.close();
    process.exit(1);
  }

  return appName;
}

/**
 * アプリIDの入力とバリデーション
 */
async function promptAppId(prompt: string): Promise<string> {
  const appId = (await question(prompt)).trim();

  if (!appId || isNaN(Number(appId))) {
    console.error('❌ 有効なアプリIDを入力してください');
    rl.close();
    process.exit(1);
  }

  return appId;
}

/**
 * 確認して作成
 */
async function confirmAndCreate(
  setups: AppSetup[],
  pattern: 'single' | 'separate' | 'schema-sync'
): Promise<void> {
  console.log('\n--- 作成内容の確認 ---\n');

  for (const setup of setups) {
    console.log(`アプリ: ${setup.appName}`);
    console.log(`  開発環境 App ID: ${setup.devAppId}`);
    if (setup.prodAppId) {
      console.log(`  本番環境 App ID: ${setup.prodAppId}`);
    }
    console.log('');
  }

  const confirm = await question('この内容で作成しますか? [Y/n]: ');
  if (confirm.toLowerCase() === 'n') {
    console.log('キャンセルしました');
    rl.close();
    process.exit(0);
  }

  console.log('\n📁 アプリを作成中...\n');

  for (const setup of setups) {
    await createAppFiles(setup);
    await updateEnvFile(setup);
    await updateConfigFile(setup);
  }

  console.log('\n✅ アプリの作成が完了しました！\n');
  console.log('📝 次のステップ:');

  if (pattern === 'single') {
    console.log(`   1. npm run dev -- ${setups[0].appName}`);
    console.log('   2. ファイルを編集してカスタマイズを開発');
  } else if (pattern === 'separate') {
    console.log(`   1. npm run dev -- ${setups[0].appName}  # 開発環境で開発`);
    console.log('   2. ファイルを編集してカスタマイズを開発');
    console.log(`   3. npm run build -- ${setups[1].appName} && npm run upload -- ${setups[1].appName}  # 本番デプロイ`);
  } else {
    console.log(`   1. npm run dev -- ${setups[0].appName}  # 開発環境で開発`);
    console.log('   2. スキーマ取得:');
    console.log(`      npm run schema -- ${setups[0].appName}`);
    console.log(`      KINTONE_ENV=prod npm run schema -- ${setups[0].appName}`);
    console.log('   3. 差分検出:');
    console.log(`      npm run schema:diff -- ${setups[0].appName}`);
    console.log('   4. スキーマデプロイ:');
    console.log(`      npm run schema:deploy -- ${setups[0].appName} --execute`);
  }
  console.log('');
}

/**
 * アプリのファイルを作成
 */
async function createAppFiles(setup: AppSetup): Promise<void> {
  const appDir = resolve(__dirname, '../src/apps', setup.appName);

  mkdirSync(appDir, { recursive: true });
  console.log(`✅ ディレクトリ作成: src/apps/${setup.appName}`);

  // index.ts
  const indexContent = `// ${setup.appName} エントリーポイント
import './style.css';

(() => {
  'use strict';

  kintone.events.on('app.record.index.show', (event) => {
    console.log('${setup.appName}: レコード一覧画面を表示しました');
    return event;
  });

  kintone.events.on('app.record.detail.show', (event) => {
    console.log('${setup.appName}: レコード詳細画面を表示しました');
    return event;
  });

  kintone.events.on(['app.record.create.show', 'app.record.edit.show'], (event) => {
    console.log('${setup.appName}: レコード編集画面を表示しました');
    return event;
  });

  console.log('${setup.appName}: カスタマイズが読み込まれました');
})();
`;

  writeFileSync(resolve(appDir, 'index.ts'), indexContent);
  console.log(`✅ ファイル作成: src/apps/${setup.appName}/index.ts`);

  // style.css
  const styleContent = `/* ${setup.appName} スタイル */

.${setup.appName}-custom-button {
  background-color: #3498db;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.${setup.appName}-custom-button:hover {
  background-color: #2980b9;
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
  const devEnvVar = `${setup.envVarPrefix}_DEV_ID`;
  const prodEnvVar = `${setup.envVarPrefix}_PROD_ID`;

  let envContent = '';
  if (existsSync(envPath)) {
    envContent = readFileSync(envPath, 'utf-8');
  } else {
    envContent = `# kintone環境設定
KINTONE_BASE_URL=https://your-domain.cybozu.com
KINTONE_USERNAME=your-username
KINTONE_PASSWORD=your-password
`;
  }

  // 開発環境ID
  if (!envContent.includes(devEnvVar)) {
    envContent += `\n# ${setup.appName}\n${devEnvVar}=${setup.devAppId}\n`;
    console.log(`✅ .envに追加: ${devEnvVar}=${setup.devAppId}`);
  }

  // 本番環境ID（ある場合）
  if (setup.prodAppId && !envContent.includes(prodEnvVar)) {
    envContent += `${prodEnvVar}=${setup.prodAppId}\n`;
    console.log(`✅ .envに追加: ${prodEnvVar}=${setup.prodAppId}`);
  }

  writeFileSync(envPath, envContent);
}

/**
 * kintone.config.tsにアプリ設定を追加
 */
async function updateConfigFile(setup: AppSetup): Promise<void> {
  const configPath = resolve(__dirname, '../kintone.config.ts');
  let configContent = readFileSync(configPath, 'utf-8');

  const devEnvVar = `${setup.envVarPrefix}_DEV_ID`;
  const prodEnvVar = `${setup.envVarPrefix}_PROD_ID`;

  // 新しい形式のエントリ
  let idsBlock: string;
  if (setup.prodAppId) {
    idsBlock = `{
      dev: process.env.${devEnvVar},
      prod: process.env.${prodEnvVar}
    }`;
  } else {
    idsBlock = `{
      dev: process.env.${devEnvVar}
    }`;
  }

  const newAppEntry = `  '${setup.appName}': {
    name: '${setup.appName}',
    ids: ${idsBlock}
  }`;

  // apps オブジェクトを探す
  const appsMatch = configContent.match(/export const apps: Apps = \{([\s\S]*?)\n\};/);

  if (appsMatch) {
    const currentApps = appsMatch[1];
    let updatedApps: string;

    const trimmedApps = currentApps.trim();
    if (trimmedApps === '' || (trimmedApps.startsWith('//') && !trimmedApps.includes('{'))) {
      updatedApps = `\n${newAppEntry}\n`;
    } else {
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
