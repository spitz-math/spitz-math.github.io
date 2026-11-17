#!/usr/bin/env bash
# Dig Buds scripted checks. Builds the self-contained test copy into out/, serves out/ on a local port,
# and runs each script in tests/. A check FAILS when the game throws a script error or a question set
# does not fit the question menu. The scripts also print values (positions, scores, fps) to read by eye.
#   bash run_tests.sh          quick: smoke, upgrades, All-Pro + Bonus Buds, score code, falls/jump/keys, no-WebGL, all sets fit
#   bash run_tests.sh full     also: speed at 6x CPU, music level, two 5-minute bot play-throughs
# Needs Playwright with Chromium (software WebGL flags are set inside the scripts).
set -uo pipefail
cd "$(dirname "$0")"
python3 build_mult.py || exit 2
export DIG_OUT="$PWD/out" PORT="${PORT:-8791}"; export DIG_URL="http://localhost:$PORT"
( cd out && python3 -m http.server "$PORT" >/dev/null 2>&1 ) & SRV=$!; trap 'kill $SRV 2>/dev/null' EXIT; sleep 1.5
fail=0
run(){ local t="$1"; shift; local log="out/$t.log"; ( cd out && timeout 900 node "../tests/$t.js" "$@" ) >"$log" 2>&1; local rc=$?
  if [ $rc -ne 0 ] || grep -q "ERR" "$log"; then echo "FAIL $t (see $log)"; grep "ERR" "$log" | head -3; fail=1; else echo "ok   $t"; fi; }
for t in smoke upgrades allpro_bonus score_code fall_jump_keys no_webgl caves; do run $t; done
run sets_fit; if grep -q '"cut":[1-9]' out/sets_fit.log; then echo "FAIL sets_fit: a question set is cut off"; grep '"cut":[1-9]' out/sets_fit.log; fail=1; fi
if [ "${1:-}" = "full" ]; then run speed; run music_level dig_buds.html; run bot 4242 3500 0.85; run bot 31337 2500 0.95; tail -n 1 out/bot.log | cut -c1-300; fi
exit $fail
