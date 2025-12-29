import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
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

async function createApp(): Promise<void> {
  console.log('🎯 新しいkintoneアプリを作成します\n');

  // アプリ名を入力
  const appName = await question('アプリ名を入力してください (例: my-app): ');

  if (!appName) {
    console.error('❌ アプリ名が入力されていません');
    rl.close();
    process.exit(1);
  }

  // アプリ名のバリデーション
  if (!/^[a-z][a-z0-9-]*$/.test(appName)) {
    console.error('❌ アプリ名は小文字英字で始まり、小文字英数字とハイフンのみ使用できます');
    rl.close();
    process.exit(1);
  }

  // アプリディレクトリのパス
  const appDir = resolve(__dirname, '../src/apps', appName);

  // 既に存在するかチェック
  if (existsSync(appDir)) {
    console.error(`❌ アプリ "${appName}" は既に存在します`);
    rl.close();
    process.exit(1);
  }

  // アプリIDを入力
  const appId = await question('kintoneアプリIDを入力してください: ');

  if (!appId || isNaN(Number(appId))) {
    console.error('❌ 有効なアプリIDを入力してください');
    rl.close();
    process.exit(1);
  }

  console.log(`\n📁 アプリを作成中: ${appName}\n`);

  // 1. ディレクトリを作成
  mkdirSync(appDir, { recursive: true });
  console.log(`✅ ディレクトリ作成: src/apps/${appName}`);

  // 2. index.tsを作成
  const indexContent = `// ${appName} エントリーポイント
import './style.css';

(() => {
  'use strict';

  // レコード一覧画面の表示イベント
  kintone.events.on('app.record.index.show', (event) => {
    console.log('${appName}: レコード一覧画面を表示しました');
    return event;
  });

  // レコード詳細画面の表示イベント
  kintone.events.on('app.record.detail.show', (event) => {
    console.log('${appName}: レコード詳細画面を表示しました');
    return event;
  });

  // レコード追加/編集画面の表示イベント
  kintone.events.on(['app.record.create.show', 'app.record.edit.show'], (event) => {
    console.log('${appName}: レコード編集画面を表示しました');
    return event;
  });

  console.log('${appName}: カスタマイズが読み込まれました');
})();
`;

  const indexPath = resolve(appDir, 'index.ts');
  writeFileSync(indexPath, indexContent);
  console.log(`✅ ファイル作成: src/apps/${appName}/index.ts`);

  // 3. style.cssを作成
  const styleContent = `/* ${appName} スタイル */

.${appName}-custom-button {
  background-color: #3498db;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s;
}

.${appName}-custom-button:hover {
  background-color: #2980b9;
}

.${appName}-header {
  background-color: #f8f9fa;
  padding: 15px;
  margin-bottom: 20px;
  border-left: 4px solid #3498db;
}
`;

  const stylePath = resolve(appDir, 'style.css');
  writeFileSync(stylePath, styleContent);
  console.log(`✅ ファイル作成: src/apps/${appName}/style.css`);

  // 4. .envファイルにアプリIDを追加
  const envPath = resolve(__dirname, '../.env');
  const envVarName = toEnvVarName(appName);

  if (existsSync(envPath)) {
    let envContent = readFileSync(envPath, 'utf-8');

    // 既に存在するかチェック
    if (!envContent.includes(envVarName)) {
      envContent += `\n# ${appName}のアプリID\n${envVarName}=${appId}\n`;
      writeFileSync(envPath, envContent);
      console.log(`✅ .envファイルに追加: ${envVarName}=${appId}`);
    } else {
      console.log(`⚠️  .envファイルに既に ${envVarName} が存在します`);
    }
  } else {
    // .envファイルが存在しない場合は作成
    const envContent = `# kintone環境設定
KINTONE_BASE_URL=https://your-domain.cybozu.com
KINTONE_USERNAME=your-username
KINTONE_PASSWORD=your-password

# ${appName}のアプリID
${envVarName}=${appId}
`;
    writeFileSync(envPath, envContent);
    console.log(`✅ .envファイルを作成: ${envVarName}=${appId}`);
  }

  // 5. kintone.config.tsにアプリ設定を追加
  const configPath = resolve(__dirname, '../kintone.config.ts');
  let configContent = readFileSync(configPath, 'utf-8');

  // apps オブジェクトの最後に追加
  // ネストした{}を考慮してマッチさせる
  const appsMatch = configContent.match(/export const apps: Apps = \{([\s\S]*?)\n\};/);

  if (appsMatch) {
    const currentApps = appsMatch[1];
    const newAppEntry = `  '${appName}': {
    id: process.env.${envVarName},
    name: '${appName}'
  }`;

    let updatedApps: string;
    // 中身が空またはコメントのみの場合
    const trimmedApps = currentApps.trim();
    if (trimmedApps === '' || (trimmedApps.startsWith('//') && !trimmedApps.includes('{'))) {
      updatedApps = `\n${newAppEntry}\n`;
    } else {
      // 既存のエントリがある場合、最後のカンマをチェック
      updatedApps = trimmedApps.endsWith(',')
        ? `${currentApps}\n${newAppEntry}\n`
        : `${currentApps},\n${newAppEntry}\n`;
    }

    configContent = configContent.replace(
      /export const apps: Apps = \{[\s\S]*?\n\};/,
      `export const apps: Apps = {${updatedApps}};`
    );

    writeFileSync(configPath, configContent);
    console.log(`✅ kintone.config.tsに追加: ${appName}`);
  } else {
    console.log('⚠️  kintone.config.tsの更新に失敗しました。手動で追加してください。');
  }

  console.log(`\n✅ アプリ "${appName}" の作成が完了しました！\n`);
  console.log('📝 次のステップ:');
  console.log(`   1. npm run dev -- ${appName}`);
  console.log('   2. ファイルを編集してカスタマイズを開発\n');

  rl.close();
}

createApp().catch(error => {
  console.error('❌ エラーが発生しました:', error);
  rl.close();
  process.exit(1);
});
