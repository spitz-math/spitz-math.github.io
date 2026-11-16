/* BLADEBOUND pixel art: hand-drawn maps. '.' = clear. mirror:true means the rows are the left half. */
var BB_PAL={ K:'#141026',
  S:'#B9C4DE', s:'#7C88AB', W:'#F2F6FF', G:'#FFC93C', g:'#C98A12', B:'#3D6BFF', b:'#2443B8', R:'#FF4B6B', r:'#B8243F', E:'#7DF5FF', D:'#1B1730', L:'#8A5A33', l:'#5A3A20',
  M:'#5BE88A', m:'#2FA85C', n:'#1C6E3E', H:'#C9FFD9',           /* slime greens */
  P:'#4A3A7A', p:'#B04DCF', q:'#2A2050', X:'#FF4B4B',           /* bat */
  O:'#EFE9DA', o:'#B8AE96', Y:'#FF9A3C',                         /* bone, ember */
  C:'#63E6FF', c:'#1E9CC8', V:'#E8FBFF',                         /* wisp */
  T:'#77839A', t:'#4C5668', U:'#A7B3C8', Z:'#6FA34A', z:'#3F6E2A',/* stone, moss */
  A:'#3B2466', a:'#241443', I:'#5B3A9A', J:'#B56BFF' };          /* gloom */
