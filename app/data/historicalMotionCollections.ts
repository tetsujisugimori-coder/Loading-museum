import {museumCatalog, type CatalogRecord} from './museumClassification';

export type HistoricDisplayMode = 'cui' | 'gui' | 'mixed';
export type HistoricMotionKind = 'blink' | 'text-reveal' | 'scroll' | 'progress' | 'cursor' | 'window' | 'state-change';
export type ProvenanceState = 'not-reviewed' | 'source-backed' | 'conceptual-reconstruction' | 'creative-comparison';

export type CollectionPlacement = {
  key: string;
  medium: HistoricDisplayMode;
  motion: readonly HistoricMotionKind[];
  platform: string;
  era: string | null;
  provenance: ProvenanceState;
  sources: readonly string[];
  note: string;
};
export type HistoricalMotionCollection = {
  id: string;
  title: string;
  description: string;
  placements: readonly CollectionPlacement[];
};

// Curatorial placements can overlap between collections. This is not a second
// copy of the exhibit or a second count in museumTotal.
// An independent reconstruction can get a new permanent exhibit ID in its room.
export const historicalMotionCollections: readonly HistoricalMotionCollection[] = [
  {
    id: 'terminal-rhythm',
    title: '端末のリズム',
    description: '文字、点滅、行送り、スクロールが時間を伝える表現。',
    placements: [
      {key:'ms-dos-pc-command-line:rotating-spinner',medium:'cui',motion:['blink'],platform:'MS-DOS風',era:null,provenance:'not-reviewed',sources:[],note:'文字の切替を観察'},
      {key:'ms-dos-pc-command-line:text-progress',medium:'cui',motion:['progress'],platform:'MS-DOS風',era:null,provenance:'not-reviewed',sources:[],note:'文字による進捗表示'},
      {key:'linux-unix:unix-login',medium:'cui',motion:['text-reveal','cursor'],platform:'UNIX系端末',era:null,provenance:'not-reviewed',sources:[],note:'文字入力と応答の間'},
      {key:'linux-unix:linux-kernel-boot',medium:'cui',motion:['text-reveal','scroll'],platform:'Linux起動ログの再構成',era:null,provenance:'not-reviewed',sources:[],note:'ログの更新とスクロール'},
    ],
  },
  {
    id: 'process-steps',
    title: '処理の進行を伝える',
    description: '進捗、ファイル操作、起動など、操作から結果までの段階を比較。',
    placements: [
      {key:'ms-dos-pc-command-line:text-progress',medium:'cui',motion:['progress'],platform:'MS-DOS風',era:null,provenance:'not-reviewed',sources:[],note:'端末の文字進捗'},
      {key:'ms-dos-pc-command-line:file-copy',medium:'cui',motion:['text-reveal','progress'],platform:'MS-DOS風',era:null,provenance:'not-reviewed',sources:[],note:'ファイル名の逐次表示'},
      {key:'ms-dos-pc-command-line:compile-build',medium:'cui',motion:['text-reveal','state-change'],platform:'MS-DOS風',era:null,provenance:'not-reviewed',sources:[],note:'工程と結果'},
      {key:'linux-unix:linux-kernel-boot',medium:'cui',motion:['text-reveal','scroll'],platform:'Linux起動ログの再構成',era:null,provenance:'not-reviewed',sources:[],note:'起動工程の表示'},
      {key:'macintosh:macintosh-boot',medium:'gui',motion:['state-change','progress'],platform:'Macintosh',era:null,provenance:'not-reviewed',sources:[],note:'起動からデスクトップへの変化'},
    ],
  },
  {
    id: 'gui-direct-interaction',
    title: 'GUIの直接操作',
    description: '指し示す、つかむ、窓を動かすなど、画面が操作へ応じる表現。',
    placements: [
      {key:'cursor:standard-arrow',medium:'gui',motion:['cursor'],platform:'ポインター',era:null,provenance:'not-reviewed',sources:[],note:'指示位置と選択'},
      {key:'cursor:waiting-pointer',medium:'gui',motion:['cursor','blink'],platform:'ポインター',era:null,provenance:'not-reviewed',sources:[],note:'操作位置に付随する待機'},
      {key:'macintosh:window-controls',medium:'gui',motion:['window','state-change'],platform:'Macintosh',era:null,provenance:'not-reviewed',sources:[],note:'窓の移動と開閉'},
      {key:'macintosh:finder',medium:'gui',motion:['cursor','state-change'],platform:'Macintosh Finder',era:null,provenance:'not-reviewed',sources:[],note:'アイコンを直接扱う'},
    ],
  },
];

export function resolveHistoricalMotionCollections(catalog: readonly CatalogRecord[] = museumCatalog) {
  const index = new Map(catalog.map(record => [record.key, record] as const));
  return historicalMotionCollections.map(collection => {
    const seen = new Set<string>();
    const exhibits = collection.placements.map(placement => {
      if (seen.has(placement.key)) throw new Error('Repeated placement within one collection: ' + placement.key);
      seen.add(placement.key);
      const record = index.get(placement.key);
      if (!record) throw new Error('Unknown museum record: ' + placement.key);
      if (!record.categories.includes('historical')) throw new Error('Non-historical reference: ' + placement.key);
      return {...placement, record};
    });
    return {...collection, exhibits};
  });
}

export function historicalCollectionSummary() {
  const all = resolveHistoricalMotionCollections();
  return {
    collections: all.length,
    placements: all.reduce((sum, group) => sum + group.exhibits.length, 0),
    distinctWorks: new Set(all.flatMap(group => group.exhibits.map(e => e.key))).size,
  };
}
