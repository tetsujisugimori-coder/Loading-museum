import assert from 'node:assert/strict';
export const CHECKS = ['inventory','samples-and-raster','pin-create','arrow-create','rectangle-create','text-link','form-commit','invalid-number','history-delete','arrow-endpoints','rectangle-corners','form-roundtrip','pointer-cancel','escape-cancel','foreign-pointer','selection-interrupt','resize-coordinates','letterbox-rejection','zero-recovery','keyboard','touch-input','guide-lifecycle','long-text','scene-switch','raster-negative-control'];
export function configuration(env=process.env) {
  const browsers=(env.BROWSERS??'chromium,webkit').split(','), widths=(env.WIDTHS??'375,390,765,1280').split(',').map(Number), motions=(env.MOTIONS??'no-preference,reduce').split(',');
  for(const [values,allowed] of [[browsers,['chromium','webkit']],[widths,[375,390,765,1280]],[motions,['no-preference','reduce']]]) { assert.ok(values.length>0&&values.every(v=>allowed.includes(v)),'invalid matrix value'); assert.equal(new Set(values).size,values.length,'duplicate matrix value'); }
  return {browsers,widths,motions,keys:browsers.flatMap(b=>widths.flatMap(w=>motions.map(m=>`${b}/${w}/${m}`)))};
}
export function validateReport(report, expected) {
  assert.equal(report.runId,expected.runId,'fresh run nonce');assert.equal(report.head,expected.head,'HEAD');assert.equal(report.tree,expected.tree,'tree');assert.equal(report.exportSHA256,expected.exportSHA256,'build bytes');
  assert.equal(report.status,'PASS');assert.deepEqual(report.errors,[]);assert.deepEqual(report.cases.map(c=>c.key),expected.keys,'complete exact matrix');assert.ok(report.cases.length>0);
  for(const c of report.cases){assert.equal(c.status,'PASS');assert.deepEqual(c.checks,CHECKS,'complete exact checks');assert.ok(c.inputEvents>0,'actual events');assert.ok(c.negativeControl?.detected,'fault detected');assert.ok(c.images.length>=2,'real screenshots');}
}
