/**
 * kintone カスタマイズ サンプルコード
 *
 * このファイルは新しいアプリを作成する際のテンプレートです。
 * npm run create でアプリを作成すると、このようなファイルが自動生成されます。
 */
import './style.css';

(() => {
  'use strict';

  // レコード一覧画面の表示イベント
  kintone.events.on('app.record.index.show', (event) => {
    console.log('example: レコード一覧画面を表示しました');
    console.log('レコード数:', event.records?.length);
    return event;
  });

  // レコード詳細画面の表示イベント
  kintone.events.on('app.record.detail.show', (event) => {
    console.log('example: レコード詳細画面を表示しました');
    console.log('レコードID:', event.record?.$id?.value);
    return event;
  });

  // レコード追加画面の表示イベント
  kintone.events.on('app.record.create.show', (event) => {
    console.log('example: レコード追加画面を表示しました');
    return event;
  });

  // レコード編集画面の表示イベント
  kintone.events.on('app.record.edit.show', (event) => {
    console.log('example: レコード編集画面を表示しました');
    return event;
  });
})();
