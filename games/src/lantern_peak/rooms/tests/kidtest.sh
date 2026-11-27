#!/bin/bash
# every room through tests/kidtest.js, 4 at a time; prints a table, ordered by room
cd "$(dirname "$0")/.." && N=$(node -e "require('./rphys.js');require('./rlevel.js');console.log(LPROOMS.rooms.length)")
seq 0 $((N-1)) | xargs -P ${JOBS:-4} -I{} node --max-old-space-size=3000 tests/kidtest.js {} | node -e "
let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const r=s.trim().split('\n').map(l=>JSON.parse(l)).sort((a,b)=>a.i-b.i);
r.forEach(o=>console.log(String(o.i).padStart(2)+' ch'+o.ch+' '+o.name.padEnd(22)+' '+(o.l2?'EASY  ':o.l1?'FAIR  ':'TIGHT ')+(o.noDashOk?'(no dash needed)':'')));});"
