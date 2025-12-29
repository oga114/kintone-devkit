import { KintoneRestAPIClient } from '@kintone/rest-api-client';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { apps, getKintoneConfig, getAppId } from '../kintone.config.js';
import { getTargetApps } from './utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface AppSchema {
  appId: string;
  appName: string;
  environment: string;
  fetchedAt: string;
  baseUrl: string;
  settings: any;
  fields: any;
  layout: any;
  views: any;
}

/**
 * kintoneアプリのスキーマ（設計情報）を取得して保存する
 */
async function fetchSchema(): Promise<void> {
  const targetApps = getTargetApps();
  const environment = process.env.KINTONE_ENV || 'dev';

  // 環境に応じた接続設定を取得
  const config = getKintoneConfig(environment);

  console.log(`🔍 kintoneアプリのスキーマを取得します (環境: ${environment})\n`);
  console.log(`   接続先: ${config.baseUrl}\n`);

  if (!config.baseUrl) {
    console.error('❌ KINTONE_BASE_URLが設定されていません');
    process.exit(1);
  }

  const client = new KintoneRestAPIClient({
    baseUrl: config.baseUrl,
    auth: config.auth
  });

  const appEntries = Object.entries(apps);

  if (appEntries.length === 0) {
    console.log('⚠️  対象のアプリがありません。npm run create でアプリを作成してください。');
    return;
  }

  for (const [appName, appConfig] of appEntries) {
    // targetAppsが指定されている場合はフィルタリング
    if (targetApps && !targetApps.includes(appName)) {
      continue;
    }

    // 環境に応じたアプリIDを取得
    const appId = getAppId(appName, environment);

    if (!appId) {
      console.log(`⚠️  ${appName}: ${environment}環境のアプリIDが設定されていません`);
      continue;
    }

    try {
      console.log(`📦 ${appName} (App ID: ${appId})`);

      // 各種設計情報を取得
      console.log('   📋 アプリ設定を取得中...');
      const settings = await client.app.getAppSettings({ app: appId });

      console.log('   📝 フィールド情報を取得中...');
      const fields = await client.app.getFormFields({ app: appId });

      console.log('   📐 フォームレイアウトを取得中...');
      const layout = await client.app.getFormLayout({ app: appId });

      console.log('   👁️  ビュー設定を取得中...');
      const views = await client.app.getViews({ app: appId });

      // スキーマオブジェクトを構築
      const schema: AppSchema = {
        appId,
        appName,
        environment,
        fetchedAt: new Date().toISOString(),
        baseUrl: config.baseUrl!,
        settings: settings,
        fields: fields.properties,
        layout: layout.layout,
        views: views.views
      };

      // .kintone/<appName>/ディレクトリを作成
      const schemaDir = resolve(__dirname, '../.kintone', appName);
      if (!existsSync(schemaDir)) {
        mkdirSync(schemaDir, { recursive: true });
      }

      // スキーマをJSONファイルに保存
      const schemaPath = resolve(schemaDir, `schema.${environment}.json`);
      writeFileSync(schemaPath, JSON.stringify(schema, null, 2));
      console.log(`   ✅ スキーマ保存: .kintone/${appName}/schema.${environment}.json`);

      // フィールド一覧を表示
      const fieldCodes = Object.keys(schema.fields);
      console.log(`   📊 フィールド数: ${fieldCodes.length}`);

    } catch (error) {
      console.error(`❌ ${appName}: エラー`, (error as Error).message);
    }
  }

  console.log('\n✅ スキーマ取得完了！');
  console.log('\nℹ️  取得したスキーマは .kintone/<appName>/schema.<env>.json に保存されています。');
  console.log('ℹ️  環境を切り替えるには KINTONE_ENV=prod npm run schema を実行してください。\n');
}

/**
 * 2つの環境のスキーマを比較して差分を表示する
 */
export async function compareSchemas(appName: string, env1: string = 'dev', env2: string = 'prod'): Promise<void> {
  const schemaDir = resolve(__dirname, '../.kintone', appName);
  const schema1Path = resolve(schemaDir, `schema.${env1}.json`);
  const schema2Path = resolve(schemaDir, `schema.${env2}.json`);

  if (!existsSync(schema1Path)) {
    console.error(`❌ ${env1}環境のスキーマが見つかりません: ${schema1Path}`);
    console.log(`   KINTONE_ENV=${env1} npm run schema -- ${appName} を実行してください`);
    return;
  }

  if (!existsSync(schema2Path)) {
    console.error(`❌ ${env2}環境のスキーマが見つかりません: ${schema2Path}`);
    console.log(`   KINTONE_ENV=${env2} npm run schema -- ${appName} を実行してください`);
    return;
  }

  const schema1: AppSchema = JSON.parse(readFileSync(schema1Path, 'utf-8'));
  const schema2: AppSchema = JSON.parse(readFileSync(schema2Path, 'utf-8'));

  console.log(`\n🔍 スキーマ差分: ${appName}`);
  console.log(`   ${env1}: ${schema1.fetchedAt}`);
  console.log(`   ${env2}: ${schema2.fetchedAt}\n`);

  // フィールドの差分を検出
  const fields1 = new Set(Object.keys(schema1.fields));
  const fields2 = new Set(Object.keys(schema2.fields));

  const addedFields = [...fields1].filter(f => !fields2.has(f));
  const removedFields = [...fields2].filter(f => !fields1.has(f));
  const commonFields = [...fields1].filter(f => fields2.has(f));

  if (addedFields.length > 0) {
    console.log(`➕ ${env1}にのみ存在するフィールド:`);
    addedFields.forEach(f => console.log(`   - ${f} (${schema1.fields[f].type})`));
  }

  if (removedFields.length > 0) {
    console.log(`➖ ${env2}にのみ存在するフィールド:`);
    removedFields.forEach(f => console.log(`   - ${f} (${schema2.fields[f].type})`));
  }

  // 共通フィールドの型変更をチェック
  const changedFields: string[] = [];
  commonFields.forEach(f => {
    if (schema1.fields[f].type !== schema2.fields[f].type) {
      changedFields.push(f);
    }
  });

  if (changedFields.length > 0) {
    console.log(`🔄 型が変更されたフィールド:`);
    changedFields.forEach(f => {
      console.log(`   - ${f}: ${schema2.fields[f].type} → ${schema1.fields[f].type}`);
    });
  }

  // ビューの差分を検出
  const views1 = new Set(Object.keys(schema1.views));
  const views2 = new Set(Object.keys(schema2.views));

  const addedViews = [...views1].filter(v => !views2.has(v));
  const removedViews = [...views2].filter(v => !views1.has(v));

  if (addedViews.length > 0) {
    console.log(`➕ ${env1}にのみ存在するビュー:`);
    addedViews.forEach(v => console.log(`   - ${schema1.views[v].name}`));
  }

  if (removedViews.length > 0) {
    console.log(`➖ ${env2}にのみ存在するビュー:`);
    removedViews.forEach(v => console.log(`   - ${schema2.views[v].name}`));
  }

  if (addedFields.length === 0 && removedFields.length === 0 &&
      changedFields.length === 0 && addedViews.length === 0 && removedViews.length === 0) {
    console.log('✅ 差分はありません');
  }

  console.log();
}

// メイン実行
fetchSchema().catch(console.error);
