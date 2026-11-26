# Stage C API S1先頭10枠：設計差分・受入境界

状態：**DRAFT / DESIGN ONLY／所有者による契約変更3点の承認済み／C実行HOLD**。固定作成元HEAD `91b6ed7c234053ce38f39965a6ee6de68de8dcab`。専用登録は `registration.json`。既存 `docs/phase7d/approval-v2/original/api-preregistration.json`（22枠）は一切変更・置換しない。この書面はC実行承認ではない。

## 1. 変更する範囲と選定根拠

- 元登録22枠の**先頭10枠を同じID・順序・各slot値**で新しい登録案に引用する。AP-CAL-01～04の校正4、旧S1-1 FAIL のAP-01-I0/I1/I2、旧S1-2 PASS のAP-02-I1/I2/I0。
- 実ブラウザは最大10枠。対象はWebKit、Swipe、765×1000、touch、no-preferenceのみ。旧FAIL/PASSは歴史的seed属性であり、新たな測定結果の期待PASS/FAILではない。
- **元22枠のN1/D1・WAAPI13枠・Boundary108枠は対象外**。今回のS1のみで一般的な原因は断定できない。群の順序と水準I0/I1/I2が交絡する。一次読取り後の既存S1 screenshotは過去の一次FAILを発生させた証拠ではない。

## 2. 校正から製品枠へ進む条件（2026-11-20所有者承認）

元annex §4–5では、意図した4097番目マーク超過が技術制御の正しい検出であっても、容量超過は後続停止を要求した。今回の**10枠専用案だけ**で、その条件付き例外を所有者が承認した。承認記録：[PR #88 承認コメント](https://github.com/tetsujisugimori-coder/Loading-museum/pull/88#issuecomment-7036911445)。

AP-CAL-04に限り、容量4096でfirstLost=4097を正しく検出しても、実証拠は`INCOMPLETE`・原因`UNKNOWN`を保持し、製品PASSとしない。校正4件の期待値一致、実原票保存と独立読戻し、回収とcleanup/persistenceの所定結果、想定外エラーや欠測・不正置換なしが確認されて初めて、続く製品6枠へ進むことが**契約上は可能**となる。予期しない容量超過・原票欠損・校正の不一致は即停止。実装・実測による条件成立の確認前、あるいはStage C実行の別承認前に製品枠は開始しない。

## 3. 事前固定の期待と、実測一次原票の区別

事前固定：対象slot・元入力順序・観測種類と順序・世代・policy mode・probe/runner変換元／生成版の完全なbytes/hash・build全出力manifest・配信資源の期待集合とbyte hash・停止規則。I0には監査器の都合だけの追加イベントを要求せず、元の一次getAttribute＋排他的保存を用いる。

事前固定**できない**：未来の一次状態、実行時刻、実イベントのhash、未受信responseのraw bytes。一次は元タイミングで独立採取して不変原票に保存し、その実バイトのSHAを監査担当が別経路で検証する。B-v3合成oracleを実測にそのまま適用しない。受信した監査対象から都合よくoracleを再生成しない。運用での真正性・対応付けはまだ実装／実証されていない。

## 4. 遅延bodyと停止条件の変更（2026-11-20所有者承認）

元annexの「本文欠落／差替えを同slot内で即検知し以後操作を止める」条件と、primaryとcommon followupの**後**でのbody回収は両立しない。所有者は10枠案に限り、**検知後に後続slotを停止する方式Bへ変更**することを承認した。承認記録は上記PRコメント。

遅延bodyの異常が判明した当該slotは**監査FAIL**とし、一次`PASS/FAIL/NOT_TESTED`はそのまま固定する。後続slotの新規開始を禁止し、`mismatchDetected`／`stopRequested`／`stopCompleted`を区別する。既発命令やネットワークを過去に遡って停止したと主張しない。予め検出できるmetadata異常、予期しない容量超過、cleanup/persistence障害などは検知時点で新規操作を禁止し、確定した原因を記録する。

この**規約変更への所有者承認**は、実行器で停止条件が成立した証明でも、ブラウザ試行開始の承認でもない。新しい実行用コード、trusted oracle、実測原票、停止境界は別途局所独立審査する。

## 5. 環境・停止上限・審査ゲート

既存候補はUbuntu24.04／WebKit26.0／Playwright Node1.56.1。実バイナリ・Node/CPU・実装runner/probe・依存・I0/I1/I2出力manifest・ブラウザ受信bytesの証拠は**未取得、固定未成立**。source→build→server送信→browser受信を異なる事実として検証する。観測・body回収がタイミングに影響し得るため、完全中立を前提にしない。

最大**10枠／再試行0／置換0／総壁時計1200秒以内**（停止・回収時間込み）。所有者は**shutdown grace 30秒**を総1200秒の内数として承認した。開始から**1170秒までに新規試行／操作開始を禁止して停止を要求**し、残り30秒で片付け／証拠回収、**1200秒で最終打切り**。停止後の未完を完了扱いしない。停止中は残枠NOT_STARTED、開始済みの未完はSTARTED_INTERRUPTED/INCOMPLETEなどを分離して保存。実際の監督処理・タイマー精度・強制終了時の原票保持は未検証。旧原票の削除・上書きは認めない。

**3件の契約判断（校正04例外／検知後後続slot停止／30秒猶予）は所有者承認済み。** 残る作業は(1)この変更後登録版の対象限定独立審査、(2)実runner／probe／校正・shutdownの有限実装とブラウザなし検証、(3)受信入力から独立したoracle／一次原票の真正性とsource・build・browser実体／配信byte結合、(4)完成版の固定hashと環境に対する所有者の**別途Stage C実行承認**。どれも今回の文書更新では自動成立しない。

PR #88はPARTIAL／Draft・マージNO。Stage B-v3オフライン合成技術PASS、既存WebKit FAIL／原因UNKNOWN／実行bytes結合NOT_PROVEN、本番108 NOを維持。
