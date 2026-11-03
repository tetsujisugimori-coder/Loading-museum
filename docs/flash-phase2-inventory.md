# Flash Then & Now 第2期：登録・既存作品監査

2026-11-03 JST。基準main d71411a0a635ec1f69d9fa16b717b3880e02054a。本書は実装前のソース監査であり、実ブラウザの操作成功や独立レビューを主張しない。第2期の制作判断と最終試験は別の提出記録で確認する。

## 登録の実集計

app/page.tsx の合計式を各data exportから評価した。常設9、歴史室内31、カーソル8、Apple初期13、Macintosh18、Flash60、DOM17、WAAPI47、現代6、インタラクティブ第2期12、実用12、Phase4A6、Phase4B6、Phase5A6、計251。展示室はexhibitRooms.length(3)+10で13。Flashカテゴリは18。ThenとNowの面は展示数に加算されず、一組一登録。今回の追加6組が全て登録されれば257/66/13となるが、最終状態は再評価する。

既存Flash全60件のJSON配列SHA-256：

6da8142a020d691ee92fa67317cd65aa1b2cfc6383816882aa4ed15557d99d84

新規IDを除外し、基準の60ID順で同じフィールド全体を比較すると、名称だけでなく説明・分類・操作契約の保全を検査できる。既存54件とカテゴリのdigestはtests/then-now-registration.test.tsの既存検査も保持。全館の未変更data/component差分をgitで照合し、件数一致だけを保全の証明としない。

## 既存描画と重複判断

FlashVisuals.tsxのdedicated分岐、FlashRefinedVisuals.tsxのrefined分岐、GenericVisualとglobals.css、ThenNowCard/FirstStudies/SecondStudiesを確認した。全60登録の一覧を下段に残す。次の差別化を制作条件とする。

| 新作品 | 現物の近接作品・実挙動 | 第2期で必要な違いと検証点 |
|---|---|---|
| Mask Theatre | circle-maskはvariant切替でcircle(0→75%)のclip-path、venetian-blindsは帯の自動往復、spotlightはpointer座標で光窓。Clip Menuは開閉クリップと途中反転 | 独自の二風景をマスクが交差させる舞台。円/帯/文字の形と位置・大きさ・途中時間を操作し、Then/Nowの構図自体が異なる。背景の色交換だけでは不足 |
| Elastic Navigation | radial-menuは開閉フラグと項目tabIndexのみ。Menu Selection Cursorは3行選択・220msカーソル。Elastic Buttonは押下/解放のscale・減衰。Magnetic Targetはpointer近傍への有限吸着 | メニュー全体の展開/収納、項目選択の内容変化、移動途中の方向転換、調整できる反発。単体ボタンのバウンドや選択カーソルの改色では不足 |
| Parallax Stage | layered-scrollはpointer座標をCSS変数に書き4層の移動率を変える。Starfield Warpは奥行きで割った星の投影、Infinite Tunnelは反復輪郭 | 前中後景に役割を持つ独自世界。視点と奥行きを別調整し、各層の動きを読める。単なる既存4層の別背景にしない |
| Frame-by-Frame Lab | frame-by-frameは固定8姿勢の再生/選択。onion-skinは同じ固定姿勢の前後透過。timelineは12番号の再生ヘッド。Kinetic Typographyは6文字の配置・字間・時間 | 利用者がフレームを追加し絵を変更できる制作体験。編集した内容が選択/再生/Resetへ整合して反映される。固定姿勢選択だけでは不足 |
| Isometric Explorer | room-navigationは3部屋を左右で巡回、portfolioは3スライド。mini-shooterはクリック得点。既存に調査・発見履歴を持つ等角箱庭は確認されない | 小さな世界の移動と物の調査で状態が蓄積し、隠れた反応を発見。Thenクリック探索/Now移動探索など違いを説明。装飾の等角絵だけでは不足 |
| Preloader Theatre | percent-loaderの実描画はCSS回転リングで受信量状態なし。Introは開始/Skip/本編、tn-introは有限シーンと選択分岐。Upload Queueは業務的な模擬処理 | 決定的な模擬受信量・速度・停止再開と、完成後に遊べる本編への連続演出。100%装飾表示で終えず、未完了/完了/転換の境界を試す |

