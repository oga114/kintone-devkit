((PLUGIN_ID) => {
  'use strict';

  // 現在の設定を取得
  const config = kintone.plugin.app.getConfig(PLUGIN_ID);
  
  // フォーム要素を取得
  const form = document.getElementById('plugin-config-form');
  const cancelButton = document.getElementById('cancel-button');
  const saveButton = document.getElementById('save-button');

  // 設定を復元
  if (config.setting1) {
    (document.getElementById('setting1') as HTMLInputElement).value = config.setting1;
  }

  // キャンセルボタン
  cancelButton?.addEventListener('click', () => {
    history.back();
  });

  // 保存ボタン
  form?.addEventListener('submit', (e) => {
    e.preventDefault();

    const setting1 = (document.getElementById('setting1') as HTMLInputElement).value;

    // 設定を保存
    kintone.plugin.app.setConfig(
      { setting1 },
      () => {
        alert('設定を保存しました。アプリを更新してください。');
        history.back();
      }
    );
  });
})(kintone.$PLUGIN_ID);
