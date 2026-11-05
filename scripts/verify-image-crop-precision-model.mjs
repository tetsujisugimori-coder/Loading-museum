import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import * as model from '../app/components/practical/image-crop-model.ts';

// Read the actual UI serializer, including the pre-fix private six-decimal function.
// This bridge lets the SAME round-trip assertions run against the reviewed HEAD.
const ui = fs.readFileSync('app/components/practical/ImageCrop.tsx', 'utf8');
const line = ui.split('\n').find(s => s.startsWith('const strings ='));
assert.ok(line, 'UI serializer must be found, never substitute a test-owned formatter');
const expression = line.replace(/^const strings = /, '').replace(/\(s: Selection\)/, '(s)').replace(/ as Record<keyof Rect, string>/, '').replace(/;\s*$/, '');
const format = new Function('fields', 'formatSelection', `return (${expression})`)(['x','y','width','height'].map(k => [k,k]), model.formatSelection);
assert.equal(typeof format, 'function');
const dest = process.env.PRECISION_MODEL_DIR || 'work/image-crop-precision-model'; fs.mkdirSync(dest, { recursive: true });
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const report = { head: git('rev-parse','HEAD'), tree: git('rev-parse','HEAD^{tree}'), dirty: git('status','--porcelain'), platform: process.platform, node: process.version, serializerSource: line, checks: [], errors: [], sourceSHA256: {} };
for (const f of ['app/components/practical/image-crop-model.ts','app/components/practical/ImageCrop.tsx', 'scripts/verify-image-crop-precision-model.mjs']) report.sourceSHA256[f] = createHash('sha256').update(fs.readFileSync(f,'utf8').replaceAll('\r\n','\n')).digest('hex');
function check(label, fn) { try { const detail = fn(); report.checks.push({label,status:'PASS',detail}); } catch (e) { report.checks.push({label,status:'FAIL',error:String(e.stack || e)}); report.errors.push(label); } }
// An independent exact dyadic sum oracle: no floating addition or production helper.
function dyadic(value) {
  const d = new DataView(new ArrayBuffer(8)); d.setFloat64(0,value); const high=d.getUint32(0), low=d.getUint32(4), exponent=(high>>>20)&2047;
  const fraction=(BigInt(high&0xfffff)<<BigInt(32))+BigInt(low); const mantissa=exponent?fraction+(BigInt(1)<<BigInt(52)):fraction;
  return { n: high>>>31 ? -mantissa : mantissa, e: exponent?exponent-1023-52:-1074 };
}
function exactEndFits(a,b,edge) { const ds=[a,b,edge].map(dyadic), e=Math.min(...ds.map(d=>d.e));const ns=ds.map(d=>d.n<<BigInt(d.e-e));return ns[0]+ns[1]<=ns[2]; }
function invariant(s) {
  const r=s.rect;assert.ok(Object.values(r).every(Number.isFinite));assert.ok(r.x>=0&&r.y>=0&&r.width>=80&&r.height>=80,JSON.stringify(r));
  assert.ok(exactEndFits(r.x,r.width,1000)&&exactEndFits(r.y,r.height,700),JSON.stringify(r));
  const ratio=model.RATIOS[s.ratio];if(ratio)assert.ok(Math.abs(r.width/r.height-ratio)<=4*Number.EPSILON*ratio,'ratio must differ only by bounded binary arithmetic error');
}
function roundTrip(s, cycles=16) {
  const before=structuredClone(s), values=format(s);let next=s;
  for(let i=0;i<cycles;i++) { const result=model.numeric(format(next), next.ratio);assert.ok(result.selection,result.error);next=result.selection;assert.deepEqual(next,before,'Unmodified displayed fields must preserve every coordinate exactly');invariant(next); }
  return {before,values,after:next,cycles};
}
for(const ratio of ['wide','photo','square']) for(const corner of ['nw','ne','sw','se']) {
  check(`minimum/${ratio}/${corner}`,()=>{const start=model.changeRatio(model.INITIAL,ratio), sx=corner.endsWith('w')?1:-1,sy=corner.startsWith('n')?1:-1;return roundTrip(model.resize(start,corner,sx*1e6,sy*1e6));});
}
for(const ratio of ['free','wide','photo','square'])for(const corner of ['nw','ne','sw','se'])check(`maximum/${ratio}/${corner}`,()=>{const start=model.changeRatio(model.INITIAL,ratio),sx=corner.endsWith('w')?-1:1,sy=corner.startsWith('n')?-1:1;return roundTrip(model.resize(start,corner,sx*1e6,sy*1e6));});
check('near-edge/free',()=>roundTrip({ratio:'free',rect:{x:919.9999999,y:619.9999999,width:80.00000005,height:80.00000005}}));
check('free/minimum',()=>roundTrip({ratio:'free',rect:{x:920,y:620,width:80,height:80}}));
check('mixed-ratio-corner-numeric',()=>{
  let s=model.INITIAL;for(let i=0;i<80;i++) {s=model.changeRatio(s,['wide','free','photo','square'][i%4]);s=model.resize(s,['nw','ne','sw','se'][i%4],i%2?17:-33,i%3?29:-71);s={...s,rect:model.move(s.rect,i%2?1e6:-1e6,i%3?1e6:-1e6)};s=roundTrip(s,12).after;}return s;
});
const base={x:'100',y:'120',width:'480',height:'360'};
const invalid=[
  ['empty', {...base,x:''},'free'], ['NaN',{...base,width:'NaN'},'free'],['Infinity',{...base,y:'Infinity'},'free'],['negative',{...base,x:'-0.0000001'},'free'],
  ['free-below-min',{...base,height:'79.9999999'},'free'],['square-below-min',{...base,width:'79.9999999'},'square'],['wide-below-min',{...base,width:'142.222222'},'wide'],['photo-below-min',{...base,width:'106.666666'},'photo'],
  ['sub-ULP-min',{...base,height:'79.999999999999999'},'free'],['underflow',{...base,x:'-1e-400'},'free'],
  ['outside-x',{x:'920.0000001',y:'620',width:'80',height:'80'},'free'],['outside-y',{x:'920',y:'620.0000001',width:'80',height:'80'},'free'],
  ['outside-hidden-by-rounded-add',{x:'919.9999999999999',y:'620',width:'80.00000000000016',height:'80'},'free'],
];
for(const [name,values,ratio]of invalid)check(`reject/${name}`,()=>{const result=model.numeric(values,ratio);assert.equal(result.selection,undefined,JSON.stringify(result));assert.ok(result.error);return {values,ratio,error:result.error};});
check('strict-generated-edges',()=>{
  let s=model.INITIAL;for(let i=0;i<2500;i++){s=model.changeRatio(s,['free','wide','photo','square'][i%4]);s=model.resize(s,['nw','ne','sw','se'][i%4],Math.sin(i)*1937,Math.cos(i)*1781);s={...s,rect:model.move(s.rect,Math.sin(i*7)*1e5,Math.cos(i*11)*1e5)};invariant(s);roundTrip(s,2);}return {iterations:2500};
});
assert.equal(new Set(report.checks.map(c => c.label)).size, report.checks.length, 'Each reported check must have a unique label');
report.complete=report.errors.length===0;fs.writeFileSync(path.join(dest,'results.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({head:report.head,checks:report.checks.length,passed:report.checks.filter(x=>x.status==='PASS').length,failures:report.errors}));if(!report.complete)process.exitCode=1;
