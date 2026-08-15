"use client";

import { useEffect, useRef, useState } from "react";

type DemoRunOptions = {
  stage: HTMLDivElement;
  reducedMotion: boolean;
  log: (message: string) => void;
};

type DomOperation = {
  id: string;
  title: string;
  action: string;
  apis: readonly string[];
  codeExample: string;
  run: (options: DemoRunOptions) => void | (() => void);
};

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function usePrefersReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);
    const updatePreference = () => setReducedMotion(mediaQuery.matches);

    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);

    return () => {
      mediaQuery.removeEventListener("change", updatePreference);
    };
  }, []);

  return reducedMotion;
}

function createListItem(documentRef: Document, text: string, className?: string) {
  const item = documentRef.createElement("li");
  item.className = className ?? "domOperationItem";
  item.textContent = text;
  return item;
}

const domOperations: readonly DomOperation[] = [
  {
    id: "operation-01-create-append",
    title: "1. 要素を作って末尾へ追加",
    action: "`createElement` と `appendChild` で新しいDOMノードを追加します。",
    apis: ["document.createElement", "appendChild", "textContent"],
    codeExample: `const item = document.createElement("li");
item.textContent = "C";
list.appendChild(item);`,
    run({ stage, log }) {
      const list = stage.ownerDocument.createElement("ul");
      list.className = "domOperationList";
      list.appendChild(createListItem(stage.ownerDocument, "A"));
      list.appendChild(createListItem(stage.ownerDocument, "B"));

      const item = createListItem(stage.ownerDocument, "C", "domOperationItem domOperationAdded");
      list.appendChild(item);

      stage.appendChild(list);
      log(`appendChild により ${list.children.length} 件を生成しました。`);
    },
  },
  {
    id: "operation-02-prepend",
    title: "2. 要素を先頭へ差し込む",
    action: "`prepend` で新しいノードを先頭へ挿入します。",
    apis: ["prepend", "textContent"],
    codeExample: `const first = document.createElement("li");
first.textContent = "A";
list.prepend(first);`,
    run({ stage, log }) {
      const list = stage.ownerDocument.createElement("ul");
      list.className = "domOperationList";
      list.appendChild(createListItem(stage.ownerDocument, "C"));
      list.appendChild(createListItem(stage.ownerDocument, "D"));

      const first = createListItem(
        stage.ownerDocument,
        "A",
        "domOperationItem domOperationAdded",
      );
      list.prepend(first);

      stage.appendChild(list);
      log(`prepend で ${first.textContent} を先頭に配置しました。`);
    },
  },
  {
    id: "operation-03-insert-before",
    title: "3. 任意位置へ差し込む",
    action: "`insertBefore` で特定ノードの前に新しいノードを入れます。",
    apis: ["insertBefore", "querySelectorAll"],
    codeExample: `const after = list.children[1];
list.insertBefore(node, after);`,
    run({ stage, log }) {
      const list = stage.ownerDocument.createElement("ul");
      list.className = "domOperationList";
      const anchor = createListItem(stage.ownerDocument, "C");
      list.appendChild(createListItem(stage.ownerDocument, "A"));
      list.appendChild(anchor);

      const node = createListItem(
        stage.ownerDocument,
        "B",
        "domOperationItem domOperationAdded",
      );
      list.insertBefore(node, anchor);

      stage.appendChild(list);
      const items = Array.from(list.children, (child) => child.textContent).join(", ");
      log(`insertBefore で順序を [${items}] に変更しました。`);
    },
  },
  {
    id: "operation-04-set-attribute",
    title: "4. 属性を付与して識別",
    action: "`setAttribute` でDOM属性を付け、`getAttribute` で確認します。",
    apis: ["setAttribute", "getAttribute", "textContent"],
    codeExample: `button.setAttribute("data-purpose", "dom-demo");
button.getAttribute("data-purpose");`,
    run({ stage, log }) {
      const button = stage.ownerDocument.createElement("button");
      button.type = "button";
      button.textContent = "DOM で属性を確認";
      button.setAttribute("data-purpose", "education-demo");
      button.setAttribute("aria-label", "DOM属性デモボタン");

      stage.appendChild(button);
      log(`data-purpose = ${button.getAttribute("data-purpose")}`);
    },
  },
  {
    id: "operation-05-remove-attribute",
    title: "5. 一時属性を取り除く",
    action: "`setAttribute` で設定した属性を `removeAttribute` で削除します。",
    apis: ["setAttribute", "removeAttribute", "hasAttribute"],
    codeExample: `panel.setAttribute("aria-hidden", "true");
panel.removeAttribute("aria-hidden");`,
    run({ stage, log }) {
      const box = stage.ownerDocument.createElement("div");
      box.className = "domOperationBox";
      box.setAttribute("aria-hidden", "true");

      const info = stage.ownerDocument.createElement("p");
      info.className = "domOperationOutput";
      info.textContent = "初期: aria-hidden=true";

      box.removeAttribute("aria-hidden");
      info.textContent = `削除後: aria-hidden=${box.hasAttribute("aria-hidden")}`;

      stage.appendChild(box);
      stage.appendChild(info);
      log(info.textContent);
    },
  },
  {
    id: "operation-06-class-list-add-remove",
    title: "6. classList で状態を切り替える",
    action: "`classList.add` と `classList.remove` で見た目の状態を分けます。",
    apis: ["classList.add", "classList.remove", "className"],
    codeExample: `box.classList.add("is-active");
box.classList.remove("is-active");`,
    run({ stage, log }) {
      const box = stage.ownerDocument.createElement("div");
      box.className = "domOperationBox";
      box.textContent = "classList.add を実行中";
      box.classList.add("is-active");

      const info = stage.ownerDocument.createElement("p");
      info.className = "domOperationOutput";
      info.textContent = `現在の class: ${box.className}`;

      stage.appendChild(box);
      stage.appendChild(info);
      log(`classList.add で "is-active" を追加しました。`);
    },
  },
  {
    id: "operation-07-class-toggle-loop",
    title: "7. classList.toggle のループ",
    action: "`toggle` を繰り返して、短時間だけ状態を点滅させます。",
    apis: ["classList.toggle", "setInterval", "clearInterval"],
    codeExample: `let step = 0;
const timer = setInterval(() => {
  marker.classList.toggle("is-active");
}, 420);`,
    run({ stage, log, reducedMotion }) {
      const marker = stage.ownerDocument.createElement("div");
      marker.className = "domOperationMarker";
      stage.appendChild(marker);

      let step = 0;
      const maxStep = reducedMotion ? 1 : 6;
      const timer = window.setInterval(() => {
        marker.classList.toggle("is-highlight");
        step += 1;
        log(`classList.toggle を ${step} 回実行しました。`);

        if (step >= maxStep) {
          window.clearInterval(timer);
          log(`classList.toggle を ${step} 回で停止しました。`);
        }
      }, reducedMotion ? 0 : 450);

      return () => window.clearInterval(timer);
    },
  },
  {
    id: "operation-08-style-set-property",
    title: "8. style.setProperty で見た目を変更",
    action: "`style.setProperty` で CSS 変数を更新し、動きを作ります。",
    apis: ["style.setProperty", "style.removeProperty", "setTimeout"],
    codeExample: `box.style.setProperty("--alpha", "0.2");
box.style.removeProperty("--alpha");`,
    run({ stage, log, reducedMotion }) {
      const panel = stage.ownerDocument.createElement("div");
      panel.className = "domOperationVisual";
      panel.textContent = "style.setProperty";

      const levels = ["#e8fff0", "#d3e7ff", "#ffe9f2", "#ffe2a8"];
      let step = 0;

      if (reducedMotion) {
        panel.style.setProperty("background", "#7dffb1");
        stage.appendChild(panel);
        log("reduced-motion では1回のみ更新して静的表示します。");
      } else {
        const timer = window.setInterval(() => {
          panel.style.setProperty("background", levels[step % levels.length]);
          step += 1;
          log(`style.setProperty で背景を${step}段階目へ更新`);

          if (step >= levels.length) {
            window.clearInterval(timer);
            log("背景の更新を終了しました。終端色を表示します。");
          }
        }, 300);

        stage.appendChild(panel);
        return () => window.clearInterval(timer);
      }
    },
  },
  {
    id: "operation-09-dataset-state",
    title: "9. dataset で状態を保持",
    action: "`dataset` でDOM要素に状態を保存し、あとで読み替えます。",
    apis: ["dataset", "textContent"],
    codeExample: `node.dataset.state = "ready";
node.dataset.state = "done";`,
    run({ stage, log }) {
      const node = stage.ownerDocument.createElement("div");
      node.className = "domOperationBox";
      node.dataset.state = "ready";
      const label = stage.ownerDocument.createElement("p");
      label.className = "domOperationOutput";
      label.textContent = `現在: ${node.dataset.state}`;

      node.dataset.state = "done";
      label.textContent += ` → ${node.dataset.state}`;
      stage.append(node, label);
      log(`dataset.state が "${node.dataset.state}" に更新されました。`);
    },
  },
  {
    id: "operation-10-text-content",
    title: "10. textContent で表示文字列を更新",
    action: "文字列を直接更新し、HTML を壊さずに安全に表示内容だけ変えます。",
    apis: ["textContent"],
    codeExample: `caption.textContent = "開始";
caption.textContent = "完了";`,
    run({ stage, log }) {
      const note = stage.ownerDocument.createElement("p");
      note.className = "domOperationBox";
      note.textContent = "準備中...";
      stage.appendChild(note);

      window.requestAnimationFrame(() => {
        note.textContent = "textContent でノードのテキストを更新しました。";
        log("textContent でノードのテキストを更新しました。");
      });
    },
  },
  {
    id: "operation-11-query-selector-all",
    title: "11. querySelectorAll でまとめて操作",
    action: "同じ class のノードをまとめて取得し、反復して状態を付与します。",
    apis: ["querySelectorAll", "forEach", "classList.add"],
    codeExample: `const targets = scene.querySelectorAll(".tag");
targets.forEach((target) => target.classList.add("is-marked"));`,
    run({ stage, log }) {
      const scene = stage.ownerDocument.createElement("ul");
      scene.className = "domOperationList";

      for (let index = 1; index <= 6; index += 1) {
        scene.appendChild(createListItem(stage.ownerDocument, `${index}`, "domOperationItem domCandidate"));
      }

      const targets = scene.querySelectorAll<HTMLElement>(".domCandidate");
      targets.forEach((target, index) => {
        target.textContent = `P${index + 1}`;
        if (index % 2 === 0) {
          target.classList.add("is-marked");
        }
      });

      stage.appendChild(scene);
      log(`querySelectorAll で ${targets.length} 要素を取得し、偶数番号をハイライトしました。`);
    },
  },
  {
    id: "operation-12-closest",
    title: "12. closest で祖先をたどる",
    action: "クリック対象などから、指定 class の最も近い親要素を見つけます。",
    apis: ["closest", "append", "querySelector"],
    codeExample: `const scope = node.closest(".root");`,
    run({ stage, log }) {
      const wrapper = stage.ownerDocument.createElement("section");
      wrapper.className = "domClosestScope";

      const box = stage.ownerDocument.createElement("div");
      box.className = "domOperationBox";
      box.style.pointerEvents = "none";

      const child = stage.ownerDocument.createElement("span");
      child.className = "domClosestNode";
      child.textContent = "NODE";
      box.appendChild(child);
      wrapper.appendChild(box);

      const found = child.closest(".domClosestScope");
      const result = stage.ownerDocument.createElement("p");
      result.className = "domOperationOutput";
      result.textContent = found === wrapper ? "closest で親を検出しました。" : "closest に失敗しました。";

      stage.append(wrapper, result);
      log(found === wrapper ? "closest: wrapper を特定" : "closest: wrapper 未検出");
    },
  },
  {
    id: "operation-13-contains",
    title: "13. contains で包含関係を確認",
    action: "`contains` で親子関係をチェックし、構造を確認します。",
    apis: ["contains", "appendChild"],
    codeExample: `const ok = container.contains(child);`,
    run({ stage, log }) {
      const outer = stage.ownerDocument.createElement("div");
      outer.className = "domOperationBox";
      const inner = stage.ownerDocument.createElement("span");
      inner.textContent = "inner";
      outer.appendChild(inner);

      const result = stage.ownerDocument.createElement("p");
      result.className = "domOperationOutput";
      result.textContent = `contains: ${outer.contains(inner) ? "true" : "false"}`;

      stage.append(outer, result);
      log(`contains で outer が inner を含む: ${outer.contains(inner)}`);
    },
  },
  {
    id: "operation-14-clone-node",
    title: "14. cloneNode で複製",
    action: "既存ノードを `cloneNode` で複製し、内容を変えて表示します。",
    apis: ["cloneNode", "appendChild", "textContent"],
    codeExample: `const copy = source.cloneNode(true);
copy.textContent = "copy";`,
    run({ stage, log }) {
      const source = stage.ownerDocument.createElement("p");
      source.className = "domOperationBox";
      source.textContent = "ORIGINAL";

      const clone = source.cloneNode(true) as HTMLElement;
      clone.className = "domOperationBox domOperationClone";
      clone.textContent = "CLONE";

      stage.append(source, clone);
      log("cloneNode で複製を1件追加しました。属性と構造も複製されます。");
    },
  },
  {
    id: "operation-15-replace-children",
    title: "15. replaceChildren でまとめて入れ替え",
    action: "`replaceChildren` を使って既存子要素を一括で再構成します。",
    apis: ["replaceChildren", "append", "textContent"],
    codeExample: `box.replaceChildren(newNode1, newNode2);`,
    run({ stage, log }) {
      const box = stage.ownerDocument.createElement("div");
      box.className = "domOperationList";
      box.append(
        createListItem(stage.ownerDocument, "before-1", "domOperationItem"),
        createListItem(stage.ownerDocument, "before-2", "domOperationItem"),
      );

      const after = [
        createListItem(stage.ownerDocument, "after-1", "domOperationItem"),
        createListItem(stage.ownerDocument, "after-2", "domOperationItem domOperationAdded"),
      ];

      box.replaceChildren(...after);
      stage.appendChild(box);

      log(`replaceChildren で一括入れ替えを実行し、${box.children.length} 要素に差し替えました。`);
    },
  },
  {
    id: "operation-16-event-listener",
    title: "16. addEventListener / removeEventListener",
    action: "イベントを追加して反応を確認し、離脱時に必ず解除します。",
    apis: ["addEventListener", "removeEventListener", "click"],
    codeExample: `const onClick = () => count += 1;
button.addEventListener("click", onClick);
button.removeEventListener("click", onClick);`,
    run({ stage, log }) {
      const control = stage.ownerDocument.createElement("button");
      control.type = "button";
      control.className = "runDemoButton";
      control.textContent = "クリックしてイベントを確認";

      const result = stage.ownerDocument.createElement("output");
      result.className = "domOperationOutput";

      let count = 0;
      result.textContent = "クリック回数: 0";

      const onClick = () => {
        count += 1;
        result.textContent = `クリック回数: ${count}`;
      };

      control.addEventListener("click", onClick);
      stage.append(control, result);
      log("addEventListener を登録しました。クリックで結果が更新されます。");

      return () => {
        control.removeEventListener("click", onClick);
      };
    },
  },
  {
    id: "operation-17-scroll-and-rect",
    title: "17. scrollIntoView と座標取得",
    action: "対象要素を画面内へ `scrollIntoView` し、`getBoundingClientRect` で位置を確認します。",
    apis: ["scrollIntoView", "getBoundingClientRect", "querySelector"],
    codeExample: `target.scrollIntoView({ behavior: "smooth", block: "center" });
const rect = target.getBoundingClientRect();`,
    run({ stage, log, reducedMotion }) {
      const rail = stage.ownerDocument.createElement("div");
      rail.className = "domScrollRail";

      for (let index = 1; index <= 18; index += 1) {
        const row = stage.ownerDocument.createElement("div");
        row.className = "domScrollRow";
        row.textContent = `row-${index}`;
        if (index === 14) {
          row.className = "domScrollRow domScrollTarget";
          row.textContent = "TARGET";
        }
        rail.appendChild(row);
      }

      const target = rail.querySelector<HTMLElement>(".domScrollTarget");

      if (target) {
        target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center" });

        const rect = target.getBoundingClientRect();
        const readout = stage.ownerDocument.createElement("p");
        readout.className = "domOperationOutput";
        readout.textContent = `getBoundingClientRect => x:${rect.x.toFixed(0)} y:${rect.y.toFixed(0)} w:${rect.width.toFixed(0)} h:${rect.height.toFixed(0)}`;
        stage.append(rail, readout);

        log("scrollIntoView で対象を中央表示し、矩形情報を取得しました。");
      }
    },
  },
];

