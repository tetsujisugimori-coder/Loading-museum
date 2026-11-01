# 第4期B 実装・検証記録

2026-11-01 JST / Issue #46。実装担当の自己検証と独立レビューは別に記録する。現段階 PARTIAL、Draft 維持、マージ・公開しない。

## 実装

6展示は `app/data/phase4bExhibits.ts` と `app/components/practical/Phase4B*.tsx`。既存の第4期部品室へ追加し、登録233→239、13室を維持。重複調査・資料・制約は [inventory](phase4b-inventory.md)。

- Command Palette：展示内 Ctrl/Meta+K、画面ボタン、検索、矢印/Enter、結果なし、模擬背景/星変更、閉鎖時focus復帰。
- Optimistic Action：表示と確定値を分離、成功/失敗/400・1800・5000ms応答、最新IDだけに確定権限。保留上限8、Resetで旧状態を廃棄。
- Upload Queue：模擬3件追加、上限8、実行枠1〜3、待機/進行/停止/完了/失敗/取消、再試行、順番移動、進捗、整理。現在状態だけを有限時計で進め、取消項目を復活させない。
- Form Wizard：3段階、入力保持、段階検証とerror focus、確認、模擬送信。
- Split Pane：20〜80%、Pointer Capture、キーボード、doubleclick/Reset、中断、狭幅上下配置。
- Context Menu：右クリック/タップ/画面ボタン/Shift+F10、階層、矢印/Escape、端配置補正、外側閉鎖とfocus復帰。

状態確定は Animation.onfinish に依存しない。可視・再生・文書非表示の条件で模擬時計を休止する。reduced motion は見た目の補間だけを抑え、機能期限は維持。実通信・個人情報送信・外部保存なし。

## 自己検証と途中失敗

実行原本は [phase4b-evidence](phase4b-evidence/)。初回 `npm run check` は終了0：Node49件、既存Vitest147件、4A32件、新規25件（計253、failure0）。lint・型検査・静的buildを含む。集計は実行コマンドの範囲であり全可能操作の証明ではない。

ブラウザ試験は実画面・DOM・操作結果・geometry・PNG・pageerror・保存不変性を確認する。Chromium/WebKit各375/390/765/1280×6展示＝48条件。最終結果は追記する。

途中の失敗は隠さず原本保持：
1. Chromium初回：既存タイトル演出のsessionStorage書込みが基準取得後に起きた。既存演出既読キーを明示した独立browser状態を準備し、その後の保存比較は維持。製品の変更なし。
2. Chromium2回目：ラベルのアクセシブル名にoption内容が含まれ、exact locatorが一致しなかった。適切なlabel locatorへ修正、合格条件不変。
3. Chromium3回目・WebKit初回：Playwright dispatchEvent('contextmenu') が MouseEvent でなく Event を作り、clientX/Yが欠落。同一build/scroll位置の診断で original Event は styleなし・画面外、正しい MouseEvent は left152/top828・right382/bottom997（390×1000内）。座標補正試験を `new MouseEvent` へ修正。実右クリック/タップ検査と合成端座標を区別。製品変更不要。この失敗を製品RED→GREENとは呼ばない。

ローカルWebKitはsystem library不足のため公式Debian .debを/tmpに展開しbrowserのsys/libへlink。ブラウザ本体・製品・期待値は変更なし。Playwrightのhost preflightがlocal libGLESv2を認識しないため、その事前検査のみ環境変数で省略し、実起動/描画/全assertを実施。CIでは通常の `install --with-deps` であり事前検査省略なし。版・deb SHAは [local-environment.json](phase4b-evidence/local-environment.json)。

## 保全・依存リスク

baseline mainから変更許容した統合10path以外の既存538pathをGitblobで比較し不一致0。既存展示データと過去証拠を含む。lockfileと依存版は変更していない。

audit baseline29件、critical3/high8/moderate17/low1。Issue #44継続。Next16.2.6、Vitest3.2.4、Tinypool1.1.1を確認。Nextは複数server/image/cache/og経路の警告、VitestはUI/API server、Tinypoolはprototype pollution gadget警告。現在の配布は `output: export`、browser検証は静的HTTP、Vitestは `run` でUI/API serverを起動しない。app内 next/og・next/image・use cache、およびpackage内next start・vitest --ui/--apiは見つからない。これで依存が安全と認定するものではない。実行環境や将来の配布経路変更時は再評価、修正版への更新はIssue44の別工程。今回の6展示からこれら危険経路へ新しく接続する変更はない。

## 未検証・引継ぎ

実iPhone Safari、Mac、VoiceOver、OS IME、実機touchはUNVERIFIED。Linux PlaywrightのWebKit/Touch emulationと混同しない。Windows既存WAAPI timeoutの原因はUNKNOWNのまま。独立レビュー完了まで総合PASS・最終マージ承認は行わない。第5期候補はデータ表の行操作、日付範囲、仮想スクロールなどだが未採用・今回未実装。
