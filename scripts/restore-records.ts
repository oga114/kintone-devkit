import { KintoneRestAPIClient } from '@kintone/rest-api-client';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as readline from 'readline';
import { apps, getKintoneConfig, getAppId } from '../kintone.config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface FileInfo {
  contentType: string;
  fileKey: string;
  name: string;
  size: string;
  localPath?: string; // バックアップ時に追加されたローカルパス
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

const RECORDS_PER_REQUEST = 100; // 追加は100件ずつ

/**
 * ユーザーに確認を求める
 */
async function confirm(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    rl.question(`${message} (y/N): `, answer => {
      rl.close();
      resolve(answer.toLowerCase() === 'y');
    });
  });
}

/**
 * レコードからシステムフィールドを除去
 */
function cleanRecordForInsert(record: any): any {
  const systemFields = [
    '$id', '$revision', 'レコード番号', 'RECORD_NUMBER',
    '作成者', 'CREATOR', '更新者', 'MODIFIER',
    '作成日時', 'CREATED_TIME', '更新日時', 'UPDATED_TIME',
    'ステータス', 'STATUS', '作業者', 'STATUS_ASSIGNEE',
    'カテゴリー', 'CATEGORY'
  ];

  const cleaned: any = {};

  for (const [key, value] of Object.entries(record)) {
    if (!systemFields.includes(key)) {
      cleaned[key] = value;
    }
  }

  return cleaned;
}

/**
 * ファイルをkintoneにアップロード
 */
async function uploadFile(
  client: KintoneRestAPIClient,
  filePath: string,
  fileName: string
): Promise<string> {
  const fileContent = readFileSync(filePath);
  const response = await client.file.uploadFile({
    file: {
      name: fileName,
      data: fileContent
    }
  });
  return response.fileKey;
}

/**
 * レコード内のFILEフィールドを処理してファイルをアップロード
 */
async function processFileFields(
  client: KintoneRestAPIClient,
  records: any[],
  filesDir: string
): Promise<{ records: any[]; uploadedCount: number }> {
  let uploadedCount = 0;
  const processedRecords = JSON.parse(JSON.stringify(records)); // deep copy

  for (const record of processedRecords) {
    for (const [fieldCode, field] of Object.entries(record)) {
      const fieldData = field as any;

      // FILEフィールドの処理
      if (fieldData?.type === 'FILE' && Array.isArray(fieldData.value)) {
        const newFiles: any[] = [];

        for (const fileInfo of fieldData.value as FileInfo[]) {
          if (fileInfo.localPath) {
            const localFilePath = resolve(filesDir, fileInfo.localPath);

            if (existsSync(localFilePath)) {
              try {
                const newFileKey = await uploadFile(client, localFilePath, fileInfo.name);
                newFiles.push({
                  fileKey: newFileKey
                });
                uploadedCount++;
                process.stdout.write(`\r   📁 ファイルをアップロード中... ${uploadedCount}件`);
              } catch (err) {
                console.error(`\n   ⚠️  ファイルアップロードエラー (${fileInfo.name}): ${(err as Error).message}`);
              }
            } else {
              console.warn(`\n   ⚠️  ファイルが見つかりません: ${localFilePath}`);
            }
          }
        }

        // 新しいfileKeyで置き換え
        fieldData.value = newFiles;
      }

      // サブテーブル内のFILEフィールドの処理
      if (fieldData?.type === 'SUBTABLE' && Array.isArray(fieldData.value)) {
        for (const row of fieldData.value) {
          for (const [subFieldCode, subField] of Object.entries(row.value || {})) {
            const subFieldData = subField as any;

            if (subFieldData?.type === 'FILE' && Array.isArray(subFieldData.value)) {
              const newFiles: any[] = [];

              for (const fileInfo of subFieldData.value as FileInfo[]) {
                if (fileInfo.localPath) {
                  const localFilePath = resolve(filesDir, fileInfo.localPath);

                  if (existsSync(localFilePath)) {
                    try {
                      const newFileKey = await uploadFile(client, localFilePath, fileInfo.name);
                      newFiles.push({
                        fileKey: newFileKey
                      });
                      uploadedCount++;
                      process.stdout.write(`\r   📁 ファイルをアップロード中... ${uploadedCount}件`);
                    } catch (err) {
                      console.error(`\n   ⚠️  ファイルアップロードエラー (${fileInfo.name}): ${(err as Error).message}`);
                    }
                  } else {
                    console.warn(`\n   ⚠️  ファイルが見つかりません: ${localFilePath}`);
                  }
                }
              }

              // 新しいfileKeyで置き換え
              subFieldData.value = newFiles;
            }
          }
        }
      }
    }
  }

  if (uploadedCount > 0) {
    console.log(`\r   📁 ファイルアップロード完了: ${uploadedCount}件      `);
  }

  return { records: processedRecords, uploadedCount };
}

