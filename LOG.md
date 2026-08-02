# Loading Museum 作業ログ

## 2026-08-02 — PR #14 FlashバナーCTAの安全な発光強調

- 対象は「点滅CTAと価格の飛び込み」展示だけとし、18カテゴリ・54展示、他の専用コンポーネント、レイアウトは変更しなかった。

### 問題と修正

- 旧`ad-cta`はCTAが下から登場するものの、唯一の影が透明で、展示名にある「点滅」が実質的に視認できなかった。
- 7秒タイムラインのCTA登場後、`70%`と`78%`で2回だけ安全に強調するよう変更した。表示中のopacityは1のまま保ち、`scale(1.06)`、`brightness(1.35)`、白と黄色の実色`box-shadow`で発光させる。
- `74%`、`82%`で通常状態へ戻し、`92%`まで完成状態を維持する。高速なopacity反転、常時点滅、3回以上の反復は使用しない。
- 価格は従来の奥から飛び込む動きを維持し、`40%`で`scale(1.08)`、`brightness(1.28)`、弱いtext-shadowを1回だけ加え、`45%`で通常状態へ戻す。CTAより回数と光量を抑えた。
- `.adCta:focus-visible`へ白い3px outlineを追加し、box-shadowが変化している最中もキーボードフォーカスを識別できるようにした。CTAはHTML buttonのままで、外部遷移しない。
- 展示説明を、最後にCTAが短く2回だけ発光する内容へ更新した。アクセシビリティ説明にも、高速・常時点滅を使わず、reduced motionでは完成状態を静止表示することを明記した。

### reduced motion・停止制御

- `prefers-reduced-motion: reduce`では価格とCTAのanimationを`none !important`とし、opacity 1、transform／filter／box-shadowなしの完成状態を明示した。商品、コピー、限定ラベルも既存規則により完成状態で表示され、CTAは操作可能なまま残る。
- 通常アニメーションは既存の`data-running="true"`セレクタだけに適用する。個別停止の実機確認では`data-running="false"`となり、価格とCTAがopacity 1、transform／filter／box-shadowなしの完成状態へ戻った。全体停止、画面外、カテゴリ変更、閉室、タブ非表示は同じ既存`active`経路を利用する。

### テストと実機確認

- 波括弧を追跡する`readCssBlock`をテストへ追加し、`ad-cta`と`ad-price`のキーフレーム本体を構造的に検査した。
- CTAの強調点が70%／78%の2回だけであること、表示区間でopacity 0へ戻らないこと、scale／brightness／実色box-shadow、短い強調区間、価格の1回だけの弱い強調、focus-visible、button維持、data-running限定、reduced motion完成状態を検査した。
- 実行コマンド: `node --test tests/rendered-html.test.mjs`、`npm run lint`、`npx tsc --noEmit`、`npm run check`、`npm run build`。
- `npm run check`: ESLint、TypeScript、静的build、Nodeテスト16件がすべて成功。
- `npm run build`: 成功。`/`と`/_not-found`を静的生成した。
- ブラウザの7秒時系列採取では、商品→コピー→価格→限定ラベル→CTAの順を確認した。CTAのbrightnessは2つの局所ピークと間の低下、価格は1つのピークだけを計測し、CTAの実色外周光も確認した。
- デスクトップ: 発光時も`VIEW DEMO`が読め、クリック後に`DEMO CLICKED — 外部遷移はありません`を表示した。個別停止後もクリック結果と完成状態を維持し、エラーoverlayはなかった。
- 1000px: 検証用同一オリジンiframeで2列表示を確認した。390×844: 1列表示、価格・限定ラベル・CTAの非重複、CTAクリック、停止完成状態を確認した。表示範囲内に横方向の欠けはなかった。
- `docs/screenshots/flash-banner-desktop.png`をCTA発光時のデスクトップ画像として追加した。
- OS設定を切り替えたreduced motion実機確認は未実施。メディアクエリの完成状態をCSS構造テストと通常停止時の計算済みスタイルで確認した。

## 2026-08-02 — PR #14 最終レビュー対応

- 対象はレビューに残った3点だけとし、18カテゴリ・54展示、既存デザイン、前回追加した専用展示を維持した。

### スプライト走行

- フレーム・バイ・フレーム用の`characterPoses`から走行展示を分離し、走行専用の`runPoses`を8フレーム追加した。
- `CONTACT LEFT → DOWN LEFT → PASS LEFT → UP LEFT → CONTACT RIGHT → DOWN RIGHT → PASS RIGHT → UP RIGHT`の循環とし、左右の腕・脚、接地側を交互にした。頭・胴の傾きと上下動は小さく保ち、TURN、FALL、LOOKなど非走行姿勢は含めない。
- 走者を中央付近へ固定する既存構成、遠景・前景の速度差、低速・標準・高速切替を維持した。
- 実機確認で、CSSの`animation` shorthandが初期の`animation-play-state: paused`を上書きすることを発見した。`data-running="false"`の明示規則を追加し、個別停止時に走行フレーム、遠景、前景がすべて停止するようにした。

### aria-live

- 約150msで更新されるフレーム・バイ・フレーム表示と、90〜230msで更新される走行フレーム表示を、`aria-hidden="true"`の視覚専用`span`へ変更した。`output`の暗黙statusも避け、連続フレームをライブ通知しない。
- フレーム選択、前後移動、自動再生開始・停止は、別の`role="status" aria-live="polite"`領域へ操作時だけ通知する。
- スプライト走行は低速・標準・高速の選択時だけ、同じ専用statusへ変更結果を通知する。頻繁に変化するフレーム番号とstatusを分離した。

### コンボ停止とタイマーcleanup

- `ComboDamageVisual`が`active`を使用し、非アクティブ時は稼働中の子コンポーネントをアンマウントして、コンボ0、ダメージ配列空、ゲージ0の停止表示へ切り替える。
- コンボリセットtimeoutと全ダメージ削除timeoutを`clearAllTimers`へ集約し、リセット操作とアンマウントcleanupから共通利用する。
- 全体停止、画面外、カテゴリ変更、展示室終了、タブ非表示、reduced motionで`active=false`になるとcleanupが走り、再開時は初期状態から始まる。停止中のHITとリセットbuttonはdisabledになる。

### テストと実機確認

- テストを更新し、`runPoses`が8フレームであること、非走行ラベルを含まないこと、四肢角度の変化、末尾から先頭へ接続可能な角度差、SpriteRunVisualでの専用データ利用を検査した。
- 視覚フレーム表示の`aria-hidden`、専用status、手動選択・再生・速度変更の通知、自動表示に`aria-live`がないことを検査した。
- コンボの`active`分岐、停止時の初期値、HIT無効化、共通タイマー破棄、アンマウントcleanupを検査した。
- 実行コマンド: `node --test tests/rendered-html.test.mjs`、`npm run lint`、`npx tsc --noEmit`、`npm run check`、`npm run build`。
- `npm run check`: ESLint、TypeScript、静的build、Nodeテスト15件がすべて成功。
- `npm run build`: 成功。`/`と`/_not-found`を静的生成した。
- ブラウザ（1487pxデスクトップ）: 8段階走行、四肢角度、低速／高速切替、速度status、個別停止中のフレーム固定と背景`paused`を確認した。
- フレーム展示: 視覚番号を維持しながらライブ属性がなく、手動選択後だけ「フレームNを選択しました」とstatusへ入ることを確認した。
- コンボ展示: HITで数字とゲージが出現し、全体停止直後にダメージ0、ゲージ0、HIT disabledとなることを確認した。カテゴリ変更後と閉室1.8秒後も初期状態で、エラーoverlayはなかった。
- 1000pxと390×844は前回確認済みのグリッド規則を維持し、今回追加したstatusは視覚的にクリップされ、disabledスタイルもカード内に収まることをCSSとビルドで再確認した。このブラウザセッションではviewport変更APIが利用できなかったため、実幅の再操作は未実施。

### 未実装事項

- OS設定そのものを切り替えたreduced motionの再確認は未実施。既存の`active`伝播、メディアクエリ、Nodeテストで停止経路を確認した。
- スクリーンリーダー実機での音声読み上げは未実施。ブラウザのアクセシビリティ構造とDOM属性で、連続表示がライブ領域にならないことを確認した。

## 2026-08-02 — PR #14 代表9展示・現代Web継承比較の再設計

- 作業ブランチ: `agent/flash-animation-special-exhibit`
- 目的: 前回修正で操作可能になった展示のうち、名称に対して技法の本質が弱かった9展示を、説明を読まなくても動きから理解できる専用表現へ作り直した。18カテゴリ・54展示と独立入口は維持した。

### 修正した9展示

1. フレーム・バイ・フレーム: 4つの簡略姿勢から、頭、胴、腕、脚の角度と位置が異なる8姿勢へ変更。跳躍・振り向き・着地の流れ、現在番号、前後ボタン、手動選択、自動再生を追加した。
2. ロゴの分解・集合: letter-spacing中心の表現を廃止。架空ロゴ`ORBITAL`を7文字のDOMへ分割し、別方向、回転、奥行き、scale、delayから集合して輪郭が確定するようにした。「集合」「分解」を明示した。
3. ビート同期フラッシュ: 連続音の光量表示から、AudioContext時刻で短いアタック／減衰音を先行スケジュールし、AnalyserNodeのピーク時だけ反応する展示へ変更。72／108／144 BPM、強度meter、ピーク数を追加した。
4. 点滅CTAと価格の飛び込み: 単一文字の拡縮から、商品、コピー、価格、限定ラベル、CTAの5段階タイムラインへ変更。資料用広告を明示し、CTAは外部遷移せず`DEMO CLICKED`を表示する。
5. スプライト走行: 単一要素の上下動から、8走行姿勢、固定した走者、別速度の遠景・前景スクロールへ変更。現在フレームと3段階の速度切替を追加した。
6. コンボとダメージ数字: 初期の`120 / 0 COMBO`を廃止。HITごとに一意IDを持つ数字を配列stateへ追加し、位置、角度、サイズ、上昇・消滅を変える。ゲージ、5・10コンボ表示、1.7秒後のリセット、全タイマーcleanupを追加した。
7. ジェネラティブ線画: CSS背景から、seedで点を配置し距離条件で実際のSVG lineを生成する実装へ変更。点数range、線数表示、再生成、viewBoxを追加した。
8. インタラクティブ詩: 同じ語のhover表示から、8つの異なるbuttonへ変更。選択語、相手語、文型、配置と関係線を更新し、同じ語を再選択しても別の一文が生まれる。
9. オニオンスキン: 固定した3つの単純図形から、8姿勢の現在・前・次を共有データで描く制作補助へ変更。現在フレーム、ON／OFF、前のみ／前後／次のみを選択できる。

