import fs from 'node:fs/promises';
let s=await fs.readFile('review-evidence/independent-browser.mjs','utf8');
s=s.replace("dest=path.resolve(process.env.EVIDENCE_DIR||'review-evidence/independent')","dest=path.resolve('review-evidence/independent')");
s=s.replace("  steps.push=function(...items){console.log('STEP',label,...items);return Array.prototype.push.apply(this,items);};\n",'');
s=s.replace("const painted=()=>page.evaluate(()=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Two rendering frames not observed within 8 seconds')),8000);requestAnimationFrame(()=>requestAnimationFrame(()=>{clearTimeout(timer);resolve();}));}));","const painted=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));");
await fs.writeFile('review-evidence/independent-browser-executed.mjs',s);
