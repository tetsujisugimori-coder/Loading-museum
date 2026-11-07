# 第6期A-5 独立レビューへの引継ぎ

この提出は実装担当による自己検証。独立受入ではなく、独立レビュー前のマージ推奨はNO。Draft維持。#44、#54を継続し、main/公開設定を変更しない。

## 重点
1. 独立の小配列から式・順序・丸め・alphaを再計算し、Canvas画素／PNG／256binを照合する。自前oracleを含む自己検査器のPASSを前提にしない。
2. 16条件でnative rangeの実配送、Enterフォーム、Escape/cancel/blur/resize/Reset、画像切替中の遅延入力と所有権を確認する。
3. 元画像はmanifest固定hash。画像ID取り違い、原画破壊、結果欠落、古いHEAD、incomplete matrix、PNG改変を負対照として拒否する。
4. ヒストグラムは補正Canvasと同じRGB配列。DOMのdata属性だけで描画成功としない。SVG線と凡例、数値、縮尺も目視する。
5. 全館267既存展示の登録固定と13室維持、隣接A1〜A4、実用UI5A/B、Flash、WAAPIの回帰。既存UI・SDK・依存の修正は本件で行わない。

## 開発中に得た反例（消さない）
- Chromium375：root高さを含むResizeObserverがプレビュー自身の高さ変化で取消。幅のみの監視へ修正。原JSONは開発失敗証拠に保持。
- WebKit375：native rangeへの明示setPointerCaptureでdragのinput/changeが配送されず0のまま。captureのみno-opの対照で53へ動く。native挙動へ戻しdocument release/cancelで補完。修正後両engine smoke通過。
- 初回回帰：登録数とA1〜A4配列の旧期待値が新規A5を拒否。新しい1件を追加した期待値へ更新。操作検査を削除・緩和していない。
- 大きなRGBA配列のVitest深い同値比較が5000ms超過。全byteのBuffer.equalsと参照identity booleanへ置換し、全画素比較を維持。timeoutの増量なし。

## 明示的NOT_TESTED
物理端末、実機Safari、VoiceOverなど支援技術、物理キーボード/マウス/タッチ、OS文字拡大・OSバックグラウンドの実操作、WebKit native touch drag。Playwright実配送mouse/key/touch tap、合成pointercancel、CSS 200%テキスト変更は区別する。

## 証拠
最終HEADで新規Verify Image Adjustment workflowを実行し、原JSON、イベント、PNG、hashをHEAD名付きActions artifactへ保持する。提出後のConversation報告に最終HEAD、tree、run/job/artifactの対応とローカル結果を記録する。ローカル失敗・回復履歴も別の証拠束に保持。過去HEADの証拠は最終HEAD成功の代替にしない。