### 比較カテゴリの新しい目的

- 名称を「現代Web技術との比較」から「Flash表現は現代Webへどう引き継がれたか」へ変更した。
- 中心メッセージを「Flashで一つの制作環境に統合されていたアニメーション、入力、音、描画が、現代Webでは複数の標準技術へ分かれて継承された」とした。
- モーショントゥイーンは左右で同じ移動を再生し、制作単位、実行環境、コード、再利用性、外部連携、アクセシビリティ、プラグイン依存を短い日本語で比較する。
- マウス追従は一つのポインター入力へ、左のActionScript／enterFrameと右のPointer Events／requestAnimationFrameが同時に反応する。
- 音と描画はSoundMixer／BitmapDataの統合性と、Web Audio／Canvas／SVG／DOMを組み合わせる標準性を並べる。Flashを劣った技術として扱わず、統合制作環境としての強みも明記した。

### 追加・変更したコンポーネント

- `app/components/FlashRefinedVisuals.tsx`を追加し、`FrameByFrameVisual`、`LogoAssemblyVisual`、`BeatSyncVisual`、`BannerCtaVisual`、`SpriteRunVisual`、`ComboDamageVisual`、`GenerativeLinesVisual`、`InteractivePoemVisual`、`OnionSkinVisual`、`MotionTweenComparisonVisual`、`PointerComparisonVisual`、`MediaComparisonVisual`へ分割した。
- 8つの`characterPoses`をフレーム・バイ・フレーム、スプライト走行、オニオンスキンで共有し、展示目的に応じて再生・制作比較へ使い分ける。
- `FlashVisuals.tsx`は専用マップを先に解決し、既存の汎用展示と前回追加した専用展示を維持する。

### 停止・cleanupとアクセシビリティ

- 既存の`active`により、個別停止、全体停止、画面外、カテゴリ変更、展示室終了、タブ非表示、reduced motionを新コンポーネントへ伝播する。
- フレーム／スプライトのinterval、コンボの削除・リセットtimer、ビートのscheduler／RAF／Oscillator／AudioContextをeffect cleanupで停止する。
- 音停止直後に閉じたAudioContextへ`suspend()`が競合する実機エラーを検出し、`context.state`確認とPromiseエラー処理を追加した。
- 操作はbutton、select、rangeを使用。`aria-current`、`aria-pressed`、`output`、`aria-live`、meter、左右見出し、SVG説明ラベルを追加した。
- reduced motionでは広告を完成状態にし、ビートscale、ダメージ上昇、詩の移動、背景スクロールなどを止める。

### テスト内容と結果

- 8姿勢と手動前後操作、7文字ロゴ、集合／分解、ビートのAudioContext時刻・包絡線・ピーク検出・BPM、広告5要素、8姿勢スプライト、ダメージ配列とコンボtimer、seed付きSVG線、8語buttonと文章生成、オニオンのフレーム・範囲、3つの左右比較、cleanup、reduced motionを検査するNodeテストを追加した。
- `npm run lint`: 成功。
- `npm run typecheck`: 成功。
- `npm test`: GitHub Pages向け静的buildとNodeテスト15件がすべて成功。
- `npm run check`: 成功。
- `npm run build`: 成功。

### 実機確認

- Edgeデスクトップ: 9展示の状態変化、ビートの`PEAK 1`、音停止後`data-running=false`、比較3展示、全体停止を確認した。音停止の競合修正後はエラー表示0件。
- 1000px前後: 展示カード2列、比較の左右2列、横スクロールなし。
- 390×844: 展示カード1列、比較の左右を上下1列、横スクロールなし、表示中buttonの重なり0件。
- reduced motionのOS設定実切替は未実施。Reactの`reduced`分岐、CSSメディア規則、静止代替をテストとコードレビューで確認した。

### スクリーンショット

- `docs/screenshots/flash-frame-by-frame-fixed.png`
- `docs/screenshots/flash-logo-assembly-fixed.png`
- `docs/screenshots/flash-beat-sync-fixed.png`
- `docs/screenshots/flash-sprite-run-fixed.png`
- `docs/screenshots/flash-generative-lines-fixed.png`
- `docs/screenshots/flash-interactive-poem-fixed.png`
- `docs/screenshots/flash-modern-inheritance-fixed.png`

### 未実装事項・今後

- Flash IDE、ActionScript、Flash Playerの完全なエミュレーションではなく、教育用の抽象化である。
- ビートは権利物を使わない合成キック音で、任意音源ファイルやマイク入力には対応しない。
- 連打の5・10コンボはソースと自動テストで確認したが、ブラウザ操作基盤の1クリックに時間がかかるため実時間内の手動連打は未確認。
- 今後は、フレーム姿勢のSVG輪郭化、広告タイムラインのスクラブ、詩の複数関係線、生成線画の対称性・接続距離操作、比較デモのコード表示切替を追加できる。

## 2026-08-01 — PR #14 レビュー対応

- 既存PR #14の18カテゴリ・54展示と独立入口を維持し、共通テンプレートに偏っていた代表展示を専用コンポーネントへ置き換えた。
- CSSで無効だった剰余演算を`data-variant`と`nth-child`のルールへ変更した。アニメーションは`data-running`を停止の単一経路とし、展示別停止、全体停止、画面外、タブ非表示、reduced motion、展示室を閉じる操作、カテゴリ変更のすべてから停止・破棄されるようにした。
- フレーム・バイ・フレームは4姿勢、パーツアニメーションは頭・胴・手足の独立要素、バネは速度と減衰を持つドラッグ物理、シューターは標的命中判定、FPS比較は4行同時表示として再構成した。
- イントロ、ポートフォリオ、部屋ナビゲーション、放射メニュー、タイムライン、オニオンスキン、雨・雪・炎にも固有の状態とUIを追加した。追従はRAFによる慣性列、視線は`atan2`と半径制限、パララックスは前景から遠景まで異なる移動量を使う。
- 音連動は利用者操作で生成する小音量OscillatorをAnalyserNodeへ接続し、周波数・時間領域データでDOMバーを更新する。停止、非表示、カテゴリ変更、展示室終了時にRAF・Oscillator・AudioContextを解放または休止する。
- CanvasはResizeObserverとdevicePixelRatioに対応し、Pointer Captureを使用する。操作対象をbuttonまたはフォーカス可能なgroupへ整理し、閉じたメニューの項目をTab順から除外した。

### 変更したファイル

- `app/components/FlashVisuals.tsx`（追加）
- `app/components/FlashSpecialExhibitRoom.tsx`
- `app/data/flashExhibits.ts`
- `app/globals.css`
- `tests/rendered-html.test.mjs`
- `README.md`
- `LOG.md`

### 検証

- 追加テスト: 無効なCSS剰余式がないこと、雨・雪・炎の状態、4種類のFPS行、シューターの命中加点とリセット、イントロのSTART / SKIP / ENTER、全体・個別停止、reduced motion、AnalyserNodeと音停止、RAF・Audio・Observerのcleanup、キーボード操作用のARIA構造、Canvasの高DPI対応を検査するテストを追加した。
- `npm run check`: ESLint、TypeScript、GitHub Pages向け静的ビルド、Nodeテスト14件がすべて成功。
- `npm run build`: 単独実行でも成功し、`/`と`/_not-found`を静的生成した。
- Edge（デスクトップ）: 入口と18カテゴリ、イントロのSTART / SKIP / COMPLETE、シューターの命中・100点加算・標的消去、制作技法の4種類のFPS行を確認した。全体停止で`data-playing=false`かつ実行中カード0件となり、再開後の音連動は開始で`data-running=true`、停止で`false`となった。
- Edge（1000px前後）: 展示カード2列、横スクロールなしを確認した。390×844では展示カード1列、カテゴリ目次2列、横スクロールなしを確認した。デスクトップを含め、エラー表示はなかった。
- スクリーンショット: `docs/screenshots/flash-intro-fixed.png`、`docs/screenshots/flash-shooter-fixed.png`。
- OSのreduced motion実切替、Canvasの実機DPI比較、展示室終了後のブラウザプロセス計測、ブラウザ操作基盤でタイムアウトしたFPS内部ボタンの手動押下は未実施。`matchMedia`とCSS規則、DPR・ResizeObserver、各cleanup、React state・`data-running`を自動テストとコードレビューで確認した。

### 既知の制限・今後

- 音声展示は権利物を使わない合成音の解析であり、任意音声ファイルの読み込みには対応しない。
- 物理、描画、音声解析は学習用の軽量な再構成で、Flash PlayerやActionScriptランタイムの完全なエミュレーションではない。

## 2026-08-01 — Flashアニメーション特別展示室

- 作業ブランチ: `agent/flash-animation-special-exhibit`
- 目的: Flashの歴史説明を主役にせず、特徴的なアニメーション、インタラクション、画面演出を見て、触って、現代技術と比較できる特別展示を追加した。
- 役割分担: 常設展は「Flashとは何だったのか」、特別展示室は「Flashは何を、どのように動かしたのか」を扱う。SWF、Flash Player、実在作品・ロゴ・キャラクター・広告素材には依存しない。
- 独立した入口、18カテゴリの目次、カテゴリ切替、展示室全体の再生・一時停止、速度変更、展示別の一時停止・リセット、操作説明、技法情報、現代技術タグを追加した。

### 追加したカテゴリと54展示

1. 基本アニメーション: モーショントゥイーン、シェイプトゥイーン、フレーム・バイ・フレーム
2. 文字・ロゴ: タイプライター、ロゴの分解・集合、波打つ発光文字
3. ベクター・図形変形: 円から多角形への変形、液体とゴムの伸縮、タイル分割と再構成
4. マスク・画面転換: 円形マスク転換、ブラインド・ワイプ、スポットライト
5. ボタン・UI: 光沢ロールオーバーボタン、放射メニュー、パーセント・ローダー
6. マウス連動: 慣性カーソル追従、視線追従、絵筆カーソル
7. キャラクター: マスコットの待機・瞬き、パーツアニメーション、画面端から覗く案内役
8. 擬似物理: 重力と反発、ゴム紐とバネ、雨・雪・炎
9. パーティクル: 光粒子の噴出、ロゴの粒子化と再集合、魔法陣と星の軌跡
10. 背景・空間表現: 多層パララックス、星屑ワープ、地平線グリッド
11. 擬似3D: 回転する立方体、3Dカルーセル、ワイヤーフレーム・トンネル
12. 音連動: 音楽ビジュアライザー、波形モニター、ビート同期フラッシュ
13. Flashサイト演出: スキップ可能なフルスクリーンイントロ、画面全体が動くポートフォリオ、部屋を移動するナビゲーション
14. バナー広告: 点滅CTAと価格の飛び込み、バナー内スロット、逃げる閉じるボタン（安全版）
15. ゲーム演出: スプライト走行、クリック・シューター、コンボとダメージ数字
16. 芸術・実験表現: ジェネラティブ線画、万華鏡、インタラクティブ詩
17. 制作技法: キーフレーム・タイムライン、オニオンスキン、12 / 24 / 30 / 60fps比較
18. 現代Web技術との比較: トゥイーン技法の比較、マウス連動の比較、音・描画APIの比較

