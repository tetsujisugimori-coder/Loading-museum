# 独立実行のコマンドと証拠区分

Windows PowerShell、固定HEADの専用checkoutをcwdに実行。全localhostサーバーは各harnessが`listen(0, '127.0.0.1')`で自動割当し、finallyで停止。ブラウザ／ページは今回作成したものだけをcloseした。他作業のプロセス／ポートには接続していない。

共通環境：

```powershell
$env:PLAYWRIGHT_MODULE='C:\Users\tetsu\AppData\Local\Temp\loading-49-playwright\node_modules\playwright'
$env:PLAYWRIGHT_BROWSERS_PATH='C:\Users\tetsu\AppData\Local\Temp\loading-49-browsers'
$env:NEXT_TELEMETRY_DISABLED='1'
```

依存は固定package-lockを`NODE_USE_SYSTEM_CA=1 npm ci`で取得。TLS検証を無効にしていない。最終準備exit 0。旧HEADは同じ依存の通常コピーでbuild（依存junctionはTurbopackが拒否したため準備失敗として保持）。

| ID／cwd | コマンド（出力先EVIDENCE_DIRはそれぞれ別） | exit |
|---|---|---:|
| native-check／86713c3 | `npm run check` | 0 |
| before-build／909b23d | `npm run build` | 0 |
| focus-before／909b23d | `PROBE_RED=1 EVIDENCE_DIR=<scratch>/focus-before node <86713c3-checkout>/scripts/verify-phase5a-focus.mjs` | 0 |
| focus-current／86713c3 | `EVIDENCE_DIR=<scratch>/focus-current node scripts/verify-phase5a-focus.mjs` | 0 |
| independent-v3／86713c3 | `EVIDENCE_DIR=<scratch>/independent-v3 node <scratch>/independent-probe.mjs` | 0 |
| representative24／86713c3 | `WIDTHS=375,390 EVIDENCE_DIR=<scratch>/representative24 node scripts/verify-phase5a-browser.mjs` | 0 |
| inventory current／base | `node scripts/inventory.mjs`、`INVENTORY_REF=b355db856688b3cc8c3c627ddc10625bbaa45bd0 node scripts/inventory.mjs` | 0／0 |
| preservation | `python <scratch>/preservation.py` | 0 |

表の`NAME=value`は環境指定の略記。PowerShellでは`$env:NAME='value'`を使用した。browser指定は既定のChromium,WebKit、独自probeは375/390px、追加harnessは390px。操作timeoutは8秒で変更なし。

`independent-probe.mjs.txt`を別scratchへ`independent-probe.mjs`としてコピーし、ビルド済み固定HEADをcwdにして実行できる。レビュー用コードとして保存しており、製品scripts／既存testsは変更していない。v1／v2も`.mjs.txt`で保存。初回の比較欄ラベル指定を実comboboxへ、2回目の仮想一覧ラベル誤記を実コードの「資料を絞り込む」へ変更した。timeout、期待値、製品は変更していない。各失敗試行のJSONとログは上書きしていない。初回7 PASS＋error 1、2回目12 PASS＋error 1、最終68 PASSは別runであり、合算して完走数にしていない。

旧runのPROBE_REDは既知不良の観測モードで、exit 0でも各caseのREDは失敗。旧版の再追加fallback clickはキー再追加PASSではない。修正版の厳格モードでは復帰とTab往復をassertし、独自probeもfallbackなしで再追加した。

`summary.json`のCI集計はGitHub connectorで指定runの5job原ログを新たに読み取った照合。Linux CIの保存結果であり、今回のWindows独立再実行へ件数を加えていない。raw CIログはconnectorが返したdecoded本文をそのまま保存し、末尾空白・BOM等を整形していない。ZIPはダウンロードしていない。旧4B保留原本／ZIPにはアクセスしていない。

準備失敗・取消の全履歴はsummary.failed_attemptsと各ログを参照。制限環境checkの取消は全検査未完走（保存ログではlint・型・build・Node49成功後、Vitest開始まで。全体完走ではない）、証明書失敗はtest未開始であり、製品PASS／FAILへ振り替えていない。文字コードが乱れた既存のnative stdoutログも修復せず保持し、主要観測は独立UTF-8 JSONに保存した。今回の最終native runにload timeoutはなく、実装者の初回load timeout／既存WAAPI原因UNKNOWNは未解決のまま。
