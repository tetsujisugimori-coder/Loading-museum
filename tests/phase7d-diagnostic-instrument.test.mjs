import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {instrumentSource} from '../scripts/phase7d-diagnostic-instrument.mjs';
const sources={swipe:fs.readFileSync('app/components/interactive-motion/GestureExhibits.tsx','utf8'),status:fs.readFileSync('app/components/interactive-motion/ReactiveExhibits.tsx','utf8')};
for(const kind of ['swipe','status']){
 test(`${kind}: A is byte-identical and has no probes`,()=>{const r=instrumentSource(sources[kind],kind,'A');assert.equal(r.source,sources[kind]);assert.equal(r.manifest.beforeSha256,r.manifest.afterSha256);assert.deepEqual(r.manifest.replacements,[]);});
 for(const group of ['B','C'])test(`${kind}/${group}: exact transform parses and preserves timer delay`,()=>{const r=instrumentSource(sources[kind],kind,group);const result=ts.transpileModule(r.source,{fileName:'copy.tsx',reportDiagnostics:true,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}});assert.deepEqual(result.diagnostics.filter(d=>d.category===ts.DiagnosticCategory.Error),[]);assert.match(r.source,/__phase7dEmit\('[^']+','commit'/);assert.match(r.source,/__phase7dEmit\('[^']+','state-request'/);assert.equal((r.source.match(/setTimeout\(/g)||[]).length,(sources[kind].match(/setTimeout\(/g)||[]).length);assert.match(r.source,kind==='swipe'?/},reduced\?0:240\);/:/},duration\);/);if(group==='B')assert.doesNotMatch(r.source,/'timer-register'/);else{assert.match(r.source,/'timer-register'/);assert.match(r.source,/'timer-callback'/);assert.match(r.source,/'guard'/);}});
 test(`${kind}: altered source fails closed`,()=>assert.throws(()=>instrumentSource(sources[kind].replace('type Props={active:boolean;reduced:boolean};','type Props = {};'),kind,'C'),/expected one exact match/));
 test(`${kind}: duplicate anchor fails closed`,()=>assert.throws(()=>instrumentSource(sources[kind]+'\ntype Props={active:boolean;reduced:boolean};',kind,'B'),/got 2/));
 test(`${kind}: repeat transform fails rather than double instrument`,()=>{const r=instrumentSource(sources[kind],kind,'C');assert.throws(()=>instrumentSource(r.source,kind,'C'));});
}
test('invalid group and kind rejected',()=>{assert.throws(()=>instrumentSource('', 'other','C'));assert.throws(()=>instrumentSource('', 'swipe','D'));});
for(const kind of ['swipe','status'])test(`${kind}: commit probe runs for equal-state rerenders`,async()=>{
 const r=instrumentSource(sources[kind],kind,'B');
 const ast=ts.createSourceFile('copy.tsx',r.source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let hook;
 function visit(n){if(ts.isCallExpression(n)&&n.expression.getText(ast)==='useLayoutEffect'&&n.arguments[0]?.getText(ast).includes("'commit'"))hook=n;ts.forEachChild(n,visit);}visit(ast);
 assert.ok(hook);assert.equal(hook.arguments.length,1,'every commit rather than dependency-change only');
 const body=hook.arguments[0].body.getText(ast).slice(1,-1);
 const events=[],emit=(work,phase,fields)=>events.push({work,phase,...fields});
 const callback=new Function('__phase7dEmit','generation','epoch','state','root',body);
 const {JSDOM}=await import('jsdom');const React=await import('react');const {createRoot}=await import('react-dom/client');
 const dom=new JSDOM('<div id="mount"></div>');const previous={window:globalThis.window,document:globalThis.document,act:globalThis.IS_REACT_ACT_ENVIRONMENT};globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
 const rootRef={current:{getAttribute:()=>kind==='status'?'Loading':'dragging'}};
 function Probe({generation}){React.useLayoutEffect(()=>callback(emit,{current:generation},{current:generation},kind==='status'?'Loading':'dragging',rootRef));return React.createElement('div',null,'unchanged state');}
 const root=createRoot(document.getElementById('mount'));
 try{await React.act(()=>root.render(React.createElement(Probe,{generation:4})));await React.act(()=>root.render(React.createElement(Probe,{generation:5})));assert.equal(events.length,2);assert.deepEqual(events.map(e=>e.generation),[4,5]);assert.equal(events[0].state,events[1].state);}finally{await React.act(()=>root.unmount());dom.window.close();globalThis.window=previous.window;globalThis.document=previous.document;globalThis.IS_REACT_ACT_ENVIRONMENT=previous.act;}
});
