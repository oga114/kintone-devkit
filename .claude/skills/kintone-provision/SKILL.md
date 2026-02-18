---
name: kintone-provision
description: Markdownの設計ドキュメントからkintoneスペース・アプリを一括作成する。フィールド定義に基づいてアプリをプロビジョニングし、プロジェクトに登録する。
argument-hint: [設計ドキュメントのパス or 要件の説明]
---

# kintone Provision スキル

Markdown設計ドキュメントを元に、kintoneスペース・アプリを一括で新規作成（プロビジョニング）します。

## 概要

```
Markdown設計ドキュメント
  → スペース作成（任意）
  → アプリ作成
  → フィールド追加
  → ビュー設定（任意）
  → デプロイ（運用環境に反映）
  → プロジェクトに登録（.env, kintone.config.ts, src/apps/）
```

作成後は `kintone-schema` でスキーマを取得し、既存のワークフローに統合できます。

## 設計ドキュメントのフォーマット

入力となるMarkdownは以下の構造で記述します。
ユーザーが設計ドキュメントを用意していない場合は、要件をヒアリングして生成してください。

### サンプル

```markdown
# CRM管理システム

## スペース
- スペース名: CRM管理
- 公開設定: 公開

## 顧客マスタ
アプリコード: customer-master

### フィールド
| コード | 型 | ラベル | 必須 | 備考 |
|--------|-----|--------|:----:|------|
| company_name | 文字列（1行） | 会社名 | ○ | |
| contact_name | 文字列（1行） | 担当者名 | ○ | |
| email | リンク | メールアドレス | | protocol: MAIL |
| phone | 文字列（1行） | 電話番号 | | |
| status | ドロップダウン | ステータス | ○ | 新規, 商談中, 成約, 失注 |
| note | 文字列（複数行） | 備考 | | |

### ビュー
- 全件一覧: company_name, contact_name, status, email
- 商談中: status = "商談中" でフィルタ

## 案件管理
アプリコード: deal-management

### フィールド
| コード | 型 | ラベル | 必須 | 備考 |
|--------|-----|--------|:----:|------|
| deal_name | 文字列（1行） | 案件名 | ○ | |
| amount | 数値 | 金額 | | 単位: 円 |
| stage | ドロップダウン | ステージ | ○ | リード, 提案, 見積, 受注, 失注 |
| expected_date | 日付 | 受注予定日 | | |
| description | 文字列（複数行） | 詳細 | | |
```

### フィールド型の対応表

ドキュメント内では日本語名またはkintone APIの型名のどちらでも使用可能です。

| 日本語名 | kintone API型名 |
|----------|----------------|
| 文字列（1行） | SINGLE_LINE_TEXT |
| 文字列（複数行） | MULTI_LINE_TEXT |
| リッチエディター | RICH_TEXT |
| 数値 | NUMBER |
| 計算 | CALC |
| チェックボックス | CHECK_BOX |
| ラジオボタン | RADIO_BUTTON |
| ドロップダウン | DROP_DOWN |
| 複数選択 | MULTI_SELECT |
| 日付 | DATE |
| 時刻 | TIME |
| 日時 | DATETIME |
| リンク | LINK |
| ユーザー選択 | USER_SELECT |
| 組織選択 | ORGANIZATION_SELECT |
| グループ選択 | GROUP_SELECT |
| 添付ファイル | FILE |
| テーブル | SUBTABLE |

## 実行フロー

### Step 1: 認証情報の確認

`.env` からパスワード認証情報を読み取ります。
**重要**: スペース・アプリ作成にはAPIトークン認証は使えません。パスワード認証が必須です。

```
KINTONE_BASE_URL=https://xxxx.cybozu.com
KINTONE_USERNAME=xxxx
KINTONE_PASSWORD=xxxx
```

### Step 2: スペース作成（任意）

設計ドキュメントにスペース定義がある場合、REST APIでスペースを作成します。

**注意**: スペース作成には以下のいずれかが必要です。
- テンプレートからの作成: `POST /k/v1/template/space.json`（事前にテンプレートが必要）
- 名前のみで作成: `POST /k/v1/space.json`（APIラボ機能の有効化が必要）

スペース作成ができない環境の場合は、ユーザーに手動作成を依頼し、スペースIDを入力してもらってください。

### Step 3: アプリ作成

`@kintone/rest-api-client` を使って、各アプリを作成します。

```typescript
import { KintoneRestAPIClient } from '@kintone/rest-api-client';

const client = new KintoneRestAPIClient({
  baseUrl: process.env.KINTONE_BASE_URL,
  auth: {
    username: process.env.KINTONE_USERNAME,
    password: process.env.KINTONE_PASSWORD
  }
});

// アプリ作成（テスト環境）
const { app } = await client.app.addApp({
  name: 'アプリ名',
  space: spaceId,       // スペース内に作成する場合
  thread: threadId      // スペース内のスレッドID
});
```

