"use client";

import {
  appleComparison,
  appleOneConnections,
  basicGuideSteps,
  cassetteFlow,
  glossaryTerms,
  introSteps,
  mediaComparison,
  monitorGuideSteps,
  type ComparisonRow,
} from "../data/appleEarlyBeginnerGuide";
import { AppleDemoControls, useAppleSequence } from "./AppleEarlyDemoControls";

type GuideProps = { active: boolean; prefersReducedMotion: boolean };

function ComparisonTable({ rows, left, right, kind }: { rows: readonly ComparisonRow[]; left: string; right: string; kind: "apple" | "media" }) {
  const leftKey = kind === "apple" ? "appleOne" : "cassette";
  const rightKey = kind === "apple" ? "appleTwo" : "disk";
  return (
    <div className="appleBeginnerComparison" role="table" aria-label={`${left}と${right}の概念的な比較`}>
      <div className="appleComparisonRow appleComparisonHead" role="row">
        <span role="columnheader">項目</span><span role="columnheader">{left}</span><span role="columnheader">{right}</span>
      </div>
      {rows.map((row) => (
        <div className="appleComparisonRow" role="row" key={row.label}>
          <strong role="rowheader">{row.label}</strong>
          <span role="cell">{row[leftKey]}</span>
          <span role="cell">{row[rightKey]}</span>
        </div>
      ))}
    </div>
  );
}

