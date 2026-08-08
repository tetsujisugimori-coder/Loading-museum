export type DomAnimationCategory =
  | "transform"
  | "style"
  | "class"
  | "structure"
  | "measurement"
  | "animation";

export type DomAnimationExhibit = {
  id: string;
  title: string;
  description: string;
  apiNames: readonly string[];
  code: string;
  category: DomAnimationCategory;
};

export const domAnimationExhibits: readonly DomAnimationExhibit[] = [
  { id: "dom-transform-move", title: "Transform Move", description: "transformで要素を左右へ移動します。連続的な位置変更では、レイアウトに影響しやすいleft/topよりtransformを優先するのが基本です。", apiNames: ["element.style.transform"], code: 'element.style.transform = "translateX(160px)";', category: "transform" },
  { id: "dom-rotate", title: "Rotate", description: "同じtransform APIへ回転値を渡す、独立した回転の展示です。", apiNames: ["element.style.transform"], code: 'element.style.transform = "rotate(180deg)";', category: "transform" },
  { id: "dom-scale", title: "Scale", description: "transformで大きさを変え、元のレイアウトを組み替えずに表示を拡大・縮小します。", apiNames: ["element.style.transform"], code: 'element.style.transform = "scale(1.5)";', category: "transform" },
  { id: "dom-opacity", title: "Opacity Fade", description: "opacityをDOM APIから変更します。対象が見えない状態でも、下の状態表示で値を確認できます。", apiNames: ["element.style.opacity"], code: 'element.style.opacity = "0";', category: "style" },
  { id: "dom-class-list", title: "classList Toggle", description: "classListはCSSの状態名を足し引きし、複数の見た目をまとめて切り替えます。", apiNames: ["classList.add", "classList.remove", "classList.toggle"], code: 'element.classList.toggle("is-active");', category: "class" },
  { id: "dom-custom-property", title: "CSS Custom Property", description: "JavaScriptからCSS変数を変えると、CSS側の色・回転・サイズへまとめて反映できます。", apiNames: ["style.setProperty"], code: 'element.style.setProperty("--rotation", "45deg");', category: "style" },
  { id: "dom-create-remove", title: "Create and Remove Element", description: "React管理外と明示した専用コンテナだけで、要素の追加・削除を試します。", apiNames: ["document.createElement", "append", "remove"], code: 'const item = document.createElement("div");\ncontainer.append(item);\nitem.remove();', category: "structure" },
  { id: "dom-bounding-rect", title: "Bounding Client Rect", description: "現在のビューポート基準の位置・サイズを読み取り、ドラッグや衝突判定の基礎になる値を確かめます。", apiNames: ["getBoundingClientRect"], code: 'const rect = element.getBoundingClientRect();', category: "measurement" },
  { id: "dom-manual-animation", title: "Manual DOM Animation", description: "requestAnimationFrameごとにtransform値を更新し、端で自動停止する小さな手動アニメーションです。", apiNames: ["requestAnimationFrame", "cancelAnimationFrame", "element.style.transform"], code: 'position += 1;\nelement.style.transform = `translateX(${position}px)`;\nrequestAnimationFrame(animate);', category: "animation" },
  { id: "dom-text-content", title: "textContent — 展示看板", description: "HTML要素の中にある文字を、安全な文字列として入れ替えます。HTMLを解釈して追加するAPIではありません。", apiNames: ["element.textContent"], code: 'sign.textContent = "NEXT EXHIBIT";', category: "style" },
  { id: "dom-attributes", title: "Attributes — 操作パネル", description: "属性はHTML要素が持つ追加情報・設定値です。disabledとaria-expandedを実際に変え、操作可否と開閉状態を対応させます。", apiNames: ["setAttribute", "removeAttribute"], code: 'panel.setAttribute("aria-expanded", "false");\nbutton.setAttribute("disabled", "");', category: "style" },
  { id: "dom-events", title: "addEventListener — 反応を待つ", description: "クリック・ポインター移動・キー入力などの出来事を待ち、起きた時に処理を実行する仕組みです。", apiNames: ["addEventListener"], code: 'target.addEventListener("click", handler);\ntarget.addEventListener("pointerenter", handler);\ntarget.addEventListener("keydown", handler);', category: "style" },
  { id: "dom-query-selector", title: "querySelector — 展示物を探す", description: "CSSセレクタでDOM内から最初に一致する要素を探し、スポットライトを当てます。", apiNames: ["querySelector"], code: 'room.querySelector("[data-piece=\"moon\"]");', category: "measurement" },
  { id: "dom-dataset", title: "dataset — 状態の札", description: "datasetはHTMLのdata-*属性をJavaScriptから読み書きする入口です。展示カードの状態札を切り替えます。", apiNames: ["element.dataset"], code: 'card.dataset.state = "complete";', category: "style" },
  { id: "dom-focus", title: "focus() — 入力場所へ案内", description: "focus()はキーボード操作の開始位置を入力欄へ移します。見た目だけでなく、次に入力する場所を導きます。", apiNames: ["element.focus"], code: 'searchInput.focus();', category: "style" },
  { id: "dom-scroll-into-view", title: "scrollIntoView() — 到着ゲートへ案内", description: "長いページで画面外にある目的地を見つけに行くため、別のHTML要素を見える位置までスクロールします。", apiNames: ["element.scrollIntoView"], code: 'gateRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });', category: "measurement" },
  { id: "dom-clone-node", title: "cloneNode() — 切符を複製", description: "cloneNode(true)は子要素も含めて展示物を複製します。複製後は同じidを残さないようにします。", apiNames: ["cloneNode", "append"], code: 'const copy = ticket.cloneNode(true);\ncopy.removeAttribute("id");\nrack.append(copy);', category: "structure" },
];

export const domAnimationExhibitCount = domAnimationExhibits.length;
