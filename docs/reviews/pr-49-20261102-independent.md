# PR #49 局所修正後の独立再レビュー

2026-11-02 JST。実装担当の自己検証から独立して、固定コード、原報告、Windows上の実ブラウザ操作とDOMを確認したレビュー。製品コードは変更していない。

1. **総合判定：PARTIAL。今回の6展示追加・局所修正範囲はPASS。** 新規または今回に起因する未解決P1／P2は検出しなかった。全館・依存安全性・実機の全面PASSを意味しない。対象は [PR #49](https://github.com/tetsujisugimori-coder/Loading-museum/pull/49)、[Issue #48](https://github.com/tetsujisugimori-coder/Loading-museum/issues/48)。開始時のPRはopen／Draft／未マージ、HEAD `86713c39740943415ee75c524aeb38398c3fad91`、tree `2f15751c9c5a8cc1364c9a0c0aa880b1770d7ae1` で申告と一致。適用される祖先／リポジトリAGENTS.mdは見つからなかった。ローカルの2つのmerge用skillはレビューのみを対象外としており、起動していない。既存main作業場所は読み取り確認のみ、専用network cloneと旧版専用worktree、専用scratch・自動割当localhostポートを使用した。

2. **R1：P2閉鎖可。独立RED→GREEN成立。** `Phase5Data.tsx` の70～74行で削除意図refとlayout effect、80行で削除時のref設定、81行で6件上限を確認した。旧版はstate変更直後、まだdisabledな追加ボタンへfocusしていた。修正版はReact commit後、条件数とdisabledが反映されたDOMに対してfocusする。監視用focusin／MutationObserverは観測だけで、focusやReact状態を変更していない。

   旧HEAD `909b23dedc379d929c06b4f57f98899e930b5454`／tree `119ebe2aa9bb165615026c40ba845b0edb28b908` を新たにビルドし、追加harnessの同14条件を今回独立実行：**10 RED／4 PASS**。6→5の先頭・中間・末尾、OR後、reduced-motion Reset後は両ブラウザで、削除前BUTTON／add.disabled=true／6件 → 削除後BODY／add.disabled=false／5件を実測した。3→2、1→0は旧版からPASS。修正版は同14条件**14 PASS**、日付・Chipsの4条件を加え**18/18 PASS**。両runともexit 0。旧runは`PROBE_RED=1`の観測モードであり、exit 0を製品PASSと扱っていない。旧版の`readded:true`にはfallback clickがあるため、旧版のキー再追加成功とも扱わない。

   別作成probeでは375／390px、両ブラウザで、モード欄からTabだけで対象削除ボタンへ到達してEnter。削除後5件・追加有効・`document.activeElement === add`、Shift+Tabで最後の削除へ（0件ならモード欄へ）、Tabで追加へ、Enterで元件数へ再追加をassertした。6件の先頭／中間／末尾、3→2、1→0、OR、Reset後、動き低減を28条件で確認。focusin時点で既に有効／期待件数である記録も保持。通常の値編集・比較変更ではフォーカスを奪わなかった。固定sleep、期待値／8秒枠の緩和、成功までの自動retryは使用していない。

3. **R2：通知・操作は確認範囲PASS。支援技術の音声はNOT_TESTED。** `Phase5Lists.tsx` の検索欄実focus＋独立toggleボタン方式をコードと実動作で照合。上下キー後も実focusは検索欄、候補名・位置／件数のstatusと唯一のdata-highlight・実outlineが一致。Enterの選択／解除、aria-pressedとタグ、上限追加拒否と通知、既存選択保持、検索縮小、0件、Escape、Resetを確認した。aria-describedbyの2参照先はそれぞれ一意に実在し、説明とaria-atomicなstatusへ接続していた。role=statusの暗黙polite通知はDOM上の確認であり、実際の読み上げ成功へ読み替えない。8候補をTabで順に実focusし、候補名・強調・statusとEnter toggleを照合した。合成`isComposing:true` Enterは無選択、その後の通常Enterは選択。物理OS IME、VoiceOver等の音声、実iPhone SafariはNOT_TESTED。検索focusを使うキー経路に加え、独立buttonのTab／Enter経路が成立しており、この教材範囲の限定マージを阻害する実測P2はない。

4. **R3：仕様Aと説明・実動作は一致。** `Phase5DateTree.tsx` の変更は説明のみで、13日のdisabled・日付比較ロジックは不変。12→14と14→12は同じ11月12日～14日となり、13日はdisabled、端点のaria-pressed=false、内部data-range=true。12から右キーは13を飛ばして14へ移り、Enter選択／Escape取消が成立。11月30日→12月2日、2027年1月2日→2026年12月30日の逆順年跨ぎ、期間を再指定でも正しい開始・終了と取消を確認した。範囲内部の休館日を禁止する仕様にはしていない。

5. **新規P1／P2：なし。軽微記録・既存残課題は分離。** 独自probe初回は比較欄のexactラベル誤指定で7条件後停止、2回目は仮想一覧のラベル誤記で12条件後停止（各exit 1）。実コードと照合し、セレクタだけを修正した第3版が68/68完走した。これらはprobe実装不良で、製品assertの失敗ではない。先行結果・スクリプト・ログを別保存し、部分成功を完走へ変更していない。依存準備の証明書エラー、制限環境の取消、旧版junction準備／Turbopackルート拒否も別履歴に保持。通常コピーした同一依存で旧版buildは成功した。生ログは整形せず、checkログの文字コード乱れと末尾空白は軽微な記録事項とした。diff --checkは保存生ログの末尾空白／EOF空行でexit 2、新規報告・製品差分の問題ではない。新規証拠ディレクトリだけに-text属性を設け、原bytesを保全した。主要DOM結果JSONはUTF-8で保持。

   Issue #44の既存critical 3件（npm ciの付随auditも29件／critical 3）、従来Windows WAAPI timeoutの原因UNKNOWN、実装者の途中load timeoutと別実行による補完成功を継承し、今回解決とは扱わない。今回の完走したnativeブラウザrunではload timeoutなし。実iPhone Safari／VoiceOver／物理タッチ／物理OS IMEはNOT_TESTED。実支援技術を使った出力品質の結論は留保する。

6. **試験・CI・保全照合。** Windows 11 `10.0.26300`、Node `24.20.0`、npm `11.17.0`、Python `3.14.7`、Playwright `1.56.1`、Chromium `141.0.7390.37`／WebKit `26.0`。実ブラウザとはWindowsのPlaywrightエンジンであり、Mac／iPhone Safariそのものではない。実キーはbrowser keyboard events、狭幅tapはエミュレーションで、物理入力機器の試験ではない。

   | 今回の独立実行 | 結果 | 終了コード |
   |---|---|---:|
   | `npm run check` native：lint／型／production静的export build／全単体 | 49+147+32+25+20+8＝**281 PASS**、failure/error/skip 0 | 0 |
   | 旧HEAD・追加harness、PROBE_RED=1 | 14完走、10 RED／4 PASS | 0（観測モード） |
   | 指定HEAD・追加harness | **18/18 PASS**、error/skip 0 | 0 |
   | 別作成probe第3版、Ch/WK×375/390 | **68/68 PASS**、error/skip 0 | 0 |
   | 従来harness代表：6展示×Ch/WK×375/390 | **24/24 PASS**、error/skip 0 | 0 |

   18／68／24は異なるharnessの実行件数で、重なる受入項目を含む。固有110機能という意味ではない。単体の既存273と追加8も分けて保持した。表の編集ID保持／sort／取消、仮想化1万件・DOM上限・絞込、AND/OR、Tree親閉鎖とfocus、Chips上限を従来harnessで独立確認。別probeで全6展示のReset・展示切替・閉室後の状態破棄を確認。狭幅pageerror=0、ページ横超過=0。375pxのChips／日付両engine、および表・仮想一覧・Filter・Treeの新規画像を目視した。表の内部横スクロールはページ横超過と区別した。320／1280pxは今回再操作せず、指定HEADの既存CIに限定して確認した。

   [CI 41317056714](https://github.com/tetsujisugimori-coder/Loading-museum/actions/runs/41317056714)は5/5 jobs success。全5job原ログのcheckout ref／git logが指定完全HEADと一致。contractsは281、従来5A48、追加18、旧回帰は各browser36+24+8+24＝92、合計184条件をログの結果とstep成功で照合した。これは保存済みCIを今回読み取った結果で、今回の独立再実行件数ではない。workflowはhead.shaを明示checkoutするため、仮merge実行を提出HEAD単独と取り違えていない。実装者の前run取消と初回未完走も後続CI成功へ読み替えない。

   独立再集計239→245展示、画面13室／245展示、部品室18登録を確認。main基準との差で既存app/dataとlockfileは不変、新規phase5aExhibitsだけ追加。旧909b23dの618path中613blob不変、既存変更は3部品・package.json・workflowの5path。既存data18／docs・証拠480／tests33／scripts9／lockfile1は全件同一blob。従来試験の期待値・timeout・skipは緩和されていない。第4期B保留原本／ZIPは開かず、探索・転送・再パッケージ化なし。コピーは今回作成した隔離checkoutのnode_modulesに限定し、未追跡証拠を含めていない。

7. **対象識別子と提出。** 検証HEAD／treeは冒頭の`86713c3…`／`2f15751…`。修正前は`909b23d…`／`119ebe2…`。提出はこの報告と新規証拠だけを既存`feat/practical-ui-phase5a`へcommit・pushする。提出後HEAD／tree、remote／PR一致、PR通常コメントURL、全文読戻し結果、提出commitのCI状態は投稿時点のPRコメントに記録する（自己参照commit情報をこのファイルへ循環追記しない）。製品・試験・workflow・lockfileは検証HEADから不変であることを提出差分で確認する。

   証拠索引：[summary.json](../phase5a-evidence/independent-review-20261102/summary.json)、[保全](../phase5a-evidence/independent-review-20261102/preservation.json)、[独立RED](../phase5a-evidence/independent-review-20261102/focus-before/results.json)、[同条件GREEN](../phase5a-evidence/independent-review-20261102/focus-current/results.json)、[別probe完走](../phase5a-evidence/independent-review-20261102/independent-v3/results.json)、[代表24条件](../phase5a-evidence/independent-review-20261102/representative24/results.json)、[コマンド](../phase5a-evidence/independent-review-20261102/commands.md)、[SHA-256 manifest](../phase5a-evidence/independent-review-20261102/manifest.json)。既存の[自己検証報告](../phase5a-focus-revision.md)と[修正報告コメント](https://github.com/tetsujisugimori-coder/Loading-museum/pull/49#issuecomment-6559510195)は原本として保持し、独立実行へラベル変更していない。

8. **マージ推奨：YES（今回の6展示追加・局所修正範囲に限定）。** R1は閉鎖可。R2／R3と6展示の主要操作が成立し、この差分に帰属する未解決P1／P2はない。既存依存・既存timeout原因・実機／支援技術の保証を含まない。Draft・未マージを維持し、正式APPROVE／マージ／auto-merge／Draft解除／公開／main更新／ブランチ削除は行っていない。

作成時刻：2026-11-02 05:41 JST（実行時刻の詳細は各JSONのUTC timestampsを参照）。
