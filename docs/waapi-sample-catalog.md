# WAAPI標本一覧（47件）

## 再生ポリシー

- `manual-entrance`: Fade In / Slide In Left。初期状態は非表示・画面外で、ボタン操作まで再生しない。
- `manual-exit`: Fade Out / Slide Out Right。初期状態は表示中で、ボタン操作まで退出しない。
- `direct-interaction`: Button Press / Toggle Switch / ゲーム標本。対象そのもの、または意味のある操作ボタンで状態を変える。
- `auto-finite`: 一度だけ完了して終了状態を保持する有限標本。
- `working-loop`: AI Working Motion。作業フェーズ中だけ反復し、完了・エラー・Reset・画面外・閉じる操作で停止する。

## 基礎・Web・歴史展示（19件）

Fade In / Fade Out / Slide In Left / Slide Out Right / Scale Pop / Bounce / Shake / Button Press / Modal Open / Close / Toast Enter / Exit / Toggle Switch / Typewriter / Character by Character / Counter Roll / Cursor Blink / Classic Mac 腕時計カーソル風 / Dock Bounce風 / ゲーム機風 幾何学オブジェクト形成 / 1990年代Web風 Marquee

## Game UI（22件）

Treasure Chest Open / Rhythm PERFECT / GOOD / MISS / Coin Pickup Arc / Combo Counter Escalation / HP Bar Damage / Heal / Boss Entrance / Menu Selection Cursor / Card Deal / Shuffle / Combat Damage Feedback / Reward Reveal Lab / Hit Stop & Knockback / Perfect Parry / Dodge Afterimage / Falling Block Line Clear / Match-3 Cascade / Pinball Bumper Hit / Lock-on Reticle / Inventory Equip Snap / Status Effect Lab / Turn Order Reflow / Battle Transition / Race Countdown & Launch

追加ゲーム14件は、名前だけを変えた共通プレビューではなく、それぞれ固有のDOM、状態遷移、WAAPIキーフレームを持つ。Card Deal / Shuffleは `Shuffle → Deal → Select → Drag → Play → Resolve → Discard → Reset` を個別操作できる。

## AI Working Motion（6件）

ChatGPT / Codex-inspired Modular Thought Blocks / Microsoft Copilot-inspired Ribbon Assembly / GitHub Copilot-inspired Code Companion / Gemini-inspired Sparkle Reasoning / Claude-inspired Warm Thought Pulse / Perplexity-inspired Answer Weave

各カードは Idle / Starting / Searching / Reading / Reasoning / Tool / Writing / Verifying / Complete / Error を共有しつつ、ブロック、リボン、コード行、星群、暖色核、引用ネットワークの固有DOMと固有モーションを使う。出典と再構成の境界は [調査台帳](./waapi-ai-working-motion-references.md) を参照。
