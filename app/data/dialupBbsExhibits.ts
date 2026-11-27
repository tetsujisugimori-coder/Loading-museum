// Permanent IDs; the initial 12 candidates are not a cap on the collection.
export const dialupBbsRoom = 'ms-dos-pc-command-line';
export const dialupBbsCollection = 'パソコン通信とBBSの時代';
export const dialupBbsExhibits = [
  {id:'bbs-03',candidate:'03',title:'低速文字表示',tags:['BBS','パソコン通信','300bps','1200bps','2400bps','文字端末'],sourceIds:['S01'],provenance:'conceptual-reconstruction'},
  {id:'bbs-04',candidate:'04',title:'日本語パソコン通信',tags:['BBS','日本語','文字コード','ISO-2022-JP','Shift_JIS'],sourceIds:['S04','S05','S07'],provenance:'conceptual-reconstruction'},
  {id:'bbs-05',candidate:'05',title:'掲示板連続スクロール',tags:['BBS','掲示板','スクロール','VT100','Jump','Smooth'],sourceIds:['S02','S03'],provenance:'conceptual-reconstruction'},
  {id:'bbs-06',candidate:'06',title:'ANSIアートが届くまで',tags:['BBS','ANSI','受信バイト','端末','通信速度'],sourceIds:['A01','A02','A05'],provenance:'conceptual-reconstruction'},
  {id:'bbs-07',candidate:'07',title:'文字端末の中で動く絵',tags:['BBS','ANSI','カーソル','差分更新','文字端末'],sourceIds:['A01','A02','A05'],provenance:'conceptual-reconstruction'},
  {id:'bbs-08',candidate:'08',title:'同じ1ビット、異なる表現',tags:['BBS','ANSI','属性ビット','VGA','SAUCE','点滅'],sourceIds:['A03','A04'],provenance:'conceptual-reconstruction'},
] as const;
export const dialupBbsHref = (id: typeof dialupBbsExhibits[number]['id']) => './dialup-bbs/'+(['bbs-03','bbs-04','bbs-05'].includes(id)?'index.html':'ansi.html')+'#'+id;
