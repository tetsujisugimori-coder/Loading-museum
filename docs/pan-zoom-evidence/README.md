# Pan & Zoom 自己検証証拠

これらは実装担当の自己検証であり独立レビューではない。Windows Node24.20.0、外部固定Playwright1.56.1。最終ブラウザJSONはsourceSHA256と各PNGのSHA256を含む。dirty記録は開発時の実行で、最終HEADの独立実行とは数えない。最終HEADのLinux clean検査/CIはPR本文へ追記する。

- `check-final.log`: 修正後lint/typecheck/build、Node49＋Vitest406＝455成功、失敗/skipなし。
- `zero-viewport-red.log` / `zero-viewport-green.log`: 同じ13試験のRED（1失敗）→GREEN（13成功）。`zero-viewport-fix.patch`で前後差分を再構成可能。旧source hashは設計記録。
- `zero-dimension-trace.json`: 実ブラウザでの幅0通知と表示倍率の推移。通知元の内部詳細はUNKNOWN。
- `pre-fix-zero-viewport-browser.json`: 修正前、400%から画像保存前後に100%へ戻りtouch移動が不成立になる反例。操作直後の400%もtrace保存。
- `browser-edge-assumption.log` / `browser-one-pixel-resize.log` / `one-pixel-resize-browser.json`: 端へ届く回数と整数寸法の変化を仮定した試験側失敗。失敗を削除せず最終実行と区別。
- `check-type-error.log` / `check-old-count.log` / `build-retired-source-inclusion.log`: 試験型指定、旧総数、退避ソースの型検査混入による停止を保全。
- `control-*`: ポインタ基準を中央固定／ミニマップを全図固定の実ソース改変を検出、終了1。原bytesを復元。負対照runner自身の初回stdout-only誤判定も設計記録へ記載。

実機Safari/VoiceOver/実OS capture喪失/WebKit native touch dragはNOT_TESTED。CDP touchと合成pointerは実機ではない。画像は代表の両engine×375/1280×通常/reduced。全体図と拡大図を確認する。

`before-zero-fix-detail.png`は修正前の選択リングだけ残り100%へ戻った描画。修正後のexhibit/detail画像と比較する。`webkit-native-diagnostics.json`は実mouseのdown/move/captureとhitを記録。`webkit-first-frame-read-failure.*`は単発読取りの失敗を保全し、最終描画gate検査の成功へ混同しない。
