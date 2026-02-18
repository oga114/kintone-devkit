---
name: kintone-e2e
description: kintoneアプリのE2Eテストを実行する。Playwright MCPを使用してブラウザ操作を行い、レコード操作や画面表示を検証する。
argument-hint: [テスト内容の説明]
---

# kintone E2E テストスキル

Playwright MCPを使用して、kintoneアプリのE2Eテストを実行します。

## 事前準備

### 1. 環境変数の確認

プロジェクトの`.env`ファイルから以下の情報を取得してください：

**必須項目**:
- `KINTONE_URL` または `KINTONE_DOMAIN`: kintoneのURL/ドメイン
- `KINTONE_USER` または `KINTONE_USERNAME`: ログインユーザー名
- `KINTONE_PASSWORD`: ログインパスワード

`.env`ファイルが存在しない場合は、ユーザーに認証情報を確認してください。

### 2. アプリIDの確認

テスト対象のアプリIDをユーザーに確認してください。
アプリIDはkintoneのURLから確認できます：
```
https://{domain}.cybozu.com/k/{APP_ID}/
```

## テスト実行フロー

### Step 1: ブラウザでkintoneにアクセス

```
mcp__playwright__browser_navigate
URL: https://{DOMAIN}/
```

### Step 2: ログイン

1. `mcp__playwright__browser_snapshot` で画面状態を確認
2. ユーザー名フィールドに入力
3. パスワードフィールドに入力
4. ログインボタンをクリック
5. ポータル画面が表示されることを確認

### Step 3: 対象アプリへ移動

```
mcp__playwright__browser_navigate
URL: https://{DOMAIN}/k/{APP_ID}/
```

### Step 4: テスト実行

ユーザーの指示に応じてテストを実行します。

## テスト種類

### レコード操作テスト

| 操作 | 手順 |
|------|------|
| **作成** | 新規追加ボタン → フォーム入力 → 保存 → 一覧で確認 |
| **編集** | レコード選択 → 編集 → 変更 → 保存 → 反映確認 |
| **削除** | レコード選択 → 削除 → 確認ダイアログ → 一覧から消えたことを確認 |
| **検索** | 検索条件入力 → 結果表示確認 |

### 画面表示テスト

- 一覧画面の表示確認
- 詳細画面の表示確認
- フォームの入力フィールド確認
- グラフ・集計の表示確認
- カスタマイズビューの動作確認

### データ整合性テスト

- 集計値の正確性確認
- 関連レコードの参照確認
- 計算フィールドの結果確認
- ルックアップの動作確認

## Playwright MCP コマンド

| コマンド | 用途 |
|----------|------|
| `mcp__playwright__browser_navigate` | URLへ移動 |
| `mcp__playwright__browser_snapshot` | 画面状態を取得（操作前に必須） |
| `mcp__playwright__browser_click` | 要素をクリック |
| `mcp__playwright__browser_type` | テキスト入力 |
| `mcp__playwright__browser_fill_form` | フォーム一括入力 |
| `mcp__playwright__browser_take_screenshot` | スクリーンショット保存 |
| `mcp__playwright__browser_wait_for` | 画面遷移・要素表示を待機 |
| `mcp__playwright__browser_select_option` | ドロップダウン選択 |

## テストシナリオ例

### 基本CRUDテスト

```
1. ログイン
2. 対象アプリを開く
3. 新規レコード作成
4. 作成したレコードを編集
5. 編集内容を確認
6. レコードを削除
7. 削除されたことを確認
```

### 検索・フィルタテスト

```
1. ログイン
2. 対象アプリを開く
3. 絞り込み条件を設定
4. 検索結果を確認
5. 条件を変更
6. 結果の変化を確認
```

### カスタマイズ動作テスト

```
1. ログイン
2. 対象アプリを開く
3. カスタマイズボタン/機能を操作
4. 期待する動作を確認
5. エラーがないことを確認
```

## 結果報告

テスト完了後、以下を報告してください：

- 実行したテストの一覧
- 各テストの成功/失敗
- 失敗時のスクリーンショットと詳細
- 発見した問題点・改善提案

## kintone画面の特徴

### よく使う要素

| 要素 | 説明 |
|------|------|
| `.gaia-argoui-app-toolbar-addrecord` | レコード追加ボタン |
| `.gaia-argoui-app-toolbar-editrecord` | 編集ボタン |
| `.gaia-argoui-app-edit-buttons-save` | 保存ボタン |
| `.gaia-argoui-app-edit-buttons-cancel` | キャンセルボタン |
| `.gaia-argoui-app-record-delete` | 削除ボタン |

### 注意事項

- kintoneはSPAのため、画面遷移後は`browser_wait_for`で待機が必要
- ダイアログ（確認・エラー）は`browser_handle_dialog`で処理
- カスタマイズJSが動作する場合、追加の待機が必要な場合あり

## トラブルシューティング

| 問題 | 対処 |
|------|------|
| ログインできない | 認証情報を再確認、2段階認証の有無を確認 |
| 要素が見つからない | `browser_snapshot`で現在の画面を確認 |
| 操作が反映されない | `browser_wait_for`で待機時間を追加 |
| セッション切れ | 再ログインを実行 |

---

**ユーザーの指示**: $ARGUMENTS
