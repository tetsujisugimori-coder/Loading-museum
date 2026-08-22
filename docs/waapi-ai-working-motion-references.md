# AI Working Motion — 調査台帳

確認日: 2026-08-22

この展示は各社のロゴや現行画面を複製するものではありません。公式資料から確認できる「作業の段階」「進捗」「完了・失敗」「ツール実行」などの情報設計を参照し、WAAPI教材として抽象化しています。色・形・軌道・テンポの細部は、公式資料で確認できた場合を除き創作です。

| 展示 | 対象製品・環境 | 公式資料で確認したこと | 展示上の扱い |
| --- | --- | --- | --- |
| Modular Thought Blocks | OpenAI Codex app / ChatGPT Work・Codex | Codex appはタスクを独立スレッドで進め、差分や成果をレビューできる。Codexはファイル編集、コマンド、テストを扱う。 | タスクをブロックで組み立てる表現は抽象再構成。公式アニメーションの再現ではない。 |
| Ribbon Assembly | Microsoft Copilot Tasks / Microsoft 365 Copilot Agent activity | Tasks viewで進捗・手順・中間結果を確認し、停止できる。Agent activityにはin progress / completed / failed / waiting、時刻、ツール・アクション、結果が表示される。 | リボンの形・色・編み上げは創作。公式資料では細かな動作中アニメーションを確認できなかった。 |
| Code Companion | GitHub Copilot coding agent / IDE agent mode | タスクを手順に分解し、ファイル読取・編集・コマンド・テストを実行して自己修正する。セッション進捗を追跡できる。 | コード行とツールカードの積層は抽象再構成。 |
| Sparkle Reasoning | Gemini Deep Research / Gemini app web・mobile | リサーチ計画を提示し、検索・読解・分析・再検索・統合を行う。進行中の思考や分析状態を示す資料がある。 | 点群とスパークルの収束は抽象再構成。 |
| Warm Thought Pulse | Claude extended thinking / web・mobile | Thinkingインジケーター、経過時間、展開可能なThinkingセクションがある。 | 暖色の核と呼吸テンポは創作。公式マークの再現ではない。 |
| Answer Weave | Perplexity Research / Pro Search、web・mobile・Mac | 検索、情報源の読解、推論、計画更新、レポート統合を行い、Pro Searchは質問の分解やアプローチを示す。 | 情報線を回答と引用ノードへ編む外観は抽象再構成。 |

## 公式参照先

- OpenAI: [Introducing the Codex app](https://openai.com/index/introducing-the-codex-app/)、[ChatGPT Work and Codex](https://help.openai.com/en/articles/20001275-chatgpt-work-and-codex)、[Work with Codex from anywhere](https://openai.com/index/work-with-codex-from-anywhere/)
- Microsoft: [Using Copilot Tasks](https://support.microsoft.com/en-us/microsoft-copilot/using-copilot-tasks)、[View agent activity in Microsoft 365 Copilot](https://learn.microsoft.com/en-us/microsoft-agent-365/observe-agents-microsoft-365-copilot)
- GitHub: [Use Copilot agents](https://docs.github.com/en/copilot/how-tos/copilot-on-github/use-copilot-agents)、[Asking GitHub Copilot questions in your IDE](https://docs.github.com/en/copilot/how-tos/chat-with-copilot/chat-in-ide)、[Working with agent sessions](https://docs.github.com/en/copilot/how-tos/github-copilot-app/agent-sessions)
- Google: [Tips for Gemini Deep Research](https://blog.google/products-and-platforms/products/gemini/tips-how-to-use-deep-research/)、[Use Deep Research in Gemini Apps](https://support.google.com/gemini/answer/15719111?hl=en)、[New Gemini app features](https://blog.google/products-and-platforms/products/gemini/new-gemini-app-features-march-2025/)
- Anthropic: [Using extended thinking](https://support.anthropic.com/en/articles/10574485-using-extended-thinking)、[Claude Opus 4.6](https://www.anthropic.com/news/claude-opus-4-6)
- Perplexity: [What is Research mode?](https://www.perplexity.ai/help-center/en/articles/10738684-what-is-research-mode)、[What is Pro Search?](https://www.perplexity.ai/help-center/en/articles/10352903-what-is-pro-search)

## 共通状態モデル

個別カードは `Idle → Starting → Working → Tool / Reasoning → Completing → Complete` と `Error` を使います。比較モードは `Request received → Searching → Reading → Reasoning → Writing → Verifying → Complete` を使います。反復アニメーションは作業中だけ生成し、Complete・Error・Reset・カードの画面外移動・比較パネルを閉じた時・unmount時にキャンセルします。reduced motionでは反復を生成しません。
