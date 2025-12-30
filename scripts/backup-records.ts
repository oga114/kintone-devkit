import { KintoneRestAPIClient } from '@kintone/rest-api-client';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { apps, getKintoneConfig, getAppId } from '../kintone.config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface FileInfo {
  contentType: string;
  fileKey: string;
  name: string;
  size: string;
  localPath?: string; // バックアップ時に追加
}

interface BackupMetadata {
  appId: string;
  appName: string;
  environment: string;
  backupAt: string;
  baseUrl: string;
  totalRecords: number;
  totalFiles: number;
  query?: string;
}

interface BackupData {
  metadata: BackupMetadata;
  records: any[];
}

const RECORDS_PER_REQUEST = 500;

/**
 * レコード内のFILEフィールドからファイル情報を抽出
 */
function extractFileFields(record: any): { fieldCode: string; files: FileInfo[] }[] {
  const fileFields: { fieldCode: string; files: FileInfo[] }[] = [];

  for (const [fieldCode, field] of Object.entries(record)) {
    const fieldData = field as any;
    if (fieldData?.type === 'FILE' && Array.isArray(fieldData.value)) {
      fileFields.push({
        fieldCode,
        files: fieldData.value as FileInfo[]
      });
    }
    // サブテーブル内のFILEフィールドも処理
    if (fieldData?.type === 'SUBTABLE' && Array.isArray(fieldData.value)) {
      for (const row of fieldData.value) {
        for (const [subFieldCode, subField] of Object.entries(row.value || {})) {
          const subFieldData = subField as any;
          if (subFieldData?.type === 'FILE' && Array.isArray(subFieldData.value)) {
            fileFields.push({
              fieldCode: `${fieldCode}.${row.id}.${subFieldCode}`,
              files: subFieldData.value as FileInfo[]
            });
          }
        }
      }
    }
  }

  return fileFields;
}

/**
 * ファイルをダウンロードして保存
 */
async function downloadAndSaveFiles(
  client: KintoneRestAPIClient,
  records: any[],
  filesDir: string
): Promise<number> {
  let totalFiles = 0;

  for (const record of records) {
    const recordId = record.$id?.value || 'unknown';
    const fileFields = extractFileFields(record);

    for (const { fieldCode, files } of fileFields) {
      for (let i = 0; i < files.length; i++) {
        const fileInfo = files[i];
        if (!fileInfo.fileKey) continue;

        try {
          // ファイルをダウンロード
          const fileData = await client.file.downloadFile({
            fileKey: fileInfo.fileKey
          });

          // ファイル名を生成（重複回避）
          const safeFileName = `${recordId}_${fieldCode.replace(/\./g, '_')}_${i}_${fileInfo.name}`;
          const localPath = resolve(filesDir, safeFileName);

          // ファイルを保存
          writeFileSync(localPath, Buffer.from(fileData));

          // レコード内のファイル情報にローカルパスを追加
          fileInfo.localPath = safeFileName;
          totalFiles++;

          process.stdout.write(`\r   📁 ファイルをダウンロード中... ${totalFiles}件`);
        } catch (err) {
          console.error(`\n   ⚠️  ファイルダウンロードエラー (${fileInfo.name}): ${(err as Error).message}`);
        }
      }
    }
  }

  if (totalFiles > 0) {
    console.log(`\r   📁 ファイルダウンロード完了: ${totalFiles}件      `);
  }

  return totalFiles;
}

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
  query?: string,
  includeFiles: boolean = true
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
  const backupId = `backup-${environment}-${timestamp}`;

  // 保存先ディレクトリを作成
  const backupDir = resolve(__dirname, '../.kintone', appName, 'backups');
  if (!existsSync(backupDir)) {
    mkdirSync(backupDir, { recursive: true });
  }

  // ファイルをダウンロード（オプション）
  let totalFiles = 0;
  if (includeFiles) {
    const filesDir = resolve(backupDir, `${backupId}_files`);
    mkdirSync(filesDir, { recursive: true });
    totalFiles = await downloadAndSaveFiles(client, records, filesDir);

    // ファイルがなければディレクトリを削除
    if (totalFiles === 0) {
      const { rmSync } = await import('fs');
      rmSync(filesDir, { recursive: true, force: true });
    }
  }

  const backupData: BackupData = {
    metadata: {
      appId,
      appName,
      environment,
      backupAt: new Date().toISOString(),
      baseUrl,
      totalRecords: records.length,
      totalFiles,
      query
    },
    records
  };

  // JSONファイルに保存
  const backupPath = resolve(backupDir, `${backupId}.json`);
  writeFileSync(backupPath, JSON.stringify(backupData, null, 2), 'utf-8');

  console.log(`   ✅ バックアップ保存: ${backupPath}`);
  console.log(`   📊 レコード数: ${records.length}, ファイル数: ${totalFiles}`);

  return backupPath;
}

/**
 * 引数を解析する
 */
function parseArgs(): {
  targetApps: string[] | null;
  environment: string;
  query?: string;
  includeFiles: boolean;
} {
  const args = process.argv.slice(2);

  let targetApps: string[] | null = null;
  let environment = process.env.KINTONE_ENV || 'dev';
  let query: string | undefined;
  let includeFiles = true;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--env' && args[i + 1] && !args[i + 1].startsWith('-')) {
      environment = args[++i];
    } else if (arg === '--query' && args[i + 1]) {
      query = args[++i];
    } else if (arg === '--no-files') {
      includeFiles = false;
    } else if (!arg.startsWith('--') && !arg.startsWith('-')) {
      targetApps = arg.split(',').map(a => a.trim());
    }
  }

  return { targetApps, environment, query, includeFiles };
}

/**
 * メイン処理
 */
async function main(): Promise<void> {
  const { targetApps, environment, query, includeFiles } = parseArgs();

  console.log(`💾 レコードバックアップ (環境: ${environment})`);
  if (query) {
    console.log(`   クエリ: ${query}`);
  }
  if (!includeFiles) {
    console.log(`   ⚠️  ファイル添付はスキップします（--no-files）`);
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
        query,
        includeFiles
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
