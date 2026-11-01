import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import {execFileSync} from 'node:child_process';
const ref=process.env.INVENTORY_REF;
const read=file=>ref?execFileSync('git',['show',`${ref}:${file}`],{encoding:'utf8',stdio:['pipe','pipe','pipe']}):fs.readFileSync(file,'utf8');
// Evaluate only repository-owned, pure data modules. No application/browser code.
const cache = new Map();
function data(name) {
  const file = path.resolve('app/data', name + '.ts');
  if (cache.has(file)) return cache.get(file);
  const dataModule = {exports: {}}; cache.set(file, dataModule.exports);
  const source=read(`app/data/${name}.ts`), ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true);
  const imports=ast.statements.filter(ts.isImportDeclaration),rest=ast.statements.filter(s=>!ts.isImportDeclaration(s));
  // ESM imports are hoisted; keep this meaning when evaluating data as CJS.
  const hoisted=[...imports,...rest].map(s=>s.getText(ast)).join('\n');
  const js = ts.transpileModule(hoisted, {compilerOptions: {module: ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  new Function('module', 'exports', 'require', js)(dataModule, dataModule.exports, ref => data(path.basename(ref)));
  return dataModule.exports;
}
const rooms = data('exhibitRooms').exhibitRooms;
const counts = {
  permanent: (read('app/page.tsx').match(/className="exhibit"/g)||[]).length,
  ...Object.fromEntries(rooms.map(r => [r.roomId, r.exhibits.reduce((n,e) => n + (e.kind === 'vanished-os' ? e.loadingExhibits.length : 1),0)])),
  apple: data('appleEarlyExhibits').appleEarlyExhibitCount,
  macintosh: data('macintoshBirthExhibits').macintoshBirthExhibitCount,
  cursor: data('cursorExhibits').cursorExhibits.length,
  flash: data('flashExhibits').flashExhibitCount,
  dom: new Set([...read('app/components/DomAnimationRoom.tsx').matchAll(/operation-\d+/g)].map(x=>x[0])).size,
  waapi: data('waapiSamples').waapiSampleCount,
  phase1: data('modernExhibits').modernExhibits.length,
  phase2: data('phase2Studies').phase2Studies.length + data('phase2BStudies').phase2BStudies.length,
  phase3: data('practicalExhibits').practicalExhibits.length,
};
let hasPhase4=false;try{read('app/data/phase4aExhibits.ts');hasPhase4=true;}catch{}
if(hasPhase4) counts.phase4a=data('phase4aExhibits').phase4aExhibits.length;
let hasPhase4b=false;try{read('app/data/phase4bExhibits.ts');hasPhase4b=true;}catch{}
if(hasPhase4b) counts.phase4b=data('phase4bExhibits').phase4bExhibits.length;
console.log(JSON.stringify({ref:ref||'working-tree',counts,total:Object.values(counts).reduce((a,b)=>a+b,0)},null,2));
