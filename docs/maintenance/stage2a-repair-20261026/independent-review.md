# Stage 2A N2 / Q1 独立再レビュー

確認日: 2026-10-26 JST。修正基準HEAD `5bb0d052d4a6aea74c97794f5596eef900ad015f`。
実装・Q1診断・native実行とは別担当がsourceと証拠を確認する。製品/正式テストは本担当で変更していない。本書は04:15 UTC時点で独立レビューを確定した。以下の暫定節は各確認時点の判断履歴として保持する。提出commit/remoteの一致は統括担当の最終照合に委ねる。

## 最終結論（04:15 UTC）

**総合PARTIAL、マージ推奨NO。** N2は修正と限定native再検証で解消、Q1は対策候補を実装したが品質ゲート不安定性が残る。Stage2Bへは進めない。

|重要度/ID|結論|
|---|---|
|P0/P1|今回確認した範囲で新規指摘なし。範囲外の不存在保証ではない|
|P2 N2|解消。旧診断・正式回帰・native両engine3幅で確認|
|P2 Q1|未解決。独立53件試験1timeout、全check既定3回全失敗/worker1一成功一失敗|
|P3 B1/M1|旧原因未特定を維持。今回成功から遡及的修正済みとしない|
|P3追加回帰調査|Stage1のCh765 locator、WK390遅延入力/表示とBattle後半裸assert失敗は原因未特定。N2起因とは未確定|
|P3既存負債|375/390 CSS文字200%全page横超過。今回対象の限定成功と別管理|
|証拠P3|native判定器の2参照/negative control総合漏れは別strict checkerで対応済|

独立担当はsource/テスト/JSON/digest読解と53件の実コンポーネント試験を実施。native browser再実行や実CIを独立担当自身が行ったとは称さない。

## source判断

N2の追加effectはCoinかつreducedMotion ONに限定し、既存stopへ委譲する。observed.currentによる自動再生抑止を削除せず、得点state/collected ref/Resetの意味も変更しない。stopは所有する全Animationをcancel後に配列を空にするため、弧だけでなくscore演出にも適用される。通常CoinのanimateElement/runには得点を書き換える完了callbackがなく、加点は同期COLLECTだけである。観察側の世代保護/ready/RAF処理は無変更。Menuの独立layout effectにも変更なし。現時点で新しい製品P0–P2は確認していない。

旧独立診断4件の期待は不変。正式追加7件はrunning/pausedのReplay/COLLECT、2本の所有Animation取消、0/100点と獲得状態、低減解除時の非自動再生、明示低減操作、連続切替、Reset再獲得、画面外/再入場/unmountを確認する。WAAPI doubleによる検査でありnative保証ではない。

Q1では各旧assertを二責務へ対応付け、検索解除/複合filter解除/close取消を維持する。withinの限定とexpanded条件は利用者向けlabel/name/role/可視性の照合を捨てず候補走査を減らす。5000ms・他10試験・package登録は不変。単一mountで検索→解除→複合filterという旧連続性は二分割では保持されないため、nativeで旧全操作順を別途検証する必要がある。分割だけを根因解決とすることは認めない。

区間計測は旧screen queryに53–61%を要したこと、scope-onlyでもtimeoutしたことを支持する。環境変動の根因はUNKNOWN。製品性能問題が一切ない、逐次実行なら安全、という結論には至らない。全check既定3回/worker1 2回の結果待ち。

## 証拠ハーネスの指摘

- P3: native cancel_passはownedAfterの非空のみを要求していたため、score側の欠落を安全に拒否するため2本のID完全一致条件を推奨した。実測JSONの両参照照合とは別の判定器堅牢性の問題。
- P3: positive/negative control結果は当初condition.statusへ反映されないため、失敗なら総合不合格として扱う必要を報告した。
- media時点ですでに終端の試行はINPUT_MISSEDであり、途中取消PASSではない。実scroll後idleは自然終了前の取消証明と区別する。
- 合成click/media/visibilityはnative WAAPIを動かすが、物理touch/実OS背景化/実機Safariの証明ではない。

## 保留と限界

