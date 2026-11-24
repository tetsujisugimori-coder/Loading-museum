# 第1便：端末再現エンジン最小試作
2026-11-24 / Issue #92 / PR #93
状態：独立した論理モデルの自己試験。製品UI、展示登録、史実完全再現ではない。

## 実行
`node --test docs/dialup-bbs/prototype/terminal.test.mjs`
Node.js v22.16.0で13 tests PASS、失敗0・skip0。実行したローカルファイルのGit blob: terminal.mjs dd7105a049bcd6b1d61d5b0bd78857841923566e、terminal.test.mjs ecca54f9d55bfe322f1c701fcfc288738da7d8fb。独立レビュー・正式CIは別判定。

## 実装と限界
- 03: 300/1200/2400bps、7E1/8N1、1バイト完了時刻を別関数で算出。100バイトはそれぞれ3333.33/833.33/416.67ms（10bit/byte）。回線の遅延・誤り・baudとの対応は未モデル化。
- 04: 教材用ISO-2022-JPのESCと2バイト文字、Shift_JISの分割復号をNodeのTextDecoderで検証。符号化規格は実機・NIFTY-Serveの同定ではない。ストリーム全体を先に検証し、仮想時刻でイベントを抽出する有限シナリオのモデルであり、受信中のエラー時刻やライブ入力は対象外。
- 05: CR/LF/BS/TAB、限定文字集合の幅、折返しと下端スクロール。jumpとsmooth（1行166.67ms）の表示時刻を論理状態から分離、smoothの待ち行を直列化。VT100の実機動作、走査線、XON/XOFFは再現しない。
- 3シナリオの速度変更で最終復号・セルが一致。異常入力を拒否。外部通信・HTML実行なし。8×2は試験用で歴史的端末の寸法ではない。
- snapshotは時刻指定の純粋な再計算。停止・再開・速度倍率・旧世代タイマー失効・実描画・reduced motion・実機Safari/VoiceOverはNOT_TESTED。汎用端末、Unicode幅、ANSI、RIPscrip、完全なRFC適合も対象外。
- 次工程：限定文字幅と行送り・境界の独立審査、ブラウザ表示アダプタと再生制御、3作品のUI検証を完了してから第2便のANSI命令へ拡張。作品登録は別途。初期12候補は上限ではない。
- 原資料再照合はsources.md追記。原画像・実通信・保全は未完。PR #88/#91、既存13室・作品・mainは変更しない。
