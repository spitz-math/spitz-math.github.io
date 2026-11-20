/* "Could a kid do it?" playtest. The solver tries each room again with a handicapped climber:
   level 1 (fair):  decides only every 0.13 s, jumps/dashes/runs 5% weaker, thorns 4 px fatter
   level 2 (easy):  decides only every 0.2 s,  jumps/dashes/runs 10% weaker, thorns 8 px fatter
   A room only the full-strength, frame-by-frame solver can beat needs tight timing and is too hard for our students.
   node tests/kidtest.js <room>  -> prints one JSON line   (tests/kidtest.sh runs every room in parallel) */
const PATH=require('path'); require(PATH.join(__dirname,'../rphys.js')); require(PATH.join(__dirname,'../rlevel.js'));
const L=globalThis.LPR, RL=globalThis.LPROOMS, {solve,kit,entryOf}=require('./solve.js');
const i=+process.argv[2], def=RL.rooms[i], k=kit(def), base=Object.assign({},L.PH);
function lvl(pow,pad,K){ Object.assign(L.PH,base); ['JV','WJV','DASHV','RUN','SPRINGV'].forEach(f=>L.PH[f]=base[f]*pow); L.PH.PAD=pad;
  const r=solve(def,k.dash,200000,{maxDash:k.maxDash,K}); const en=entryOf(def); const re=en?solve(def,k.dash,200000,{maxDash:k.maxDash,K,entry:en,jh:def.inFrom==='down'}):{path:1};
  return !!(r.path&&re.path); }
const o={i,name:def.name,ch:def.ch+1,l1:lvl(0.95,4,16),l2:lvl(0.90,8,24)};
let nd=null; if(k.dash&&!def.way&&!def.lantern){ Object.assign(L.PH,base); L.PH.PAD=0; nd=!!solve(def,false,60000,{maxDash:1}).path; }
o.noDashOk=nd; console.log(JSON.stringify(o));
