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
  {id:'bbs-09',candidate:'09',title:'モデムのランプは何を語るか',tags:['BBS','モデム','通信','接続','LED','ランプ'],sourceIds:['C01'],provenance:'conceptual-reconstruction'},
  {id:'bbs-10',candidate:'10',title:'電話回線の向こうへ',tags:['BBS','モデム','通信','接続','ATコマンド','ダイヤル'],sourceIds:['C01','C02','C03','C04'],provenance:'conceptual-reconstruction'},
  {id:'bbs-11',candidate:'11',title:'ファイルが届くまで',tags:['BBS','通信','XMODEM','チェックサム','再送','転送'],sourceIds:['C05','C06'],provenance:'conceptual-reconstruction'},
  {id:'bbs-12',candidate:'12',title:'通信を自動で巡回する',tags:['BBS','通信','自動巡回','オフラインリーダー','掲示板','ログ'],sourceIds:['C08','C09','C10','C11'],provenance:'conceptual-reconstruction'},
] as const;
export const dialupBbsHref = (id: typeof dialupBbsExhibits[number]['id']) => './dialup-bbs/'+(id<'bbs-06'?'index.html':id<'bbs-09'?'ansi.html':'communications.html')+'#'+id;