### 再現技術

- CSS Animation / Transition / `transform` / `clip-path` / Grid / perspectiveで、タイムライン、トゥイーン、マスク、文字、擬似3D、背景、キャラクター、バナー表現を再構成した。
- React stateでカテゴリ、再生状態、速度、各展示の変形・リセット、カルーセル、スロット、比較タブを制御した。
- Pointer Eventsで追従、視線、スポットライト、ドラッグ、絵筆入力を扱い、ドラッグ対象にはpointer captureを使った。
- Canvasで絵筆カーソルを再現した。Web Audio APIで著作権素材を使わない小音量の合成音を生成し、利用者の操作後だけ開始する。
- 各展示データを`app/data/flashExhibits.ts`へ分離し、名称、カテゴリ、説明、Flash技法、現代技術、操作分類、操作方法、reduced motion代替、アクセシビリティ注意を型付きで管理する。

### パフォーマンスとアクセシビリティ

- 初期状態では展示室を閉じ、選択中カテゴリの3展示だけを描画する。カテゴリ変更時に前カテゴリのコンポーネントを破棄する。
- Intersection Observerで各カードの画面内状態を監視し、画面外では`data-running`を無効化する。Observerはカード破棄時に`disconnect`する。
- 長いカードへ`content-visibility: auto`と`contain-intrinsic-size`を指定した。粒子要素数は最大18に制限した。
- 展示室全体と自動再生展示ごとに停止操作を用意した。展示室を閉じる場合とコンポーネント破棄時にWeb AudioのOscillatorとAudioContextを停止・解放する。
- `prefers-reduced-motion: reduce`をJavaScriptとCSSで検出し、自動再生、点滅、画面揺れ、ズームを止めて代表フレームを表示する。設定変更イベントも解除する。
- 主要操作はネイティブbutton、select、detailsで実装し、`aria-expanded`、`aria-controls`、`aria-pressed`、`aria-hidden`、`inert`、操作対象を含むラベルを付けた。
- バナーの「逃げる閉じるボタン」には、動かない「即時終了」ボタンを常設した。音は自動再生しない。
- 3列、2列、1列のレスポンシブ配置を用意し、モバイルではカテゴリ目次を2列にする。

### 変更したファイル

- `app/data/flashExhibits.ts`
- `app/components/FlashSpecialExhibitRoom.tsx`
- `app/page.tsx`
- `app/globals.css`
- `tests/rendered-html.test.mjs`
- `README.md`
- `LOG.md`

### 実行したテストと結果

- `npm run typecheck`: 成功
- `npm run lint`: 成功
- `npm run check`: 成功。ESLint、TypeScript型検査、GitHub Pages向け静的ビルド、Nodeテスト13件がすべて成功した。
- `npm run build`: 成功。`output: "export"`、`basePath`、`assetPrefix`を維持し、`out/`へ静的出力した。
- ブラウザ確認: Edgeで入口、開閉、18カテゴリ、全体停止、3Dカルーセル、安全な広告終了、現代技術比較、マウス連動を操作した。コンソール警告・エラー、Next.jsエラー表示、横方向のはみ出しはなかった。
- モバイル確認: 390×844相当で1列カード、2列カテゴリ目次、横スクロールなしを確認した。
- 音の自動再生: `audio` / `video`要素がなく、Web Audio APIの開始処理が「音を開始」ボタンのイベント内だけにあることを自動テストとブラウザで確認した。
- reduced motion: OS設定の実切替は未実施。`matchMedia`による実行停止、変更イベントの解除、CSSメディア規則、静止フォールバックを自動テストと生成物で確認した。

### スクリーンショット

- `docs/screenshots/flash-room-entrance.png`
- `docs/screenshots/flash-room-3d-desktop.png`
- `docs/screenshots/flash-carousel-desktop.png`
- `docs/screenshots/flash-banner-desktop.png`
- `docs/screenshots/flash-room-mobile.png`
- `docs/screenshots/flash-modern-comparison.png`
- `docs/screenshots/flash-shape-tween.png`
- `docs/screenshots/flash-mouse-follow.png`

### 未実装候補・今後追加できる展示

- ページめくり、文字形マスク、煙・インク転換、虫眼鏡、磁石ボタン、慣性投げ、ロープ・鎖・布、より精密な流体、地球儀、床面反射、商品回転、建物内探索、横スクロールサイト、着せ替え、リズムゲーム、フラクタル、無限ズーム、ベクターとビットマップの拡大比較。
- WebGL / Three.js / GSAP / Lottieの実ライブラリ比較、利用者が選んだ音声ファイルの解析、Canvas粒子による文字輪郭サンプリングは、依存関係と負荷を抑えるため今回導入していない。

### 既知の制限

- 54展示は各技法を短時間で比較する抽象化であり、Flash IDEやActionScriptランタイムの完全な再実装ではない。
- 音連動は外部音源の周波数解析ではなく、利用者操作で開始する単一の合成音と視覚表現を組み合わせた安全な再現である。
- カテゴリ内は3展示に揃え、候補一覧のすべてを個別展示にはしていない。データ構造へ同形式で追加可能。

## 2026-07-27 — MS-DOS・PCコマンドライン展示室

- 作業ブランチ: `agent/ms-dos-exhibit-room`
- 「時代別展示室」セクションと「MS-DOS・PCコマンドライン展示室」を追加した。
- 既存の9個のアニメーションは削除・変更せず、常設展示として維持した。
- 展示室は初期状態を閉じたアコーディオン形式とし、見出し全体を`button`で操作できるようにした。

### 追加した8種類のアニメーション

1. 回転スピナー
2. ドット増加
3. 点滅する待機表示
4. 文字プログレスバー
5. ファイルコピー表示
6. 圧縮ファイル展開表示
7. コンパイル進行表示
8. ディスク確認風表示

### 設計と実装

- 展示室と展示項目を`roomId`、`roomTitle`、`period`、`description`、`exhibits`などのデータで定義し、共通の展示室コンポーネントから描画する構造にした。
- 各展示へ、使用場面、分類、短い解説、利用者向けの実装コメント、開閉式のコード例を追加した。
- 実装コメントには「JavaScriptで文字列を切り替えて再現」「JavaScriptで進捗値から文字バーを生成」「CSSで点滅を再現」など、実際の再現方法を簡潔に記載した。
- 一般的な表現は「当時広く使われた表現」、正確な特定ソフトの画面を根拠にしていないログは「時代風の再現」と明示し、MS-DOS標準機能とは断定していない。
- 将来は同じデータ定義と共通コンポーネントへ項目を追加することで、Windows、macOS、Unix/Linux、Web、AI思考中などの展示室を追加できる。
- JavaScriptアニメーションは、展示室が開いていてページが表示中の場合だけ`setInterval`を開始する。閉じた場合、タブが非表示になった場合、コンポーネントが破棄された場合はcleanupで`clearInterval`し、重複起動を防ぐ。
- 展示室内の表示領域には固定の最小高さを設け、文字の切り替えやログ行の追加でカードの幅・高さが頻繁に変化しないようにした。

### アクセシビリティとレスポンシブ

- 展示室の開閉ボタンへ`aria-expanded`と`aria-controls`を設定し、ネイティブ`button`によってEnterキーとSpaceキーで操作できるようにした。
- 展開領域へ`role="region"`と`aria-labelledby`を設定し、閉じている間は`aria-hidden`と`inert`で内部操作を無効にした。
- 展開後の末尾に「展示室を閉じる」ボタンを置き、閉じた後は展示室見出しボタンへフォーカスを戻す。
- 既存の`prefers-reduced-motion`設定を維持し、開閉、点滅、文字アニメーションの動きを停止または最小化する。
- 広い画面では2列、スマートフォンでは1列で展示カードを表示する。

### 確認結果

- `npm run lint`: 成功
- `npm run typecheck`: 成功
- `npm test`: 5件すべて成功
- `npm run build`: 成功（`npm test`内で実行）
- 初回の`npm test`では、Reactの静的HTMLに入るコメント境界と型定義の件数をテストが誤って数えたため2件失敗した。生成形式に合わせてテスト条件を限定し、再実行で5件すべて成功した。
- PC表示: 既存9展示、追加8展示、2列レイアウト、コード表示、アニメーション変化、横方向のはみ出しなしを確認した。
- スマートフォン表示: 既存9展示、追加8展示、1列レイアウト、横方向のはみ出しなしを確認した。
- アコーディオンを閉じた後に回転スピナーの文字が変化しないこと、点滅が無効になること、見出しボタンへフォーカスが戻ることを確認した。
- `/Loading-museum/`と配下のCSS・JavaScriptが簡易HTTPサーバーから正常に読み込まれ、エラー画面やコンソールエラーがないことを確認した。

### 既知の制限と今後の拡張候補

- 今回のログ表示は時代の雰囲気を説明する再現であり、特定のソフトウェアやコマンドの画面を忠実に複製したものではない。
- 展示室はMS-DOS・PCコマンドラインのみ実装している。Windows、macOS、Unix/Linux、Web、AI思考中などは今後データを追加して拡張する。
- コード表示は理解しやすい要点に絞った抜粋であり、コンポーネント全体のソースコードは表示しない。

## 2026-07-27 — PR #4 reduced motionレビュー対応

- 作業ブランチ: `agent/ms-dos-exhibit-room`
- レビューで、CSSアニメーションだけでなく`setInterval`による文字アニメーションにも`prefers-reduced-motion: reduce`を反映する必要があると指摘された。
- `window.matchMedia("(prefers-reduced-motion: reduce)")`を使う`usePrefersReducedMotion`を追加し、初期設定と実行中の変更をJavaScriptで検出するようにした。
- `animationsActive`を「展示室が開いている」「タブが表示中」「reduced motionが無効」のすべてを満たす場合だけ有効になる条件へ変更した。
- reduced motionが有効になると、回転スピナー、ドット、文字プログレスバー、ファイルコピー、圧縮ファイル展開、コンパイル、ディスク確認の各タイマーが既存のeffect cleanupで停止する。
- 設定を無効へ戻すと同じeffectから各タイマーが1本だけ再開する。展示室の開閉、タブの表示状態、設定変更が重なってもcleanupが先に実行されるため、タイマーの重複と停止漏れを防ぐ。
- `MediaQueryList`の`change`イベントはコンポーネント破棄時に解除する。
- 通常のモーション設定では従来の間隔と表示内容を変更していない。
- テストへmedia query文字列、`matchMedia`、変更イベントの登録・解除、新しい`animationsActive`条件の検証を追加した。