/**
 * レコードを一括追加
 */
async function addRecords(
  client: KintoneRestAPIClient,
  appId: string,
  records: any[]
): Promise<number> {
  let addedCount = 0;

  for (let i = 0; i < records.length; i += RECORDS_PER_REQUEST) {
    const batch = records.slice(i, i + RECORDS_PER_REQUEST);
    const cleanedBatch = batch.map(cleanRecordForInsert);

    await client.record.addRecords({
      app: appId,
      records: cleanedBatch
    });

    addedCount += batch.length;
    process.stdout.write(`\r   📤 レコードを追加中... ${addedCount}/${records.length}件`);
  }

  console.log(`\r   📤 レコードを追加完了: ${addedCount}件          `);

  return addedCount;
}

/**
 * バックアップファイル一覧を取得
 */
function listBackups(appName: string): string[] {
  const backupDir = resolve(__dirname, '../.kintone', appName, 'backups');

  if (!existsSync(backupDir)) {
    return [];
  }

  return readdirSync(backupDir)
    .filter(f => f.startsWith('backup-') && f.endsWith('.json'))
    .sort()
    .reverse(); // 新しい順
}

/**
 * バックアップファイルを読み込む
 */
function loadBackup(appName: string, filename: string): BackupData | null {
  const backupPath = resolve(__dirname, '../.kintone', appName, 'backups', filename);

  if (!existsSync(backupPath)) {
    return null;
  }

  return JSON.parse(readFileSync(backupPath, 'utf-8'));
}

/**
 * 引数を解析する
 */
function parseArgs(): {
  targetApp: string | null;
  backupFile: string | null;
  environment: string;
  force: boolean;
} {
  const args = process.argv.slice(2);

  let targetApp: string | null = null;
  let backupFile: string | null = null;
  let environment = process.env.KINTONE_ENV || 'dev';
  let force = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--env' && args[i + 1] && !args[i + 1].startsWith('-')) {
      environment = args[++i];
    } else if (arg === '--file' && args[i + 1]) {
      backupFile = args[++i];
    } else if (arg === '--force' || arg === '-f') {
      force = true;
    } else if (!arg.startsWith('--') && !arg.startsWith('-')) {
      targetApp = arg;
    }
  }

  return { targetApp, backupFile, environment, force };
}

/**
 * メイン処理
 */
