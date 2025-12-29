import { KintoneRestAPIClient } from '@kintone/rest-api-client';
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { apps, getKintoneConfig, getAppId } from '../kintone.config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface FieldConfig {
  type: string;
  code: string;
  label: string;
  [key: string]: any;
}

interface ViewConfig {
  name: string;
  type: string;
  index: string;
  [key: string]: any;
}

interface AppSchema {
  appId: string;
  appName: string;
  environment: string;
  fetchedAt: string;
  baseUrl: string;
  settings: any;
  fields: Record<string, FieldConfig>;
  layout: any[];
  views: Record<string, ViewConfig>;
}

interface DeployPlan {
  fieldsToAdd: string[];
  fieldsToUpdate: string[];
  fieldsToDelete: string[];
  viewsToAdd: string[];
  viewsToUpdate: string[];
  viewsToDelete: string[];
  layoutChanged: boolean;
}

// システムフィールド（変更不可）
const SYSTEM_FIELDS = new Set([
  'レコード番号', 'RECORD_NUMBER',
  '作成者', 'CREATOR',
  '更新者', 'MODIFIER',
  '作成日時', 'CREATED_TIME',
  '更新日時', 'UPDATED_TIME',
  'カテゴリー', 'CATEGORY',
  'ステータス', 'STATUS',
  '作業者', 'STATUS_ASSIGNEE',
  '$id', '$revision'
]);

// 変更不可のフィールド型
const IMMUTABLE_FIELD_TYPES = new Set([
  'RECORD_NUMBER', 'CREATOR', 'MODIFIER', 'CREATED_TIME', 'UPDATED_TIME',
  'CATEGORY', 'STATUS', 'STATUS_ASSIGNEE'
]);

const RECORDS_PER_REQUEST = 500;

interface BackupMetadata {
  appId: string;
  appName: string;
  environment: string;
  backupAt: string;
  baseUrl: string;
  totalRecords: number;
  reason: string;
}

interface BackupData {
  metadata: BackupMetadata;
  records: any[];
}

/**
 * 全レコードを取得（10,000件以上対応）
 */
async function fetchAllRecords(
  client: KintoneRestAPIClient,
  appId: string
): Promise<any[]> {
  const allRecords: any[] = [];
  let lastId = 0;

  while (true) {
    const idCondition = `$id > ${lastId}`;
    const fullQuery = `${idCondition} order by $id asc limit ${RECORDS_PER_REQUEST}`;

    const response = await client.record.getRecords({
      app: appId,
      query: fullQuery
    });

    const records = response.records;

    if (records.length === 0) {
      break;
    }

    allRecords.push(...records);
    process.stdout.write(`\r      📥 ${allRecords.length}件取得中...`);

    const lastRecord = records[records.length - 1];
    lastId = parseInt(String(lastRecord.$id.value), 10);

    if (records.length < RECORDS_PER_REQUEST) {
      break;
    }
  }

  return allRecords;
}

/**
 * デプロイ前にレコードをバックアップ
 */
