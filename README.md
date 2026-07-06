# note → X 自動投稿

> **⚠️ 現在未使用**: X API が2026年2月に無料枠を廃止し有料 (ペイパーユース) になったため、
> この仕組みの代わりに **note 公式の X 連携** (記事公開時の「Xで投稿する」チェック) を採用した。
> 完全自動化が必要になったら、X API のクレジットを購入したうえでこのスクリプトを再利用できる
> (その場合は新しい X 開発者コンソールの認証方式への対応が必要か要確認)。

note (https://note.com/huge_stoat8575) に新しい記事が投稿されたら、X (旧Twitter) にタイトルとリンクを自動投稿する仕組み。

## 仕組み

1. Claude Code の定期実行トリガーが 1時間ごとに新しいセッションを起動する
2. セッション内で `note_to_x.py` が note の RSS (`note.com/huge_stoat8575/rss`) を取得
3. `state/posted.json` (投稿済みリスト) と比較して新着を判定
4. 新着があれば X API v2 で以下の形式で投稿:

   ```
   新しい記事を公開しました📝
   {記事タイトル}
   {記事URL}
   ```

5. 投稿済みリストを更新してこのリポジトリにコミット & プッシュ

## セットアップ

### 1. ネットワーク許可ドメイン (Claude Code 環境設定)

claude.ai/code の環境設定 → ネットワークポリシーに以下を追加:

- `note.com`
- `api.x.com`

### 2. X API キー

1. https://developer.x.com で Free プランにサインアップ
2. Project + App を作成
3. App の User authentication settings で権限を **Read and Write** に設定
4. Keys and tokens で API Key / Secret と Access Token / Secret を生成
   (権限変更**後**に Access Token を再生成すること)

### 3. 環境変数 (Claude Code 環境設定のシークレット)

| 変数名 | 内容 |
|---|---|
| `X_API_KEY` | API Key (Consumer Key) |
| `X_API_SECRET` | API Key Secret |
| `X_ACCESS_TOKEN` | Access Token |
| `X_ACCESS_TOKEN_SECRET` | Access Token Secret |

## 手動実行

```bash
pip install -r requirements.txt
python note_to_x.py --dry-run   # 投稿せず文面確認
python note_to_x.py             # 実際に投稿
```

- 初回実行は既存記事を「投稿済み」として登録するだけで、X には投稿しない (過去記事の連投防止)
- 1回の実行で投稿するのは最大3件

## 止め方

Claude Code のセッションで「note→X のトリガーを止めて」と頼むか、claude.ai/code の設定からトリガー (Routine) を無効化・削除する。
