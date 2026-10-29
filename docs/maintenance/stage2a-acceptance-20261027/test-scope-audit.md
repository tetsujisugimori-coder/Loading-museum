# 旧187件／現179件と現行受入範囲の監査

確認日時: **2026-10-27 13:01 JST**。監査対象HEAD `dac711a609fadb69518cbadb6fe26832b7408fad`。利用者の2026-10-27 12:58 JST依頼に従い、A現行製品、B現行検証基盤、C歴史的根因を分離する。本担当はこの監査で製品・正式テストを変更せず、テスト/build/ブラウザを実行していない。ソース・Git tree・保存済み記録を照合した。

## 1. 結論

- **187−179＝8は、commit済み正式テストの削除ではない。** 回収記録で確認できる未commit追加query-boundary controls 8件が、消失後の現treeには含まれていない。
- commit済み基準 `50fbcd91c6f0c174f40ea627ce2bd33c6e985ce2` から対象HEADまで、`tests/`、`app/`、`package.json` に差分がない。既存テストの削除・移動・改名・期待値変更・登録除外はこの区間ではない。
- 失われた8件の完全な本文・全名称・当時の変更treeは**UNKNOWN／未回収**。推測で8件を復元したり、現179へ計上していない。
- 現行には対象query改善/helperも存在しないため、その改善に付随した8対照の欠如だけでは現行製品の必須操作検査欠落を示さない。現行必須範囲を下記マップと今回の正式ブラウザ受入で評価する。
- **Cの根因UNKNOWNだけをHOLD理由にしない。** A/Bが現行受入を満たせば、旧Q1をHISTORICAL / NOT REPRODUCEDとしてGOを妨げない。実行不足や現行不良は別途A/BのHOLD条件である。

## 2. 照合可能な一次記録

回収正本: `../stage2a-q1-recovery-20261027/results.json.gz`。今回再計算して以下が一致した。

- gzip 41,334 bytes / SHA-256 `4064d84c3543354867d6bcafcc1d038f1229e1a9ecafb85d58ebf6334fd4d6c6`
- 展開331,403 bytes / SHA-256 `927f040c3591ad6858707cf8a9f2aaf09957e71c3962c4ecaabbc1b342be4f0f`
- Git blob `679f0126249bf8ab89cd71a417df7bac356e8c52`

JSONの `measurement_notes` は既存assertion/登録を保持してquery-boundary controlsを8追加したことを記録する。5runすべてNode49とVitest138を報告する。`default-1` と `worker1-1` の failure_locations に追加ファイル `tests/waapi-test-queries.test.tsx` と試験名 `scoped and original queries identify the same elements in the actual gallery DOM` が残る。これはその1名称の存在証拠であって、8本文の復元証拠ではない。

回収JSONの記録SHAとの現ファイル比較では、`package-lock.json`、`WaapiSampleGallery.tsx`、`WaapiGameObservation.tsx` は一致、`package.json`、`waapi-gallery.test.tsx`、`waapi-observation.test.tsx` は不一致。当時の未commit test/登録変更と、現commit済みソースを区別する根拠になる。不一致部分の詳細diffは旧本文未回収のため確定できない。

Git側の再現可能な照合:

```sh
git diff 50fbcd91c6f0c174f40ea627ce2bd33c6e985ce2 dac711a609fadb69518cbadb6fe26832b7408fad -- tests app package.json
git log --oneline 50fbcd91c6f0c174f40ea627ce2bd33c6e985ce2..dac711a609fadb69518cbadb6fe26832b7408fad -- tests app package.json
```

両方出力なし。各参照のオブジェクトIDも同じ:

| 対象 | 両HEAD共通ID |
|---|---|
| tests tree | `894778da2c41023b4b48429306d027e80c04abd3` |
| app tree | `56ba43f2347ebb450957d00f9d5103dce5048326` |
| package.json blob | `1cd401c7914275ed5d1d6eff70da96ddb8c6d314` |

### 差8件の分類

| 区分 | 確認結果 |
|---|---|
| 未commit追加 | 回収JSONのnotesと総数から8件の追加を確認 |
| commit済みテスト削除 | 上記Git区間では0 |
| commit済み移動・改名 | 上記Git区間では0 |
| 旧未commit内での移動・改名の詳細 | 全tree未回収のためUNKNOWN |
| 現treeへの反映 | 追加file/helper/登録は存在しない。復元済み扱いしない |
| 必須検査を8件だけ失ったか | 8件はquery改善用対照という集約証拠。現正式操作検査は下記のとおり保持。8件各本文の完全な対応はUNKNOWN |

## 3. 現行179件の登録と範囲

`package.json` の正式 `npm test` はbuild→Node3file→Vitest12fileを実行。件数は保存済み新環境baseline worker1-1/2の完走ログとソース登録を照合した値であり、本監査の新規再実行結果ではない。

### Node 49

