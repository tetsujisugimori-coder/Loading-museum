# 第2期の自己検証証拠

- first-trio-unit / second-trio-unit：各制作段階の試験。
- build-initial：Turbopackが外向きnode_modules symlinkを拒否した環境失敗。依存を通常コピーしbuild-after-local-copy成功。
- check-initial：統合初回check 406件成功（当時の作業tree）。後続hidden回帰・非重複検査を追加。
- initial-hidden-failure：初回browserでtab hidden時に編集状態を破棄する製品問題を検出。Phase2限定でmount/play gateを分離。
- harness-focus-failure：製品の完了後disabledボタンにfocusする検査器の誤り。enabledへ修正。初回失敗を削除しない。
- hidden-state-unit：修正後の値保持・閉室解放単体回帰。

これらは最終提出HEADの全面成功を意味しない。正式提出は最終HEADとCI/artifactを対応付けたPR記録を参照。ブラウザはChromium141 / WebKit26のエミュレーション。実機iPhone Safari、VoiceOver、実OS背景化はNOT_TESTED。自己検証であり独立レビューではない。
