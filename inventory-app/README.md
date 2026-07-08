# 棚卸しアプリ

紙の実地棚卸をスマホで行うためのWebアプリ。データはExcelファイル（ローカル or Teams上）にそのまま記録されるため、棚卸し終了後はExcelファイルを共有するだけで完了する。

- 要件定義: [`../docs/inventory-app-要件定義書.md`](../docs/inventory-app-要件定義書.md)
- 本番用のAzure AD/Teams設定: [`../docs/inventory-app-Azure設定手順.md`](../docs/inventory-app-Azure設定手順.md)

## 機能

- 共通PINログイン＋入力者の名前選択（全記録に入力者名が残る）
- 品目マスタ139件からのインクリメンタル検索（ひらがな/カタカナ/半角全角を自動吸収）・カテゴリ絞り込み・手入力
- 数量（＋/−ボタン＋テンキー）・複数単位切替（箱/本）・保管場所・備考
- 副原料は数量（合計）のうち端数分が何kgかを「半端量」としてメモできる
- 原料豆・副原料は期限切れ分の量と日付を数量とは別枠で記録できる（数量には含めない）
- 期限日を入れると期限区分（期限切れ/来月期限/再来月期限）を自動判定（手動変更可）
- 記録の一覧（月別）・編集・削除・CSVエクスポート（UTF-8 BOM付き）

## ローカルで動かす（開発・デモ）

```bash
cd inventory-app
npm install
npm run dev
```

http://localhost:3000 を開き、PIN `1234` でログイン（`APP_PIN` 未設定時のデフォルト）。

データは `data/inventory.xlsx`（コミット済みseed）が初回アクセス時に `data/inventory.local.xlsx`（gitignore対象）へコピーされ、そこに読み書きされる。リセットしたいときは `data/inventory.local.xlsx` を削除する。

## データ層の切替（STORE_MODE）

| モード | 保存先 | 用途 |
|---|---|---|
| `local`（既定） | `data/inventory.local.xlsx` | 開発・デモ。Azure AD承認前の動作確認 |
| `graph` | Teams上のExcel（Microsoft Graph API） | 本番。Vercel等のサーバーレス環境では必須 |

環境変数は `.env.example` を参照（ローカルでは `.env.local` にコピーして使う）。

> **注意**: Vercelのファイルシステムは永続しないため、`local` モードを本番で使ってはいけない。本番は必ず `graph` モードにすること。

## Vercelへのデプロイ

1. このリポジトリをVercelにインポートし、**Root Directory を `inventory-app`** に設定
2. 環境変数を設定（`STORE_MODE=graph`、`APP_PIN`、Azure系5変数 → [設定手順](../docs/inventory-app-Azure設定手順.md)）
3. デプロイ後、発行されたURLをスマホのホーム画面に追加して運用

## Excelワークブックの構造

アプリが読み書きするExcel（`data/inventory.xlsx` が雛形。Teamsにはこれをアップロードする）:

| シート | テーブル名 | 内容 |
|---|---|---|
| 品目マスタ | `MasterTable` | 品目ID / 原料コード / 品名 / カテゴリ / 単位 / 備考 |
| 棚卸し記録 | `RecordTable` | アプリからの入力が1行ずつ追記される（16列） |
| 入力者 | `MemberTable` | アプリの入力者選択肢。名前を直接編集してよい |

シート名・列構成・テーブル名は変更しないこと。品目や入力者の追加・修正はExcel上で直接行ってよい。

## 品目マスタの再取込

既存の実地棚卸表（.xlsm）からマスタを作り直す場合:

```bash
pip install openpyxl
python3 scripts/import_master.py <実地棚卸表.xlsm> data/inventory.xlsx
```

原料コード（A列）・原料名（C列）を各シートから抽出し、ふりがなを除去して品目マスタを生成する（棚卸し記録・入力者シートは空の初期状態になるので注意）。

## 構成

```
app/                 # Next.js App Router（画面 + APIルート）
  pin/               # PIN入力画面
  records/           # 一覧・編集画面
  api/               # auth / master / members / records / export
components/          # EntryScreen（入力）/ RecordsScreen（一覧）/ RecordForm（共通フォーム）
lib/
  auth.ts            # PIN認証（sha256トークンCookie）
  store/
    index.ts         # InventoryStore インターフェース + 切替
    local.ts         # ローカルExcel実装（exceljs）
    graph.ts         # Microsoft Graph API実装（client credentials）
data/inventory.xlsx  # Excelワークブックの雛形（品目マスタ取込済み）
scripts/import_master.py  # 実地棚卸表 → 品目マスタ 変換スクリプト
```
