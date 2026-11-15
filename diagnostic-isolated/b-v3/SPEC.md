# LM88-B-SCOPE v3 — 停止条件と未承認Bの範囲

対象 tetsujisugimori-coder/Loading-museum PR #88 / Issue #87。
作成 2026-11-16 JST。文書設計のみ。今回依頼はB/C承認ではない。
基準/現在提出HEAD 2d19a0f0db11b65db4eee56421c0d357558e70af、tree 47edfb244c9adbdcec2a823e04ef0619cca17f2c、branch feat/phase7d-interactive-motion。
実験source基準5de4b08a2dc881ad2afcbe805b0776cb944ff882/tree89a84488c489161f167e06df34fbc25cca0a4c6eを変更しない。現checkout d4e4a2b23a8364cc89c685c8c66761dd055378beは同treeの旧局所文書commitであり提出HEADとは別。既存checkoutは変更しない。

## 1. 現況と根拠
PRはopen/Draft/未merge。直近正式review5912338756もB/C未承認を明記。既存approval-v2全文、Issue87、README/LOG、診断runnerの一次保存→followup→finallyの順序を読取確認。repo内AGENTS.mdは見つからなかった（存在未確認の規則を作らない）。21自動runの18成功/3失敗、84jobの79成功/3失敗/2条件外skipという直近記録は保持。旧API/WAAPI/Boundary WebKit失敗は原因UNKNOWN。実行byte結合NOT_PROVEN。製品受入NO・本番108NO・mergeNO。今回実ブラウザ/因果試行/dispatch/retry/コード変更は0。

## 2. 停止の対象と時点
元条件の『missing body/unlisted response/cache ambiguityで以後の予定操作を即停止』は発生瞬間の万能検知要求ではない。ただし同slot内の必要byte確認を遅延させ、その間も予定操作を続ける設計とは未整合。検知可能時点と停止時点を明記する。
記録時点を eventOccurred, minimumObserved, mismatchDetected, stopRequested, stopCompleted, bodyCollected, primaryFrozen, evidenceFrozen と分離する。各々 monotonic value/domain/sequence と optional UTC を持ち、未観測はnull/UNKNOWN。browser/host別clockを無根拠に減算しない。callback到着時刻をイベント発生時刻にしない。等時刻はsequenceで順序を持つ。
停止要求は新しい操作開始を阻止するだけで、既に発行済みのdriver command、browser callback、ネットワークを遡及取消しない。stopCompletedは命令gate閉鎖・進行中処理の終端/強制終了を証拠で確認して初めて記録。単なる要求受付ではfalse。猶予超過はINCOMPLETE/nonzero、証拠回収不能も保持。強制終了と詳細回収の完全性は両立保証しない。
API primaryFrozenの正規位置は元runnerのprimary read直後のexclusive保存。WAAPIはsettled snapshotからseek前の一次dataをメモリ上で不変固定し、同期I/Oは遅延する。APIの保存処理をWAAPIへ挿入しない。prefix未到達はprimary=null/NOT_TESTED、追加観測で一次判定を作り直さない。詳細監査は別の欄で、一次FAILは後続PASSに置換しない。

## 3. 三方式比較
|方式|可能な検知|停止保証|観測影響/証拠|複雑性/結論|
|A 最小情報即時|明示requestfailed、未知URL、容量超過等。URL/status一致は本文一致を証明しない|検知後の次操作禁止は設計可能。本文差替えの即時検知不可。in-flight終了は別|listener/driver dispatch/GC影響UNKNOWN。closeがbody取得を阻害し得る|中。metadataで証明できる異常にのみ候補。全本文不一致に適用不可|
|B 暫定停止→事後確定|兆候で刺激gate閉鎖、本文回収後判定|兆候のない差替えは検知不可。全responseで停止すれば実質新しい待機/順序変更|元sequence途中の回収/待機が介入になる。停止中にも既存callback進む。完全停止と別|高。元操作順を保持する今回のCには採用不可|
|C 終了後監査|通常sequenceと一次固定後にbody比較|同slot即時停止は保証しない。検知後の後続slot禁止のみ|既存順を最も保持するがlistenerと回収は非中立。欠落bodyは再取得で補完しない|中。Bのoffline監査モデルとしてのみ推奨、C実験には条件変更の別承認が必要|

