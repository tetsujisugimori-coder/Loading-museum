#!/usr/bin/env bash
set -euo pipefail
ROOT=$(git rev-parse --show-toplevel); OUT="$ROOT/docs/maintenance/stage2a-verification-20261026"
export WAAPI_URL=http://127.0.0.1:4201/Loading-museum/ WAAPI_CHROMIUM_PATH=/tmp/loading-native/chromium/chrome-linux/headless_shell WAAPI_WEBKIT_PATH=/tmp/loading-native/webkit/pw_run.sh
export PYTHONPATH=/tmp/loading-pw156 LD_LIBRARY_PATH=/tmp/loading-wkdeps/root/usr/lib/x86_64-linux-gnu XDG_RUNTIME_DIR=/tmp/loading-wkrun HOME=/tmp/loading-wkhome XDG_CACHE_HOME=/tmp/loading-wkcache
SERVE=$(mktemp -d /tmp/stage2a-serve.XXXX);ln -s "$ROOT/out" "$SERVE/Loading-museum";python -m http.server 4201 --bind 127.0.0.1 --directory "$SERVE" >"$OUT/supplement-server.log" 2>&1 & SERVER=$!;trap 'kill "$SERVER" 2>/dev/null || true' EXIT
sleep 1
IO_OUT="$OUT/menu-offscreen-probe.json" python "$OUT/probe-webkit-menu-offscreen.py" >"$OUT/menu-offscreen-probe.log" 2>&1
EARLY_OUT="$OUT/coin-early-supplement.json" python "$OUT/probe-webkit-coin-early.py" >"$OUT/coin-early-supplement.log" 2>&1
WAAPI_BROWSERS=webkit WAAPI_WIDTHS=375,390 WAAPI_RESULT="$OUT/final-webkit-retry.json" python scripts/verify-waapi-observation.py >"$OUT/final-webkit-retry.log" 2>&1 || echo "full retry exit=$?" >>"$OUT/runner-events.log"
