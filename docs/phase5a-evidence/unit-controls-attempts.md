# 子担当単体試験実行記録（JST）

2026-11-01。新規展示の実装者による自己検証であり、独立レビューではありません。

1. 19:24:54 `vitest run tests/phase5-data.test.tsx tests/phase5-navigation.test.tsx`：data 8 PASS。navigation は `Phase5Lists.tsx` の JSX 閉じ括弧不足で collect error、exit 1。担当親が構文を修正。原出力は実行ツール記録に存在し、保存ログ原本は未取得。
2. 19:25:13 同コマンド：19 PASS / 1 FAIL / 0 SKIP、exit 1。treeitem の accessible name に aria-hidden の「・」を含めた試験セレクターが誤り。出力の accessible roles が示す `動きの標本` にセレクターを訂正。折畳み後の非表示・focus・selection の期待値は維持。製品変更なし。原出力は実行ツール記録に存在し、保存ログ原本は未取得。
3. 19:25:22 同コマンド：20 PASS / 0 FAIL / 0 SKIP、exit 0。保存原本 `unit-controls.log`。
4. `getByRole` の無効な `exact` option を除去後 `tsc --noEmit` exit 0。担当 TSX の ESLint exit 0。

テスト設計上の selector/type 訂正を製品 RED→GREEN と呼ばない。実ブラウザは親担当の別証拠であり、この jsdom 結果に含めない。