証明限界：最小metadataが同一で本文のみ違う二入力は、本文取得前には区別できない。この対偶例により『metadataのみ・遅延本文・同slot内で必要byte確認のうえ不一致時に以後操作停止』の同時保証は成立しない。条件を弱めて解決済みとしない。
採用判断：B候補はAの検知可能異常とCの事後監査を別モードとして仕様化し、強いstop policyとの組合せは事前にINCOMPATIBLE_POLICYで拒否する。これはブラウザ設計の採用/承認ではない。CはHOLD。所有者が変更を選ぶ場合に限り、旧『全本文不一致の同slot停止』を『取得後検知で以後slot停止、当該slotは監査不合格』へ変更する差分案を別承認する。無変更を希望するなら実現手段が証明されるまでHOLD。

## 4. B承認対象案（未承認）
B-1 隔離変換器：固定sourceのpath/blob/byte span/context hash、期待一致数1、preimage/postimageを照合。入力→正規化記録への変換のみ。未知schema/field、欠損、曖昧anchor、hash改変を拒否。原入力readonly、出力新規exclusive、原hash再照合。
B-2 計測器：純粋イベント受入interfaceのみ。ブラウザimport/launch/network接続無し。eventごとslot/level/generation/sequence/domain/time、mark種類、payloadを検査。callback/update/commit/DOMを異なるeventとして保持。React commitがcallback中にあると仮定しない。capacity4096、4097番目firstLost、overflow後の完全性否定。一次観測と遅延bodyを別stream。
B-3 監査器：入力・実行・証拠版、PRIMARYと詳細監査、expectedFaultDetectedとunexpectedErrors、process exitとproduct結果を分離。未到達/途中停止/例外/cleanup/persistenceを独立判定。false/0は有効値。FAILの保持は原primaryのhash/内容比較で検査し、後続値で上書き不可。
B-4 校正fixture：純粋合成eventとbodyのみ。実Animation/DOM/Promiseのタイミングを検証したことにしない。正常・故障・境界を固定、各入力独立コピー、原票不変。予備的fixture構築もBコードのため今回作らない。
想定配置 diagnostic-isolated/b-v3/{transform,recorder,auditor,fixtures} は将来案のみ。runner/launcherと実製品への結線はBから除外。生成製品build/実依存browser配布物の取得・インストールもこのB案では除外し、必要になれば範囲再承認。

## 5. Interface契約（非実行仕様）
Envelope：schemaVersion, sourceIdentity{head,tree,path,sha256}, implementationIdentity{sha256}, inputIdentity{sha256}, policyId, slotId, events[], immutablePrimary{bytesSha256,verdict,reached}, bodies[], finalization{exitCode,cleanup,persistence}, auditResult。
各event：id,seq,clockDomain,monotonic,kind,phase,operationId,generation,payload。ID重複/sequence欠落/逆転、別slot/版の混入は拒否。domain横断の時間比較はUNCOMPARABLEで止める。時計同値は許容、同domain逆行は禁止。
body：requestId,responseId,URL,status,encoding,expectedBuildEntry,actualSha256,collectionStart/End。本文欠落はNOT_PROVEN。server送信物≠browser取得物。再fetchで歴史的responseを作らない。
mode=Cでは当該primaryに使った最小観測、primaryFrozen、正常sequence終端、bodyCollected、evidenceFrozenのhost sequence上の前後関係を要求する。数値時刻の厳密不等号ではなく、同時刻でもsequenceで順序を定義する。後到着したresponse metadataを全件primary前に置くとは要求しない。error cleanupは別pathとし、primary前のerrorなら未到達を保持、確定後のerrorなら既存一次値/hashを保持してevidence/cleanupだけを別に不完全とする。mode=Aの検知可能異常ならmismatchDetected<=stopRequested<=stopCompleted、request後の新規禁止操作0を要求。in-flightの自然完了と新規命令を区別する。metadata一致だけのbody mismatch判定は拒否。強いpolicy+deferred captureは実行前拒否。

