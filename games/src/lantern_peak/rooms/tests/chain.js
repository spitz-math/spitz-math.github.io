/* How many dashes in a row (in one air time) does each room demand? Kody found a room with a 3-dash chain "basically impossible".
   node tests/chain.js <room> -> one line. Springs count as landing only when the solver lands; embers don't reset it. */
const PATH=require('path'); require(PATH.join(__dirname,'../rphys.js')); require(PATH.join(__dirname,'../rlevel.js'));
const {solve,kit}=require('./solve.js'), RL=globalThis.LPROOMS; const i=+process.argv[2], def=RL.rooms[i], k=kit(def);
let need='-'; if(k.dash) for(const c of [1,2,3,4]){ if(solve(def,true,150000,{maxDash:k.maxDash,chain:c}).path){ need=c; break; } need='>4'; }
console.log(String(i).padStart(2)+' ch'+(def.ch+1)+' '+def.name.padEnd(22)+' dashes in a row: '+need);
