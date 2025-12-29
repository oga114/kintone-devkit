import dotenv from 'dotenv';
dotenv.config();

export type Environment = 'dev' | 'staging' | 'prod';

export interface AppConfig {
  name: string;
  ids: {
    dev: string | undefined;
    staging?: string | undefined;
    prod?: string | undefined;
  };
}

export interface Apps {
  [key: string]: AppConfig;
}

export interface KintoneAuth {
  apiToken?: string;
  username?: string;
  password?: string;
}

export interface KintoneConfig {
  baseUrl: string | undefined;
  auth: KintoneAuth;
}

export interface EnvironmentConfigs {
  [env: string]: KintoneConfig;
}

// アプリの設定
// npm run create で自動追加されます
export const apps: Apps = {
  'vite-test-app1': {
    name: 'vite-test-app1',
    ids: {
      dev: process.env.VITE_TEST_APP1_DEV_ID,
      prod: process.env.VITE_TEST_APP1_PROD_ID
    }
  }
};

// 環境別のkintone接続設定
export const environmentConfigs: EnvironmentConfigs = {
  dev: {
    baseUrl: process.env.KINTONE_BASE_URL,
    auth: process.env.KINTONE_API_TOKEN
      ? { apiToken: process.env.KINTONE_API_TOKEN }
      : {
          username: process.env.KINTONE_USERNAME,
          password: process.env.KINTONE_PASSWORD
        }
  },
  prod: {
    baseUrl: process.env.KINTONE_PROD_BASE_URL || process.env.KINTONE_BASE_URL,
    auth: process.env.KINTONE_PROD_API_TOKEN
      ? { apiToken: process.env.KINTONE_PROD_API_TOKEN }
      : process.env.KINTONE_API_TOKEN
        ? { apiToken: process.env.KINTONE_API_TOKEN }
        : {
            username: process.env.KINTONE_PROD_USERNAME || process.env.KINTONE_USERNAME,
            password: process.env.KINTONE_PROD_PASSWORD || process.env.KINTONE_PASSWORD
          }
  }
};

/**
 * 指定した環境のkintone接続設定を取得
 * @param env 環境名（dev, staging, prod など）
 * @returns KintoneConfig
 */
export function getKintoneConfig(env: string = 'dev'): KintoneConfig {
  return environmentConfigs[env] || environmentConfigs.dev;
}

/**
 * 指定した環境のアプリIDを取得
 * @param appName アプリ名
 * @param env 環境名
 * @returns アプリID（未設定の場合はundefined）
 */
export function getAppId(appName: string, env: string = 'dev'): string | undefined {
  const app = apps[appName];
  if (!app) return undefined;
  return app.ids[env as keyof typeof app.ids] || app.ids.dev;
}

// 後方互換性のためのデフォルト設定（開発環境）
export const kintoneConfig: KintoneConfig = environmentConfigs.dev;
