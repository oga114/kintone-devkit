((PLUGIN_ID) => {
  'use strict';

  const config = kintone.plugin.app.getConfig(PLUGIN_ID);
  console.log('test (mobile) loaded', config);

  kintone.events.on('mobile.app.record.index.show', (event) => {
    return event;
  });

  kintone.events.on('mobile.app.record.detail.show', (event) => {
    return event;
  });
})(kintone.$PLUGIN_ID);
