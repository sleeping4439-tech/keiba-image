# JRA 馬場情報連携（開発ブランチ）

## 検証済み
- 2026-10-09: Cloudflare Workerで東京・京都のJRAページ取得（HTTP 200）を確認。
- `/latest`: 東京・京都の芝馬場状態「良」、公表日2026-10-09をユーザー提供の実行結果で確認。
- 公式ページのURLは開催状況で入れ替わる可能性があるため、タイトルの競馬場名で判定する。
- クッション値・含水率は未検証。JRAの「12/10/8/7」は参考スケールであり実測値として扱わない。

## 次に必要な操作（Workerデプロイ）
1. `cloudflare/worker.js` の開発ブランチ最新版をCloudflare既存Workerへコピーしてデプロイする。
2. `https://keiba-track-data.sleeping4439.workers.dev/measurement-diagnostics` を開き、JSONを開発担当に渡す。
3. `https://keiba-track-data.sleeping4439.workers.dev/weather` を開き、東京・京都の風速・風向のJSONを渡す。
4. `https://keiba-track-data.sleeping4439.workers.dev/latest` の東京・京都の状態が継続取得できることを確認する。

## 注意
- `main` はまだ変更していない。WorkerとGitHub Pagesの本番公開は別操作。
- `/weather` はOpen-Meteoの近傍格子点による推定風。場内実測ではない。
- 既存アプリの手動設定・コース図・標高図を残し、公式データは独立した情報欄に表示する。
- `scripts/archive-data.mjs` は未検証値を除外して保存する。定期実行はワークフローをdefault branchへマージ後に開始される。
- JRA公式アーカイブ: https://www.jra.go.jp/keiba/baba/archive/2026.html