### 確認結果

- `npm run lint`: 成功
- `npm run typecheck`: 成功
- `npm test`: 5件すべて成功
- `npm run build`: 成功（`npm test`内で実行）
- 未解決事項: なし

## 2026-07-28 — Linux / UNIX 展示室

- 作業ブランチ: `agent/linux-unix-exhibit-room`
- 既存の9個の常設展示とMS-DOS・PCコマンドライン展示室を維持し、その下に初期状態が閉じた「Linux / UNIX 展示室」を追加した。
- UNIX、Linux、ディストリビューション、init方式には複数の系譜があることを説明し、統一された標準画面とは表現していない。
- 実在ログの長い転載を避け、個人情報を含まない短い架空ログをJavaScriptで再構成した。

### 追加した4種類の展示

1. UNIX風ログイン
2. Linuxカーネル起動ログ
3. SysVinit風の起動表示
4. Debian系APT風の進捗表示

### 設計と変更ファイル

- `app/data/exhibitRooms.ts`: 展示データをDOS展示と端末デモの判別可能な型へ整理し、年代、系統・代表環境、フレーム、実機風／観賞用の間隔を持つLinux / UNIX展示室データを追加した。
- `app/components/ExhibitRoomAccordion.tsx`: 既存の共通アコーディオンを再利用し、端末デモカード、実行／再実行、速度切替、進行状態表示を追加した。
- `app/globals.css`: 既存展示室と統一感のある端末カード、等幅ログ領域、PCの2列・モバイルの1列レイアウトを追加した。
- `tests/rendered-html.test.mjs`: 展示データ、初期閉鎖状態、アクセシビリティ属性、タイマーのcleanup、reduced motion、レスポンシブ表示の検証を追加・更新した。
- `LOG.md`: 今回の実装内容、設計判断、確認結果、既知の制限と今後の候補を追記した。
- 将来の展示室も同じ`ExhibitRoom`データと共通アコーディオンへ追加でき、Linux / UNIX固有の分岐を展示ごとに増やさない構造とした。
- 各デモは同時に1本だけ`setTimeout`を保持し、再実行、展示室の閉鎖、タブ非表示、コンポーネント破棄時にcleanupで解除する。
- `prefers-reduced-motion: reduce`ではタイマーを開始せず最終状態を表示し、設定を実行中に切り替えた場合も既存のmedia query監視を通じて反映する。
- UNIX風ログインの`Password:`には入力内容を表示しない。APT風展示は通信やパッケージ操作を行わない視覚的なデモである。

### アクセシビリティとレスポンシブ

- 既存の`button`、`aria-expanded`、`aria-controls`、展開領域の`role="region"`を再利用し、EnterキーとSpaceキーによる開閉に対応した。
- 展開後の「展示室を閉じる」で閉じた際は、Linux / UNIX展示室の見出しボタンへフォーカスを戻す。
- 端末表示へ`role="log"`、`aria-live="polite"`、`aria-atomic="true"`を設定し、実行ボタンと速度選択には展示名を含むラベルを付けた。
- 長い行はログ領域内で折り返し、領域内をスクロール可能にした。広い画面では2列、390px幅では1列とし、ページ全体の横スクロールが発生しないことを確認した。

### 確認結果

- `npm run lint`: 成功
- `npm run typecheck`: 成功
- `npm test`: 7件すべて成功
- `npm run build`: 成功（`npm test`内で実行）
- 初回の`npm test`では型宣言を展示データとして数えたため1件失敗し、テスト対象をオブジェクト定義に限定した。
- 2回目の`npm test`では既存テストが旧`animationsActive`条件を期待したため1件失敗し、現在の`runtimeActive`との組み合わせを検証するよう更新した。最終実行では7件すべて成功した。
- 最終確認時にサンドボックス内の`npm test`がWindowsの子プロセス起動時の`spawn EPERM`で一度中断した。権限付きで同じコマンドを再実行し、静的ビルドと7件のテストがすべて成功した。
- PC表示: 既存9展示、MS-DOS展示室の開閉、Linux / UNIX展示室の4展示、2列レイアウト、4件の実行・再実行、完了状態を確認した。
- モバイル表示: 390×844で1列レイアウト、ログ領域内スクロール、ページ全体の横方向のはみ出しがないことを確認した。
- Linux / UNIX展示室を閉じた後に表示が更新されないことと、見出しボタンへフォーカスが戻ることを確認した。
- 静的出力を簡易HTTPサーバーで開き、`/Loading-museum/`配下のトップページ、CSS、JavaScriptが正常に読み込まれることを確認した。`favicon.ico`は既存どおり未配置のため簡易サーバーで404となる。

### 既知の制限と今後の拡張候補

- 4展示はいずれも歴史的特徴を伝える観賞用の短い再構成であり、特定のOS、ディストリビューション、端末、コマンドの完全な複製ではない。
- 速度切替は画面の再構成速度だけを変更し、実際のログイン、起動、サービス管理、通信、パッケージ操作は行わない。
- 今後の候補: systemd起動、YUM/DNF、configure・make・gcc、失敗表示の切替。

## 2026-07-31 — カーソル展示室

- 画面上の名称とメタデータを「デジタルアニメーションミュージアム / Digital Animation Museum」へ整理し、ローディング以外の画面アニメーションも扱うサイトとして位置付けた。
- 既存9点のローディング展示、MS-DOS・PCコマンドライン展示室、Linux / UNIX展示室の内容は削除・置換せず、同じアコーディオン体系の末尾へ「カーソル展示室」を追加した。
- カーソルが位置だけでなく、選択、リンク、入力、待機、禁止、ドラッグ、操作結果を伝えてきたことを体験できるようにする目的で実装した。
- 特定のOSや製品のカーソル画像は使用せず、一般化した形状と挙動をCSS、JavaScript、Pointer Eventsで再構成した。

### 追加した8種類の展示

1. 標準矢印カーソル
2. リンク用の手カーソル
3. Iビームカーソル
4. 待機カーソル
5. 禁止カーソル
6. ドラッグ中カーソル
7. クリックエフェクト
8. カーソルの残像

### 変更したファイル

- `app/data/cursorExhibits.ts`: id、名称、カテゴリ、年代、目的、説明、操作、使用技術、関連展示、実装コメントを持つ8展示のデータを追加。
- `app/components/CursorExhibitRoom.tsx`: カーソル展示室のアコーディオン、仮想カーソル、ホバー状態、入力、ドラッグ、波紋、残像、関連展示を実装。
- `app/page.tsx`: サイト見出しとフッターの名称を整理し、既存展示室の後へカーソル展示室を追加。ローディング展示室へのページ内導線と、統合後のデータから算出する展示室・展示件数を追加。
- `app/layout.tsx`: タイトルと説明メタデータをデジタルアニメーションミュージアム向けに更新。
- `app/globals.css`: 既存デザインに合わせたカーソル展示カード、CSS図形、アニメーション、2列／1列レイアウト、タッチ向け形状サンプルを追加。
- `tests/rendered-html.test.mjs`: 名称、8展示、データ項目、Pointer Events、固定DOM数、アクセシビリティ、レスポンシブ、reduced motionの検証を追加。
- `package.json`: 指定された`npm run check`を実行できるチェック用スクリプトを追加。
- `README.md`: サイトの対象を画面上のデジタルアニメーション全般へ広げ、カーソル展示室を追記。
- `LOG.md`: 本項目を追記。

### JavaScript / CSSで再現した表現と機能

- 矢印、手、Iビーム、待機リング、禁止記号、掴んだ手をCSS図形で構成した。
- 展示領域内だけで実カーソルを隠し、`requestAnimationFrame`で仮想カーソルの位置を更新する。座標は領域内へクランプし、画面外へ出ない。
- リンク風ボタン、文章、入力欄、禁止領域へのホバーとフォーカスで形状を切り替える。
- ドラッグ対象はPointer Captureを使い、展示領域内に制限したまま移動する。タッチドラッグ中はその展示だけページスクロールを抑止する。
- クリック／タップ位置に同時最大6個の波紋を生成し、約650ミリ秒後に削除する。
- 残像は固定5要素だけを再利用し、マウス移動ごとのDOM生成を避けた。
- `prefers-reduced-motion: reduce`では残像を非表示にし、待機リングと波紋を含むアニメーションを既存の全体規則で1回・最短時間に抑える。
- 仮想カーソルと装飾は`aria-hidden`とし、展示室はネイティブボタン、`aria-expanded`、`aria-controls`、`role="region"`、`inert`でキーボードから説明を確認できる。
- タッチ端末では追従カーソルを固定表示せず、展示ごとの静的な形状サンプルを表示する。クリックエフェクトとドラッグはマウスと同じPointer Events経路を使う。

### 確認結果

- `npm run check`: 成功。ESLint、TypeScript、静的ビルド、9件の生成HTMLテストがすべて成功。
- `npm run build`: 成功。Next.jsの静的exportが完了。
- `npm run dev`: 成功。既存設定の`http://localhost:3000`で起動。
- デスクトップ表示: 8展示の描画、アコーディオン開閉、矢印の領域内クランプ、リンクとIビームの形状変化、クリック波紋、80×30pxのドラッグ、固定5点の残像を確認。
- モバイル表示: 390×844相当でカーソル展示カードが1列になり、ページ全体の横スクロールが発生しないこと、8種類の形状サンプルとドラッグ領域の`touch-action: none`を確認。
- 既存展示: ローディング9点、MS-DOS展示室8点、Linux / UNIX展示室5点、消えたOS展示室6 OS・18点が生成HTMLに残り、既存のGitHub Pages用`basePath`と`assetPrefix`を維持していることを確認。
- アクセシビリティ: カーソル展示室の初期閉鎖、開閉属性、非表示領域の`inert`、フォーカス復帰、装飾の読み上げ除外を自動テストで確認。
- ブラウザ: ページ内容、サイトタイトル、4展示室／48展示、コンソールエラーなし、エラーオーバーレイなしを確認。
- 実機のタッチ入力とOS設定による`prefers-reduced-motion`切替は検証環境でエミュレーションできなかった。共通Pointer Events実装、タッチ用CSS、reduced-motion規則と自動テストまでを確認した。

