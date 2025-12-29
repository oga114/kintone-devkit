import { build } from 'vite';
import { getTargetApps, getFilteredEntries } from './utils.js';

const targetApps = getTargetApps();

console.log('📦 本番用ビルドを開始します...\n');

try {
  const entries = getFilteredEntries(targetApps);

  if (Object.keys(entries).length === 0) {
    console.error('❌ ビルド対象のアプリが見つかりません');
    console.error('   npm run create でアプリを作成してください');
    process.exit(1);
  }

  console.log('📋 ビルド対象:');
  Object.keys(entries).forEach(app => {
    console.log(`   - ${app}`);
  });
  console.log();

  await build({
    configFile: './vite.config.ts',
    mode: 'production',
    build: {
      rollupOptions: {
        input: entries
      }
    }
  });

  console.log('\n✅ ビルド完了');
  console.log('📁 出力ディレクトリ: dist/\n');
} catch (error) {
  console.error('❌ ビルドエラー:', error);
  process.exit(1);
}
