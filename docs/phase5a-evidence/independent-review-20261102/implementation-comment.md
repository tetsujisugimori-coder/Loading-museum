第5期A PR #49 フォーカス修正・再検証（実装担当の自己検証）

1. **総合判定：PARTIAL**。修正と自己検証は完了。独立再レビューは未実施であり、今回の記録を独立レビュー完了とは扱いません。

2. **Filter Builder：原因確定、P2確認・修正済み**。固定修正前HEAD `909b23dedc379d929c06b4f57f98899e930b5454` / tree `119ebe2aa9bb165615026c40ba845b0edb28b908` をWindows Chromium141 / WebKit26、390px、削除ボタンへ実Enterで検証。6条件の削除前はactiveElement=削除BUTTON / add.disabled=true / 条件DOM6、削除後はactiveElement=BODY / add.disabled=false / 条件DOM5でした。先頭・中間・末尾、OR後、reduced motion/Reset後で両browser再現。旧DOMのdisabledボタンへcommit前にfocusしていたことが原因です。削除意図をrefへ保持しuseLayoutEffectでDOM更新・有効化後にfocus。固定sleep、無制限retry、強制再生成は追加していません。

3. **Date Range Picker：A採用**。毎月13日は開始/終了端点として選べず、範囲内部には含められることを説明へ明示。ロジック変更なし。12↔14（13内部）、既存逆順/月移動、2027-01-02→2026-12-30の逆順年跨ぎ、ゼロ埋めYYYY-MM-DD比較を確認。

4. **Multi-Select Chips**。既存の検索欄focus＋独立toggleボタン方式を保持し、現在候補の名前・位置/件数・選択済み/未選択・上限追加不可をpolite statusで通知、useIdとaria-describedbyで検索欄へ関連付けました。plain input / group-of-buttonsへaria-activedescendantだけを付ける変更は採用せず、combobox/listbox方式への改変を避けています。矢印後の実focus/強調、Enter選択解除、検索縮小/0件、重複防止、非破壊上限変更、候補名/aria-pressed/aria-disabled、合成isComposing Enter、Resetを確認。実機VoiceOver/OS IMEは未検証です。

5. **RED→GREEN**。追加8単体：修正前5 RED / 3 PASS → 修正後8 PASS。削除browser同14条件：修正前10 RED / 4 PASS → 修正後14 PASS、日付/Chips4条件を加え最終**18/18 PASS**。6→5、途中/先頭/末尾、1→0、Shift+Tab/Tab、再追加、OR、Reset、reduced motionを含みます。[RED](https://github.com/tetsujisugimori-coder/Loading-museum/blob/86713c39740943415ee75c524aeb38398c3fad91/docs/phase5a-evidence/focus-revision/red-ready/results.json) / [GREEN](https://github.com/tetsujisugimori-coder/Loading-museum/blob/86713c39740943415ee75c524aeb38398c3fad91/docs/phase5a-evidence/focus-revision/green-serial/results.json)。

6. **影響・保全**。6展示の代表操作に新しい阻害問題なし。245展示/13室、既存239登録を維持。旧HEADの618path中613blob不変、既存変更は対象3部品、package.json（追加試験の別実行）、CI（追加シナリオ）の5pathのみ。既存data18 / docs・証拠480 / tests33 / scripts9 / lockfile1は全件不変。既存273試験・48条件の期待値緩和なし。第4期Bの保留原本/ZIPへのアクセス・転送・再パッケージ化なし。

7. **試験とCI**。Windows desktop「ギャラリア」、Node24.20.0、Playwright1.56.1、Chromium141.0.7390.37 / WebKit26.0。lint / TypeScript / build 成功、**273+8=281 PASS、FAIL0/SKIP0**（49+147+32+25+20+8）。Windows従来harnessは初回36/48後WK次ページload timeout、未実施12件を単独で同じharness/8秒枠/期待値で確認して12/12成功、異なる48条件を確認。初回自体は未完走のままです。追加18条件は別の単独runで完走。**最終HEAD Linux CIは5/5 jobs success**：[41317056714](https://github.com/tetsujisugimori-coder/Loading-museum/actions/runs/41317056714)。contracts281、従来5A48/48、追加18/18、旧practical/4A/4B184条件が完走（全browser条件250＝184+48+18、各条件内に複数操作）。320/375/390/1280px、狭幅tap、実キー、Reset、閉室、reduced motion切替後再操作、pageerror=0 / 横超過=0。5独立jobと既存10分/8分枠を維持し検査削減なし。

8. **失敗履歴・未検証**。browser準備途中の2試行は実行ファイル未配置でNOT_TESTED。初回全checkの追加ヘルパー型エラーは修正後再実行成功。Windowsでは従来48初回と追加18初回にWKページload timeoutを記録、原因UNKNOWN、単独実行後成功。これを過去のWindows WAAPI timeout解消とは扱いません。製品commitのCI41316657707はcontractsと5A両browser成功後、最終証拠pushで旧job取消（完走PASSへ変換しない）。Issue #44の既存critical3、実機Safari/VoiceOver/physical touch/OS IME未検証、依存安全性全体未評価を継続。

9. **提出識別子**。[Issue #48](https://github.com/tetsujisugimori-coder/Loading-museum/issues/48) / [Draft PR #49](https://github.com/tetsujisugimori-coder/Loading-museum/pull/49)。branch `feat/practical-ui-phase5a`、最終HEAD `86713c39740943415ee75c524aeb38398c3fad91`、tree `2f15751c9c5a8cc1364c9a0c0aa880b1770d7ae1`。製品/試験commit `67419e7b6c0245a058e61bb302d9123d549d3482`、最終commitは新規証拠のみ。通常git push後remote HEAD一致、作業tree clean、main `b355db856688b3cc8c3c627ddc10625bbaa45bd0`不変。[報告](https://github.com/tetsujisugimori-coder/Loading-museum/blob/86713c39740943415ee75c524aeb38398c3fad91/docs/phase5a-focus-revision.md) / [集計](https://github.com/tetsujisugimori-coder/Loading-museum/blob/86713c39740943415ee75c524aeb38398c3fad91/docs/phase5a-evidence/focus-revision/summary.json)。

10. **独立再レビュー重点**。最大6件削除のcommit後focus、Tab/Shift+Tabと再追加、候補statusと実支援技術の出力、日付Aの説明、6展示の状態破棄、既存239登録/過去証拠の保全。今回の動的再現と元の静的候補を区別して評価してください。

11. **マージ推奨：NO**。適用範囲は第5期Aの局所修正完了・独立再レビューへの引渡しまで。Draftを維持し、merge / auto-merge / Ready / 公開は実行していません。
