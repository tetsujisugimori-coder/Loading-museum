import type { SampleInteraction, SampleRenderKind, SampleVisualElement, WaapiSample } from "./waapiSamples";

const options = { duration: 480, easing: "cubic-bezier(.2,.8,.2,1)", iterations: 1, fill: "both" } satisfies KeyframeAnimationOptions;
const reducedOptions = { duration: 120, easing: "ease-out", iterations: 1, fill: "both" } satisfies KeyframeAnimationOptions;

function game(id: string, name: string, render: SampleRenderKind, description: string, tags: string[], interactionTypes: SampleInteraction[], visualElements: SampleVisualElement[]): WaapiSample {
  return { id, name, render, category: "Game UI", usage: ["Game feedback"], era: "2020s", sourceType: "Game", inspiredBy: "一般化したゲームUIの入力・判定・結果フィードバック", description, suitableFor: "入力から結果と余韻までを試すゲームUI", avoidFor: "判定条件や結果を動きだけで伝える場面", difficulty: "Advanced", intensity: "Strong", properties: ["opacity", "transform", "filter"], tags, interactionTypes, visualElements, stateKinds: ["Success", "Failure", "Finite"], inspirationType: "General Game Pattern", normal: { keyframes: [{ opacity: .35, transform: "scale(.92)" }, { opacity: 1, transform: "scale(1.06)" }, { opacity: 1, transform: "scale(1)" }], options, explanation: "入力後の予告、判定、結果、余韻を有限シーケンスで示します。" }, reduced: { keyframes: [{ opacity: .72 }, { opacity: 1 }], options: reducedOptions, explanation: "反復せず結果ラベルを更新します。" }, reducedMotionDescription: "移動・反復を止め、結果の文字・色・配置を即時更新します。", codePattern: "interaction" };
}

function ai(id: string, name: string, render: SampleRenderKind, inspiredBy: string, description: string, visualElements: SampleVisualElement[]): WaapiSample {
  const referenceByRender: Partial<Record<SampleRenderKind, [string, string]>> = {
    "ai-modular": ["https://openai.com/index/introducing-the-codex-app/", "Codex app / Web・desktop"],
    "ai-ribbon": ["https://support.microsoft.com/en-us/microsoft-copilot/using-copilot-tasks", "Microsoft Copilot Tasks / Web"],
    "ai-code": ["https://docs.github.com/en/copilot/how-tos/chat-with-copilot/chat-in-ide", "GitHub Copilot / IDE"],
    "ai-sparkle": ["https://support.google.com/gemini/answer/15719111?hl=en", "Gemini Deep Research / Web・mobile"],
    "ai-warm": ["https://support.anthropic.com/en/articles/10574485-using-extended-thinking", "Claude extended thinking / Web・mobile"],
    "ai-weave": ["https://www.perplexity.ai/help-center/en/articles/10738684-what-is-research-mode", "Perplexity Research / Web・mobile・Mac"],
  };
  const [referenceUrl, referenceEnvironment] = referenceByRender[render] ?? ["", ""];
  return { id, name, render, category: "AI Working Motion", usage: ["AI progress", "State machine"], era: "2020s", sourceType: "App", inspiredBy, description, suitableFor: "長いAI処理の現在地と終了状態の通知", avoidFor: "実際の製品ロゴや公式モーションと誤認させる表現", difficulty: "Advanced", intensity: "Standard", properties: ["opacity", "transform"], tags: ["ai", "working", "state machine"], interactionTypes: ["Click", "Automatic"], visualElements, stateKinds: ["Success", "Failure", "Continuous", "Finite"], inspirationType: "AI Product Interface", referenceUrl, referenceEnvironment, referenceCheckedOn: "2026-08-22", evidenceLabel: "Inspired reconstruction", normal: { keyframes: [{ opacity: .45, transform: "translateY(4px)" }, { opacity: 1, transform: "translateY(0)" }], options, explanation: "Working中だけ短い反復を継続し、状態遷移時に停止します。" }, reduced: { keyframes: [{ opacity: .72 }, { opacity: 1 }], options: reducedOptions, explanation: "反復せず状態ラベルを更新します。" }, reducedMotionDescription: "ループを行わず、進行状態を文字・色・静的配置で示します。", codePattern: "interaction" };
}

