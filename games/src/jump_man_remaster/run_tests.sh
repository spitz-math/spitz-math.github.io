#!/bin/bash
# Super Jump Man: build, then every test. bash games/src/jump_man_remaster/run_tests.sh   (v28's two-tab check opens
# http://localhost:8765/sjm.html, so this script serves the test copy there while it runs; port 8765 must be free)
cd "$(dirname "$0")" && python3 build.py || exit 2
T=$(mktemp -d); cp out/jump_man_remaster_mult.html "$T/sjm.html"; (cd "$T" && exec python3 -m http.server 8765 >/dev/null 2>&1) & SRV=$!; sleep 1
F="$PWD/out/jump_man_remaster_mult.html"; bad=0
for t in v12 v16 v28 v33 v34 v35 v36 v37 v38; do printf '%s: ' "$t"; if node tests/$t.js "$F" > "$T/$t.log" 2>&1; then tail -1 "$T/$t.log"; else bad=1; grep -v '^  ok' "$T/$t.log" | tail -8; fi; done
# v4 has two timing-flaky checks (rock hit heart, end reward card): one retry
printf 'v4: '; node tests/v4.js "$F" "$T" > "$T/v4.log" 2>&1 || node tests/v4.js "$F" "$T" > "$T/v4.log" 2>&1 || bad=1; tail -1 "$T/v4.log"
kill $SRV 2>/dev/null; exit $bad
