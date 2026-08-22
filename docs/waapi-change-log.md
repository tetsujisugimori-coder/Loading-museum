# WAAPI展示室 Change Log

## 2026-08-23 — PR #28 個別モーション再構築

- 47件を維持し、Fade / Slideを手動再生、Button / Toggleを直接操作、有限標本を自動再生、AIを作業中限定ループとして明示的に分類した。
- ゲーム14件の共通ファクトリと共通Actor / Target DOMを廃止し、各標本専用の状態、DOM、キーフレーム、Reset処理へ分離した。
- Parry / Dodgeの成功受付を警告開始後420〜680msへ限定し、早押し、成功、遅延、自動失敗を区別した。
- AI 6件をブロック、リボン、コード行、星群、暖色核、引用ネットワークの固有DOM・固有モーションへ変更し、比較モードでも同じグリフを再利用した。
- 実在しない `observer.onExit` をコード例から除去し、ゲーム14件とAI 6件は表示実装に対応するコードをデータへ収録した。
- 統合前のDamage / Critical / Achievement / Quest / Level Upのデータ、render kind、DOM、CSSを削除した。

## 2026-08-22 — PR #28 追加修正

- 既存32件を監査し、Damage / CriticalをCombat Damage Feedbackへ統合。
- Achievement / Quest / Level UpをReward Reveal Labへ統合。
- 入力、予告、成功・失敗、対象反応、余韻、Resetを持つゲーム標本12件を追加。
- Card Deal / Shuffleを8段階操作へ拡張。
- AI Working Motion 6件と共通状態機械、一括比較モードを追加。
- カテゴリ、操作、視覚要素、状態、着想元の新しい絞り込みを追加。
- 作業中ループの停止条件とreduced motion代替を実装。
- 公開数を47件へ更新し、データ・状態機械・UI回帰テストを追加（最終結果: Node 49件 + Vitest 20件）。