async function backupBeforeDeploy(
  client: KintoneRestAPIClient,
  appName: string,
  appId: string,
  environment: string,
  baseUrl: string
): Promise<string> {
  console.log(`   💾 レコードをバックアップ中...`);

  const records = await fetchAllRecords(client, appId);

  if (records.length === 0) {
    console.log(`\r      ⚠️  バックアップ対象のレコードがありません`);
    return '';
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupData: BackupData = {
    metadata: {
      appId,
      appName,
      environment,
      backupAt: new Date().toISOString(),
      baseUrl,
      totalRecords: records.length,
      reason: 'pre-deploy'
    },
    records
  };

  const backupDir = resolve(__dirname, '../.kintone', appName, 'backups');
  if (!existsSync(backupDir)) {
    mkdirSync(backupDir, { recursive: true });
  }

  const backupPath = resolve(backupDir, `backup-${environment}-${timestamp}.json`);
  writeFileSync(backupPath, JSON.stringify(backupData, null, 2), 'utf-8');

  console.log(`\r      ✅ バックアップ完了: ${records.length}件 → ${backupPath}`);

  return backupPath;
}

/**
 * スキーマファイルを読み込む
 */
function loadSchema(appName: string, env: string): AppSchema | null {
  const schemaPath = resolve(__dirname, '../.kintone', appName, `schema.${env}.json`);

  if (!existsSync(schemaPath)) {
    return null;
  }

  return JSON.parse(readFileSync(schemaPath, 'utf-8'));
}

/**
 * デプロイ計画を作成
 */
function createDeployPlan(sourceSchema: AppSchema, targetSchema: AppSchema): DeployPlan {
  const sourceFields = new Set(Object.keys(sourceSchema.fields));
  const targetFields = new Set(Object.keys(targetSchema.fields));

  const sourceViews = new Set(Object.keys(sourceSchema.views));
  const targetViews = new Set(Object.keys(targetSchema.views));

  // フィールドの差分（システムフィールドを除外）
  const fieldsToAdd = [...sourceFields]
    .filter(f => !targetFields.has(f))
    .filter(f => !SYSTEM_FIELDS.has(f))
    .filter(f => !IMMUTABLE_FIELD_TYPES.has(sourceSchema.fields[f]?.type));

  const fieldsToDelete = [...targetFields]
    .filter(f => !sourceFields.has(f))
    .filter(f => !SYSTEM_FIELDS.has(f))
    .filter(f => !IMMUTABLE_FIELD_TYPES.has(targetSchema.fields[f]?.type));

  // 共通フィールドで設定が変わったもの
  const fieldsToUpdate = [...sourceFields]
    .filter(f => targetFields.has(f))
    .filter(f => !SYSTEM_FIELDS.has(f))
    .filter(f => !IMMUTABLE_FIELD_TYPES.has(sourceSchema.fields[f]?.type))
    .filter(f => {
      const source = sourceSchema.fields[f];
      const target = targetSchema.fields[f];
      // 型が同じで、ラベルや設定が異なる場合
      if (source.type !== target.type) return false; // 型変更は不可
      return JSON.stringify(source) !== JSON.stringify(target);
    });

  // ビューの差分
  const viewsToAdd = [...sourceViews].filter(v => !targetViews.has(v));
  const viewsToDelete = [...targetViews].filter(v => !sourceViews.has(v));
  const viewsToUpdate = [...sourceViews]
    .filter(v => targetViews.has(v))
    .filter(v => JSON.stringify(sourceSchema.views[v]) !== JSON.stringify(targetSchema.views[v]));

  // レイアウトの差分
  const layoutChanged = JSON.stringify(sourceSchema.layout) !== JSON.stringify(targetSchema.layout);

  return {
    fieldsToAdd,
    fieldsToUpdate,
    fieldsToDelete,
    viewsToAdd,
    viewsToUpdate,
    viewsToDelete,
    layoutChanged
  };
}

/**
 * デプロイ計画を表示
 */
function displayPlan(appName: string, plan: DeployPlan, sourceEnv: string, targetEnv: string, sourceSchema: AppSchema, targetSchema: AppSchema): boolean {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📋 ${appName} デプロイ計画 (${sourceEnv} → ${targetEnv})`);
  console.log(`${'='.repeat(60)}`);

  let hasChanges = false;

  if (plan.fieldsToAdd.length > 0) {
    hasChanges = true;
    console.log(`\n➕ 追加するフィールド (${plan.fieldsToAdd.length}件):`);
    plan.fieldsToAdd.forEach(f => {
      const field = sourceSchema.fields[f];
      console.log(`   + ${f} [${field.type}] "${field.label}"`);
    });
  }

  if (plan.fieldsToUpdate.length > 0) {
    hasChanges = true;
    console.log(`\n🔄 更新するフィールド (${plan.fieldsToUpdate.length}件):`);
    plan.fieldsToUpdate.forEach(f => {
      const field = sourceSchema.fields[f];
      console.log(`   ~ ${f} [${field.type}] "${field.label}"`);
    });
  }

  if (plan.fieldsToDelete.length > 0) {
    hasChanges = true;
    console.log(`\n➖ 削除するフィールド (${plan.fieldsToDelete.length}件):`);
    plan.fieldsToDelete.forEach(f => {
      const field = targetSchema.fields[f];
      console.log(`   - ${f} [${field.type}] "${field.label}"`);
    });
  }

  if (plan.viewsToAdd.length > 0) {
    hasChanges = true;
    console.log(`\n➕ 追加するビュー (${plan.viewsToAdd.length}件):`);
    plan.viewsToAdd.forEach(v => {
      const view = sourceSchema.views[v];
      console.log(`   + ${view.name} [${view.type}]`);
    });
  }

  if (plan.viewsToUpdate.length > 0) {
    hasChanges = true;
    console.log(`\n🔄 更新するビュー (${plan.viewsToUpdate.length}件):`);
    plan.viewsToUpdate.forEach(v => {
      const view = sourceSchema.views[v];
      console.log(`   ~ ${view.name} [${view.type}]`);
    });
  }

  if (plan.viewsToDelete.length > 0) {
    hasChanges = true;
    console.log(`\n➖ 削除するビュー (${plan.viewsToDelete.length}件):`);
    plan.viewsToDelete.forEach(v => {
      const view = targetSchema.views[v];
      console.log(`   - ${view.name} [${view.type}]`);
    });
  }

  if (plan.layoutChanged) {
    hasChanges = true;
    console.log(`\n📐 レイアウト: 変更あり`);
  }

  if (!hasChanges) {
    console.log(`\n✅ 変更はありません`);
  }

  console.log();
  return hasChanges;
}

/**
 * スキーマをデプロイ
 */
async function deploySchema(
  client: KintoneRestAPIClient,
  appId: string,
  plan: DeployPlan,
  sourceSchema: AppSchema,
  targetSchema: AppSchema
): Promise<void> {
  // 1. フィールドを追加
  if (plan.fieldsToAdd.length > 0) {
    console.log(`   ➕ フィールドを追加中...`);
    const properties: Record<string, any> = {};
    for (const code of plan.fieldsToAdd) {
      // フィールド設定をコピー（codeは含める）
      properties[code] = { ...sourceSchema.fields[code] };
    }
    await client.app.addFormFields({ app: appId, properties });
    console.log(`      ✅ ${plan.fieldsToAdd.length}件のフィールドを追加しました`);
  }

  // 2. フィールドを更新
  if (plan.fieldsToUpdate.length > 0) {
    console.log(`   🔄 フィールドを更新中...`);
    const properties: Record<string, any> = {};
    for (const code of plan.fieldsToUpdate) {
      const { code: _, type: __, ...fieldWithoutCodeAndType } = sourceSchema.fields[code];
      properties[code] = fieldWithoutCodeAndType;
    }
    await client.app.updateFormFields({ app: appId, properties });
    console.log(`      ✅ ${plan.fieldsToUpdate.length}件のフィールドを更新しました`);
  }

  // 3. フィールドを削除
  if (plan.fieldsToDelete.length > 0) {
    console.log(`   ➖ フィールドを削除中...`);
    await client.app.deleteFormFields({ app: appId, fields: plan.fieldsToDelete });
    console.log(`      ✅ ${plan.fieldsToDelete.length}件のフィールドを削除しました`);
  }

  // 4. ビューを更新（追加・更新・削除を一括で行う）
  if (plan.viewsToAdd.length > 0 || plan.viewsToUpdate.length > 0 || plan.viewsToDelete.length > 0) {
    console.log(`   👁️  ビューを更新中...`);

    // 現在のビューを取得してマージ
    const views: Record<string, any> = {};

    // 既存のビューをコピー（削除対象以外）
    for (const [key, view] of Object.entries(targetSchema.views)) {
      if (!plan.viewsToDelete.includes(key)) {
        views[key] = view;
      }
    }

    // 追加・更新するビューを上書き
    for (const key of [...plan.viewsToAdd, ...plan.viewsToUpdate]) {
      views[key] = sourceSchema.views[key];
    }

    await client.app.updateViews({ app: appId, views });
    console.log(`      ✅ ビューを更新しました`);
  }

  // 5. レイアウトを更新
  if (plan.layoutChanged && sourceSchema.layout.length > 0) {
    console.log(`   📐 レイアウトを更新中...`);
    try {
      await client.app.updateFormLayout({ app: appId, layout: sourceSchema.layout });
      console.log(`      ✅ レイアウトを更新しました`);
    } catch (err) {
      console.log(`      ⚠️  レイアウトの更新に失敗しました: ${(err as Error).message}`);
    }
  }

  // 6. アプリをデプロイ
  console.log(`   🚀 変更をデプロイ中...`);
  await client.app.deployApp({ apps: [{ app: appId }] });
  console.log(`      ✅ デプロイが開始されました`);
}

/**
 * 引数を解析する
 */
function parseArgs(): {
  sourceEnv: string;
  targetEnv: string;
  dryRun: boolean;
  backup: boolean;
  targetApps: string[] | null;
} {
  const args = process.argv.slice(2);

  let sourceEnv = 'dev';
  let targetEnv = 'prod';
  let dryRun = true;
  let backup = false;
  let targetApps: string[] | null = null;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--from' && args[i + 1] && !args[i + 1].startsWith('-')) {
      sourceEnv = args[++i];
    } else if (arg === '--to' && args[i + 1] && !args[i + 1].startsWith('-')) {
      targetEnv = args[++i];
    } else if (arg === '--execute' || arg === '-e') {
      dryRun = false;
    } else if (arg === '--backup' || arg === '-b') {
      backup = true;
    } else if (!arg.startsWith('--') && !arg.startsWith('-')) {
      // オプション引数でなければアプリ名として解釈
      targetApps = arg.split(',').map(a => a.trim());
    }
  }

  return { sourceEnv, targetEnv, dryRun, backup, targetApps };
}

/**
 * メイン処理
 */
async function main(): Promise<void> {
  const { sourceEnv, targetEnv, dryRun, backup, targetApps } = parseArgs();

  console.log(`🔄 スキーマデプロイ (${sourceEnv} → ${targetEnv})`);
  console.log(`   モード: ${dryRun ? 'ドライラン（確認のみ）' : '実行'}`);
  if (backup && !dryRun) {
    console.log(`   バックアップ: 有効`);
  }
  if (dryRun) {
    console.log(`   ※ 実際にデプロイするには --execute オプションを追加してください`);
  }

  // ターゲット環境の接続設定を取得
  const targetConfig = getKintoneConfig(targetEnv);

  if (!targetConfig.baseUrl) {
    console.error(`❌ ${targetEnv}環境のKINTONE_BASE_URLが設定されていません`);
    process.exit(1);
  }

  console.log(`   接続先: ${targetConfig.baseUrl}\n`);

  const client = new KintoneRestAPIClient({
    baseUrl: targetConfig.baseUrl,
    auth: targetConfig.auth
  });

  let hasAnyChanges = false;

  for (const [appName] of Object.entries(apps)) {
    if (targetApps && !targetApps.includes(appName)) {
      continue;
    }

    // スキーマを読み込む
    const sourceSchema = loadSchema(appName, sourceEnv);
    const targetSchema = loadSchema(appName, targetEnv);

    if (!sourceSchema) {
      console.log(`⚠️  ${appName}: ${sourceEnv}環境のスキーマがありません`);
      console.log(`   KINTONE_ENV=${sourceEnv} npm run schema -- ${appName} を実行してください\n`);
      continue;
    }

    if (!targetSchema) {
      console.log(`⚠️  ${appName}: ${targetEnv}環境のスキーマがありません`);
      console.log(`   KINTONE_ENV=${targetEnv} npm run schema -- ${appName} を実行してください\n`);
      continue;
    }

    // ターゲット環境のアプリIDを取得
    const targetAppId = getAppId(appName, targetEnv);

    if (!targetAppId) {
      console.log(`⚠️  ${appName}: ${targetEnv}環境のアプリIDが設定されていません\n`);
      continue;
    }

    // デプロイ計画を作成
    const plan = createDeployPlan(sourceSchema, targetSchema);
    const hasChanges = displayPlan(appName, plan, sourceEnv, targetEnv, sourceSchema, targetSchema);

    if (hasChanges) {
      hasAnyChanges = true;

      if (!dryRun) {
        try {
          console.log(`📦 ${appName} (App ID: ${targetAppId}) にデプロイ中...`);

          // バックアップが有効な場合、デプロイ前にバックアップ
          if (backup) {
            await backupBeforeDeploy(client, appName, targetAppId, targetEnv, targetConfig.baseUrl!);
          }

          await deploySchema(client, targetAppId, plan, sourceSchema, targetSchema);
          console.log(`✅ ${appName} のデプロイが完了しました\n`);
        } catch (err) {
          console.error(`❌ ${appName}: デプロイエラー`, (err as Error).message);
          if ((err as any).errors) {
            console.error('   詳細:', JSON.stringify((err as any).errors, null, 2));
          }
        }
      }
    }
  }

  if (dryRun && hasAnyChanges) {
    console.log(`\n💡 上記の変更を実行するには、以下のコマンドを実行してください:`);
    console.log(`   npm run schema:deploy -- --from ${sourceEnv} --to ${targetEnv} --execute`);
  }
}

main().catch(console.error);
