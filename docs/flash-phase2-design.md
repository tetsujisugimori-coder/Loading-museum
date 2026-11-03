# Flash Then & Now 第2期：設計と引渡し

Issue #57 / 2026-11-03。開始main `d71411a0a635ec1f69d9fa16b717b3880e02054a`（PR #56統合済み）。既存規則ファイルAGENTS.mdはrepo内になし。作業前clean clone、専用branchで既存作業treeと分離。

## 判断

1. Phase1へ全作品分岐を詰め込む案、別展示室を作る案、既存runtimeと新PhaseTwoCardを組み合わせる案を比較。最後を採用。既存6作品のカード・操作は保ち、新6作品だけsolo/compareを追加する。
2. 各面の編集状態は独立。共通開始/停止はclock gateのみ。Thenだけ/Nowだけでは非表示面をunmountせず保存し、active=falseとして停止。Resetのみ両面をremountして絵・発見・時間を初期化する。
3. 既存useFrameはactive false時にcancel、再開時の初回時刻をリセット。画面外は既存ThenNowMountからactiveを渡す。初回ブラウザでpageHiddenが編集状態を破棄することを検出したため、Phase2のみページ非表示時はmountを保ちglobalPlaying=false、閉室時はunmountする。旧Phase1の挙動は維持する。reduced motionは自動進行を止め、手動操作は残す。大規模共通改修・依存追加なし。
4. 全図案はSVG/HTMLの独自制作。Canvas案と比較し、拡縮・静止状態・テスト可能な図形が扱いやすいSVGを採用。ゲームエンジン・画像素材・SWFの取り込みなし。
5. 作品ごとに操作を選び、不要なseek等は付けない。Maskは時刻/窓、Elasticは速度を保持する反転、Parallaxは視点、Frameは編集するコマ、Explorerは発見、Preloaderは実量と幕を別状態にする。

## 対等なThen / Now

|作品|Then|Now|観察の中心|
|---|---|---|---|
|Mask Theatre|紫と桃色の大胆な幕、36段階|紙景色、斜めの帯と連続開口|同じ窓の形・位置・進行|
|Elastic Navigation|4施設が中心から飛び出す|折れた索引状の入口|途中反転で速度が残ること、行先の変化|
|Parallax Stage|夜の書き割りの森|切り絵の観測所|山・建物・木の別々の視差|
|Frame-by-Frame Lab|紙鳥のパラパラ帳|凧の設計青図|編集した一枚が時間を変える|
|Isometric Explorer|昼の切手島|夜の観測地図|歩く/調べる/発見の保存|
|Preloader Theatre|切符と列車から山岳本編|部品組立から観測所本編|1000unitsの完了と幕の転換の差|

Thenは不便な旧版ではなく表現上の選択。36段階などは当時の機械性能を測定した値ではない。Nowもなめらかさの一方向改善を標榜しない。特定作品の作者/初出/歴史的実装を検証したとは主張しない。

## 参考技術資料

2026-11-03にMDN本文を取得確認。資料は技術APIの根拠でありFlashの歴史的初出の根拠ではない。
- https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/clipPath
- https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame
- https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute/transform
- https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events
- https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key
- https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/progressbar_role

## 保全

[60作品＋全館重複監査](flash-phase2-inventory.md)。既存60件の全フィールドhashを新規試験で固定。元54件・カテゴリ18の既存hashも保持。旧6組の試験は継続し、新6組は別suiteとして追加。登録数試験は要件による251→257、60→66のみ変更し、失敗を隠す期待値緩和ではない。

#29保守、#44依存セキュリティ、#54過去UNKNOWN/実機未検証は別件のまま。依存lock無変更、Next/Vitest外部serverを公開せず静的outを127.0.0.1で受入。既存advisoryを無害・解決済みとは判断しない。

## 独立レビューへ

今回の実装担当による試験は自己検証。別の担当/環境による独立レビューを未実施のまま区別する。重点は6作品が作品として成立するか、Then/Nowの固有性、solo側時計とReset、作画のコピー独立性、探索の操作差、進捗と幕の区別。実機iPhone Safari/VoiceOver/実OS背景化はNOT_TESTED。
