# 第0段階 現状調査と改修準備

調査日: 2026-10-24 JST。ソース・既存検査・公開Edgeでの調査は23時台、文書の集計確定は23:38 JST。既存check内のVitest開始は23:30:30 JST。

結論: **第1段階は条件付き着手可能**。DOM17とDOM11の原因と対象は限定でき、既存検査は成功した。独立レビュー後、現行mainと並行PR #28の状況を再確認し、DOM17のスクロール領域と完了判定を実ブラウザで検証する小さなPRから進める。本PRは文書のみであり、第1段階の修正、テスト追加、依存・設定変更は実施していない。

## 1. 証拠の区分と対象HEAD

- **事実・静的確認**: 指定HEADのファイル、Git/GitHub API、既存検査の実行結果。
- **事実・今回再現**: 公開版をWindowsの接続済みEdge（Chromium系）で実操作した結果。ブラウザ版番号と固定viewportは採取していないため、規定Desktop Chromium試験の代用とはしない。
- **先行レビューの記録**: 八兵衛によるDOCX/CSVの内容。今回の実操作と区別する。
- **推測**: ソースから予測する未再現の競合・回帰。
- **提案**: 後続段階の仕様・実装・受入基準。実装済みを意味しない。

| 参照 | SHA / 状態 |
| --- | --- |
| 調査したmain | `6249c90149fbe1b8c91fdebc6ce862d24587a813` |
| fetch後のorigin/main | `6249c90149fbe1b8c91fdebc6ce862d24587a813` |
| リモート直接照合 `git ls-remote origin refs/heads/main` | 同上 |
| レビュー時のmain | 同上。差分0、レビュー対象からの変更による調査影響なし |
| 開始時HEAD | `ccefffcbbf09006cafe3145e43dd249beb19e98d`、`feature/waapi-sample-gallery` |
| 調査ブランチ | `docs/phase0-baseline-20261024`、`origin/main`起点 |

開始時の`git status --short`は空で、既存未コミット変更はなかった。開始ブランチをmainと誤認せず切り替えた。既存ブランチの変更・stash・破棄はしていない。Gitの参照更新はサンドボックス外実行で完了。mainに直接pushしない。

