# Stage 2A 現行品質の受入再検証（2026-10-29 JST）

**CI確認前の判定: HOLD。** A現行製品とB現行検証の必要経路は以下の条件で確認できた。最終commitのPR専用CIと独立最終照合が成功した場合はGO候補とする。C過去障害の根本原因UNKNOWNのみを阻害条件にしない。履歴中のFAIL/PARTIAL、未検証と制約は保持する。Draft・未マージ、人間の最終判断を維持し、Stage 2Bの実装・自動マージ・Pages公開は行わない。

## 対象、修正、来歴

開始HEAD `997c6927cfa51af7ff3e002a46f7019a03654da4`、base main `1d0d7eeac4e6fcbe2dfb792dd69250e65af302b7`。旧187件と179件との差8件は未commit query対照という保存記録があるが、8件全文・未commit内の移動/改名詳細はUNKNOWN。コミット済みテストがその差分8件分削除された証拠はなく、現行必須範囲を別途検証した。詳細は [test-scope-audit](../stage2a-acceptance-20261027/test-scope-audit.md)。

WebKit765のTurn Order rapid HASTE/RESET後、旧buildで500ms時点に3本が391/420msで動き2行が重なるFAIL。追加時系列でもRESET後のAnimation生成と矩形重なりを確認したが、元FAILの根因を一つに断定しない。別の回帰試験で、旧コードはHASTE→RESET後に未発火callbackが6本Animationを生成しFAIL。修正はTurn Orderに限定し、Resetは既存Animationを停止して正常DOMを即時復元、世代を進め旧callbackを無効化する。active/低減変更・unmountの同期cleanupも世代を無効化する。HASTE/STUN/NORMALIZEのFLIPは維持する。

別のWebKit765診断では低減切替前に3本running、通知後に3本finishedで取消を確認できなかった。通知時の状態は未記録でUNKNOWN。修正前の新回帰試験はFAIL。Turnのみ既存runtimeの低減時停止を有効化。修正後、低減設定が有効な時点で3本running 96/420msから同一IDの取消・idle/nullを確認。media change listenerの記録より取消が先なので「通知後」とは断定しない。両回帰は修正前RED、修正後GREEN。実行中3本の取消、未発火callbackのReset/非表示/unmount/低減切替後の抑止を検査する。旧assert削除なし。追加2件により正式はNode49＋Vitest132＝181件。

## 環境と配信

Windows、Node 24.20.0、npm 11.17.0、Playwright 1.56.0、Chromium 141.0.7390.37／WebKit 26.0。ローカルHTTPでHTML転送が停止し、gzip化後も主要JS接続resetとpageerrorが発生。`commit`/`DOMContentLoaded`は到達したがloadは失敗し、後のnetworkidleだけでは初期化成功でないことを確認。旧失敗を保存。

本番コードを変更せず、Playwright route fulfillで静的buildファイルのbytesをブラウザへ渡す条件を採用。両engineで初期化、47標本、pageerrorなしを確認し、各要求の記録hashとbuild manifestを照合した。**これはHTTP転送成功や公開先の検証ではない。** 全3実行のsource/build前後一致、3実行間のbuild一致を確認。最終buildのindex SHA-256 `10cef4d5a18243ded5bfe8c46807e572822a5e14eb19893eb15f684315595692`、変更製品source SHA-256 `6ba841b7639f8a285360ad99ebf6f239fac68f343afe71f506b216d1e0dafc66`、追加テストSHA-256 `7cf6c44d051adbcd173b05a6a0ca934c9ad85671b300ad38efca983b8eb9905c`。別時刻buildのindexは別hashであり同一扱いしない。配信コード・各資産journal・hash監査を保存。

## 実測（固定build）

