import dotenv from 'dotenv';
dotenv.config();

export interface AppConfig {
  id: string | undefined;
  name: string;
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

// アプリの設定
// npm run create で自動追加されます
export const apps: Apps = {
  'vite-test-app1': {
    id: process.env.VITE_TEST_APP1_ID,
    name: 'vite-test-app1'
  },
  'vite-test-app2': {
    id: process.env.VITE_TEST_APP2_ID,
    name: 'vite-test-app2'
  }
};

// kintone接続設定
export const kintoneConfig: KintoneConfig = {
  baseUrl: process.env.KINTONE_BASE_URL,
  auth: process.env.KINTONE_API_TOKEN
    ? {
        apiToken: process.env.KINTONE_API_TOKEN
      }
    : {
        username: process.env.KINTONE_USERNAME,
        password: process.env.KINTONE_PASSWORD
      }
};