### 未実装事項と今後の候補

- 歴代OSやブラウザごとのカーソル比較。
- カーソル形状の詳細な年代別整理。
- `.cur`、`.ani`など実際のカーソルファイル形式の展示。
- キーボード操作だけで各カーソル状態を能動的に切り替える再現。
- より長い軌跡、磁力、拡大鏡などの追加エフェクト。
- 起動・読込表現は消えたOS展示室で扱い、スクロール展示室と通知・警告展示室はリンクせず準備中表示とした。

## 2026-07-29 — 消えたOS展示室

- 作業ブランチ: `agent/vanished-os-exhibit-room`
- 既存の9個の常設展示、MS-DOS・PCコマンドライン展示室、Linux / UNIX展示室を変更せず、その下に初期状態が閉じた独立アコーディオン「消えたOS展示室」を追加した。
- 主流市場から退いた理由を一律に「消滅」とせず、後継OSへの置き換え、技術や思想の継承、ハードウェアや市場の変化という観点で説明した。

### 追加した6種類のOS展示

1. Classic Mac OS
2. BeOS
3. NeXTSTEP
4. Palm OS
5. webOS
6. Windows Phone

### 設計と変更ファイル

- `app/data/vanishedOperatingSystems.ts`: OS名、登場時期、対象ハードウェア、起動・待機画面の特徴、待ち時間の見せ方、その後、後世への影響、演出識別子を一元管理するデータ定義を追加した。
- `app/data/exhibitRooms.ts`: 既存の共通展示室データへ「消えたOS展示室」と新しい展示型を追加した。
- `app/components/VanishedOsPlayer.tsx`: 共通の起動・停止・再実行処理と、6種類の演出を描画するコンポーネントを追加した。
- `app/components/ExhibitRoomAccordion.tsx`: 既存アコーディオンを再利用し、6項目の解説と起動再現を持つ共通OSカードを追加した。
- `app/globals.css`: 既存テーマに馴染む展示室、PCの2列・モバイルの1列、6種類のCSS図形と簡易操作画面、フォーカス表示を追加した。
- `tests/rendered-html.test.mjs`: 6展示の静的出力、データ、起動・停止・再実行、タイマーcleanup、reduced motion、ARIA、レスポンシブの検証を追加した。
- `LOG.md`: 今回の実装、設計判断、確認結果、既知の制限と今後の候補を追記した。
- OSごとの差分はデータの`visualType`で管理し、カード、状態表示、操作ボタン、タイマー管理を重複実装しない構造とした。

### 起動演出と安全対策

- Classic Mac OSは明るい起動画面から簡易デスクトップ、BeOSは暗色画面で起動段階の記号を順に点灯、NeXTSTEPは黒基調の状態行からワークスペースへ移る演出とした。
- Palm OSは小型PDA風画面の短い進捗、webOSは軽い光の変化からカード画面、Windows Phoneは暗色画面へタイルが順に現れる演出とした。
- すべてJavaScriptとCSSによる短い再現展示であり、実在するロゴ画像、起動音、商標素材、外部画像、外部APIは使用していない。
- 各展示は同時に1本だけ`setTimeout`を保持し、再実行時に進捗を初期化する。停止、展示室の閉鎖、タブ非表示、コンポーネント破棄時はeffect cleanupでタイマーを解除する。
- 起動中は起動・再実行ボタンを無効にし、停止ボタンだけを有効にするため、連続クリックによるタイマー重複を防ぐ。
- `prefers-reduced-motion: reduce`ではタイマーを開始せず最終状態を表示する。実行中に設定が切り替わった場合も、タイマーを停止して簡略な最終状態へ切り替え、通常設定へ戻した場合は保持していた進捗から1本だけ再開する。

### アクセシビリティとレスポンシブ

- 既存の`button`、`aria-expanded`、`aria-controls`、展開領域の`role="region"`と`inert`を再利用し、EnterキーとSpaceキーによる開閉に対応した。
- 各起動・停止ボタンへOS名を含む`aria-label`を付け、起動状態は`aria-live="polite"`で通知する。各再現画面には状態を含む`role="img"`相当の説明を設定した。
- 展示室を閉じると展開領域は高さ0かつ`inert`になり、見出しボタンへフォーカスを戻す。
- 広い画面では2列、スマートフォン相当の幅では1列となり、6種類の再現画面内とページ全体に不自然な横方向のはみ出しが発生しないようにした。

### 確認結果

- `npm run typecheck`: 成功
- `npm run lint`: 成功
- `npm test`: 9件すべて成功
- `npm run build`: 成功（`npm test`内で静的出力を生成）
- 初回の`npm test`では、型定義の`kind`と`exhibitId`を展示データとして数えたテスト条件により1件失敗した。対象を実データ行へ限定し、最終実行で9件すべて成功した。
- サンドボックス内の静的ビルドとテストはWindowsの子プロセス起動時の`spawn EPERM`で中断したため、同じコマンドを権限付きで再実行し、静的ビルドと全テストの成功を確認した。
- Reactの最終レビューで、reduced motionを実行中に切り替えた際の表示状態を改善した。最初の同期effect案はlintで拒否されたため、stateを増やさず最終状態を派生させる実装に変更し、型チェック・lint・テストを再実行した。
- PC表示: 6カードの2列配置、全6種類の起動完了画面、起動中のボタン無効化と停止ボタン有効化、再実行を確認した。
- スマートフォン表示: 1列配置、6件の起動ボタン、再現画面内の横方向のはみ出しがないことを確認した。
- アコーディオンを閉じた後に展開領域が高さ0かつ`inert`になり、見出しボタンへフォーカスが戻ることを確認した。
- 静的出力を簡易HTTPサーバーで開き、`/Loading-museum/`配下のトップページ、CSS、JavaScriptが正常に読み込まれ、エラー画面やコンソール警告がないことを確認した。`favicon.ico`は既存どおり未配置のため簡易サーバーで404となる。
- ブラウザ環境のreduced motion設定は無効だったため、実行中切替の分岐、タイマー非生成、CSSメディア規則は自動テストと生成CSSの確認で検証した。

### 既知の制限と今後の拡張候補

- 6展示はいずれも歴史的な特徴と設計思想を伝える短い再構成であり、各OSの実画面や操作を完全に複製したものではない。
- 音は使用していない。将来追加する場合も、初期状態は無音とし、利用者が明示的に再生できる簡易電子音に限定する。
- 今後の候補: AmigaOS、OS/2、Symbian、BlackBerry OS、起動段階の解説表示、展示ごとの速度切替。

## 2026-07-29 — PR #10 Loading表現レビュー対応

- 作業ブランチ: `agent/vanished-os-exhibit-room`
- レビュー指摘に合わせ、起動後の簡易画面よりも起動中・読込中・同期中・更新中の待ち時間が長く、情報量の中心になる構成へ変更した。
- OSごとの展示を用途別（OS起動、アプリ・ファイル、同期・通信、更新・インストール）に整理し、閉じた展示室ではタイマーを生成しない構造を維持した。

### 追加・再構成したLoading展示

- Classic Mac OS
  1. 起動シンボルと拡張機能列
  2. 腕時計カーソル
  3. ディスク／アプリケーション読込
- BeOS
  1. 段階点灯する起動アイコン列
  2. Tracker起動待機
  3. ファイル処理とディスクアクセス
- NeXTSTEP
  1. システム起動メッセージ
  2. ディスクとサービスの読込
  3. Workspace Managerのアプリ読込
- Palm OS
  1. HotSyncの進行表示
  2. データベース／アプリ読込
  3. ビーム送信の通信待機
- webOS
  1. パルス型の起動待機
  2. カード型アプリの読込
  3. App Catalogの更新・インストール
- Windows Phone
  1. 移動する点の起動待機
  2. アプリの「再開中」
  3. Storeの取得・更新進捗

### 史実確認と再構成の範囲

- Classic Mac OSの待機カーソル、起動時の段階表示、BeOSの起動アイコン列、NeXTSTEPの起動経路とWorkspace Manager、Palm OSのHotSync、webOSのカード型アプリと更新、Windows Phoneの再開ライフサイクルとStore進捗について、当時のガイド、技術資料、保存資料を参照した。
- バージョン、機種、導入ソフトによって表示が異なるため、画面の完全複製とはせず、確認できた順序や用途を基に、速度、文言、図形を展示用に抽象化した。
- 各展示に「史実として確認」と「演出上の補完」を分けて表示し、「JavaScriptとCSSによる教育・研究目的の歴史的表現の再構成（非公式）」と明記した。
- 実際のスクリーンショット、壁紙、起動音、外部画像、企業ロゴや製品アイコンのトレース、外部APIは使用していない。CSS図形、文字、記号のみで再構成した。

### 設計・変更ファイル

- `app/data/vanishedOperatingSystems.ts`: 6 OS・18展示の年代、用途、動き、史実根拠、演出上の補完、再生時間を一元管理するデータ構造へ拡張した。
- `app/components/VanishedOsPlayer.tsx`: 18種類のLoading表現と共通の再生・停止・リプレイ処理を実装した。各展示は同時に1本だけタイマーを保持し、停止、展示室の閉鎖、タブ非表示、破棄時に解除する。
- `app/components/ExhibitRoomAccordion.tsx`: OSごとのまとまりを保ち、用途別の小見出し、史実と補完の説明、非公式の再構成表示を追加した。
- `app/globals.css`: 当時の画面比率、低解像度感、配色、表示順序を意識した18展示のスタイル、PC 3列・中幅2列・モバイル1列、横はみ出し防止を追加した。
- `tests/rendered-html.test.mjs`: 6 OS・18展示、分類、再生・停止、タイマー解除、reduced motion、ARIA、レスポンシブ、外部素材不使用の検証を追加した。
- `README.md`: 消えたOS展示室がLoading表現を比較する非公式の教育・研究目的の再構成であることを追記した。

### アクセシビリティと性能

- 各デモにOS名と表現名を含む再生・停止ボタン、`aria-live`の状態通知、再現画面の`role="img"`と説明を設定した。
- `prefers-reduced-motion: reduce`では途中アニメーションを省略して最終状態を表示し、実行中の設定変更でもタイマーを停止する。
- 初期状態が閉じている展示室ではタイマーを開始せず、開いた状態でも利用者が再生した展示だけを更新する。再実行時は既存タイマーを解除して進捗を初期化する。
- OSグループに`content-visibility`を適用し、増加した展示が初期描画へ与える負荷を抑えた。

### 確認結果

