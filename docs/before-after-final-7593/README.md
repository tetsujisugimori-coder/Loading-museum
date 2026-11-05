# 第6期A-3 最終HEAD証拠

製品HEAD `7593e5136efc90c6bccf63fa2fc3e429b51a128d`、tree `d453f5aab866cd5194b831080571208ef3463a56`、base `05735e83fd23d228d797afb89a150045293d3e58`。Issue #65 / Draft PR #66。

この証拠は製品HEADを変更せず、そこから分岐した evidence/before-after-compare-phase6a3-7593e51 に保存する。レポート内headは製品HEADを指し、証拠保存commitを実行対象と称しない。製品ブランチのDraft解除・merge・auto-merge・公開はしていない。

## 実装と登録

Split / Overlay / Side-by-Side、固定源座標の独自SVG2組、反転、Reset、再生・pause・resume・Replay・速度、取消/世代失効、キーボード、reduced motion、読込失敗とretry。265→266展示、13室維持、同実用UI室26→27。source-inventory.jsonで元118 appファイルの保持、変更既存app2件、登録末尾追加1件、依存とlock保持を確認。

## 自己検証

- contracts CIでlint・型・build、Node49 + Vitest476 = 525テスト（追加40）、精度45群成功。ci/job-127469991306.log。
- self-browser/report.json: system Chromium154.0.8037.57 / Playwright1.56.1、375/390/765/1280 × 通常/reducedの8条件成功、故障40件拒否。self-audit.jsonでsource228件・PNG92件実bytesを照合し、144raster検査とnative配送98件の期待値を独立再計算。
- 正式新展示CI run42091230501はChromium141.0.7390.37 / WebKit26.0、4幅×2motionの16条件、8jobすべて成功。ci/primary-log-audit.jsonは全ログのHEAD・16条件・故障80件・cold request実命中とretry・配送入力計算を監査。これは正式PNGの実bytesを取得したことを意味しない。
- native browser inputはPlaywright mouse/key。CDP touch模擬とsynthetic cancel/hidden等は各レポートで区別。物理入力として扱わない。

## 誤成功を防ぐ契約

元の外周1px除外、RGB差3、不一致fraction .002未満を保持。未採用の2px量子化guard案・初回失敗は製品内docsの履歴へ保持し、成功範囲の拡大に使わない。参照撮影時のみ製品layerを隠し、テスト指定SVGをcontainで独立描画する。期待値を製品mask/opacityから作らない。

故障注入はmask25%固定、alpha.25固定、0%の1px露出、100%の1px欠け、実画像translateX1pxの5種。画素比較とcomputed mask4辺・実境界/画像boxを独立に検査し、故障除去後の復旧も要求。配送pointerの期待値は既知開始50%とtrusted ownerイベントclientX差/独立frame幅から算出し、製品出力を正解にしない。

## 独立レビュー

independent/review.mdを参照。別子エージェントが最終HEADで独自Chromium8条件、独立portable、主ハーネス別プロセス実行を行い、99PNG実bytesとsourceを照合。正式WebKit4job/8条件ログ・独立WK375probeも別に監査。以前の90関連unit/touch/hidden証拠は製品source一致を確認して対応付け、最終HEADで再実行したとは称さない。

## 失敗と限界

旧候補の端handle跳び・WebKit正常SVG読込拒否はRED→補修→独立再検証を製品内docs/before-after-compare.mdに保存。検査側の参照二重合成、要求pointerと実配送の混同、warm-cache失敗fixtureも原因と訂正を記録。

正式artifact配信先へのproxy CONNECT403によりZIP内部/PNG実bytes監査はBLOCKED。GitHub metadata/logのdigest対応と、ローカルPNG実bytes照合を区別する。配信制約の迂回はしない。物理Safari/iPhone/VoiceOver、WebKit native touch、実OS背景化/capture-loss、pinchはNOT_TESTED。

最終CIの初回失敗・診断再実行・全体判定は final-status.json に記録する。既存検査の失敗を新展示CI成功で上書きせず、原因未確定はUNKNOWNのまま残す。

## 最終結果

総合PARTIAL／全PRマージ推奨NO。最終9 workflowの8成功・1失敗、37 jobの36成功・1失敗。新展示は8 job/16条件すべて成功。旧Step Progressの初回100ms検査FAILは同一HEAD・同一条件の1回診断再実行で成功した（job127477191352）。初回REDを保持し、安定性証明と称さない。Flash第2期WebKit1280/Thenの取消後partial ink保持FAILは未解決、起因UNKNOWN、後続touchは未実行。両関連コードがmainと一致しても既存への無影響を保証しない。