async function main(): Promise<void> {
  const { targetApp, backupFile, environment, force } = parseArgs();

  if (!targetApp) {
    console.log(`使用方法: npm run backup:restore -- <app> [--file <backup-file>] [--env <env>] [--force]`);
    console.log(`\n利用可能なアプリ:`);
    for (const appName of Object.keys(apps)) {
      const backups = listBackups(appName);
      console.log(`   ${appName} (${backups.length}件のバックアップ)`);
    }
    process.exit(1);
  }

  // アプリの存在確認
  if (!apps[targetApp]) {
    console.error(`❌ アプリが見つかりません: ${targetApp}`);
    process.exit(1);
  }

  // バックアップ一覧を取得
  const backups = listBackups(targetApp);

  if (backups.length === 0) {
    console.error(`❌ バックアップがありません: ${targetApp}`);
    process.exit(1);
  }

  // バックアップファイルを選択
  let selectedBackup = backupFile;

  if (!selectedBackup) {
    console.log(`\n📂 ${targetApp} のバックアップ一覧:`);
    backups.forEach((b, i) => {
      const data = loadBackup(targetApp, b);
      if (data) {
        console.log(`   ${i + 1}. ${b}`);
        console.log(`      環境: ${data.metadata.environment}, レコード数: ${data.metadata.totalRecords}`);
        console.log(`      日時: ${data.metadata.backupAt}`);
      }
    });

    // 最新のバックアップを使用
    selectedBackup = backups[0];
    console.log(`\nℹ️  最新のバックアップを使用します: ${selectedBackup}`);
  }

  // バックアップを読み込む
  const backup = loadBackup(targetApp, selectedBackup);

  if (!backup) {
    console.error(`❌ バックアップファイルが見つかりません: ${selectedBackup}`);
    process.exit(1);
  }

  // ファイルディレクトリを確認
  const backupId = selectedBackup.replace('.json', '');
  const filesDir = resolve(__dirname, '../.kintone', targetApp, 'backups', `${backupId}_files`);
  const hasFiles = existsSync(filesDir);
  const totalFiles = backup.metadata.totalFiles || 0;

  console.log(`\n📋 バックアップ情報:`);
  console.log(`   ファイル: ${selectedBackup}`);
  console.log(`   元環境: ${backup.metadata.environment}`);
  console.log(`   レコード数: ${backup.metadata.totalRecords}`);
  console.log(`   添付ファイル数: ${totalFiles}${hasFiles ? '' : ' (ファイルなし)'}`);
  console.log(`   バックアップ日時: ${backup.metadata.backupAt}`);

  // 復元先の設定
  const config = getKintoneConfig(environment);
  const appId = getAppId(targetApp, environment);

  if (!config.baseUrl) {
    console.error(`❌ ${environment}環境のKINTONE_BASE_URLが設定されていません`);
    process.exit(1);
  }

  if (!appId) {
    console.error(`❌ ${targetApp}の${environment}環境のアプリIDが設定されていません`);
    process.exit(1);
  }

  console.log(`\n🎯 復元先:`);
  console.log(`   環境: ${environment}`);
  console.log(`   接続先: ${config.baseUrl}`);
  console.log(`   App ID: ${appId}`);

  // 確認
  if (!force) {
    console.log(`\n⚠️  注意: この操作は${backup.metadata.totalRecords}件のレコードを追加します。`);
    console.log(`   既存のレコードは削除されません（重複する可能性があります）。`);

    const confirmed = await confirm('続行しますか？');
    if (!confirmed) {
      console.log('キャンセルしました。');
      process.exit(0);
    }
  }

  // 復元を実行
  console.log(`\n🔄 復元を開始...`);

  const client = new KintoneRestAPIClient({
    baseUrl: config.baseUrl,
    auth: config.auth
  });

  try {
    let recordsToAdd = backup.records;
    let uploadedFilesCount = 0;

    // ファイルがある場合は先にアップロード
    if (hasFiles && totalFiles > 0) {
      console.log(`\n📁 添付ファイルを処理中...`);
      const result = await processFileFields(client, backup.records, filesDir);
      recordsToAdd = result.records;
      uploadedFilesCount = result.uploadedCount;
    }

    const addedCount = await addRecords(client, appId, recordsToAdd);

    console.log(`\n✅ 復元完了！`);
    console.log(`   レコード: ${addedCount}件を追加`);
    if (uploadedFilesCount > 0) {
      console.log(`   ファイル: ${uploadedFilesCount}件をアップロード`);
    }
  } catch (err) {
    console.error(`\n❌ 復元エラー:`, (err as Error).message);
    if ((err as any).errors) {
      console.error('   詳細:', JSON.stringify((err as any).errors, null, 2));
    }
    process.exit(1);
  }
}

main().catch(console.error);
