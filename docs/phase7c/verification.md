# 第7期C 検証・失敗履歴

## 初期独立レビュー

実装担当とは別の担当が独立6入力を作成した（tests/phase7c-independent.test.tsx）。Relayの逆向きB→Aで消えるBを「登場」と表示する不備を検出。方向依存の段階表示へ修正して、全く同じ入力でRED→GREEN。Timed/Spatial両CSSの.mcTileが干渉する点も指摘し、親クラスでスコープ分離した。

隔離コピーで時刻更新の世代ガードだけを除去した変異実装に同じ6入力を適用し、旧callbackによる時間0→3500の書戻しを検出した（1FAIL/5PASS）。正常版は6PASS。原ログはevidence/。単なる期待値の追認とは区別する。

独立Chromium375で実DOM FLIPを測定。4要素のFirstとInvert直後のx/y/width/heightが1 CSS px未満で一致し、中間幅185.84→最終269pxの変化を観測。Relay逆向き退場/登場も実ブラウザで確認。これは同一cloud hostの独立担当・別実行であり、別物理機・実機Safariではない。最終HEADの追加照合はPRレビューを参照する。

## ローカル検証

初期全checkは既存751＋新45＝796試験、lint（既存4warnings）・型・build成功。その後の観察表示改善と原証拠契約追加には、新45入力および証拠契約8試験を実行。最終全件とCI結果はPRの最新最終報告を正本とする。未実施を成功扱いしない。

ローカルChromium375通常/reducedの12作品ケースと、WPE WebKit375通常/reducedの12作品ケースが成功。WebKit別経路による検証と正式CIを混同しない。各作品fresh contextで、作品内の連続入力・取消・反転を検査し、作品間のブラウザ履歴を時間軸oracleへ混入させない。別途、同ページ内の旧検索・横断参照・旧URLはnavigationケースで検査する。

## 失敗と対応

- 最初のlint終了はKilled。原因UNKNOWN。独立変異原本を一時的にcheckout下に置いた際はlint対象に入り、移動と競合してENOENT。変異原本を兄弟ディレクトリへ分離して同じ全checkが成功。検査除外やassert緩和で解消しない。
- 最初のbrowser実行はPlaywright既定cacheに実行ファイルがなく起動失敗。既存の正式Playwright1.56.1 browser所在を明示して再実行。
- 初期pilotでcatalog286に対し上部表示280を検出し、表示式に追加6件を反映。
- 経路selectの厳密アクセシブル名が曖昧でtimeout。aria-labelを明示して修正。
- Motion Pathの途中方向変更は距離位置を保つようp→1-pへ変換し旧frameを無効化。実装中seek公開漏れを単体で検出・修正し、同じ反例で確認。
- ローカルChromiumのTarget crashedを複数回保全。作品ごとに新contextへ分離後375pxは通常/reduced成功したが、原因を確定していない。並走した追加390pxでもTarget crashedが残る。/tmpの空きは約1%だったが、それが原因という証明はない。全証拠・browser tmpの保存先はworkspaceへ分離。
- 初期b395d99のWAAPI Stage2BとPhase5B CIは、全館件数assertが280のままで失敗。ログ・成果物を保持し、追加6件に合わせ厳密値だけ286へ更新。他の旧ブラウザ契約の同じ件数assertも再点検。作品数以外の条件・assert・幅1280は不変。

## 証拠契約

正式7C workflowは両engineで4幅×2motion。各reportにHEAD/tree、clean状態、source/output digest、原JSON/PNG/trace SHA256を記録。作品ごと6組とnavigation traceを保存する。audit-phase7c-results.mjsが想定matrix・作品・必須操作チェック・原ファイルhashを照合する。欠落条件、重複、旧HEAD、未完了作品、操作欠落、PNG欠落、FAILの各故障入力を拒否する。部分集合試験は16条件の代替としない。

## 保留

実機iPhone Safari、VoiceOver、物理入力、真のOS背景制御はNOT_TESTED。非表示イベントは合成、タッチはPlaywright API tapである。#44/#54、既存native WebKit touchおよび旧WebKit timeoutの原因UNKNOWNを維持。最終CI・独立再受入前はマージ推奨NO、Draftを維持。

## 原画像レビューでの追加修正

3b31519候補の正式Chromium8条件原PNGで、Sequenceの帯が安定ID+1、一覧が表示順+1という番号ずれを独立担当が検出。Sequenceは両方を現在の「動作」順番号へ統一し、Stagger/Parallelは両方を要素IDへ統一した。追加・削除・順序変更を含む同じ独立入力で1FAIL/6PASSから7PASSへ変化し、時間作品13試験も成功。旧原画像とREDログは保持。修正後HEADの全CIと再レビューはPR報告で別途確認する。

## 制御時計とDOM観測の同期

旧3b31519正式WebKit765通常のRelayと、7fb9eceローカルWebKit375通常のFLIPで、再開後100msを進めた直後の属性readが旧時間を返して失敗。前者はread176に対し同callのafterSnapshot272、後者はread192に対しafterSnapshot272を原traceで独立確認した。再開処理そのものの不作動とは整合せず、DOM commitと読み取りの境界競合を示すが一般原因の確定とはしない。

時計の追加進行や任意sleepではなく、同じ100ms後のtime>停止時刻という元条件のDOM反映を待機し、その後元assertも維持。独立WPE3回は同じ100msで176→256、再開操作を故意に省く負対照は192のままtimeout拒否。稀な旧FAIL自体をこの3回で再現したとは主張しない。原trace、失敗report、独立抜粋と負対照を保全。新HEADの全16条件を別途再検証する。