独立再実行・最終native読解・SHA照合・5回全check・最終HEAD照合は実行窓/結果待ち。現時点のマージ判定は保留（未完了のためYES不可）。B1/M1の旧失敗・根因不明を保持し、今回修正済みとしない。実CI、Safari実機、VoiceOver、実OS背景化/文字拡大、全197展示の網羅は未検証。

## 独立実行でQ1残存を確認（03:22 UTC）

本レビュー担当が他のnative/build実行終了後、旧診断4件・正式観察37件・gallery12件を一緒に通常Vitest設定で実行した。コマンドとUTC/壁時計は `review/independent-tests.json`、全文は同 `.log`。

**53件中52成功・1失敗・skip0、exit1、36.545秒。** 旧N2診断4と正式観察37は全成功。galleryは11/12成功で、新しい「初期DOMを遅延し、正規化検索・解除・開閉を扱う」が5000ms timeoutした。これは本担当自身が実行した結果で、実装担当の成功ログの読解ではない。3ファイルの通常並列実行であり、正式npm check全体とは区別する。

従って **P2 Q1は現時点で未解決、マージ推奨NO**。単独2×3成功は有用だが安定化の十分条件ではなかった。期待値/上限を弱めず、今回失敗も履歴に保持し、追加対策後は同じ独立コマンドと既定3/worker1 2の品質ゲートで確認が必要。N2のsource/WAAPI double解消をQ1成功へ混同しない。

## 全check既定3回の独立証拠読解（03:39 UTC）

`gates/results.json`と失敗位置を読解した（この3回を本担当が再実行した意味ではない）。対象製品SHAは `0292e0340f1e5e854777a9d342bfa83b60a26e42ff0b66b9fdf343098ca3f365`、gallery試験SHAは `8f453caf5b331b287f5241c4649896eb82bd5281cb1cc2b1b73f5e9ff719aa9c`。

|回|全179件成功/失敗|秒|timeout箇所|
|---|---:|---:|---|
|default-1|177/2|113.068|既存HP Reset、既存観察Menu統合|
|default-2|175/4|142.777|gallery初期/複合、既存HP Reset/連打|
|default-3|178/1|197.090|既存gallery追加14ゲーム|

Node49は各回全成功、Vitest130は128/126/129成功。失敗はいずれも5000ms wall-time上限であり、得点/HP/選択の期待値不一致を確認したという意味ではない。一方、timeoutは有効な品質ゲート失敗で、環境変動を推測して除外してはならない。galleryだけでなく別の既存試験にも及ぶため、一箇所の分割だけでゲート安定化したとは判断できない。

worker1途中のtransport切断と、既に確定した3回の失敗は別事象。worker1の最終集計未確認・未開始の回を成功/製品失敗と推測しない。native修正後もこの時点では未実行。**Q1未解決P2、総合PARTIAL/マージNOを維持する。**

## native修正前・判定器の補強

`baseline-v3.json`全6条件は各38check/Replay・COLLECT2経路に到達、pageerror0。media時点で12経路すべてrunning（Chromium0–66.75ms、WebKit29–428ms）、その後finished、所有2本のcancel記録0でN2を同条件再現した。実行scriptSHA `bca60def0a00aa8f9975db5e20f9abd8ea29610848eec39a281426aa4547ee52`は現物と一致。これはnative担当の証拠読解であり本担当の実ブラウザ再実行ではない。

`assess-native.py`の追加厳密判定を独立静的レビューした。2所有ID一意性・記録集合完全一致・両cancel前後・終端到達前の取消・全6条件/38check/control総合を確認。正対照1/負対照11は全成功。scoreの終了境界860msはソースのduration240+delay620から計算し、native endTimeを採ったものではないと明示。先の判定器P3指摘はこの別postprocessingで対処され、旧実測JSONの改変は不要。修正後証拠は引き続き未確認。

## worker1完了証拠の追記（03:50 UTC）

復帰後の `gates/recovery-worker1/results.json` とraw logを独立読解した。worker1-1は179/179成功、worker1-2は175/179成功（229.486秒）、skip0。2回目の失敗は既存観察easing、pending pause、Menu統合、Coin統合の5000ms timeout。新N2七件は既定3回/worker1 2回の全5回で成功している。中断した旧worker1 UNKNOWNは保持し、復帰後2回とは別履歴である。

