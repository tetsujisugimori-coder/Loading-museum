# 第3期：既存展示棚卸し・採用判断・参照資料

確認日：2026-10-31 JST。棚卸し基準 main `3895d6afd900a2e9458c1f04a431963944cea8d8`。これは登録内容と一次資料の読取による調査で、全館の実操作合格を意味しない。

## 既存展示の実数

| 登録領域 | 件数 | 根拠 |
|---|---:|---|
| 常設待機表示 | 9 | app/page.tsx の OBJECT 01〜09 |
| MS-DOS | 8 | app/data/exhibitRooms.ts |
| Linux / UNIX | 5 | 同上 |
| 消えたOSの個別loading展示 | 18 | vanishedOperatingSystems.ts、6 OS×3。OS見出しを重複加算しない |
| Apple I / II | 13 | appleEarlyExhibits.ts |
| Macintosh | 18 | macintoshBirthExhibits.ts |
| Cursor | 8 | cursorExhibits.ts |
| Flash | 54 | flashExhibits 配列。18カテゴリを展示として加算しない |
| DOM操作 | 17 | DomAnimationRoom.tsx operation-01〜17 |
| WAAPI | 47 | original 27＋追加game 14＋AI 6 |
| 第1期 | 6 | modernExhibits.ts |
| 第2期 | 12 | phase2Studies.ts 6＋phase2BStudies.ts 6 |
| **合計** | **215** | 9+8+5+18+13+18+8+54+17+47+6+12 |

従来の150はWAAPI追加前の値。197はWAAPIまで、215が第2期を含む本基準の登録数。第3期Aの異なる6件を追加すれば221、Bまで12件を追加すれば227。後二値は登録完了時に実配列と再照合する値であり、未実装の成果を先取りしない。

## 重複調査と12枠の採用方針

| 枠・初期候補 | 採用する部品 | 既存との照合・採用理由 |
|---|---|---|
| A1 Dot Sequence | Step Progress | 常設growing dots、DOS growing-dots、Windows Phone dotsがある。点を改名せず、離散工程とその現在位置・完了を表す部品へ差替 |
| A2 Circular Loader | Buffered Progress | 常設CSS円弧、Apple spinner、Cursor waitingがある。単一進捗バーも既存。取得済みと再生済みの二つの量を区別する部品へ差替 |
| A3 Skeleton Loading | Pull-to-Refresh | 常設skeletonがある。引張量・閾値・離す・更新中・完了を持つ待機開始ジェスチャへ差替 |
| B1 Cursor Trail | Pointer Spotlight | Cursor cursor-trailとFlash paint-trailがある。残像ではなく現在位置を照らす注意誘導へ差替。Square Lensの画素屈折とは異なる |
| B2 Magnetic Cursor | Magnetic Target | 既存arrow/link/drag/lensに磁気吸着対象の操作比較はない。OSカーソル自体の位置を書換えるものではなく、対象のCSS移動による近似 |
| B3 Drag Feedback | Drag Reorder Feedback | 既存自由移動drag-pointer、Flash spring-drag、WAAPI inventory-equip-snapとは、リストの挿入位置・順序確定・取消を扱う点で区別 |
| C1 Ripple Button | Hold-to-Confirm | Cursor click-effectが複数波紋を既に表現。長押し進捗と早離し取消の部品へ差替。実際の破壊操作は行わない |
| C2 Elastic Button | Elastic Button | 既存button-pressは単発scale、Flash spring-dragは球の移動。押下・解放・再押下と弾力/減衰の関係をボタンに限定して観察する。単なるbounce再登録にはしない |
| C3 State Transition Button | State Transition Button | 既存AI working loopとは、操作ボタン自身のidle/busy/success/failure、再操作と取消の境界を観察する点で区別 |
| D1 Staggered Reveal | Staggered List Reveal | Flash logo-assemblyとWAAPI character-by-characterは文字、card-deal-shuffleは配札位置と回転。実用リストの読順を保ち、同時表示と順序/間隔/方向の差を観察する教材とする。原理そのものは既収集の時間差であり、新発明とは称さない |
| D2 Shared Element Transition | Shared Element Transition | 一覧の同一カードと詳細の連続性、戻る・途中取消を扱う。既存panel slideや写真carouselとは画面間の対象同一性が異なる |
| D3 Crossfade & Morph | Crossfade UI States | Flash shape-tween/vector-morphが図形変形を既収集。二つの内容状態の相互opacityと簡略遷移の比較を優先し、図形morphを別名で水増ししない |

