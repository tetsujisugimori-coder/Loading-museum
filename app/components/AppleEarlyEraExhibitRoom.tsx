"use client";

import { useEffect, useRef, useState } from "react";
import { appleEarlyExhibits, type AppleEarlyVisualType } from "../data/appleEarlyExhibits";
import { LowResolutionGraphicsDemo, HighResolutionGraphicsDemo } from "./AppleEarlyGraphicsDemos";
import {
  AppleCassetteLoadDemo,
  AppleTwoBootDemo,
  CassetteStorageDemo,
  DiskBootDemo,
  DiskAccessPatternDemo,
  EarlyGameLoadingDemo,
  ErrorRetryDemo,
} from "./AppleEarlyMediaDemos";
import { AppleOneMonitorDemo, AppleBasicDemo, TextScrollDemo } from "./AppleEarlyTerminalDemos";

function ExhibitVisual({
  type,
  active,
  prefersReducedMotion,
}: {
  type: AppleEarlyVisualType;
  active: boolean;
  prefersReducedMotion: boolean;
}) {
  const props = { active, prefersReducedMotion };
  switch (type) {
    case "apple-one-monitor": return <AppleOneMonitorDemo />;
    case "apple-one-cassette": return <AppleCassetteLoadDemo {...props} />;
    case "apple-two-boot": return <AppleTwoBootDemo {...props} />;
    case "apple-basic": return <AppleBasicDemo />;
    case "cassette-storage": return <CassetteStorageDemo {...props} />;
    case "disk-boot": return <DiskBootDemo {...props} />;
    case "disk-patterns": return <DiskAccessPatternDemo {...props} />;
    case "text-scroll": return <TextScrollDemo {...props} />;
    case "low-resolution": return <LowResolutionGraphicsDemo {...props} />;
    case "high-resolution": return <HighResolutionGraphicsDemo {...props} />;
    case "game-loading": return <EarlyGameLoadingDemo {...props} />;
    case "error-retry": return <ErrorRetryDemo {...props} />;
  }
}

export default function AppleEarlyEraExhibitRoom() {
  const [isOpen, setIsOpen] = useState(false);
  const [isPageVisible, setIsPageVisible] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelId = "apple-early-era-room-panel";
  const toggleId = "apple-early-era-room-toggle";

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotionPreference = () => setPrefersReducedMotion(mediaQuery.matches);
    const updateVisibility = () => setIsPageVisible(document.visibilityState === "visible");
    updateMotionPreference();
    updateVisibility();
    mediaQuery.addEventListener("change", updateMotionPreference);
    document.addEventListener("visibilitychange", updateVisibility);
    return () => {
      mediaQuery.removeEventListener("change", updateMotionPreference);
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, []);

  const closeRoom = () => {
    setIsOpen(false);
    requestAnimationFrame(() => toggleRef.current?.focus());
  };

  return (
    <section className="roomCard roomCardAppleEarly" aria-labelledby="apple-early-room-title">
      <button
        ref={toggleRef}
        id={toggleId}
        type="button"
        className="roomToggle"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className="roomToggleMain">
          <span className="roomEyebrow">ROOM / EARLY-APPLE-COMPUTING</span>
          <span className="roomTitle" id="apple-early-room-title">Apple創成期展示室</span>
          <span className="roomSummary">基板、音声信号、ディスクが家庭用コンピュータの入口を形づくった時代</span>
        </span>
        <span className="roomToggleMeta" aria-hidden="true">
          <span>1976–1979</span>
          <span>12 EXHIBITS</span>
          <span className="roomToggleMark">{isOpen ? "−" : "+"}</span>
        </span>
      </button>

      <div
        id={panelId}
        className="roomPanel"
        data-open={isOpen}
        role="region"
        aria-labelledby={toggleId}
        aria-hidden={!isOpen}
        inert={!isOpen}
      >
        <div className="roomPanelInner">
        <div className="appleEarlyRoomBody">
          <header className="appleEarlyIntro">
            <p className="appleEarlyKicker">1976–1979 / BOARD, CASSETTE, COLOR, DISK</p>
            <h3>完成品になる前のコンピュータと、家庭へ開かれた「動き」</h3>
            <div className="appleEarlyIntroGrid">
              <p>Apple Iは、キーボードやディスプレイを利用者が用意する基板中心の製品でした。画面上のモニタ入力とカセット信号は、操作と保存の最小単位を見せます。</p>
              <p>Apple IIは筐体、カラー表示、BASIC、カセット入出力を一体化し、後にDisk IIが起動と読み込みの体験を大きく変えました。</p>
              <p>当時の状態は、文字、点滅カーソル、音声パルス、アクセスランプ、ドライブ機構など複数の手掛かりで伝えられていました。</p>
            </div>
            <p className="appleEarlyNotice">この展示は公開資料を基にした教育目的のWeb再現です。AppleのROM、ソフトウェア、ゲーム、ロゴや筐体意匠を複製するエミュレータではありません。</p>
          </header>

          <div className="appleEarlyExhibitGrid">
            {appleEarlyExhibits.map((exhibit, index) => (
              <article className="appleEarlyExhibit" key={exhibit.id} aria-labelledby={`${exhibit.id}-title`}>
                <header className="appleEarlyExhibitHeader">
                  <span className="appleEarlyIndex">{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <p>{exhibit.system} / {exhibit.medium}</p>
                    <h4 id={`${exhibit.id}-title`}>{exhibit.name}</h4>
                  </div>
                </header>

                <ExhibitVisual type={exhibit.visualType} active={isOpen && isPageVisible} prefersReducedMotion={prefersReducedMotion} />

                <dl className="appleEarlyFacts">
                  <div><dt>年代</dt><dd>{exhibit.period}</dd></div>
                  <div><dt>対象機種</dt><dd>{exhibit.system}</dd></div>
                  <div><dt>記録媒体</dt><dd>{exhibit.medium}</dd></div>
                  <div><dt>再現内容</dt><dd>{exhibit.reconstruction}</dd></div>
                  <div><dt>状態表現</dt><dd>{exhibit.statusLanguage}</dd></div>
                  <div><dt>技術的背景</dt><dd>{exhibit.technicalBackground}</dd></div>
                  <div><dt>現代Webとの接続</dt><dd>{exhibit.modernWebConnection}</dd></div>
                  <div><dt>注意事項</dt><dd>{exhibit.caution}</dd></div>
                  <div><dt>史実との関係</dt><dd>{exhibit.historicalBasis}</dd></div>
                </dl>
                <details className="appleEarlyInstructions">
                  <summary>操作方法</summary>
                  <p>{exhibit.instructions}</p>
                </details>
              </article>
            ))}
          </div>

          <button type="button" className="roomClose" onClick={closeRoom}>展示室を閉じる</button>
        </div>
        </div>
      </div>
    </section>
  );
}
