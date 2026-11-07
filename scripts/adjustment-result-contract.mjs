import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
export {configuration} from './annotation-result-contract.mjs';
export const CHECKS=['inventory','original-pixels','numeric-adjustments','invalid-numbers','preset-pixels','history','keyboard-transaction','pointer-transaction','escape-cancel','pointer-cancel','gesture-isolation','resize-cancel','resize-before-observer','touch-input','comparison','image-switch','text-zoom','zero-recovery','layout','pixel-negative-control','histogram-negative-control','original-negative-control','graph-negative-control'];
export function validateReport(report,expected){
 for(const field of ['runId','head','tree','exportSHA256'])assert.equal(report[field],expected[field],field);
 assert.deepEqual(report.sourceHashes,expected.sourceHashes,'exact source bytes');assert.ok(Object.keys(report.sourceHashes||{}).length>0,'source hashes required');
 assert.deepEqual(report.originalSources,expected.originalSources,'fixed original image manifest');assert.deepEqual(Object.keys(report.originalSources).sort(),['landscape','still-life']);
 assert.deepEqual(report.configuration,expected.configuration,'matrix configuration');
 assert.equal(report.status,'PASS');assert.deepEqual(report.errors,[]);assert.ok(expected.keys.length>0);assert.deepEqual(report.cases.map(c=>c.key),expected.keys,'exact ordered matrix');assert.equal(new Set(expected.keys).size,expected.keys.length);
 for(const c of report.cases){assert.equal(c.status,'PASS');assert.deepEqual(c.checks,CHECKS);assert.ok(c.events.length>0);assert.equal(c.inputEvents,c.events.length);assert.ok(c.events.some(e=>e.trusted),'real browser input');assert.ok(c.images.length>=2);assert.equal(new Set(c.images).size,c.images.length);for(const kind of ['pixel','histogram','original','graph']){assert.equal(c.negativeControls?.[kind]?.detected,true);assert.equal(c.negativeControls?.[kind]?.recovered,true);assert.ok(c.negativeControls[kind].error.length>0)}assert.ok(c.measurements.some(m=>m.pixels===480*300),'full raster checked');for(const m of c.measurements){assert.ok(Object.hasOwn(report.originalSources,m.image),'known original image');assert.equal(m.sourceSHA256,report.originalSources[m.image],'measured original is the specified image');}}
}
export async function validateEvidence(report,expected,directory){
 validateReport(report,expected);assert.ok(report.images.length>0);const names=new Set();
 for(const item of report.images){assert.equal(path.basename(item.file),item.file);assert.ok(!names.has(item.file));names.add(item.file);const bytes=await fs.readFile(path.join(directory,item.file));assert.ok(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])));assert.equal(createHash('sha256').update(bytes).digest('hex'),item.sha256);}
 const references=report.cases.flatMap(c=>c.images),used=new Set(references);assert.equal(used.size,references.length,'each screenshot belongs to exactly one case');assert.deepEqual([...names].sort(),[...used].sort(),'exact referenced image manifest');
}
