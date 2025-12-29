import { existsSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getTargetApps } from './utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface AppSchema {
  appId: string;
  appName: string;
  environment: string;
  fetchedAt: string;
  settings: any;
  fields: Record<string, { type: string; label: string; [key: string]: any }>;
  layout: any[];
  views: Record<string, { name: string; type: string; [key: string]: any }>;
}

interface DiffResult {
  addedFields: string[];
  removedFields: string[];
  changedFields: { code: string; from: string; to: string }[];
  addedViews: string[];
  removedViews: string[];
  hasChanges: boolean;
}

/**
 * 2つの環境のスキーマを比較して差分を検出
 */
function compareSchemas(schema1: AppSchema, schema2: AppSchema): DiffResult {
  const fields1 = new Set(Object.keys(schema1.fields));
  const fields2 = new Set(Object.keys(schema2.fields));

  const addedFields = [...fields1].filter(f => !fields2.has(f));
  const removedFields = [...fields2].filter(f => !fields1.has(f));
  const commonFields = [...fields1].filter(f => fields2.has(f));

  const changedFields: { code: string; from: string; to: string }[] = [];
  commonFields.forEach(f => {
    if (schema1.fields[f].type !== schema2.fields[f].type) {
      changedFields.push({
        code: f,
        from: schema2.fields[f].type,
        to: schema1.fields[f].type
      });
    }
  });

  const views1 = new Set(Object.keys(schema1.views));
  const views2 = new Set(Object.keys(schema2.views));

  const addedViews = [...views1].filter(v => !views2.has(v));
  const removedViews = [...views2].filter(v => !views1.has(v));

  const hasChanges = addedFields.length > 0 || removedFields.length > 0 ||
                     changedFields.length > 0 || addedViews.length > 0 || removedViews.length > 0;

  return {
    addedFields,
    removedFields,
    changedFields,
    addedViews,
    removedViews,
    hasChanges
  };
}

/**
 * 差分を見やすく表示
 */
function displayDiff(appName: string, env1: string, env2: string, schema1: AppSchema, schema2: AppSchema, diff: DiffResult): void {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 ${appName} スキーマ差分`);
  console.log(`${'='.repeat(60)}`);
  console.log(`   ${env1}: ${schema1.fetchedAt}`);
  console.log(`   ${env2}: ${schema2.fetchedAt}`);
  console.log();

  if (!diff.hasChanges) {
    console.log('✅ 差分はありません\n');
    return;
  }

  // フィールドの差分
  if (diff.addedFields.length > 0) {
    console.log(`➕ ${env1}にのみ存在するフィールド (${diff.addedFields.length}件):`);
    diff.addedFields.forEach(f => {
      const field = schema1.fields[f];
      console.log(`   + ${f} [${field.type}] "${field.label || ''}"`);
    });
    console.log();
  }

  if (diff.removedFields.length > 0) {
    console.log(`➖ ${env2}にのみ存在するフィールド (${diff.removedFields.length}件):`);
    diff.removedFields.forEach(f => {
      const field = schema2.fields[f];
      console.log(`   - ${f} [${field.type}] "${field.label || ''}"`);
    });
    console.log();
  }

  if (diff.changedFields.length > 0) {
    console.log(`🔄 型が変更されたフィールド (${diff.changedFields.length}件):`);
    diff.changedFields.forEach(({ code, from, to }) => {
      console.log(`   ~ ${code}: ${from} → ${to}`);
    });
    console.log();
  }

  // ビューの差分
  if (diff.addedViews.length > 0) {
    console.log(`➕ ${env1}にのみ存在するビュー (${diff.addedViews.length}件):`);
    diff.addedViews.forEach(v => {
      const view = schema1.views[v];
      console.log(`   + ${view.name} [${view.type}]`);
    });
    console.log();
  }

  if (diff.removedViews.length > 0) {
    console.log(`➖ ${env2}にのみ存在するビュー (${diff.removedViews.length}件):`);
    diff.removedViews.forEach(v => {
      const view = schema2.views[v];
      console.log(`   - ${view.name} [${view.type}]`);
    });
    console.log();
  }

  // サマリー
  const totalChanges = diff.addedFields.length + diff.removedFields.length +
                       diff.changedFields.length + diff.addedViews.length + diff.removedViews.length;
  console.log(`📝 合計: ${totalChanges}件の差分\n`);
}

/**
 * メイン処理
 */
async function main(): Promise<void> {
  const targetApps = getTargetApps();
  const env1 = process.env.KINTONE_ENV_FROM || 'dev';
  const env2 = process.env.KINTONE_ENV_TO || 'prod';

  console.log(`🔍 スキーマ差分を検出します (${env1} vs ${env2})\n`);

  // .kintoneディレクトリ内のアプリを検索
  const kintoneDir = resolve(__dirname, '../.kintone');

  if (!existsSync(kintoneDir)) {
    console.error('❌ .kintoneディレクトリが見つかりません');
    console.log('   npm run schema でスキーマを取得してください');
    process.exit(1);
  }

  // 対象アプリを特定
  const { readdirSync } = await import('fs');
  let appDirs = readdirSync(kintoneDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  if (targetApps) {
    appDirs = appDirs.filter(app => targetApps.includes(app));
  }

  if (appDirs.length === 0) {
    console.log('⚠️  対象のアプリがありません');
    return;
  }

  let hasAnyChanges = false;

  for (const appName of appDirs) {
    const schemaDir = resolve(kintoneDir, appName);
    const schema1Path = resolve(schemaDir, `schema.${env1}.json`);
    const schema2Path = resolve(schemaDir, `schema.${env2}.json`);

    if (!existsSync(schema1Path)) {
      console.log(`⚠️  ${appName}: ${env1}環境のスキーマがありません`);
      console.log(`   KINTONE_ENV=${env1} npm run schema -- ${appName} を実行してください\n`);
      continue;
    }

    if (!existsSync(schema2Path)) {
      console.log(`⚠️  ${appName}: ${env2}環境のスキーマがありません`);
      console.log(`   KINTONE_ENV=${env2} npm run schema -- ${appName} を実行してください\n`);
      continue;
    }

    const schema1: AppSchema = JSON.parse(readFileSync(schema1Path, 'utf-8'));
    const schema2: AppSchema = JSON.parse(readFileSync(schema2Path, 'utf-8'));

    const diff = compareSchemas(schema1, schema2);
    displayDiff(appName, env1, env2, schema1, schema2, diff);

    if (diff.hasChanges) {
      hasAnyChanges = true;
    }
  }

  if (!hasAnyChanges) {
    console.log('✅ すべてのアプリで差分はありません');
  }
}

main().catch(console.error);
