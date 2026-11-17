#!/bin/bash
# Rook & Ruin: build, then run the regression suite.
#   bash run_tests.sh          quick suite (about 4 minutes)
#   bash run_tests.sh full     + speed at 6x CPU slowdown, 3 runs back to back, 3 full bot runs
#   bash run_tests.sh stress   + 24 full bot runs across builds, skill levels, question sets and reloads (about 25 minutes)
cd "$(dirname "$0")"; python3 build.py >/dev/null || exit 1; O=$PWD/out; mkdir -p $O/tour $O/gal $O/stress; fail=0
run(){ r=$(timeout ${2:-400} node tests/$1.js $O 2>&1); e=$(echo "$r" | grep -o 'errors \[.*\]' | tail -1)
  if [ "$e" = "errors []" ]; then echo "PASS $1"; else echo "FAIL $1"; echo "$r" | tail -5; fail=1; fi; }
for t in t9 t_rapid t_chest t_v17b t_endskip t_q21 t_up18 t_art14 t_pots t_lsw t_layout t_final t_golive t_sets t_flow t_read t_sys t_audio; do run $t; done
if [ "$1" = "full" ] || [ "$1" = "stress" ]; then run t_perf; run t_soak 900
  for a in "storm e 1" "blade w 1" "bulwark e 1"; do set -- $a "$1"
    timeout 600 node tests/t7.js $O $1 $2 $3 0.85 2>/dev/null | python3 -c "
import sys,json; t=sys.stdin.read(); j=json.loads(t[:t.rindex('}')+1]); print('BOT $1 $2:','WIN' if j['win'] else 'lost in '+j['room'],'at',j['time'],'s, questions',j['answered'],', rooms',[l[5:].split(' ')[0] for l in j['log'] if l.startswith('room')])"; set -- "$4"; done; fi
if [ "$1" = "stress" ]; then bash tests/stress_batch.sh; python3 tests/stress_report.py | tail -30; fi
exit $fail
