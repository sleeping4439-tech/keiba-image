# 馬場情報データ連携
- 公開版 `main` は変更しない。
- Cloudflare Worker は `cloudflare/worker.js`。デプロイにはCloudflareアカウント操作が必要。
- `/diagnostics`: JRAの各ページの実際のタイトルと競馬場を診断。競馬場名を推測しない。
- `/weather`: Open-Meteoの10m風速・風向（北基準、風が吹いてくる方向）。競馬場近傍の格子点データであり、場内の実測値ではない。
- `/latest`: 未検証のJRA数値は返さない。現状は未取得。
- `data/latest.json`: 検証済み馬場情報のアーカイブ入口。未検証データは空。
- JRAクッション値・含水率の競馬場別HTMLと測定時刻の抽出は未完成。
- GitHub Actionsの定期保存はmainにマージして初めて有効。検証済みデータのみ保存。
- JRA-VANからの風情報転用は行わない。
