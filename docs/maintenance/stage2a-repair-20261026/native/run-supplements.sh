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
python -m http.server 4217 --bind 127.0.0.1 --directory "$SERVE" >"$OUT/supplement-server.log" 2>&1 & SERVER=$!
trap 'kill "$SERVER" 2>/dev/null || true' EXIT
sleep 1
kill -0 "$SERVER" || exit 5
python "$OUT/check-served-build.py" "$OUT/supplement-served-digests.json" >"$OUT/supplement-served-check.log" 2>&1 || exit 6
run_suite() {
  local name=$1; shift
  printf '%s %s START\n' "$(date -u +%FT%TZ)" "$name" >>"$OUT/regression-runs.log"
  "$@" >"$OUT/$name.log" 2>&1
  local code=$?
  printf '%s %s EXIT %s\n' "$(date -u +%FT%TZ)" "$name" "$code" >>"$OUT/regression-runs.log"
}
run_suite stage1-ch765-repeat env WAAPI_BROWSERS=chromium WAAPI_WIDTHS=765 WAAPI_PARTIAL="$OUT/stage1-ch765-repeat.json" python scripts/verify-waapi-stage1.py
run_suite stage1-wk390-repeat env WAAPI_BROWSERS=webkit WAAPI_WIDTHS=390 WAAPI_PARTIAL="$OUT/stage1-wk390-repeat.json" python scripts/verify-waapi-stage1.py
run_suite dodge-latency python "$OUT/probe-dodge-latency.py"
