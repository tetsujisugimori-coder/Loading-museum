"""Run native acceptance against the local export; no publishing or remote server.

Uses the installed Playwright driver's matched browser executables. Evidence records
actual source/build/script hashes. A failed suite stays failed; no automatic retries.
"""
import datetime
import hashlib
import importlib.metadata
import json
import os
from pathlib import Path
import subprocess
import sys
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
DEST = Path(os.environ.get("EVIDENCE_DIR", ROOT / "work/stage2a-browser")).resolve()
DEST.mkdir(parents=True, exist_ok=True)
ENGINES = os.environ.get("BROWSERS", "chromium,webkit")
WIDTHS = os.environ.get("WIDTHS", "375,390,765")
SUITES = os.environ.get("SUITES", "observation,style,layout,n2,stage1").split(",")
scripts = {
    "observation": "verify-waapi-observation.py",
    "style": "verify-waapi-observation-style.py",
    "layout": "verify-waapi-acceptance-layout.py",
    "n2": "verify-waapi-n2-event.py",
    "stage1": "verify-waapi-stage1.py",
}

def git(*args):
    return subprocess.check_output(["git", "-C", str(ROOT), *args], text=True).strip()

server = subprocess.Popen(["node", str(ROOT / "scripts/serve-static-export.mjs"), str(ROOT / "out")],
                          cwd=ROOT, stdout=subprocess.PIPE, text=True,
                          creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
url = server.stdout.readline().strip()
server.stdout.close()
if not url.startswith("http://127.0.0.1:"):
    server.terminate()
    raise RuntimeError("Local export server failed to supply its loopback URL")
env = os.environ.copy()
env.update(PYTHONUTF8="1", WAAPI_URL=url,
           WAAPI_BROWSERS=ENGINES, WAAPI_WIDTHS=WIDTHS, VERIFY_ENGINES=ENGINES,
           VERIFY_WIDTHS=WIDTHS, VERIFY_ROOT=str(ROOT), VERIFY_PHASE="current-main-integration")
with sync_playwright() as playwright:
    for engine in ["chromium", "webkit"]:
        env["WAAPI_" + engine.upper() + "_PATH"] = getattr(playwright, engine).executable_path

def hashes(paths):
    return {str(p.relative_to(ROOT)).replace("\\", "/"): hashlib.sha256(p.read_bytes()).hexdigest()
            for p in paths if p.is_file()}

def source_hashes():
    return hashes([ROOT/p for p in git("ls-files", "--cached", "--others", "--exclude-standard", "--", "app", "scripts", "tests", "package.json").splitlines()])

report = {"started": datetime.datetime.now(datetime.timezone.utc).isoformat(),
          "head": git("rev-parse", "HEAD"), "tree": git("rev-parse", "HEAD^{tree}"),
          "trackedChanges": git("status", "--porcelain", "--untracked-files=no"),
          "playwright": importlib.metadata.version("playwright"), "python": sys.version,
          "requireClean": os.environ.get("REQUIRE_CLEAN") == "1",
          "engines": ENGINES, "widths": WIDTHS, "suites": [],
          "sourceSHA256": source_hashes(),
          "buildSHA256": hashes(sorted((ROOT / "out").rglob("*")))}
try:
    for suite in SUITES:
        result = DEST / (suite + ".json")
        env.update(WAAPI_RESULT=str(result), VERIFY_OUT=str(result), WAAPI_PARTIAL=str(result),
                   WAAPI_SCREENSHOTS=str(DEST / "screenshots"))
        started = datetime.datetime.now(datetime.timezone.utc).isoformat()
        script_hash = hashlib.sha256((ROOT / "scripts" / scripts[suite]).read_bytes()).hexdigest()
        with (DEST / (suite + ".log")).open("wb") as log:
            code = subprocess.call([sys.executable, str(ROOT / "scripts" / scripts[suite])],
                                   env=env, cwd=ROOT, stdout=log, stderr=subprocess.STDOUT)
        report["suites"].append({"name": suite, "exitCode": code, "started": started, "scriptSHA256": script_hash})
        print(suite, "PASS" if code == 0 else "FAIL", flush=True)
finally:
    server.terminate()
    server.wait(timeout=10)
    report["finished"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    report["headAfter"] = git("rev-parse", "HEAD")
    report["treeAfter"] = git("rev-parse", "HEAD^{tree}")
    report["trackedChangesAfter"] = git("status", "--porcelain", "--untracked-files=no")
    report["sourceSHA256After"] = source_hashes()
    report["sourceUnchanged"] = (report["sourceSHA256After"] == report["sourceSHA256"]
                                  and report["headAfter"] == report["head"]
                                  and report["treeAfter"] == report["tree"])
    report["cleanRequirementMet"] = not report["requireClean"] or not (report["trackedChanges"] or report["trackedChangesAfter"])
    report["status"] = "PASS" if (len(report["suites"]) == len(SUITES)
                                  and all(s["exitCode"] == 0 for s in report["suites"])
                                  and report["sourceUnchanged"] and report["cleanRequirementMet"]) else "FAIL"
    (DEST / "provenance.json").write_text(json.dumps(report, indent=2), encoding="utf8")
    print("overall", report["status"], "sourceUnchanged", report["sourceUnchanged"],
          "cleanRequirementMet", report["cleanRequirementMet"], flush=True)
sys.exit(0 if report["status"] == "PASS" else 1)
