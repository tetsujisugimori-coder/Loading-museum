// Single real-WebKit process-stop fixture. Never imports or runs Stage C registered slots.
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { closeSync, fsyncSync, openSync, readFileSync, readdirSync, readlinkSync, writeSync } from 'node:fs';

const [modulePath, proofPath] = process.argv.slice(2);
if (!modulePath?.startsWith('/') || proofPath !== '/var/tmp/webkit-stop-proof.json') {
  throw new Error('Invalid isolated WebKit stop fixture arguments');
}
const require = createRequire(import.meta.url);
const { webkit } = require(modulePath);
if (require(modulePath + '/package.json').version !== '1.61.0') {
  throw new Error('Playwright version mismatch');
}
let readyResolve;
const ready = new Promise(resolve => { readyResolve = resolve; });
let stopResolve;
const stopped = new Promise(resolve => { stopResolve = resolve; });
let started = false;
let stopReceived = false;
let stopReason = null;
function command(data) {
  for (const value of data.toString('ascii')) {
    if (value === 'G') { started = true; readyResolve(); }
    else if (value === 'S') { stopReceived = true; stopReason = 'S'; stopResolve(); readyResolve(); }
    else { stopReason = 'INVALID_COMMAND'; stopResolve(); readyResolve(); }
  }
}
function disconnected() {
  if (!stopReceived) { stopReason = 'DISCONNECTED'; stopResolve(); readyResolve(); }
}
process.stdin.on('data', command);
process.stdin.once('end', disconnected);
let browser;
let context;
function snapshot() {
  const ns = readlinkSync('/proc/self/ns/pid');
  const processes = [];
  for (const name of readdirSync('/proc')) {
    if (!/^\d+$/.test(name)) continue;
    try {
      const namespace = readlinkSync('/proc/' + name + '/ns/pid');
      const status = readFileSync('/proc/' + name + '/status', 'utf8');
      const cmdline = readFileSync('/proc/' + name + '/cmdline').toString().replaceAll('\0', ' ').slice(0, 300);
      processes.push({ pid: Number(name), namespace,
        name: status.match(/^Name:\s*(\S+)/m)?.[1] ?? 'UNKNOWN', cmdline });
    } catch { /* Process may have exited during sampling. */ }
  }
  return { namespace: ns, processes };
}
try {
  await ready;
  if (!started || stopReason !== null) throw new Error('Stopped before WebKit launch');
  browser = await webkit.launch({ headless: true, timeout: 15000 });
  if (stopReason !== null) throw new Error('Stop during WebKit launch');
  context = await browser.newContext();
  if (stopReason !== null) throw new Error('Stop during WebKit context creation');
  const page = await context.newPage();
  if (stopReason !== null) throw new Error('Stop during WebKit page creation');
  await page.setContent('<!doctype html><title>stage-c-webkit-stop-fixture</title>');
  if (await page.title() !== 'stage-c-webkit-stop-fixture') throw new Error('WebKit page was not loaded');
  const version = browser.version();
  const observed = snapshot();
  const webkitProcesses = observed.processes.filter(row =>
    row.pid !== process.pid && /webkit|mini.?browser|webprocess|networkprocess|pw_run/i.test(row.name + ' ' + row.cmdline));
  if (!webkitProcesses.length || webkitProcesses.some(row => row.namespace !== observed.namespace)) {
    throw new Error('Real WebKit processes were not confirmed inside the worker PID namespace');
  }
  await stopped;
  if (!stopReceived || stopReason !== 'S') throw new Error('No valid supervisor stop command');
  await context.close();
  context = undefined;
  await browser.close();
  browser = undefined;
  const proof = {
    kind: 'STAGE_C_REAL_WEBKIT_STOP_ONLY', registeredTrials: 0,
    playwrightVersion: '1.61.0', browserType: webkit.name(), webkitVersion: version,
    pageTitle: 'stage-c-webkit-stop-fixture', workerNamespace: observed.namespace,
    observedWebkitProcesses: webkitProcesses, stopCommand: 'S',
    cleanup: 'PASS', persistence: 'PASS'
  };
  const data = JSON.stringify(proof) + '\n';
  const fd = openSync(proofPath, 'wx', 0o600);
  try { writeSync(fd, data); fsyncSync(fd); } finally { closeSync(fd); }
  if (readFileSync(proofPath, 'utf8') !== data) throw new Error('Proof readback mismatch');
  const proofSha256 = createHash('sha256').update(data).digest('hex');
  console.log(JSON.stringify({ stopRequested: true, stopCompleted: true,
    cleanup: 'PASS', persistence: 'PASS', proofSha256 }));
  // A requested stop is an incomplete product run, never a product PASS.
  process.exitCode = 1;
} catch (error) {
  console.error('REAL_WEBKIT_STOP_DIAGNOSTIC_ERROR', error);
  process.exitCode = 2;
  try { await context?.close(); } catch {}
  try { await browser?.close(); } catch {}
} finally {
  process.stdin.off('data', command).off('end', disconnected).pause();
}
