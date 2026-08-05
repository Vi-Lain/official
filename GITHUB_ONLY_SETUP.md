# Vi-Lain CMS v11.0 セットアップ

この版はGitHubだけで完結します。

## 必須設定: CMS_PAT

タイトル選択肢を自動更新するため、Workflowファイル自体を更新します。
通常の `GITHUB_TOKEN` ではWorkflowファイルの更新が拒否されるため、
専用トークンをGitHub Secretsへ登録します。

### 1. トークン権限

Fine-grained personal access tokenで、対象を `official` リポジトリだけにします。

必要なRepository permissions:

- Contents: Read and write
- Actions: Read and write
- Workflows: Read and write（表示される場合）

### 2. GitHub Secretsへ登録

```text
GitHub
→ official
→ Settings
→ Secrets and variables
→ Actions
→ New repository secret
```

名前:

```text
CMS_PAT
```

値:

```text
先ほど作成したGitHubトークン
```

### 3. 動作確認

```text
Actions
→ CMS 00 - 接続チェック
→ Run workflow
```

Successになれば準備完了です。

## 編集

```text
Actions
→ CMS 05 - 内容を選んで編集
→ タイトル一覧から選択
→ 変更する欄だけ入力
→ Run workflow
```

## 削除

```text
Actions
→ CMS 06 - 内容を選んで削除
→ タイトル一覧から選択
→ DELETEと入力
→ Run workflow
```

## 選択肢が古い場合

```text
Actions
→ CMS 08 - 選択肢を再生成
→ Run workflow
```

## 視聴者について

公開サイトの閲覧者には管理画面はありません。
Actionsを実行できるのは、リポジトリへ書き込み権限を持つGitHubユーザーだけです。


## v11.1への更新後

1. ZIP内のファイルをGitHubへ上書きアップロード
2. `.github/workflows`内もすべて上書き
3. Actionsを再読み込み
4. `CMS 00 - 接続チェック`を実行
5. 成功後、`CMS 05 - 内容を選んで編集`をテスト

以前の失敗履歴はActions画面に残りますが、新しい実行がSuccessなら問題ありません。
