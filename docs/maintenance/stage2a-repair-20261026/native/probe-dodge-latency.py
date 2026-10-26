"""Separate diagnostic: scheduled/actual browser input and following RAF; no success retry."""
import os,json,datetime
from playwright.sync_api import sync_playwright
result={'startedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'engine':'webkit','width':390,'samples':[],'pageerror':[]}
with sync_playwright() as p:
 b=p.webkit.launch(headless=True,executable_path=os.environ['WAAPI_WEBKIT_PATH']);result['version']=b.version
 page=b.new_page(viewport={'width':390,'height':757});page.on('pageerror',lambda e:result['pageerror'].append(str(e)))
 page.goto(os.environ['WAAPI_URL'],wait_until='networkidle');page.get_by_role('button',name='サンプル一覧を見る',exact=False).click()
 card=page.locator('.waapiSampleCard').filter(has=page.get_by_role('heading',name='Dodge Afterimage',exact=True));card.scroll_into_view_if_needed()
 for attempt in range(3):
  card.get_by_role('button',name='RESET',exact=True).click()
  sample=card.evaluate('''async n=>{const btn=t=>[...n.querySelectorAll('button')].find(b=>b.textContent===t);const read=()=>({time:performance.now(),text:n.querySelector('output').textContent});btn('ATTACK START').click();const start=performance.now();await new Promise(r=>setTimeout(r,500));const before=read();const input=performance.now();btn('DODGE LEFT').click();const immediate=read();await new Promise(requestAnimationFrame);const nextRaf=read();await new Promise(r=>setTimeout(r,20));return {start,scheduledAt:start+500,input,elapsed:input-start,lateness:input-(start+500),before,immediate,nextRaf,after:read()}}''')
  sample['attempt']=attempt+1;result['samples'].append(sample)
 b.close()
result['finishedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat()
print(json.dumps(result,ensure_ascii=False,indent=2))