| file | 件数 | 範囲 |
|---|---:|---|
| rendered-html.test.mjs | 22 | export/既存展示・WAAPI遅延生成・構造/定義/軽減/静的HTML。実ブラウザ表示保証とは別 |
| museum-title-sequence-state.test.mjs | 24 | タイトル遷移、Replay、古いrun、軽減状態 |
| macintosh-interaction-state.test.mjs | 3 | System選択の純粋状態契約 |

### Vitest 130

| file（tests/） | 件数 | Q1/受入への対応 |
|---|---:|---|
| waapi-gallery.test.tsx | 12 | 初期遅延DOM、検索・解除・開閉、複合filter/0件、各操作、AI比較、追加14ゲーム。旧Q1失敗箇所を保持 |
| waapi-hp-regression.test.tsx | 4 | Damage直後Reset、連打/Heal、画面外/再表示、unmount旧処理。旧Q1 HP Resetを保持 |
| waapi-observation.test.tsx | 37 | pause/resume/seek/step/終端巻戻し/easing/pending/ready/古いRAF/visibility/低減、実Gallery状態分離、N2正式7件を含む |
| waapi-observation-independent.test.tsx | 7 | frame間currentTime、pause入力位置、overshoot/null、終端step独立契約 |
| waapi-stage1-menu-coin.test.tsx | 5 | Menu選択/keyboard/Reset、Coin得点一度/Replay無得点/古いcallback、説明・metadata |
| waapi-stage1-expanded.test.tsx | 23 | Parry/Dodge境界/低減/offscreen、Battle中断/Reset/復帰、combat取消。旧Dodge timeout対象を保持 |
| waapi-game-regressions.test.tsx | 13 | Match-3隣接/実交換/得点/drag/Reset、line-clear実DOM、lock/equip、古い演出取消 |
| waapi-cascade-motion.test.tsx | 14 | Match-3/line-clear/lock/equip等の動作・低減・状態維持・Reset/unmount |
| waapi-interaction-state.test.ts | 2 | Parry/Dodge判定境界、AIフェーズ終端 |
| waapi-samples.test.ts | 7 | 標本定義/分類/metadata/構成 |
| macintosh-system-choice.test.tsx | 2 | click連続切替、Tab/Enter/Space。旧Q1 Macintosh対象を保持 |
| dom11-selection.test.tsx | 4 | 隣接するDOM選択操作回帰 |
| **合計** | **130** | Node49との合計179 |

N2は `waapi-observation.test.tsx:264–307` のrunning/paused × Replay/COLLECT 4件、低減反復、モード往復/得点/Reset、viewport/unmount 3件。製品 `WaapiSampleGallery.tsx:235–245` の取消独立化とobserved自動再生抑止は保持される。旧診断4件は `stage2a-verification-20261026/normal-mode-contract.test.tsx` に保存された別診断であり、179件へ二重計上しない。

## 4. 欠落判断と必要な現行補完

**正式179件から旧Q1の製品操作検査が削られた証拠はない。** 新しいhelperを採用しない現在、失われたhelper専用対照8件の推測復元や件数合わせは不要。

ただし179件だけで今回の必須ブラウザ範囲を全部PASSにはできない:

- Turn Orderの現正式assertはgalleryのHASTE後MAGE先頭、STUN表示（309–312行）と定義確認が中心。Resetの全順序復帰・高速操作・古いRAFによる逆戻りの専用単体保証は限定的。**今回ブラウザ受入でHASTE/STUN→Reset、連打、再表示後の順序/表示を明示検証する必要がある。** これは旧8件喪失に由来する欠落ではない。
- 375/390/765、Chromium/WebKitのはみ出し・重なり・文字/ボタン欠落・実クリック/タッチ/keyboardはjsdomや静的HTMLでは代替できない。
- WK765 Menuの途中入力到達は前回正式経路PARTIAL。単体pause成功や補助probeだけで正式到達PASSへ格上げしない。今回の正式操作順・受入assertで確認が必要。
- 最終HEADの5check/build/PR CIは今回の実測を別記する。ここに掲げた保存ログを未来HEAD成功へ流用しない。

現不足の必須経路が最終検証で埋まらなければBまたはAのHOLD。埋まれば歴史的原因CのUNKNOWNだけでHOLDにしない。新たな現行P0〜P2が出た場合はA/B ACTIVEへ分類し、局所再現・修正・同一期待値の回帰を行う。

## 5. 判定の使い方

本監査単独の結論は「件数差の由来を確認、commit済み必須試験の削除なし、残るbrowser保証条件を特定」である。**全製品GOやマージYESをこの静的監査だけで宣言しない。** 今回A/Bの結果が合格なら、旧Q1/B1/M1の根因が未解明でもStage 2A受入・開発継続を認める新方針と矛盾しない。旧記録の当時のHOLD/PARTIALを削除せず、新判断の日時と根拠を追加する。
