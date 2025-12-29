import { resolve } from 'path';
import { readdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';

const __dirname = resolve(fileURLToPath(import.meta.url), '..');

export interface EntryPoints {
  [key: string]: string;
}

/**
 * コマンドライン引数からアプリ名を取得
 * 使い方: npm run dev -- app1
 * 使い方: npm run dev -- app1,app2
 */
export function getTargetApps(): string[] | null {
  const args = process.argv.slice(2);

  // -- の後の引数を取得
  const dashDashIndex = process.argv.indexOf('--');
  const targetArg = dashDashIndex !== -1 && process.argv[dashDashIndex + 1]
    ? process.argv[dashDashIndex + 1]
    : args[0];

  if (targetArg) {
    // カンマ区切りで複数指定可能
    const apps = targetArg.split(',').map(app => app.trim());
    console.log(`🎯 対象アプリ: ${apps.join(', ')}\n`);
    return apps;
  }

  return null; // 全アプリ
}

/**
 * Viteのビルド用にエントリーポイントをフィルタリング
 */
export function getFilteredEntries(targetApps: string[] | null): EntryPoints {
  const appsDir = resolve(__dirname, '../src/apps');
  const appEntries: EntryPoints = {};

  if (!existsSync(appsDir)) {
    console.log('src/apps ディレクトリが見つかりません');
    return appEntries;
  }

  try {
    const apps = readdirSync(appsDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    apps.forEach(app => {
      // targetAppsが指定されている場合はフィルタリング
      if (targetApps && !targetApps.includes(app)) {
        return;
      }

      // TypeScriptファイルを優先、なければJavaScriptファイル
      const tsPath = resolve(appsDir, app, 'index.ts');
      const jsPath = resolve(appsDir, app, 'index.js');

      if (existsSync(tsPath)) {
        appEntries[app] = tsPath;
      } else if (existsSync(jsPath)) {
        appEntries[app] = jsPath;
      }
    });
  } catch (e) {
    console.log('src/apps ディレクトリの読み込みに失敗しました:', e);
  }

  return appEntries;
}

/**
 * アプリ名を環境変数名に変換
 * 例: order-entry → ORDER_ENTRY_ID
 */
export function toEnvVarName(appName: string): string {
  return `${appName.toUpperCase().replace(/-/g, '_')}_ID`;
}

/**
 * アプリ名をキャメルケースに変換
 * 例: order-entry → orderEntry
 */
export function toCamelCase(str: string): string {
  return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}
