"use client";

import { useEffect, useRef, useState } from "react";
import { cursorExhibits, type CursorExhibit, type CursorExhibitType } from "../data/cursorExhibits";

type Point = { x: number; y: number };
type Ripple = Point & { id: number };

const TRAIL_COUNT = 5;

function CursorShape({ kindRef }: { kindRef: React.RefObject<HTMLSpanElement | null> }) {
  return (
    <span ref={kindRef} className="virtualCursor" data-kind="arrow" aria-hidden="true">
      <span className="cursorGlyph" />
      <span className="cursorWaitRing" />
    </span>
  );
}

function DemoTarget({ type, setKind, dragRef }: {
  type: CursorExhibitType;
  setKind: (kind: CursorExhibitType | "grab") => void;
  dragRef: React.RefObject<HTMLButtonElement | null>;
}) {
  if (type === "link") {
    return (
      <button
        className="cursorLinkTarget"
        type="button"
        onPointerEnter={() => setKind("link")}
        onPointerLeave={() => setKind("arrow")}
        onFocus={() => setKind("link")}
        onBlur={() => setKind("arrow")}
      >
        OPEN DIGITAL ARCHIVE <span aria-hidden="true">↗</span>
      </button>
    );
  }

  if (type === "ibeam") {
    return (
      <div className="cursorTextSample" onPointerEnter={() => setKind("ibeam")} onPointerLeave={() => setKind("arrow")}>
        <p>文字を選ぶ位置には、細いIビームが現れます。</p>
        <label>
          試し書き
          <input defaultValue="Digital motion" onFocus={() => setKind("ibeam")} onBlur={() => setKind("arrow")} />
        </label>
      </div>
    );
  }

  if (type === "forbidden") {
    return (
      <button
        className="cursorForbiddenTarget"
        type="button"
        aria-disabled="true"
        onClick={(event) => event.preventDefault()}
        onPointerEnter={() => setKind("forbidden")}
        onPointerLeave={() => setKind("arrow")}
        onFocus={() => setKind("forbidden")}
        onBlur={() => setKind("arrow")}
      >
        <span aria-hidden="true">⊘</span> この資料は閲覧できません
      </button>
    );
  }

  if (type === "drag") {
    return <button ref={dragRef} className="cursorDragTarget" type="button">DRAG OBJECT <span>06</span></button>;
  }

  if (type === "click") {
    return <span className="cursorStageInstruction">CLICK / TAP ANYWHERE</span>;
  }

  if (type === "trail") {
    return <span className="cursorStageInstruction">TRACE A SHORT PATH</span>;
  }

  if (type === "waiting") {
    return <span className="cursorStageInstruction">BACKGROUND PROCESS / ACTIVE</span>;
  }

  return <span className="cursorStageInstruction">MOVE POINTER IN THIS FIELD</span>;
}

