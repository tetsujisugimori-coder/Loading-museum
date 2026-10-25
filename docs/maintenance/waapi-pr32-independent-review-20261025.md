# Loading Museum Draft PR #32 独立再レビュー

- レビュー日: 2026-10-25 JST
- レビュー担当: ChatGPT (GPT-6)
- 対象PR: https://github.com/tetsujisugimori-coder/Loading-museum/pull/32
- レビュー対象HEAD: `8dfb7392baa866e32d9612ff5c74bd308685ee06`
- 対象ブランチ: `fix/waapi-state-consistency`
- 判定: **条件付きマージ可（対象3件の修正はコード上で解消。全館はPARTIAL）**

## レビュー方法と証拠の境界

GitHub上のPR状態、対象コミットと前回HEAD `63ed9cd55a5f48e602f7a8d16b1056eb7b7c0a0f` の比較、実装ソース、追加テスト、実ブラウザ検証用スクリプトと検証記録を読んで評価した。**レビュー担当自身は `npm run check`、`npm run build`、ブラウザ操作を実行していない。** 成功件数やブラウザ結果は実装担当の検証記録に基づき、実行を伴う独立確認と区別する。

参照:
- `app/components/waapi-board-state.ts`
- `app/components/WaapiExpandedPreviews.tsx`
- `app/components/WaapiSampleGallery.tsx`
- `app/data/waapiAdditionalSamples.ts`
- `tests/waapi-cascade-motion.test.tsx`
- `scripts/verify-waapi-browser.py`
- `docs/maintenance/waapi-cascade-motion-20261025.md`
- `docs/maintenance/waapi-cascade-browser-results-20261025.json`

## 前回指摘3件の再評価

| 指摘 | 判定 | 根拠 |
|---|---|---|
| P2: Match-3に2段以上の実連鎖がない | 解消（コード確認） | 3列×4行の初期盤面は初期一致なし。通常の隣接交換 index 8/11 から5石消去→落下→3石消去。連鎖2段・合計8石・800点。行列の一般判定を維持し、特定座標による成功例外はない。 |
| P3: 石の演出が実交換・消去・落下に対応していない | 解消（コード確認） | `exchangeGems` が石IDを維持した `frames` と `steps` を返し、同じ履歴から演出を構築。論理結果は同期確定し、装飾用レイヤーをWAAPIで段階再生。状態確定を `fill` や完了callbackに依存させない。 |
| P3: 実行途中のReduced motion切替で旧Animationが残る | 解消（対象範囲のコード確認） | 対象ゲームの `useRuntime(active, reducedMotion)` が軽減ONで登録済みAnimationをcancel。OFF後は次操作から演出を開始。Reset・画面外・アンマウント時にも停止。 |

### 盤面の実例と計算

初期盤面（3列×4行）:

```text
◆ ◆ ●
◆ ◆ ●
● ● ◆
◆ ● ●
```

0始まりの index 8 と11を交換すると1段目で5石を消去。列落下で生じる2段目の一致3石を消去する。全消去数8石、得点800点、最終盤面に4石が残る。交換の可否、一致判定、落下、再判定、得点計算は盤面から導出される。不成立・空セルの操作を拒否し、Resetで初期盤面へ戻すテストが追加されている。

### 演出・操作・Resetの整合性

石IDによる履歴を生成し、描画された確定盤面とは別の `aria-hidden` レイヤーで交換・消去・落下を再生する構造を確認した。アニメーション中にpointer/focus/dragで再操作する場合は旧演出を取り消して確定盤面に戻す設計が加わった。Reduced motion途中ONでは登録済みAnimationをcancelし、状態・得点を変更しない。HPのtimeout取消＋世代管理、Inventoryの単一状態、Lock-onの対象所属方式は維持されている。

## テスト・実ブラウザの記録

- 提出された最終検証: Node 49件 + Vitest 53件 = **102件成功、失敗0、skip0**。旧88件を保持し14件を追加。
- `npm run check`（lint、型、静的build、テスト）および `npm run build` は、実装担当の報告では成功。
- Chromium 141 / WebKit 26.5、765・375・390px の6条件で対象9検査群成功、pageerror 0というブラウザ記録を確認。
- 段階演出の検査では、native Animationの時刻を制御して交換→5石消去→落下→3石消去を検査。Reduced motionではAnimationの中間時刻からの取消を確認し、自然終了を取消成功と取り違えない設計。
- ブラウザ結果は **765pxの2条件PASS、375/390pxの4条件PARTIAL**。既存の全館タイトル文字200%横超過により、全館PASSとはしない。
- 最終HEADのPR-triggered Actions実行記録とcommit statusesは各0件。**実CI成功とは扱わない。**

## 保全事項と未検証・既存負債

- 既存150展示 + WAAPI47展示の計197展示、検索・分類・集計、およびPages公開設定を保持したという実装記録を確認。全197展示を独立して実操作したわけではない。
- 実機iPhone Safari、VoiceOver、OSソフトキーボード、OS設定画面、非表示タブは未検証。
- 全館見出しの文字200%横超過、およびFlash/WAAPIの `typewriter` ID文字列重複は既存課題として残る。
- Draft PR #31は独立・未マージ。両PRが `LOG.md` と `package.json` を変更するため、#32マージ後の#31統合では双方の追記・テスト登録を保持して再検証すること。

## 総合判断と推奨手順

**PR #32の対象修正としては条件付きマージ可。** 前回のP2 1件・P3 2件を解消しており、今回確認したソース範囲に新たなマージ阻害級のP0～P2は確認しなかった。ただし、これは全館の品質PASSや実機アクセシビリティの保証ではない。

人間が最終確認した後、PR #32のマージを推奨する。続いてPR #31を最新mainへ統合し、`LOG.md` と `package.json` の競合を解消して回帰試験を行う。文字200%の全館タイトル問題は別の保守課題として追跡する。

この記録は**レビュー結果の文書化のみ**を目的とする。実装コードの変更、PRのマージ、公開操作、実CI実行は含まない。
