# 第1段階 独立レビュー（作業中差分）

2026-10-25 21:16 JST。実装担当とは別の担当が `loading-stage1` の origin/main (`a40f2a0a8b837c47d5eda94661f278ecf9547300`) に対する差分を読取。製品コードは編集していない。

## 確認
- 新規27 + Match-3/cascade14 + HP4 + 旧game13 = 58 tests 独立実行、58成功/0失敗/0skip。Node、lint、build、nativeブラウザは本担当で未実行。
- Menuの最終位置は選択行のDOM所属から導出、実測差FLIPはfillなし、Reset/軽減/画面外で取消。
- Coinの得点は同期ref guardによる明示操作のみ。auto/Replayのfinished得点更新は除去され、旧完了からの加点経路なし。
- Timingはnullable開始時刻、同一judgeTiming420/680、inclusive境界、世代guard、表示timerとAnimationの取消を分離。軽減で論理時間を短縮しない。
- Battleはpendingとgeneration、画面外中断FIELD、Reset取消、完成後復帰を保持。軽減途中は装飾のみ停止、論理timer完了を維持。
- Combatは既存runtime取消契約を利用。pausedを含む3本を取消し、result stateは保持。
- useRuntime抽出はstopAnimationsを分離しただけで、既存stopはAnimationとtimerの両方を従来どおり取消。新しい軽減取消を利用するのは対象のみ。旧Match/Falling/HP/Inventory/Lock-onの論理処理差分なし。AI独立runtimeは不変。197/47の追加削除・ID変更は差分にない。

## 指摘
P0/P1/P2: この読解・独立jsdom試験範囲で新しい指摘なし。全経路無欠陥という意味ではない。

P3-R1: Menu/Parry/Dodge/Battleの実Animation契約とカード詳細のduration/iterations/fill表示が不一致。実装はfillなし（軽減ではAnimationなし）だがgenericサンプルoptionsのboth/1msを表示する。Parry460/Dodge360msも実420msと異なる（duration差は既存由来）。詳細を開くとコード説明と矛盾する。対象だけ実契約に合わせたmetadata表示・回帰試験を推奨。
P3-R2: Battle implementationCodeでnextを使う一般遷移例なのに終了を常にREADYと表示。実RETURNはFIELD。next条件分岐またはENCOUNTER専用例と明記する。

## 限界
nativeブラウザ矩形/Animation実状態、実機Safari/VoiceOver、全197操作は本担当未検証。ブラウザ結果は実行担当の証跡を別途読取し、自己実行と区別する。修正後の再読取は後続で追記。

## 再レビュー 2026-10-25 21:19 JST
- R1: 対象4renderの詳細を実duration/easing/fillに限定分岐、軽減ではAnimationなしと表示する修正を読取確認。R1解消。
- R2: Battle教材コードのnext条件READY/FIELDを読取確認。R2コード解消。軽減説明文のREADY固定表現を対応状態文字へ揃える軽微な補足を連絡。
- 新規メタ検査を含む28testsを独立再実行、28成功/0失敗/0skip（`/tmp/stage1-independent-recheck.log`）。先の58件とは重複を含み、合算して別試験数にしない。
- 実行担当の旧主要回帰JSON `/tmp/stage1-old-regression.json` を読取。Chromium/WebKit×765/375/390の6条件で機能失敗なし、mobile4条件の全館タイトルCSS文字200%横超過は既存負債としてPARTIAL。実行を本担当が行ったとは扱わない。
- 新対象native結果JSONは読取時0bytes、まだ評価していない。

## 最終証跡再レビュー 2026-10-25 21:29 JST
- Menu CSS height100%/中央配置とBattle軽減説明文の修正を読取確認。R1/R2残件なし。この変更で対象外の実装範囲が広がっていない。
- 実行担当の最終 `/tmp/stage1-native-final.json` を全6条件読取。Chromium141.0.7390.37/WebKit26.0×375/390/765px、各5群PASS、pageerror0。Menuの全3選択×通常/CSS文字200%の中心差は全条件0px。Timing72観測（2展示×2設定×3入力時刻×6条件）はWARNING→EARLY、ACTIVE→成功、LATE→LATEの一致。Battle復帰は全条件FIELD · INTERRUPTED、sceneFIELD。
- Combatはnative paused3本のcancelでidleを確認する条件待ちであり、自然終了による合格ではない。mediaイベントと観測時刻を取得。WebKit375最終は通知174ms、idle観測193ms。初回80ms後pausedの原因はイベント履歴欠測のため未確定として残す。最終結果で初回失敗の経緯を消さない記録は妥当。1500ms以内の条件待ちを、全環境で80ms以内取消保証とは表現しない。
- 設計記録の過去scene差は推定へ修正され、既存負債/検査ハーネス変更/新規実操作結果を区別している。全197・実機・支援技術の合格を宣言していない。
- 総合: 確認したソース・独立jsdom再試験・読取ったnative証跡の範囲で対象5指摘群の修正を支持する。新しいP0/P1/P2指摘なし、独立P3 2件解消。実ブラウザ試験を本レビュー担当が独立実行したという意味ではない。実機iPhone Safari/VoiceOver/実OS設定/全館網羅は未検証。第2段階へ進める前提は満たすと判断するが、人間のDraftレビューを省略する根拠ではない。