参照元: [調査コミット](https://github.com/tetsujisugimori-coder/Loading-museum/commit/6249c90149fbe1b8c91fdebc6ce862d24587a813)。以下のソース参照はすべてこのSHAに対するもの。

### ローカルレビュー資料

以下をDownloadsで発見し、DOCXの`word/document.xml`本文とCSV全150行を読み取った。資料そのものはリポジトリへ複製しない。DOCXの埋め込み証拠画像・レイアウトは今回再検証していない。

- `C:/Users/tetsu/Downloads/loading-museum-independent-review-20261024.docx`
- `C:/Users/tetsu/Downloads/loading-museum-150-exhibits-20261024.csv`

CSVは部分確認137、未検証13、主要操作実施「はい」117、「いいえ」33。全条件の合格を証明するCSVではない。レビュー文書の「全条件確認済み0」と整合する。CSVの不具合欄が埋まるのはLM-047、LM-051、LM-057の3行。フォーカス問題等はDOCX側に記録されている。

## 2. リポジトリと公開環境

| パス | 役割・状態 |
| --- | --- |
| `app/page.tsx` | 単一ページ、常設9件、室の配置、全館件数計算、固定フッター |
| `app/layout.tsx`, `app/globals.css` | 共通レイアウト、CSSアニメーション、レスポンシブ指定 |
| `app/data/` | Apple、Macintosh、カーソル、Flash、DOS/UNIX、消えたOSの定義 |
| `app/components/` | 室、個別デモ、再生hook、音・Canvas・SVG・DOM操作 |
| `tests/` | Node静的HTML/ソース・状態テスト3ファイル、Vitest React操作1ファイル |
| `.github/workflows/deploy-pages.yml` | main push / 手動実行でPages公開 |
| `docs/screenshots/` | 過去の画面確認画像とREADME。今回の検査結果ではない |
| `README.md` | 開発とPagesの説明。133展示、室数説明、音・停止説明が現状と不整合 |
| `LOG.md` | 長い実装履歴。過去の24/22件等を含み、現状の台帳ではない。冒頭は2026-08-08、DOM追加を含む最新mainの経緯を単純に日付順として読めない |

言語はTypeScript/TSX、CSS、検査のJavaScript MJS。Next.js 16.2.6 App Router、React/React DOM 19.2.6、TypeScript 5.9.3。npmと`package-lock.json`を使用し、Node要件は22.13以上。今回の実行環境はNode v24.20.0、npm 11.17.0。既存`node_modules`を利用し、install/ci/updateは実行していない（クリーンインストールの証明ではない）。

`next.config.ts`は`output: "export"`、`trailingSlash: true`。productionの`basePath`/`assetPrefix`は`/Loading-museum`、静的成果物は`out/`。サーバーAPIやDBを必要とする構成ではない。

GitHub Pages APIは`build_type: workflow`、source main `/`、HTTPS有効と応答した。ActionsはUbuntu、Node 22、`npm ci`→`npm run build`→`out`をupload→deploy-pages。contents read / pages write / id-token write、concurrency pages、cancel-in-progress false。**PR用CI、lint、型検査単独、テスト実行のworkflowはない**（build内部の型検査とは区別）。

最新Pages実行[31878058217](https://github.com/tetsujisugimori-coder/Loading-museum/actions/runs/31878058217)は上記SHA、push、success、更新2026-08-15 09:52:25 UTC（18:52:25 JST）。公開版は8 ROOMS / 150 OBJECTSを表示し、DOM室へ到達できた。成果物とローカルbuildのバイト同一性・全配信アセットの同一性は未検証。

## 3. 150展示の定義と照合

| 区分 | ソースの集計単位 | 件数 | 主な描画 |
| --- | --- | ---: | --- |
| 常設 | `page.tsx`の`ExhibitHeader` / 手書きarticle | 9 | CSS中心、個別の停止/resetボタンなし |
| Apple I / Apple II | `appleEarlyExhibits.ts`配列 | 13 | `AppleEarlyEraExhibitRoom`がvisualTypeにより各デモへ振り分け |
| Macintosh | `macintoshBirthExhibits.ts`配列 | 18 | `MacintoshBirthExhibitRoom`と内部`ExhibitDemo` |
| DOM | `DomAnimationRoom.tsx`の`domOperations` | 17 | 共通`DomOperationCard`と命令的`run` |
| DOS | `exhibitRooms.ts`のkind dos | 8 | `ExhibitRoomAccordion`内の文字表示 |
| Linux / UNIX | 同kind terminal | 5 | `TerminalDemoPlayer` |
| 消えたOS | `vanishedOperatingSystems.ts`のloadingExhibits | 18 | 6 OS各3表現、`VanishedOsPlayer` |
| カーソル | `cursorExhibits.ts`配列 | 8 | `CursorExhibitRoom` / `CursorExhibitCard` |
| Flash | `flashExhibits.ts`配列 | 54 | 18カテゴリ各3件、`FlashSpecialExhibitRoom`とVisual群 |
| 合計 | 表現数 | **150** | 常設以外8室 |

実データ配列をTypeScript transpile後に読み取り、常設とDOMは定義を抽出して独立集計した。9+13+18+17+8+5+18+8+54=150。全150行のCSV展示室・展示名がソースと完全一致し、一意な対応が得られた。採用したソースキー（常設のみOBJECT番号）の重複は0。CSVの`レビューID`は`LM-001`等のレビュー専用番号で、アプリ内IDではない。付録に対応を固定する。

`page.tsx`の計算は常設9 + exhibitRoomsをreduce（消えたOSだけ子のloadingExhibits.length、それ以外1）+ Apple/Mac/カーソルのlength + Flash length + DOMの固定17。室数は`exhibitRooms.length + 5 = 8`。DOM件数と常設件数は定数で、定義配列と自動連動していない。

名称とIDは各データのtitle/name、id/exhibitId/demoIdとして明示的に管理。DOM IDは`operation-NN-*`という明示値、画面番号はindex+1。常設はOBJECT 01〜09の表示番号で、展示ごとのDOM idではない。React keyとDOMアンカーの付与は別であり、すべてのソースIDへ現在アンカー移動できるとは限らない。消えたOSの入口6 EXHIBITSはOS親件数で、全館の18表現と単位が異なる。Flashの18はカテゴリ数。展示番号・OS数を150に足し直さない。

CSVの操作状況はソースから証明できない。付録の「はい/いいえ」は八兵衛の記録を転記し、今回の再実行を意味しない。今回全150件の全操作は実行していない。CSVにFlashのcategoryId等の内部分類列はないため、室区分の一致を内部カテゴリー全項目の照合済みとは呼ばない。

順序の注意: 消えたOSのPalmは生配列がHotSync→データベース→ビーム、CSVはデータベース→HotSync→ビーム。`ExhibitRoomAccordion`は`VANISHED_LOADING_CATEGORIES`（アプリ・ファイルが同期・通信より先）で描画し直すため、この違いは現行描画順と整合する。その他の区分は配列/常設定義順とCSV順が一致した。資料に合わせて配列を並び替えない。

## 4. 再生・終了・音声の構造

| 対象 | 静的に確認した制御 | 制限・調査上の注意 |
| --- | --- | --- |
| 常設 | CSSループ、全体CSSのreduced-motion規則 | 全館停止ボタン・JSの可視性契約なし。CSS規則の存在は全表現の適合証明ではない |
| DOM | cleanupRefを再生前/reset/unmountで実行 | 閉室でunmountしない。activeをカードへ渡さない。可視性は新規runのreducedMotion値に混ぜるだけ |
| DOS | intervalのeffect cleanup、室openとdocument可視性でruntimeActiveを計算 | 動作テストではなくソース/静的テストの確認 |
| UNIX | useTerminalSequenceのtimeout cleanup、runRevisionで再実行 | 閉室/非表示で進行停止後、active復帰で継続する設計。独立Pauseとは異なる |
| 消えたOS | phase/step/runRevision、timeout cleanup、run/stop | runは先頭から、stopはstopped。activeによる一時停止と利用者停止は別 |
| Apple | useAppleSequenceのidle/running/paused/complete、play/pause/reset、速度/loop、timeout cleanup | activeは室openと可視性。室閉鎖でstateを消す設計ではない。各専用デモにも独立状態あり |
| Macintosh | open/visible/reducedをデモに渡す。専用の起動、Finder、Paint、音 | 巨大な単一TSX内で実装差がある。個々の遅延処理まで一律安全とは未判定 |
| カーソル | 閉室でRAF cancelとドラッグ解除、unmountでRAF/リップルtimeout解除 | DOM room同様の全館契約ではない。非表示タブでの全動作は未検証 |
| Flash | globalPlaying/localPlaying/resetKey、カテゴリ、IntersectionObserver、pageVisible、reduced | resetでVisual再mount、カードactiveは各条件の積。音と非同期完了を全54件確認したわけではない |

フォーカスは汎用Accordion、Apple、Mac、カーソル、FlashにtoggleRef経由の復帰処理がある。DOM室にはref/focus呼出しがない。属性`aria-hidden`/`inert`は実行中JSを停止しない。

音: Apple cassetteは`soundEnabled = true`、利用者play時に独自合成音を開始。`useCassetteTone`はOscillator停止・disconnect、unmountでAudioContext close。Macintoshの独自短音はボタンでAudioContextを作りendedでclose。FlashはAudioContext/Analyser、scheduler・voice・RAFを各Visualで管理する。初期設定ONと無操作自動再生は別概念であり、今回自動発音の不具合は報告しない。実聴、出力レベル、停止後残響は未検証。

## 5. P1/P2の原因と再現

対象ソース: [DomAnimationRoom.tsx](https://github.com/tetsujisugimori-coder/Loading-museum/blob/6249c90149fbe1b8c91fdebc6ce862d24587a813/app/components/DomAnimationRoom.tsx)、[globals.css](https://github.com/tetsujisugimori-coder/Loading-museum/blob/6249c90149fbe1b8c91fdebc6ce862d24587a813/app/globals.css)。以下のコード修正は本段階では行わない。

### P1 DOM17 LM-057

**事実・静的**: 447〜480行付近。rail生成→18行生成・append（14行目TARGET）→rail.querySelector→scrollIntoView→getBoundingClientRect→readout作成→初めてstage.append(rail, readout)→成功logの順。TARGETの存在だけで成功扱いし、isConnected、寸法、中央との距離、スクロール完了は判定しない。smoothでも測定は直後で、接続順の修復だけでは完了後の座標になる保証がない。

スクロール領域は`.domScrollRail`、grid、gap 5px、max-height 120px、overflow-y auto、padding 7px。行はmin-height 22px、grid-auto-rows minmax(0,auto)。18行が確実に縦方向へ十分あふれるかも実寸で検査する必要がある。

**事実・今回再現**: 公開DOM室を開く→17再生。画面readoutは`x:0 y:0 w:0 h:0`、結果は「scrollIntoView で対象を中央表示し、矩形情報を取得しました。」。接続後に読み取り専用で測るとrail top 269.653 / bottom 389.641 / height 119.988、TARGET top 356.458 / bottom 378.449 / width 36.620 / height 21.991、scrollTop 0。中央差は約37.81 CSS px。**今回TARGETはレール内に見えるが中央ではない**。「TARGETが常に不可視」とは断定しない。座標は画面条件依存。操作ツールはクリック時にタイムアウトを返したが、その後の画面・DOMで実行済みを確認した。

**原因判断**: 接続前のスクロール・測定と無条件成功表示は確定的なソース上の欠陥で、今回の0表示と整合する。gridの行サイズ・overflowも調整が必要かは後続の固定viewport試験で判定する。

**提案・第一希望**: 先に専用stageへ接続し、レールの実overflowを確認してから対象へ移動。完了後の矩形に基づき状態を表示する。中央はページ全体ではなくレールのclient領域で定義する。TARGETの中央と`railRect.top + rail.clientTop + rail.clientHeight/2`との差を測り、原則2 CSS px以内、TARGET全体がclient領域内、幅高さ>0を受入条件とする。スクロール量の上限で中央にできない場合は「端まで移動」と区別し成功文言を偽らない。TARGETは14/18なので、この基準を満たすレイアウトを先に確認する。

smoothは固定sleepで完了扱いせず、scrollendと終了条件付きの位置安定監視等を検討し、timeoutは失敗/中断として扱う。reset/再実行/閉室後の古い完了通知を無効にする。reduced motionは即時移動でも同じ幾何条件を確認する。x/yはviewport座標であり0が合法な場合もあるため、x/yが必ず正という判定にはしない。

**次善策**: まずautoで接続後の移動と実測を確実にし、smoothは別PRに分離。動きの教材性が弱まるが競合とブラウザ差を縮小できる。**暫定妥協**: 調整中の表示で偽成功を止める案はあるが、移動を直さないため恒久受入条件を満たさない。

影響はDOM17・共通カードのキャンセル境界・必要なら専用CSS。回帰リスクはページ全体のスクロール、CSS行高さ、smooth完了競合。ほか16展示のDOMを触らない。

### P2 DOM11 LM-051

**事実**: querySelectorAllはscene内の`.domCandidate`6件を取得し、forEachの0始まりindexから`P${index+1}`を表示。一方`index % 2 === 0`をis-markedにする。公開版でもP1/P3/P5のclass強調と「偶数番号」結果文言を再現。サンプルコードは全対象にclassを付ける例で、実装の条件を示していない。

**提案・第一希望**: 表示番号の偶奇に揃えP2/P4/P6を選び、説明・コード例も同期させる。**次善策**: 奇数を選ぶ教材意図を採るなら説明とコードを奇数へ統一。既存説明の期待を保てる第一希望を優先。影響はDOM11のみ。強調の件数3だけを見る検査では逆転を検出できないため、選択集合の完全一致を検査する。

### P2 DOM7 LM-047

**事実**: runでinterval開始、通常450msごと最大6回、reduced motionは0msで1回。cleanup関数を返しclearIntervalする。再生・resetは既存cleanupを呼んでからstageを空にし、unmount effectもcleanupを呼ぶ。しかし閉室はDOMを保持したままisOpen=falseで隠すだけ。

**事実・今回再現**: 7再生→下部「展示室を閉じる」。閉室直後1回、後の読取では閉室のまま「6回で停止しました」。無限リークではなく有限ループが閉室中も進む問題。入口へfocusは戻らずBODYとなった。

**提案**: 室activeのfalse化で必ずキャンセルし、閉室後再開は明示操作からとする案を優先。stepを保持して自動再開する次善策は利用者Pauseとの区別が必要。reset/閉室の意味を先に文書化し、共通カードへ最小限伝える。全室の共通hook化は行わない。回帰は閉室→再入室時の状態と再実行の重複。

### P2 DOM室のフォーカスと全館の文言

下部閉室後BODYを今回再現。入口閉室（入口自体へ既にfocus）の結果と混同しない。DOM入口にrefを持ち、下部閉室後はその入口へfocusし、Tabで自然に次へ続ける案。開閉アニメーションとinertの時機に注意する。

READMEの133と公開150、初期ミュートとApple初期ONの矛盾、全館停止を保証する説明の過大さは静的確認済み。固定`ALL EXHIBITS RUNNING`は閉室中にも表示される事実がある。全館の実状態を集計しているコードはない。状態表示に見えるかは教材・文言上の判断であり、全館タイマー障害という断定にはしない。

## 6. 未確定事項

| 項目 | 根拠・今回の境界 | 次の確認 |
| --- | --- | --- |
| DOM10 reset後RAF | requestAnimationFrameのIDを保存せずcleanupを返さない。古いnoteとsetResultを閉包する。競合は今回未再現 | RAFがまだpendingの時にreset/再実行/閉室し、古いDOM/log更新がないことを検証 |
| DOM8閉室継続 | 300ms intervalのcleanupはあるがDOM7と同じカード構造。実操作は未再現 | 閉室・reset・連打、reduced motion変更時を確認 |
| 非表示タブ | DOMは可視性をreducedMotion引数に混ぜるだけで既存runを取り消さない。実ブラウザ非表示では未検証 | 本当にタブを切替え、hiddenを確認してから復帰時の差分・多重起動を観測 |
| 全館の途中reset/連打 | 一部状態ユニットテストはあるが全展示の網羅なし | 実イベントと制御時刻でrun→run、run→reset、reset→runを検査 |
| 音残り | 音を停止するソースはある。聴音と出力測定なし | mute/pause/reset/close/hidden各遷移でノードと実聴を検査 |
| reduced motion | CSSとmatchMedia対応はある。動作の全面検証なし | 初期reduce・実行中変更・解除時の意図しない再開を確認 |

上記は未再現・未検証であり、再現済みP1/P2の件数へ足さない。史料の全URL到達性、年代・来歴の全件一次資料照合も本段階では未実施。レビューが挙げた史料確認済み範囲を今回の確認として転記しない。

## 7. 既存検査と不足

実行: main起点ブランチ、既存依存、`npm run check`。成功（exit 0）。lint (`eslint .`)、typecheck (`tsc --noEmit`)、build/static export、Node **48件**、Vitest/jsdom **2件**。check内のnpm testがbuildを含む。アプリ/テスト/lockfileの差分なし。生成物`.next`/`out`等は追跡対象外。既存テストを変更・追加していない。

`rendered-html.test.mjs`はexport済みHTML・CSS・ソース文字列の照合が中心。DOM17のAPI名、17件、run/resetの存在は確認するが、レイアウト測定・スクロール・cleanupの動作は確認しない。`museum-title-sequence-state.test.mjs`と`macintosh-interaction-state.test.mjs`は状態遷移/矩形ロジック、`macintosh-system-choice.test.tsx`はjsdom上のクリックとキーボード操作。**全50件成功と今回の不具合再現は両立する**。

| 条件 | 既存の裏付け | 今回の実行 / 新規に必要な検証 |
| --- | --- | --- |
| Desktop Chromium | 専用ブラウザ自動テストなし | 公開EdgeでDOM17/11/7と閉室focusを限定確認。固定環境でE2E追加が必要 |
| WebKit | なし | 未実行。DOM幾何・smooth・focusのE2Eが必要 |
| 375px / 390px | CSSメディア規則の静的検査、過去画像/LOG | 今回は両幅未実行。横超過・操作可視性を実測するテストが必要 |
| 文字拡大200% | なし | 未実行。ブラウザズームと文字のみ拡大を区別し倍率確認を記録 |
| キーボード | Mac System 1/5/6のuser-event、ARIA構造文字列 | 既存2テスト成功。全Tab順・閉室後Tab・全展示Enter/Spaceは不足 |
| prefers-reduced-motion | CSS/hook文字列・タイトル状態など | 実OS/ブラウザ設定の動作は今回未実行。DOMの即時移動含むE2E必要 |
| 再生中reset | 一部の状態ロジック・reset構文 | DOMの競合と全室は不足。fake timer/RAF + 実ブラウザ |
| 連続操作 | Mac System切替のユニット/React操作 | 他展示/DOM連打は不足。動作テスト追加が必要 |
| 閉室後timer | 汎用室cleanupのソース検査 | DOM7継続を再現。DOM7/8 cancelの動作回帰が必要 |
| フォーカス復帰 | 汎用室focus呼出しのソース検査 | DOM下部閉室のBODYを再現。activeElementと次TabのE2E必要 |
| 非表示タブ | visibilitychange/activeのソース検査 | 実タブ非表示未実行。合成イベントだけで十分とはしない |
| 音声停止 | 一部ソース/文字列のみ | 実聴未実行。音ノードの停止と実出力の確認が必要 |
| a11y | ARIA/button、Mac操作の限定検査 | axe等の自動監査、スクリーンリーダー、全Tab順は未実施 |

実機iPhone Safari、VoiceOverは未実行。WebKit自動化の成功でも実機やVoiceOver合格と扱わない。今回依存整備やPlaywright等の追加はしていない。新規テスト基盤は後続の専用PRで導入する。

## 8. 段階別改修計画

全段階の共通制約: この150展示のID・名称・件数・順序を保持する。表示番号やカテゴリの再編で保全を曖昧にしない。巨大な共通化、一括置換、関係ない依存更新をしない。各PRはmain追従、差分限定、既存check、影響する室の回帰、独立レビューを経る。

### 第1段階 正確性

- 対象: `app/components/DomAnimationRoom.tsx`、必要な`.domScrollRail`系だけ`app/globals.css`、将来のDOM動作テストとブラウザ設定。
- 範囲: DOM17の接続・測定・中央判定、DOM11の表示番号/選択/コード例一致。変更しない: 他15展示の内容、全館UI、データ、依存の一括更新。
- リスク: smooth完了競合、全ページscroll、grid圧縮、jsdomの矩形0を実ブラウザと誤認。
- 自動テスト: DOM11の選択集合、DOM17の接続順の動作、Chromium/WebKitで中央距離・寸法・実測表示・repeat/reset、reduce。ブラウザ基盤導入が必要なら小さな別PR。
- 受入: 150を維持。P2/P4/P6と説明/例一致。TARGETが中央2px以内・可視・非ゼロ寸法、表示が完了時の測定と丸め誤差内一致。中断を成功扱いしない。
- PR分割: 1a DOM11 + 意味のある選択テスト、1b 最小ブラウザ検証基盤、1c DOM17 + 幾何回帰。非同期完了キャンセルに必要な最小境界は1cへ含め、第2段階へ丸投げしない。
- 第一希望/次善策/妥協理由: 第5節のDOM17/11に記載。固定delayで成功表示する妥協は採用しない。

### 第2段階 DOMのライフサイクル

- 対象: `DomAnimationRoom.tsx`とDOMの新規検査。範囲: active、cleanup、RAF/interval、run世代、reset、下部閉室focus。変更しない: 他室、展示追加・改名、17件の順序。
- 第一希望: カードにactiveを渡し、cancelと世代チェックをカード内の小さな境界へ集約。run前/reset/非active/unmountを同じ終了口にする。再生中の再生は古いrunを終了して最初から。
- 次善策: 閉室でカードをunmount。cleanupは使えるが状態/コード開閉を失い、DOM10の未返却RAF問題は別途解決が必要。妥協理由は実装量削減で、状態保持要件が弱い場合だけ検討。
- リスク: reset後の古いlog、Strict Mode重複、再入室の自動再開、focus時機。
- 自動テスト: DOM7/8のfake timer、DOM10のpending RAF後reset、DOM16イベント解除、run連打、unmount、hidden、復帰、キーボードfocus。
- 受入: 閉室/reset後は3秒以上経過・全pending処理消化後も古いDOM/logが変化しない。再実行で同時runは1つ。下部閉室後activeElementは入口、次Tabが隠れた室へ入らない。
- PR分割: 2a timer/active、2b RAF・世代と途中reset、2c focusとキーボード。DOM17の完了監視も回帰対象。

### 第3段階 全館の操作契約

- 対象: `page.tsx`、`globals.css`、各室/再生hook/音のVisual、`README.md`、`LOG.md`、契約文書。
- 第一希望: 先に室別契約表を確定し、既存実装へ小さなadapterを加える。提案する基準はplay=明示開始、pause=現在位置保持・音停止、reset=初期状態・旧非同期破棄、closed/hidden=進行/音を停止、復帰=利用者pauseを解除しない。自動再開の可否は室ごとに明示して受入を固定する。
- 次善策: 室ごとの違いを保持し説明を正確化。回帰を抑える妥協だが、停止できない連続動作の利用者救済まで文言だけで完了としない。音は初期ミュートを優先案、初期ON継続なら開始操作まで鳴らない条件をUI/READMEで一致させる。
- 範囲: 常設の停止手段から順に室別移行、固定状態文言と133を修正、可視性/音/動き軽減を整える。変更しない: 展示内容、史実、名称、全館一括hook化。
- リスク: 再開時の勝手な発音、短音の切断、画面外とタブ非表示の混同、音コンテキストの資源漏れ。
- 自動テスト: 各室1つ以上の代表＋固有音声すべて、play/pause/reset/closed/hidden/return、IntersectionObserver、reduce切替。音停止はノードと実聴を併用。
- 受入: 契約表の全遷移が説明と一致、停止中の進行/発音なし、初期設定とREADME一致、全館150と8室の表記一致。
- PR分割: 3a 契約文書・README、3b 常設、3c DOS/UNIX/消えたOS、3d Apple、3e Mac/カーソル、3f Flash、3g 音声横断検証。必要なら音声を室ごとにさらに分割。

### 第4段階 索引と学習経路

- 対象: `page.tsx`、`app/data/*`、索引の新規部品、各室のアンカー、README、史料案内。
- 第一希望: 既存定義を参照する薄い150件の索引を用意し、安定した室+展示IDで検索→開室→対象focus/scroll→索引へ戻る導線を作る。三ルート「待ちを知る」「歴史を体験する」「実装を学ぶ」は既存展示への参照として構成する。
- 次善策: 静的索引とアンカーから先行。検索を後続に分けることでライフサイクルや読み込み負荷の回帰を小さくする。ID/名称を手で二重管理する案は避ける。
- 範囲: 全名称検索、OS数/表現数の明示、史料URL/該当ページ、Flash導入の参照先整合。変更しない: 展示の追加・削除・改名・並び替え、史料の根拠のない断定。
- リスク: 閉室内の不可視アンカー、検索で大量デモをmount、室内操作中state喪失、リンク切れ。
- 自動テスト: 付録150件とのID/名称一致、検索・解除、空結果、閉室内への到達・戻りfocus、mobile、リンク形式と到達性（外部障害を分離）。
- 受入: 全150件を名称から発見し到達、8室/6 OS/18表現を正しく説明、検索のみでデモを開始しない、史料ベース/再構成を維持。
- PR分割: 4a 台帳/アンカー、4b 索引・検索、4c 学習ルート、4d 主要史料リンク。

### 第5段階 総合検証と独立レビュー

- 対象: `tests/`、将来のブラウザテスト設定、`.github/workflows/`、`docs/maintenance/`、必要な不具合修正だけ個別PR。
- 第一希望: PR用lint/typecheck/build/unit + Chromium/WebKit E2E、150件の台帳照合と操作契約のテスト。実機iPhone Safari/VoiceOverは人による別記録。次善策は手動試験表を先行して自動化を分割。CI費用・不安定さを抑えるため毎PRの重点回帰と全館試験を分ける。
- 変更しない: 未検証を合格へ変えるための基準緩和、テストに合わせた展示削除、関係ない仕様変更。
- リスク: タイマー待ちの不安定さ、模擬音声やWebKitを実機保証と誤記、画像比較だけで偽成功を見逃す。
- 自動テスト: 第7節の不足を埋め、375/390/desktop、reduce、keyboard、reset/連打/closed/hidden/audio、全件名称と到達。200%は実倍率を確認して記録する。
- 受入: P1未解決0、再現済みP2の対象契約違反0、150件維持、各条件の実行環境・時刻・結果・未実行理由を明記。独立レビューの指摘を再現/未再現に分類して対応判断を受ける。
- PR分割: 5a CI、5b 全館回帰と画面幅、5c a11y/実機記録、5d 独立レビュー記録と残件整理。レビュー前の自動マージはしない。

## 9. Issueと並行作業

全Issue（open/closed、上限100）を取得し開始時12件、すべてopen: #1 立上げ、#3 DOS、#5 UNIX、#8 表現強化、#9 消えたOS、#11 カーソル、#13 Flash、#15 タイトル、#17 Apple、#19 Mac、#23 DOM作成、#27 大量サンプル追加。全館150展示の保守を段階追跡する親Issueは見当たらなかったため、[親Issue #29](https://github.com/tetsujisugimori-coder/Loading-museum/issues/29)「既存150展示の段階的保守・品質改善を追跡する」を1件作成した。個別Issueの大量作成や既存Issueのcloseはしていない。

未マージPRは[#28](https://github.com/tetsujisugimori-coder/Loading-museum/pull/28)、head `feature/waapi-sample-gallery` / `ccefffcbbf09006cafe3145e43dd249beb19e98d`、main向け、open、非draft。WAAPI系の追加作業であり今回の150件baselineへ含めない。合流した場合は台帳件数・対象HEAD・page/README/testsの競合を再評価する。今回の文書PRは独立してmainへ向け、#28を上書き・マージしない。

| 後続候補 | 既存Issueで対応できる範囲 | 推奨整理 |
| --- | --- | --- |
| 第1段階 DOM17/11 | #23はDOM室の作成・安全性を含むが現行17展示と元の仕様に差がある | #23を関連付け、再現結果・新受入条件を持つ修復Issueを1件起票する候補 |
| 第2段階 DOM lifecycle/focus | #23のcleanup/reset要求と重なる | #23に現行差分を追記して使うか、1件の修復Issueへ集約。元の追加仕様を再実装しない |
| 第3段階 全館停止/音/可視性 | #3/#5/#9/#11/#13/#17/#19の個室要求で部分対応可能 | 全館契約Issueを新規1件候補とし、室別PRを紐付ける |
| 第4段階 索引/検索/ルート/史料 | #27は新規サンプルギャラリー内の検索で、既存150全館検索とは別 | 全館索引Issueを新規1件候補。#27と検索範囲を混同しない |
| 第5段階 CI/総合検証/独立レビュー | 各Issueの受入はあるが横断追跡なし | 検証Issueを新規1件候補、親Issueで未検証を管理 |

## 10. 第1段階への引継ぎ

1. 独立レビューを待ち、本調査の事実・受入基準を確認する。第0段階から無断で実装へ進めない。
2. 着手直前にfetch、作業ツリー、main SHA、#28を再確認。mainが変われば差分を読んで台帳・再現を更新。
3. DOM11はP2/P4/P6の表示番号基準を第一希望とする。コード例も同期。
4. DOM17は接続→実layout→scroll→完了測定の順、レール中央を契約とする。実overflowとgrid行配置を固定viewportで確認し、auto先行かsmooth対応かをPRに明記。
5. geometryはjsdomで保証せずChromium/WebKitを使う。新しいテスト基盤は必要最小の専用PRにし、現行checkを維持する。
6. 変更差分と150件のID/名称/順序の維持を検査し、実行した環境だけを合格としてPRへ記す。

着手の技術的阻害要因はない。条件は独立レビューと着手時baseline再確認、ブラウザ動作検査の準備である。本段階の完了は文書commit/push/main向けPR作成、未マージのレビュー待ちまで。

## 付録 CSVとソースIDの対応

列「主要操作」は先行CSVの値である。全150行の名称・室区分一致を確認した対応表で、今回の全件動作合格表ではない。常設のOBJECT番号はソースIDの代替識別子。生配列順と描画順の違いは第3節に記載した。

| レビューID | 区分 | ソース識別子 | 名称 | 主要操作 |
| --- | --- | --- | --- | --- |
| LM-001 | 常設ローディング | OBJECT 01 | CUIの回転文字 | いいえ |
| LM-002 | 常設ローディング | OBJECT 02 | 点が増える表示 | いいえ |
| LM-003 | 常設ローディング | OBJECT 03 | Windows風の砂時計 | いいえ |
| LM-004 | 常設ローディング | OBJECT 04 | 初期WebのGIF風スピナー | いいえ |
| LM-005 | 常設ローディング | OBJECT 05 | Apple風の点が巡るスピナー | いいえ |
| LM-006 | 常設ローディング | OBJECT 06 | Windows Vista風の青い光 | いいえ |
| LM-007 | 常設ローディング | OBJECT 07 | CSSの円弧スピナー | いいえ |
| LM-008 | 常設ローディング | OBJECT 08 | プログレスバー | いいえ |
| LM-009 | 常設ローディング | OBJECT 09 | スケルトンスクリーン | いいえ |
| LM-010 | Apple I / Apple II | apple-one-setup | 接続すると機能が増えるApple I | はい |
| LM-011 | Apple I / Apple II | apple-one-monitor | メモリアドレスを入力する Apple I Monitor | はい |
| LM-012 | Apple I / Apple II | apple-one-cassette | カセット信号を探す Apple Cassette Interface | はい |
| LM-013 | Apple I / Apple II | apple-text-scroll | 文字出力を送り続けるスクロール | はい |
| LM-014 | Apple I / Apple II | apple-two-power-on | 電源投入から入力可能になるまで | はい |
| LM-015 | Apple I / Apple II | apple-two-basic | BASICを書き、LISTで確認し、RUNする | はい |
| LM-016 | Apple I / Apple II | apple-two-cassette-storage | カセットへ保存し、読み戻す | はい |
| LM-017 | Apple I / Apple II | apple-two-low-resolution | 色ブロックで見るローレゾ描画 | はい |
| LM-018 | Apple I / Apple II | apple-two-high-resolution | ハイレゾで描くグラフ・図形・ゲーム画面 | はい |
| LM-019 | Apple I / Apple II | disk-two-boot | ディスクを挿入してApple IIを起動する | はい |
| LM-020 | Apple I / Apple II | disk-two-access-patterns | Disk IIの待ち方を比べる | はい |
| LM-021 | Apple I / Apple II | early-game-loading | 創作ゲームで見るディスクロード | はい |
| LM-022 | Apple I / Apple II | early-errors-retry | 4種類のエラーと回復方法を比較する | はい |
| LM-023 | Macintosh | macintosh-boot | Macintosh起動体験 | はい |
| LM-024 | Macintosh | finder | Finderで直接操作する | はい |
| LM-025 | Macintosh | window-controls | ウィンドウ操作 | はい |
| LM-026 | Macintosh | mouse-pointer | マウスとポインタ | はい |
| LM-027 | Macintosh | scroll-bar | スクロールバー | はい |
| LM-028 | Macintosh | desk-accessories | デスクアクセサリ | はい |
| LM-029 | Macintosh | macpaint | MacPaint | はい |
| LM-030 | Macintosh | macwrite | MacWrite | はい |
| LM-031 | Macintosh | mac-fonts | Macintoshフォント | はい |
| LM-032 | Macintosh | susan-kare | Susan Kareとアイコンデザイン | はい |
| LM-033 | Macintosh | system-1-6 | System 1〜System 6 | はい |
| LM-034 | Macintosh | multifinder | MultiFinder | はい |
| LM-035 | Macintosh | system-7 | System 7 | はい |
| LM-036 | Macintosh | balloon-help | Balloon Help | はい |
| LM-037 | Macintosh | models | Macintosh機種の変遷 | はい |
| LM-038 | Macintosh | macintosh-ii-color | Macintosh IIとカラー化 | はい |
| LM-039 | Macintosh | mac-sound | Macintoshサウンド | はい |
| LM-040 | Macintosh | apple-ii-to-mac | Apple IIからMacintoshへ | はい |
| LM-041 | DOM | operation-01-create-append | 1. 要素を作って末尾へ追加 | はい |
| LM-042 | DOM | operation-02-prepend | 2. 要素を先頭へ差し込む | はい |
| LM-043 | DOM | operation-03-insert-before | 3. 任意位置へ差し込む | はい |
| LM-044 | DOM | operation-04-set-attribute | 4. 属性を付与して識別 | はい |
| LM-045 | DOM | operation-05-remove-attribute | 5. 一時属性を取り除く | はい |
| LM-046 | DOM | operation-06-class-list-add-remove | 6. classList で状態を切り替える | はい |
| LM-047 | DOM | operation-07-class-toggle-loop | 7. classList.toggle のループ | はい |
| LM-048 | DOM | operation-08-style-set-property | 8. style.setProperty で見た目を変更 | はい |
| LM-049 | DOM | operation-09-dataset-state | 9. dataset で状態を保持 | はい |
| LM-050 | DOM | operation-10-text-content | 10. textContent で表示文字列を更新 | はい |
| LM-051 | DOM | operation-11-query-selector-all | 11. querySelectorAll でまとめて操作 | はい |
| LM-052 | DOM | operation-12-closest | 12. closest で祖先をたどる | はい |
| LM-053 | DOM | operation-13-contains | 13. contains で包含関係を確認 | はい |
| LM-054 | DOM | operation-14-clone-node | 14. cloneNode で複製 | はい |
| LM-055 | DOM | operation-15-replace-children | 15. replaceChildren でまとめて入れ替え | はい |
| LM-056 | DOM | operation-16-event-listener | 16. addEventListener / removeEventListener | はい |
| LM-057 | DOM | operation-17-scroll-and-rect | 17. scrollIntoView と座標取得 | はい |
| LM-058 | MS-DOS | rotating-spinner | 回転スピナー | いいえ |
| LM-059 | MS-DOS | growing-dots | ドット増加 | いいえ |
| LM-060 | MS-DOS | blinking-wait | 点滅する待機表示 | いいえ |
| LM-061 | MS-DOS | text-progress | 文字プログレスバー | いいえ |
| LM-062 | MS-DOS | file-copy | ファイルコピー表示 | いいえ |
| LM-063 | MS-DOS | archive-extract | 圧縮ファイル展開表示 | いいえ |
| LM-064 | MS-DOS | compile-build | コンパイル進行表示 | いいえ |
| LM-065 | MS-DOS | disk-check | ディスク確認風表示 | いいえ |
| LM-066 | Linux / UNIX | unix-login | UNIX風ログイン | はい |
| LM-067 | Linux / UNIX | linux-kernel-boot | Linuxカーネル起動ログ | はい |
| LM-068 | Linux / UNIX | sysvinit-startup | SysVinit風の起動表示 | はい |
| LM-069 | Linux / UNIX | apt-progress | Debian系APT風の進捗表示 | はい |
| LM-070 | Linux / UNIX | configure-make-build | configure・make風コンパイル | はい |
| LM-071 | 消えたOS | classic-extension-parade | 起動シンボルと拡張機能列 | はい |
| LM-072 | 消えたOS | classic-watch-cursor | 腕時計カーソル | はい |
| LM-073 | 消えたOS | classic-disk-load | ディスク／アプリケーション読込 | はい |
| LM-074 | 消えたOS | beos-boot-icons | 段階点灯する起動アイコン列 | はい |
| LM-075 | 消えたOS | beos-tracker-launch | Tracker起動待機 | はい |
| LM-076 | 消えたOS | beos-file-access | ファイル処理とディスクアクセス | はい |
| LM-077 | 消えたOS | nextstep-boot-messages | システム起動メッセージ | はい |
| LM-078 | 消えたOS | nextstep-disk-services | ディスクとサービスの読込 | はい |
| LM-079 | 消えたOS | nextstep-app-launch | Workspace Managerのアプリ読込 | はい |
| LM-080 | 消えたOS | palm-database-load | データベース／アプリ読込 | はい |
| LM-081 | 消えたOS | palm-hotsync | HotSyncの進行表示 | はい |
| LM-082 | 消えたOS | palm-beam-transfer | ビーム送信の通信待機 | はい |
| LM-083 | 消えたOS | webos-pulse-boot | パルス型の起動待機 | はい |
| LM-084 | 消えたOS | webos-card-launch | カード型アプリの読込 | はい |
| LM-085 | 消えたOS | webos-update-install | App Catalogの更新・インストール | はい |
| LM-086 | 消えたOS | windows-phone-dots | 移動する点の起動待機 | はい |
| LM-087 | 消えたOS | windows-phone-resuming | アプリの「再開中」 | はい |
| LM-088 | 消えたOS | windows-phone-store-update | Storeの取得・更新進捗 | はい |
| LM-089 | カーソル | standard-arrow | 標準矢印カーソル | はい |
| LM-090 | カーソル | link-hand | リンク用の手カーソル | はい |
| LM-091 | カーソル | text-ibeam | Iビームカーソル | はい |
| LM-092 | カーソル | waiting-pointer | 待機カーソル | いいえ |
| LM-093 | カーソル | forbidden-pointer | 禁止カーソル | いいえ |
| LM-094 | カーソル | drag-pointer | ドラッグ中カーソル | はい |
| LM-095 | カーソル | click-effect | クリックエフェクト | いいえ |
| LM-096 | カーソル | cursor-trail | カーソルの残像 | いいえ |
| LM-097 | Flash | motion-tween | モーショントゥイーン | はい |
| LM-098 | Flash | shape-tween | シェイプトゥイーン | はい |
| LM-099 | Flash | frame-by-frame | フレーム・バイ・フレーム | はい |
| LM-100 | Flash | typewriter | タイプライター | はい |
| LM-101 | Flash | logo-assembly | ロゴの分解・集合 | はい |
| LM-102 | Flash | glow-wave-type | 波打つ発光文字 | いいえ |
| LM-103 | Flash | vector-morph | 円から多角形への変形 | はい |
| LM-104 | Flash | liquid-rubber | 液体とゴムの伸縮 | いいえ |
| LM-105 | Flash | tile-break | タイル分割と再構成 | はい |
| LM-106 | Flash | circle-mask | 円形マスク転換 | はい |
| LM-107 | Flash | venetian-blinds | ブラインド・ワイプ | はい |
| LM-108 | Flash | spotlight | スポットライト | いいえ |
| LM-109 | Flash | rollover-button | 光沢ロールオーバーボタン | いいえ |
| LM-110 | Flash | radial-menu | 放射メニュー | はい |
| LM-111 | Flash | percent-loader | パーセント・ローダー | はい |
| LM-112 | Flash | cursor-follow | 慣性カーソル追従 | はい |
| LM-113 | Flash | watching-eyes | 視線追従 | いいえ |
| LM-114 | Flash | paint-trail | 絵筆カーソル | いいえ |
| LM-115 | Flash | mascot-idle | マスコットの待機・瞬き | はい |
| LM-116 | Flash | part-animation | パーツアニメーション | はい |
| LM-117 | Flash | edge-peek | 画面端から覗く案内役 | いいえ |
| LM-118 | Flash | gravity-bounce | 重力と反発 | はい |
| LM-119 | Flash | spring-drag | ゴム紐とバネ | はい |
| LM-120 | Flash | rain-fire | 雨・雪・炎 | はい |
| LM-121 | Flash | spark-particles | 光粒子の噴出 | はい |
| LM-122 | Flash | logo-burst | ロゴの粒子化と再集合 | はい |
| LM-123 | Flash | magic-constellation | 魔法陣と星の軌跡 | はい |
| LM-124 | Flash | layered-scroll | 多層パララックス | いいえ |
| LM-125 | Flash | starfield | 星屑ワープ | はい |
| LM-126 | Flash | horizon-grid | 地平線グリッド | はい |
| LM-127 | Flash | rotating-cube | 回転する立方体 | いいえ |
| LM-128 | Flash | photo-carousel | 3Dカルーセル | はい |
| LM-129 | Flash | wireframe-tunnel | ワイヤーフレーム・トンネル | はい |
| LM-130 | Flash | spectrum | 音楽ビジュアライザー | はい |
| LM-131 | Flash | audio-wave | 波形モニター | はい |
| LM-132 | Flash | beat-flash | ビート同期フラッシュ | はい |
| LM-133 | Flash | fullscreen-intro | スキップ可能なフルスクリーンイントロ | はい |
| LM-134 | Flash | moving-portfolio | 画面全体が動くポートフォリオ | はい |
| LM-135 | Flash | room-navigation | 部屋を移動するナビゲーション | はい |
| LM-136 | Flash | flashing-cta | 点滅CTAと価格の飛び込み | はい |
| LM-137 | Flash | banner-slot | バナー内スロット | はい |
| LM-138 | Flash | safe-escape-close | 逃げる閉じるボタン（安全版） | はい |
| LM-139 | Flash | sprite-run | スプライト走行 | はい |
| LM-140 | Flash | mini-shooter | クリック・シューター | はい |
| LM-141 | Flash | combo-score | コンボとダメージ数字 | はい |
| LM-142 | Flash | generative-lines | ジェネラティブ線画 | はい |
| LM-143 | Flash | kaleidoscope | 万華鏡 | いいえ |
| LM-144 | Flash | interactive-poem | インタラクティブ詩 | はい |
| LM-145 | Flash | keyframe-timeline | キーフレーム・タイムライン | はい |
| LM-146 | Flash | onion-skin | オニオンスキン | はい |
| LM-147 | Flash | fps-compare | 12 / 24 / 30 / 60fps比較 | はい |
| LM-148 | Flash | tween-modern-map | 同じ動き：タイムラインからCSSへ | はい |
| LM-149 | Flash | mouse-modern-map | 同じ入力：マウス追従からPointer Eventsへ | いいえ |
| LM-150 | Flash | audio-modern-map | 統合環境から標準APIの組み合わせへ | いいえ |
