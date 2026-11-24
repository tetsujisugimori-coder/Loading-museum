# Dial-up & BBS Gallery 第1便 歴史資料台帳 v0.1
調査日：2026-11-24 JST。所在・本文と、原画像・実通信・再配布権利・ファイル保全を区別する。今回、原PDFの画像表示（スクリーンショット）を試したがアクセス制限により失敗しており、「原画像照合済」は0件。公開ログの生バイト・原実機通信記録は未取得。「保全済・独立再取得照合」は0件。

## S01：300bps・BBSの当時の記事
- 出典：Personal Computer World, November 1983, Bulletin Boards
- URL：https://www.worldradiohistory.com/UK/Personal-Computer-World/80s/PCW-1983-11-S-OCR.pdf
- 種類：当時の雑誌記事。PDF抽出本文で300bps、約30文字/秒と7E1/8N1の説明が見つかった。
- 対象：03 低速文字表示。原画像のページ直接確認は403で未了。実際のBBSの全応答時間は証明しない。
- 権利：転載許諾未確認。展示内容は独自作例で制作。

## S02：VT100 User Guide（メーカー資料）
- 出典：Digital Equipment Corporation, VT100 User Guide, second edition, January 1979
- URL：https://bitsavers.org/pdf/dec/terminal/vt100/EK-VT100-UG-002_VT100_User_Guide_Jan79.pdf
- 種類：メーカー一次資料のスキャン。抽出本文でjump/smoothの2方式、およびsmooth scrollの制約に関する記載を確認。
- 対象：05 掲示板連続スクロールの参考端末モデル。
- 注意：PDFスクリーンショットは403。特定の日本BBSがこのモードを使ったことは未証明。転載許諾未確認。

## S03：VT100 Technical Manual
- 出典：Digital Equipment Corporation, VT100 Technical Manual, July 1982
- URL：https://bitsavers.trailing-edge.com/pdf/dec/terminal/vt100/EK-VT100-TM-003_VT100_Technical_Manual_Jul82.pdf
- 種類：メーカー資料の公開スキャン。スクロール領域と走査線単位のsmooth scrollに関する検索本文。
- 対象：05。原画像、実機の挙動、XON/XOFFの詳細は今後照合。権利未確認。

## S04：日本のパソコン通信サービスの歴史的背景
- 出典：財団法人日本情報処理開発協会編『情報化白書1990』
- URL：https://www.jipdec.or.jp/archives/publications/J0005024.pdf
- 種類：当時に近い国内資料。PDF抽出本文の「パソコン通信サービス一覧（1989年7〜8月現在）」にPC-VAN、NIFTY-Serve、ASCII NET等の提供状況・開始時期の一覧。
- 対象：04。原画像はサイズ上限エラーにより未確認。画面演出・文字コードは読み取れない。転載許諾未確認。

## S05：1987年のNIFTY-Serve投稿ログ（後年の当事者公開）
- 出典：松田純一、FMACCG談話室（1987年8月2日〜1988年12月30日などの投稿から本人分を後年掲載）
- URL：https://appletechlab.jp/blog-entry-125.html
- 種類：当時の投稿内容を後年HTMLで再掲載。投稿日時・発言番号・全角/半角・改行などの例が見える。
- 対象：04/05。著者が他者の発言の公開を避けた経緯、ニフティへの確認が本文に記載。**サイト掲載許諾は当館の転載権を意味しない**。生通信バイト、元端末の速度・文字コード、画面自体は未確認。

## S06：NIFTY-Serve鉄道フォーラム過去ログ
- 出典：鉄道フォーラム「パソコン通信(NIFTY-Serve)時代の過去ログ」案内
- URL：https://railforum.co.jp/ftrain/public/logtty_setumei.html
- 公開通知：https://www.railforum.jp/ftrain/sp/view.php?Xbno=58&Xvno=235&act_view=true
- 種類：当時の会議室のデータを後年保存。1987年以降のログ、同意した投稿のみの公開、LZH保管を案内。
- 対象：04/05/10。今回、案内の一部ページは検索結果で確認できたが直接再取得は502。実ログ/LZHは未取得。閲覧ID等が必要な場合がある。個別の再利用許諾未確認。

