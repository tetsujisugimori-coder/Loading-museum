#!/usr/bin/env bash
set -uo pipefail
ROOT=$(git rev-parse --show-toplevel)
OUT="$ROOT/docs/maintenance/stage2a-repair-20261026/native"
export WAAPI_URL=http://127.0.0.1:4217/Loading-museum/
export WAAPI_CHROMIUM_PATH=/tmp/loading-native/chromium/chrome-linux/headless_shell WAAPI_WEBKIT_PATH=/tmp/loading-native/webkit/pw_run.sh
export LD_LIBRARY_PATH=/tmp/loading-wkdeps/root/usr/lib/x86_64-linux-gnu:${LD_LIBRARY_PATH:-}
export PYTHONPATH=/tmp/loading-pw156 HOME=/tmp/loading-wkhome XDG_CACHE_HOME=/tmp/loading-wkcache XDG_RUNTIME_DIR=/tmp/loading-wkrun
SERVE=$(mktemp -d /tmp/stage2a-regression-serve.XXXXXX)
ln -s "$ROOT/out" "$SERVE/Loading-museum"
python -m http.server 4217 --bind 127.0.0.1 --directory "$SERVE" >"$OUT/regression-server.log" 2>&1 & SERVER=$!
trap 'kill "$SERVER" 2>/dev/null || true' EXIT
sleep 1
kill -0 "$SERVER" || exit 5
python "$OUT/check-served-build.py" "$OUT/regression-served-digests.json" >"$OUT/served-check.log" 2>&1 || exit 6
run_suite() {
  local name=$1; shift
  printf '%s %s START\n' "$(date -u +%FT%TZ)" "$name" >>"$OUT/regression-runs.log"
  "$@" >"$OUT/$name.log" 2>&1
  local code=$?
  printf '%s %s EXIT %s\n' "$(date -u +%FT%TZ)" "$name" "$code" >>"$OUT/regression-runs.log"
}
export WAAPI_BROWSERS=chromium,webkit WAAPI_WIDTHS=375,390,765
run_suite observation env WAAPI_RESULT="$OUT/observation.json" WAAPI_SCREENSHOTS="$OUT/screenshots" python scripts/verify-waapi-observation.py
run_suite stage1 env WAAPI_PARTIAL="$OUT/stage1.json" python scripts/verify-waapi-stage1.py
run_suite major python docs/maintenance/stage2a-repair-20261026/native/verify-major-regressions.py
