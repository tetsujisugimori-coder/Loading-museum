import pathlib,subprocess,time,json,hashlib,os
repo=pathlib.Path('/workspace/scratch/e622c1e9421e/loading-q1-recovered'); root=pathlib.Path('/tmp/q1-limited-20261027'); stage=root/'instrumented'; (stage/'tests').mkdir(parents=True,exist_ok=True)
files=['waapi-gallery.test.tsx','waapi-hp-regression.test.tsx','waapi-observation.test.tsx','waapi-stage1-expanded.test.tsx','macintosh-system-choice.test.tsx']
for name in ['app','node_modules','tsconfig.json','package.json']:
 p=stage/name
 if not p.exists(): p.symlink_to(repo/name)
manifest=[]
for name in files:
 src=(repo/'tests'/name).read_text(); out=src.replace("from '@testing-library/react'", "from './runtime-profile'").replace('from "@testing-library/react"','from "./runtime-profile"')
 # Use the existing explicit cleanup hook to flush buffered observations.
 out=out.replace('afterEach, ', '').replace(' afterEach,',' ')
 out="import { afterEach, __clock, __mark } from './runtime-profile';\n"+out
 # jsdom directive remains within leading comments? Vitest scans entire source for directive.
 lines=[]
 for n,line in enumerate(out.splitlines()):
  if 'await user.' in line or 'await act(' in line:
   lines.extend([f'const __start{n} = __clock();',line,f'__mark("existing-await-line:{n}", __start{n});'])
  else: lines.append(line)
 out='\n'.join(lines)+'\n'; (stage/'tests'/name).write_text(out)
 manifest.append({'file':name,'originalSha256':hashlib.sha256(src.encode()).hexdigest(),'instrumentedSha256':hashlib.sha256(out.encode()).hexdigest()})
(root/'source-manifest.json').write_text(json.dumps(manifest,indent=2))
commands=[('unaltered',repo),('instrumented',stage)]
results=[]
for label,cwd in commands:
 start=time.monotonic(); cpu=time.process_time()
 cmd=['node',str(repo/'node_modules/vitest/vitest.mjs'),'run',*[f'tests/{f}' for f in files],'--maxWorkers=1','--minWorkers=1','--reporter=default','--reporter=json',f'--outputFile={root/ (label+"-results.json")}']
 with (root/(label+'.log')).open('w') as log: result=subprocess.run(cmd,cwd=cwd,stdout=log,stderr=subprocess.STDOUT)
 results.append({'label':label,'command':cmd,'cwd':str(cwd),'exitCode':result.returncode,'wallSeconds':time.monotonic()-start})
 (root/'runs.json').write_text(json.dumps(results,indent=2));print(results[-1],flush=True)