- 正式観察の旧条件: Ch375/390/765とWK390/765 PASS、WK375はMenu途中停止が終端220/220msとなりPARTIAL、入口exit1。追加probeで旧結果を置換しない。
- 正式観察の新条件: 再生前にfonts.readyと自然描画2frameを待つ。再生前の待ち・ready・入力時刻を記録し、元の操作順・全assert・途中時刻判定・正負対照を維持。Ch/WK×375/390/765 **6/6 PASS**、各8群、pageerror0。Menuの入力時native時刻はCh順に約6.13/5.97/6.29ms、WK順に23/24/45ms。旧PARTIALは上記のとおり保存。frame待ちに個別期限はなく、入口ごとの外側300秒上限と途中保存を設ける。
- 実入力は別途、描画準備後、trusted keyboard Enterとpointer clickでWK375/390/765が31/30/48msでrunning→paused同位置保持、pageerror0。以前の未準備条件では375/765の途中時刻待ちが未到達、390のみ214msで成功。その失敗を保持し、未準備状態での一律安定性は保証しない。実機タップではない。
- Stage1主要回帰、N2事象同期版、対象表示・Turnの各suiteはそれぞれ **6/6 PASS**。対象表示6展示×motion2×CSS文字100/200%×色2×6条件＝288組合せ、7つの検証器対照も成功。WebKit765は旧同一500ms assertionを含みPASS。
- 元N2検証器のWK375/390はpaused診断固定300ms後にFAIL。後続通知・取消はResetと競合し帰属不能で旧FAILを維持。新入口は低減通知時の同一対象pausedを確認し、同じIDの取消・idle/nullをReset前に待つ。通知/取消待ちのtimeoutも非成功で保存し、正負対照と全条件PASS以外は非0終了。新入口の6条件はPASS。独立レビューの末尾空白指摘を受け、計測時入口SHA-256 `0cf4c283aae7705daf3c017d89d539282a67fed0e38fe734f99ab396132970e7` の空白のみを除去した最終入口（実行checkout bytes SHA-256 `f83a4d3d2e2598b8e702b1b02aea08732f70e49720c9c7f483a29bc399a71d35`）を同じ6条件で再実行しPASS。改行形式を含む実行時bytesのhashである。旧入口はFAIL時もexit0となり得るためexitのみで成功判定しない。
- 既存重要ゲームsuite Ch/WK390は各9対象群を実行し、Match-3、HP、Falling Block、Equip、Lock等の操作は通過、pageerror0。全ページ文字200%で既知の対象外横超過（618px/390px）が残るため双方のsuite全体はPARTIAL/exit2。対象6展示の表示検査PASSと混同しない。

## 自動テストと判定

修正後 `npm run check` は既定3回とworker1 2回、各 **181/181、失敗0・skip0・exit0**。独立build exit0。中途停止した先行check、旧180件版、旧179件版と分けてログに残す。5000ms、正式テストの既存assert、対象、必須CIは弱めていない。最終commitの実CIは本書作成時点で未確認であり、旧 `997c692` のCIを最終版成功と呼ばない。

Q1: 現行の5回全量・browser必要経路が上記条件で通過し、最終CI確認後は **HISTORICAL / NOT REPRODUCED** と分類する。根本原因はUNKNOWNで、原因解明・根治を意味しない。B1/M1も現行Stage1・Menuの必要経路が上記条件で通過し、最終CI確認後は **HISTORICAL / NOT REPRODUCED** とする。旧根本原因はUNKNOWN、旧事象の細部すべてを再現できたとは言わない。現行P0〜P2の新規未解消は、この確認範囲では残っていない。GOには対象表示・操作の正常、未解決P0〜P2なし、必須範囲とtests/CI成功、Q1の現行非再現、制約明示が必要。CI失敗、重要経路未達、追加P0〜P2または証拠不足があればHOLDとする。

独立担当は元FAILと修正後対象証拠、N2事象同期のassert/例外保存・正負対照、source/build/asset hash、5回181件および新旧browser結果を記録監査した。P3の日時記録不足とN2入口の途中証拠/終了コードの指摘は訂正後再確認済み。独立担当が実ブラウザを再実行したとは主張しない。最終保存216ファイルのgzip・展開後hash/サイズ、最終入口の6条件と正負対照、資産journalを独立担当が再照合し一致。stage済みdiff check成功。P0/P1/P3の新規指摘なし。P2の残件は最終commit/CIと最終HEAD・検証版の照合。

全197展示・全展示×全条件、実機iPhone Safari、VoiceOver、実OS文字拡大・背景化は未検証。CSS文字200%、合成visibility、Playwright WebKitと区別する。旧全ページ文字横超過/typewriter ID等は別途残る。最終結果は [PR #36](https://github.com/tetsujisugimori-coder/Loading-museum/pull/36) 本文とCI記録に追記する。

本文の日時はJST。機械原記録のUTC表記は証跡として変換せず保持する。全raw、失敗、中断、検証器・配信source、日時、資産journalとSHA-256は [manifest.json](manifest.json) に列挙しgzipで保存。