- `npm run typecheck`: 成功
- `npm run lint`: 成功
- `npm test`: 9件すべて成功。テスト内の静的ビルドも成功し、6 OS・18展示が生成HTMLへ含まれることを確認した。
- サンドボックス内の初回`npm test`はNext.jsの子プロセス生成時に`spawn EPERM`で中断した。同じコマンドを権限付きで再実行し、静的ビルドと9件すべてのテストが成功した。
- `/Loading-museum/`配下での簡易HTTPサーバーによるPC・モバイルのブラウザ確認は、実行環境がローカルサーバープロセスの作成を拒否したため未実施。権限制約を回避せず、静的HTML、CSS、アセット参照、3列・2列・1列のレスポンシブ規則を自動テストで確認した。

### 既知の制限と今後の候補

- 展示は歴史的特徴を比較する再構成であり、特定バージョンや機種の画面をピクセル単位で複製するものではない。特にファイル処理、データベース読込、通信待機の文言と速度は、用途を伝えるための演出を含む。
- 実機・エミュレーターを使った全バージョン比較、音の再現、当時の専用ハードウェアでの速度測定は行っていない。
- 今後は出典表示の専用UI、展示ごとの速度比較、OSバージョン別の差分、AmigaOS、OS/2、Symbian、BlackBerry OSなどを追加できる。

## 2026-07-31 — PR #12 最新main取り込み・カーソル可視性修正

### 原因と取り込み方法

- PR #12のブランチが「消えたOS展示室」追加前のmainを基準にしていたため、PR差分上で同展示室と関連する18点のLoading展示が欠落していた。
- カーソル体験領域では、fine pointer環境で実カーソルを常時`cursor: none`にする一方、仮想カーソルはPointer Eventsによる状態更新まで透明だった。この順序により、初回イベント前やJavaScript側で処理できない場合に両方のカーソルが見えなくなる可能性があった。
- `origin/main`をfetchし、履歴と既存PRを保つため`agent/cursor-exhibit-room`へmergeした。競合は`README.md`、`LOG.md`、`app/globals.css`で発生し、片方を採用せず、最新mainの消えたOS展示とPR #12のカーソル展示・説明・CSSを統合した。

### 復旧・修正内容

- `vanishedOperatingSystems`のimport、`VanishedOsExhibit`型、`RoomExhibit` union、`theme: "vanished"`、`roomId: "vanished-operating-systems"`、展示室名、6 OS・18 Loading展示を復旧した。
- 実カーソルを隠すCSSを`data-pointer-active="true"`の体験領域と子要素だけに限定した。初期状態、展示領域外、Pointer Eventsが使えない場合、仮想カーソル要素を参照できない場合は実カーソルを残す。
- Pointer Eventsの開始時は、仮想カーソルの座標と形状を同期的に設定してからactive属性を付けることで、実カーソルだけが先に消える瞬間と左上への一瞬の表示を避けた。
- 展示領域を離れたときとカーソル展示室を閉じたときにactive・ドラッグ状態・予約済みフレームを解除し、再度開いた場合も通常状態から開始する。
- ヘッダーの件数は展示データから算出し、4展示室・48展示（常設9、MS-DOS 8、Linux / UNIX 5、消えたOSのLoading 18、カーソル8）を表示するようにした。
- 静的HTML、展示データ、ARIA、reduced motion、レスポンシブに加え、消えたOS展示室の欠落、無条件の`cursor: none`、active属性に限定したカーソル非表示、タッチ時の通常操作とドラッグ領域だけの`touch-action: none`を検出する回帰テストへ更新した。

### 変更したファイル

- `README.md`
- `LOG.md`
- `app/components/CursorExhibitRoom.tsx`
- `app/components/ExhibitRoomAccordion.tsx`
- `app/components/VanishedOsPlayer.tsx`
- `app/data/exhibitRooms.ts`
- `app/data/vanishedOperatingSystems.ts`
- `app/globals.css`
- `app/page.tsx`
- `tests/rendered-html.test.mjs`

### 実行コマンドとテスト結果

- `git fetch origin main`: 成功。最新mainのコミット`60d15d9`を取得した。
- `git merge --no-edit origin/main`: 上記3ファイルの競合を統合して解決した。
- `npm install`: 成功。依存関係は既に最新で、追加インストールとlockfile変更はなかった。
- `npm run check`: ESLint、TypeScript型検査、静的ビルド、Nodeテスト12件がすべて成功した。
- `npm run build`: 成功した。
- `npm run dev`: 実行した時点で同じリポジトリのNext.js開発サーバーが既にポート3000で動作していたため、新規プロセスは二重起動防止で終了した。既存の同一ワークツリーのサーバーとHMRを使ってブラウザ確認を継続した。

### ブラウザでの目視確認

- Chromium系のMicrosoft Edgeで、4展示室のアコーディオン開閉、閉鎖時の`aria-expanded="false"`・`aria-hidden="true"`・`inert`、再開時の状態リセットを確認した。
- 「消えたOS展示室」に6 OSと18 Loading展示が表示され、Classic Mac OS、BeOS、NeXTSTEP、Palm OS、webOS、Windows Phoneが確認できた。
- カーソル領域の外では実カーソル、入った直後は座標設定済みの仮想矢印が表示された。標準矢印、リンク用の手、Iビーム、待機リング、禁止、ドラッグ、クリック波紋、5点の残像を順に操作し、領域外・展示室閉鎖で実カーソルへ戻ることを確認した。
- ドラッグ対象が展示領域内で移動し、クリック波紋が独立して生成・消去されること、ローディング展示室へのページ内リンクが動作することを確認した。
- ブラウザのエラー表示、コンソールエラー、React hydrationエラーはなく、`basePath`と`assetPrefix`を含むGitHub Pages設定は変更していない。

### モバイル表示・未確認事項・今後の課題

- 390×844相当でカーソル展示8点が1列になり、ページのclient widthとscroll widthが一致して横スクロールがないこと、静的な形状サンプルが表示されることを確認した。
- 実機タッチ端末とブラウザのcoarse pointerエミュレーションは今回の環境では未確認。タッチ時に仮想カーソルを非表示にし、通常領域を`touch-action: manipulation`、ドラッグ展示だけを`touch-action: none`にするメディア規則はソースと自動テストで確認した。
- OS設定を実際に切り替えたreduced motionの目視確認は未実施。対応するCSSメディア規則とカーソル残像の停止条件は自動テストで確認した。
- 今後は実機タッチ端末、実際のreduced motion設定、複数ブラウザでの回帰確認を追加できる。

## 2026-07-31 — PR #12 標準矢印カーソルの選択操作改善

### 原因と実装内容

- 標準矢印展示は仮想矢印が移動に追従するだけで、指し示せる対象、選択操作、選択結果のフィードバックがなかったため、操作が反応したと判断しにくかった。
- 一般化した画面要素として`FILE`、`WINDOW`、`FOLDER`の3対象をネイティブ`button`で追加した。初期状態は未選択で、別の対象を選ぶと単一の選択状態が切り替わる。
- ホバーとキーボードフォーカスでは枠・背景・文字色を変え、選択済みでは`aria-pressed="true"`、`SELECTED`、`SELECTED / 対象名`を表示する。色だけに依存せず、`aria-live="polite"`で選択結果も通知する。
- 選択状態は`ArrowSelectionDemo`内のReact stateに限定した。展示室の開閉で同コンポーネントのkeyを切り替えて再マウントし、閉じた時点と再開時を未選択へ戻す。他の7種類のカーソル展示と座標更新にはstateを追加していない。
- 標準矢印の操作説明を、移動、対象へのポインティング、クリックまたはキーボード選択まで案内する文言へ更新した。実装コメントにも仮想矢印の追従とローカルstateによる選択切替を記載した。

### ポインター・キーボード・タッチ対応

- 仮想矢印は既存の`requestAnimationFrame`方式を維持し、展示領域へ入った直後に表示、`pointermove`ごとに座標更新、選択ボタン上でも表示されることを確認した。
- 実カーソルを隠す処理は引き続き`data-pointer-active="true"`時だけに限定し、領域外と展示室閉鎖時にactive状態を解除する。
- 3対象はTabで移動でき、EnterとSpaceのどちらでも選択できる。`:focus-visible`の2pxアウトラインを表示する。
- 通常のカーソル展示領域を`touch-action: manipulation`へ変更し、ページスクロールを妨げないようにした。`touch-action: none`はドラッグ展示だけに限定した。
- 390×844相当では3対象を縦並びにし、タップ相当のクリックで選択状態が切り替わり、横スクロールが発生しないことを確認した。coarse pointer環境では既存どおり仮想カーソルを隠し、静的な形状サンプルを表示する。

### 変更したファイル

- `app/components/CursorExhibitRoom.tsx`
- `app/data/cursorExhibits.ts`
- `app/globals.css`
- `tests/rendered-html.test.mjs`
- `LOG.md`

### 実行コマンドとテスト結果

- `npm run lint`: 成功
- `npm run typecheck`: 成功
- `npm run check`: ESLint、TypeScript型検査、静的ビルド、Nodeテスト12件がすべて成功
- `npm run build`: 成功
- `npm run dev`: 同じワークツリーのNext.js開発サーバーがポート3000で稼働済みだったため、新規プロセスは二重起動防止で終了。既存サーバーとHMRで確認した。

### ブラウザ確認結果

- Chromium系Microsoft Edgeでカーソル展示室を開き、仮想矢印が最初の移動で表示され、2地点への`pointermove`で`translate3d`の座標が更新されることを確認した。
- 未選択対象のホバーで枠・背景・文字色が変わり、仮想矢印が対象上でも表示されることを確認した。
- FILEからWINDOWへのクリック選択切替、Tab移動後のEnterによるFOLDER選択、Shift+Tab後のSpaceによるWINDOW選択を確認した。
- 領域外では`data-pointer-active="false"`、実カーソル`auto`、仮想カーソル透明へ戻った。展示室を閉じると3対象が未選択になり、再度開いても`NO SELECTION`から開始した。
- 既存4展示室、ローディング展示9点、消えたOS展示室、カーソル展示8点を確認し、エラーオーバーレイ、コンソールエラー、React hydrationエラー、横スクロールはなかった。

### 未確認事項

- 実機スマートフォンでの物理的なタップ操作と、coarse pointerメディア特性を有効にした目視確認は未実施。ネイティブbutton、タッチ用CSS、390×844相当のクリック操作と自動テストで代替確認した。

## 2026-08-02 — DIGITAL MOTION ARCHIVE タイトル導入シーケンス

### 正式名称と演出の目的