var BB_MAPS={
 heroF:{mirror:true,rows:[
 "........KK",
 ".......KRR",
 ".......KRR",
 "....KKKKRr",
 "...KWWSSSS",
 "..KWSSSSSS",
 ".KWSSSSSSS",
 ".KSSSSSSSS",
 ".KSSKKKKKK",
 ".KSKDDEEDD",
 ".KSKDDEEDD",
 ".KsSKKKKKK",
 ".KssSSSSGG",
 "..KKssssss",
 ".KBKKKKKKK",
 "KBBKSSSSGG",
 "KBBKsSSSGG",
 "KBbKsSSSSS",
 "KBbKKsssss",
 ".KbKLLLLGG",
 ".KKKKKKKKK",
 "...KsSSK..",
 "...KllLK..",
 "...KKKKK.."]},
 heroB:{mirror:true,rows:[
 "........KK",
 ".......KRR",
 ".......KRR",
 "....KKKKRr",
 "...KWWSSSS",
 "..KWSSSSSS",
 ".KWSSSSSSS",
 ".KSSSSSSSS",
 ".KSSSSSSSS",
 ".KSSSSSSSS",
 ".KsSSSSSSS",
 ".KssSSSSSS",
 ".KsssssGGG",
 "..KKKKKKKK",
 ".KBBBBBBBB",
 "KBBBBBBBBB",
 "KBBBBBBBBb",
 "KBBBBBBBbB",
 "KBbBBBBbBB",
 "KBbBBBbBBB",
 ".KbbBBbBBB",
 "..KKKKKKKK",
 "...KllLK..",
 "...KKKKK.."]},
 heroS:{rows:[
 "..........KK........",
 ".........KRRK.......",
 "........KRRrK.......",
 ".....KKKKKrKKK......",
 "....KWWSSSSSSSK.....",
 "...KWSSSSSSSSSSK....",
 "...KSSSSSSSSSSSK....",
 "...KSSSSSSSSSSSSK...",
 "...KSSSSSSKKKKKKK...",
 "...KSSSSSKDDEEDDK...",
 "...KSSSSSKDDEEDDK...",
 "...KsSSSSSKKKKKKK...",
 "...KssSSSSSSSGGK....",
 "....KKsssssssKK.....",
 "..KKBBKKKKKKK.......",
 ".KBBBBKSSSSGK.......",
 ".KBBBBKsSSSGK.......",
 "KBBBBbKsSSSSK.......",
 "KBBBbBKKssssK.......",
 "KBbBBbKLLLLGK.......",
 ".KKbbKKKKKKKK.......",
 "..KKKKsSSK..........",
 "......KllLKK........",
 "......KKKKKK........"]},
 slime:{mirror:true,rows:[
 "......KKKK",
 "....KKHHMM",
 "...KHHMMMM",
 "..KHWMMMMM",
 ".KHWWMMMMM",
 ".KHMMMMMMM",
 "KMMMMKKMMM",
 "KMMMMKWKMM",
 "KMMMMKKKMM",
 "KMMMMMMMMM",
 "KmMMMMMKMM",
 "KmMMMMMMKK",
 "KmmMMMMMMM",
 "KnmmmMMMmm",
 ".KnnmmmmmN",
 "..KKKKKKKK"]},
 batU:{mirror:true,rows:[
 ".K..........",
 "KPK......K..",
 "KPPK....KPK.",
 "KPpPKK..KPPK",
 "KPppPPKKPPPP",
 ".KPppPPPPXXP",
 ".KPpKPPPPPPP",
 "..KK.KPPPWPW",
 "......KPPPPP",
 ".......KPPPP",
 "........KKKK"]},
 batD:{mirror:true,rows:[
 "............",
 ".........K..",
 "........KPK.",
 "..KKKK..KPPK",
 ".KPPPPKKPPPP",
 "KPppPPPPPXXP",
 "KPpPKPPPPPPP",
 "KPPK.KPPPWPW",
 "KPK...KPPPPP",
 ".K.....KPPPP",
 "........KKKK"]},
 skel:{mirror:true,rows:[
 "....KKKKK",
 "..KKOOOOO",
 ".KOOOOOOO",
 ".KOOOOOOO",
 "KOOOOOOOO",
 "KOODDDOOO",
 "KOODXDOOK",
 "KoODDDOOK",
 ".KoOOOOOO",
 ".KoOKOKOK",
 "..KKKKKKK",
 ".......KO",
 "..KKKKKKO",
 ".KOKOOOKO",
 ".KoK.KKKO",
 ".KoKOOOKO",
 "..K..KKKO",
 "....KOOKO",
 "....KoK.K",
 "....KoK..",
 "....KoK..",
 "...KKooK."]},
 wisp:{mirror:true,rows:[
 "......K.",
 ".....KCK",
 ".....KCC",
 "....KCCV",
 "....KCVV",
 "...KCCVV",
 "..KCCVVV",
 "..KCVVVV",
 ".KCCVVVV",
 ".KCVKKVV",
 "KCCVKKVV",
 "KCCVVVVV",
 "KcCCVVVK",
 "KcCCCVVV",
 ".KcCCCCC",
 ".KccCCCC",
 "..KKcccc",
 "....KKKK"]},
 sword:{rows:[
 "..K..",
 ".KWK.",
 ".KWK.",
 ".KWsK",
 ".KWsK",
 ".KWsK",
 ".KWsK",
 ".KWsK",
 ".KWsK",
 ".KWsK",
 "KKKKK",
 "KGGgK",
 "KKKKK",
 ".KLK.",
 ".KLK.",
 ".KGK."]},
 shield:{rows:[
 "KKKKKKK",
 "KBBGBBK",
 "KBBGBBK",
 "KGGGGGK",
 "KbBGBbK",
 ".KbGbK.",
 "..KGK..",
 "...K..."]}
};
function bbMake(doc){ var out={};
  function cv(w,h){ var c=doc.createElement('canvas'); c.width=w; c.height=h; return c; }
  function fromMap(m){ var rows=m.rows.map(function(r){ return m.mirror? r+r.split('').reverse().join('') : r; }), w=rows[0].length, h=rows.length, c=cv(w,h), x=c.getContext('2d');
    rows.forEach(function(r,j){ for(var i=0;i<w;i++){ var ch=r[i]; if(ch==='.'||!BB_PAL[ch==='N'?'n':ch]) continue; x.fillStyle=BB_PAL[ch==='N'?'n':ch]; x.fillRect(i,j,1,1); } }); return c; }
  Object.keys(BB_MAPS).forEach(function(k){ out[k]=fromMap(BB_MAPS[k]); });
  /* walk frames: lift one boot */
  function walk(src,side){ var c=cv(src.width,src.height), x=c.getContext('2d'); x.drawImage(src,0,0); var h=src.height;
    if(side){ x.clearRect(0,h-3,src.width,3); x.drawImage(src,0,h-3,src.width,3,2,h-4,src.width,3); }
    else { var half=src.width/2; x.clearRect(0,h-3,half,3); x.drawImage(src,0,h-3,half,3,0,h-4,half,3); } return c; }
  out.heroF2=walk(out.heroF); out.heroB2=walk(out.heroB); out.heroS2=walk(out.heroS,true);
  /* boxes for the blocky ones */
  function box(x,X,Y,w,h,base,light,dark){ x.fillStyle=BB_PAL.K; x.fillRect(X,Y,w,h); x.fillStyle=base; x.fillRect(X+1,Y+1,w-2,h-2); x.fillStyle=light; x.fillRect(X+1,Y+1,w-2,1); x.fillRect(X+1,Y+1,1,h-2); x.fillStyle=dark; x.fillRect(X+1,Y+h-2,w-2,1); x.fillRect(X+w-2,Y+1,1,h-2); }
  function px(x,col,list){ x.fillStyle=col; list.forEach(function(p){ x.fillRect(p[0],p[1],p[2]||1,p[3]||1); }); }
  out.golem=(function(){ var c=cv(30,30), x=c.getContext('2d'), P=BB_PAL;
    box(x,1,12,7,13,P.T,P.U,P.t); box(x,22,12,7,13,P.T,P.U,P.t);          // arms
    box(x,0,22,8,7,P.T,P.U,P.t); box(x,22,22,8,7,P.T,P.U,P.t);            // fists
    box(x,8,24,6,6,P.t,P.T,'#333B4A'); box(x,16,24,6,6,P.t,P.T,'#333B4A'); // feet
    box(x,6,9,18,17,P.T,P.U,P.t);                                         // body
    box(x,8,1,14,11,P.T,P.U,P.t);                                         // head
    px(x,P.K,[[10,5,4,3],[16,5,4,3]]); px(x,P.Y,[[11,6,2,1],[17,6,2,1]]); px(x,'#FFE0A0',[[11,6],[17,6]]);
    px(x,P.K,[[12,9,6,1]]);
    px(x,P.Z,[[8,1,5,1],[9,2,3,1],[17,1,5,1],[6,9,4,1],[21,9,3,1],[1,12,3,1],[26,12,3,1]]); px(x,P.z,[[9,2,1,1],[18,2,2,1],[7,10,2,1]]);
    px(x,P.Y,[[14,14,2,1],[13,15,4,1],[14,16,2,3],[13,19,4,1]]); px(x,P.t,[[9,13,1,4],[10,16,2,1],[20,18,1,4],[19,21,1,2]]);
    return c; })();
  out.king=(function(){ var W=48,H=50,c=cv(W,H), x=c.getContext('2d'), P=BB_PAL, i,j;
    function inside(a,b){ var dx=(a-24)/19, dy=(b-24)/20; if(b<24) return dx*dx+dy*dy<=1;            // rounded hood
      var wv=44+Math.sin(a*0.9)*2.2; if(b>wv) return false; return Math.abs(a-24)<19+ (b-24)*0.12; }   // robe flares, ragged hem
    for(j=0;j<H;j++) for(i=0;i<W;i++){ if(!inside(i+.5,j+.5)) continue; var e=!inside(i-.5,j+.5)||!inside(i+1.5,j+.5)||!inside(i+.5,j-.5)||!inside(i+.5,j+1.5);
      var col=P.A; if(e) col=P.K; else if(i<12+ (j>24?0:Math.abs(j-24)*0.3)) col=P.I; else if(i>35) col=P.a; x.fillStyle=col; x.fillRect(i,j,1,1); }
    x.fillStyle='#0C0818'; x.beginPath(); x.ellipse(24,22,12,10,0,0,7); x.fill();                      // the dark inside the hood
    px(x,P.E,[[16,20,5,3],[27,20,5,3]]); px(x,P.V,[[17,20,2,1],[28,20,2,1]]); px(x,P.K,[[18,22,2,1],[29,22,2,1]]);
    px(x,P.J,[[20,27,8,1],[21,28,6,1]]);
    px(x,P.K,[[11,3,26,7]]); px(x,P.G,[[12,5,24,4]]); px(x,P.g,[[12,8,24,1]]);
    [12,18,24,30,35].forEach(function(cx0,k){ px(x,P.K,[[cx0-1,0,k===4?3:3,5]]); px(x,P.G,[[cx0,1,1,4]]); }); px(x,P.R,[[24,6,1,2],[18,6,1,2],[30,6,1,2]]);
    px(x,P.a,[[10,34,1,8],[16,36,1,8],[23,35,1,9],[30,36,1,8],[37,34,1,8]]); px(x,P.J,[[13,30,1,1],[34,31,1,1]]);
    return c; })();
  ['hoodF','hoodB'].forEach(function(k){ if(out[k]) out[k+'2']=walk(out[k]); }); if(out.hoodS) out.hoodS2=walk(out.hoodS,true);
  /* white copies for the hit blink */
  Object.keys(out).forEach(function(k){ var s=out[k], c=cv(s.width,s.height), x=c.getContext('2d'); x.drawImage(s,0,0); x.globalCompositeOperation='source-in'; x.fillStyle='#fff'; x.fillRect(0,0,s.width,s.height); out[k+'_w']=c; });
  return out; }
if(typeof module!=='undefined') module.exports={BB_PAL:BB_PAL,BB_MAPS:BB_MAPS,bbMake:bbMake};
