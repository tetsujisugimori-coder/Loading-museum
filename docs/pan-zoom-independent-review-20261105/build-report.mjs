import fs from 'node:fs/promises';import path from 'node:path';import{execFileSync}from'node:child_process';import{createHash}from'node:crypto';import assert from'node:assert/strict';
const dir='review-evidence',repo='review-source',head='36f9cca37f174a56767614c6b0a22eb90f9d87e2';
const read=async f=>JSON.parse(await fs.readFile(path.join(dir,f),'utf8'));
const old=await read('existing/results.json'),fresh=await read('independent-matrix.json'),pr=await read('pr-before-post.json');assert.ok(old.complete&&fresh.complete);assert.equal(old.head,head);assert.equal(pr.headRefOid,head);assert.equal(old.dirty,'');assert.equal(fresh.cases.length,16);assert.equal(fresh.failures.length,0);
const source={};for(const file of Object.keys(old.sourceCanonicalSHA256)){const blob=execFileSync('git',['show',`${head}:${file}`],{cwd:repo});const actual=await fs.readFile(path.join(repo,file));const hash=x=>createHash('sha256').update(x.toString().replaceAll('\r\n','\n')).digest('hex');source[file]={target:hash(blob),actual:hash(actual),browserRun:old.sourceCanonicalSHA256[file]};assert.equal(source[file].target,source[file].actual);assert.equal(source[file].target,source[file].browserRun);}await fs.writeFile(path.join(dir,'source-verification.json'),JSON.stringify(source,null,2));assert.equal(execFileSync('git',['status','--porcelain'],{cwd:repo,encoding:'utf8'}).trim(),'');
const maxAnchor=r=>Math.max(...r.cases.flatMap(c=>Object.values(c.anchorError).map(Math.abs)));
let maxMini=0;for(const c of fresh.cases)for(const m of c.measurements)if(m.miniExpected)for(const k in m.miniExpected)maxMini=Math.max(maxMini,Math.abs(m.miniActual[k]-m.miniExpected[k]));
const sample=fresh.cases.find(c=>c.engine==='chromium'&&c.width===375&&c.motion==='no-preference').measurements.find(m=>m.tag==='portrait-三日月橋');
const previous=await read('harness-before-paint-gate/results.json');
const stamp=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date())+' JST';
const branch='review/pan-zoom-independent-browser-20261105';const url=`https://github.com/tetsujisugimori-coder/Loading-museum/tree/${branch}/docs/pan-zoom-independent-review-20261105`;
const text=`# PR #62 Pan & Zoom 独立ブラウザ受入レビュー

## A. 判定

**総合 PARTIAL／今回の受入範囲でのマージ推奨 NO。新規の確定P1/P2指摘なし。**

Chromium/WebKitの独立した実ブラウザ描画・native browser mouse/keyboard検査は完了。実機・OS入力・pinchの未検証を成功に含めない。Draft維持、Draft解除・merge・auto-merge・手動公開なし。

## B. 対象と環境

- 対象・実行・PR最終HEAD：\`${head}\`。開始時・終了前とも一致し、追加差分なし。
- 新規のreview-source cloneをdetached HEADで使用。元の作業フォルダは空、既存作業ツリーの変更・stash・削除なし。repository/祖先AGENTS.mdは存在せず、ユーザー指定の日時記載を適用。PR本文、全投稿済みレビュー、Issue #61、docs/pan-zoom-studies.md、inline comments（0件）確認済み。
- Windows NT 10.0.26300.0 x64、Node 24.20.0、npm 11.17.0、外部既存Playwright 1.58.2、Chromium 145.0.7632.6（rev1208）、WebKit 26.0（rev2248）。アプリlockfileどおりnpm ci、依存更新なし。
- Playwright browserType.launch({headless:true})。既存ブラウザパスを明示、特別なsecurity flagなし。headed Chromiumも起動・描画成功。
- 最初はprofile内cacheに実行ファイルがなくlaunch前停止。既存インストール先指定で解消。sandbox内localhostはChromium ERR_NETWORK_ACCESS_DENIED／WebKit Could not connect to server。承認された通常実行で接続成功。安全設定変更なし。先行環境のsocketエラーはこのホストで未再現、先行環境との差の根因は未特定。

## C. 指摘と切り分け

|分類|結果・根拠|
|---|---|
|確定製品指摘|新規P1/P2なし。修正を求める再現反例なし。|
|取消直後に仮位置を読む候補|WebKitで即時読取りは仮位置、最初の描画フレームで元の確定位置へ復帰。paint-diagnostic.jsonで再現。描画後に状態上書きは未再現。製品修正なし。|
|ブラウザpinch|二指touchとcompositor gestureでscale変化を観測できず。OFF／図版外／図版のない対照ページでもscale=1。製品に帰属できないためNOT_VERIFIED。ONのgestureで図版位置が動いた点も記録し、成功へ分類しない。|
|OSマウス追試|Windows UI helperがウィンドウ取得時に同じownerエラーで2回停止。SendInputには未到達。ブラウザ起動不能・製品不具合ではない。|

## D. 結果と入力の区別

|検査|成功|失敗・skip・未検証の扱い|
|---|---|---|
|npm run check|455/455（Node49＋Vitest406、Pan & Zoom13を含む）、lint/typecheck/build成功|失敗・skip 0|
|既存verify-pan-zoom-browser.mjsの独立再実行|16/16（2 engine ×375/390/765/1280 ×通常/reduced）|clean対象HEAD。pageerror・横超過0|
|独自browser harness（2分割）|16/16の異なる条件、各条件13群|完了済み14＋残り2。未完了batchを全成功とは呼ばず、未完了・重複診断は除外。既存16へ重複合算しない|
|独自Chromium CDP touch（390px）|初期OFFの縦scroll、ON一指pan、ON図版外scrollの3観察|touch emulation。実機ではない。pinchは未検証|
|実機Safari／VoiceOver／実OS capture喪失／WebKit native touch drag|未検証|成功に含めない|

独自検査の入力・期待値：

- native browser mouse/keyboard（Playwrightのmouse/keyboard、trusted browser input。物理マウス・実OS SendInputとは区別）：325→487.5%の中央保持、437%から窓の43%/47%位置でdouble-click、fit時の端/letterbox補正、800%で四隅まで大きくdrag、100/800%のclamp、27/-19pxのEscape取消と-23/17pxの確定、入力編集/Home/矢印/Enter、専用領域の矢印、修飾キー、展示切替・閉室focus。
- ミニマップはSVG getScreenCTMを窓座標へ変換し、四隅を逆変換して1000×700図版との交差を独立計算。製品visibleRect/modelをimportしていない。173×620の縦長、元幅×73の横長窓でも5目印と赤枠を照合。制約内で全目印を表示。
- pointer anchor最大差：既存 ${maxAnchor(old).toFixed(9)} CSS px（許容0.75）、独自 ${maxAnchor(fresh).toFixed(9)} CSS px（許容0.8、fractional入力のnative座標丸めを含む）。mini最大差 ${maxMini.toExponential(6)} world units（許容0.02）。サンプル縦長173×620／橋：geometry=${JSON.stringify(sample.geometry)}、赤枠=${JSON.stringify(sample.miniActual)}。各条件の全実測はJSONに保存。
- 実ResizeObserverと実DOM寸法：幅0→同/別寸法、高さ0→同/別寸法、display:none中のdrag→別寸法。未測定表示、SVG消失、操作disabled、確定倍率400%と中心注目点の制約復元、古event無効を検証。provisional位置を復元の基準にしない。
- 合成PointerEvent（実入力とは区別）：別pointerのmove/up/cancel/lostcapture、owner cancel/lostcapture、取消後に同じID91を再使用し新drag開始time=1000000へ古time=999999を送る反例、新time=1000001/2でmove/up確定、Reset/fit/zoom/mode/resize/0/hidden/閉室・展示切替後の古event。存在しないIDだけcapture設定を一時stub、native操作前に復元。
- native active pointerのreleasePointerCaptureをプログラムで発生させ、ブラウザのtrusted lostcaptureでrollbackを確認。これは実OSによるcapture喪失ではない。
- 全体表示は選択/mode維持、Resetは両方解除。通常/reducedで各到達契約成功。両engine×375/1280×通常/reducedの展示画像を目視し、文字/操作部の折返し・欠けなし、赤枠と表示範囲を確認。focus画像はviewport全体を保存してoutline外側も確認（初期試行のzone cropでは外側outlineを判定しない）。

過去試行は別保存：sandbox接続拒否、debug.log生成によるclean gate停止、非表示role locator停止、描画前読取りの ${previous.cases.filter(c=>c.status==='PASS').length}成功/${previous.cases.filter(c=>c.status==='FAIL').length}停止、pinch timeout。これらを最終成功へ合算しない。includeHiddenの検査側修正と2描画フレームの観察を導入し、入力・期待契約は維持。独自matrixの最初のbatchは14条件完了後、WebKit1280の段階ログを取得できず中断。停止段階・根因はUNKNOWN（runnerの無上限描画待ち等を含め未特定）。残り2条件だけを8秒上限の描画観察/段階ログ付きで完了し、独自matrixは14＋2の異なる条件として集計。未完了条件や重複診断を成功へ含めない。入力・幾何期待値・許容差の緩和や固定sleep・retryによる成功扱いはない。新しいWebKitの取消読取り時点は診断できたが、先行レビューのUNKNOWN全般を解消とはしない。

## E. 証拠

[証拠専用ブランチ](${url})。既存最終画像24枚＋独自最終画像16枚、JSON/入力監査/ログ/実行スクリプト/失敗履歴を保存。source-verification.jsonで対象HEADのGit blob、実ソース、既存ブラウザ実行時のcanonical SHA256を7ファイル照合。全証拠のSHA256はmanifest.json。

代表：[Chromium375通常](existing/chromium-375-no-preference-exhibit.png)、[WebKit375 reduced](existing/webkit-375-reduce-exhibit.png)、[WebKit1280通常](existing/webkit-1280-no-preference-exhibit.png)、[Chromium375 keyboard focus](independent/chromium-375-no-preference-focus.png)。

主な数値：[既存16結果](existing/results.json)、[独自16条件集計](independent-matrix.json)、[独自完了14条件](independent/results.json)、[残り2条件](independent-final1280/results.json)、[touch](touch-results.json)、[描画診断](paint-diagnostic.json)、[環境](environment.json)、[全455試験ログ](check.log)。

## F. 修正

製品・既存試験・lockfileの変更なし。製品の修正前FAIL→修正後PASSは該当なし。検査側locator/描画待ちだけ修正し停止履歴を保存。証拠専用branchは対象HEADからのdocs追加のみ。PR #62への実装統合・cherry-pickは不要。

## G. 未検証・残件

実機Safari、VoiceOver、実OS capture喪失、WebKit native touch drag、ブラウザpinchの実挙動、物理マウス/OS SendInputは未検証。次の受入担当は実機でpinchと一指mode/page scrollの関係、Safari/支援技術、OS capture喪失を確認する。既存UNKNOWN、Issue #29/#44/#54の状態は変更しない。先行環境との差の原因、および独自runnerの初回1280進捗停止の根因も未特定。

## H. HEADとCI

PR最終HEADは対象と同じ\`${head}\`。GitHub上の7 workflow／21 jobは全SUCCESS（取得時点）。本レビューのローカル実行と既存CIを別証拠として扱う。証拠branchのcommitへ21 job成功を転用しない。

- [Pan & Zoom CI](https://github.com/tetsujisugimori-coder/Loading-museum/actions/runs/41803291076)
- 他6 workflowはpr-before-post.jsonのstatusCheckRollupに保存（非SUCCESS 0）。
- 投稿先：PR #62のCOMMENT review。投稿後にAPIから本文・commit_id・URLを読戻し確認する。結果はローカルのpost-readback.jsonに保存する。

レビュー記録日時：${stamp}
`;
await fs.writeFile(path.join(dir,'REPORT.md'),text);await fs.writeFile(path.join(dir,'summary.json'),JSON.stringify({head,stamp,maxAnchorExisting:maxAnchor(old),maxAnchorIndependent:maxAnchor(fresh),maxMini,existing:16,independent:16,contracts:455,ciJobs:21,ciWorkflows:7,overall:'PARTIAL',mergeRecommendation:'NO'},null,2));console.log('Report generated',stamp);
