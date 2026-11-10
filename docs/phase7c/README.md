# 第7期C Motion Composition Studio

Issue #85。基準 main `547c7d7a460d40bf90591d842cb354ef13958b8a`（第7期B PR #84統合済み）。着手時280展示・13室を監査。AGENTS.mdとリポジトリ内追加skillは存在しなかった。既存README・各試験の契約に従う。未マージ診断PR #70/#72/#74/#76/#78へ依存しない。

## 範囲

現代アニメーション常設展の第4コレクション。6作品を追加して286展示・13室。歴史145、現代164、横断23（横断は複製ではない）。既存280登録の完全一致を `scripts/audit-phase7c.mjs` で検査。原典9作品と既存データファイルもbyte照合。

| 作品 | 学習価値と既存との差 | 手段 |
|---|---|---|
| Stagger Motion | cascadeの固定標本と異なり順序・個数・予定と観測を変更比較 | 独立時間区間とrAF |
| Sequence Builder | 直列の移動・回転・拡大・フェードを編集・seek | 決定的時間軸 |
| FLIP Layout Transition | Expanding Cardの指定寸法補間とは異なる実DOMのFirst/Last | 実矩形差分とtransform |
| Motion Path | 自由運動と異なり曲線上の距離・接線方向 | SVG経路と距離 |
| Parallel Choreography | 直列でなく独立区間の時間的重なり | 要素別開始・duration・easing |
| Transition Relay | 読込結果でなく退場/配置/登場の段階と逆転 | 状態遷移と取消 |

## 共通契約

鑑賞を初期体験とし、操作と仕組み観察は展開可能。設定、モデル計算、実DOM実測、未観測を区別する。画面に描画されるtransformの計算値を画素の実測とは呼ばない。フレーム観測は画面物理出力時刻の計測ではない。外部通信・外部画像・runtime依存の追加なし。再生中の変更は旧処理を無効化し、停止・非表示・閉室後に旧処理を再開しない。取消後の再開は新しい再実行と区別する。

## 検証計画（実施結果ではない）

単体/状態/境界/故障対照、全既存試験、Chromium/WebKit×375/390/765/1280×通常/reducedの16条件。作品操作・resize・keyboard・取消・連続入力・閉室を実検査。A/B回帰と既存WAAPI/Flash/検索/旧URLを別検査。source HEAD/tree、build digest、原JSON/PNG/traceを保存。最終CIと独立レビュー後に受入を確定する。

既存の件数assertだけ280→286に更新し、A/B6作品等の期待値・検査条件は維持。以前の監査スクリプトも現在総数だけ更新し、旧基準登録の保全比較は維持する。

## 境界

実機iPhone Safari・VoiceOver・物理入力はNOT_TESTED。#44、#54、Image Adjustment Lab native WebKit touch、旧WebKit timeout原因UNKNOWNを保全。本工程はそれらの解決・Draft解除・マージ・本番公開を許可しない。

現在は実装中。総合・CI・独立受入は未判定、マージ推奨NO。
