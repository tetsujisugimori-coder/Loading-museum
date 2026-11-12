/** Boundary-only transform; the earlier 120-trial transform remains unchanged. */
import {createHash} from 'node:crypto';
import {instrumentSource} from './phase7d-diagnostic-instrument.mjs';

export function instrumentBoundary(input, kind, group) {
  const result = instrumentSource(input, kind, group);
  if (group !== 'B') return result;
  const anchors = kind === 'swipe'
    ? ["later(()=>{if(gen===epoch.current)change(result);},reduced?0:240);", "later(()=>{__phase7dEmit('swipe','timer-callback',{generation:epoch.current,token:gen});if(gen===epoch.current)change(result);},reduced?0:240);"]
    : ["timer.current=setTimeout(()=>{if(token!==generation.current||!allowed.current)return;", "timer.current=setTimeout(()=>{__phase7dEmit('status','timer-callback',{generation:generation.current,token});if(token!==generation.current||!allowed.current)return;"];
  const count = result.source.split(anchors[0]).length - 1;
  if (count !== 1) throw Error(`${kind}/B: callback: expected one exact match, got ${count}`);
  result.source = result.source.replace(...anchors);
  result.manifest.replacements.push('boundary callback');
  result.manifest.afterSha256 = createHash('sha256').update(result.source).digest('hex');
  return result;
}
