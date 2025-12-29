import { KintoneRestAPIClient } from '@kintone/rest-api-client';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { apps, kintoneConfig } from '../kintone.config.js';
import { getTargetApps } from './utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const targetApps = getTargetApps();

interface ManifestItem {
  type: 'FILE' | 'URL';
  name?: string;
  localPath?: string;
  url?: string;
}

interface Manifest {
  appId: string | undefined;
  appName: string;
  syncDate: string;
  js: ManifestItem[];
  css: ManifestItem[];
}

interface CustomizeFile {
  type: 'FILE' | 'URL';
  file?: {
    fileKey: string;
    name: string;
  };
  url?: string;
}

/**
 * 既存のkintoneアプリのJS/CSSファイルをダウンロードして保存する
 * これにより、次回のアップロード時に既存ファイルを保持できる
 */
async function syncExistingFiles(): Promise<void> {
  console.log('🔄 既存ファイルの同期を開始...\n');

  if (!kintoneConfig.baseUrl) {
    console.error('❌ KINTONE_BASE_URLが設定されていません');
    process.exit(1);
  }

  const client = new KintoneRestAPIClient({
    baseUrl: kintoneConfig.baseUrl,
    auth: kintoneConfig.auth
  });

  const appEntries = Object.entries(apps);

  if (appEntries.length === 0) {
    console.log('⚠️  同期対象のアプリがありません。npm run create でアプリを作成してください。');
    return;
  }

  for (const [appName, appConfig] of appEntries) {
    // targetAppsが指定されている場合はフィルタリング
    if (targetApps && !targetApps.includes(appName)) {
      continue;
    }

    const appId = appConfig.id;

    if (!appId) {
      console.log(`⚠️  ${appName}: アプリIDが設定されていません`);
      continue;
    }

    try {
      console.log(`\n📦 ${appName} (App ID: ${appId})`);

      // カスタマイズ設定を取得
      const customize = await client.app.getAppCustomize({ app: appId });

      const existingJs = (customize.desktop?.js || []) as CustomizeFile[];
      const existingCss = (customize.desktop?.css || []) as CustomizeFile[];

      // .kintoneディレクトリを作成
      const kintoneDir = resolve(__dirname, '../.kintone', appName);
      if (!existsSync(kintoneDir)) {
        mkdirSync(kintoneDir, { recursive: true });
      }

      const manifest: Manifest = {
        appId: appId,
        appName: appName,
        syncDate: new Date().toISOString(),
        js: [],
        css: []
      };

      // JSファイルをダウンロード
      console.log(`   📥 JSファイル: ${existingJs.length}件`);
      for (let i = 0; i < existingJs.length; i++) {
        const jsItem = existingJs[i];

        if (jsItem.type === 'FILE' && jsItem.file?.fileKey) {
          const fileName = jsItem.file.name || `file-${i}.js`;
          console.log(`      - ${fileName} (FILE型)`);

          // ファイルをダウンロード
          try {
            const fileData = await client.file.downloadFile({ fileKey: jsItem.file.fileKey });
            const filePath = resolve(kintoneDir, fileName);
            writeFileSync(filePath, Buffer.from(fileData as ArrayBuffer));

            manifest.js.push({
              type: 'FILE',
              name: fileName,
              localPath: fileName
            });
          } catch (err) {
            console.log(`      ⚠️  ダウンロード失敗: ${(err as Error).message}`);
          }
        } else if (jsItem.type === 'URL' && jsItem.url) {
          console.log(`      - ${jsItem.url} (URL型 - スキップ)`);
          manifest.js.push({
            type: 'URL',
            url: jsItem.url
          });
        }
      }

      // CSSファイルをダウンロード
      console.log(`   📥 CSSファイル: ${existingCss.length}件`);
      for (let i = 0; i < existingCss.length; i++) {
        const cssItem = existingCss[i];

        if (cssItem.type === 'FILE' && cssItem.file?.fileKey) {
          const fileName = cssItem.file.name || `file-${i}.css`;
          console.log(`      - ${fileName} (FILE型)`);

          // ファイルをダウンロード
          try {
            const fileData = await client.file.downloadFile({ fileKey: cssItem.file.fileKey });
            const filePath = resolve(kintoneDir, fileName);
            writeFileSync(filePath, Buffer.from(fileData as ArrayBuffer));

            manifest.css.push({
              type: 'FILE',
              name: fileName,
              localPath: fileName
            });
          } catch (err) {
            console.log(`      ⚠️  ダウンロード失敗: ${(err as Error).message}`);
          }
        } else if (cssItem.type === 'URL' && cssItem.url) {
          console.log(`      - ${cssItem.url} (URL型 - スキップ)`);
          manifest.css.push({
            type: 'URL',
            url: cssItem.url
          });
        }
      }

      // マニフェストファイルを保存
      const manifestPath = resolve(kintoneDir, 'manifest.json');
      writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
      console.log(`   ✅ マニフェスト保存: .kintone/${appName}/manifest.json`);

    } catch (error) {
      console.error(`❌ ${appName}: エラー`, (error as Error).message);
    }
  }

  console.log('\n✅ 同期完了！');
  console.log('\nℹ️  次回のアップロード時に、.kintoneディレクトリのファイルが自動的に含まれます。');
  console.log('ℹ️  不要なファイルは .kintone/<appName>/manifest.json から削除してください。\n');
}

syncExistingFiles().catch(console.error);
