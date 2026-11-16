#!/bin/bash
# Lantern Peak tests. From the repo root:  bash games/src/lantern_peak/run_tests.sh
# 1) route checker (pure physics): every required route is beatable, zone 2 needs Cloud Hop, no softlocks
# 2) builds, serves the repo on :8765 and runs the Playwright play test (bot climb, Waystone rules, falls, pause/restart/reload, all sets, fps)
set -e
D="$(cd "$(dirname "$0")" && pwd)"; R="$(cd "$D/../../.." && pwd)"
node "$D/tests/routes.js"
python3 "$D/build.py"
cp "$D/out/lantern_peak.html" "$R/games/_lp_test.html"
(cd "$R" && python3 -m http.server 8765 >/dev/null 2>&1 &) ; sleep 1
trap 'rm -f "$R/games/_lp_test.html"' EXIT
node "$D/tests/play.js" http://localhost:8765/games/_lp_test.html
