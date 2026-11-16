#!/bin/bash
# bash tests/stress_batch.sh  -> out/stress/batch.log (one JSON line per run), 3 runs at a time
cd "$(dirname "$0")/.."; L=out/stress/batch.log; : > $L
cat <<CFG | xargs -P 3 -L 1 sh -c 'timeout 900 node tests/stress.js "$@" >> out/stress/batch.log 2>&1' _
storm e 1 0.85 0 slope s1
blade w 1 0.85 0 slope s2
bulwark e 1 0.85 0 mult s3
pure w 1 0.85 0 solve s4
boom e 1 0.85 0 evalf s5
storm w 1 0.85 0 mult s6
blade e 1 0.85 0 int s7
bulwark w 1 0.85 0 stdform s8
pure e 1 0.85 0 mult s9
boom w 1 0.85 0 slope s10
storm e 0 0.5 0 slope s11
blade w 0 0.5 0 mult s12
bulwark e 0 0.5 0 slope s13
storm w 0 0 0 slope s14
blade e 1 0 0 mult s15
storm e 1 0.85 3 slope s16
blade w 1 0.85 3 mult s17
bulwark e 1 0.85 3 slope s18
boom w 1 0.85 2 mult s19
pure e 1 0.7 2 slope s20
storm w 1 0.85 1 mult s21
blade e 1 0.85 1 slope s22
storm e 1 1 0 mult s23
blade w 1 1 0 slope s24
CFG
echo DONE >> $L