### Step 4: フィールド追加

設計ドキュメントのフィールド定義に基づいてフィールドを追加します。

```typescript
await client.app.addFormFields({
  app: appId,
  properties: {
    company_name: {
      type: 'SINGLE_LINE_TEXT',
      code: 'company_name',
      label: '会社名',
      required: true
    },
    status: {
      type: 'DROP_DOWN',
      code: 'status',
      label: 'ステータス',
      options: {
        '新規': { label: '新規', index: '0' },
        '商談中': { label: '商談中', index: '1' },
        '成約': { label: '成約', index: '2' },
        '失注': { label: '失注', index: '3' }
      },
      required: true
    }
  }
});
```

### Step 5: デプロイ（運用環境に反映）

```typescript
await client.app.deployApp({
  apps: [{ app: appId }]
});
```

デプロイは非同期処理です。完了を確認するには:

```typescript
// デプロイ状況を確認
const status = await client.app.getDeployStatus({
  apps: [appId]
});
// status.apps[0].status === 'SUCCESS' で完了
```

### Step 6: プロジェクトへの登録

作成されたアプリをプロジェクトに登録します。

1. **`.env`** にアプリIDを追加
   ```
   CUSTOMER_MASTER_DEV_ID=123
   DEAL_MANAGEMENT_DEV_ID=124
   ```

2. **`kintone.config.ts`** にアプリ設定を追加
   ```typescript
   'customer-master': {
     name: 'customer-master',
     ids: { dev: process.env.CUSTOMER_MASTER_DEV_ID }
   }
   ```

3. **`src/apps/<app-code>/`** にソースファイルを作成
   - `index.ts` と `style.css`

4. **スキーマ取得**（作成したアプリの設計情報を保存）
   ```bash
   npm run schema -- customer-master
   ```

## 実行方法

### 基本的な流れ

1. **要件のヒアリング**: ユーザーと対話しながら、どんなスペース・アプリが必要か聞き出す
2. **設計ドキュメントの生成**: ヒアリング結果をMarkdown設計ドキュメントとして生成し、ユーザーに確認
3. **プロビジョニング実行**: 承認後、kintone REST APIでスペース・アプリを作成
4. **プロジェクト登録**: 作成したアプリをプロジェクトに登録

### ヒアリングのポイント

ユーザーから以下を引き出してください：

- **目的**: 何を管理したいか（例: 顧客管理、案件管理、在庫管理）
- **スペース**: スペースにまとめるか、単独アプリか
- **アプリ構成**: どんなアプリが必要か（名前と役割）
- **各アプリのフィールド**: どんな情報を記録するか
  - 必須項目はどれか
  - 選択肢があるフィールドの選択肢は何か
- **ビュー**: 一覧画面でどんな見え方が必要か（任意）

全て聞き出す必要はありません。最低限「アプリ名」と「主要なフィールド」があれば作成可能です。
不足情報は一般的な構成で補完してください。

### 対話の例

```
ユーザー: 採用管理のアプリを作りたい
Claude:  採用管理ですね。以下のような構成はいかがでしょうか？
         - 候補者管理アプリ（名前、連絡先、ステータス、応募職種...）
         - 面接記録アプリ（候補者、面接官、評価、コメント...）
         他に必要なアプリや項目はありますか？
ユーザー: それでOK。あと選考ステータスは書類選考、一次面接、二次面接、最終面接、内定、不合格で
Claude:  了解しました。設計ドキュメントを作成します。
         （Markdown設計ドキュメントを生成して提示）
         この内容でkintoneに作成してよろしいですか？
ユーザー: OK
Claude:  （REST APIで作成を実行）
```

### パターン: 既存の設計ドキュメントがある場合

```
設計ドキュメントを読んで、kintoneにプロビジョニングして
```

ドキュメントのパスを指定、またはドキュメントの内容を貼り付けてもらってください。

## 注意事項

- **認証**: パスワード認証が必須（APIトークンではアプリ作成不可）
- **冪等性なし**: 同じドキュメントで2回実行すると2つ目のスペース・アプリが作成されます
- **スペース作成**: 環境によっては手動作成が必要（APIラボ未有効化の場合）
- **フィールド型の変更不可**: 作成後にフィールドの型は変更できません（kintone APIの制約）
- **実行ユーザーの言語**: 自動生成されるシステムフィールドは、APIを実行したユーザーの表示言語で作成されます

## 作成後のワークフロー

プロビジョニング完了後は、既存のスキルで管理できます：

1. `kintone-schema` - 作成されたアプリのスキーマを取得
2. `kintone-fields` - フィールド一覧を確認
3. `kintone-deploy` - スキーマを他環境にデプロイ
4. `kintone-diff` - 環境間の差分を検出

---

**ユーザーの指示**: $ARGUMENTS
