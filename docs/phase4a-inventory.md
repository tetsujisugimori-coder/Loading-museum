# 第4期A：採用判断と受入契約

2026-11-01 JST。基準main `2de159a9a7534c8af32c8ebcda6c247947b9057c`、#42 merged、専用clone clean。Issue #43 / branch `feat/practical-ui-phase4a`。Calculator Memoの作業は使用しない。通常sandbox gitはDNS失敗、昇格した通常git cloneで取得。repo内AGENTS/.agents/skillsなし。共通AGENTSは末尾日時を要求。@edoben資料はローカルskills名とGitHub検索では発見できず未確認。

## 全登録の照合

`node scripts/inventory.mjs` がデータ配列を読み、トップ9とDOM操作IDもソースから集計する。基準の領域別計数と新規6の計数はevidenceへ保存する。既存展示の全操作受入の主張ではない。

| 候補 | 既存の近似展示 | 新規として採用する差分・受入 |
|---|---|---|
| Toast Stack | WAAPI toast/bell/badge、単発fade/slide | 最大4通知、種類別、独立期限、個別解除、追加・中間削除時の再配置、入退場。単一toastとは別の状態管理 |
| Undo Snackbar | MacPaint Undo、hold/state button | 架空3項目の削除、期限内復元と期限切れ確定。次の削除は前の保留を確定し、新しい1操作だけUndo。実保存なし |
| Inline Validation | WAAPI form-error | empty/editing/invalid/validとblur確定。IME中は検証抑制、フォーカス維持、メッセージによる高さ変化 |
| Search Suggestions | 館内フィルター、DOM selection、stagger list | ローカル候補のprefix優先並替/絞込、追加削除の動き、comboboxの矢印/Enter/Escape/タップ。非同期検索を導入せず古い応答復活を構造的に避ける |
| Sliding Tabs | WAAPI panel/menu、Shared/Crossfade | 異なるタブ幅に追従する単一インジケーターと内容/選択/フォーカスの同期。矢印/Home/Endと高速反転 |
| Animated Accordion | 各展示室の単純開閉、第1期Clip Menu | Clip Menuにも途中反転と開閉緩急はあるが、固定stage内のclip表示。今回は内容量別の実測高さ、単一/複数展開、文書flowでの隣接項目移動、現在/目標pxを比較する |

全227登録のタイトル・用途・実装分岐を横断確認し、上記近似と区別する。既存原理(CSS補間/WAAPI/FLIP)自体の新規性は主張しない。第4期Bの空枠なし。

追加照合：WAAPI Turn Order Reflowは既にFLIPでDOM順を変える教材であり、ToastのFLIP自体を新規技術と数えない。通知ごとの寿命と種類・上限・解除が用途差。Menu Selection Cursorは既に選択位置へ追従するため、Tabsは幅の異なる水平タブ・内容panel・roving focusの連動で区別。DOM01〜17は追加/削除/属性/選択/複製/座標APIの個別学習で、候補の確定や期限付きUndoの状態契約はない。全館の登録を読むことと全館全操作を試すことは区別する。

## 実装・受入方針

既存PracticalRoomの開閉/検索/説明を共有し、別phaseで第4期領域を設ける。既存phase3の配列とplayerは不変。React/TS、CSS、WAAPIによる独自制作、外部素材/依存追加なし。WAAPIは完了callback失効とcleanup、Resetはplayerを再mountして時計/保留操作を破棄する。有限deadlineの時計は画面外/非表示/手動停止で停止し、低減時にも機能期限は維持（秒は観察中の有効時間）。動き低減は移動/反復だけ省略。検索は同期ローカル計算なのでtimer/ネット応答なし。

新規状態遷移試験、全既存試験、lint/type/build、実ブラウザ2種×4幅×6展示。代表/連続/取消/Reset/再操作/低減途中切替、IME・ARIA・focusを実DOMで確認。スクリーンショットと結果は保存し、自己検証と独立レビューを分ける。実iPhone Safari/実IME/VoiceOverはUNVERIFIED。

## 一次資料・権利

2026-11-01 JSTに本文確認。資料のコード/画像は転載しない。全6部品の歴史的初出・発明者はUNKNOWN。現行操作パターンを参考にした独自再構成であり、特定製品の正確な複製ではない。

- https://www.w3.org/WAI/ARIA/apg/patterns/combobox/ （入力focus/active descendant/選択）
- https://www.w3.org/WAI/ARIA/apg/patterns/tabs/ （roving tabIndex、矢印）
- https://www.w3.org/WAI/ARIA/apg/patterns/accordion/ （button、expanded、controls）
- https://developer.mozilla.org/en-US/docs/Web/API/Element/compositionstart_event （IME変換中の区別）

通知はpolite status、項目を動かしてもDOMの意味を保持。Undo期限は短い実用推奨値の主張ではなく、停止可能な模擬教材。
