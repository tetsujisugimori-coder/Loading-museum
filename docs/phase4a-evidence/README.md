# 第4期A 自己検証証拠

取得/実行：2026-11-01 JST。初期からの失敗を含め原本を保持する。

| 証拠 | 実測・区別 |
|---|---|
| inventory-main / inventory | git show基準227、working tree233 |
| audit.json | npm audit exit1、29件/critical3。未解決#44 |
| unit-initial / unit-next / unit-final | 28件の初期21/28→26/28→28/28 |
| unit-focus-fix / unit-pointer-guard / unit-focus-context | 追加境界を含む29→30→最終32/32。途中unit-touch-fixはguard導入前 |
| check.log / check-final.log | 既存WAAPI timeoutを含む失敗2回。上書きしない |
| check-main / vitest-main / waapi-*-isolated | main buildのjunction境界BLOCKED、main全147成功、PR WAAPI単独20成功。根因UNKNOWN |
| check-submission.log | lint/type/build/49+147+32成功、exit0。新規群も必須実行 |
| browser-initial / browser-next | Ch390 3/6（期待漏れ）→6/6 |
| browser-full | Ch24＋WebKit3＝27/48後に検索tap P2。PNG/実DOM保存 |
| search-touch-green | 同じ検索期待でWebKit/Ch×375/390＝4/4 |
| browser-final | 30/48後に通知期限中の厳密4件仮定で停止。製品の上限違反ではない |
| browser-submission | Ch24/24後にWebKit375の中間位置一点観測で停止。全体24/48、全成功ではない |
| toast-frame-diagnostic | WebKit375/390＝2/2。234→117px間の12実フレームを時刻付き保存 |
| ci-first | a718067の初回CI：契約成功、WebKit既存36/新規17で停止、ChromiumはAPT中10分取消。API/注記/ログ/失敗PNG保持 |
| media-diagnostic / media-observed | WebKit765の固定1700ms閉高1≠0、明示終端待ち765成功後1280の一点中間観測失敗。全履歴を保持 |
| accordion-frame-observed | WebKit765/1280の実中間高さで反転、閉高0・phase・低減属性の明示確認、2/2成功 |
| select-red / select-green | 独立P2を自己再試験。各16条件を全測定。WebKit画素比8件が1.23〜1.30から12.02〜14.70へ改善、Chは15.15を保持。両者の選択/focus成功 |
| check-select-fix.log | select限定CSS修正後のlint/type/build/49+147+32成功、exit0 |
| search-touch-negative-control.patch | 局所revertの再現用資料。適用・再実行済みとは称さない |

ローカル結果のheadは基準mainでdirty=true。これを提出HEADの合格と読み替えない。最終CIはDraft PRの固定HEADをcheckoutし、旧36×2、新6×4幅×2を別結果JSONへ出す。CI artifactとHEAD/tree・件数の照合はPR本文・通常コメントを正本とする。

`manifest.json` は生成時点のファイルSHA-256/サイズと提出ソースのGit blob SHA/バイトSHAを記録。manifest自身は自己参照になるため含まない。各browser結果JSONにも保存PNGごとのSHA-256/サイズがある。初期Windowsログの一部日本語は取得時の文字コード解釈により崩れており、後から原本を書換えず保持。これは実行していない範囲の補完ではない。

最終CI原本はrepository外の専用作業領域へ回収して照合し、証拠追記のために検証済みHEADを動かさない。実機/VoiceOver/OS IMEはUNVERIFIED、独立レビューは別担当。

`.gitattributes` はこの証拠ディレクトリだけ改行の自動変換を無効化し、保存SHAとgit取得後のバイトを一致させる。原本logにはツール出力の空行/末尾空白があり、全体diff --checkはそれを警告する。原本を整形して消さず保持。製品・試験・workflow・説明のdiff --checkは証拠ディレクトリを除いて別に確認する。この区別を全体diff --check成功と称さない。
