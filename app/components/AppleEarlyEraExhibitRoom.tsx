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
import { AppleOneSetupDemo, AppleOneMonitorDemo, AppleBasicDemo, TextScrollDemo } from "./AppleEarlyTerminalDemos";
import AppleEarlyBeginnerGuide from "./AppleEarlyBeginnerGuide";

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
    case "apple-one-setup": return <AppleOneSetupDemo {...props} />;
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
          <span className="roomEyebrow">ROOM / 1976–1979</span>
          <span className="roomTitle" id="apple-early-room-title">Apple I / Apple II 展示室</span>
          <span className="roomSummary">基板中心のApple Iから、BASIC・カラー・Disk IIを備えたApple IIへの変化</span>
        </span>
        <span className="roomToggleMeta" aria-hidden="true">
          <span>1976–1979</span>
          <span>{appleEarlyExhibits.length} EXHIBITS</span>
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
            <p className="appleEarlyKicker">PERIOD ROOM / 1976–1979</p>
            <h3>展示の見方</h3>
            <p className="appleEarlySubtitle">入門ツアーで基本を知り、その後の13展示で操作と変化を確かめます。</p>
            <div className="appleEarlyIntroGrid">
              <section><h4>1 / Apple I</h4><p>組み立て済み基板として販売され、利用者が電源、キーボード、ディスプレイなどを用意しました。文字Monitorが操作、Apple Cassette Interfaceが外部レコーダーによる保存と読込の入口でした。</p></section>
              <section><h4>2 / Apple II</h4><p>筐体、キーボード、カラー表示、BASICが一体化され、家庭で扱いやすいコンピュータになりました。文字入力だけでなく、色ブロックや線の生成過程も画面状態を伝えます。</p></section>
              <section><h4>3 / Disk II</h4><p>カセットより高速で扱いやすいディスクへ移ると、起動と読込の待ち方が変わりました。挿入状態、アクセスランプ、画面変化と、教育用の内部概念図を分けて観察します。</p></section>
            </div>
            <p className="appleEarlyNotice">各展示の「史料ベース」「概念再構成」「創作比較」バッジで、当時の資料との距離を示します。実機ROM、ソフトウェア、ゲーム、ロゴ、筐体意匠を複製するエミュレータではありません。</p>
          </header>

          <AppleEarlyBeginnerGuide active={isOpen && isPageVisible} prefersReducedMotion={prefersReducedMotion} />

          <section className="appleDetailedExhibits" aria-labelledby="apple-detailed-exhibits-title">
            <header>
              <p>HANDS-ON COLLECTION / 13 EXHIBITS</p>
              <h3 id="apple-detailed-exhibits-title">詳しく触る</h3>
              <p>ここからは、Monitor入力、BASIC、カセット、カラー描画、Disk IIなどを個別に操作できます。</p>
            </header>
          <div className="appleEarlyExhibitGrid">
            {appleEarlyExhibits.map((exhibit, index) => (
              <article className="appleEarlyExhibit" key={exhibit.id} aria-labelledby={`${exhibit.id}-title`}>
                <header className="appleEarlyExhibitHeader">
                  <span className="appleEarlyIndex">{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <div className="appleEarlyBadges"><span>{exhibit.category}</span><span data-level={exhibit.reconstructionLevel}>{exhibit.reconstructionLevel}</span></div>
                    <h4 id={`${exhibit.id}-title`}>{exhibit.name}</h4>
                  </div>
                </header>

                <p className="appleEarlyShortDescription">{exhibit.shortDescription}</p>
                <dl className="appleEarlyEssentials">
                  <div><dt>年代</dt><dd>{exhibit.period}</dd></div>
                  <div><dt>対象機種</dt><dd>{exhibit.system}</dd></div>
                  <div><dt>記録媒体</dt><dd>{exhibit.medium}</dd></div>
                </dl>
                <p className="appleObservation"><span>この展示で見るもの</span>{exhibit.observationPoint}</p>

                {exhibit.differenceNote ? <p className="appleDifferenceNote"><span>この展示の違い</span>{exhibit.differenceNote}</p> : null}

                <ExhibitVisual type={exhibit.visualType} active={isOpen && isPageVisible} prefersReducedMotion={prefersReducedMotion} />

                <p className="appleQuickInstructions"><span>操作</span>{exhibit.instructions}</p>
                <p className="appleModernAnalogy"><span>現代で例えると</span>完全に同じ仕組みではありませんが、{exhibit.modernWebConnection}</p>
                <details className="appleEarlyInstructions">
                  <summary>詳しい解説</summary>
                  <dl className="appleEarlyFacts">
                    <div><dt>技術的背景</dt><dd>{exhibit.technicalBackground}</dd></div>
                    <div><dt>史実との関係</dt><dd>{exhibit.historicalBasis}</dd></div>
                    <div><dt>現代Webとの接続</dt><dd>{exhibit.modernWebConnection}</dd></div>
                    <div><dt>再構成上の注意</dt><dd>{exhibit.caution}</dd></div>
                    <div><dt>参考資料</dt><dd><ul>{exhibit.sources.map((source) => <li key={source}>{source}</li>)}</ul></dd></div>
                    <div><dt>詳細な操作方法</dt><dd>{exhibit.instructions}</dd></div>
                  </dl>
                </details>
              </article>
            ))}
          </div>
          </section>

          <button type="button" className="roomClose" onClick={closeRoom}>展示室を閉じる</button>
        </div>
        </div>
      </div>
    </section>
  );
}
