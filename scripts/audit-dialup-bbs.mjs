import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import ts from 'typescript';
const baseline='8b5ca8f613f1ba6a3883a029a805372aee8e98e4';
const wave1='297cf7f9a89d2e1fb3e1c706513d2a7269f5e626';
const git=(...a)=>execFileSync('git',a,{encoding:'utf8'}).trim();
const hash=s=>createHash('sha256').update(s).digest('hex');
const preserved=git('ls-tree','-r','--name-only',baseline,'app/data').split('\n').filter(file=>file!=='app/data/museumClassification.ts').map(file=>{const old=execFileSync('git',['show',`${baseline}:${file}`]);const now=fs.readFileSync(file);assert.ok(old.equals(now),`existing registration changed: ${file}`);return {file,sha256:hash(now)};});
const oldPage=execFileSync('git',['show',`${baseline}:app/page.tsx`],{encoding:'utf8'}),page=fs.readFileSync('app/page.tsx','utf8');
const gallery=s=>s.slice(s.indexOf('<section id="loading-gallery"'),s.indexOf('<ModernAnimationRoom />')).trim();
assert.equal(gallery(page),gallery(oldPage),'nine original exhibits unchanged');
const cache=new Map();function data(name){if(cache.has(name))return cache.get(name);const file=`app/data/${name}.ts`,source=fs.readFileSync(file,'utf8'),ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true);const hoisted=[...ast.statements.filter(ts.isImportDeclaration),...ast.statements.filter(s=>!ts.isImportDeclaration(s))].map(s=>s.getText(ast)).join('\n');const mod={exports:{}};cache.set(name,mod.exports);new Function('module','exports','require',ts.transpileModule(hoisted,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(mod,mod.exports,r=>data(path.basename(r)));return mod.exports;}
const oldCache=new Map();function oldData(name,ref=baseline){const key=ref+':'+name;if(oldCache.has(key))return oldCache.get(key);const file=`app/data/${name}.ts`,source=execFileSync('git',['show',`${ref}:${file}`],{encoding:'utf8'}),ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true);const hoisted=[...ast.statements.filter(ts.isImportDeclaration),...ast.statements.filter(s=>!ts.isImportDeclaration(s))].map(s=>s.getText(ast)).join('\n');const mod={exports:{}};oldCache.set(key,mod.exports);new Function('module','exports','require',ts.transpileModule(hoisted,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(mod,mod.exports,r=>oldData(path.basename(r),ref));return mod.exports;}
const {museumCatalog,museumRooms,categorySummary,museumTotal}=data('museumClassification');
assert.equal(museumCatalog.length,292);assert.equal(museumTotal,292);assert.equal(museumRooms.length,13);assert.equal(new Set(museumCatalog.map(x=>x.key)).size,292);assert.ok(museumCatalog.every(x=>x.categories.length>0));
const oldCatalog=oldData('museumClassification').museumCatalog;assert.equal(oldCatalog.length,286);const oldKeys=new Set(oldCatalog.map(x=>x.key));assert.deepEqual(museumCatalog.filter(x=>oldKeys.has(x.key)),oldCatalog,'all 286 existing records preserved');
assert.deepEqual(museumRooms,oldData('museumClassification').museumRooms,'all existing room metadata preserved');
const wave1Catalog=oldData('museumClassification',wave1).museumCatalog;assert.equal(wave1Catalog.length,289);
const wave1Keys=new Set(wave1Catalog.map(x=>x.key));assert.deepEqual(museumCatalog.filter(x=>wave1Keys.has(x.key)),wave1Catalog,'all 289 wave-one records preserved');
const added=museumCatalog.filter(x=>!oldKeys.has(x.key));
assert.deepEqual(added.map(x=>x.key),['ms-dos-pc-command-line:bbs-03','ms-dos-pc-command-line:bbs-04','ms-dos-pc-command-line:bbs-05','ms-dos-pc-command-line:bbs-06','ms-dos-pc-command-line:bbs-07','ms-dos-pc-command-line:bbs-08']);
for(const x of added){assert.deepEqual(x.categories,['historical']);assert.equal(x.href,'./dialup-bbs/'+(x.originalId<'bbs-06'?'index.html':'ansi.html')+'#'+x.originalId);}
assert.equal(categorySummary('historical').objects,151);assert.equal(categorySummary('modern').objects,164);
assert.equal(museumCatalog.filter(x=>x.categories.length===2).length,23);
const dom=fs.readFileSync('app/components/DomAnimationRoom.tsx','utf8');assert.deepEqual(museumCatalog.filter(x=>x.room==='dom').map(x=>x.originalId),[...dom.matchAll(/id: "(operation-[^"]+)"/g)].map(x=>x[1]));
const result={baseline,wave1,head:git('rev-parse','HEAD'),preservedDataFiles:preserved,originalGalleryHash:hash(gallery(page)),total:museumTotal,rooms:museumRooms.map(r=>({id:r.id,title:r.title,count:museumCatalog.filter(x=>x.room===r.id).length,historical:museumCatalog.filter(x=>x.room===r.id&&x.categories.includes('historical')).length,modern:museumCatalog.filter(x=>x.room===r.id&&x.categories.includes('modern')).length})),gallery:{total:9,historical:6,modern:3},historical:categorySummary('historical'),modern:categorySummary('modern'),crossReferences:museumCatalog.filter(x=>x.categories.length>1).map(x=>x.key),records:museumCatalog.map(({key,originalId,room,categories,collection})=>({key,originalId,room,categories,collection})),status:'PASS'};
if(process.env.AUDIT_OUTPUT){fs.mkdirSync(path.dirname(process.env.AUDIT_OUTPUT),{recursive:true});fs.writeFileSync(process.env.AUDIT_OUTPUT,JSON.stringify(result,null,2)+'\n');}
console.log(JSON.stringify({...result,preservedDataFiles:preserved.length,records:result.records.length},null,2));
