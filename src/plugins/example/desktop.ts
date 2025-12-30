/**
 * kintone プラグイン サンプルコード（PC版）
 *
 * このファイルはプラグインのPC版カスタマイズのテンプレートです。
 * npm run create:plugin でプラグインを作成すると、このようなファイルが自動生成されます。
 */
((PLUGIN_ID) => {
  'use strict';

  // プラグイン設定を取得
  const config = kintone.plugin.app.getConfig(PLUGIN_ID);
  console.log('Example plugin loaded', config);

  kintone.events.on('app.record.index.show', (event) => {
    // レコード一覧画面の処理
    return event;
  });

  kintone.events.on('app.record.detail.show', (event) => {
    // レコード詳細画面の処理
    return event;
  });

  kintone.events.on(['app.record.create.show', 'app.record.edit.show'], (event) => {
    // レコード作成・編集画面の処理
    return event;
  });
})(kintone.$PLUGIN_ID);
