import { KintoneRestAPIClient } from '@kintone/rest-api-client';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { apps, getKintoneConfig, getAppId } from '../kintone.config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface BackupMetadata {
  appId: string;
  appName: string;
  environment: string;
  backupAt: string;
  baseUrl: string;
  totalRecords: number;
  query?: string;
}

interface BackupData {
  metadata: BackupMetadata;
  records: any[];
}

const RECORDS_PER_REQUEST = 500;

/**
 * 全レコードを取得（10,000件以上対応）
 */
async function fetchAllRecords(
  client: KintoneRestAPIClient,
  appId: string,
  query?: string
): Promise<any[]> {
  const allRecords: any[] = [];
  let lastId = 0;

  console.log(`   📥 レコードを取得中...`);

  while (true) {
    // $id でソートして、前回の最大IDより大きいレコードを取得
    // これにより10,000件制限を回避
    const idCondition = `$id > ${lastId}`;
    const fullQuery = query
      ? `(${query}) and ${idCondition} order by $id asc limit ${RECORDS_PER_REQUEST}`
      : `${idCondition} order by $id asc limit ${RECORDS_PER_REQUEST}`;

    const response = await client.record.getRecords({
      app: appId,
      query: fullQuery
    });

    const records = response.records;

    if (records.length === 0) {
      break;
    }

    allRecords.push(...records);

    // 進捗表示
    process.stdout.write(`\r   📥 レコードを取得中... ${allRecords.length}件`);

    // 最後のレコードのIDを記録
    const lastRecord = records[records.length - 1];
    lastId = parseInt(String(lastRecord.$id.value), 10);

    // 取得件数がリミット未満なら終了
    if (records.length < RECORDS_PER_REQUEST) {
      break;
    }
  }

  console.log(`\r   📥 レコードを取得完了: ${allRecords.length}件`);

  return allRecords;
}

/**
 * バックアップを実行
 */
async function backupApp(
  client: KintoneRestAPIClient,
  appName: string,
  appId: string,
  environment: string,
  baseUrl: string,
  query?: string
): Promise<string> {
  console.log(`\n📦 ${appName} (App ID: ${appId})`);

  // レコードを取得
  const records = await fetchAllRecords(client, appId, query);

  if (records.length === 0) {
    console.log(`   ⚠️  レコードがありません`);
    return '';
  }

  // バックアップデータを作成
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupData: BackupData = {
    metadata: {
      appId,
      appName,
      environment,
      backupAt: new Date().toISOString(),
      baseUrl,
      totalRecords: records.length,
      query
    },
    records
  };

  // 保存先ディレクトリを作成
  const backupDir = resolve(__dirname, '../.kintone', appName, 'backups');
  if (!existsSync(backupDir)) {
    mkdirSync(backupDir, { recursive: true });
  }

  // ファイルに保存
  const backupPath = resolve(backupDir, `backup-${environment}-${timestamp}.json`);
  writeFileSync(backupPath, JSON.stringify(backupData, null, 2), 'utf-8');

  console.log(`   ✅ バックアップ保存: ${backupPath}`);
  console.log(`   📊 レコード数: ${records.length}`);

  return backupPath;
}

/**
 * 引数を解析する
 */
function parseArgs(): {
  targetApps: string[] | null;
  environment: string;
  query?: string;
} {
  const args = process.argv.slice(2);

  let targetApps: string[] | null = null;
  let environment = process.env.KINTONE_ENV || 'dev';
  let query: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--env' && args[i + 1] && !args[i + 1].startsWith('-')) {
      environment = args[++i];
    } else if (arg === '--query' && args[i + 1]) {
      query = args[++i];
    } else if (!arg.startsWith('--') && !arg.startsWith('-')) {
      targetApps = arg.split(',').map(a => a.trim());
    }
  }

  return { targetApps, environment, query };
}

/**
 * メイン処理
 */
async function main(): Promise<void> {
  const { targetApps, environment, query } = parseArgs();

  console.log(`💾 レコードバックアップ (環境: ${environment})`);
  if (query) {
    console.log(`   クエリ: ${query}`);
  }

  // 環境の接続設定を取得
  const config = getKintoneConfig(environment);

  if (!config.baseUrl) {
    console.error(`❌ ${environment}環境のKINTONE_BASE_URLが設定されていません`);
    process.exit(1);
  }

  console.log(`   接続先: ${config.baseUrl}`);

  const client = new KintoneRestAPIClient({
    baseUrl: config.baseUrl,
    auth: config.auth
  });

  const backupPaths: string[] = [];

  for (const [appName] of Object.entries(apps)) {
    if (targetApps && !targetApps.includes(appName)) {
      continue;
    }

    const appId = getAppId(appName, environment);

    if (!appId) {
      console.log(`\n⚠️  ${appName}: ${environment}環境のアプリIDが設定されていません`);
      continue;
    }

    try {
      const backupPath = await backupApp(
        client,
        appName,
        appId,
        environment,
        config.baseUrl,
        query
      );
      if (backupPath) {
        backupPaths.push(backupPath);
      }
    } catch (err) {
      console.error(`\n❌ ${appName}: バックアップエラー`, (err as Error).message);
    }
  }

  if (backupPaths.length > 0) {
    console.log(`\n✅ バックアップ完了！`);
    console.log(`\nℹ️  バックアップファイル:`);
    backupPaths.forEach(p => console.log(`   ${p}`));
  }
}

main().catch(console.error);
