/**
 * Stage C network observer. Additive, no routes, fetches, DOM reads, await or body calls.
 * This does NOT authorize Stage C browser experiments.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';

const sha256 = data => createHash('sha256').update(data).digest('hex');
const allowedMethods = new Set(['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']);
const allowedTypes = new Set(['document','stylesheet','image','media','font','script','texttrack','xhr','fetch','eventsource','websocket','manifest','other']);

/**
 * Expected policy is independent preflight input. Never produce it from observed requests.
 * A dynamic loopback port may be supplied only once, after server.listen, before browser launch.
 * A separate frozen preflight record must bind the actual loopback origin to the approved server.
 * Each rule has explicit min/max; no implicit allowances for unregistered paths or query keys.
 */
export function validatePolicy(policy) {
  assert.equal(policy?.schemaVersion, 1);
  assert.match(policy.slotId, /^AP-(?:CAL-0[1-4]|0[12]-I[012])$/);
  const origin = new URL(policy.origin);
  assert.equal(origin.origin, policy.origin);
  assert.equal(origin.protocol, 'http:');
  assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(origin.hostname), 'loopback-only server');
  assert.equal(policy.unknownRequestAction, 'STOP_NEW_OPERATIONS');
  assert.equal(policy.redirectHandling, 'COUNT_EACH_HOP');
  assert.equal(policy.cacheHandling, 'OBSERVE_UNDETERMINED');
  assert.ok(Array.isArray(policy.rules) && (policy.rules.length || policy.slotId.startsWith('AP-CAL-')),
    'explicit allowlist required for product slots');
  const identities = new Set();
  for (const rule of policy.rules) {
    assert.ok(allowedMethods.has(rule.method));
    assert.ok(typeof rule.pathname === 'string' && rule.pathname.startsWith('/') && !rule.pathname.includes('?'));
    assert.deepEqual([...new Set(rule.queryKeys)].sort(), rule.queryKeys, 'sorted unique query keys');
    assert.ok(rule.queryValues && Object.getPrototypeOf(rule.queryValues) === Object.prototype, 'explicit query values required');
    assert.deepEqual(Object.keys(rule.queryValues).sort(), rule.queryKeys, 'every query value approved');
    for (const key of rule.queryKeys) assert.equal(typeof rule.queryValues[key], 'string', 'literal query value');
    assert.ok(Array.isArray(rule.resourceTypes) && rule.resourceTypes.length);
    assert.deepEqual([...new Set(rule.resourceTypes)].sort(), rule.resourceTypes, 'sorted unique types');
    for (const type of rule.resourceTypes) assert.ok(allowedTypes.has(type));
    assert.ok(Number.isSafeInteger(rule.min) && rule.min >= 0);
    assert.ok(Number.isSafeInteger(rule.max) && rule.max >= rule.min);
    assert.ok(Number.isSafeInteger(rule.max) && rule.max > 0);
    assert.ok(Array.isArray(rule.allowedStatuses) && rule.allowedStatuses.length);
    for (const status of rule.allowedStatuses) assert.ok(Number.isInteger(status) && status >= 100 && status <= 599);
    const key = JSON.stringify([rule.method, rule.pathname, rule.queryKeys, rule.queryValues, rule.resourceTypes]);
    assert.ok(!identities.has(key), 'ambiguous identical rule');
    identities.add(key);
  }
  return structuredClone(policy);
}

