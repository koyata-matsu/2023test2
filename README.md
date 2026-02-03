# 2023test2

## 開発

### フロントエンド
```
npm run start
```

### サーバー(API)
別端末でも同じデータを使えるようにするため、簡易APIサーバーを追加しています。
```
npm run server
```

## 公開用セットアップ（SHIFT_API_BASE の設定）
別端末でも同じデータを使いたい場合は、フロント側で API の URL を指定します。

### 1) `index.html` に API URL を設定
`index.html` の `src/index.js` より前に、次のスクリプトを追加してください。

```html
<script>
  window.SHIFT_API_BASE = "https://your-api.example.com";
</script>
<script src="src/index.js"></script>
```

### 2) ビルドして公開
```
npm run build
```

`dist/` が生成されるので、Netlify / S3 / Vercel などの静的ホスティングにアップロードします。
WordPress に埋め込む場合は、公開した URL を iframe で読み込んでください。

```html
<iframe src="https://your-frontend.example.com" width="100%" height="900"></iframe>
```

### 3) Render で API を公開する場合
Render の Web Service 設定は次の通りです。

- Build Command: `npm install`
- Start Command: `npm run server`

デプロイ後に表示される URL を `SHIFT_API_BASE` に設定してください。
