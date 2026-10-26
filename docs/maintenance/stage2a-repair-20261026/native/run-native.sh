#!/usr/bin/env bash
set -euo pipefail
ROOT=$(git rev-parse --show-toplevel)
PHASE=${1:?baseline or repaired}
SOURCE=${2:-$ROOT}
BUILD=${3:-$SOURCE/out}
OUT="$ROOT/docs/maintenance/stage2a-repair-20261026/native"
export WAAPI_URL=http://127.0.0.1:4217/Loading-museum/
export WAAPI_CHROMIUM_PATH=/tmp/loading-native/chromium/chrome-linux/headless_shell
export WAAPI_WEBKIT_PATH=/tmp/loading-native/webkit/pw_run.sh
export LD_LIBRARY_PATH=/tmp/loading-wkdeps/root/usr/lib/x86_64-linux-gnu:${LD_LIBRARY_PATH:-}
export PYTHONPATH=/tmp/loading-pw156
export HOME=/tmp/loading-wkhome XDG_CACHE_HOME=/tmp/loading-wkcache XDG_RUNTIME_DIR=/tmp/loading-wkrun
SERVE=$(mktemp -d /tmp/stage2a-repair-serve.XXXXXX)
ln -s "$BUILD" "$SERVE/Loading-museum"
python -m http.server 4217 --bind 127.0.0.1 --directory "$SERVE" >"$OUT/$PHASE-server.log" 2>&1 & SERVER=$!
trap 'kill "$SERVER" 2>/dev/null || true' EXIT
sleep 1
VERIFY_ROOT="$SOURCE" VERIFY_BUILD="$BUILD" VERIFY_PHASE="$PHASE" VERIFY_OUT="$OUT/$PHASE.json" python "$OUT/verify-coin-cancellation.py" >"$OUT/$PHASE.log" 2>&1
