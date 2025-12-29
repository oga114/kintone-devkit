import { KintoneRestAPIClient } from '@kintone/rest-api-client';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { apps, kintoneConfig, getAppId } from '../kintone.config.js';
import { getTargetApps } from './utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface ManifestItem {
  type: 'FILE' | 'URL';
  name?: string;
  localPath?: string;
  url?: string;
}

interface Manifest {
  js: ManifestItem[];
  css: ManifestItem[];
}

type UploadedFile =
  | { type: 'FILE'; file: { fileKey: string } }
  | { type: 'URL'; url: string };

/**
 * .kintoneディレクトリから保存されたファイルを読み込む
 */
function loadSavedFiles(appName: string): Manifest {
  const kintoneDir = resolve(__dirname, '../.kintone', appName);
  const manifestPath = resolve(kintoneDir, 'manifest.json');

  if (!existsSync(manifestPath)) {
    return { js: [], css: [] };
  }

  try {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
    return {
      js: manifest.js || [],
      css: manifest.css || []
    };
  } catch (err) {
    console.log(`   ⚠️  マニフェスト読み込みエラー: ${(err as Error).message}`);
    return { js: [], css: [] };
  }
}

export async function uploadToKintone(targetApps: string[] | null = null): Promise<void> {
  console.log('🚀 kintoneへアップロード中...\n');

  if (!kintoneConfig.baseUrl) {
    console.error('❌ KINTONE_BASE_URLが設定されていません');
    process.exit(1);
  }

  const client = new KintoneRestAPIClient({
    baseUrl: kintoneConfig.baseUrl,
    auth: kintoneConfig.auth
  });

  for (const [appName, appConfig] of Object.entries(apps)) {
    // targetAppsが指定されている場合はフィルタリング
    if (targetApps && !targetApps.includes(appName)) {
      continue;
    }

    // 開発環境のアプリIDを使用
    const appId = getAppId(appName, 'dev');
    const jsFileName = `${appName}.js`;
    const cssFileName = `${appName}.css`;
    const bundlePath = resolve(__dirname, '../dist', appName, jsFileName);
    const cssPath = resolve(__dirname, '../dist', appName, cssFileName);

    if (!existsSync(bundlePath)) {
      console.log(`⚠️  ${appName}: バンドルファイルが見つかりません (dist/${appName}/${jsFileName})`);
      continue;
    }

    if (!appId) {
      console.log(`⚠️  ${appName}: アプリIDが設定されていません`);
      continue;
    }

    try {
      console.log(`\n📦 ${appName} の処理を開始...`);
      console.log(`   JS: dist/${appName}/${jsFileName}`);
      if (existsSync(cssPath)) {
        console.log(`   CSS: dist/${appName}/${cssFileName}`);
      }

      // 1. 保存されたファイルを読み込む
      const savedFiles = loadSavedFiles(appName);
      console.log(`   📂 保存されたファイル: JS ${savedFiles.js.length}件, CSS ${savedFiles.css.length}件`);

      // 2. ビルドされたJSファイルをアップロード
      const jsCode = readFileSync(bundlePath, 'utf-8');
      console.log(`   ⬆️  ${jsFileName} をアップロード中...`);
      const { fileKey: jsFileKey } = await client.file.uploadFile({
        file: {
          name: jsFileName,
          data: jsCode
        }
      });
      console.log(`   ✅ ${jsFileName} fileKey: ${jsFileKey}`);

      // 3. ビルドされたCSSファイルをアップロード
      let cssFileKey: string | null = null;
      if (existsSync(cssPath)) {
        console.log(`   ⬆️  ${cssFileName} をアップロード中...`);
        const cssCode = readFileSync(cssPath, 'utf-8');
        const cssUploadResult = await client.file.uploadFile({
          file: {
            name: cssFileName,
            data: cssCode
          }
        });
        cssFileKey = cssUploadResult.fileKey;
        console.log(`   ✅ ${cssFileName} fileKey: ${cssFileKey}`);
      }

      // 4. 保存されたFILEタイプのファイルを再アップロード
      const savedJsFiles: UploadedFile[] = [];
      const kintoneDir = resolve(__dirname, '../.kintone', appName);

      for (const item of savedFiles.js) {
        if (item.type === 'FILE' && item.localPath) {
          const localPath = resolve(kintoneDir, item.localPath);
          if (existsSync(localPath)) {
            console.log(`   ⬆️  ${item.name} を再アップロード中...`);
            const fileData = readFileSync(localPath, 'utf-8');
            const uploadResult = await client.file.uploadFile({
              file: {
                name: item.name!,
                data: fileData
              }
            });
            savedJsFiles.push({
              type: 'FILE',
              file: {
                fileKey: uploadResult.fileKey
              }
            });
            console.log(`   ✅ ${item.name} fileKey: ${uploadResult.fileKey}`);
          }
        }
      }

      const savedCssFiles: UploadedFile[] = [];
      for (const item of savedFiles.css) {
        if (item.type === 'FILE' && item.localPath) {
          const localPath = resolve(kintoneDir, item.localPath);
          if (existsSync(localPath)) {
            console.log(`   ⬆️  ${item.name} を再アップロード中...`);
            const fileData = readFileSync(localPath, 'utf-8');
            const uploadResult = await client.file.uploadFile({
              file: {
                name: item.name!,
                data: fileData
              }
            });
            savedCssFiles.push({
              type: 'FILE',
              file: {
                fileKey: uploadResult.fileKey
              }
            });
            console.log(`   ✅ ${item.name} fileKey: ${uploadResult.fileKey}`);
          }
        }
      }

      // 5. 現在のカスタマイズ設定を取得（mobile設定保持用）
      console.log(`   📖 現在のカスタマイズ設定を取得中...`);
      const currentCustomize = await client.app.getAppCustomize({ app: appId });

      // 6. マニフェストからURL型ファイルを取得
      const urlJsItems = savedFiles.js
        .filter((item): item is ManifestItem & { type: 'URL'; url: string } =>
          item.type === 'URL' && typeof item.url === 'string'
        );
      const urlCssItems = savedFiles.css
        .filter((item): item is ManifestItem & { type: 'URL'; url: string } =>
          item.type === 'URL' && typeof item.url === 'string'
        );

      // 7. 最終的なファイルリストを構築
      // 順序: 保存されたFILEファイル → URL型ファイル → 新しいbundle.js/style.css
      const desktopJs: UploadedFile[] = [
        ...savedJsFiles,
        ...urlJsItems.map(item => ({ type: 'URL' as const, url: item.url })),
        {
          type: 'FILE' as const,
          file: {
            fileKey: jsFileKey
          }
        }
      ];

      const desktopCss: UploadedFile[] = [
        ...savedCssFiles,
        ...urlCssItems.map(item => ({ type: 'URL' as const, url: item.url }))
      ];

      if (cssFileKey) {
        desktopCss.push({
          type: 'FILE',
          file: {
            fileKey: cssFileKey
          }
        });
      }

      console.log(`   📝 カスタマイズ設定を更新中...`);
      console.log(`      アップロードするJS: ${desktopJs.length}件`);
      console.log(`      アップロードするCSS: ${desktopCss.length}件`);

      await client.app.updateAppCustomize({
        app: appId,
        scope: 'ALL',
        desktop: {
          js: desktopJs,
          css: desktopCss
        },
        mobile: currentCustomize.mobile || { js: [], css: [] }
      });

      // 8. カスタマイズのデプロイ
      console.log(`   🚀 デプロイ中...`);
      await client.app.deployApp({
        apps: [{ app: appId }],
        revert: false
      });

      console.log(`✅ ${appName} (App ID: ${appId}): アップロード完了\n`);
    } catch (error) {
      console.error(`❌ ${appName}: アップロードエラー`, (error as Error).message);
      if ((error as any).errors) {
        console.error('   詳細:', JSON.stringify((error as any).errors, null, 2));
      }
    }
  }

  console.log('\n📤 アップロード処理が完了しました\n');
}

// このスクリプトが直接実行された場合
const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] === currentFile || process.argv[1].endsWith('upload.js')) {
  const targetApps = getTargetApps();
  uploadToKintone(targetApps).catch(console.error);
}