Bの具体的な採用・完成状態は実装記録 `phase3-studies.md` を正本とする。この表の後半は収集判断であって、実装済みや検証済みの主張ではない。D1は同じ時間差原理の実用例比較として条件付き採用を推奨。間隔スライダーだけでなく、実際のカード入場順・途中停止・完了状態が異なることを実画面で示せない場合はPARTIALとする。

## 原典・技術資料

以下の本文を2026-10-31 JSTに確認。URLは出典案内であり、コード・図版・ロゴの複製許可を意味しない。引用文を転載せず、要点のみ独自に整理した。

- Step Progressの実用比較：[GOV.UK Task list](https://design-system.service.gov.uk/components/task-list/) は未完了/完了を利用者が識別するタスク一覧の用途を説明する。今回の動くstepperそのものの原作ではなく、工程状態を分ける実用的根拠。
- Buffered Progress：[MDN Media buffering, seeking, and time ranges](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Audio_and_video_delivery/buffering_seeking_time_ranges) はbuffered、played、seekableを区別する。取得済みと再生済みは異なり、bufferedに穴がある場合もある。展示で単一連続区間へ簡略化する場合はその限界を記す。実通信や実動画の測定とは称さない。
- Pull-to-Refresh：[Android Developers Pull to refresh](https://developer.android.com/develop/ui/compose/components/pull-to-refresh) は内容先頭の下向きdragで更新するパターン、更新中状態とindicatorを説明する。今回のWeb再構成はAndroidコンポーネントの移植ではない。
- Pointer Spotlight：[Microsoft PowerToys Mouse utilities](https://learn.microsoft.com/en-us/windows/powertoys/mouse-utilities) のFind My Mouseはカーソル位置のspotlight、半径・不透明度等を説明する。展示内だけの独自再構成とOSユーティリティを区別する。
- Magnetic Target、Drag Reorder、Hold-to-Confirmの取消：[MDN pointercancel](https://developer.mozilla.org/en-US/docs/Web/API/Element/pointercancel_event)。スクロール等で入力列が取り消されることを扱い、pointerupが必ず来ると仮定しない。Magnetic Targetの歴史的な代表製品の特定はUNKNOWN。
- Drag Reorderの代替操作：[W3C WCAG 2.2 Understanding Dragging Movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html)。ドラッグしなくても操作できる単一ポインター経路を用意する。キーボード経路だけを用意して十分としない。
- Hold-to-Confirm/Elastic Buttonの取消：[W3C Pointer Cancellation](https://www.w3.org/WAI/WCAG22/Understanding/pointer-cancellation.html)。誤操作を取り消せる設計が必要。長押しを安全性の完全保証や実削除の承認として扱わない。
- Elastic Button/Crossfadeの時間変化：[MDN transition-timing-function](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/transition-timing-function)。補間曲線による見え方の比較。単なるeasingを実測した物理バネと称さない。
- Staggered Reveal：[MDN animation-delay](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/animation-delay) は開始遅延、負の遅延を含む時間指定を説明する。時間差を付ける原理の参考であり、具体的なリストUIの初出根拠ではない。
- Shared Element/Crossfade：[MDN View Transition API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API) は状態間の遷移と同一文書/文書間のAPIを説明する。今回がCSS/DOMの独自補間ならnative View Transition API採用とは称さない。アニメーションを飛ばすことと状態更新を巻き戻すことは別に設計する。
- State Transition Buttonの歴史的な初出・特定製品の元実装はUNKNOWN。一般的な非同期状態表示の独自教材であり、実ネットワーク処理ではない。

Material Design 3のprogressページもアクセスしたが、取得本文はJavaScript必須の案内のみで、本文確認済み根拠には用いていない。

## 歴史・著作権・ライセンスの境界

全12部品の最初の考案者・初出年は今回確定しておらずUNKNOWN。現行公式ドキュメントに使用例があることと、歴史的起源の証明を混同しない。旧Web/Flash/OSとの対照は既存館内展示との表現上の比較であり、系譜や直接の技術継承を立証するものではない。

実装・図形・表示例は独自制作。参照先のソース、画像、製品ロゴ、音源を取り込まない。リンク先の権利表示は各権利者に属し、出典の記載は再利用許諾の代用にならない。製品名は説明上の参照に限り、公式提供・提携・商標利用許諾を主張しない。参照ページ全体のライセンス調査や法的判断は今回未実施。新しい外部資産を後から取り込む場合は個別にライセンスと利用条件を確認する。
