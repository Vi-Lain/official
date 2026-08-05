# Vi-Lain CMS v10.1 GitHub完結版

Cloudflare、外部サーバー、外部ログイン画面は使いません。

更新できる人:
- GitHubリポジトリへ書き込み権限がある人

視聴者:
- GitHub Pagesの公開サイトを見るだけ
- CMS Workflowは実行できない

## 登録一覧・IDの確認

GitHubで次を開きます。

```text
cms/INDEX.md
```

NEWS、MUSIC、GOODS、EVENTのタイトルとIDが一覧表示されます。

## 編集

1. GitHubの `Actions`
2. `CMS 05 - 内容を編集`
3. 種類を選択
4. `cms/INDEX.md`のIDを入力
5. 変更したい欄だけ入力
6. 変更しない欄は空欄
7. `Run workflow`

公開状態:

- `keep`: 現在の状態を維持
- `true`: 公開
- `false`: 非表示

## 削除

1. `CMS 06 - 内容を削除`
2. 種類を選択
3. IDを入力
4. 確認欄へ `DELETE`
5. `Run workflow`

## 公開予約

`CMS 07 - 公開予約を反映` が30分ごとに確認します。

## 管理者を追加

GitHubリポジトリの

```text
Settings
→ Collaborators
```

から、更新を許可する人だけ追加します。

公開リポジトリの一般閲覧者はActionsを実行できません。


## v10.2 タイトル一覧から編集・削除

### 編集

1. `Actions`
2. `CMS 05 - 内容を選んで編集`
3. タイトル一覧から対象を選択
4. 変更したい欄だけ入力
5. `Run workflow`

### 削除

1. `Actions`
2. `CMS 06 - 内容を選んで削除`
3. タイトル一覧から対象を選択
4. 確認欄へ `DELETE`
5. `Run workflow`

追加・編集・削除のたびに、選択肢も自動更新されます。
