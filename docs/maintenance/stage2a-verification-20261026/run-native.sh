#!/usr/bin/env bash
set -euo pipefail
ROOT=$(git rev-parse --show-toplevel)
OUT="$ROOT/docs/maintenance/stage2a-verification-20261026"
export WAAPI_URL=http://127.0.0.1:4201/Loading-museum/
export WAAPI_CHROMIUM_PATH=/tmp/loading-native/chromium/chrome-linux/headless_shell
export WAAPI_WEBKIT_PATH=/tmp/loading-native/webkit/pw_run.sh
export LD_LIBRARY_PATH=/tmp/loading-wkdeps/root/usr/lib/x86_64-linux-gnu:${LD_LIBRARY_PATH:-}
export PYTHONPATH=/tmp/loading-pw156
export HOME=/tmp/loading-wkhome XDG_CACHE_HOME=/tmp/loading-wkcache
export XDG_RUNTIME_DIR=/tmp/loading-wkrun
# Separate disposable serving root; product output remains untouched.
SERVE=$(mktemp -d /tmp/stage2a-serve.XXXXXX)
ln -s "$ROOT/out" "$SERVE/Loading-museum"
python -m http.server 4201 --bind 127.0.0.1 --directory "$SERVE" >"$OUT/server.log" 2>&1 & SERVER=$!
trap 'kill "$SERVER" 2>/dev/null || true' EXIT
sleep 1
VERIFY_OUT="$OUT/native-targeted-matched-driver.json" python "$OUT/verify-native-targeted.py" >"$OUT/native-targeted.log" 2>&1
VERIFY_NORMAL_OUT="$OUT/native-normal-return.json" python "$OUT/verify-native-normal-return.py" >"$OUT/native-normal-return.log" 2>&1
WAAPI_RESULT="$OUT/final-six.json" WAAPI_SCREENSHOTS="$OUT/screenshots" python scripts/verify-waapi-observation.py >"$OUT/final-six.log" 2>&1 || echo "full-suite exit=$?" >>"$OUT/runner-events.log"
for i in 1 2 3; do
 WAAPI_BROWSERS=webkit WAAPI_WIDTHS=765 WAAPI_PARTIAL="$OUT/battle-full-sequence-$i.json" python "$OUT/verify-battle-full-sequence-instrumented.py" >"$OUT/battle-full-sequence-$i.log" 2>&1 || echo "diagnostic exit=$? run=$i" >>"$OUT/runner-events.log"
done