## S07：日本語エンコーディングの同時代規格
- 出典：RFC 1468, Japanese Character Encoding for Internet Messages, June 1993
- URL：https://www.rfc-editor.org/info/rfc1468/
- 種類：Internet mail/news用の当時の仕様。ESC $ Bで日本語へ、ESC ( BでASCIIへ切替という説明を確認。
- 対象：04の「文字集合切替の考え方」を観察する比較モデル。
- **重要**：NIFTY-Serve/PC-VANの通信文字コードを確証する資料ではない。

## S08：Telnetの対照仕様
- 出典：RFC 854, Telnet Protocol Specification, May 1983
- URL：https://www.rfc-editor.org/info/rfc854/
- 種類：当時のTCP/Telnet標準。Network Virtual Terminal、オプション交渉、行単位送信等を規定。
- 対象：将来の端末モード比較。モデムで直結するBBSと混同しない。

## S09：後年の国内パソコン通信史の説明
- 出典：JPNIC Newsletter No.57, 2014年8月、前島一就による回顧
- URL：https://www.nic.ad.jp/ja/newsletter/No57/0320.html
- 種類：サービス関係者の後年の歴史説明。NIFTY-Serveの1987年開始とパソコン通信のサービス形態の概要。
- 対象：04の背景。原画面やバイト列の一次資料には置き換えない。

## S10：VT100の機器史の補助資料
- 出典：Columbia University Computing History, The DEC VT100 Terminal
- URL：https://www.cc.columbia.edu/cu/computinghistory/vt100.html
- 種類：後年の機器解説。1978年、80×24などのモード、スクロール技術を概説。
- 対象：05の機器背景。詳細はS02/S03優先。

## 追加資料の登録テンプレート
- sourceId / title / originalDate / publisher / medium / originalOrRepublished / sourceUrl
- accessStatus / inspectedSection / originalImageStatus / rawBytesStatus / rightsStatus / personalDataReview
- acquiredAt / sha256（実ファイル取得時だけ）/ preservationStatus / linkedCandidateIds / gaps
初期12候補以外の発見は新規candidateIdで蓄積。説明だけの資料から「その速度・表示が当時のその機種で使われた」と断定しない。歴史的な内容・機器の仕様・現代の動きの演出を別々に評価する。

 
## 2026-11-24 再照合（第1便最小試作）
- S01：目次で Bulletin Boards の開始頁148を確認。PDF直取得403。原画像は未照合。
- S02：p.16の抽出本文でsmooth scroll最大6行/秒、ホストとAuto XON/XOFFの必要性を再確認。PDF直取得403、別ミラーのファイルも500。原画像未照合。HTML転記 https://oldmanprogrammer.net/webapps/vt100/doc/vt100-ug/chapter3.html のDECSCLMも6行/秒。
- S03：4.7.6 p.4-95の抽出本文で60Hz時に走査線単位、6行/秒、2フレーム遅延の記述を確認。画像未照合。試作は表示時間のみで実機の走査線・フロー制御は再現しない。
- S04：直取得はサイズ上限エラー。原画像未照合。
- S05：当事者のHTML再掲載を直接読取り。全角英字、半角カナ、手動改行および本人投稿のみ公開した経緯を確認。生バイト、端末、転載権利は未確認。
- S07：RFC Editorの公式原文 https://www.rfc-editor.org/rfc/rfc1468.txt を直接閲覧。pp.1–2と4のESC $ B、ESC ( B、2バイト・2表示列、行末までのASCII/Roman復帰条件を確認。日本の商用BBSの符号化方式はUNKNOWN。試作のISO-2022-JP/Shift_JISは教材用でありRFC全体の適合試験でもない。
- PDF screenshotは取得エラー後に再試行したがPDFとして解決できず失敗。元ファイル取得・ハッシュ・承認済み保存先からの独立再取得は未実施。原画像0件、原通信0件、保全0件のまま。史料は本文確認と原物照合を分離し総合PARTIAL。
