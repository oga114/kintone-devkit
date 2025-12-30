import dotenv from 'dotenv';
dotenv.config();

export interface PluginConfig {
  name: string;
  displayName: string;
}

export interface Plugins {
  [key: string]: PluginConfig;
}

// プラグインの設定
// npm run create:plugin で自動追加されます
export const plugins: Plugins = {
  'test': {
    name: 'test',
    displayName: 'test'
  }
};
