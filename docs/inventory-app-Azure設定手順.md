# 棚卸しアプリ Azure AD／Teams 設定手順（情シス向け依頼内容）

棚卸しアプリ（`inventory-app/`）を本番モード（`STORE_MODE=graph`）で動かすために必要な設定手順です。
現場ユーザーは個別のMicrosoftアカウントでログインせず、アプリがサービスプリンシパル（アプリケーション権限）でTeams上のExcelファイルを読み書きします。

## 全体像

1. Teamsに棚卸し専用チームを作成し、Excelファイルを置く
2. Azure AD（Microsoft Entra ID）にアプリを登録し、Graph APIのアプリケーション権限を付与
3. ExcelファイルのdriveId / itemIdを調べる
4. Vercelに環境変数を設定してデプロイ

---

## 1. Teamsチームの作成とExcelファイルの配置

1. Teamsで新しいチーム「棚卸しチーム」を作成（棚卸しメンバーを追加）
2. リポジトリの `inventory-app/data/inventory.xlsx` をチームの「一般」チャネルの「ファイル」にアップロードする
   - このファイルには品目マスタ139件（既存の実地棚卸表から取込済み）と、空の棚卸し記録シート、入力者シートが入っています
   - アップロード後、「入力者」シートのダミー名（入力者A/B/C）を実際のメンバー名に書き換えてください
   - **シート名・列・テーブル名（MasterTable / RecordTable / MemberTable）は変更しないでください**（アプリがこの名前で読み書きします）

## 2. Azure AD アプリ登録

[Azure Portal](https://portal.azure.com) → Microsoft Entra ID → アプリの登録 → 新規登録

1. 名前: `棚卸しアプリ`（任意）
2. サポートされているアカウントの種類: この組織ディレクトリのみ（単一テナント）
3. リダイレクトURI: 不要（ユーザーのサインインは行わないため）

登録後、以下を控える:
- **アプリケーション（クライアント）ID** → 環境変数 `AZURE_CLIENT_ID`
- **ディレクトリ（テナント）ID** → 環境変数 `AZURE_TENANT_ID`

### クライアントシークレットの発行
「証明書とシークレット」→「新しいクライアントシークレット」
- 有効期限: 12〜24か月推奨（期限切れ前に更新が必要な点に注意）
- 生成された**値**を控える → 環境変数 `AZURE_CLIENT_SECRET`（この画面でしか表示されません）

### APIのアクセス許可
「APIのアクセス許可」→「アクセス許可の追加」→ Microsoft Graph → **アプリケーションの許可**

| 権限 | 用途 |
|---|---|
| `Files.ReadWrite.All` | Teams（SharePoint）上のExcelファイルの読み書き |

追加後、**「(テナント名) に管理者の同意を与えます」** を実行（グローバル管理者の承認が必要）。

> 補足: `Files.ReadWrite.All`（アプリケーション権限）はテナント内の全ファイルにアクセスできる強い権限です。
> スコープを棚卸しチームのサイトだけに絞りたい場合は、代わりに `Sites.Selected` を付与し、
> 管理者が Graph API（`POST /sites/{siteId}/permissions`）で棚卸しチームのサイトにのみ
> このアプリの書き込み権限を割り当てる方法もあります（推奨）。どちらでもアプリ側の変更は不要です。

## 3. ExcelファイルのdriveId / itemIdの取得

[Graph Explorer](https://developer.microsoft.com/graph/graph-explorer) に管理者等でサインインして以下を実行:

```
# 1) チーム（グループ）を検索してidを取得
GET https://graph.microsoft.com/v1.0/groups?$filter=displayName eq '棚卸しチーム'&$select=id,displayName

# 2) チームのドライブ（ファイル領域）のIDを取得 → GRAPH_DRIVE_ID
GET https://graph.microsoft.com/v1.0/groups/{グループid}/drive?$select=id

# 3) ドライブ直下のファイル一覧からExcelファイルのidを取得 → GRAPH_ITEM_ID
GET https://graph.microsoft.com/v1.0/drives/{driveId}/root/children?$select=id,name
```

（ファイルをフォルダに置いた場合は 3) のパスを `root:/フォルダ名:/children` に変える）

## 4. Vercel環境変数の設定

Vercelのプロジェクト設定 → Environment Variables に以下を設定:

| 変数 | 値 |
|---|---|
| `STORE_MODE` | `graph` |
| `APP_PIN` | 現場に配る共通PIN（例: 6桁の数字） |
| `AZURE_TENANT_ID` | 手順2のテナントID |
| `AZURE_CLIENT_ID` | 手順2のクライアントID |
| `AZURE_CLIENT_SECRET` | 手順2のシークレット値 |
| `GRAPH_DRIVE_ID` | 手順3のdriveId |
| `GRAPH_ITEM_ID` | 手順3のitemId |

デプロイ手順は `inventory-app/README.md` を参照。

## 5. 動作確認

1. デプロイされたURLをスマホで開く → PIN入力
2. 品目を1件登録
3. Teams上のExcelを開き、「棚卸し記録」シートに行が追加されていることを確認
4. アプリの一覧画面で編集・削除も確認

## トラブルシューティング

| 症状 | 原因の候補 |
|---|---|
| 「Azure ADトークン取得に失敗」 | テナントID/クライアントID/シークレットの誤り、シークレット期限切れ |
| Graph APIエラー 403 | 管理者の同意が未実施、または Sites.Selected 使用時にサイト権限が未割り当て |
| Graph APIエラー 404 | GRAPH_DRIVE_ID / GRAPH_ITEM_ID の誤り、ファイルの移動・削除 |
| テーブルが見つからないエラー | Excel側のテーブル名（MasterTable等）が変更・削除された |
