import { ExhibitRoomAccordion } from "./components/ExhibitRoomAccordion";
import { exhibitRooms } from "./data/exhibitRooms";

const spokes = Array.from({ length: 8 }, (_, index) => index);

function ExhibitHeader({
  number,
  category,
  era,
  title,
}: {
  number: string;
  category: string;
  era: string;
  title: string;
}) {
  return (
    <>
      <div className="exhibitTopline">
        <span className="objectNumber">
          OBJECT {number} / {category}
        </span>
        <span className="era">{era}</span>
      </div>
      <h2>{title}</h2>
    </>
  );
}

export default function Home() {
  return (
    <main className="museumShell">
      <header className="museumHeader">
        <div>
          <p className="eyebrow">Digital waiting archive / permanent collection</p>
          <h1>
            世界の<span>ローディング画面</span>博物館
          </h1>
          <p className="subtitle">
            待つための記号は、コンピュータと人間の距離をどう描いてきたか。
          </p>
        </div>
        <p className="archiveMeta">
          ARCHIVE NODE <strong>JP–01</strong>
          <br />
          COLLECTION 1980—NOW
          <br />
          9 OBJECTS / LIVE
        </p>
      </header>

      <section className="timeline" aria-label="ローディング画面の展示一覧">
        <article className="exhibit">
          <ExhibitHeader number="01" category="CLI" era="1980s—" title="CUIの回転文字" />
          <div className="stage" role="img" aria-label="縦棒、スラッシュ、横棒、バックスラッシュが順番に切り替わる表示">
            <div className="terminalBox" aria-hidden="true">
              <span className="terminalTitle">SYSTEM TASK MONITOR</span>
              <span className="terminalLine">
                <span className="cuiSpinner" />
                PROCESSING ARCHIVE_01
              </span>
            </div>
          </div>
          <p className="caption">四文字だけで動きを生む、最小単位の待機表示。</p>
        </article>

        <article className="exhibit">
          <ExhibitHeader number="02" category="TEXT" era="1980s—" title="点が増える表示" />
          <div className="stage" role="img" aria-label="Loadingの後ろの点が一つから三つまで増える表示">
            <div className="loadingWord" aria-hidden="true">
              Loading<span>...</span>
            </div>
          </div>
          <p className="caption">文章の末尾が、時間の経過そのものになる。</p>
        </article>

        <article className="exhibit">
          <ExhibitHeader number="03" category="WINDOWS" era="1990s" title="Windows風の砂時計" />
          <div className="stage" role="img" aria-label="砂が落ち、ゆっくり反転する砂時計">
            <div className="hourglass" aria-hidden="true">
              <span />
            </div>
          </div>
          <p className="caption">計算時間を「砂が落ちる時間」へ翻訳したアイコン。</p>
        </article>

        <article className="exhibit">
          <ExhibitHeader number="04" category="WWW" era="1995—" title="初期WebのGIF風スピナー" />
          <div className="stage" role="img" aria-label="初期のWebブラウザで使われた低解像度GIF風スピナー">
            <div className="retroWindow" aria-hidden="true">
              <div className="retroTitle">browser.gif</div>
              <div className="pixelSpinner">
                {spokes.map((spoke) => <i key={spoke} />)}
              </div>
              <div className="retroStatus">Transferring data...</div>
            </div>
          </div>
          <p className="caption">低い解像度とループGIFが、接続中の風景をつくった。</p>
        </article>

        <article className="exhibit">
          <ExhibitHeader number="05" category="APPLE" era="2000s" title="Apple風の点が巡るスピナー" />
          <div className="stage" role="img" aria-label="放射状に並んだ点が順番に明滅するスピナー">
            <div className="appleSpinner" aria-hidden="true">
              {spokes.map((spoke) => <i key={spoke} />)}
            </div>
          </div>
          <p className="caption">明滅する放射状の点。静かで均質なシステム動作。</p>
        </article>

        <article className="exhibit">
          <ExhibitHeader number="06" category="VISTA" era="2006—" title="Windows Vista風の青い光" />
          <div className="stage" role="img" aria-label="青い光が半透明の軌道を巡る表示">
            <div className="vistaOrbit" aria-hidden="true" />
          </div>
          <p className="caption">半透明、発光、軌道。待機表示が視覚効果になった時代。</p>
        </article>

        <article className="exhibit">
          <ExhibitHeader number="07" category="CSS" era="2010s—" title="CSSの円弧スピナー" />
          <div className="stage" role="img" aria-label="二色の円弧が回転するCSSスピナー">
            <div className="cssArc" aria-hidden="true" />
          </div>
          <p className="caption">画像からコードへ。軽量で伸縮自在な現代の標準形。</p>
        </article>

        <article className="exhibit">
          <ExhibitHeader number="08" category="STATUS" era="ALL ERAS" title="プログレスバー" />
          <div className="stage" role="img" aria-label="進捗が少しずつ百パーセントへ近づくバー">
            <div className="progressWrap" aria-hidden="true">
              <div className="progressLabel">
                <span>INSTALLING EXHIBIT</span>
                <span>VARIABLE PROGRESS</span>
              </div>
              <div className="progressTrack"><div className="progressFill" /></div>
            </div>
          </div>
          <p className="caption">終わりまでの距離を可視化し、待つ人に見通しを与える。</p>
        </article>

        <article className="exhibit">
          <ExhibitHeader number="09" category="CONTENT" era="2015—" title="スケルトンスクリーン" />
          <div className="stage" role="img" aria-label="読み込み予定の文章と画像の形を先に示す表示">
            <div className="skeleton" aria-hidden="true">
              <div className="skeletonAvatar" />
              <div className="skeletonCopy">
                <div className="skeletonLine" />
                <div className="skeletonLine skeletonLineShort" />
              </div>
              <div className="skeletonBlock" />
            </div>
          </div>
          <p className="caption">空白ではなく「これから現れる構造」を先に見せる。</p>
        </article>
      </section>

      <section className="roomCollection" aria-labelledby="room-collection-title">
        <div className="roomCollectionHeader">
          <p className="eyebrow">Period rooms / expandable collection</p>
          <h2 id="room-collection-title">時代別展示室</h2>
        </div>
        <div className="roomList">
          {exhibitRooms.map((room) => (
            <ExhibitRoomAccordion key={room.roomId} room={room} />
          ))}
        </div>
      </section>

      <footer>
        <span className="liveStatus">ALL EXHIBITS RUNNING</span>
        <span>WAITING INTERFACES / CHRONOLOGICAL INDEX</span>
        <span>© LOADING MUSEUM</span>
      </footer>
    </main>
  );
}