- トップページ、メタデータ、フッター、READMEの正式名称を`DIGITAL MOTION ARCHIVE`へ変更した。
- 一般的な映像作品紹介ではなく、ローディング、カーソル、起動画面、UIアニメーションなど、デジタル上の「動き」を歴史的に収集・再現するアーカイブであることを入口で示すため、タイトル表示そのものを最初の展示として構成した。
- 既存のレトロコンピューター／CUI調の配色と等幅書体を維持し、展示カードや展示室の構造は変更していない。

### タイトル演出の実装内容

- `MuseumTitleSequence`を独立したクライアントコンポーネントとして追加した。段階は`loading`、`years`、`typing`、`complete`のstateで管理し、各段階につき1つのタイマーだけを予約する。
- ローディングは`LOADING...`と5区画の文字プログレスを650ms表示する。続いて`ARCHIVE_YEARS`配列の1960、1984、1995、2007、2026を160msごとに進め、過去から現在への時間軸を示す。
- 年代表示後は`DIGITAL MOTION ARCHIVE`を45msごとに1文字ずつ入力し、約2.5秒で全シーケンスを完了する。完成後は末尾のアンダースコア型カーソルだけを800ms周期で点滅させ、副題を静かに表示する。
- すべてのタイマーはeffectのcleanupで解除し、Replay時は`runId`を更新して古い実行からのstate更新を無効化する。matchMediaのchange listenerもアンマウント時に解除する。

### 初回再生、再訪、モーション軽減

- 同一セッションの初回表示時に`sessionStorage`へ`digital-motion-archive-title-seen-v1`を記録し、全シーケンスを再生する。同一セッション内の再読込時はhydration後に完成状態へ短縮する。
- `sessionStorage`の読み書きは`try/catch`で保護し、利用できない閲覧環境でも通常の全シーケンスとして動作する。
- タイトル付近へキーボード操作と`:focus-visible`に対応した`Replay`ボタンを追加した。軽減モーション設定時のReplayは動きを再開せず完成状態を維持する。
- `prefers-reduced-motion: reduce`ではCSSでローディング、年代、タイプ入力を表示せず、完成タイトルと副題を即時表示する。React側も設定を検出して完成stateへ移行し、設定変更のlistenerを解除可能にした。
- `h1`には常に完成済みの正式名称を保持し、視覚用の途中表示とカーソルは`aria-hidden="true"`の領域へ置いたため、途中の文字列を繰り返し読み上げない。

### レスポンシブと既存機能への影響

- タイトル領域と副題領域に最小高を確保した。PCでは2つの改行可能な語群、650px以下では`DIGITAL MOTION`と`ARCHIVE`の境界だけで2行にし、各語群は`white-space: nowrap`で保護する。
- 375px幅のブラウザ確認でclient widthとscroll widthがともに375px、タイトル幅が303pxとなり、横方向のはみ出しがないことを確認した。
- 既存のローディング展示9点、5展示室／102展示の表示を維持した。MS-DOS展示室を開閉し、展開時の8展示、`aria-expanded`、`aria-hidden`、`inert`が正しく切り替わることを確認した。

### 変更したファイル

- `app/components/MuseumTitleSequence.tsx`
- `app/globals.css`
- `app/page.tsx`
- `app/layout.tsx`
- `tests/rendered-html.test.mjs`
- `README.md`
- `LOG.md`

### 実行したテストと結果

- `npm run check`: 成功。ESLint、TypeScript型検査、Next.js静的ビルド、Node回帰テスト17件がすべて成功した。
- ブラウザでReplayを実行し、`loading` → `years`（1960から開始）→ `typing` → `complete`の順序と、約2.5秒での完了を確認した。
- 同一セッションで再読込し、全シーケンスを繰り返さず短時間で`complete`へ移行することを確認した。
- ReplayボタンはEnterキーで再生でき、操作後もフォーカスがボタンに残ることを確認した。
- デスクトップ幅と375×844相当でタイトル、副題、展示カードを確認し、エラーオーバーレイ、コンソール警告／エラー、React hydrationエラー、横スクロールがないことを確認した。

### 未実装事項・今後調整できる点

- ブラウザ検証環境には`prefers-reduced-motion`を強制変更する機能がなかったため、実際のOS設定を切り替えた目視確認は未実施。CSSメディア規則、matchMedia分岐、即時完成表示はソース回帰テストで確認した。
- 年代は`ARCHIVE_YEARS`配列、各時間はコンポーネント先頭の定数として管理しており、展示年表の拡張や速度の微調整を今後容易に行える。

## 2026-08-02 — PR #16 年代テーマ・signal-lock・状態遷移テスト追加

### 年代テーマの目的と対応

- 年だけでは選定理由が初見で伝わりにくかったため、アーカイブ端末が各時代の代表的な操作環境を走査する短い技術テーマを追加した。
- 対応は`1960 / MAINFRAME`、`1984 / GUI`、`1995 / WEB`、`2007 / TOUCH`、`2026 / GENERATIVE UI`。`ARCHIVE_ERAS`で年とテーマを一体管理する。
- 年を最も強く、テーマを年より小さくラベルより強く表示する。650px以下ではラベル／進捗と年／テーマの2行グリッドにし、320pxでも`GENERATIVE UI`を折り返さず表示する。
- 年代切り替えは1件190msとし、5件で950ms、全シーケンスは約3秒に収めた。

### タイトル確定演出

- 状態遷移へ`signal-lock`を追加し、内部を`brighten`と`noise`の2段階に分けた。タイプ入力の最後の文字が確定すると、完成タイトルを保ったまま信号固定演出へ入る。
- `brighten`は160ms。`filter: brightness()`と一時的な`text-shadow`だけを使い、拡大、揺れ、レイアウト変更を行わない。
- `noise`は200ms。タイトル領域内に高さ2pxの水平ノイズを一度だけ走査し、200ms後に通常の完成表示へ戻す。ノイズは`aria-hidden="true"`かつpointer event対象外である。
- 副題とReplayは`complete`到達後だけ表示し、signal-lock中は非表示のままにした。

### reduced motionとsessionStorage

- `prefers-reduced-motion: reduce`では既存どおり視覚用アニメーション領域を非表示にし、完成タイトル、副題、Replayを即時表示する。カーソル点滅、輝度、ノイズ、副題フェードはすべて停止する。
- 実行中にOS設定がreduceへ変わった場合は完成stateへ移行し、state変更によるeffect cleanupで進行中タイマーを解除する。Replayでも動きを再開しない。
- `sessionStorage`への既読書き込みを初期化effectから外し、`sequence.phase === "complete"`を監視するeffectへ移した。途中離脱は未読、正常完了またはreduced motionによる即時完了は既読となる。
- 書き込み値とkeyは変えず、Replayでも削除しない。複数回の完了やReact Strict Modeで同じ値を再設定しても結果が変わらない冪等な処理である。

### 状態遷移ロジックとテスト

- DOMとReactに依存しない年代データ、タイトル定数、時間定数、state型、初期／完了／reduced motion／Replay state生成、次状態、待機時間、runId検証を`app/components/museum-title-sequence-state.ts`へ分離した。
- `tests/museum-title-sequence-state.test.mjs`を追加し、loadingから年代、5年代の順序、typingの1文字増加、signal-lockの輝度／ノイズ、complete停止、Replay、古いrunId無視、年代データ、完了state、reduced motion、時間定数を13件の純粋関数テストで確認した。
- `tests/rendered-html.test.mjs`は5テーマ、signal-lockのclassとdata構造、装飾ノイズのARIA、完了時だけの既読記録、輝度／ノイズkeyframes、reduced motion規則を検査するよう更新した。
- `package.json`の`npm test`へ新しい単体テストを追加した。

### 変更したファイル

- `app/components/MuseumTitleSequence.tsx`
- `app/components/museum-title-sequence-state.ts`
- `app/globals.css`
- `tests/museum-title-sequence-state.test.mjs`
- `tests/rendered-html.test.mjs`
- `package.json`
- `LOG.md`

### 実行コマンドと結果

- `npm run lint`: 成功。
- `npm run typecheck`: 成功。
- `node --test tests/museum-title-sequence-state.test.mjs`: 単体テスト13件成功。
- `npm run check`: ESLint、TypeScript、Next.js静的ビルド、既存17件と追加13件の合計30テストがすべて成功。
- `npm run build`: `npm run check`内で成功。最終差分反映後にも独立して再実行する。

### ブラウザ確認結果

- Chromium系Microsoft Edgeで`loading → years → typing → signal-lock / brighten → signal-lock / noise → complete`を確認し、1960 / MAINFRAMEから2026 / GENERATIVE UIまで5件が指定順に表示された。
- 輝度用animation名、160msのstate、ノイズ用animation名、高さ2px、200msのstateを確認した。副題とReplayはnoise終了後のcompleteで表示された。
- 新しい同一セッションのタブでloading中に別ページへ離脱し、戻った際にloadingから全演出が再開することを確認した。完了後の再読込は約1.5秒以内に完成表示へ短縮された。
- 1440、768、390、375、320px相当ですべてclient widthとscroll widthが一致し、横スクロールがないことを確認した。320pxで`GENERATIVE UI`、年、ラベル、進捗が重ならず、ノイズの左右端と上下端がタイトルframe内に収まった。
- ReplayをEnterで実行してloadingへ戻り、フォーカスがReplayに残ることを確認した。MS-DOS展示室は8展示、`aria-expanded`、`aria-hidden`、`inert`が開閉に合わせて正しく切り替わった。
- エラーオーバーレイ、コンソール警告／エラー、Hydration Errorはなかった。

### 未確認事項・今後の調整

- ブラウザ検証環境に`prefers-reduced-motion`の強制変更機能がないため、実際のOS設定を切り替えた目視確認は未実施。React分岐、CSSの完成表示、全モーション停止は自動テストとソースレビューで確認した。
- 時間は`SEQUENCE_DELAYS`のloading 650ms、era 190ms、character 45ms、signalBrighten 160ms、signalNoise 200msで一括調整できる。

## 2026-08-02 — PR #16 蓄積型年代タイムラインと導入信号演出の最終調整

### 蓄積型年代タイムライン

- 年代表示を単独の数値切替から、走査済みの時代を残して現在位置を示す5ノードのタイムラインへ変更した。各ノードは`pending`、`current`、`complete`の3状態を持ち、`ARCHIVE_ERAS.map()`で生成する。
- 1960 / MAINFRAMEから2026 / GENERATIVE UIまで、完了済みノードと接続線を緑、走査中ノードをシアン、未走査ノードを低輝度で表示する。色だけでなく点の大きさと`data-state`も変わる。
- 最終年代の2026は通常年代230msより長い400ms保持とした。過去から現在へ到達したことと、`GENERATIVE UI`を読み取る時間を確保するためである。
- 年代走査後に200msの`ARCHIVE INDEX COMPLETE`を追加し、5ノードをすべてcompleteとして表示する。年代インデックスの確定とタイプ入力の開始を分ける短い区切りとして機能する。

