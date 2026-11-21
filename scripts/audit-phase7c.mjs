import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import ts from 'typescript';
const baseline='547c7d7a460d40bf90591d842cb354ef13958b8a';
const git=(...a)=>execFileSync('git',a,{encoding:'utf8'}).trim();
const hash=s=>createHash('sha256').update(s).digest('hex');
const preserved=git('ls-tree','-r','--name-only',baseline,'app/data').split('\n').filter(file=>file!=='app/data/museumClassification.ts').map(file=>{const old=execFileSync('git',['show',`${baseline}:${file}`]);const now=fs.readFileSync(file);assert.ok(old.equals(now),`existing registration changed: ${file}`);return {file,sha256:hash(now)};});
const oldPage=execFileSync('git',['show',`${baseline}:app/page.tsx`],{encoding:'utf8'}),page=fs.readFileSync('app/page.tsx','utf8');
const gallery=s=>s.slice(s.indexOf('<section id="loading-gallery"'),s.indexOf('<ModernAnimationRoom />')).trim();
assert.equal(gallery(page),gallery(oldPage),'nine original exhibits unchanged');
const cache=new Map();function data(name){if(cache.has(name))return cache.get(name);const file=`app/data/${name}.ts`,source=fs.readFileSync(file,'utf8'),ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true);const hoisted=[...ast.statements.filter(ts.isImportDeclaration),...ast.statements.filter(s=>!ts.isImportDeclaration(s))].map(s=>s.getText(ast)).join('\n');const mod={exports:{}};cache.set(name,mod.exports);new Function('module','exports','require',ts.transpileModule(hoisted,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(mod,mod.exports,r=>data(path.basename(r)));return mod.exports;}
const oldCache=new Map();function oldData(name){if(oldCache.has(name))return oldCache.get(name);const file=`app/data/${name}.ts`,source=execFileSync('git',['show',`${baseline}:${file}`],{encoding:'utf8'}),ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true);const hoisted=[...ast.statements.filter(ts.isImportDeclaration),...ast.statements.filter(s=>!ts.isImportDeclaration(s))].map(s=>s.getText(ast)).join('\n');const mod={exports:{}};oldCache.set(name,mod.exports);new Function('module','exports','require',ts.transpileModule(hoisted,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(mod,mod.exports,r=>oldData(path.basename(r)));return mod.exports;}
const {museumCatalog,museumRooms,categorySummary,museumTotal}=data('museumClassification');
assert.equal(museumCatalog.length,292);assert.equal(museumTotal,292);assert.equal(museumRooms.length,13);assert.equal(new Set(museumCatalog.map(x=>x.key)).size,292);assert.ok(museumCatalog.every(x=>x.categories.length>0));
const oldCatalog=oldData('museumClassification').museumCatalog;assert.equal(oldCatalog.length,280);const oldKeys=new Set(oldCatalog.map(x=>x.key));assert.deepEqual(museumCatalog.filter(x=>oldKeys.has(x.key)),oldCatalog,'all 280 existing records preserved');
const dom=fs.readFileSync('app/components/DomAnimationRoom.tsx','utf8');assert.deepEqual(museumCatalog.filter(x=>x.room==='dom').map(x=>x.originalId),[...dom.matchAll(/id: "(operation-[^"]+)"/g)].map(x=>x[1]));
const result={baseline,head:git('rev-parse','HEAD'),preservedDataFiles:preserved,originalGalleryHash:hash(gallery(page)),total:museumTotal,rooms:museumRooms.map(r=>({id:r.id,title:r.title,count:museumCatalog.filter(x=>x.room===r.id).length,historical:museumCatalog.filter(x=>x.room===r.id&&x.categories.includes('historical')).length,modern:museumCatalog.filter(x=>x.room===r.id&&x.categories.includes('modern')).length})),gallery:{total:9,historical:6,modern:3},historical:categorySummary('historical'),modern:categorySummary('modern'),crossReferences:museumCatalog.filter(x=>x.categories.length>1).map(x=>x.key),records:museumCatalog.map(({key,originalId,room,categories,collection})=>({key,originalId,room,categories,collection})),status:'PASS'};
if(process.env.AUDIT_OUTPUT){fs.mkdirSync(path.dirname(process.env.AUDIT_OUTPUT),{recursive:true});fs.writeFileSync(process.env.AUDIT_OUTPUT,JSON.stringify(result,null,2)+'\n');}
console.log(JSON.stringify({...result,preservedDataFiles:preserved.length,records:result.records.length},null,2));