function CursorPlayground({ exhibit, roomOpen }: { exhibit: CursorExhibit; roomOpen: boolean }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLSpanElement>(null);
  const dragRef = useRef<HTMLButtonElement>(null);
  const trailRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const frameRef = useRef<number | null>(null);
  const latestPoint = useRef<Point>({ x: 32, y: 32 });
  const trailPoints = useRef<Point[]>(Array.from({ length: TRAIL_COUNT }, () => ({ x: 32, y: 32 })));
  const dragState = useRef<{ pointerId: number; offsetX: number; offsetY: number } | null>(null);
  const dragPosition = useRef<Point>({ x: 0, y: 0 });
  const rippleId = useRef(0);
  const rippleTimers = useRef<number[]>([]);
  const [ripples, setRipples] = useState<Ripple[]>([]);

  useEffect(() => () => {
    if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    rippleTimers.current.forEach((timer) => window.clearTimeout(timer));
  }, []);

  useEffect(() => {
    if (roomOpen) return;

    const stage = stageRef.current;
    if (stage) stage.dataset.pointerActive = "false";
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    dragState.current = null;
    if (dragRef.current) dragRef.current.dataset.dragging = "false";
  }, [roomOpen]);

  const setKind = (kind: CursorExhibitType | "grab") => {
    if (cursorRef.current) cursorRef.current.dataset.kind = kind;
  };

  const positionCursor = (point: Point) => {
    latestPoint.current = point;
    if (frameRef.current !== null) return;
    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = null;
      const cursor = cursorRef.current;
      if (cursor) cursor.style.transform = `translate3d(${latestPoint.current.x}px, ${latestPoint.current.y}px, 0)`;

      if (exhibit.type === "trail") {
        trailPoints.current = [latestPoint.current, ...trailPoints.current.slice(0, TRAIL_COUNT - 1)];
        trailRefs.current.forEach((trail, index) => {
          const trailPoint = trailPoints.current[index];
          if (trail && trailPoint) trail.style.transform = `translate3d(${trailPoint.x}px, ${trailPoint.y}px, 0)`;
        });
      }
    });
  };

  const localPoint = (event: React.PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(10, Math.min(bounds.width - 28, event.clientX - bounds.left)),
      y: Math.max(10, Math.min(bounds.height - 28, event.clientY - bounds.top)),
    };
  };

  const moveDragTarget = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragState.current;
    const target = dragRef.current;
    if (!drag || !target || drag.pointerId !== event.pointerId) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const halfWidth = target.offsetWidth / 2;
    const halfHeight = target.offsetHeight / 2;
    const x = Math.max(-bounds.width / 2 + halfWidth + 12, Math.min(bounds.width / 2 - halfWidth - 12, event.clientX - bounds.left - drag.offsetX));
    const y = Math.max(-bounds.height / 2 + halfHeight + 12, Math.min(bounds.height / 2 - halfHeight - 12, event.clientY - bounds.top - drag.offsetY));
    dragPosition.current = { x, y };
    target.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  };

  const addRipple = (point: Point) => {
    const id = ++rippleId.current;
    setRipples((current) => [...current.slice(-5), { id, ...point }]);
    const timer = window.setTimeout(() => {
      setRipples((current) => current.filter((ripple) => ripple.id !== id));
    }, 650);
    rippleTimers.current.push(timer);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const point = localPoint(event);
    positionCursor(point);
    if (exhibit.type === "click") addRipple(point);

    if (exhibit.type === "drag" && dragRef.current?.contains(event.target as Node)) {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      const bounds = event.currentTarget.getBoundingClientRect();
      dragState.current = {
        pointerId: event.pointerId,
        offsetX: event.clientX - bounds.left - dragPosition.current.x,
        offsetY: event.clientY - bounds.top - dragPosition.current.y,
      };
      dragRef.current.dataset.dragging = "true";
      setKind("grab");
    }
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragState.current?.pointerId !== event.pointerId) return;
    dragState.current = null;
    if (dragRef.current) dragRef.current.dataset.dragging = "false";
    setKind("drag");
  };

  const initialKind = exhibit.type === "waiting" ? "waiting" : exhibit.type === "drag" ? "drag" : "arrow";

  const activatePointer = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch") return;

    const cursor = cursorRef.current;
    if (!cursor) return;

    const point = localPoint(event);
    latestPoint.current = point;
    cursor.style.transform = `translate3d(${point.x}px, ${point.y}px, 0)`;
    setKind(initialKind);
    event.currentTarget.dataset.pointerActive = "true";
  };

  return (
    <div
      ref={stageRef}
      className="cursorPlayground"
      data-demo={exhibit.type}
      aria-label={`${exhibit.name}の体験領域。${exhibit.interaction}`}
      onPointerEnter={activatePointer}
      onPointerLeave={(event) => {
        event.currentTarget.dataset.pointerActive = "false";
      }}
      onPointerMove={(event) => {
        positionCursor(localPoint(event));
        moveDragTarget(event);
      }}
      onPointerDown={handlePointerDown}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <DemoTarget type={exhibit.type} setKind={setKind} dragRef={dragRef} />
      {exhibit.type === "trail" && Array.from({ length: TRAIL_COUNT }, (_, index) => (
        <span key={index} ref={(node) => { trailRefs.current[index] = node; }} className="cursorTrailDot" style={{ opacity: (TRAIL_COUNT - index) / (TRAIL_COUNT + 2) }} aria-hidden="true" />
      ))}
      {ripples.map((ripple) => (
        <span key={ripple.id} className="cursorRipple" style={{ left: ripple.x, top: ripple.y }} aria-hidden="true" />
      ))}
      <CursorShape kindRef={cursorRef} />
      <span className={`cursorMobilePreview cursorMobilePreview-${exhibit.type}`} aria-hidden="true"><span /></span>
    </div>
  );
}

