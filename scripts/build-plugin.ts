import { build, InlineConfig } from 'vite';
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'fs';
import { resolve, dirname, basename, relative } from 'path';
import { fileURLToPath } from 'url';
import { minify } from 'terser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface ManifestConfig {
  manifest_version: number;
  version: string;
  type: string;
  name: { ja: string; en: string };
  description: { ja: string; en: string };
  icon: string;
  desktop?: { js: string[]; css: string[] };
  mobile?: { js: string[]; css: string[] };
  config?: { html: string; js: string[]; css: string[] };
}

/**
 * ターゲットプラグインを取得
 */
function getTargetPlugins(): string[] {
  const args = process.argv.slice(2);
  const pluginsDir = resolve(__dirname, '../src/plugins');

  if (!existsSync(pluginsDir)) {
    return [];
  }

  const allPlugins = readdirSync(pluginsDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  if (args.length === 0) {
    return allPlugins;
  }

  // カンマ区切りで複数プラグイン指定
  const targetNames = args[0].split(',').map(n => n.trim());
  return allPlugins.filter(p => targetNames.includes(p));
}

/**
 * TypeScriptファイルをビルド
 */
async function buildTypeScript(
  pluginName: string,
  entryName: string,
  entryPath: string,
  outputDir: string,
  isProduction: boolean
): Promise<void> {
  // 名前をJS識別子として有効な形式に変換
  const safeName = `plugin_${pluginName.replace(/-/g, '_')}_${entryName}`;

  const config: InlineConfig = {
    configFile: false, // ルートのvite.config.tsを無視
    build: {
      lib: {
        entry: entryPath,
        name: safeName,
        formats: ['iife'],
        fileName: () => `${entryName}.js`
      },
      outDir: resolve(outputDir, 'js'),
      emptyOutDir: false,
      minify: false,
      sourcemap: !isProduction
    },
    logLevel: 'warn'
  };

  await build(config);

  // Terserで難読化（本番のみ）
  if (isProduction) {
    const jsPath = resolve(outputDir, 'js', `${entryName}.js`);
    if (existsSync(jsPath)) {
      const code = readFileSync(jsPath, 'utf-8');
      const minified = await minify(code, {
        compress: true,
        mangle: true
      });
      if (minified.code) {
        writeFileSync(jsPath, minified.code);
      }
    }
  }
}

/**
 * CSSファイルをコピー
 */
function copyCssFiles(srcDir: string, outputDir: string): void {
  const cssDir = resolve(srcDir, 'css');
  const outputCssDir = resolve(outputDir, 'css');

  if (!existsSync(cssDir)) return;

  mkdirSync(outputCssDir, { recursive: true });

  const cssFiles = readdirSync(cssDir).filter(f => f.endsWith('.css'));
  for (const file of cssFiles) {
    copyFileSync(resolve(cssDir, file), resolve(outputCssDir, file));
  }
}

/**
 * 静的ファイルをコピー
 */
function copyStaticFiles(srcDir: string, outputDir: string): void {
  // HTMLファイル
  const htmlDir = resolve(srcDir, 'html');
  if (existsSync(htmlDir)) {
    const outputHtmlDir = resolve(outputDir, 'html');
    mkdirSync(outputHtmlDir, { recursive: true });
    const htmlFiles = readdirSync(htmlDir).filter(f => f.endsWith('.html'));
    for (const file of htmlFiles) {
      copyFileSync(resolve(htmlDir, file), resolve(outputHtmlDir, file));
    }
  }

  // 画像ファイル
  const imageDir = resolve(srcDir, 'image');
  if (existsSync(imageDir)) {
    const outputImageDir = resolve(outputDir, 'image');
    mkdirSync(outputImageDir, { recursive: true });
    const imageFiles = readdirSync(imageDir);
    for (const file of imageFiles) {
      copyFileSync(resolve(imageDir, file), resolve(outputImageDir, file));
    }
  }
}

/**
 * プラグインをビルド
 */
async function buildPlugin(pluginName: string, isProduction: boolean): Promise<void> {
  const srcDir = resolve(__dirname, '../src/plugins', pluginName);
  const outputDir = resolve(__dirname, '../dist/plugins', pluginName);

  if (!existsSync(srcDir)) {
    console.error(`❌ プラグインが見つかりません: ${pluginName}`);
    return;
  }

  // manifest.jsonを読み込む
  const manifestPath = resolve(srcDir, 'manifest.json');
  if (!existsSync(manifestPath)) {
    console.error(`❌ manifest.jsonが見つかりません: ${pluginName}`);
    return;
  }

  const manifest: ManifestConfig = JSON.parse(readFileSync(manifestPath, 'utf-8'));

  console.log(`\n📦 ${pluginName} (v${manifest.version})`);

  // 出力ディレクトリを作成
  mkdirSync(resolve(outputDir, 'js'), { recursive: true });

  // TypeScriptファイルをビルド
  const tsFiles = [
    { name: 'desktop', path: resolve(srcDir, 'desktop.ts') },
    { name: 'mobile', path: resolve(srcDir, 'mobile.ts') },
    { name: 'config', path: resolve(srcDir, 'config.ts') }
  ];

  for (const { name, path } of tsFiles) {
    if (existsSync(path)) {
      process.stdout.write(`   🔨 ${name}.ts...`);
      await buildTypeScript(pluginName, name, path, outputDir, isProduction);
      console.log(' ✅');
    }
  }

  // CSSをコピー
  copyCssFiles(srcDir, outputDir);
  console.log(`   📄 CSSファイルをコピー`);

  // 静的ファイルをコピー
  copyStaticFiles(srcDir, outputDir);
  console.log(`   📄 静的ファイルをコピー`);

  // manifest.jsonをコピー
  copyFileSync(manifestPath, resolve(outputDir, 'manifest.json'));
  console.log(`   📄 manifest.json`);

  console.log(`   ✅ ビルド完了: dist/plugins/${pluginName}/`);
}

/**
 * メイン処理
 */
async function main(): Promise<void> {
  const isProduction = process.env.NODE_ENV === 'production';
  const targetPlugins = getTargetPlugins();

  if (targetPlugins.length === 0) {
    console.log('⚠️  ビルド対象のプラグインがありません');
    console.log('   src/plugins/ にプラグインを作成するか、プラグイン名を指定してください');
    return;
  }

  console.log(`🔧 プラグインビルド (${isProduction ? '本番' : '開発'}モード)`);
  console.log(`   対象: ${targetPlugins.join(', ')}`);

  for (const plugin of targetPlugins) {
    await buildPlugin(plugin, isProduction);
  }

  console.log(`\n✅ ビルド完了！`);
  console.log(`\n💡 次のステップ:`);
  console.log(`   npm run pack:plugin -- ${targetPlugins[0]} でパッケージング`);
}

main().catch(err => {
  console.error('❌ ビルドエラー:', err.message);
  process.exit(1);
});