function DomOperationCard({
  operation,
  operationIndex,
  reducedMotion,
}: {
  operation: DomOperation;
  operationIndex: number;
  reducedMotion: boolean;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const [result, setResult] = useState("まだ実行していません。");

  useEffect(() => {
    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, []);

  const run = () => {
    const stage = stageRef.current;
    if (!stage) return;

    cleanupRef.current?.();
    cleanupRef.current = null;
    stage.replaceChildren();
    setResult("実行中...");

    const cleanup = operation.run({
      stage,
      reducedMotion,
      log: setResult,
    });

    if (cleanup) {
      cleanupRef.current = cleanup;
    }
  };

  const reset = () => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    if (stageRef.current) {
      stageRef.current.replaceChildren();
    }
    setResult("リセットしました。");
  };

  return (
    <article className="domOperation">
      <div className="domOperationTopline">
        <span>{String(operationIndex + 1).padStart(2, "0")}</span>
        <span>{operation.apis.join(" / ")}</span>
      </div>
      <h4>{operation.title}</h4>
      <p className="domOperationAction">{operation.action}</p>
      <div
        className="domOperationStage"
        ref={stageRef}
        role="group"
        aria-label={`${operation.title}の実行結果表示エリア`}
      />
      <p className="domOperationResult" id={`${operation.id}-result`}>
        <strong>操作結果:</strong>
        {result}
      </p>
      <p className="domOperationMeta">
        <strong>使用API:</strong>
        {operation.apis.join(", ")}
      </p>
      <div className="domOperationControls">
        <button type="button" onClick={run}>
          再生
        </button>
        <button type="button" onClick={reset}>
          リセット
        </button>
      </div>
      <details className="codeDisclosure">
        <summary>コード例を見る</summary>
        <pre>
          <code>{operation.codeExample}</code>
        </pre>
      </details>
    </article>
  );
}

export function DomAnimationRoom() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const setVisibility = () => setIsVisible(document.visibilityState === "visible");
    setVisibility();
    document.addEventListener("visibilitychange", setVisibility);

    return () => {
      document.removeEventListener("visibilitychange", setVisibility);
    };
  }, []);

  return (
    <section className="roomCard roomCardDomAnimation">
      <button
        type="button"
        className="roomToggle"
        aria-expanded={isOpen}
        aria-controls="dom-animation-room-panel"
        onClick={() => setIsOpen((current) => !current)}
      >
        <span className="roomIndex">ROOM / DOM-ANIMATION</span>
        <span className="roomTitle">DOM ANIMATION ROOM</span>
        <span className="roomDescription">ブラウザDOM APIを直接触って動作差を確認</span>
        <span className="roomMeta">
          <span>17 操作デモ</span>
          <span>BASIC / INTERACTION / ACCESSIBILITY</span>
        </span>
        <span className="roomArrow" aria-hidden="true">
          ↓
        </span>
      </button>
      <div
        id="dom-animation-room-panel"
        className="roomPanel"
        data-open={isOpen}
        role="region"
        aria-hidden={!isOpen}
        inert={!isOpen}
      >
        <div className="roomPanelInner">
          <div className="domRoomBody">
            <div className="domRoomIntro">
              <p>17 OPERATIONS / DOM API DIRECT</p>
              <h3>DOM の命令を1つずつ体験しながら学ぶ展示室</h3>
              <p>
                API 実行前後の操作結果を直接比較し、`document` / `element` を通した
                DOM 操作の実体を体感します。reduced-motion 環境では長い連続更新を短縮します。
              </p>
            </div>
            <div className="domOperationsGrid">
              {domOperations.map((operation, operationIndex) => (
                <DomOperationCard
                  key={operation.id}
                  operation={operation}
                  operationIndex={operationIndex}
                  reducedMotion={prefersReducedMotion || !isVisible}
                />
              ))}
            </div>
          </div>
          <div className="roomCloseRow">
            <button
              className="roomCloseButton"
              type="button"
              onClick={() => setIsOpen(false)}
            >
              展示室を閉じる
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