## 6. 固定17負対照と1正常境界対照の受入（設計のみ、全件NOT_TESTED）
|ID|変更|期待理由|
|F01|必須event削除|MISSING_EVENT|
|F02|sequence/同domain時刻逆転|ORDER_VIOLATION|
|F03|検知後stop要求なし|STOP_REQUEST_MISSING|
|F04|要求あり完了なし|STOP_INCOMPLETE（完了を偽造しない）|
|F05|遅延bodyのみ差替え|BODY_HASH_MISMATCH。一次値は保持|
|F06|body schema/type不正|BODY_INVALID|
|F07|4097 marks/4096枠|OVERFLOW/INCOMPLETE|
|F08|証拠hashのみ変更|EVIDENCE_HASH_MISMATCH|
|F09|実装版のみ変更|IMPLEMENTATION_MISMATCH|
|F10|一次FAILを後続PASSで置換|PRIMARY_MUTATION|
|F11|未実施をPASS|UNREACHED_PRIMARY|
|F12|unexpected error・監査不整合などnonzero必須条件にexit0|EXIT_CONTRADICTION。意図faultのみ正しく検出し必要証拠/cleanup完全ならtechnical controlのexit0を許容|
|F13|停止要求後に新規禁止操作|POST_STOP_OPERATION|
|F14|metadata同一/body異なるのに即時検知と主張|UNSUPPORTED_DETECTION|
|F15|strong immediate policy+deferred body|INCOMPATIBLE_POLICY|
|F16|異domain時刻を差分計算|CLOCK_DOMAIN_MISMATCH|
|F17|意図fault+cleanup例外|UNEXPECTED_ERROR保持、control PASS不可|
|F18|false/0を欠測扱い|正常control受理必須|
正常control：完全正常、一次FAILだが完全証拠（product FAIL/technical audit整合）、prefix未到達（NOT_TESTED/INCOMPLETEを正しく受理）、同時刻異sequence、純粋合成cancel、要求前に発行済み操作が要求後終端。結果受理と製品PASSは別。
受入：全固定正常の分類維持/全故障が指定理由で拒否/原不変/ブラウザ0/原ソース・plan・timeout・workflow不変/独立レビュー重大指摘0。例外や起動失敗を期待検出に数えない。旧実装がない部分はRED未実施と明記し、架空の修正前成功を作らない。

## 7. 承認票とC移行
B approval fieldsは approver/time/documentId/version/SHA/head/tree/modules/verificationMethods/exclusions/acceptance/stopPolicy。現在すべて承認値null、status UNAPPROVED。対象は本v3とmanifest、参照v2の不変JSON/API22/WAAPI13 slot。将来Bに実行権を渡すには本人からこの対象を特定した後続明示承認が必要。
B実装開始NO、B限定技術受入HOLD、C開始NO、PR88mergeNO。
C前にはB実装・build全出力・lock/dependency・CPU/OS/runtime/driver/browserの実体hash、固定shutdown graceと上限API22/1200秒・WAAPI13/1800秒、校正・原slot順序・一次時点・介入と回収位置・停止保証変更の承認、独立レビューが必要。未生成hashはnull、shutdown grace数値は未固定。WAAPI18endpointは9context内相関、375反復を独立18試行へ変換しない。
今回は設計comment提出のみを選択する。branch pushは既存自動browser CIを起動し得るため、B未承認の状態で不要な新自動試行を避け、HEADを進めない。コメント/保全文書に版hashを固定。Cの許可変更が成立したと主張しない。
