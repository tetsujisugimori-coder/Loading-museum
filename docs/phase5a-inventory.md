# 第5期A：採用調査・設計

2026-11-01 JST、[Issue #48](https://github.com/tetsujisugimori-coder/Loading-museum/issues/48)。開始 main `b355db856688b3cc8c3c627ddc10625bbaa45bd0`、tree `619e7d1a8d46624802f2d2af38b63f375f4377b9`。GitHubでPR #47 mergedを確認し、正規git cloneで取得。専用cloneのclean状態から `feat/practical-ui-phase5a` を作成。接続desktop・Loading専用Cloud設定がないため現Cloud領域を使用。別の未コミット作業を破棄しない。

## 現物集計

`INVENTORY_REF=b355db856688b3cc8c3c627ddc10625bbaa45bd0 node scripts/inventory.mjs` は239。作業版は245。内訳はトップ9、DOS8、UNIX5、旧OS18、Apple13、Mac18、cursor8、Flash54、DOM17、WAAPI47、第1期6、第2期12、第3期12、第4期A6、第4期B6、第5期A6。室数は `app/page.tsx` の既存式 `exhibitRooms.length + 6 + 4` = 13、増室せず第4期部品室へ統合する。台帳の初期値を根拠なく信頼した集計ではない。

全 `app/data/*.ts` の名称・登録とトップ、DOMの登録を棚卸し。名称抽出の件数にはカテゴリ見出しや入門説明も含まれるため展示数には使わず、inventoryの既存集計契約で数える。全登録調査は全239展示の全操作を今回再実行したことを意味しない。

| 新規 | 既存近似 | 今回採用する差分 |
|---|---|---|
| Editable Data Table | Sortable Drop、Turn Order Reflow、Finder | 順序だけでなく名称セルの確定・取消と複数行選択。並べ替えに関係なく行IDが編集対象を固定する |
| Date Range Picker | Inline Validation、デスクアクセサリ | 日付二点・月移動・プレビュー・無効日・逆順交換。日時や一般入力の検証と異なる範囲状態 |
| Virtualized List | Staggered List、Upload Queue、Macスクロールバー | 入場の時間差や少数行の進捗でなく、10,000データと実DOM行数を分離。位置・行高・overscanの計算を観察 |
| Filter Builder | Search Suggestions、Command Palette、館内検索 | 文字補完や模擬コマンド実行でなく、演算子付き複数条件をAND/ORで実評価する |
| Tree View | Animated Accordion、Context Menu、Finder | 開閉やメニュー選択に加え、階層構造・可視順・選択・focusの4状態を区別。隠れる子を親へ戻す |
| Multi-Select Chips | Search Suggestions、Inventory Equip Snap | 単一候補・装備位置ではなく複数選択集合、重複防止、検索と独立した選択、非破壊の上限変更 |

同じCSS/WAAPI/Reactを使うこと自体は新展示の差ではない。上記の操作・状態・観察価値を採用理由とする。既存ID・データを置換しない。初出・発明者は全6件UNKNOWN、一般的なUIの独自実装。第三者のコード・画像の転載なし。

## 実装と制約

- Reactの同期状態を正本とし、アニメーション終了callbackでデータを確定しない。Resetは子のremountでローカル状態を初期化。外部通信・実ファイル・外部保存は行わない。
- Tableは5架空行、編集列は名称のみ（40文字、空欄不可）。native table内の各操作はTabで到達し、grid式のセル矢印操作は提供しない。表示順と選択IDを分離し、FLIPは300ms有限・低減切替/再操作/unmountで取消。
- Filterは最大6条件。名称の部分一致、点数の以上/以下。空欄・非数値は明示して評価から除外、有効条件0なら全件表示。条件IDは再利用しない。
- 日付はYYYY-MM-DDの日付のみ。開始より前の終了を選ぶと両端交換。毎月13日は模擬休館日として直接選択不可（期間途中に含むことは可）。矢印は同月内、Escapeで取消。月長計算だけUTC Dateを用い、予定日時への変換はしない。
- 仮想一覧は行高36px、領域216px、前後各3行。固定高の簡略化で可変行高非対応。DOM数は描画集合の実数であり、速度の優位を未測定の数値で主張しない。
- Treeは架空階層、選択とfocusを分離。親閉鎖で非表示になる選択は親へ戻す。
- Chipsは重複候補の選択を解除へ切替。上限を下げても既存選択を破棄せず、上限未満になるまで新規追加を禁止する。
- 大きな移動はprefers-reduced-motionで停止。期限・結果など機能を失わない。新展示に常時タイマーや外部イベント待機はない。

## 一次資料

2026-11-01 JST、次の本文を確認。コード転載・完全APG適合認定ではない。
- [W3C Table Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/table/)：native表と内部操作、sort状態。今回の表はgrid型の複合widgetではない。
- [W3C Tree View Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/)：階層、focusと選択、矢印操作。
- [MDN scrollTop](https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollTop)：位置はピクセル値で小数もあり得る。表示値のみ丸め、計算と区別。

その他の各展示の技術リンクは展示台帳に保持。未確認リンク本文まで今回確認済みとは扱わない。

## 引継ぎ境界

Issue #44の既存依存critical3件は未解消として維持。今回lockfile更新や危険経路の解消を行ったとは主張しない。Windows旧WAAPI timeout原因UNKNOWN。実iPhone Safari/Mac/VoiceOver/OS IME/実機タッチはUNVERIFIED。合成IMEイベントやPlaywrightは実機確認の代用ではない。第4期Bの保留証拠には触れず、別経路転送しない。