Thenを低品質な旧版にせず、別のリズム・形・操作構成として制作する。個別の歴史作品の再現を名乗らず、独自の図形・風景を用いる。重複回避のための改名・代替作品への差替えは現時点で不要。

## 統合構造と受入の注意

既存FlashSpecialExhibitRoomはカテゴリ単位でmountし、ThenNowMountがgeometry/IntersectionObserverとページ可視性を使用する。ThenNowCardは二つのStudyProps(now/active/reduced/speed)を持つ面、共通開始停止、keyによるResetを提供。useFrameはactive失効でRAF取消し、復帰時の長いcatch-upを制限する。新作はこの寿命管理を利用できるが、solo表示で隠れた面を自動再生しないこと、局所再生と共通停止の優先関係、文字・入力の無効状態と見た目を検証する。Phase1を共有改修する場合は既存ブラウザ試験を再実行する。

硬コード件数の更新対象：tests/rendered-html.test.mjsの全館251、Flashタイトル/メタ表示/登録行数60。tests/then-now-registration.test.tsの60件/6組を、Phase1の6件保全と全12組を区別して更新する。scripts/verify-then-now-browser.mjsの既存6組の実行範囲を黙って12組に置換せず、新作専用検査と既存回帰を別集計する。READMEの各期の歴史的件数は削除せず、現在値を新節へ示す。

実機Safari/VoiceOver/実OS背景化は別途実施しない限りNOT_TESTED。#29保守、#44依存セキュリティ、#54 WK765/Q1/B1/M1 UNKNOWNなどは新作成功によって解決にしない。新たな依存・lock変更はこの監査に不要。

## 基準60件の登録一覧

