# 正式CIによる7174判定の更新

**7174の限定マージ推奨NO（保留）。** 以前の条件付きYESは、正式CI成功の条件を満たしていない。

GitHub pluginから独立取得したjobログ:

- Chromium765 job127435561805：7174 checkout、関連4 test file成功、browser reportはexpected2/cases2/controls4/pass:true。ここはログ上PASS。
- WebKit1280 job127435562043、WebKit765 job127435562156：同HEAD checkout・関連4 test file成功後、最初のwaitReadyで8000ms timeout、cases0/controls0/pass:false、exit1。未実施の通常/reduced2条件をPASS扱いしない。製品・ブラウザ・検査前提のいずれが原因かは現ログだけではUNKNOWN。
- artifact metadataとアップロードログのZIP digestは取得。GitHubの正規download→Library materializeの転送先でproxy CONNECT403となり、ZIP実bytesは取得不能。`zip-transfer-blocked.json`。ZIP digest、内部source/PNG hashの独立bytes監査はBLOCKED。別経路で迂回していない。

主担当の診断専用e140884では製品/テスト/依存/workflow差分なし、失敗DOM/画像寸法/error/statusをログへ出す変更のみを独立確認した。timeout延長・skip・retryで旧失敗を消していない。結果を待って原因を切り分ける。
