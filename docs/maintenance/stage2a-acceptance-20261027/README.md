# Stage 2A 表示・動作優先の受入（2026-10-27 JST）

## 判断方針の変更と履歴保護

2026-10-27 12:58 JSTの本人指示により、A（現行製品品質）、B（現行検証基盤）、C（歴史的原因解明）を別評価する。A/Bの必須条件が合格なら、CがUNKNOWNでもGOを許可する。旧記録のPARTIAL/NOは当時の条件・観測として保持し、遡って成功へ書き換えない。

- **A**: Stage 2A Menu/CoinとStage 1主要回帰の表示、操作、状態、Reset、取消、旧callback保護。現行のP0〜P2や必要経路未到達は不合格。
- **B**: 179件相当の範囲を維持した既定check3回/worker1 2回、build、最終HEADの実PR CI、正式native受入と偽陽性対照、証拠の対応。
- **C**: Q1/B1/M1をRESOLVED、HISTORICAL / NOT REPRODUCED、ACTIVE、INSUFFICIENT EVIDENCEへ分類。HISTORICALは原因解明・修復済みを意味しないが、A/B合格時に単独阻害としない。

GOでもDraft/未マージを維持。Stage 2B実装・公開・Pages起動はしない。全197展示や実機Safari/VoiceOver/実OS拡大への保証へ拡張しない。

## 開始確認（2026-10-27 13:00 JST）

- PR36 HEAD/local: `dac711a609fadb69518cbadb6fe26832b7408fad`、tree `2abd5eedeb35a8800a3916166d78205bd02bd8e6`。参考HEADと一致。
- main: `1d0d7eeac4e6fcbe2dfb792dd69250e65af302b7`。fetchのみ、main更新・Windows操作なし。
- 単一detached worktree、開始時clean、未追跡なし。既存作業を削除/stashしない。
- PR36 Draft/open/unmerged、auto_merge=null。Issue35 open。repo AGENTS.mdなし（他repoの規則を混入しない）。
- 前回179件×10成功、実CI40429153957成功とnative WK765 PARTIALは過去証拠。今回の受入結果として無条件流用しない。
- 旧187件と現179件の差は独立に監査する。資料152未回収を復元済みとはしない。

## 実行計画と停止条件

1. test-scope-auditで旧追加8件と現正式範囲を照合。
2. 既存nativeの検査を保ち、正式suiteで途中停止入力の到達・結果を判定。全6条件で新受入を実行し、単発probeの成功を全量成功へ置換しない。
3. 表示/操作補完と負例を独立レビュー。実不具合を再現した場合のみ局所修正（再現→仮説→修正→同期待値回帰）。
4. 最終製品コードで既定3/worker1 2/build。5000ms・assert・対象を維持。失敗/skipを隠さず保存。
5. 独立レビュー・commit/push・最終HEAD実CI/ZIP照合、Issue35/PR36更新。

原因探索は今回のA/B判定に必要な範囲まで。現行不具合がなく受入を満たせば、歴史的UNKNOWNの解明待ちで作業を無期限に延ばさない。日時はJSTで記録し、ブラウザperformance時刻と実行時刻は別に扱う。
