// Single real-WebKit process-stop fixture. Never imports or runs Stage C registered slots.
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { closeSync, fsyncSync, linkSync, openSync, readFileSync, readdirSync, readlinkSync, unlinkSync, writeSync } from 'node:fs';

const [modulePath, proofPath] = process.argv.slice(2);
if (!modulePath?.startsWith('/') || proofPath !== '/var/tmp/webkit-stop-proof.json') {
  throw new Error('Invalid isolated WebKit stop fixture arguments');
}
// A diagnostic-only mount inside the already writable private /tmp; production configuration is unchanged.
process.env.PLAYWRIGHT_BROWSERS_PATH = '/tmp/runtime/ms-playwright';
const require = createRequire(import.meta.url);
const { webkit } = require(modulePath);
if (require(modulePath + '/package.json').version !== '1.56.1') {
  throw new Error('Playwright version mismatch');
}
let readyResolve;
const startPermission = new Promise(resolve => { readyResolve = resolve; });
let stopResolve;
const stopped = new Promise(resolve => { stopResolve = resolve; });
let started = false;
let stopReceived = false;
let stopReason = null;
let stopReceivedAtNs;
function command(data) {
  for (const value of data.toString('ascii')) {
    if (value === 'G') { started = true; readyResolve(); }
    else if (value === 'S') {
      stopReceived = true;
      stopReceivedAtNs ??= clock();
      stopReason = 'S';
      stopResolve();
      readyResolve();
    }
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
const clock = () => process.hrtime.bigint().toString();

function save(path, record) {
  const data = JSON.stringify(record) + '\n';
  const pending = path + '.pending';
  const fd = openSync(pending, 'wx', 0o600);
  try { writeSync(fd, data); fsyncSync(fd); } finally { closeSync(fd); }
  if (readFileSync(pending, 'utf8') !== data) throw new Error('Proof readback mismatch');
  // Publish only after readback. The supervisor cannot read a partial receipt.
  linkSync(pending, path);
  unlinkSync(pending);
  return createHash('sha256').update(data).digest('hex');
}

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
        name: status.match(/^Name:\s*(\S+)/m)?.[1] ?? 'UNKNOWN',
        parentPid: Number(status.match(/^PPid:\s*(\d+)/m)?.[1] ?? -1),
        state: status.match(/^State:\s*(\S+)/m)?.[1] ?? 'UNKNOWN', cmdline });
    } catch { /* Process may have exited during sampling. */ }
  }
  return { namespace: ns, processes };
}
try {
  await startPermission;
  if (!started || stopReason !== null) throw new Error('Stopped before WebKit launch');
  browser = await webkit.launch({ headless: true, timeout: 45000 });
  if (stopReason !== null) throw new Error('Stop during WebKit launch');
  context = await browser.newContext();
  if (stopReason !== null) throw new Error('Stop during WebKit context creation');
  const page = await context.newPage();
  if (stopReason !== null) throw new Error('Stop during WebKit page creation');
  await page.setContent('<!doctype html><title>stage-c-webkit-stop-fixture</title>');
  if (stopReason !== null) throw new Error('Stop during WebKit page load');
  if (await page.title() !== 'stage-c-webkit-stop-fixture') throw new Error('WebKit page was not loaded');
  const version = browser.version();
  if (version !== '26.0') throw new Error('WebKit 26.0 was not launched');
  const observed = snapshot();
  const isLiveWebKit = row => row.pid !== process.pid && row.state !== 'Z' &&
    (/\b(?:MiniBrowser|WPEWebProcess|WPENetworkProcess)\b/i.test(row.name + ' ' + row.cmdline) ||
      row.cmdline.split(' ').includes('/tmp/runtime/ms-playwright/webkit-2215/pw_run.sh'));
  const webkitProcesses = observed.processes.filter(isLiveWebKit);
  const launcherPids = new Set(webkitProcesses.filter(row =>
    row.cmdline.split(' ').includes('/tmp/runtime/ms-playwright/webkit-2215/pw_run.sh')).map(row => row.pid));
  if (!webkitProcesses.some(row => /\bMiniBrowser\b/.test(row.cmdline) && launcherPids.has(row.parentPid)) ||
      !webkitProcesses.some(row => /WPE(?:Web|Network)Process/.test(row.cmdline)) ||
      webkitProcesses.some(row => row.namespace !== observed.namespace || row.state === 'Z')) {
    throw new Error('WebKit browser and child were not confirmed in the worker PID namespace');
  }
  if (stopReason !== null) throw new Error('Stopped before READY');
  const ready = {
    kind: 'STAGE_C_WEBKIT_READY', registeredTrials: 0,
    playwrightVersion: '1.56.1', browserType: webkit.name(), webkitVersion: version,
    pageTitle: 'stage-c-webkit-stop-fixture', workerNamespace: observed.namespace,
    observedWebkitProcesses: webkitProcesses, readyAtNs: clock(),
  };
  const readySha256 = save('/var/tmp/webkit-stop-ready.json', ready);
  await stopped;
  if (!stopReceived || stopReason !== 'S') throw new Error('No valid supervisor stop command');
  await context.close();
  const contextClosedAtNs = clock();
  context = undefined;
  await browser.close();
  const browserClosedAtNs = clock();
  browser = undefined;
  const alive = snapshot().processes.filter(isLiveWebKit);
  if (alive.length) throw new Error('Observed WebKit processes are still running after close');
  const proof = {
    ...ready, kind: 'STAGE_C_REAL_WEBKIT_STOP_ONLY', readySha256,
    stopCommand: 'S', stopReceivedAtNs, contextClosedAtNs, browserClosedAtNs,
    remainingWebkitProcesses: alive, cleanup: 'PASS', persistence: 'PASS',
  };
  const proofSha256 = save(proofPath, proof);
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
