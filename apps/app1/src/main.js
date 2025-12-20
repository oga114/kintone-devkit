/*
 * Vite introduction sample program
 * Copyright (c) 2024 Cybozu
 *
 * Licensed under the MIT License
 * https://opensource.org/license/mit/
 */

(() => {
  'use strict';

  // 追加・編集画面表示後イベント
  kintone.events.on(['app.record.edit.show', 'app.record.create.show', 'app.record.index.edit.show'], (event) => {
    const record = event.record;

    // Process record here if needed

    return event;
  });


})();
