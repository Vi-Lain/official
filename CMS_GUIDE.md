# Vi-Lain CMS 操作ガイド

このCMSは、GitHubの書き込み権限を持つ人だけが操作できます。
公開サイトの閲覧者には管理ボタンは表示されず、サイトを変更できません。

## NEWSを追加

1. GitHubリポジトリ上部の `Actions`
2. 左側の `CMS 01 - NEWSを追加`
3. `Run workflow`
4. タイトル、カテゴリ、日付、URLを入力
5. `Run workflow`

## MUSICを追加

`CMS 02 - MUSICを追加` を開き、曲名・歌唱者・YouTube URLを入力します。
サムネイルはYouTube動画IDから自動表示されます。

## GOODSを追加

1. 商品画像を先に `assets/uploads/` へアップロード
2. `CMS 03 - GOODSを追加`
3. 画像パスに `assets/uploads/ファイル名.webp` と入力
4. 商品名、販売状況、URLなどを入力

## EVENTを登録

現在のサイトには独立したEVENTセクションがないため、イベント登録時に
`NEWSにも同時掲載する` をONにすると、NEWSへEVENTカテゴリとして掲載されます。

## 非表示・削除・編集

1. `cms/content.json` を開いて対象の `id` を確認
2. `CMS 05 - 公開・非表示・削除・編集`
3. 対象種類、ID、操作を選択

編集時の例:

```json
{"title":"新しいタイトル","status":"SOLD OUT"}
```

## 下書き

追加画面で「すぐ公開する」をOFFにします。
後からCMS 05で `publish` を選ぶと公開できます。

## 公開予約

`公開予約`へISO形式で入力します。

```text
2026-09-06T20:00:00+09:00
```

30分ごとのGitHub Actionsが公開時刻を確認し、サイト用データへ反映します。

## セキュリティ

- 公開サイト: 閲覧専用
- GitHub Actions: リポジトリへ書き込み権限を持つ人だけ実行可能
- `cms/content.json`: 公開リポジトリの場合は閲覧可能
- APIキーや秘密情報は絶対にCMSデータへ入れず、GitHub Secretsを使用
