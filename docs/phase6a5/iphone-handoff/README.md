# Windows PC＋iPhone Safari：物理touch採取準備（Issue #73）

**PARTIAL / 実機 NOT_TESTED。** 診断の準備と実機受入を分ける。PR #70の `01e11d4bd15813cc6fe57c01623ef10b9836a335`、PR #72の `aabdbfda7116144deffd3f36564e1b03e2e2a55b` を変更しない。本branchはPR #72への積み上げで、mainに統合済みではない。旧WebKit native FAILとengine/backend原因UNKNOWNを維持する。

## PCで準備（Mac不要）
1. このDraft PRの**固定HEAD**をWindowsへ取得し、Node.js 22.13以上で `npm ci`、`node scripts/prepare-iphone-touch.mjs`。提出HEADはPR本文を確認。ローカル診断専用でPages公開しない。
準備scriptはclean固定HEADからbuildし、全配信ファイルhashを保存。起動時にHEAD/sourceと配信byteを再照合し、古いbuildや改変を拒否する。
2. PowerShellで `$env:DIAGNOSTIC_HOST='0.0.0.0'; node scripts/serve-iphone-touch.mjs`。同じ信頼できるWi-Fi上のiPhoneから `http://PCのLAN IPv4:4173/diagnostic/` を開く。PCのIPv4は `ipconfig` で確認する。ルータのポート開放、トンネル、公開サーバーは使わない。
3. Windowsのネットワーク/ファイアウォール設定は自動変更しない。接続が拒否される場合は管理者にこのLAN内の読取専用試験を相談する。ユーザーが承認したプライベートネットワークの許可のみを使い、セキュリティ警告を迂回しない。終了時はCtrl+Cで停止。
4. サーバーはGETのみ。配信対象は静的outと診断用の限定ファイル。ログの受信API、アップロード、外部送信、テレメトリはない。LAN参加者には配信ページが見えるため、信頼できるLANだけで短時間利用する。既定起動は127.0.0.1でPC内限定。

## iPhoneで採取
- 入口ページの手順に従い、製品の部品展示室→Image Adjustmentへ移動。端末名、iOS、Safari版、匿名の担当ラベル、session名を記入する。Apple ID等の秘密情報は記録しない。
- fullを選び、製品/素HTML × tap/drag × 1〜3の12本を採る。各操作はfresh page、0から開始。失敗も残し、再実行はattempt番号を上げる。同じmethod/repetition/modeをペアで使う。
- **READY後**に指で1回操作する。tapはrange幅75%、dragは50%→75%。端末の回転、ズーム、スクロールを揃える。実測座標が一致しない場合は比較不能として保存し、既存0.5px基準を緩和しない。
- 操作が終わり表示が落ち着いたところで画面撮影。その後「封印」。window pointerdown captureで旧記録器のdocument captureとボタン既定focusより前に最終値を固定する。実iOSでこの順序が保たれることは未検証。操作中や指を離す前の封印は無効試行として残す。
- 「JSON保存」からSafariのダウンロード/ファイルへ保存。自動送信はしない。共有シートが表示されても第三者を選ぶ必要はない。Windowsへの転送やこのチャットへの添付は操作者が明示して行う。
- 封印後のJSONは変更せず保存。スクリーンショットPNGを別保存し、旧 `ios-physical-reacceptance.md` の手順でcopyのenvelopeへPNG hashを付ける。原JSONとenvelopeの両方を残す。

## 計測の比較と限界
- fullは既存PR72記録器をそのまま使用。pointer/touch/input/change、時刻、isTrusted、値、preview/確定/履歴を含むschemaVersion1。
- minimalはイベント種別・時刻・値だけの対照。offはイベント採取なし、開始/封印snapshotのみ。両者は `iad73-control-1` であり、旧物理比較器へ渡せない。情報不足をCOMPLETEへ昇格させない。
- absentは`?probe=1`を付けない製品/素HTML。診断スクリプト自体がなく、値と操作を画面録画/手記で比較する。offも封印listenerや開始snapshotがあるため完全な無計測ではない。
- fresh pageでabsent→off→minimal→full、逆順full→minimal→off→absentを交互に比較。位置・寸法・最終DOM値・確定値・履歴を別判定。詳細記録のlayout読取/rAF予約・パネルの存在が影響しないと無条件に仮定しない。
- 製品の取消を無視/強制commitしない。isTrustedは物理入力証明ではない。ブラウザ自動配送、操作者申告、物理動画/画像レビューを分ける。PNG hashだけで画面内容が正しいとも判定しない。

## 照合
`http://PC:4173/diagnostic/manifest.json` を期待manifestとして保存（提出HEADと別経路照合）。full12本とPNG付きenvelopeを既存 `node scripts/adjustment-physical-contract.mjs manifest.json ...` で照合する。
exit0=数値契約を満たす比較、exit1=製品失敗を含む比較、exit2=欠測/条件不一致/不正記録。どれも自動的な実機PASS/原因確定ではない。手指では0.5pxの座標同等性が成立しにくく、INCOMPARABLEとなる可能性が高い。生ログから取消発生の有無を観察できても、同等条件の因果比較とは別に扱う。

## 保全と未検証
製品ソース・CSS・依存・旧記録器・旧比較器・過去証拠は変更しない。ローカル配信時のHTMLへ明示opt-inのscriptを追加するだけでout原本も変更しない。
初回ローカル検査はChromium32行完了後、WebKit必要ライブラリ不足で失敗。`initial-browser-failure.log`を保持。後続の成功でこの失敗を削除しない。実機iPhone、物理drag、Windows実操作、物理計測中立性はNOT_TESTED。過去原ZIPの今回再取得/独立照合状況は最終報告へ別記する。