export function observeNetwork(context, sourcePolicy, {onStop} = {}) {
  const policy = validatePolicy(sourcePolicy);
  const policySha256 = sha256(JSON.stringify(policy));
  let sequence = 0, stopped = false, sealed = false;
  const byRequest = new WeakMap();
  const requests = [], events = [], violations = [];
  const ruleCounts = policy.rules.map(() => 0);
  const now = () => process.hrtime.bigint().toString(); // lossless monotonic ns, process-local; NOT browser clock
  const event = (kind, id, details = {}) => events.push({sequence:++sequence, atHostMonotonicNs:now(), kind, requestId:id, ...details});
  function violation(code, id, details = {}) {
    const v = {code, requestId:id, ...details};
    violations.push(v);
    event('policy_violation',id,{code});
    if (!stopped) {
      stopped = true;
      try { onStop?.({slotId:policy.slotId, reason:code, requestId:id}); }
      catch (err) { violations.push({code:'STOP_NOTIFICATION_FAILED', error:String(err), requestId:id}); }
    }
  }
  function fromRequest(request) {
    const row = byRequest.get(request);
    if (!row) { violation('EVENT_WITHOUT_REQUEST',null); return null; }
    return row;
  }
  const handlers = {
    request(request) {
      if (sealed) { violation('EVENT_AFTER_SEAL',null); return; }
      const id = `${policy.slotId}-net-${requests.length+1}`;
      let url, method, resourceType, predecessor;
      try {
        url = request.url(); method = request.method(); resourceType = request.resourceType();
        predecessor = request.redirectedFrom?.() ?? null;
      } catch (err) { violation('REQUEST_METADATA_UNREADABLE',id,{error:String(err)}); return; }
      const row = {id,slotId:policy.slotId,url,method,resourceType,redirectedFrom:null,responseStatus:null,
        responseFromServiceWorker:'UNKNOWN',cacheDisposition:'UNDETERMINED',terminal:null,failure:null,ruleIndex:null};
      requests.push(row); byRequest.set(request,row);
      if (predecessor) {
        row.redirectedFrom = byRequest.get(predecessor)?.id ?? 'PARENT_NOT_CAPTURED';
        if (row.redirectedFrom === 'PARENT_NOT_CAPTURED') violation('REDIRECT_PARENT_NOT_CAPTURED',id);
      }
      event('request',id,{url,method,resourceType});
      let parsed;
      try { parsed = new URL(url); }
      catch { violation('BAD_REQUEST_URL',id); return; }
      if (parsed.origin !== policy.origin) { violation('UNKNOWN_ORIGIN',id,{origin:parsed.origin}); return; }
      const keys = [...parsed.searchParams.keys()].sort();
      if (new Set(keys).size !== keys.length) { violation('DUPLICATE_QUERY_KEY',id); return; }
      const matches = policy.rules.map((r,i)=>({r,i})).filter(({r})=>r.method===method && r.pathname===parsed.pathname &&
        JSON.stringify(r.queryKeys)===JSON.stringify(keys) &&
        keys.every(key=>parsed.searchParams.get(key)===r.queryValues[key]) && r.resourceTypes.includes(resourceType));
      if (matches.length !== 1) { violation(matches.length?'AMBIGUOUS_ALLOWLIST':'UNKNOWN_REQUEST',id,{path:parsed.pathname,queryKeys:keys}); return; }
      row.ruleIndex = matches[0].i;
      ruleCounts[row.ruleIndex]++;
      if (ruleCounts[row.ruleIndex] > matches[0].r.max) violation('REQUEST_COUNT_EXCEEDED',id,{ruleIndex:row.ruleIndex,count:ruleCounts[row.ruleIndex]});
    },
    response(response) {
      let row;
      try {
        row = fromRequest(response.request());
        if (!row) return;
        row.responseStatus = response.status();
        row.responseFromServiceWorker = typeof response.fromServiceWorker === 'function' ? response.fromServiceWorker() : 'UNKNOWN';
        event('response',row.id,{status:row.responseStatus,fromServiceWorker:row.responseFromServiceWorker});
        if (row.ruleIndex !== null && !policy.rules[row.ruleIndex].allowedStatuses.includes(row.responseStatus))
          violation('UNEXPECTED_HTTP_STATUS',row.id,{status:row.responseStatus});
      } catch (err) { violation('RESPONSE_METADATA_UNREADABLE',row?.id ?? null,{error:String(err)}); }
    },
    requestfinished(request) {
      const row = fromRequest(request); if (!row) return;
      if (row.terminal) { violation('DUPLICATE_TERMINAL',row.id); return; }
      row.terminal = 'FINISHED'; event('requestfinished',row.id);
      if (row.responseStatus === null) violation('FINISHED_WITHOUT_RESPONSE',row.id);
    },
    requestfailed(request) {
      const row = fromRequest(request); if (!row) return;
      if (row.terminal) { violation('DUPLICATE_TERMINAL',row.id); return; }
      row.terminal = 'FAILED';
      try { row.failure = request.failure()?.errorText || 'UNSPECIFIED_NETWORK_FAILURE'; }
      catch { row.failure = 'FAILURE_METADATA_UNKNOWN'; }
      event('requestfailed',row.id,{failure:row.failure});
      violation('NETWORK_FAILURE',row.id);
    }
  };
  for (const [name, fn] of Object.entries(handlers)) context.on(name,fn);
  function finalise() {
    if (sealed) throw new Error('ledger already sealed');
    sealed = true;
    for (const [name, fn] of Object.entries(handlers)) context.off(name,fn);
    const countProblems = policy.rules.flatMap((r,i)=>ruleCounts[i]<r.min?[{code:'BELOW_MINIMUM',ruleIndex:i,observed:ruleCounts[i],min:r.min}]:[]);
    const incomplete = requests.filter(r=>r.terminal===null).map(r=>r.id);
    const verdict = violations.length || countProblems.length ? 'FAIL' : incomplete.length || (!requests.length && policy.rules.length) ? 'INCOMPLETE':'PASS';
    const counts = policy.rules.map((rule,index)=>({ruleIndex:index,method:rule.method,pathname:rule.pathname,queryKeys:rule.queryKeys,queryValues:rule.queryValues,resourceTypes:rule.resourceTypes,expected:{min:rule.min,max:rule.max},observed:ruleCounts[index]}));
    return {schemaVersion:1,kind:'STAGE_C_NETWORK_LEDGER',slotId:policy.slotId,policySha256,
      evidenceStatus: verdict === 'PASS' ? 'COMPLETE' : 'INCOMPLETE',networkPolicyVerdict:verdict,
      note:'This is per-context Playwright-observed traffic, not proof of every physical network packet or cache hit.',
      counts,requests,events,violations,countProblems,incompleteRequestIds:incomplete,
      stopRequested:stopped,cacheGroundTruth:'UNKNOWN',rawResponseBytes:'NOT_CAPTURED_BY_THIS_MODULE'};
  }
  return {finalise,shouldStop:()=>stopped,policySha256};
}

/** Exclusive, byte-verified local output. Call after the slot's primary has been captured. */
export function saveNetworkLedger(filename, receipt) {
  const bytes = Buffer.from(JSON.stringify(receipt,null,2)+'\n');
  const fd = fs.openSync(filename,'wx',0o600);
  try { fs.writeFileSync(fd,bytes); fs.fsyncSync(fd); }
  finally { fs.closeSync(fd); }
  const saved = fs.readFileSync(filename);
  assert.deepEqual(saved,bytes, 'written network ledger must independently read back');
  return {path:filename,bytes:saved.length,sha256:sha256(saved)};
}
