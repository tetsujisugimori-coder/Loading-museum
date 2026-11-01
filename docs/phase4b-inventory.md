# 第4期B inventory・設計契約

2026-11-01 JST。Issue #46。開始 main `da1d9d92b0ca93311066e934e11e95f00e072345` / tree `1a684a124665b675d820f6d54aef8f7a6cde96d8`。PR #45 の merged と merge SHA を GitHub API と git ls-remote で照合。専用 clone の作業ツリーは clean。接続 desktop がないため、この cloud 作業領域の正規 git clone で実装。別 repo の環境は流用しない。repo 内 AGENTS.md / .agents/skills はなし。

## 登録調査

`scripts/inventory.mjs` で既存データ配列とトップ・DOM ID を再集計。原本 `phase4b-evidence/baseline-inventory.json` は233件。内訳：トップ9、DOS8、UNIX5、旧OS18、Apple13、Mac18、cursor8、Flash54、DOM17、WAAPI47、phase1 6、phase2 12、phase3 12、phase4A 6。ページの室数式も確認し13室。第4期Aの部品室へB6件を追加し、別室を増やさない。全登録の調査と全館全操作検証は別。

| 新規候補 | 既存近似 | 採用する学習差分 |
|---|---|---|
| Command Palette | Search Suggestions、館内検索 | 検索結果の選択に加え模擬操作が実行され、結果・フォーカスが戻る。展示内ショートカット＋画面起動 |
| Optimistic Action | State Button、Toggle | 先行データ更新・確定・失敗巻戻し。A遅延後のBと応答ID失効を観察 |
| Upload Queue | steps / buffer / Progress | 複数項目の独立状態と実行枠、再試行・取消・並べ替え。実通信しない |
| Form Wizard | Inline Validation / form-error | 入力状態を複数画面に保持、段階検証・戻る・確認・模擬送信 |
| Split Pane | Sortable Drop / drag / window | 順序ではなく二領域のサイズ配分。狭幅縦配置、capture解除と制約 |
| Context Menu | Menu Selection Cursor / Clip Menu | カーソル装飾でなく起点座標・画面境界・階層選択・外側閉鎖・focus復帰 |

既存のCSS/WAAPI補間やReact状態管理そのものを新規発明と主張しない。6展示は独自実装。初出・発明者はUNKNOWN。画像・コードの転載なし。

## 実装方針

既存 PracticalRoom の開閉・検索・説明・選択を再利用。Aの順序・IDを維持しBを後置。Resetは子mount世代を更新してすべての保留処理を破棄。時間進行は既存 runtime の可視・page visibility・再生条件を再利用し、動き低減時も機能期限は維持。時計は保留処理がある場合だけ稼働。状態確定を Animation.onfinish に依存しない。模擬ファイル・架空フォーム・模擬操作だけで外部送信やlocalStorage保存をしない。

履歴試験の期待件数は登録増分6に対応させる。A検索「検索」はBのCommand Palette追加により1→2件、総数6→12へ変化するため期待値も更新。Aの既存操作検査自体は削減しない。

## 一次資料

2026-11-01 JST 本文確認。操作原則の参照で、コード転載・完全APG適合認定ではない。
- https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/ : 起動時focus、閉鎖後復帰とTab範囲。
- https://www.w3.org/WAI/ARIA/apg/patterns/menubar/ : 矢印・サブメニューとEscape。
- https://www.w3.org/WAI/ARIA/apg/patterns/windowsplitter/ : separator値・方向・矢印。APG自身が例完成待ちと記す点も留意。
- https://www.w3.org/WAI/tutorials/forms/multi-page/ : 段階表示、保持と検証。
- https://react.dev/reference/react/useOptimistic : 先行表示と結果同期の概念。展示はこのhookを必須とせず明示IDモデルで独自実装。
- https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/progress
- https://developer.mozilla.org/en-US/docs/Web/API/Element/setPointerCapture

## 引継ぎと境界

Windowsの旧WAAPI timeoutはUNKNOWN。今回はLinux cloudであり、再現しないことを解消と読み替えない。実iPhone Safari、Mac、VoiceOver、OS IME、実機タッチはUNVERIFIED。pointer/touch emulationと実機は別。依存criticalはIssue #44継続、audit baselineは29件（critical3/high8/moderate17/low1）。lockfileは維持、展示と無関係の大規模依存更新はしない。
