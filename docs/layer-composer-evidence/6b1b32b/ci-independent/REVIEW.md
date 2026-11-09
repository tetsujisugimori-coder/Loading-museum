## 独立再受入レビュー — Layer Composer 第6期A-6

**総合 PARTIAL / 検証済み実装範囲 PASS / 限定マージ推奨 YES。** 実機未検証を含む全環境の完成認定ではありません。Draft・未マージを維持してください。

### 固定対象
- HEAD: `6b1b32b6cd6d8684ab622043960277824925a348`
- tree: `9201452b568748c1bc7ddda6c3d383648d32ba9e`
- baseline main: `ab05ffa4e95a68bc387bcfbd04a16bad6e331a75`
- source SHA256: `fa92ac854e326974851143f5a822ab0dc1739a685600598e4ba913c8ff532c10`

実装担当とは別の担当としてGitHubから独立clone/fetchし、最終HEADを固定して再実行しました。既存practical実装・public資産53ファイル、他のデータ21ファイルのGit blob一致、既存画像4記事の完全保全を確認しました。

### 発見事項と同一反例の再検証
1. **P2-01 修正済み**：透明度スライダーを領域外で離すと操作中状態が残る問題を実Chromiumで再現。inputのpointer captureだけでは再現が残りました。対応IDに限定したwindow pointerup処理後、Chromium/WebKitで解除を確認。Escape取消後の遅い移動・releaseでも状態と履歴を保全。
2. **P2-02 修正済み**：証拠検査器が文字列/Infinityの件数、ケース別PNG欠測を受理。厳密数値と各条件のexport PNG・screen PNG・trace完全セット/hash照合へ修正。同じ異常型・欠測反例の拒否を再実行。
3. **表示不具合 修正済み**：旧WebKit画像でnative selectの暗背景・暗文字を確認。最終buildの375/1280px画像では白地・暗文字となり可読性を目視確認。303版へのCSS注入比較と、最終6b版の実画面は別証拠です。

今回の変更範囲で未解決P1/P2は認めません。

### 独立再実行
- 最終HEADの既存モデル/UI試験再実行：42 PASS。
- 証拠契約・故障対照：34 PASS。
- clean checkoutからbound production build成功。
- 独立作成ブラウザ試験：Chromium/WebKit × 375/1280px × DPR1/2、**8/8 PASS**。ダウンロードPNGを復号し、各ブラウザ内で全RGBA hashの完全一致を確認。出力は600×400px。
- 同じ8条件で領域外releaseとEscape後の遅延入力を再検証。
- 独立の手計算期待値を用いた固定1px画像でNormal/Multiply/Screen/50%alphaを検証。WebKitは一致、Chromiumは最大1LSBの量子化差内。製品の期待値計算関数は再利用していません。

### 最終CIと原artifact
[最終 Layer Composer run 42629099303](https://github.com/tetsujisugimori-coder/Loading-museum/actions/runs/42629099303) の**8jobs SUCCESS**を独立照会し、全8原ZIPを取得しました。
- artifact IDs: 13682800418, 13682576501, 13682238207, 13681883711, 13681848174, 13681423364, 13681149452, 13680959062
- GitHub提供archive SHA256と取得ZIPが全8件一致。
- 各ジョブのcheckoutログ、bound-buildログ、reportのHEAD/tree/sourceHashが上記固定対象と一致。manifest outputHashも対応ログと一致。
- **16条件・272チェック・32PNG・16trace**。全条件の必要ファイル、hash、ZIP/trace CRCを確認。
- PNG32枚を独立復号し、出力PNGのRGBA hashを照合。報告内oracleの576画素も別の式で再計算し許容2LSB以内で一致。
- 全12 workflowsのSUCCESSも確認。ただし既存workflowのmerge-ref実行と、新8jobsの明示HEAD checkout証拠は同一視していません。

**証拠上の限界**：CIの全outディレクトリはartifactに含まれません。CI outputHashは実行manifestとジョブログの整合性確認であり、CI配布ファイル全体をオフライン再計算したものではありません。独立ローカルbuildでは全out hashを照合しています。

### 証拠・未検証範囲
[独立原証拠ZIP](https://github.com/tetsujisugimori-coder/Loading-museum/blob/49ff9511d0d04a9e671e1f4ae1532444d04f5f45/docs/layer-composer-evidence/6b1b32b/independent-evidence.zip)
SHA256: `acb92f4fabed272ed3fa73bc616e1a7452380aace2dd3591900a865944dd2ee4`

旧HEADのRED/中間GREENと最終HEADを分離。上記ZIPは独立ローカル検証を保存し、CI検証は今回のレビューに追補しています。

物理iPhone Safari、物理タッチ/キーボード、VoiceOverはNOT_TESTED。A5のnative range/pointercancel問題、Issue #44/#54等の既存課題の解決は主張しません。マージ・Draft解除・本番公開は行っていません。
