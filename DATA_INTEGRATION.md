# 馬場データ連携（作業中）
このブランチはプレビュー・開発用です。公開中の `main` には未反映です。

## Cloudflare Worker
`cloudflare/worker.js` は既存の `keiba-track-data` Worker の**置換候補**です。
既存の環境変数・トリガー・設定は管理画面で確認できていないため、まだデプロイしていません。

- `/health` — Worker 自体の稼働確認
- `/diagnostics` — JRA公式ページへのアクセスとページタイトルの確認
- `/` と `/latest` — データ未取得を明示したJSON（仮数値なし）

## 現時点の制約
JRAのページは開催場・公表日で内容が変わります。測定日時と競馬場を確実に対応付けるパーサーを実測HTMLで検証するまでは、数値を自動表示しません。
風向・風速についても、JRA-VANの利用条件・提供形式が確認できるまでは取得しません。
履歴保存と定期実行は未実装です。

## データ契約
`data/latest.json` の形式：
```json
{"schemaVersion":1,"updatedAt":null,"tracks":{}}
```
検証済みのときのみ `tracks.東京` / `tracks.京都` に
`cushion`, `moistureFinish`, `moistureCorner`, `condition`,
`observedAt`, `sourceUrl` を追加します。