export const additionalWaapiSamples: readonly WaapiSample[] = [
  game("combat-damage-feedback", "Combat Damage Feedback", "combat", "NORMAL・GUARD・CRITICALを同じ対象で比較し、ヒット予告から数値の余韻まで再生します。", ["damage", "guard", "critical"], ["Click"], ["Character", "Typography", "Particles"]),
  game("reward-reveal-lab", "Reward Reveal Lab", "reward-lab", "Achievement・Quest Complete・Level Upを、異なる前兆と報酬の残り方で比較します。", ["achievement", "quest", "level up"], ["Click"], ["Typography", "Particles", "Layout"]),
  game("hit-stop-knockback", "Hit Stop & Knockback", "hit-stop", "ATTACK後に短い静止を挟み、敵を押し戻して着地点を残します。", ["hit stop", "knockback"], ["Click", "Timing"], ["Character", "Particles"]),
  game("perfect-parry", "Perfect Parry", "parry", "警告後の受付時間内入力はPARRY、早すぎ・遅すぎはFAILとして反応します。", ["parry", "timing"], ["Click", "Keyboard", "Timing"], ["Character", "Geometry", "Particles"]),
  game("dodge-afterimage", "Dodge Afterimage", "dodge", "攻撃予告に合わせた回避は残像とS-RANK、失敗時はHITと硬直を表示します。", ["dodge", "afterimage", "s-rank"], ["Click", "Keyboard", "Timing"], ["Character", "Typography"]),
  game("falling-block-line-clear", "Falling Block Line Clear", "line-clear", "DROP入力で列が着地し、完成行の発光・消去・詰め直しまで進みます。", ["blocks", "line clear"], ["Click", "Keyboard"], ["Geometry", "Layout", "Particles"]),
  game("match-3-cascade", "Match-3 Cascade", "match3", "SWAP後に一致判定、消去、落下、連鎖、スコア確定を順に示します。", ["match 3", "cascade"], ["Click", "Drag"], ["Geometry", "Layout", "Particles"]),
  game("pinball-bumper-hit", "Pinball Bumper Hit", "pinball", "LAUNCHした球がバンパーに当たり、局所反発・得点・軌跡の余韻を残します。", ["pinball", "bumper"], ["Click", "Keyboard", "Timing"], ["Geometry", "Particles"]),
  game("lock-on-reticle", "Lock-on Reticle", "lockon", "PREVIOUS / NEXTまたは左右キーで3対象を切り替え、照準・名称・距離を同時更新します。", ["lock on", "reticle", "keyboard"], ["Click", "Keyboard", "Automatic"], ["Character", "Geometry"]),
  game("inventory-equip-snap", "Inventory Equip Snap", "equip", "アイテム選択またはドラッグ後に装備スロットへ吸着し、能力値差分を確定します。", ["inventory", "equip", "drag"], ["Click", "Drag", "Keyboard"], ["Layout", "Geometry", "Typography"]),
  game("status-effect-lab", "Status Effect Lab", "status-effects", "BURN・FREEZE・POISONを別形状で付与し、CLEARで通常状態へ戻します。", ["status", "burn", "freeze", "poison"], ["Click"], ["Character", "Particles", "Typography"]),
  game("turn-order-reflow", "Turn Order Reflow", "turn-order", "HASTE・STUN・NORMALIZEでDOM順を含む行動順カードを再配置します。", ["turn order", "reflow"], ["Click", "Keyboard"], ["Layout", "Character"]),
  game("battle-transition", "Battle Transition", "battle-transition", "ENCOUNTERから画面を覆い、戦闘レイアウトを公開してREADYで止まります。", ["battle", "transition"], ["Click", "Automatic"], ["Transition", "Layout"]),
  game("race-countdown-launch", "Race Countdown & Launch", "race", "READYから3・2・1・GOへ進み、早押しはFALSE START、成功時は加速します。", ["race", "countdown", "false start"], ["Click", "Keyboard", "Timing"], ["Typography", "Character", "Transition"]),
  ai("ai-modular-thought-blocks", "ChatGPT / Codex-inspired Modular Thought Blocks", "ai-modular", "Codexのタスク進捗とレビュー単位を着想にした抽象再構成", "探索・編集・テストのブロックが組み上がる、公式ロゴを模倣しない状態表示です。", ["Layout", "Geometry", "Typography"]),
  ai("ai-ribbon-assembly", "Microsoft Copilot-inspired Ribbon Assembly", "ai-ribbon", "Copilotという名称から着想した創作的なリボン表現（現行UIの再現ではありません）", "複数色の帯が作業段階を編む、出典で細部を確認できない創作的抽象表現です。", ["Geometry", "Transition"]),
  ai("ai-code-companion", "GitHub Copilot-inspired Code Companion", "ai-code", "GitHub Copilotのエージェント手順・ツール実行・進捗表示を着想にした抽象再構成", "コード行、ツール実行、テスト結果を順に積み上げます。", ["Typography", "Layout"]),
  ai("ai-sparkle-reasoning", "Gemini-inspired Sparkle Reasoning", "ai-sparkle", "Gemini Deep Researchの計画・検索・分析・レポート進行を着想にした抽象再構成", "探索点が収束し、検証済みの答えへ変わる状態表示です。", ["Particles", "Geometry"]),
  ai("ai-warm-thought-pulse", "Claude-inspired Warm Thought Pulse", "ai-warm", "ClaudeのThinking表示と経過時間表示を着想にした抽象再構成", "暖色の呼吸する核と経過ラベルでWorkingを示します。", ["Geometry", "Typography"]),
  ai("ai-answer-weave", "Perplexity-inspired Answer Weave", "ai-weave", "Perplexity Researchの検索・読解・計画更新・引用付き統合を着想にした抽象再構成", "情報線が回答と引用ノードへ編み込まれます。", ["Layout", "Typography", "Geometry"]),
];
