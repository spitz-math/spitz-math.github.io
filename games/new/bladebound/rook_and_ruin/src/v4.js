(function(){
 function mir(r){ return r+r.split('').reverse().join(''); }
 function flip(r){ return r.split('').reverse().join(''); }
 var lowF=BB_MAPS.hoodF.rows.slice(14).map(mir);
 var topF=[
 "....................",
 "......KKKKKKKK......",
 "....KKiiRRRRRRKKK...",
 "...KiiRRRRRRRRRRRK..",
 "..KiRRRRRRRRRRRRRRK.",
 ".KiRRRRRRRRRRRRRRRK.",
 ".KiRRRRRRRRRRRRRRRK.",
 ".KRRRKKKKKKKKKKRRRK.",
 ".KRRKDDDDDDDDDDKRRK.",
 ".KRrKDEEDDDDEEDKrRK.",
 ".KRrKDEEDDDDEEDKrRK.",
 ".KRrKDDDDDDDDDDKrRK.",
 ".KRRrKDDDDDDDDKrRRK.",
 "..KRRrKKKKKKKKrRRK.."];
 BB_MAPS.hoodF={rows:topF.concat(lowF)};
 var back=topF.slice(0,7).map(flip).concat([
 ".KRRRRRRRRRRRRRRRRK.",
 ".KRRRRRRRRRRRRRRRRK.",
 ".KRRRRRRRRRRRRRRRRK.",
 ".KRRRRRRRRRRRRRRRRK.",
 ".KRrRRRRRRRRRRRRrRK.",
 ".KRRrrRRRRRRRRrrRRK.",
 "..KRRrrrrrrrrrrRRK..",
 "..KKKrrrrrrrrrrKKK..",
 ".KRRRRRRRRRRRRRRRRK.",
 "KiRRRRRRRRRRRRRRRRRK",
 "KiRRRRRRRRRRRRRRRRRK",
 "KRRrRRRRRRRRRRRRrRRK",
 "KRRrRRrRRRRRRrRRrRRK",
 "KRrrRRrRRRRRRrRRrrRK",
 ".KrrRrrRRrrRRrrRrrK.",
 ".KKKKllLKKKKLllKKKK.",
 "....KKKKK..KKKKK...."]).map(function(r){ return r.split(''); });
 function put(x,y,ch){ if(back[y]&&x>=0&&x<20) back[y][x]=ch; }
 /* a sheathed sword slung across the back */
 for(var t=0;t<9;t++){ var x=6+t, y=15+Math.round(t*0.7); put(x,y,'L'); put(x+1,y,'l'); put(x,y+1,'l'); }
 put(15,21,'G'); put(5,14,'S'); put(4,13,'S'); put(3,12,'G'); put(4,15,'G'); put(6,13,'G'); put(5,15,'K'); put(6,14,'K');
 BB_MAPS.hoodB={rows:back.map(function(r){ return r.join(''); })};
 var s=BB_MAPS.hoodS.rows.slice();
 s.splice(0,7,
 "....................",
 "........KKKKKK......",
 "......KKiiRRRRKK....",
 ".....KiiRRRRRRRRK...",
 "....KiRRRRRRRRRRRK..",
 "....KRRRRRRRRRRRRK..",
 "....KRRRRRRRRRRRRK..");
 BB_MAPS.hoodS={rows:s};
})();
