#!/bin/bash
# How forgiving is each room? For every room, the biggest "sloppiness" the robust solver still beats (0.5 .. 2).
# 1 = jumps/dashes +-3% and takeoff +-9 px. Below 1 = needs precise play (too hard for most of our students).
cd "$(dirname "$0")/.." && N=$(node -e "require('./rphys.js');require('./rlevel.js');console.log(LPROOMS.rooms.length)")
ROOMS=${ROOMS:-$(seq 0 $((N-1)))}
for i in $ROOMS; do echo $i; done | xargs -P ${JOBS:-4} -I{} sh -c 'best=0; for sp in 0.5 1 1.5 2; do r=$(LIMIT=${LIMIT:-60000} node --max-old-space-size=4500 tests/robust.js {} $sp); echo "$r" | grep -q "\"ok\":true" && best=$sp || break; done; n=$(echo "$r" | sed "s/.*\"name\":\"\([^\"]*\)\".*/\1/"); echo "{} $best $n"' | sort -n
