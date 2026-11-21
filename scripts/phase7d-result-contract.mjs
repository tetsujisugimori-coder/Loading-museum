import assert from 'node:assert/strict';
export const workIds=['press-release','hold-confirm','magnetic-attraction','swipe-dismiss','focus-halo','status-morph'];
export function validateInteractiveReport(r,expected){
 assert.equal(r.status,'PASS');for(const k of ['head','tree'])assert.equal(r[k],expected[k],k);assert.equal(r.dirty,'');
 const keys=expected.engines.flatMap(e=>expected.widths.flatMap(w=>['no-preference','reduce'].map(m=>`${e}/${w}/${m}`)));assert.equal(r.expected,keys.length);assert.equal(r.cases.length,keys.length);assert.deepEqual([...new Set(r.cases.map(c=>`${c.engine}/${c.width}/${c.motion}`))].sort(),keys.sort());
 const names=r.files.map(f=>f.name);assert.equal(new Set(names).size,names.length);assert.ok(r.files.every(f=>/^[a-f0-9]{64}$/.test(f.sha256)));
 for(const c of r.cases){assert.equal(c.status,'PASS');assert.deepEqual(c.works.map(w=>w.id).sort(),[...workIds].sort());for(const w of c.works){for(const k of ['three-layers-initially-closed','specific-editing-and-continuous-input','cancel-no-stale-write','automated-touch-reset','keyboard-operation','resize-200percent-no-overflow','close-unmount'])assert.ok(w.checks.includes(k),`${w.id}/${k}`);for(const k of ['active-hidden-cancel-no-auto-resume','active-offscreen-cancel-no-auto-resume'])assert.ok(w.checks.includes(k),k);if(w.id==='magnetic-attraction')assert.ok(w.checks.includes('dom-measurement-independently-matched'));for(const suffix of ['.png','.json','-trace.zip'])assert.ok(names.includes(`${c.engine}-${c.width}-${c.motion}-${w.id}${suffix}`));}assert.ok(names.includes(`${c.engine}-${c.width}-${c.motion}-navigation-trace.zip`));}
 return {conditions:r.cases.length,works:r.cases.reduce((n,c)=>n+c.works.length,0),files:r.files.length};
}