| ID | 作品 | 描画分岐 | 操作契約 |
|---|---|---|---|
| motion-tween | モーショントゥイーン | motion | 再生・停止、速度を切り替える |
| shape-tween | シェイプトゥイーン | shape | ステージまたは変形ボタンを押す |
| frame-by-frame | フレーム・バイ・フレーム | frames | 一時停止して、前後ボタンまたは8個のフレームを選ぶ |
| typewriter | タイプライター | type | 文字列の入力を観察する |
| logo-assembly | ロゴの分解・集合 | logo | 「集合」「分解」ボタンで文字単位の動きを切り替える |
| glow-wave-type | 波打つ発光文字 | glow-text | 文字へカーソルを合わせる |
| vector-morph | 円から多角形への変形 | morph | 変形の往復を観察する |
| liquid-rubber | 液体とゴムの伸縮 | liquid | 図形をポイントして押しつぶす |
| tile-break | タイル分割と再構成 | tiles | クリックしてタイルを分解する |
| circle-mask | 円形マスク転換 | mask | ステージをクリックして転換する |
| venetian-blinds | ブラインド・ワイプ | blinds | 帯の時間差を観察する |
| spotlight | スポットライト | spotlight | ステージ内でカーソルを動かす |
| rollover-button | 光沢ロールオーバーボタン | button | ポイントしてクリックする |
| radial-menu | 放射メニュー | radial-menu | 中央のOPENを押す |
| percent-loader | パーセント・ローダー | loader | 進捗を再生・停止する |
| cursor-follow | 慣性カーソル追従 | follow | ステージ内でカーソルを動かす |
| watching-eyes | 視線追従 | eyes | 目の周囲でカーソルを動かす |
| paint-trail | 絵筆カーソル | paint | ドラッグして描き、リセットする |
| mascot-idle | マスコットの待機・瞬き | character | 待機ループを観察する |
| part-animation | パーツアニメーション | parts | 歩行パーツの位相差を見る |
| edge-peek | 画面端から覗く案内役 | peek | ステージへカーソルを合わせる |
| gravity-bounce | 重力と反発 | bounce | 跳ね方を観察する |
| spring-drag | ゴム紐とバネ | spring | 球をドラッグして放す |
| rain-fire | 雨・雪・炎 | weather | 天候を切り替えるボタンで、雨・雪・炎を順に選ぶ |
| spark-particles | 光粒子の噴出 | particles | クリック位置から粒子を出す |
| logo-burst | ロゴの粒子化と再集合 | burst | ロゴをクリックして分解する |
| magic-constellation | 魔法陣と星の軌跡 | constellation | 停止して静止構造も確認する |
| layered-scroll | 多層パララックス | parallax | 左右へカーソルを動かす |
| starfield | 星屑ワープ | starfield | 速度を切り替える |
| horizon-grid | 地平線グリッド | grid | グリッドのループを見る |
| rotating-cube | 回転する立方体 | cube | 左右へドラッグして回転する |
| photo-carousel | 3Dカルーセル | carousel | 前へ・次へでカードを回す |
| wireframe-tunnel | ワイヤーフレーム・トンネル | wireframe | 停止して層構造を見る |
| spectrum | 音楽ビジュアライザー | audio-bars | 音を開始し、停止またはミュートする |
| audio-wave | 波形モニター | waveform | 音を開始して時間波形を見る |
| beat-flash | ビート同期フラッシュ | beat | 音を開始し、低速・中速・高速のBPMを選ぶ |
| fullscreen-intro | スキップ可能なフルスクリーンイントロ | intro | START、SKIP、ENTERを操作する |
| moving-portfolio | 画面全体が動くポートフォリオ | portfolio | 番号を選んで画面を移動する |
| room-navigation | 部屋を移動するナビゲーション | room | 左右のドアを選ぶ |
| flashing-cta | 点滅CTAと価格の飛び込み | banner | 完成までの順番を見て、最後にCTAを押す |
| banner-slot | バナー内スロット | slot | SPINを押す |
| safe-escape-close | 逃げる閉じるボタン（安全版） | safe-close | ×へ近づくか、固定の即時終了を押す |
| sprite-run | スプライト走行 | sprite | 走行フレームを見て、低速・標準・高速を切り替える |
| mini-shooter | クリック・シューター | shooter | ターゲットをクリックする |
| combo-score | コンボとダメージ数字 | score | HITを連打する。間を空けるとコンボがリセットされる |
| generative-lines | ジェネラティブ線画 | generative | 再生成でseedを変え、点の数を調整する |
| kaleidoscope | 万華鏡 | kaleidoscope | カーソルで色と角度を変える |
| interactive-poem | インタラクティブ詩 | poem | 言葉をクリック、Enter、Spaceで選び、文章の変化を見る |
| keyframe-timeline | キーフレーム・タイムライン | timeline | フレームを選ぶか再生する |
| onion-skin | オニオンスキン | onion | 現在フレームと表示範囲（前／前後／次）を選ぶ |
| fps-compare | 12 / 24 / 30 / 60fps比較 | fps | 4種類を同時に見比べ、比較を一時停止する |
| tween-modern-map | 同じ動き：タイムラインからCSSへ | comparison-motion | 左右の同じ動きと、7つの比較軸を見る |
| mouse-modern-map | 同じ入力：マウス追従からPointer Eventsへ | comparison-pointer | 比較ステージ内でポインターを動かす |
| audio-modern-map | 統合環境から標準APIの組み合わせへ | comparison-media | 左右の構成と、Flash・現代Webそれぞれの強みを見る |
| tn-vector-morph | Vector Morph — 対応点の工房 | then-now | 開始・停止、形、時間位置、対応点を操作 |
| tn-cursor-creature | Cursor Creature — 紙鳥の間合い | then-now | 開始後にポインター・矢印・左右ボタンで誘い、タップで合図 |
| tn-kinetic-type | Kinetic Typography — 文字の振付 | then-now | 速度・構成・時間位置・字間・言葉を操作 |
| tn-physics | Physics Playground — 反発の庭 | then-now | 球をドラッグ/矢印で移動、解放、重力・反発・摩擦を調整 |
| tn-intro | Interactive Intro — 観測室への道 | then-now | Introを始め、線/点へ分岐、Skipまたは本編へ進みReplay |
| tn-sound | Sound Reactor — 周波数の建築 | then-now | 共通開始後に音を開始、音高/音量を調整、ミュート/停止 |