### タイプ入力と信号固定

- 最後の文字を表示した直後に次の演出へ移らないよう、80msの`typing-hold`を追加した。完成タイトルを一度読める状態で保持してから信号固定へ入る。
- `signal-lock`を`brighten`（150ms）、`noise`（200ms）、`locked`（180ms）の3段階にした。輝度上昇、水平ノイズ、`SIGNAL LOCKED`の確定表示を順に一度だけ実行する。
- ノイズ帯は主線2pxと減衰する残像を合わせた高さ10pxとし、noise中だけタイトルを左右1〜2px揺らして信号調整感を加えた。transformのみを使い、タイトル領域の寸法は変えない。
- Replayの表記を端末コマンド風の`↻ RUN INTRO AGAIN`へ変更した。ネイティブbutton、キーボード操作、既存のfocus-visible表示は維持する。

### 最終シーケンスと時間定数

- 最終フローは`loading → years（1960 → 1984 → 1995 → 2007 → 2026）→ index-complete → typing → typing-hold → signal-lock / brighten → signal-lock / noise → signal-lock / locked → complete`。
- 時間は`SEQUENCE_DELAYS`でloading 650ms、通常年代230ms、最終年代400ms、index complete 200ms、1文字40ms、typing hold 80ms、brighten 150ms、noise 200ms、locked 180msとして一括管理する。
- 実ブラウザでReplay開始からcompleteまで約4.0秒だった。年代の意味を読み取れる余白を残しながら、展示前の待機が長くなりすぎない範囲に収めた。

### sessionStorage、モーション軽減、アクセシビリティ

- `sessionStorage`への既読記録は引き続き`complete`到達時だけ行う。途中離脱は未読のまま、完了後の同一セッション再訪は完成状態へ短縮する。読み書き失敗時の`try/catch`フォールバックも維持した。
- `prefers-reduced-motion: reduce`ではloading、年代、index complete、typing、typing hold、輝度、ノイズ、揺れ、locked表示を省略し、完成タイトルと副題を即時表示する。
- 視覚用タイムライン、途中の文字、ノイズ、カーソル、確定メッセージは`aria-hidden`領域内に置き、`h1`には常に完成済みの`DIGITAL MOTION ARCHIVE`を保持する。

### 状態遷移テスト

- `getCompletedEraCount()`と`getTimelineNodeState()`を追加し、年代ごとの蓄積状態をDOMに依存しない純粋関数としてテスト可能にした。
- `nextSequenceState()`と`getSequenceDelay()`でindex complete、typing hold、3段階signal-lockを含む全遷移を明示した。タイマーは各stateにつき1本で、effect cleanupとrunIdによる古い実行の無効化を維持する。
- 状態遷移テストを22件へ拡張し、5年代の順序、各timeline state、最終年代の長い待機、全文字入力、hold、brighten、noise、locked、complete停止、Replay、古いrunId無視、時間定数を確認する。

### 変更したファイル

- `app/components/MuseumTitleSequence.tsx`
- `app/components/museum-title-sequence-state.ts`
- `app/globals.css`
- `tests/museum-title-sequence-state.test.mjs`
- `tests/rendered-html.test.mjs`
- `LOG.md`

### 実行コマンドと結果

- `npm run lint`: 成功。
- `npm run typecheck`: 成功。
- `node --test tests/museum-title-sequence-state.test.mjs`: 22件成功。
- `npm run check`: ESLint、TypeScript、Next.js静的ビルド、状態遷移22件と既存回帰17件の合計39テストがすべて成功。
- `npm run build`: 成功。最終差分反映後に独立して実行し、静的ページ3件の生成まで完了した。

### ブラウザ確認結果

- Replayで全フローを計測し、loading約650ms、通常年代約230ms、最終年代約400ms、index complete約200ms、typing、typing hold、brighten、noise、locked、completeの指定順を確認した。
- 各年代で過去年代がcompleteとして残り、現在年代だけcurrent、将来年代がpendingになること、index completeで5件すべてcompleteになることを確認した。
- noise中に高さ10pxの主線と残像、タイトルのjitter animationが適用され、lockedで`SIGNAL LOCKED`が表示されることを確認した。
- 1440、768、390、375、320px相当でdocumentのclient widthとscroll widthが一致し、横スクロールがないことを確認した。小画面では`DIGITAL MOTION`と`ARCHIVE`の間だけで改行し、320pxでもタイムラインとsignal frameが予約済みタイトル領域内に収まった。
- `RUN INTRO AGAIN`はアクセシブル名を持つbuttonが1件だけ存在し、Enterキーでloadingへ戻ることを確認した。
- MS-DOS展示室は開いた状態で8展示、`aria-expanded="true"`、`aria-hidden="false"`、inertなし、閉じた状態で`aria-expanded="false"`、`aria-hidden="true"`、inertありへ正しく切り替わった。
- 開発環境のconsoleはReact DevTools案内とHMR接続だけで、warning／error、エラーダイアログ、Hydration Errorはなかった。

### 未確認事項・今後の調整

- ブラウザ検証環境に`prefers-reduced-motion`の強制変更機能がないため、実際のOS設定を切り替えた目視確認は未実施。React分岐、CSSの即時完成表示、全アニメーション停止は自動テストとソースレビューで確認した。
- ブラウザ検証環境は同一ブラウザセッションのstorageをタブ間で保持するため、未完了離脱だけを完全に独立した新規セッションとして再現する目視確認は未実施。既読書き込みがcomplete effect内だけにあることと、途中stateでは書き込まないことを回帰テストで確認した。
- 年代、ラベル、各段階の時間は`ARCHIVE_ERAS`と`SEQUENCE_DELAYS`、タイムラインの見た目はCSS変数と`data-state`規則で今後調整できる。

## 2026-08-02 — PR #16 データ駆動タイムラインと時間同期の最終調整

### 5件固定だった問題と動的化

- React側は`ARCHIVE_ERAS.map()`でノードを生成していた一方、CSS側の列数、左右余白、進捗線が5件専用だったため、年代を増減するとDOMとレイアウトが一致しない状態だった。
- `ArchiveTimeline`から`--museum-title-timeline-count`へ`ARCHIVE_ERAS.length`、`--museum-title-timeline-progress`へ純粋関数で求めた進捗率を渡す構成へ変更した。
- CSSの列数は`repeat(var(--museum-title-timeline-count), ...)`、接続線の左右余白は`calc(50% / var(--museum-title-timeline-count))`とし、常に先頭ノード中央から最終ノード中央までを結ぶ。
- 進捗線は接続線全体を描いたうえで、`clip-path`に進捗率を渡して表示範囲だけを伸ばす。5件固定の`data-completed`別width規則は削除した。

### 進捗率と安全処理

- `getTimelineProgressPercent(sequence, eraCount)`を追加した。進捗率は`(完了数 - 1) / (年代数 - 1) × 100`で、5年代では`0 / 25 / 50 / 75 / 100%`となる。
- index-complete以降は完了数が年代総数になるため100%。`getCompletedEraCount()`は0から年代総数の範囲へclampし、不正なeraIndexでも総数を超えない。
- 年代数が1以下の場合は除算せず0%を返す。CSS側の列数にも最低1の安全値を渡すため、ゼロ除算、`NaN`、無効な`repeat(0, ...)`を避ける。

### signal brightenの時間同期

- React状態の`SEQUENCE_DELAYS.signalBrighten`は150ms、CSS animationは160msで10msずれていた。CSSを150msへ変更し、Reactがnoiseへ進む前に主要animationが完了するよう統一した。
- index completeは状態／CSSとも200ms、signal noiseは状態／CSSとも200ms。signal lockedは180msの静的確定表示で、jitter 70msはnoise 200ms内で完了する補助animationとして維持した。

### 一時6年代での確認

- ローカル確認時だけ`2035 / QUANTUM UI`を6件目として追加し、1440pxと320pxで6列へ自動追従することを確認した。
- 進捗は`0 / 20 / 40 / 60 / 80 / 100%`、index-completeでは6ノードと接続線がすべて完了した。両幅で接続線の端は先頭／最終ノード中央と一致し、横スクロールは0だった。
- 確認直後にダミー年代を削除し、最終状態が既存5年代だけであることをブラウザとテストで再確認した。ダミー年代はコミット対象に含めない。

### 変更したファイル

- `app/components/MuseumTitleSequence.tsx`
- `app/components/museum-title-sequence-state.ts`
- `app/globals.css`
- `tests/museum-title-sequence-state.test.mjs`
- `tests/rendered-html.test.mjs`
- `LOG.md`

### テストの追加・変更

- 状態遷移テストへ、5年代の0／25／50／75／100%、index-completeの100%、1年代の有限な0%、完了数の上限制御、0年代の安全処理を追加した。
- HTML回帰テストへ、`ARCHIVE_ERAS.length`の利用、進捗純粋関数、CSSカスタムプロパティ、動的列数、動的左右余白、`clip-path`進捗、5件固定CSSの不在、brighten 150msを追加した。
- 既存の`pending / current / complete`判定、complete停止、正式タイトル、メッセージ、Replay、reduced motion回帰を維持した。

### 実行コマンドと結果

- `npm run lint`: 成功。
- `npm run typecheck`: 成功。CSSカスタムプロパティを渡す`CSSProperties`の型エラーなし。
- `node --test tests/museum-title-sequence-state.test.mjs`: 24件成功。
- `npm run check`: ESLint、TypeScript、Next.js静的ビルド、状態遷移24件と既存回帰17件の合計41件がすべて成功。
- `npm run build`: 独立実行でも成功し、静的ページ3件を生成した。

### ブラウザ確認結果

- 5年代で進捗が`0 / 25 / 50 / 75 / 100%`と段階的に伸び、index-completeで全ノードと接続線が完了することを確認した。
- 1440、768、390、375、320pxで接続線の左右端が先頭／最終ノード中央と一致し、現在ノードの強調、既存5年代、横スクロールなしを確認した。
- brightenのcomputed animation durationは`0.15s`で、約150ms後にnoiseへ移行した。noiseへの切替に中断やエラーはなかった。
- 6年代の一時確認後、5年代へ復元されたこと、MS-DOS展示室の8展示とARIA状態が正常であることを確認した。
- console warning／error、エラーダイアログ、Hydration Errorはなかった。

### 未確認事項

- 今回の変更はreduced motion分岐へ触れておらず回帰テストは成功しているが、ブラウザ検証環境ではOSの`prefers-reduced-motion`を強制変更できないため、実設定を切り替えた目視確認は再実施していない。
