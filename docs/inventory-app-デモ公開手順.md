# 棚卸しアプリ デモ版 公開手順（現場試用向け）

現場の複数人が各自のスマホで試せるように、**ログイン不要の公開URL**でデモを配布する手順です。

- デモ本体: リポジトリの `demo/index.html`（単一HTML・PINなし・Excel未接続・CSV出力のみ）
- データは**各スマホのブラウザ内にのみ保存**されます（端末をまたいだ集計はされません）。UI・入力の流れ・CSV出力を試す用途向けです。集計を1つにまとめたい場合はExcel連携版（`inventory-app/`）が必要です。

---

## 方法A: Vercelで公開（おすすめ・本番と同じ土台）

Vercelは後でExcel連携版（本番）を載せる先でもあるので、ここで慣れておくと後がラクです。無料。

1. [https://vercel.com](https://vercel.com) にアクセスし、**「Sign Up」→ GitHubアカウントで登録**（このリポジトリを置いているGitHubアカウント）
2. ダッシュボードで **「Add New…」→「Project」**
3. **「Import Git Repository」** で、このリポジトリ（`bottiubihara-ops/-`）の横の **「Import」** をクリック
   - 一覧に出ない場合は「Adjust GitHub App Permissions」でこのリポジトリへのアクセスを許可
4. 設定画面で次の2点だけ変更:
   - **Root Directory**: 「Edit」を押して **`demo`** を選択
   - **Framework Preset**: **Other**（ビルド不要。Build Commandなどは空のままでOK）
5. **「Deploy」** をクリック。数十秒で完了し、`https://〜.vercel.app` というURLが発行されます
6. そのURLをスマホで開けば、ログイン不要でデモが動きます

> 後日Excel連携版（本番）を公開するときは、同じリポジトリでもう1つプロジェクトを作り、**Root Directory を `inventory-app`** にして環境変数を設定するだけです（手順は `inventory-app/README.md` と `docs/inventory-app-Azure設定手順.md`）。

### 更新について
`demo/index.html` を変更してGitHubにpushすると、Vercelが自動で再デプロイします（URLは変わりません）。

---

## 方法B: Netlify Drop（アカウント登録すら不要・最速）

1. パソコンで [https://app.netlify.com/drop](https://app.netlify.com/drop) を開く
2. `demo/index.html` を **ページ上にドラッグ&ドロップ**
3. すぐに公開URLが発行されます

手早く試すには便利ですが、URLがランダムで管理しづらいので、継続的に使うなら方法Aがおすすめです。

---

## 現場への配り方

公開URLが決まったら、**QRコード**にして掲示・配布すると全員がすぐ開けます。
URLを教えていただければ、こちらで現場掲示用のQRコード画像を作成します。

## 試用時の注意（現場に伝えること）
- データは各自のスマホの中だけに保存されます（他の人の入力とは合算されません）
- ブラウザのデータを消すと入力も消えます。棚卸しが終わったら各自 **「CSV出力」** ボタンで書き出してください
- あくまで操作感を試すためのデモです（本番はExcelに自動保存されます）
