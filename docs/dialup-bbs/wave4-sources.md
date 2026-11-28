# BBS 第4便：出典台帳（2026-11-28 JST参照）

以下は参照・要約のみ。原資料、画像、音声、配布プログラム、ゲーム本文は同梱・転載しない。レトロ端末の画面、音声なしの演出、架空BBSとゲームの名称・文章・絵・バランスは本展示独自。

| ID・区分 | 資料・参照箇所 | 裏付けと適用範囲／限界 |
|---|---|---|
| W401 同時代一次 | [TeleGrafix Communications, RIPscrip Protocol Specification 1.54](https://files.mpoli.fi/pub/unpacked/software/programm/pascal/ddplus71.zip/_riplink.zip/ripscrip.doc)、文書内日付1993-07-19、配布アーカイブ鏡像。Overview / Protocol Specifics / RIPscrip Level 0, Level 1 | 640×350、16色、MegaNums（大文字base36）、区切り・描画状態とクリック領域。全命令や元のフォント・ピクセル、線種、RIPterm実機互換は対象外。仕様は権利表示付き。 |
| W402 同時代の運営者記録 | [FALI Newsletter、Bill Julson『FALI gets RIPPed!!』](https://cdn.ymaws.com/www.fali.org/resource/collection/838A0A5D-2D0C-4794-9488-72106A9E5289/1994-06_June.pdf#page=5)、1994年6月、p.5 | FALI BBSでメール、フォーラム、ライブラリのグラフィカルな選択。文字入力も可能。RIPTM154.EXEの実配布記述。実行・画面復元は未実施。 |
| W403 後年の当事者回顧 | [Synchronet 作者のRIPアーカイブ](https://wiki.synchro.net/history:museum:rip)、当時の画像例とBBS側実装回顧 | 導入事例のみ。歴史画面を複製しない。普及率は不明。 |
| W404 ベンダー発表 | [Introducing RIP-2（TeleGrafix、電子メーリングリスト鏡像）](https://www.math.rwth-aachen.de/~Martin.Schoenert/Cube-Lovers/TeleGrafix_Information__Introducing_RIP-2_Multimedia_Graphics_for_the_Internet.html)、1996-01-06 | 初代RIPの1993年導入に関するメーカー回顧。RIP-2/RIPterm 2.2は後代で、本展示の1.54構文根拠に用いない。普及の主張は独立確認なし。 |
| W405 同時代一次 | [Legend of the Red Dragon v1.7 LORD.DOC](https://discmaster.textfiles.com/view/40218/minerva2.zip/minerva2/BBS_DOOR/LORDV17.ARJ/LORD.DOC)、1992-05-24、SysOp導入／データ・保守ファイル | 外部実行とドロップファイルのパス、PLAYER.DAT、日次保守、SCORES.TXT、ANSI終了表示。版限定。ゲーム文面・画像・実行ファイルは使用しない。 |
| W406 同時代一次 | [Synchronet v2.10変更履歴](https://synchro.net/docs/v210_new.txt)、1995年、External Programs | 外部プログラムとのDOOR.SYS／DORINFO1情報受渡し、終了復帰。すべてのDoorが同じ形式を使うわけではない。本作はブラウザー内の状態遷移のみ再現。 |
| W407 後年の作者証言 | [Gary MartinへのTradeWars 2002インタビュー](https://breakintochat.com/blog/2019/07/19/gary-martin-creator-tradewars-2002/)、2019-07-19、初期版・ANSI制作・オンライン化の節 | 初版1991年とANSI画面制作を確認。異なる版の戦闘・同期性を本作へ混同しない。 |
| W408 後年の運営者記録 | [Bobby’s World BBSのLORD紹介](https://www.bobbysworldbbs.com/lord.html)、更新年不詳、v4.00aの運営履歴と操作説明 | 森の行動回数制限・時間差の対戦通知の事例。制限の値や模擬ランキング変動は本展示仕様であり、LORD v1.7やTradeWarsの仕様ではない。 |
| W409 後年の運用資料 | [WWIVのTradeWars 2002設定](https://docs.wwivbbs.org/en/wwiv500/tradewars2002/)、WWIV 5.0向け | DOS door 3.09と後代の独立サーバーを区別。運用していない。 |

比較の条件：同じ架空メニュー・同じ通信速度・8N1の単純モデルで、RIPscripのASCII命令実バイトとANSIの制御・文字実バイトを数える。ドロー情報量、応答の形式・画面密度・見た目は同一ではなく、一般的な優劣を証明しない。モデル秒はビット数÷bps。ブラウザの経過時間は操作・一時停止・処理の影響を受ける別の値。

Door の実在アカウント・電話番号・通信は使わない。日次は本物のカレンダーでなく手動進行、他の参加者は架空。BBS本体や外部実行ファイルの起動は模擬するだけ。実物のRIPterm、当時の回線やVGAの画素、Door実機・外部BBS接続は未検証。
