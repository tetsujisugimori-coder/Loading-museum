// Permanent IDs; the initial 12 candidates are not a cap on the collection.
export const dialupBbsRoom = 'ms-dos-pc-command-line';
export const dialupBbsCollection = 'パソコン通信とBBSの時代';
export const dialupBbsExhibits = [
  {id:'bbs-03',candidate:'03',title:'低速文字表示',tags:['BBS','パソコン通信','300bps','1200bps','2400bps','文字端末'],sourceIds:['S01'],provenance:'conceptual-reconstruction'},
  {id:'bbs-04',candidate:'04',title:'日本語パソコン通信',tags:['BBS','日本語','文字コード','ISO-2022-JP','Shift_JIS'],sourceIds:['S04','S05','S07'],provenance:'conceptual-reconstruction'},
  {id:'bbs-05',candidate:'05',title:'掲示板連続スクロール',tags:['BBS','掲示板','スクロール','VT100','Jump','Smooth'],sourceIds:['S02','S03'],provenance:'conceptual-reconstruction'},
] as const;
export const dialupBbsHref = (id: typeof dialupBbsExhibits[number]['id']) => './dialup-bbs/index.html#'+id;
