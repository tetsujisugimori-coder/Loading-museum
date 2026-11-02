# Then & Now 自己検証の履歴

今回新規の出力先だけへ保存。過去証拠の上書き/移送なし。独立レビューではない。

## 前半

- 初回component試験：4成功/2失敗。rangeの暗黙label内にoutputを置いたため、テストのgetByLabelTextが値表示を返した。`first-unit-fixed.log` は最初の修正試行も同じ2件失敗だった記録（名称を成功と解釈しない）。explicit input名と非labelableな値spanへ是正後、`first-unit-green.log` 6/6成功。
- `first-browser/`：Ch375の3作品とCh1280モーフ成功後、紙鳥の手動合図が停止中に無視される問題。入力は手動観察として継続できるよう是正。原結果JSONに失敗理由を保持。初回shellの末尾Get-Contentによりshell exit0になったが、子runner JSONはcomplete=falseであり成功扱いしない。以後shellも子exitを返す。
- `first-browser-fixed/`：Ch6条件成功後、WK375の自動進行待ち8秒timeout。`first-wk-diagnostic/`：表示/data-visible=true、data-playing=false、両方を開始のままの実画像。開始が成立しなかった事実を確認。原因の確定まではできず、根因UNKNOWN。旧content-visibilityカード群より前へ比較カードを配置し、作品の発見性と移動を改善。
- `first-browser-top/`：Ch6＋WK375の3＋WK1280モーフ＝10成功。WK1280紙鳥のpointerleave直後の同期読取がWATCH。非同期React反映を同じ8秒内のREST条件待ちに変更。sleep、force click、期待緩和、timeout延長なし。
- `first-browser-final/`：配置改善と条件待ち後の同一12条件（Ch/WK×375/1280×3作品）。最終結果はresults.json参照。初回3runは置換しない。sliderは実Home/PageUp/矢印キー。touch幅はtap、desktopはclick。

## 後半・最終

- `second-browser/`：物理操作自体を通過後、既存タイトルのsessionStorage markerへの書込1を新作の書込と混同した検証側失敗。既存 `MuseumTitleSequence.tsx` の既読marker記録を確認。以後総set/remove/clearと、同一key/valueの既存title書込を両方記録し、差分0を検査。既存コードは変更しない。
- `second-browser-title-scoped/`：Ch6＋WK375の物理/導入2成功後、Windows WebKitにAudioContextがないため正常音待ちで失敗。不可時UIは正しい。`second-browser-platform/` は音正常系をPARTIAL/exit2とする明示ローカルモードで別記録。CIはこの許容を使わず、実解析を必須とする。
- `second-browser-platform/`：WK1280の導入シーン1→2待ち8秒timeout。低頻度フレームではclockの1/30秒capが有限演出を過度に遅らせることを独自単体で確認。`coarse-clock-red.log` は対象1失敗/他9未実行、`coarse-clock-green.log` は同じ入力・期待値・期限で対象1成功/他9未実行。通常の全件成功と混同しない。capを250msへ変更し、物理側は100ms以内/1/120秒substepを維持。背景復帰のcatch-upを制限する。元WebKit runの詳細なframe traceはなく、環境遅延の根因全部を確定したとはしない。
- `second-clock-wk1280/`：同じWK1280物理/導入の修正確認。音APIは自然に未提供なので音正常系をPASSにしない。ケース/終了コードはresults.json参照。
- `legacy-flash/`：旧ロゴ/shape/バネ/Intro/詩のCh5成功後、独自probeが継承比較の変数を `--mx` と誤認し失敗。実コードの `--compare-x` へ期待を是正。製品無変更。最終の旧Flash12条件は別出力へ保存する。
- `final-check-initial.log`：lint/type/build/Node49成功、既存Vitest147のうち146成功・WAAPI gallery初期DOM1件5000ms timeoutでチェーン停止。後続群は未実行。`waapi-gallery-isolated.log` 同じ原11試験/5秒を単独実行し11成功。
- `final-check-serial-diagnostic.log`：環境変数 `VITEST_MAX_THREADS/MIN_THREADS/MAX_FORKS/MIN_FORKS=1` の診断で299件成功（既存281＋その時点の追加18）。既定並列の根因解消や最終追加20の成功と混同しない。
- `second-unit-freeze.log`：追加20件（前半6/後半11/登録保全3）成功。音不可、resume拒否、古いresumeの失効、close、粗いフレーム、長時間有界物理を含む。mock音は実音解析と区別する。
- `new-lint.log` は後半初期のeffect内setState2件のlint失敗を保持。derived状態/外部資源cleanupへ是正。`second-lint-fixed.log` は是正時点の成功。最終全lintは別記録。

Windows版WebKit26.0はAudioContext/webkitAudioContextとも未提供。音不可表示は検査できるが、実FFT/発音はNOT_TESTED。Chromiumの音正常系と、Linux CIの結果は別集計。実スピーカーの聴取/実iPhone/Mac Safari/VoiceOver/物理タッチドラッグは未実施。Playwrightの狭幅tap/マウスdrag/キーと実機を混同しない。

初回の一部PowerShellログは非ASCII文字のencodingが崩れている。原ファイルを保全し、ASCIIの件数・終了状態とJSON/PNGを主証拠とする。後続は明示UTF-8設定。既存Windows WAAPI timeout根因UNKNOWN、Issue #44依存警告を今回の成功で補完しない。