function CursorExhibitCard({ exhibit, roomOpen }: { exhibit: CursorExhibit; roomOpen: boolean }) {
  return (
    <article className="cursorExhibit">
      <div className="cursorExhibitTopline"><span>{exhibit.category}</span><span>{exhibit.period}</span></div>
      <h3>{exhibit.name}</h3>
      <p className="cursorExplanation">{exhibit.description}</p>
      <CursorPlayground exhibit={exhibit} roomOpen={roomOpen} />
      <dl className="cursorFacts">
        <div><dt>目的</dt><dd>{exhibit.purpose}</dd></div>
        <div><dt>操作</dt><dd>{exhibit.interaction}</dd></div>
        <div><dt>技術</dt><dd>{exhibit.technologies.join(" / ")}</dd></div>
      </dl>
      <p className="implementationNote"><strong>実装コメント</strong>{exhibit.implementationNote}</p>
    </article>
  );
}

export function CursorExhibitRoom() {
  const [isOpen, setIsOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);

  const closeRoom = () => {
    setIsOpen(false);
    toggleRef.current?.focus();
  };

  return (
    <article className="roomCard roomCardCursor">
      <button ref={toggleRef} id="cursor-room-toggle" className="roomToggle" type="button" aria-expanded={isOpen} aria-controls="cursor-room-panel" onClick={() => setIsOpen((current) => !current)}>
        <span className="roomIndex">ROOM / CURSOR</span>
        <span className="roomTitle">カーソル展示室</span>
        <span className="roomDescription">形、状態、軌跡で操作の意味を伝えるポインター表現</span>
        <span className="roomMeta"><span>1960年代〜現在</span><span>{cursorExhibits.length} EXHIBITS</span></span>
        <span className="roomArrow" aria-hidden="true">↓</span>
      </button>
      <div id="cursor-room-panel" className="roomPanel" data-open={isOpen} role="region" aria-labelledby="cursor-room-toggle" aria-hidden={!isOpen} inert={!isOpen}>
        <div className="roomPanelInner">
          <div className="cursorRoomIntroduction">
            <p>マウスポインターは位置だけでなく、操作できる場所、待機、入力、禁止などの状態を伝えてきました。ここでは代表的な形と動きを、特定OSや製品の画像を使わずブラウザ上で抽象化して再現します。</p>
            <p className="reconstructionLabel">CSS / JavaScript / Pointer Events で再構成した体験展示</p>
          </div>
          <div className="cursorExhibitGrid">{cursorExhibits.map((exhibit) => <CursorExhibitCard key={exhibit.id} exhibit={exhibit} roomOpen={isOpen} />)}</div>
          <nav className="relatedRooms" aria-label="カーソル展示室の関連展示">
            <span>RELATED ROOMS</span>
            <a href="#loading-gallery">ローディング展示室を見る</a>
            <span>起動画面展示室 / スクロール展示室 / 通知・警告展示室 — 準備中</span>
          </nav>
          <div className="roomCloseRow"><button className="roomCloseButton" type="button" onClick={closeRoom}>展示室を閉じる</button></div>
        </div>
      </div>
    </article>
  );
}
