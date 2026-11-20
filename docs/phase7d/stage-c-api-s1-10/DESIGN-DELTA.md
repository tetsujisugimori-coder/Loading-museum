# Stage C API S1先頭10枠：設計差分・受入境界

状態：**DRAFT / DESIGN ONLY / C実行HOLD**。固定作成元HEAD `91b6ed7c234053ce38f39965a6ee6de68de8dcab`。専用登録は `registration.json`。既存 `docs/phase7d/approval-v2/original/api-preregistration.json`（22枠）は一切変更・置換しない。この書面はC実行承認ではない。

## 1. 変更する範囲と選定根拠

- 元登録22枠の**先頭10枠を同じID・順序・各slot値**で新しい登録案に引用する。AP-CAL-01～04の校正4、旧S1-1 FAIL のAP-01-I0/I1/I2、旧S1-2 PASS のAP-02-I1/I2/I0。
- 実ブラウザは最大10枠。対象はWebKit、Swipe、765×1000、touch、no-preferenceのみ。旧FAIL/PASSは歴史的seed属性であり、新たな測定結果の期待PASS/FAILではない。
- **元22枠のN1/D1・WAAPI13枠・Boundary108枠は対象外**。今回のS1のみで一般的な原因は断定できない。群の順序と水準I0/I1/I2が交絡する。一次読取り後の既存S1 screenshotは過去の一次FAILを発生させた証拠ではない。

## 2. 校正から製品枠へ進む条件（規約差分・未承認）

旧annex §4–5は、意図した4097番目マーク超過を校正技術上の期待検出とできても、容量超過時の後続停止を定める。従って**現行規約のままでは校正4を終えた時点で残り6枠をNOT_STARTED**とする。

今回の新たな提案は、AP-CAL-04に**限り**、4096容量／firstLost=4097を期待どおり検出した場合に、証拠`INCOMPLETE`・原因`UNKNOWN`を変更せず、全4校正の期待一致・実原票保存・読戻し・cleanupとpersistenceの所定成功を前提に、製品6枠への続行を例外的に許可するもの。予期しない超過、欠測、逸脱、真正性不明は従来どおり停止する。**例外は独立審査と所有者の別承認があるまで採用しない。** 技術制御PASSと試験結果／証拠COMPLETEを混同しない。

## 3. 事前固定の期待と、実測一次原票の区別

事前固定：対象slot・元入力順序・観測種類と順序・世代・policy mode・probe/runner変換元／生成版の完全なbytes/hash・build全出力manifest・配信資源の期待集合とbyte hash・停止規則。I0には監査器の都合だけの追加イベントを要求せず、元の一次getAttribute＋排他的保存を用いる。

事前固定**できない**：未来の一次状態、実行時刻、実イベントのhash、未受信responseのraw bytes。一次は元タイミングで独立採取して不変原票に保存し、その実バイトのSHAを監査担当が別経路で検証する。B-v3合成oracleを実測にそのまま適用しない。受信した監査対象から都合よくoracleを再生成しない。運用での真正性・対応付けはまだ実装／実証されていない。

## 4. 遅延bodyと即時停止の未解消点（規約差分・未承認）

元annexは必要なbody不一致／欠落の**同slot内即時停止**を要求する一方、本文回収をprimaryとcommon followupの**後**へ延ばす。この両立はできない。従来強い契約のままなら実行HOLD。

代替**提案**：本文確認後に異常が判明した場合、当該slotは監査FAIL、元primary結果は固定したまま、**後続slot**を禁止する。`mismatchDetected`、`stopRequested`、`stopCompleted`を別々に観測し、進行中の操作を過去に遡って停止したとは言わない。事前に検出できるmetadata異常や予期しない容量超過・cleanup障害は直ちに新規操作禁止。**停止契約変更は別の独立審査・所有者承認が必要。**

## 5. 環境・停止上限・審査ゲート

既存候補はUbuntu24.04／WebKit26.0／Playwright Node1.56.1。実バイナリ・Node/CPU・実装runner/probe・依存・I0/I1/I2出力manifest・ブラウザ受信bytesの証拠は**未取得、固定未成立**。source→build→server送信→browser受信を異なる事実として検証する。観測・body回収がタイミングに影響し得るため、完全中立を前提にしない。

最大**10枠／再試行0／置換0／総壁時計1200秒以内**（停止・回収時間込み）。shutdown graceは**30秒を候補**とするが未承認・実環境検証前であり、1200秒への加算はしない。停止中は残枠NOT_STARTED、開始済みの未完はSTARTED_INTERRUPTED/INCOMPLETEなどを分離して保存。旧原票の削除・上書きは認めない。

**審査に必要な決定は、(a) AP-CAL-04例外、(b) 停止契約差分、(c) 原票と外部oracleの真正性、(d) 実環境／配信資源／停止猶予の確定、(e) 10枠登録の独立再審査と本人による対象版の実行承認**。どれも今回の文書保存・GitHub提出では自動承認されない。

PR #88はPARTIAL／Draft・マージNO。Stage B-v3のオフライン合成技術PASS、既存WebKit FAIL／原因UNKNOWN／実行bytes結合NOT_PROVEN、本番108 NOを維持。