export default function AppleEarlyBeginnerGuide({ active, prefersReducedMotion }: GuideProps) {
  const sequence = useAppleSequence({ active, baseDelay: 1900, prefersReducedMotion, stepCount: introSteps.length });
  const running = sequence.phase === "running";

  return (
    <section className="appleBeginnerGuide" aria-labelledby="apple-beginner-guide-title">
      <header className="appleBeginnerHeader">
        <p>BEGINNER TOUR / 約3分</p>
        <h3 id="apple-beginner-guide-title">はじめてのApple I / Apple II</h3>
        <p>Apple IとApple IIは、現在のパソコンとは使い方も構成も大きく異なります。まず、何を接続し、どのように文字を入力し、どのように保存していたのかを見てみましょう。</p>
      </header>

      <nav className="appleTourMap" aria-label="入門ツアーの6章">
        <ol>{introSteps.map((step, index) => <li key={step.id} data-current={sequence.step === index}><span>{index + 1}</span><strong>{step.label}</strong><small>{step.summary}</small></li>)}</ol>
      </nav>
      <AppleDemoControls label="初心者向け入門ツアー" sequence={sequence} showLoop={false} />
      <p className="appleTourLive" aria-live="polite">{sequence.phase === "complete" ? "入門ツアーの案内が完了しました。詳しい展示へ進めます。" : ""}</p>

      <div className="appleBeginnerChapters">
        <article data-tour-active={running && sequence.step === 0}>
          <header><span>01</span><div><h4>Apple Iは、何を買う製品だったのか</h4><p>Apple Iは組み立て済みの基板を中心に販売されました。現在の完成済みPCのような一式ではなく、利用者が周辺機器を用意して接続しました。</p></div></header>
          <div className="appleOneConnectionGuide" role="img" aria-label="キーボードと電源をApple I基板へ接続し、基板からテレビへ出力する。カセットレコーダーはCassette Interfaceを経由して基板へ接続する概念図。">
            <div className="appleOnePeripheralColumn">
              {appleOneConnections.slice(0, 3).map((part) => <div key={part.id}><strong>{part.name}</strong><span>{part.note}</span><small>{part.path}</small></div>)}
            </div>
            <div className="appleOneBoardGuide"><strong>Apple I基板</strong><span>コンピュータ本体</span><small>抽象図</small></div>
            <div className="appleOnePeripheralColumn">
              {appleOneConnections.slice(3).map((part) => <div key={part.id}><strong>{part.name}</strong><span>{part.note}</span><small>{part.path}</small></div>)}
            </div>
          </div>
          <p className="appleBeginnerKeyPoint">基板だけでは現在のPCのように使えず、周辺機器を利用者が用意して接続しました。実機の筐体や配線を精密に複製した図ではありません。</p>
        </article>

        <article data-tour-active={running && sequence.step === 1}>
          <header><span>02</span><div><h4>Apple Iで、画面へ何を入力したのか</h4><p>Monitorという簡単な操作環境で、メモリの場所を番号で指定し、命令やデータを直接書き込みました。</p></div></header>
          <ol className="appleGuidedSteps">{monitorGuideSteps.map((step) => <li key={step.title}><code>{step.command}</code><strong>{step.title}</strong><p>{step.note}</p></li>)}</ol>
          <p className="appleBeginnerKeyPoint">今していること：コンピュータの記憶場所を番号で指定し、データを直接扱っています。現在のアプリをクリックして起動する方法とは異なります。</p>
          <p className="appleModernAnalogy"><span>現代で例えると</span>完全に同じではありませんが、メモリを直接操作する低い階層の開発者ツールに近い考え方です。</p>
        </article>

        <article data-tour-active={running && sequence.step === 2}>
          <header><span>03</span><div><h4>Apple IとApple IIで、何が変わったのか</h4><p>次の表は、代表的な使い方を理解するための概念的な比較です。製造時期や構成による違いをすべて表すものではありません。</p></div></header>
          <ComparisonTable rows={appleComparison} left="Apple I" right="Apple II" kind="apple" />
          <p className="appleBeginnerKeyPoint">Apple IIでは、利用者がメモリを直接操作する場面が減り、BASICやディスクを使ってプログラムを扱いやすくなりました。</p>
        </article>

        <article data-tour-active={running && sequence.step === 3}>
          <header><span>04</span><div><h4>Apple IIでは、BASICで何をしたのか</h4><p>人が読みやすい命令を行番号付きで入力し、一覧を確認してから実行できました。</p></div></header>
          <ol className="appleGuidedSteps appleBasicGuideSteps">{basicGuideSteps.map((step) => <li key={step.title}><code>{step.command}</code><strong>{step.title}</strong><p>{step.note}</p></li>)}</ol>
          <p className="appleBeginnerKeyPoint">Apple Iではメモリを直接扱う場面が多かったのに対し、Apple IIではBASICを通して命令を書けました。</p>
          <p className="appleModernAnalogy"><span>現代で例えると</span>完全に同じではありませんが、ブラウザ上の簡易コード実行環境に近い考え方です。</p>
        </article>

        <article data-tour-active={running && sequence.step === 4}>
          <header><span>05</span><div><h4>なぜ、カセットへデータを保存できたのか</h4><p>0と1などのデータを、音の高低やパルスの違いへ変換し、普通のカセットテープへ録音しました。読み込むときは、その音を再びコンピュータのデータへ戻します。</p></div></header>
          <ol className="appleCassetteConversion" aria-label="データを音へ変換して録音し、再生してメモリへ復元する流れ">{cassetteFlow.map((step, index) => <li key={step.label}><span>{index + 1}</span><strong>{step.label}</strong><small>{step.detail}</small>{index === 1 ? <i className="appleIntroWave" aria-hidden="true">▁▅▂▇▃▆▂▅</i> : null}</li>)}</ol>
          <div className="appleCassetteRoles"><p><strong>Apple I</strong>外部のカセットレコーダーと専用インターフェースを接続し、音として記録したプログラムをメモリへ読み込みました。</p><p><strong>Apple II</strong>初期はカセットを利用でき、コンピュータ側とレコーダー側の録音・再生を順番に操作しました。</p></div>
          <p className="appleModernAnalogy"><span>現代で例えると</span>仕組みは異なりますが、データ形式を変換して別の媒体へ保存し、読み戻す流れと比較できます。</p>
        </article>

        <article data-tour-active={running && sequence.step === 5}>
          <header><span>06</span><div><h4>Disk IIで、何が便利になったのか</h4><p>Disk IIでは、テープを最初から順番に再生する必要がなく、ディスク上の必要な場所へ読み取り位置を移動できました。</p></div></header>
          <ComparisonTable rows={mediaComparison} left="カセット" right="Disk II" kind="media" />
          <div className="appleTrackSeekGuide" role="img" aria-label="ディスクの複数のトラックから目的のトラックへ読み取り位置が移動する内部概念図。実際には利用者から見えない動き。"><span>トラック1</span><span>トラック2</span><span data-target="true">目的のトラック3</span><i>読み取り位置を移動＝シーク</i></div>
          <p className="appleBeginnerKeyPoint"><strong>トラック</strong>はデータを記録する区切り、<strong>シーク</strong>は読み取り位置を必要なトラックへ動かす処理です。この図は外から見える動きではなく、内部処理を説明する概念図です。</p>
          <p className="appleModernAnalogy"><span>現代で例えると</span>完全に同じではありませんが、外部ストレージから必要なプログラムを読み込む操作に近い考え方です。</p>
        </article>
      </div>

      <details className="appleGlossary">
        <summary>用語解説 — 15語</summary>
        <dl>{glossaryTerms.map(({ term, meaning }) => <div key={term}><dt>{term}</dt><dd>{meaning}</dd></div>)}</dl>
      </details>
    </section>
  );
}
