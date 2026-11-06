# PR #66 R1 / R2 / Undo 再受入契約

変更前の製品HEAD7593e5136efc90c6bccf63fa2fc3e429b51a128d、main05735e83fd23d228d797afb89a150045293d3e58。製品・素材・依存を変えず検査を局所修正する。既存Issue65/Draft PR66のみを使い、merge/ready/公開はしない。

## 旧REDと独立レビューの引継ぎ

[旧CI証拠](https://github.com/tetsujisugimori-coder/Loading-museum/blob/0c52af118ef9142f93d32ae40f4443ae9d9e8aee/docs/before-after-final-7593/README.md)はそのまま保持。[Work追補5793861114](https://github.com/tetsujisugimori-coder/Loading-museum/pull/66#pullrequestreview-5793861114)と[5798034680](https://github.com/tetsujisugimori-coder/Loading-museum/pull/66#pullrequestreview-5798034680)は外部担当の以前の実行証拠であり、今回の新規実行数へ加算しない。レビュー全文を読んで引き継いだ。

R1初回ZIPの4→5点の差の末尾は取消前最後の入力位置に対応する。採取だけ早めた旧比較48/48誤FAIL、収束後48/48成功という過去独立対照は検査競合の根拠。初回CI自体のイベント/React反映時刻は記録がないため帰属UNKNOWNを維持する。Undoの旧main1280/Nowの期待[]対正常6点も同様に初回時系列の帰属を断定しない。

R2は旧mainでscroll0 1ms、独立IO通知141ms、DOM停止155msが観測された。100msを別の固定時間へ延ばす修正にはしない。

## 入力と期待値とDOMの分離

`browser-regression-observation.mjs`はtrusted pointerのowner/sequence/client座標とイベントごとの枠寸法を記録し、固定viewBox320×220から期待点列を計算する。DOM点列を正解へ流用しない。source/copy/committed/cancel全描線に適用する。取消前の最後の正当入力を全点列で確認してからbeforeCancelを保存し、取消後の実移動は記録するが追加を認めない。Undoは先行確定線をその入力由来の点列へ照合し、stageとthumbnail、Resetも検査する。

時計はperformance.now。capture、root後document bubble、MutationObserver、前後snapshotを保存する。MOはDOM反映の観測でありpaint時刻ではない。収束は元の10秒以内、全点列完全一致が3frame続く条件。座標/画素許容、待機上限、reduced基準を広げない。

## 検出力と正常系

描線の正当末点削除／取消後余分点追加／既存点改変はtest-only DOM故障。製品内部stateを改変したと称さない。helper単独の負対照に加え、`verify-regression-faults.mjs`がThen/Now各3種を**同じ通常ハーネスの正常assertion経路**へ注入する。指定故障の実到達・そのassertion FAIL・report FAIL・子process非ゼロを必須にし、故障除去後の通常実行0/PASSを要求。読込失敗などの無関係な非ゼロは合格としない。

R2はscrollY=0・画面外geometry・独立IO false・data-active=false・radius安定を追加3frame保持。再入場、反復、途中scroll差替えを確認。停止しないDOM故障は同じ収束判定で10秒以内に拒否し、子実行の非ゼロと復旧を要求する。独立担当は別oracleで製品へのIO false通知を抑止する対照も行う。

## 同一条件比較と独立再受入

`verify-regression-timing.yml`はChromium/WebKit×375/390/765/1280の8job。pinしたmainを別pathへcheckout/buildし、PRと同じ入力シナリオ・oracle・faultを適用する。各reportのharness HEAD/treeとexport HEAD/tree、build index hashを区別する。原本JSON・raw PNG・log・source/画像hash一覧をartifactへ保存。失敗後も別独立stepを実行するが先行FAILは保持する。

独立担当作成`verify-regression-independent.mjs`は主helperをimportせず別に全点列を計算し、採取のみ早めるcancel対照、Undoの早期snapshot対照、収束後比較、IO時系列と通知抑止、復旧を確認する。独立Undo早期対照は意図的なdown capture保存であり、元after-draw読取りの自然発生を再現したとの主張ではない。旧レポートは再実行と混同しない。固定HEADの新規独立実行・正式CIを確認するまで完了へ昇格しない。

## 残る範囲

ローカルの固定ブラウザ配信はDomain forbidden403。迂回せず既設Chromiumで実行し、WebKitは正式CIで新規実行する。物理Safari/VoiceOver/入力、実OS背景化/capture loss等はNOT_TESTEDを保持。Playwright入力、合成cancel/DOM故障、IO通知抑止は実機操作と区別する。#44のsecurityと#54の未検証は今回の対象外として保持する。最終結果は固定HEAD証拠とIssue65/PR66へ追補する。
