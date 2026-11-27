#!/bin/bash
# Solve every room in parallel (one process per room, 4 at a time), then merge into solutions.json.
cd "$(dirname "$0")/.." && D=$(mktemp -d) && N=$(node -e "require('./rphys.js');require('./rlevel.js');console.log(LPROOMS.rooms.length)")
seq 0 $((N-1)) | xargs -P ${JOBS:-4} -I{} sh -c "SOLVE_OUT=$D/{}.json node --max-old-space-size=3000 tests/solve.js {} 2>&1 | grep -E '^(PASS|FAIL)'" | sort -t' ' -k3 -n
node -e "const fs=require('fs');const o=[];for(let i=0;i<$N;i++){try{const r=JSON.parse(fs.readFileSync('$D/'+i+'.json'));o[i]=r.s;}catch(e){o[i]=null;}}fs.writeFileSync('tests/solutions.json',JSON.stringify(o));console.log(o.filter(x=>!x).length?'MISSING '+o.map((x,i)=>x?'':i).filter(String).join(','):'ALL ROOMS SOLVED')"
