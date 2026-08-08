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
];

export const domAnimationExhibitCount = domAnimationExhibits.length;
