#!/bin/bash
# Lantern Peak tests. From the repo root:  bash games/src/lantern_peak/run_tests.sh
# 1) route checker (pure physics): every stage is beatable, each zone needs its move, no softlocks, the signposted way jump by jump
# 2) builds, serves the repo on :8765 and runs the Playwright play test (bot climb, station rules, falls, moves, the Gloom, end screens, all sets, fps)
set -e
D="$(cd "$(dirname "$0")" && pwd)"; R="$(cd "$D/../../.." && pwd)"
node "$D/tests/routes.js"
python3 "$D/build.py"
cp "$D/out/lantern_peak.html" "$R/games/_lp_test.html"
(cd "$R" && python3 -m http.server 8765 >/dev/null 2>&1 &) ; sleep 1
trap 'rm -f "$R/games/_lp_test.html"' EXIT
node "$D/tests/play.js" http://localhost:8765/games/_lp_test.html
