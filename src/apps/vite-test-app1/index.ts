// vite-test-app1 エントリーポイント
import './style.css';

(() => {
  'use strict';

  // レコード一覧画面の表示イベント
  kintone.events.on('app.record.index.show', (event) => {
    console.log('vite-test-app1: レコード一覧画面を表示しました');
    return event;
  });

  // レコード詳細画面の表示イベント
  kintone.events.on('app.record.detail.show', (event) => {
    console.log('vite-test-app1: レコード詳細画面を表示しました');
    return event;
  });

  // レコード追加/編集画面の表示イベント
  kintone.events.on(['app.record.create.show', 'app.record.edit.show'], (event) => {
    console.log('vite-test-app1: レコード編集画面を表示しました');
    return event;
  });

  console.log('vite-test-app1: カスタマイズが読み込まれました');
})();
