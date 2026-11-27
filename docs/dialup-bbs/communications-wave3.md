# BBS第3便：モデムと通信処理

関連 Issue #92。基準は PR #95 を統合・公開した main `df8dd370593ef7dc904e3bb7a2e0dc11446be588`（tree `a614d7ef63a18516945aa1b6f8c02b03b0fc7cd0`）。13室を維持し、固定版292件と旧6作品の実体・URLを保ったまま、MS-DOS室に4件を追加する。現行296件、BBS 10作品、歴史155／現代164・横断23。

| ID | 操作して確かめること | 境界 |
|---|---|---|
| bbs-09 | Courierの表示灯7種類の状態、DTR、キャリア、送受信活動、切断 | 活動は通信イベントで更新。ランプの応答時間・発光は演出。図と表が一致しないOH/NSは筐体灯として採らず、オフフックは別のモデル状態として表示。AAは無効の発信例のみ。 |
| bbs-10 | AT、発信、呼出、ハンドシェイク、CONNECT/DTR切断／BUSY・NO CARRIER・NO DIAL TONE | 自由入力も電話番号もない。ATD[DEMO]は実行不能な記号。V.8/V.34の信号波形・モデム音なし。 |
| bbs-11 | チェックサムを実際に再計算し、確定データ・再送・通信量の違いを比較 | チェックサム版XMODEMの限定モデル。3回上限・キャンセルは展示ルール。ファイル名は展示情報でXMODEMが伝えるのではない。YMODEM/ZMODEMや中断箇所からの永続再開は実装外。 |
| bbs-12 | 架空の掲示板を巡回し、途中失敗・再接続・保存済みログの閲覧を比較 | 手動モードは同じ工程を一つずつ確定。架空サービス、接続・認証・保存は模擬、ログはメモリのみ。自動巡回は定型操作でAIではない。 |

初期設計草案の候補ID 01（モデムLED）・02（ダイヤル）・09（転送）・10（自動巡回）と、今回確定する永久ID bbs-09〜bbs-12 は別体系。初期候補の番号や第1・第2便の永久IDは変更しない。

## 史料台帳

参照日はすべて2026-11-27 JST。原文や紙面・動画・ソフトを転載せず、リンク・書誌・事実のみを利用。メーカーPDF内の実在宛先は作品・試験データに使用しない。

