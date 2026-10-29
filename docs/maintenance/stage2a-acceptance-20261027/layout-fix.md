# 現行ラベル横超過の局所修正

確認: 2026-10-27 13:12 JST。A（現行製品）のP2として扱う。旧Q1の根因とは別。

## 修正前再現と原因

正式受入pre-fixでCh/WK×375/390/765のCoin COLLECT、Turn Order NORMALIZE、Battle ENCOUNTERの200%文字ラベル横超過を確認。Coin390のDOM/computed/PNGではfont20px、flex:1 1 90px、min-width64px。文字のmin-contentより小さいflex幅へ縮むため、全文とpaddingを収容できない。Ch scrollWidth101/clientWidth97、WK110/97。ページ限定実験min-width:max-contentでは幅152px、scrollWidth=clientWidth150で全文を保持してwrapした。これは診断実験で、正式修正後PASSではない。

## 第一希望・次善策

第一希望は再現した3展示のcontrolsに限りmin-width:max-contentを指定し、既存flex-wrapに行分割を委ねる。全文・フォント・ボタン高さ・フォーカス・操作状態を変更しない。採用理由は原因であるintrinsic幅以下への縮小だけを抑える最小CSS修正であるため。

次善策は全gameControlsへのintrinsic幅適用だが、未再現の他展示へ範囲が広がるため不採用。文字縮小・省略・overflow:hidden・横scrollでの隠蔽は採用しない。

## 製品と検証器の区別

- Coinの動く¢と観察buttonのraw矩形重なりは、祖先overflow clip後には重ならずhit-testも観察buttonへ到達。製品へclip追加せず、検証器が可視範囲を扱うよう修正する。
- Match3のRange linebox下端と実glyphの可視性を混同しない。負例と独立レビューで測定契約を確認し、閾値拡大で隠さない。
- TurnOrder FLIP生成前に空getAnimationsを読んだ待機不足は、native生成/完了と状態を待つ検証側修正。製品状態の修復とは別。

修正後は同一表示・操作期待値で正式6条件を再検証する。旧FAIL、診断PNG、修正前script/JSONは保持する。最終全check5回と実CIが成功するまで最終受入を確定しない。

## 同一期待値の確認（2026-10-27 13:20 JST）

検証器v5を固定し、退避した旧outと新buildを比較した。旧outは全6条件でCoin/TurnOrder/Battleの3カード文字超過のみFAIL、他対象の表示・Turn操作・7種DOM負例は通過。新outは全6条件PASS、6対象×motion2×文字2×OS色設定2×6条件＝288表示組合せを実行した。新旧のscriptSHAが同じことを独立担当も照合。これはA製品CSSのRED/GREENであり、途中のB判定器修正によって旧buildを合格へ変更したものではない。

B検証器ではclip前矩形、Range lineboxと可視glyphの混同、FLIP生成前の空Animation読取、evaluate代入式が返すfunctionの意図しない呼出を分離して修正。最後のIllegal invocationは初期rAF仮説ではなく復元代入の戻り値が原因で、void blockへ最小修正した。失敗注入対照と版別旧FAILはnative記録に保持する。