この結果は「worker1で成功した回もある」が「worker1で安定」を意味しないことを再確認する。正式worker制限の変更を採用しない判断は妥当。Q1のゲート対策は未成立、原因未確定のまま。**現時点の総合PARTIAL・マージNO、Stage2B未移行を維持する。**

## 修正後native証拠・版の独立照合（03:55 UTC）

`native/repaired.json`と `repaired-assessment.json`を独立読解し、JSON中の3ソースSHAと全HTML/JS/CSS buildファイルSHAを現物から再計算して全一致を確認した。scriptSHAもbaseline-v3と同じ `bca60def0a00aa8f9975db5e20f9abd8ea29610848eec39a281426aa4547ee52`。製品SHAは `0292e0340f1e5e854777a9d342bfa83b60a26e42ff0b66b9fdf343098ca3f365`。観察component/CSSは旧版から不変。公開版/実CIの証明ではない。

Chromium/WebKit ×375/390/765pxの全6条件で、各Replay/COLLECT計12経路はmedia入力時running、**coinとscoreの両cancel直前もrunning、直後idle/currentTime null**。Chromium取消入力0–33.410ms、WebKit0–350msで自然終端前取消を確認。baseline同条件12失敗→修正後12成功。native pause診断6/6成功、行動assert38×6=228全成功、pageerror0。正/負対照12も全成功。native取得は別担当、本担当はsource/JSON/ハッシュの独立照合である。

これにより **N2は確認したnative経路とWAAPI double範囲で解消** と判定する。観察後自動再生抑止、得点0/100、獲得済みguard、低減OFFだけでは非再生、Reset再獲得、旧Q1連続filter旅程も同native証拠の限定範囲で成功。端末実機や全館の保証へ拡張しない。Q1品質ゲートの未解決P2は別問題であり、N2解消で総合PASSには変更しない。


## 既存主要回帰と追加失敗の最終読解

- `observation.json`: Chromium/WebKit ×375/390/765の6条件すべて8群、計48群PASS。対象Menu/Coin時間操作・状態分離・media/keyboard/offscreen等の範囲に限る。
- `major.log`: 6条件すべて9群、計54群成功。Match-3/Falling/HP/Inventory/Lock-on等の経路が対象。全page文字200%横超過で狭幅4条件PARTIAL、765px2条件PASS。categoryの空ループを拒否するcontrolを含む。
- Stage1初回は4PASS/2FAIL。Ch765はPerfect Parry初回early後locator待ちtimeout、WK390はDodge500ms狙いが実入力1083msとなり、直前ACTIVE WINDOW/結果LATE HIT。成功窓入力に未到達でPASSにできず、同taskの表示差の観測も単に消してはいけない。今回Coin effect由来という根拠はない。
- 限定再試験Ch765は5群PASSだが旧timeout根因は不明。WK390は全12時刻試験とBattle画面外FIELD/INTERRUPTEDまで成功後、Battle Reset/低減の後続裸assertで失敗。元scriptはexact assertionを記録せず、どの操作が失敗したか捏造できない。Battle全体PASSではない。
- WK390 Dodge追加3観測505/502/503msでは次RAFで成功表示。1083ms遅延の原因を説明したことにも、旧観測を修正したことにもならない。

`regression-served-digests.json`/`supplement-served-digests.json`のHTTP配信12ファイル一致を読解。最終製品source/buildのローカル再計算一致と合わせ検証版を識別するが、公開URL操作確認ではない。圧縮manifest4件は本担当でgzip解凍し、圧縮SHA/解凍SHA/解凍byte数を独立再計算してすべて一致した。失敗履歴も無損失で保持されている。

マージ受入条件はQ1の再現性あるゲート確立と同一期待値での再検証、追加回帰の保証境界/必要対応を人間が判断できる記録である。実CIなし、実Safari/VoiceOver/実OS背景化/文字拡大なし、全197展示の網羅なし。新機能展開や公開をこのレビューで許可しない。