| ID | 資料／版 | 参照箇所・適用範囲 | 未確認／扱い |
|---|---|---|---|
| C01 | [U.S. Robotics, Courier V.Everything External Modem: Getting Started](https://support.usr.com/support/2805/2805-files/2805-ig.pdf#page=9)（1996年4月、p/n 1.024.492） | pp. 1-3〜1-5 図・表、pp. 2-5〜2-6、3-11〜3-12の試験例。HS（4800以上に接続後保持）、AA、CD、RD、SD、TR、MRと接続例。 | NS/OH表記が資料内で不一致。実機の灯、点滅周期、全DIP組合せは未測定。 |
| C02 | [3Com/U.S. Robotics Courier Analog Modems Command Reference](https://support.usr.com/support/s-cour/s-cour-docs/494-01.zip)（2000年6月、p/n 1.024.2129-01） | §5/§8・付録D。X7/V1の結果コード、DTRで切断する&D2の例。 | 1996年資料とは版が異なる同系機資料。全ファームウェア共通とは主張しない。 |
| C03 | [ITU-T V.8](https://www.itu.int/rec/T-REC-V.8-199409-S)（1994年9月） | PSTN上でデータセッション開始時にモードを決める規格の存在。 | 本展示は波形や交渉ビットを実装しない。 |
| C04 | [ITU-T V.34](https://www.itu.int/ITU-T/recommendations/rec.aspx?rec=2756)（1994年9月） | 28,800 bit/sまでのPSTNモデム通信規格。 | UIの端末側速度選択と実回線のNegotiationを同一視しない。 |
| C05 | [Chuck Forsberg (編), XMODEM/YMODEM Protocol Reference](https://www.classic-computing.de/hellwie/pdf/XMODEM_YMODEM%20Protocol%20Reference.pdf#page=20)（1988-06-18） | §7、図9〜10：SOH・番号・補数・128バイト・データのみの総和mod 256、NAK/ACK/EOT。§4–5はYMODEMとの比較。 | 256ブロックの巡回、CRC交渉、重複ACKや完全なタイムアウト相互運用は対象外。 |
| C06 | [RFC 916](https://www.rfc-editor.org/rfc/rfc916.html#section-2)（1984年） | §II.2 XMODEM制御値のACK=06Hの照合。 | 検査和範囲にはC05を採用し、RFCの異なる記述は適用しない。 |
| C07 | [Chuck Forsberg, ZMODEM Protocol](https://techheap.packetizer.com/communications/modems/zmodem8.html)（1988年版記述） | XMODEMと異なる転送方式であることの比較資料。 | 本展示では動作実装なし。 |
| C08 | [安富伸浩・五十嵐修 NIFMCR3 3.20](https://www.vector.co.jp/soft/dos/net/se022371.html)（1997-01-23、作者の配布説明） | WTERM用、フォーラム／会議室巡回、ログ整理・閲覧。 | ソフト実行未確認。公開コマンドの再現ではない。 |
| C09 | [オウチャクン29.0](https://www.vector.co.jp/soft/dos/net/se013063.html)（1998年配布、作者の配布説明） | 自動ログオンの機能が記載されている。 | 具体的な手順は再現していない。 |
| C10 | [窓の杜 AirCraft97紹介](https://forest.watch.impress.co.jp/obsolete/rev/aircraft.html)（1997年、同時代の紹介記事） | 取得・巡回・整理の利用文脈。 | 記事の解釈を個別サービスの事実に拡張しない。 |
| C11 | [@nifty NIFTY-Serveの料金FAQ](https://faq.support.nifty.com/3926)（公式の後年の案内、発行年未確認） | 一部コースに時間課金の仕組みがある。オンラインで一括取得し後で読むことは、接続時間を節約し得る。 | 当時の具体料金、効果、全コース共通性はUNKNOWN。 |
| C12 | [ComNifty徹底活用マニュアル](https://ci.nii.ac.jp/ncid/BN10654905)（1994年、CiNii書誌） | 書誌・目次に自動巡回とログ管理。 | 現物本文は未取得。 |

## 実装と観測

- 既存の端末エンジンは変更せず、第3便の端末欄を既存ASCII端末へ渡す。通信側は閉じたイベント列・許可状態遷移・ペイロード・仮想時刻・計数・ランプ観察を分離。タイマーは停止・取消・作品変更・pagehideで破棄して、古いコールバックを世代番号で拒否する。実電話、serial API、fetch、永続保存はない。
- 接続：待機 → 初期化（AT）→ コマンド状態（ATV1X7&D2）→ 発信（架空）→ 呼出 → 交渉 → 接続。発信音なしは発信、話中は呼出、キャリアなしは交渉から失敗へ。正常の切断は接続 → DTR低下 → キャリア喪失／オフライン → 完了。
- XMODEM：384 Bの独自データを128 Bずつ。正常 3×(132 B＋ACK 1 B)＋開始NAK 1 B＋EOT 1 B＋ACK 1 B＝402 B。ブロック2故障1回は133 B追加して535 B、再試行上限での失敗は128 Bのみ受信確定。エラーを検出してから再送し、同一ブロックを二重確定しない。端末側8N1で10 bit/byteとして集計。表示上の仮想時間はこの時間に展示用の待ちを足す。
- 実ブラウザは各4幅×通常/動き軽減。実クリック・HTTP文書要求・応答・コミット・実到達URL・初期化・遷移後操作を個別記録する。失敗時trace、正常時の代表画面、単体の出力・故障対照、固定HEAD/tree・ソースと出力指紋を専用CI成果物にまとめる。
- 外部回線、実機モデム、実機Safari・音声・ネットワーク/電話信号精度はNOT_TESTED。Stage Cの承認状態、観測枠、原票、ワークフロー設定は変更しない。
