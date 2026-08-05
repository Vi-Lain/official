# Vi-Lain CMS v10.0 管理画面セットアップ

## 構成

- 公開サイト: GitHub Pages
- 管理画面: Cloudflare Worker
- 認証: Cloudflare Access
- データ保存: GitHubの `cms/content.json`
- 更新後: GitHub Actionsが `data/content.js` を再生成

管理画面URLの例:

```text
https://admin.example.com/
```

公開サイト内には管理画面へのリンクを置きません。

## 重要

GitHub Pages単体では、秘密のパスワードを安全に保持できません。
この管理画面はCloudflare Worker内にGitHubトークンをSecretとして保存し、
Cloudflare Accessを通過した管理者だけが操作できます。

## 1. GitHubトークンを作る

GitHubでFine-grained personal access tokenを作ります。

対象リポジトリ:
- Vi-Lain公式サイトのリポジトリだけ

必要な権限:
- Contents: Read and write
- Actions: Read and write

トークンは公開サイトやファイルへ書かないでください。

## 2. Cloudflareへログイン

Cloudflare DashboardでWorkers & Pagesを開きます。

ローカルPCでNode.jsを導入後、`admin-worker`フォルダで実行します。

```bash
npm install
npx wrangler login
```

## 3. wrangler.tomlを編集

```toml
GITHUB_OWNER = "GitHubユーザー名"
GITHUB_REPO = "official"
GITHUB_BRANCH = "main"
CMS_PATH = "cms/content.json"
ALLOWED_EMAILS = "管理者メール1,管理者メール2"
```

`GITHUB_REPO`は実際のリポジトリ名へ変更してください。

## 4. GitHubトークンをSecret登録

`admin-worker`フォルダで実行:

```bash
npx wrangler secret put GITHUB_TOKEN
```

表示された入力欄へGitHubトークンを貼り付けます。

## 5. Workerをデプロイ

```bash
npm run deploy
```

デプロイ後、`https://vilain-admin.ユーザー名.workers.dev`のようなURLが発行されます。

## 6. Cloudflare Accessを有効化

Cloudflare Dashboard:

```text
Workers & Pages
→ vilain-admin
→ Settings
→ Domains & Routes
→ workers.dev
→ Enable Cloudflare Access
```

Accessポリシーでは、管理を許可するメールアドレスだけをAllowにします。

例:

```text
Include
Emails
alrod@example.com
chrom@example.com
```

これにより、許可されていない視聴者は管理画面へ到達できません。

## 7. 管理画面でできること

- NEWS追加・編集・公開・非表示・削除
- MUSIC追加・編集・公開・非表示・削除
- GOODS追加・編集・公開・非表示・削除
- EVENT追加・編集・公開・非表示・削除

保存するとGitHubの `cms/content.json` が更新されます。
その後、CMS公開用Workflowがサイトデータを再生成します。

## 8. 画像の追加

v10.0の最初の版では、画像ファイル自体のアップロードはGitHubで行います。

```text
assets/uploads/
```

へ画像をアップロードし、管理画面の画像パスへ次のように入力します。

```text
assets/uploads/example.webp
```

## セキュリティ

- GITHUB_TOKENはCloudflare Secretだけに保存
- ALLOWED_EMAILSとCloudflare Accessの両方で管理者を確認
- 公開サイトには管理機能を配置しない
- リポジトリが公開の場合、CMS内の公開情報は閲覧可能
- パスワードやAPIキーをcms/content.jsonへ保存しない
