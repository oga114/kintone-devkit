import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as readline from 'readline';
import * as crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface PluginConfig {
  name: string;
  displayName: string;
  description: string;
  version: string;
  hasConfig: boolean;
  hasMobile: boolean;
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function prompt(question: string): Promise<string> {
  return new Promise(resolve => {
    rl.question(question, answer => {
      resolve(answer.trim());
    });
  });
}

function toPluginId(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
}

/**
 * manifest.jsonを生成
 */
function generateManifest(config: PluginConfig): object {
  const manifest: any = {
    manifest_version: 1,
    version: config.version,
    type: 'APP',
    name: {
      ja: config.displayName,
      en: config.displayName
    },
    description: {
      ja: config.description,
      en: config.description
    },
    icon: 'image/icon.png',
    desktop: {
      js: ['js/desktop.js'],
      css: ['css/desktop.css']
    }
  };

  if (config.hasMobile) {
    manifest.mobile = {
      js: ['js/mobile.js'],
      css: ['css/mobile.css']
    };
  }

  if (config.hasConfig) {
    manifest.config = {
      html: 'html/config.html',
      js: ['js/config.js'],
      css: ['css/config.css']
    };
  }

  return manifest;
}

/**
 * デスクトップ用JSテンプレート
 */
function generateDesktopJs(config: PluginConfig): string {
  return `((PLUGIN_ID) => {
  'use strict';

  // プラグイン設定を取得
  const config = kintone.plugin.app.getConfig(PLUGIN_ID);
  console.log('${config.displayName} loaded', config);

  kintone.events.on('app.record.index.show', (event) => {
    // レコード一覧画面の処理
    return event;
  });

  kintone.events.on('app.record.detail.show', (event) => {
    // レコード詳細画面の処理
    return event;
  });

  kintone.events.on(['app.record.create.show', 'app.record.edit.show'], (event) => {
    // レコード作成・編集画面の処理
    return event;
  });
})(kintone.$PLUGIN_ID);
`;
}

/**
 * モバイル用JSテンプレート
 */
function generateMobileJs(config: PluginConfig): string {
  return `((PLUGIN_ID) => {
  'use strict';

  const config = kintone.plugin.app.getConfig(PLUGIN_ID);
  console.log('${config.displayName} (mobile) loaded', config);

  kintone.events.on('mobile.app.record.index.show', (event) => {
    return event;
  });

  kintone.events.on('mobile.app.record.detail.show', (event) => {
    return event;
  });
})(kintone.$PLUGIN_ID);
`;
}

/**
 * 設定画面JSテンプレート
 */
function generateConfigJs(config: PluginConfig): string {
  return `((PLUGIN_ID) => {
  'use strict';

  // 現在の設定を取得
  const config = kintone.plugin.app.getConfig(PLUGIN_ID);

  // フォーム要素を取得
  const form = document.getElementById('plugin-config-form');
  const cancelButton = document.getElementById('cancel-button');
  const saveButton = document.getElementById('save-button');

  // 設定を復元
  if (config.setting1) {
    (document.getElementById('setting1') as HTMLInputElement).value = config.setting1;
  }

  // キャンセルボタン
  cancelButton?.addEventListener('click', () => {
    history.back();
  });

  // 保存ボタン
  form?.addEventListener('submit', (e) => {
    e.preventDefault();

    const setting1 = (document.getElementById('setting1') as HTMLInputElement).value;

    // 設定を保存
    kintone.plugin.app.setConfig(
      { setting1 },
      () => {
        alert('設定を保存しました。アプリを更新してください。');
        history.back();
      }
    );
  });
})(kintone.$PLUGIN_ID);
`;
}

/**
 * 設定画面HTMLテンプレート
 */
function generateConfigHtml(config: PluginConfig): string {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${config.displayName} 設定</title>
</head>
<body>
  <div class="plugin-config-container">
    <h1 class="plugin-config-title">${config.displayName} 設定</h1>

    <form id="plugin-config-form">
      <div class="form-group">
        <label for="setting1">設定項目1</label>
        <input type="text" id="setting1" name="setting1" class="form-control">
        <p class="form-help">設定項目の説明文</p>
      </div>

      <div class="form-actions">
        <button type="button" id="cancel-button" class="btn btn-secondary">キャンセル</button>
        <button type="submit" id="save-button" class="btn btn-primary">保存</button>
      </div>
    </form>
  </div>
</body>
</html>
`;
}

/**
 * CSSテンプレート
 */
function generateDesktopCss(): string {
  return `/* ${new Date().toISOString().split('T')[0]} - Desktop styles */

.plugin-container {
  padding: 16px;
}
`;
}

function generateMobileCss(): string {
  return `/* ${new Date().toISOString().split('T')[0]} - Mobile styles */

.plugin-container {
  padding: 8px;
}
`;
}

function generateConfigCss(): string {
  return `/* Plugin config styles */

.plugin-config-container {
  max-width: 600px;
  margin: 0 auto;
  padding: 24px;
}

.plugin-config-title {
  font-size: 24px;
  margin-bottom: 24px;
  color: #333;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-weight: bold;
  margin-bottom: 8px;
  color: #333;
}

.form-control {
  width: 100%;
  padding: 8px 12px;
  font-size: 14px;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-sizing: border-box;
}

.form-control:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
}

.form-help {
  margin-top: 4px;
  font-size: 12px;
  color: #666;
}

.form-actions {
  margin-top: 32px;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn {
  padding: 10px 24px;
  font-size: 14px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-primary {
  background-color: #3498db;
  color: white;
}

.btn-primary:hover {
  background-color: #2980b9;
}

.btn-secondary {
  background-color: #95a5a6;
  color: white;
}

.btn-secondary:hover {
  background-color: #7f8c8d;
}
`;
}

/**
 * デフォルトアイコンを生成（シンプルなSVGをPNG化する代わりにプレースホルダー）
 */
function generateIconPlaceholder(): Buffer {
  // 1x1の透明PNG（最小サイズ）- 実際には適切なアイコンに置き換える必要がある
  // Base64でエンコードされた54x54の青い四角のPNG
  const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAADYAAAA2CAYAAACMRWrdAAAAP0lEQVRoge3OMQEAAAjDMPBvmh0DTQR0aXPv7gUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAODVAL38AAHpJNPfAAAAAElFTkSuQmCC';
  return Buffer.from(pngBase64, 'base64');
}

/**
 * プラグイン設定をplugin.config.tsに追加
 */
function updatePluginConfig(name: string): void {
  const configPath = resolve(__dirname, '../plugin.config.ts');

  if (!existsSync(configPath)) {
    // 新規作成
    const content = `import dotenv from 'dotenv';
dotenv.config();

export interface PluginConfig {
  name: string;
  displayName: string;
}

export interface Plugins {
  [key: string]: PluginConfig;
}

// プラグインの設定
// npm run create:plugin で自動追加されます
export const plugins: Plugins = {
  '${name}': {
    name: '${name}',
    displayName: '${name}'
  }
};
`;
    writeFileSync(configPath, content);
    console.log(`   ✅ plugin.config.ts を作成しました`);
  } else {
    // 既存ファイルに追加
    let content = readFileSync(configPath, 'utf-8');

    // プラグインが既に存在するか確認
    if (content.includes(`'${name}':`)) {
      console.log(`   ⚠️  プラグイン '${name}' は既に登録されています`);
      return;
    }

    // plugins オブジェクトに追加
    const insertPoint = content.lastIndexOf('};');
    if (insertPoint === -1) {
      console.error('   ❌ plugin.config.ts の形式が不正です');
      return;
    }

    const newEntry = `  '${name}': {
    name: '${name}',
    displayName: '${name}'
  },
`;

    content = content.slice(0, insertPoint) + newEntry + content.slice(insertPoint);
    writeFileSync(configPath, content);
    console.log(`   ✅ plugin.config.ts にプラグインを追加しました`);
  }
}

/**
 * プラグインを作成
 */
async function createPlugin(config: PluginConfig): Promise<void> {
  const pluginDir = resolve(__dirname, '../src/plugins', config.name);

  if (existsSync(pluginDir)) {
    console.error(`❌ プラグインディレクトリが既に存在します: ${pluginDir}`);
    process.exit(1);
  }

  console.log(`\n📦 プラグイン '${config.name}' を作成中...\n`);

  // ディレクトリ作成
  mkdirSync(resolve(pluginDir, 'css'), { recursive: true });
  mkdirSync(resolve(pluginDir, 'image'), { recursive: true });
  if (config.hasConfig) {
    mkdirSync(resolve(pluginDir, 'html'), { recursive: true });
  }

  // manifest.json
  const manifest = generateManifest(config);
  writeFileSync(
    resolve(pluginDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );
  console.log(`   ✅ manifest.json`);

  // デスクトップJS/CSS
  writeFileSync(resolve(pluginDir, 'desktop.ts'), generateDesktopJs(config));
  writeFileSync(resolve(pluginDir, 'css/desktop.css'), generateDesktopCss());
  console.log(`   ✅ desktop.ts, css/desktop.css`);

  // モバイルJS/CSS
  if (config.hasMobile) {
    writeFileSync(resolve(pluginDir, 'mobile.ts'), generateMobileJs(config));
    writeFileSync(resolve(pluginDir, 'css/mobile.css'), generateMobileCss());
    console.log(`   ✅ mobile.ts, css/mobile.css`);
  }

  // 設定画面
  if (config.hasConfig) {
    writeFileSync(resolve(pluginDir, 'config.ts'), generateConfigJs(config));
    writeFileSync(resolve(pluginDir, 'html/config.html'), generateConfigHtml(config));
    writeFileSync(resolve(pluginDir, 'css/config.css'), generateConfigCss());
    console.log(`   ✅ config.ts, html/config.html, css/config.css`);
  }

  // アイコン（プレースホルダー）
  writeFileSync(resolve(pluginDir, 'image/icon.png'), generateIconPlaceholder());
  console.log(`   ✅ image/icon.png (プレースホルダー - 54x54pxの画像に置き換えてください)`);

  // plugin.config.tsを更新
  updatePluginConfig(config.name);

  console.log(`\n✅ プラグイン '${config.name}' を作成しました！`);
  console.log(`\n📁 ディレクトリ: src/plugins/${config.name}/`);
  console.log(`\n💡 次のステップ:`);
  console.log(`   1. image/icon.png を54x54pxのアイコンに置き換える`);
  console.log(`   2. npm run dev:plugin -- ${config.name} で開発開始`);
  console.log(`   3. npm run build:plugin -- ${config.name} でビルド`);
  console.log(`   4. npm run upload:plugin -- ${config.name} でアップロード`);
}

/**
 * メイン処理
 */
async function main(): Promise<void> {
  console.log('🔌 kintoneプラグイン作成ウィザード\n');

  const name = await prompt('プラグイン名 (英数字とハイフン): ');
  if (!name || !/^[a-z0-9-]+$/.test(name)) {
    console.error('❌ プラグイン名は英小文字、数字、ハイフンのみ使用できます');
    process.exit(1);
  }

  const displayName = await prompt('表示名 (日本語可): ') || name;
  const description = await prompt('説明: ') || '';
  const version = await prompt('バージョン (default: 1.0.0): ') || '1.0.0';
  const hasConfigStr = await prompt('設定画面を作成しますか？ (Y/n): ');
  const hasMobileStr = await prompt('モバイル対応しますか？ (y/N): ');

  const config: PluginConfig = {
    name,
    displayName,
    description,
    version,
    hasConfig: hasConfigStr.toLowerCase() !== 'n',
    hasMobile: hasMobileStr.toLowerCase() === 'y'
  };

  rl.close();

  await createPlugin(config);
}

main().catch(err => {
  console.error('❌ エラー:', err.message);
  rl.close();
  process.exit(1);
});
