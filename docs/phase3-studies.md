# 第3期 実用UI部品

Issue #41。開始main 3895d6afd900a2e9458c1f04a431963944cea8d8。
2026-10-31 JST。Windows中断後、既存Issueを再利用し独立クラウドcloneで継続。先行6件を保存してから後半6件へ進む。PR #36の差分は取り込まない。

## 受入範囲

- 独立した12用途・状態遷移。旧215展示のファイル・ID・登録を保持。
- 主要入力で描画が変化する。数値ラベルだけの変化は描画PASSにしない。
- 停止/再開/Reset、取消/連打、閉室・切替・画面外・非表示・動き低減の有限処理。
- Chromium 375/390pxと代表desktop、対応可能ならWebKit。実機iPhone/VoiceOver/OS文字拡大は利用不能なら未検証。
- 既存checkを弱めない。WAAPI timeout再発は過去記録と分離、有限切り分け。
- 原典コード・画像・企業アイコンはコピーせず独自HTML/CSS/SVG。出典は技術・歴史参考でライセンス譲渡ではない。

## 先行6件

| ID | 実用部品 | 主確認 | 初期状態 |
|---|---|---|---|
| steps | 工程進捗 | 工程数・次・失敗・同工程再開 | NOT_RUN |
| buffer | 先読み/再生二層 | 取得と再生を別々に変更・上限 | NOT_RUN |
| refresh | Pull to Refresh | 閾値以下取消・超過更新・途中取消・ボタン代替 | NOT_RUN |
| spotlight | 現在位置の照明 | pointer/矢印・半径 | NOT_RUN |
| magnetic | 対象吸着 | 距離/強さ/復元速度・pointer/keyboard | NOT_RUN |
| sort | 挿入予告付き並替 | ghost・drop・cancel・button代替 | NOT_RUN |

後半6は先行checkpoint後に追記。全条件の結果は実施後に記録する。

## A checkpoint（2026-10-31 13:01 JST）

6件は実装済み。全体215件から221件へ追加（最終12件では227件予定）。Chromium 390px実ブラウザで6件の操作前後の描画差・横はみ出しなし・Reset・閉室unmount・pageerrorなしを確認。画像は `phase3-evidence/checkpoint-a/`。工程の完了/失敗/再開、二層帯90/60、更新中から完了、照明移動、吸着変位、並替取消と確定を確認。帯と並替の画像を目視確認。全入力/全幅/実タッチを確認した意味ではない。

新規DOMモック試験16/16成功。lint・型検査・通常build成功。最初の検査失敗は、共通Rangeでlabel内outputが先行しsliderのアクセシブル名が空だった製品不具合。明示aria-labelで修正しRED→GREEN。390pxのrange既定marginによる2px横溢れも修正し実ブラウザ再確認。初回/二回目失敗JSONを保存し成功で上書きしない。

実ブラウザ結果のHEAD欄は変更前base、dirty=true。添付 `source-sha256.txt` のソース内容が検証対象であり、過去baseそのものが成功したとは扱わない。checkpointは後半実装前の途中成果。既定全体試験、375px/desktop/WebKit、独立レビュー、実iPhone/VoiceOverはこの段階では未完了。

Magneticは停止/画面外/非表示時にCSS補間を取消し論理ターゲット位置へ即時反映する。途中補間座標保持ではない制約。先読み帯は連続した単一区間の模擬で、実メディアの非連続buffered ranges全体を再現しない。

### A 独立静的レビューと是正
独立担当がRefreshの完了後に動き低減を解除すると旧loadingが復活するP2を発見。完了を`done`終端状態に固定。動的matchMedia切替の修正前7/8→修正後8/8、部屋9件と合計17/17成功。修正後buildおよびChromium390px6件も再成功。buffer技術表記をSVGからCSSへ訂正。複数指のpointerId同時操作は未検証P3として残す（単一pointer・ボタン代替確認）。独立点検は静的であり実機独立再現ではない。
