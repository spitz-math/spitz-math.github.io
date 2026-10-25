/* Spitz Arcade shared question sets.
   Every solo game loads this file. A game asks SpitzQ.forGame(prefix) for its questions,
   and the hub link picks the set and topics:  game.html?set=slope&topics=write,slope
   The first five sets started as the generator code in Hoop Buds, Splat Range and Shift Racer (now kept in tools/sets/).
   Every answer is checked independently before it is shown. */
(function(){
'use strict';

function makeMult(PFX){
  var MINUS='−';
  function gcd(a,b){ a=Math.abs(a); b=Math.abs(b); while(b){ var t=a%b; a=b; b=t; } return a; }
  function R(n,d){ if(d<0){ n=-n; d=-d; } var g=gcd(n,d)||1; return {n:n/g,d:d/g}; }
  function ri(a,b){ return a+Math.floor(Math.random()*(b-a+1)); }
  function nz(a,b){ var v; do{ v=ri(a,b); }while(v===0); return v; }
  function pick(a){ return a[Math.floor(Math.random()*a.length)]; }
  function num(n){ return n<0? MINUS+(-n) : ''+n; }
  function frac(n,d){ return '<span class="'+PFX+'-fr"><span>'+n+'</span><span>'+d+'</span></span>'; }
  function fmtR(r){ if(r.d===1) return num(r.n); return (r.n<0?MINUS:'')+frac(Math.abs(r.n),r.d); }
  function coef(r,v){ if(r.d===1&&r.n===1) return v; if(r.d===1&&r.n===-1) return MINUS+v; return fmtR(r)+v; }
  function pt(x,y){ return '('+num(x)+', '+num(y)+')'; }
  function sgn(v){ return v>0? ' + '+v : v<0? ' '+MINUS+' '+(-v) : ''; }
  function psStr(m,h,k){ var c=(m.d===1&&m.n===1)?'':(m.d===1&&m.n===-1)?MINUS:fmtR(m); return 'y'+sgn(-k)+' = '+c+'(x'+sgn(-h)+')'; }
  function siStr(m,b){ return 'y = '+coef(m,'x')+sgn(b); }
  function stdNorm(A,B,C){ var g=gcd(gcd(A,B),C)||1; A/=g; B/=g; C/=g; if(A<0||(A===0&&B<0)){ A=-A; B=-B; C=-C; } return {A:A,B:B,C:C}; }
  function stdStr(L){ var a=L.A===1?'x':L.A===-1?MINUS+'x':num(L.A)+'x';
    var b=L.B===1?' + y':L.B===-1?' '+MINUS+' y':L.B>0?' + '+L.B+'y':' '+MINUS+' '+(-L.B)+'y'; return a+b+' = '+num(L.C); }
  function linePS(m,h,k){ return {A:-m.n,B:m.d,C:m.d*k-m.n*h}; }          // y-k=m(x-h)  ->  -p x + q y = qk - ph
  function lineSI(m,b){ return {A:-m.n,B:m.d,C:m.d*b}; }
  function sameLine(a,b){ return a.A*b.B===b.A*a.B && a.A*b.C===b.A*a.C && a.B*b.C===b.B*a.C; }
  function onLine(L,x,y){ return L.A*x+L.B*y===L.C; }
  function eq(h){ return '<span class="'+PFX+'-eq">'+h+'</span>'; }
  function M(r){ return '<span class="c-m">'+fmtR(r)+'</span>'; }
  function P(x,y){ return '<span class="c-pt">'+pt(x,y)+'</span>'; }
  var SLOPES=[2,-2,3,-3,4,-4,5,-5].map(function(n){ return R(n,1); }).concat(
    [[1,2],[-1,2],[1,3],[-1,3],[2,3],[-2,3],[3,2],[-3,2],[3,4],[-3,4]].map(function(a){ return R(a[0],a[1]); }));
  function C(html,val,why){ return {html:html,val:val,why:why||'',key:html}; }
  function rEq(a,b){ return a.n*b.d===b.n*a.d; }
  function siRev(m,b){ var a=R(Math.abs(m.n),m.d); return 'y = '+num(b)+(m.n>0?' + ':' '+MINUS+' ')+coef(a,'x'); }   // y = 4 − 3x
  function B(v){ return '<span class="c-b">'+v+'</span>'; }
  
  /* ================= QUESTION GENERATOR: multiplication facts 0–12 =================
     Facts are grouped by their smaller factor, so the end screen shows which tables need work. */
  var GROUPS={ 'Facts 0–3':[0,3], 'Facts 4–6':[4,6], 'Facts 7–9':[7,9], 'Facts 10–12':[10,12] };
  function fact(a,b){ return a+' × '+b; }
  /* three wrong answers in plausibility order, with a random number of them below the answer: the choices are
     sorted smallest to largest, so this keeps the right answer from always landing in the same spot */
  function spread(ans,cand){ var lo=[], hi=[], seen={}; seen[ans]=1;
    cand.forEach(function(c){ if(c[0]<0||seen[c[0]]) return; seen[c[0]]=1; (c[0]<ans?lo:hi).push(c); });
    var k=Math.floor(Math.random()*4), out=lo.slice(0,k); out=out.concat(hi.slice(0,3-out.length)); return out.concat(lo.slice(k,k+3-out.length)); }
  function mulQ(topic){ var g=GROUPS[topic], s=ri(g[0],g[1]), o=ri(s,12), flip=Math.random()<0.5, a=flip?o:s, b=flip?s:o, ans=a*b;
    var near=[[a*(b+1),'That is '+fact(a,b+1)+'.'],[(a+1)*b,'That is '+fact(a+1,b)+'.']]; if(b>0) near.push([a*(b-1),'That is '+fact(a,b-1)+'.']); if(a>0) near.push([(a-1)*b,'That is '+fact(a-1,b)+'.']);
    near.sort(function(){ return Math.random()-0.5; });
    var special=a===0||b===0||a===1||b===1, addWhy=(a===0||b===0)?'Anything times 0 is 0.':(a===1||b===1)?'Anything times 1 stays the same.':'You added. '+fact(a,b)+' means '+a+' groups of '+b+'.';
    var cand=(special||Math.random()<0.5)? [[a+b,addWhy]].concat(near) : near.concat([[a+b,addWhy]]), skip=(a===0||b===0)? addWhy : 'Skip-count by '+Math.max(a,b)+', '+Math.min(a,b)+' times.';
    cand=cand.concat([[ans+10,skip],[ans-10,skip],[ans+2,skip],[ans-2,skip],[ans+1,skip],[ans-1,skip]]);
    var ch=[C(''+ans,ans)].concat(spread(ans,cand).map(function(c){ return C(''+c[0],c[0],c[1]); }));
    return { topic:topic, prompt:eq(fact(a,b)+' = ?'), data:{a:a,b:b}, choices:ch, explain:eq(fact(a,b)+' = <span class="c-ans">'+ans+'</span>'),
      check:function(v){ var t=0; for(var i=0;i<a;i++) t+=b; return v===t; } }; }                      /* repeated addition, separate from a*b */
  var GEN={}; Object.keys(GROUPS).forEach(function(t){ GEN[t]=function(){ return mulQ(t); }; });
  var BAG=['Facts 0–3','Facts 4–6','Facts 4–6','Facts 7–9','Facts 7–9','Facts 7–9','Facts 10–12','Facts 10–12'];
  function build(type){ for(var tries=0;tries<400;tries++){ var q=GEN[type](); if(!q||q.choices.length!==4) continue;
      if(!q.check(q.choices[0].val)) continue;                                                  // the answer must pass the independent check
      if(q.choices.slice(1).some(function(c){ return q.check(c.val); })) continue;              // and no distractor may pass it
      q.type=type; q.choices.forEach(function(c,i){ c.ok=i===0; }); q.choices.sort(function(x,y){ return x.val-y.val; });   // smallest to largest, quick to scan
      q.visual=''; delete q.check; return q; } throw new Error('generator failed: '+type); }
  var topicBag=[], lastFact='';
  return { build:build }; }

function makeLinear(PFX){
  var MINUS='−';
  function gcd(a,b){ a=Math.abs(a); b=Math.abs(b); while(b){ var t=a%b; a=b; b=t; } return a; }
  function R(n,d){ if(d<0){ n=-n; d=-d; } var g=gcd(n,d)||1; return {n:n/g,d:d/g}; }
  function ri(a,b){ return a+Math.floor(Math.random()*(b-a+1)); }
  function nz(a,b){ var v; do{ v=ri(a,b); }while(v===0); return v; }
  function pick(a){ return a[Math.floor(Math.random()*a.length)]; }
  function num(n){ return n<0? MINUS+(-n) : ''+n; }
  function frac(n,d){ return '<span class="'+PFX+'-fr"><span>'+n+'</span><span>'+d+'</span></span>'; }
  function fmtR(r){ if(r.d===1) return num(r.n); return (r.n<0?MINUS:'')+frac(Math.abs(r.n),r.d); }
  function coef(r,v){ if(r.d===1&&r.n===1) return v; if(r.d===1&&r.n===-1) return MINUS+v; return fmtR(r)+v; }
  function pt(x,y){ return '('+num(x)+', '+num(y)+')'; }
  function sgn(v){ return v>0? ' + '+v : v<0? ' '+MINUS+' '+(-v) : ''; }
  function psStr(m,h,k){ var c=(m.d===1&&m.n===1)?'':(m.d===1&&m.n===-1)?MINUS:fmtR(m); return 'y'+sgn(-k)+' = '+c+'(x'+sgn(-h)+')'; }
  function siStr(m,b){ return 'y = '+coef(m,'x')+sgn(b); }
  function stdNorm(A,B,C){ var g=gcd(gcd(A,B),C)||1; A/=g; B/=g; C/=g; if(A<0||(A===0&&B<0)){ A=-A; B=-B; C=-C; } return {A:A,B:B,C:C}; }
  function stdStr(L){ var a=L.A===1?'x':L.A===-1?MINUS+'x':num(L.A)+'x';
    var b=L.B===1?' + y':L.B===-1?' '+MINUS+' y':L.B>0?' + '+L.B+'y':' '+MINUS+' '+(-L.B)+'y'; return a+b+' = '+num(L.C); }
  function linePS(m,h,k){ return {A:-m.n,B:m.d,C:m.d*k-m.n*h}; }          // y-k=m(x-h)  ->  -p x + q y = qk - ph
  function lineSI(m,b){ return {A:-m.n,B:m.d,C:m.d*b}; }
  function sameLine(a,b){ return a.A*b.B===b.A*a.B && a.A*b.C===b.A*a.C && a.B*b.C===b.B*a.C; }
  function onLine(L,x,y){ return L.A*x+L.B*y===L.C; }
  function eq(h){ return '<span class="'+PFX+'-eq">'+h+'</span>'; }
  function M(r){ return '<span class="c-m">'+fmtR(r)+'</span>'; }
  function P(x,y){ return '<span class="c-pt">'+pt(x,y)+'</span>'; }
  var SLOPES=[2,-2,3,-3,4,-4,5,-5].map(function(n){ return R(n,1); }).concat(
    [[1,2],[-1,2],[1,3],[-1,3],[2,3],[-2,3],[3,2],[-3,2],[3,4],[-3,4]].map(function(a){ return R(a[0],a[1]); }));
  function C(html,val,why){ return {html:html,val:val,why:why||'',key:html}; }
  function rEq(a,b){ return a.n*b.d===b.n*a.d; }
  function siRev(m,b){ var a=R(Math.abs(m.n),m.d); return 'y = '+num(b)+(m.n>0?' + ':' '+MINUS+' ')+coef(a,'x'); }   // y = 4 − 3x
  function B(v){ return '<span class="c-b">'+v+'</span>'; }
  
  /* graph: window −6..6, red line (lesson color), lemon dots for marked points */
  function graphSVG(g){ var S=380, u=S/12, X=function(x){ return ((x+6)*u).toFixed(1); }, Y=function(y){ return ((6-y)*u).toFixed(1); }, h='';
    for(var i=-6;i<=6;i++){ h+='<line x1="'+X(i)+'" y1="0" x2="'+X(i)+'" y2="'+S+'" stroke="#2A3142" stroke-width="2"/><line x1="0" y1="'+Y(i)+'" x2="'+S+'" y2="'+Y(i)+'" stroke="#2A3142" stroke-width="2"/>'; }
    h+='<line x1="0" y1="'+Y(0)+'" x2="'+S+'" y2="'+Y(0)+'" stroke="#C9D1E0" stroke-width="3"/><line x1="'+X(0)+'" y1="0" x2="'+X(0)+'" y2="'+S+'" stroke="#C9D1E0" stroke-width="3"/>';
    [-4,-2,2,4].forEach(function(n){ h+='<text x="'+X(n)+'" y="'+(+Y(0)+24)+'" text-anchor="middle" font-size="20" font-weight="800" fill="#9BA5B8" font-family="Inter,sans-serif">'+num(n)+'</text>'+
      '<text x="'+(+X(0)-8)+'" y="'+(+Y(n)+7)+'" text-anchor="end" font-size="20" font-weight="800" fill="#9BA5B8" font-family="Inter,sans-serif">'+num(n)+'</text>'; });
    h+='<text x="'+(S-8)+'" y="'+(+Y(0)-10)+'" text-anchor="end" font-size="22" font-weight="800" fill="#C9D1E0" font-family="Inter,sans-serif">x</text><text x="'+(+X(0)+10)+'" y="22" font-size="22" font-weight="800" fill="#C9D1E0" font-family="Inter,sans-serif">y</text>';
    var x1,y1,x2,y2;
    if(g.h!==undefined){ x1=-7; x2=7; y1=y2=g.h; } else if(g.v!==undefined){ y1=-7; y2=7; x1=x2=g.v; }
    else { x1=-7; x2=7; y1=g.b+g.m.n*x1/g.m.d; y2=g.b+g.m.n*x2/g.m.d; }
    h+='<line x1="'+X(x1)+'" y1="'+Y(y1)+'" x2="'+X(x2)+'" y2="'+Y(y2)+'" stroke="#FF4B4B" stroke-width="6" stroke-linecap="round"/>';
    (g.dots||[]).forEach(function(p){ h+='<circle cx="'+X(p[0])+'" cy="'+Y(p[1])+'" r="9" fill="#FFF04D" stroke="#0E1016" stroke-width="3"/>'; });
    return '<svg class="'+PFX+'-graph" width="'+S+'" height="'+S+'" viewBox="0 0 '+S+' '+S+'" role="img" aria-label="Graph of a line">'+h+'</svg>'; }
  
  /* ================= QUESTION GENERATORS =================
     Each returns {topic,prompt,visual,choices[0]=correct,explain,data,check}. check(val) is an independent
     test of whether a choice is right; the build step rejects any question where a distractor also passes. */
  var GEN={
  siSlope:function(){ var m=pick(SLOPES), b=nz(-9,9), rev=Math.random()<0.3, e=rev?siRev(m,b):siStr(m,b);
    return { topic:'Slope-intercept form', prompt:'What is the <span class="c-m">slope</span> of '+eq(e)+'?', data:{m:m,b:b},
      check:function(v){ return v.n!==undefined && rEq(v,R((b+m.n)-b,m.d)); },        /* rise from (0,b) to (d, b+n) over run d */
      choices:[ C(fmtR(m),m), C(num(b),R(b,1),'That is b, the y-intercept. The slope is the number multiplied by x.'),
        C(fmtR(R(-m.n,m.d)),R(-m.n,m.d),'Keep the sign in front of x: it is '+(m.n>0?'+':MINUS)+', so the slope is '+(m.n>0?'positive':'negative')+'.'),
        C(fmtR(R(m.d,m.n)),R(m.d,m.n),'Don’t flip it. The slope is the x-coefficient exactly as written.') ],
      explain:'In y = mx + b, the slope m is the number with x: '+M(m)+'.' }; },
  siYInt:function(){ var m=pick(SLOPES), b=nz(-9,9), rev=Math.random()<0.3, e=rev?siRev(m,b):siStr(m,b); if(Math.abs(b)===Math.abs(m.n)&&m.d===1) return null;
    return { topic:'Slope-intercept form', prompt:'What is the <span class="c-b">y-intercept</span> of '+eq(e)+'?', data:{m:m,b:b},
      check:function(v){ return v.n!==undefined && rEq(v,R(m.n*0+b*m.d,m.d)); },      /* y when x = 0 */
      choices:[ C(num(b),R(b,1)), C(fmtR(m),m,'That is the slope, m. The y-intercept is b, the number without x.'),
        C(num(-b),R(-b,1),'Keep b’s sign: '+eq(e)+' has b = '+num(b)+'.'),
        C(fmtR(R(-m.n,m.d)),R(-m.n,m.d),'That comes from the slope. The y-intercept is the constant, the number without x.') ],
      explain:'In y = mx + b, b is the number without x. The y-intercept is '+B(num(b))+', the point '+P(0,b)+'.' }; },
  siBuild:function(){ var m=pick(SLOPES), b=nz(-9,9); if(m.d===1&&Math.abs(m.n)===Math.abs(b)) return null;
    var bad1=m.d===1? siStr(R(b,1),m.n) : null; if(!bad1) return null;
    return { topic:'Slope-intercept form', prompt:'Which equation has slope '+M(m)+' and y-intercept '+B(num(b))+'?', data:{m:m,b:b},
      check:function(v){ return v.A!==undefined && onLine(v,0,b) && onLine(v,m.d,b+m.n); },
      choices:[ C(siStr(m,b),lineSI(m,b)), C(bad1,lineSI(R(b,1),m.n),'Swapped. The slope goes with x and the y-intercept stands alone: y = mx + b.'),
        C(siStr(m,-b),lineSI(m,-b),'Check b’s sign: the y-intercept is '+num(b)+'.'),
        C(siStr(R(-m.n,m.d),b),lineSI(R(-m.n,m.d),b),'Check the slope’s sign: it is '+num(m.n)+'.') ],
      explain:'Put m with x and b by itself: '+eq(siStr(m,b))+'.' }; },
  graphSlope:function(){ var a=nz(-5,5), b=nz(-5,5); if(Math.abs(a)===Math.abs(b)) return null; var m=R(b,-a);
    return { topic:'Graphs', prompt:'What is the <span class="c-m">slope</span> of the line?', visual:graphSVG({m:m,b:b,dots:[[a,0],[0,b]]}), data:{a:a,b:b},
      check:function(v){ return v.n!==undefined && rEq(v,R(b-0,0-a)); },
      choices:[ C(fmtR(m),m), C(fmtR(R(-m.n,m.d)),R(-m.n,m.d),m.n>0?'The line goes uphill left to right, so the slope is positive.':'The line goes downhill left to right, so the slope is negative.'),
        C(fmtR(R(m.d,m.n)),R(m.d,m.n),'That is run over rise. Count up or down first (rise), then over (run).'),
        C(fmtR(R(-m.d,m.n)),R(-m.d,m.n),'Flipped and the wrong sign. Rise over run, and check uphill or downhill.') ],
      explain:'From one dot to the other: rise '+num(Math.abs(b)*(m.n>0?1:-1))+', run '+Math.abs(a)+'. Slope = '+M(m)+'.' }; },
  graphYInt:function(){ var a=nz(-5,5), b=nz(-5,5); if(Math.abs(a)===Math.abs(b)) return null; var m=R(b,-a), L=lineSI(m,b);
    return { topic:'Graphs', prompt:'What is the <span class="c-b">y-intercept</span>?', visual:graphSVG({m:m,b:b}), data:{a:a,b:b},
      check:function(v){ return v.x===0 && onLine(L,v.x,v.y); },
      choices:[ C(pt(0,b),{x:0,y:b}), C(pt(b,0),{x:b,y:0},'That point is on the x-axis. The y-intercept is where the line crosses the y-axis: (0, y).'),
        C(pt(0,-b),{x:0,y:-b},'Check the sign: the line crosses the y-axis '+(b>0?'above':'below')+' the origin.'),
        C(pt(a,0),{x:a,y:0},'That is where the line crosses the x-axis, the x-intercept.') ],
      explain:'The line crosses the y-axis at '+B(pt(0,b))+'.' }; },
  graphXInt:function(){ var a=nz(-5,5), b=nz(-5,5); if(Math.abs(a)===Math.abs(b)) return null; var m=R(b,-a), L=lineSI(m,b);
    return { topic:'Graphs', prompt:'What is the <span class="c-x">x-intercept</span>?', visual:graphSVG({m:m,b:b}), data:{a:a,b:b},
      check:function(v){ return v.y===0 && onLine(L,v.x,v.y); },
      choices:[ C(pt(a,0),{x:a,y:0}), C(pt(0,a),{x:0,y:a},'That point is on the y-axis. The x-intercept is where the line crosses the x-axis: (x, 0).'),
        C(pt(-a,0),{x:-a,y:0},'Check the sign: the line crosses the x-axis '+(a>0?'right':'left')+' of the origin.'),
        C(pt(0,b),{x:0,y:b},'That is where the line crosses the y-axis, the y-intercept.') ],
      explain:'The line crosses the x-axis at <span class="c-x">'+pt(a,0)+'</span>.' }; },
  hvType:function(){ var hz=Math.random()<0.5, c=nz(-9,9), e=(hz?'y':'x')+' = '+num(c);
    var HOY='HOY: y = a number is Horizontal with 0 slope.', VUX='VUX: x = a number is Vertical with Undefined slope.';
    var opts=[['Horizontal, slope 0','H0'],['Vertical, undefined slope','VU'],['Horizontal, undefined slope','HU'],['Vertical, slope 0','V0']];
    var why=hz? {VU:'That is VUX. '+HOY, HU:'Right direction, wrong slope. '+HOY, V0:'Right slope, wrong direction. '+HOY}
              : {H0:'That is HOY. '+VUX, V0:'Right direction, wrong slope. '+VUX, HU:'Right slope, wrong direction. '+VUX};
    var ok=hz?'H0':'VU', ch=[C(opts.filter(function(o){ return o[1]===ok; })[0][0],{hv:ok})];
    opts.forEach(function(o){ if(o[1]!==ok) ch.push(C(o[0],{hv:o[1]},why[o[1]])); });
    return { topic:'HOY & VUX', prompt:'Describe the line '+eq(e)+'.', data:{hz:hz}, check:function(v){ return v.hv===(e.charAt(0)==='y'?'H0':'VU'); }, choices:ch,
      explain: hz? HOY.replace('HOY:','<b>HOY</b>:') : VUX.replace('VUX:','<b>VUX</b>:') }; },
  hvGraph:function(){ var hz=Math.random()<0.5, c=nz(-5,5), v=hz?'y':'x', o=hz?'x':'y';
    return { topic:'HOY & VUX', prompt:'Which equation matches the line?', visual:graphSVG(hz?{h:c}:{v:c}), data:{hz:hz,c:c},
      check:function(val){ return val.e===(hz?'y':'x') && val.c===c && !val.s; },
      choices:[ C(v+' = '+num(c),{e:v,c:c}), C(o+' = '+num(c),{e:o,c:c},hz?'x = a number is a vertical line (VUX). This line is horizontal: y = a number.':'y = a number is a horizontal line (HOY). This line is vertical: x = a number.'),
        C(v+' = '+num(-c),{e:v,c:-c},'Check the sign: the line is '+(hz?(c>0?'above':'below')+' the x-axis':(c>0?'right':'left')+' of the y-axis')+'.'),
        C('y = '+coef(R(c,1),'x'),{e:'y',c:c,s:1},'y = '+coef(R(c,1),'x')+' is slanted. A '+(hz?'horizontal line has no x-term: y = a number.':'vertical line is x = a number.')) ],
      explain: hz? '<b>HOY</b>: a horizontal line is y = a number. Every point has y = '+num(c)+', so '+eq('y = '+num(c))+'.' : '<b>VUX</b>: a vertical line is x = a number. Every point has x = '+num(c)+', so '+eq('x = '+num(c))+'.' }; },
  psWrite:function(){ var m=pick(SLOPES), h=nz(-9,9), k=nz(-9,9); if(Math.abs(h)===Math.abs(k)) return null;
    return { topic:'Point-slope form', prompt:'Write the line through '+P(h,k)+' with slope '+M(m)+' in point-slope form.', data:{m:m,h:h,k:k},
      check:function(v){ return v.A!==undefined && onLine(v,h,k) && onLine(v,h+m.d,k+m.n); },
      choices:[ C(psStr(m,h,k),linePS(m,h,k)), C(psStr(m,-h,-k),linePS(m,-h,-k),'Both signs flipped. The form subtracts the point: y − y₁ = m(x − x₁).'),
        C(psStr(m,k,h),linePS(m,k,h),'x and y are swapped. The x-coordinate goes with x and the y-coordinate goes with y.'),
        C(psStr(m,-h,k),linePS(m,-h,k),'The x sign is off. x₁ = '+num(h)+', so it is (x'+sgn(-h)+').') ],
      explain:'y − y₁ = m(x − x₁) with x₁ = '+num(h)+' and y₁ = '+num(k)+': '+eq(psStr(m,h,k))+'.' }; },
  psPoint:function(){ var m=pick(SLOPES), h=nz(-9,9), k=nz(-9,9); if(Math.abs(h)===Math.abs(k)) return null; var L=linePS(m,h,k);
    return { topic:'Point-slope form', prompt:'What <span class="c-pt">point</span> does '+eq(psStr(m,h,k))+' use?', data:{m:m,h:h,k:k},
      check:function(v){ return v.x===h && v.y===k && onLine(L,v.x,v.y); },
      choices:[ C(pt(h,k),{x:h,y:k}), C(pt(-h,-k),{x:-h,y:-k},'Those are the numbers with the signs as written. The form subtracts, so switch both signs.'),
        C(pt(-h,k),{x:-h,y:k},'Switch the x sign too: x'+sgn(-h)+' means x₁ = '+num(h)+'.'),
        C(pt(h,-k),{x:h,y:-k},'Switch the y sign too: y'+sgn(-k)+' means y₁ = '+num(k)+'.') ],
      explain:'y − y₁ = m(x − x₁): switch the signs you see. The point is '+P(h,k)+'.' }; },
  psSlope:function(){ var m=pick(SLOPES), h=nz(-9,9), k=nz(-9,9); if(Math.abs(h)===Math.abs(k)) return null;
    return { topic:'Point-slope form', prompt:'What is the <span class="c-m">slope</span> of '+eq(psStr(m,h,k))+'?', data:{m:m,h:h,k:k},
      check:function(v){ return v.n!==undefined && rEq(v,R((k+m.n)-k,(h+m.d)-h)); },
      choices:[ C(fmtR(m),m), C(fmtR(R(-m.n,m.d)),R(-m.n,m.d),'Keep the sign in front of the parentheses: the slope is '+(m.n>0?'positive':'negative')+'.'),
        C(num(k),R(k,1),'That is y₁, part of the point. The slope is the number in front of the parentheses.'),
        C(num(-h),R(-h,1),'That number is inside the parentheses, so it belongs to the point. The slope is in front.') ],
      explain:'In y − y₁ = m(x − x₁), the slope m is the number in front of the parentheses: '+M(m)+'.' }; },
  slopeHV:function(){ var hz=Math.random()<0.5, c=nz(-9,9); if(Math.abs(c)===1) return null;
    var z=C('0',{hv:'0'}, 'This line is vertical. VUX: Vertical, Undefined slope, X = a number.'),
        u=C('Undefined',{hv:'u'},'This line is horizontal. HOY: Horizontal, 0 slope, Y = a number.'),
        n=C(num(c),{hv:'c'},'The '+num(c)+' tells where the line crosses the '+(hz?'y':'x')+'-axis, not its slope.'),
        o=C('1',{hv:'1'},hz? 'There is no x-term, so nothing gives a slope of 1. HOY: Horizontal, 0 slope.' : 'x = a number is a vertical line, not y = 1x. VUX: Vertical, Undefined slope.');
    return { topic:'HOY & VUX', prompt:'What is the <span class="c-m">slope</span> of '+eq((hz?'y':'x')+' = '+num(c))+'?', data:{hz:hz},
      check:function(v){ return v.hv===(hz?'0':'u'); },
      choices: hz? [C('0',{hv:'0'}),u,n,o] : [C('Undefined',{hv:'u'}),z,n,o],
      explain: hz? '<b>HOY</b>: Horizontal, 0 slope, Y = a number. The slope is <span class="c-m">0</span>.' : '<b>VUX</b>: Vertical, Undefined slope, X = a number. The slope is <span class="c-m">undefined</span>.' }; }
  };
  var TOPICS={ 'Slope-intercept form':['siSlope','siSlope','siYInt','siYInt','siBuild'], 'Point-slope form':['psWrite','psPoint','psSlope'], 'Graphs':['graphSlope','graphYInt','graphXInt'], 'HOY & VUX':['hvType','hvGraph','slopeHV'] };
  var BAG=['Slope-intercept form','Slope-intercept form','Point-slope form','Point-slope form','Graphs','Graphs','HOY & VUX'];
  function build(type){ for(var tries=0;tries<300;tries++){ var q=GEN[type](); if(!q) continue;
      var keys=q.choices.map(function(c){ return c.key; }); if(new Set(keys).size!==4) continue;
      if(!q.check(q.choices[0].val)) continue;                                                  // the answer must pass the independent check
      if(q.choices.slice(1).some(function(c){ return q.check(c.val); })) continue;              // and no distractor may pass it
      q.type=type; q.choices.forEach(function(c,i){ c.ok=i===0; });
      for(var i=3;i>0;i--){ var j=Math.floor(Math.random()*(i+1)), t=q.choices[i]; q.choices[i]=q.choices[j]; q.choices[j]=t; }
      q.visual=q.visual||''; delete q.check; return q; } throw new Error('generator failed: '+type); }
  var topicBag=[], lastType='';
  return { build:build }; }

function makeShift(PFX){
  var MINUS='−';
  function gcd(a,b){ a=Math.abs(a); b=Math.abs(b); while(b){ var t=a%b; a=b; b=t; } return a; }
  function R(n,d){ if(d<0){ n=-n; d=-d; } var g=gcd(n,d)||1; return {n:n/g,d:d/g}; }
  function ri(a,b){ return a+Math.floor(Math.random()*(b-a+1)); }
  function nz(a,b){ var v; do{ v=ri(a,b); }while(v===0); return v; }
  function pick(a){ return a[Math.floor(Math.random()*a.length)]; }
  function num(n){ return n<0? MINUS+(-n) : ''+n; }
  function frac(n,d){ return '<span class="'+PFX+'-fr"><span>'+n+'</span><span>'+d+'</span></span>'; }
  function fmtR(r){ if(r.d===1) return num(r.n); return (r.n<0?MINUS:'')+frac(Math.abs(r.n),r.d); }
  function coef(r,v){ if(r.d===1&&r.n===1) return v; if(r.d===1&&r.n===-1) return MINUS+v; return fmtR(r)+v; }
  function pt(x,y){ return '('+num(x)+', '+num(y)+')'; }
  function sgn(v){ return v>0? ' + '+v : v<0? ' '+MINUS+' '+(-v) : ''; }
  function psStr(m,h,k){ var c=(m.d===1&&m.n===1)?'':(m.d===1&&m.n===-1)?MINUS:fmtR(m); return 'y'+sgn(-k)+' = '+c+'(x'+sgn(-h)+')'; }
  function siStr(m,b){ return 'y = '+coef(m,'x')+sgn(b); }
  function stdNorm(A,B,C){ var g=gcd(gcd(A,B),C)||1; A/=g; B/=g; C/=g; if(A<0||(A===0&&B<0)){ A=-A; B=-B; C=-C; } return {A:A,B:B,C:C}; }
  function stdStr(L){ var a=L.A===1?'x':L.A===-1?MINUS+'x':num(L.A)+'x';
    var b=L.B===1?' + y':L.B===-1?' '+MINUS+' y':L.B>0?' + '+L.B+'y':' '+MINUS+' '+(-L.B)+'y'; return a+b+' = '+num(L.C); }
  function linePS(m,h,k){ return {A:-m.n,B:m.d,C:m.d*k-m.n*h}; }          // y-k=m(x-h)  ->  -p x + q y = qk - ph
  function lineSI(m,b){ return {A:-m.n,B:m.d,C:m.d*b}; }
  function sameLine(a,b){ return a.A*b.B===b.A*a.B && a.A*b.C===b.A*a.C && a.B*b.C===b.B*a.C; }
  function onLine(L,x,y){ return L.A*x+L.B*y===L.C; }
  function eq(h){ return '<span class="'+PFX+'-eq">'+h+'</span>'; }
  function M(r){ return '<span class="c-m">'+fmtR(r)+'</span>'; }
  function P(x,y){ return '<span class="c-pt">'+pt(x,y)+'</span>'; }
  var SLOPES=[2,-2,3,-3,4,-4,5,-5].map(function(n){ return R(n,1); }).concat(
    [[1,2],[-1,2],[1,3],[-1,3],[2,3],[-2,3],[3,2],[-3,2],[3,4],[-3,4]].map(function(a){ return R(a[0],a[1]); }));
  function C(html,val,why){ return {html:html,val:val,why:why||'',key:html}; }
  function rEq(a,b){ return a.n*b.d===b.n*a.d; }
  function siRev(m,b){ var a=R(Math.abs(m.n),m.d); return 'y = '+num(b)+(m.n>0?' + ':' '+MINUS+' ')+coef(a,'x'); }   // y = 4 − 3x
  function B(v){ return '<span class="c-b">'+v+'</span>'; }
  
  /* translation helpers */
  var W_OUT='The number is outside the parentheses, so the graph moves up or down.';
  var W_IN='The number is inside with x, so the graph moves left or right.';
  function fnot(dx,dy){ return 'f(x'+sgn(-dx)+')'+sgn(dy); }                               // f(x − 3) + 4
  function dirStr(dx,dy){ var k=Math.abs(dx||dy); return (dx?(dx>0?'Right ':'Left '):(dy>0?'Up ':'Down '))+k+(k===1?' unit':' units'); }
  function low(s){ return s.charAt(0).toLowerCase()+s.slice(1); }
  function CD(dx,dy,why){ return C(dirStr(dx,dy),{dx:dx,dy:dy},why); }
  function CN(dx,dy,why,bare){ return C((bare?'':'g(x) = ')+fnot(dx,dy),{dx:dx,dy:dy},why); }
  function fx(n,m,b){ return n+'(x) = '+coef(m,'x')+sgn(b); }
  function CL(m,b,why){ return C(fx('g',m,b),lineSI(m,b),why); }
  function moved(m,px,py,dx,dy){ return linePS(m,px+dx,py+dy); }                            // the line through (px,py) with slope m, slid by (dx,dy)
  var GS=[R(2,1),R(-2,1),R(3,1),R(-3,1),R(1,2),R(-1,2)];
  
  /* graph: window −6..6. f is dashed gray, g is the red line (lesson color). Each line = {m,px,py}. */
  function graphSVG(f,g,dots,dotCol){ var S=380, u=S/12, X=function(x){ return ((x+6)*u).toFixed(1); }, Y=function(y){ return ((6-y)*u).toFixed(1); }, h='';
    for(var i=-6;i<=6;i++){ h+='<line x1="'+X(i)+'" y1="0" x2="'+X(i)+'" y2="'+S+'" stroke="#2A3142" stroke-width="2"/><line x1="0" y1="'+Y(i)+'" x2="'+S+'" y2="'+Y(i)+'" stroke="#2A3142" stroke-width="2"/>'; }
    h+='<line x1="0" y1="'+Y(0)+'" x2="'+S+'" y2="'+Y(0)+'" stroke="#C9D1E0" stroke-width="3"/><line x1="'+X(0)+'" y1="0" x2="'+X(0)+'" y2="'+S+'" stroke="#C9D1E0" stroke-width="3"/>';
    [-4,-2,2,4].forEach(function(n){ h+='<text x="'+X(n)+'" y="'+(+Y(0)+24)+'" text-anchor="middle" font-size="20" font-weight="800" fill="#9BA5B8" font-family="Inter,sans-serif">'+num(n)+'</text>'+
      '<text x="'+(+X(0)-8)+'" y="'+(+Y(n)+7)+'" text-anchor="end" font-size="20" font-weight="800" fill="#9BA5B8" font-family="Inter,sans-serif">'+num(n)+'</text>'; });
    function seg(L,attr){ var y1=L.py+L.m.n*(-7-L.px)/L.m.d, y2=L.py+L.m.n*(7-L.px)/L.m.d; return '<line x1="'+X(-7)+'" y1="'+Y(y1)+'" x2="'+X(7)+'" y2="'+Y(y2)+'" '+attr+'/>'; }
    h+=seg(f,'stroke="#C9D1E0" stroke-width="5" stroke-dasharray="14 10"')+seg(g,'stroke="#FF4B4B" stroke-width="6" stroke-linecap="round"');
    (dots||[]).forEach(function(p){ h+='<circle cx="'+X(p[0])+'" cy="'+Y(p[1])+'" r="9" fill="'+dotCol+'" stroke="#0E1016" stroke-width="3"/>'; });
    var lx=f.m.n>0?8:S-112;
    h+='<rect x="'+lx+'" y="8" width="104" height="72" rx="10" fill="#0E1016" fill-opacity=".88" stroke="#343B4D" stroke-width="2"/>'+
       '<path d="M'+(lx+12)+' 30h40" stroke="#C9D1E0" stroke-width="5" stroke-dasharray="12 8"/><text x="'+(lx+64)+'" y="38" font-size="24" font-weight="800" fill="#C9D1E0" font-family="Inter,sans-serif">f</text>'+
       '<path d="M'+(lx+12)+' 60h40" stroke="#FF4B4B" stroke-width="6"/><text x="'+(lx+64)+'" y="68" font-size="24" font-weight="800" fill="#FF4B4B" font-family="Inter,sans-serif">g</text>';
    return '<svg class="'+PFX+'-graph" width="'+S+'" height="'+S+'" viewBox="0 0 '+S+' '+S+'" role="img" aria-label="Graph of two lines: f dashed and g solid red">'+h+'</svg>'; }
  
  /* stretch / compression / reflection helpers (a·f(x) + d topics) */
  var Z=R(0,1), ONE=R(1,1);
  var A_BIG=[R(2,1),R(3,1),R(4,1),R(3,2),R(5,2)], A_SMALL=[R(1,2),R(1,3),R(1,4),R(2,3),R(3,4)], A_FRAC=[R(5,4),R(7,4),R(4,3)];
  function neg(r){ return R(-r.n,r.d); }
  function inv(r){ return R(r.d,r.n); }
  function absA(r){ return Math.abs(r.n/r.d); }
  function steepOf(a){ var v=absA(a); return v>1?'steeper':v<1?'less':'same'; }
  function sgnR(r){ if(r.n===0) return ''; return (r.n>0?' + ':' '+MINUS+' ')+(r.d===1?Math.abs(r.n):frac(Math.abs(r.n),r.d)); }
  function gfx(a,D){ return 'g(x) = '+coef(a,'f(x)')+sgnR(D); }
  function CGf(a,D,why){ return C(gfx(a,D),{a:a,d:D},why); }
  function CGb(a,D,why){ return C(coef(a,'f(x)')+sgnR(D),{a:a,d:D},why); }                  /* bare, for answers beside a graph */
  function sizeWhy(a){ return absA(a)>1? (a.d>1? fmtR(a)+' is a fraction, but it’s bigger than 1: steeper.' : fmtR(a)+' is bigger than 1, so it gets steeper.') : fmtR(a)+' is between 0 and 1, so it gets less steep.'; }
  function descTxt(v){ if(v.steep==='same'&&!v.flip&&v.dy.n!==0) return 'Shifted '+(v.dy.n>0?'up ':'down ')+fmtR(R(Math.abs(v.dy.n),v.dy.d));
    var s=v.steep==='steeper'?'steeper':v.steep==='less'?'less steep':'same steepness'; return v.flip?'Reflected, '+s:s.charAt(0).toUpperCase()+s.slice(1); }
  function CDs(v,why){ return C(descTxt(v),v,why); }
  function truthDesc(a,d){ return function(v){ return v.flip!==undefined&&v.dy!==undefined&&v.flip===(a.n<0)&&v.steep===steepOf(a)&&rEq(v.dy,R(d,1)); }; }
  function truthFn(a,d){ return function(v){ return v.a!==undefined&&rEq(v.a,a)&&rEq(v.d,R(d,1)); }; }
  var W_MULT='Multiplying changes the steepness. Adding is what moves the line up or down.';
  var W_NOFLIP='Nothing negative is out front, so it isn’t reflected.';
  /* f(x) = x dashed, g(x) = a·x + d red, window −6..6. The f/g key goes in whichever corner no line or point crosses (null if none is clear). */
  function tfSVG(a,d){ var S=380, u=S/12, X=function(x){ return (x+6)*u; }, Y=function(y){ return (6-y)*u; }, h='', m=a.n/a.d;
    var pts=[[0,d]], x2=a.d, y2=d+a.n; if(Math.abs(y2)<=5&&Math.abs(x2)<=5) pts.push([x2,y2]); else if(Math.abs(d-a.n)<=5) pts.push([-a.d,d-a.n]);
    if(Math.abs(d)>5) return null;
    function hits(cx,cy){ for(var t=0;t<=240;t++){ var x=-6+12*t/240, A=[[x,x],[x,m*x+d]];
        for(var k=0;k<2;k++){ var px=X(A[k][0]), py=Y(A[k][1]); if(px>=cx-8&&px<=cx+112&&py>=cy-8&&py<=cy+80) return true; } }
      return pts.some(function(p){ var px=X(p[0]), py=Y(p[1]); return px>=cx-14&&px<=cx+118&&py>=cy-14&&py<=cy+86; }); }
    var spot=null; [[8,8],[S-112,8],[8,S-80],[S-112,S-80]].some(function(c){ if(!hits(c[0],c[1])){ spot=c; return true; } return false; });
    if(!spot) return null;
    for(var i=-6;i<=6;i++){ h+='<line x1="'+X(i).toFixed(1)+'" y1="0" x2="'+X(i).toFixed(1)+'" y2="'+S+'" stroke="#2A3142" stroke-width="2"/><line x1="0" y1="'+Y(i).toFixed(1)+'" x2="'+S+'" y2="'+Y(i).toFixed(1)+'" stroke="#2A3142" stroke-width="2"/>'; }
    h+='<line x1="0" y1="'+Y(0)+'" x2="'+S+'" y2="'+Y(0)+'" stroke="#C9D1E0" stroke-width="3"/><line x1="'+X(0)+'" y1="0" x2="'+X(0)+'" y2="'+S+'" stroke="#C9D1E0" stroke-width="3"/>';
    [-4,-2,2,4].forEach(function(n){ h+='<text x="'+X(n)+'" y="'+(Y(0)+24)+'" text-anchor="middle" font-size="20" font-weight="800" fill="#9BA5B8" font-family="Inter,sans-serif">'+num(n)+'</text>'+
      '<text x="'+(X(0)-8)+'" y="'+(Y(n)+7)+'" text-anchor="end" font-size="20" font-weight="800" fill="#9BA5B8" font-family="Inter,sans-serif">'+num(n)+'</text>'; });
    h+='<line x1="'+X(-7)+'" y1="'+Y(-7)+'" x2="'+X(7)+'" y2="'+Y(7)+'" stroke="#C9D1E0" stroke-width="5" stroke-dasharray="14 10"/>';
    h+='<line x1="'+X(-7)+'" y1="'+Y(-7*m+d)+'" x2="'+X(7)+'" y2="'+Y(7*m+d)+'" stroke="#FF4B4B" stroke-width="6" stroke-linecap="round"/>';
    pts.forEach(function(p,i){ h+='<circle cx="'+X(p[0])+'" cy="'+Y(p[1])+'" r="9" fill="'+(i?'#FFE14D':'#FF3DB4')+'" stroke="#0E1016" stroke-width="3"/>'; });
    var lx=spot[0], ly=spot[1];
    h+='<rect x="'+lx+'" y="'+ly+'" width="104" height="72" rx="10" fill="#0E1016" fill-opacity=".88" stroke="#343B4D" stroke-width="2"/>'+
       '<path d="M'+(lx+12)+' '+(ly+22)+'h40" stroke="#C9D1E0" stroke-width="5" stroke-dasharray="12 8"/><text x="'+(lx+64)+'" y="'+(ly+30)+'" font-size="24" font-weight="800" fill="#C9D1E0" font-family="Inter,sans-serif">f</text>'+
       '<path d="M'+(lx+12)+' '+(ly+52)+'h40" stroke="#FF4B4B" stroke-width="6"/><text x="'+(lx+64)+'" y="'+(ly+60)+'" font-size="24" font-weight="800" fill="#FF4B4B" font-family="Inter,sans-serif">g</text>';
    return '<svg class="'+PFX+'-graph" width="'+S+'" height="'+S+'" viewBox="0 0 '+S+' '+S+'" role="img" aria-label="Graph of two lines: f dashed and g solid red">'+h+'</svg>'; }

  /* ================= QUESTION GENERATORS =================
     Each returns {topic,prompt,visual,choices[0]=correct,explain,data,check}. check(val) is an independent
     test of whether a choice is right; the build step rejects any question where a distractor also passes. */
  var GEN={
  vDescribe:function(){ var d=nz(-9,9);
    return { topic:'Vertical shifts', prompt:'How does '+eq('g(x) = '+fnot(0,d))+' move the graph of f(x)?', data:{dx:0,dy:d},
      check:function(v){ return v.dx===0&&v.dy===d; },
      choices:[ CD(0,d), CD(0,-d,'Outside the parentheses the sign means what it says: + is up, '+MINUS+' is down.'), CD(d,0,W_OUT), CD(-d,0,W_OUT) ],
      explain:'A number <b>outside</b> f(x) changes the outputs, so the graph moves up or down: '+eq(fnot(0,d))+' is '+low(dirStr(0,d))+'.' }; },
  hDescribe:function(){ var c=nz(-9,9);
    return { topic:'Horizontal shifts', prompt:'How does '+eq('g(x) = '+fnot(c,0))+' move the graph of f(x)?', data:{dx:c,dy:0},
      check:function(v){ return v.dx===c&&v.dy===0; },
      choices:[ CD(c,0), CD(-c,0,'Inside the parentheses the shift goes opposite the sign: x '+MINUS+' is right, x + is left.'), CD(0,c,W_IN), CD(0,-c,W_IN) ],
      explain:'A number <b>inside</b> with x moves the graph left or right, opposite the sign: '+eq(fnot(c,0))+' is '+low(dirStr(c,0))+'.' }; },
  vWrite:function(){ var d=nz(-9,9), w='Inside the parentheses moves the graph left or right. Up and down go outside.';
    return { topic:'Vertical shifts', prompt:'The graph of f(x) is translated <b>'+low(dirStr(0,d))+'</b>. Which equation is g(x)?', data:{dx:0,dy:d},
      check:function(v){ return v.dx===0&&v.dy===d; },
      choices:[ CN(0,d), CN(0,-d,'Outside the parentheses, up is + and down is '+MINUS+'.'), CN(d,0,w), CN(-d,0,w) ],
      explain:'Up and down go <b>outside</b> the parentheses: '+low(dirStr(0,d))+' is '+eq('g(x) = '+fnot(0,d))+'.' }; },
  hWrite:function(){ var c=nz(-9,9), w='Outside the parentheses moves the graph up or down. Left and right go inside with x.';
    return { topic:'Horizontal shifts', prompt:'The graph of f(x) is translated <b>'+low(dirStr(c,0))+'</b>. Which equation is g(x)?', data:{dx:c,dy:0},
      check:function(v){ return v.dx===c&&v.dy===0; },
      choices:[ CN(c,0), CN(-c,0,'Inside goes opposite the sign: right is x '+MINUS+' a number, left is x + a number.'), CN(0,c,w), CN(0,-c,w) ],
      explain:'Left and right go <b>inside</b> with x, opposite the sign: '+low(dirStr(c,0))+' is '+eq('g(x) = '+fnot(c,0))+'.' }; },
  newYInt:function(){ var m=pick(SLOPES), b=nz(-9,9), d=nz(-9,9), nb=b+d, L=moved(m,0,b,0,d);
    return { topic:'Vertical shifts', prompt:eq(fx('f',m,b))+' is translated <b>'+low(dirStr(0,d))+'</b>. What is the new <span class="c-b">y-intercept</span>?', data:{m:m,b:b,dy:d},
      check:function(v){ return v.n!==undefined&&rEq(v,R(L.C,L.B)); },                 /* y where the moved line meets x = 0 */
      choices:[ C(num(nb),R(nb,1)), C(num(b-d),R(b-d,1),'Up adds to b and down subtracts. This shift is '+(d>0?'up':'down')+'.'),
        C(num(Math.abs(d)),R(Math.abs(d),1),'That is the size of the shift. Start at b = '+num(b)+' and move '+low(dirStr(0,d))+'.'),
        C(num(b),R(b,1),'That is the old y-intercept. The whole line moved, so b changes.') ],
      explain:'Start at b = '+num(b)+' and move '+low(dirStr(0,d))+': the new y-intercept is '+B(num(nb))+'.' }; },
  eqV:function(){ var m=pick(SLOPES), b=nz(-9,9), d=nz(-9,9), ms=R(m.n+d*m.d,m.d), L=moved(m,0,b,0,d); if(ms.n===0) return null;
    return { topic:'New equations', prompt:eq(fx('f',m,b))+' and '+eq('g(x) = '+fnot(0,d))+'. Which is g(x)?', data:{m:m,b:b},
      check:function(v){ return v.A!==undefined&&sameLine(v,L); },
      choices:[ CL(m,b+d), CL(m,b-d,'Check the sign: '+fnot(0,d)+' shifts '+(d>0?'up':'down')+', so b goes '+(d>0?'up':'down')+' by '+Math.abs(d)+'.'),
        CL(ms,b,'A translation never changes the slope. Only b changes here.'),
        CL(m,d,'That replaces b with the shift. Add the shift to b instead.') ],
      explain:'Same slope, and b changes by the shift: '+num(b)+sgn(d)+' = '+B(num(b+d))+'.' }; },
  eqH:function(){ var m=R(pick([2,-2,3,-3,4,-4]),1), b=nz(-6,6), c=nz(-4,4), nb=b-m.n*c, L=moved(m,0,b,c,0); if(m.n===c) return null;
    var inner=num(m.n)+'(x'+sgn(-c)+')'+sgn(b);
    return { topic:'New equations', prompt:eq(fx('f',m,b))+' and '+eq('g(x) = '+fnot(c,0))+'. Which is g(x)?', data:{m:m,b:b},
      check:function(v){ return v.A!==undefined&&sameLine(v,L); },
      choices:[ CL(m,nb), CL(m,b-c,'Distribute: in '+eq(inner)+' the '+num(m.n)+' multiplies the '+Math.abs(c)+' too.'),
        CL(m,b+m.n*c,'Sign slip. Substitute exactly what is inside: '+eq(inner)+'.'),
        CL(R(m.n-c,1),b,num(m.n)+'x and '+Math.abs(c)+' are not like terms, so they don’t combine. The slope stays '+num(m.n)+'.') ],
      explain:'Replace x with (x'+sgn(-c)+'): '+eq(inner)+' = '+eq(num(m.n)+'x'+sgn(-m.n*c)+sgn(b))+', so '+eq(fx('g',m,nb))+'.' }; },
  eqCompare:function(){ var m=pick(SLOPES), b=nz(-9,9), d=nz(-9,9), b2=b+d, L=lineSI(m,b2); if(b2===0) return null;
    return { topic:'New equations', prompt:eq(fx('f',m,b))+' and '+eq(fx('g',m,b2))+'. How was f(x) shifted up or down to make g(x)?', data:{m:m,b:b,b2:b2},
      check:function(v){ return v.dx===0&&sameLine(moved(m,0,b,0,v.dy),L); },
      choices:[ CD(0,d), CD(0,-d,'Compare the y-intercepts: b goes from '+num(b)+' to '+num(b2)+', which is '+(d>0?'up':'down')+'.'),
        CD(0,b2,'That is g’s y-intercept. The shift is the change in b.'), CD(0,b,'That is f’s y-intercept. The shift is the change in b.') ],
      explain:'The slopes match, so only b changed: from '+num(b)+' to '+num(b2)+' is '+low(dirStr(0,d))+'.' }; },
  slopeStays:function(){ var m=pick(SLOPES), b=nz(-9,9), s=nz(-9,9), hz=Math.random()<0.5, dx=hz?s:0, dy=hz?0:s, L=moved(m,0,b,dx,dy);
    var ms=R(m.n+s*m.d,m.d), ng=R(-m.n,m.d); if(Math.abs(s)<2) return null;
    return { topic:'New equations', prompt:eq(fx('f',m,b))+' is translated <b>'+low(dirStr(dx,dy))+'</b>. What is the <span class="c-m">slope</span> of the new line?', data:{m:m},
      check:function(v){ return v.n!==undefined&&rEq(v,R(-L.A,L.B)); },                /* slope read off the moved line */
      choices:[ C(fmtR(m),m), C(fmtR(ms),ms,'Don’t add the shift to the slope. A translation slides the line without tilting it.'),
        C(fmtR(ng),ng,'A slide never flips a line. The slope keeps its sign.'),
        C(num(s),R(s,1),'That is the shift. The slope is still the number with x.') ],
      explain:'A translation slides every point the same way, so the line stays just as steep. The slope is still '+M(m)+'.' }; },
  graphEq:function(){ var m=pick(GS), b=ri(-4,4), d=nz(-6,6); if(Math.abs(d)<2||Math.abs(b+d)>5) return null; var L=moved(m,0,b,0,d);
    var w='The line moved up or down, so the number goes outside the parentheses.';
    return { topic:'Graphs', prompt:'f (dashed) slides up or down to make g (red). Which is g(x)?', data:{m:m,fp:[0,b]},
      visual:graphSVG({m:m,px:0,py:b},{m:m,px:0,py:b+d},[[0,b],[0,b+d]],'#FF3DB4'),
      check:function(v){ return v.dx!==undefined&&sameLine(moved(m,0,b,v.dx,v.dy),L); },
      choices:[ CN(0,d,'',1), CN(0,-d,'The red line crosses the y-axis '+(d>0?'above':'below')+' the dashed one, so the shift is '+(d>0?'up':'down')+'.',1), CN(d,0,w,1), CN(-d,0,w,1) ],
      explain:'Count between the y-intercepts: '+low(dirStr(0,d))+', so '+eq('g(x) = '+fnot(0,d))+'.' }; },
  graphHow:function(){ var m=pick(GS), b=ri(-4,4), d=nz(-6,6); if(Math.abs(d)<2||Math.abs(b+d)>5) return null; var L=moved(m,0,b,0,d);
    var k=Math.abs(d), h=k*m.d/Math.abs(m.n), alt=(h%1===0&&h!==k)?h:(k<6?k+1:k-1), sg=d>0?1:-1, w='Count along the y-axis, from one y-intercept to the other.';
    return { topic:'Graphs', prompt:'f (dashed) slides up or down to make g (red). How far?', data:{m:m,fp:[0,b]},
      visual:graphSVG({m:m,px:0,py:b},{m:m,px:0,py:b+d},[[0,b],[0,b+d]],'#FF3DB4'),
      check:function(v){ return v.dx===0&&sameLine(moved(m,0,b,0,v.dy),L); },
      choices:[ CD(0,d), CD(0,-d,'The red line crosses the y-axis '+(d>0?'above':'below')+' the dashed one, so the shift is '+(d>0?'up':'down')+'.'), CD(0,sg*alt,w), CD(0,-sg*alt,w) ],
      explain:'From the dashed line’s y-intercept to the red line’s y-intercept is '+low(dirStr(0,d))+'.' }; },
  graphH:function(){ var m=pick(GS), a=ri(-4,4), c=nz(-6,6); if(Math.abs(c)<2||Math.abs(a+c)>5) return null; var L=linePS(m,a+c,0);
    var w='The line moved left or right, so the number goes inside with x.';
    return { topic:'Graphs', prompt:'f (dashed) slides left or right to make g (red). Which is g(x)?', data:{m:m,fp:[a,0]},
      visual:graphSVG({m:m,px:a,py:0},{m:m,px:a+c,py:0},[[a,0],[a+c,0]],'#2DE2C8'),
      check:function(v){ return v.dx!==undefined&&sameLine(moved(m,a,0,v.dx,v.dy),L); },
      choices:[ CN(c,0,'',1), CN(-c,0,'Inside goes opposite the sign: the line moved '+(c>0?'right':'left')+', so it is x '+(c>0?MINUS:'+')+' '+Math.abs(c)+'.',1), CN(0,c,w,1), CN(0,-c,w,1) ],
      explain:'Count between the x-intercepts: '+low(dirStr(c,0))+'. Inside goes opposite the sign: '+eq('g(x) = '+fnot(c,0))+'.' }; },
  /* ===== Stretches, compressions and reflections: g(x) = a·f(x) + d with f(x) = x (added Oct 2026) =====
     Same words as the lesson: |a| > 1 is a vertical stretch (steeper), 0 < |a| < 1 is a vertical compression (less steep),
     a negative a reflects the line across the x-axis, and d moves the y-intercept. Wrong choices are the documented errors:
     a fraction read as steeper, a read as a shift, a missed reflection, a negative read as less steep, 1/a for the slope,
     the sign of d, and a and d swapped. Text is kept as short as the shift questions so every game's panel fits. */
  stDescribe:function(){ var big=Math.random()<0.5, a=big?pick(A_BIG.concat(A_FRAC)):pick(A_SMALL), s=steepOf(a), o=s==='steeper'?'less':'steeper';
    return { topic:'Stretches & compressions', prompt:eq('g(x) = '+coef(a,'f(x)'))+'. How does the graph of g compare to '+eq('f(x) = x')+'?', data:{a:a,d:0},
      check:truthDesc(a,0),
      choices:[ CDs({flip:false,steep:s,dy:Z}), CDs({flip:false,steep:o,dy:Z}, sizeWhy(a)), CDs({flip:false,steep:'same',dy:a}, W_MULT), CDs({flip:true,steep:s,dy:Z}, W_NOFLIP) ],
      explain:fmtR(a)+' is '+(s==='steeper'?'bigger than 1: a vertical <b>stretch</b>, so g is steeper.':'between 0 and 1: a vertical <b>compression</b>, so g is less steep.')+' It still crosses at (0, 0).' }; },
  stWrite:function(){ var want=Math.random()<0.5?'steeper':'less', a=want==='steeper'?pick(A_BIG):pick(A_SMALL), k=ri(1,4);
    return { topic:'Stretches & compressions', prompt:'Which graph is <b>'+(want==='steeper'?'steeper':'less steep')+'</b> than '+eq('f(x) = x')+' and still goes through (0, 0)?', data:{a:a,d:0},
      check:function(v){ return v.a!==undefined&&rEq(v.d,Z)&&v.a.n>0&&steepOf(v.a)===want; },
      choices:[ CGf(a,Z), CGf(inv(a),Z, want==='steeper'?'A number between 0 and 1 out front makes it less steep.':'A number bigger than 1 out front makes it steeper.'),
        C('g(x) = f(x)'+sgn(k),{a:ONE,d:R(k,1)},'Adding '+k+' moves the line up, so it misses (0, 0).'),
        C('g(x) = f(x '+MINUS+' '+k+')',{a:ONE,d:R(-k,1)},'That moves the line right, so it misses (0, 0).') ],
      explain:(want==='steeper'?'Bigger than 1':'Between 0 and 1')+' out front makes it '+(want==='steeper'?'steeper':'less steep')+' and keeps (0, 0): '+eq(gfx(a,Z))+'.' }; },
  stGraph:function(){ var a=pick([R(2,1),R(3,1),R(1,2),R(1,3),R(3,2),R(2,3)]), k=ri(1,3), vis=tfSVG(a,0); if(!vis) return null;
    return { topic:'Stretches & compressions', prompt:'f(x) = x is dashed. Which is g(x) (red)?', data:{a:a,d:0}, visual:vis,
      check:truthFn(a,0),
      choices:[ CGb(a,Z), CGb(inv(a),Z,'Rise over run: count up first, then right. That one is flipped.'),
        CGb(neg(a),Z,'The red line goes up from left to right, so it isn’t reflected.'),
        C('f(x)'+sgn(k),{a:ONE,d:R(k,1)},'g still crosses at (0, 0). It got '+(absA(a)>1?'steeper':'less steep')+', not shifted.') ],
      explain:'From (0, 0): up '+a.n+', right '+a.d+'. The slope is '+M(a)+', so g(x) = '+eq(coef(a,'f(x)'))+'.' }; },

  flDescribe:function(){ var p=pick(A_BIG.concat(A_SMALL)), a=neg(p), s=steepOf(a), o=s==='steeper'?'less':'steeper';
    return { topic:'Reflections', prompt:eq('g(x) = '+coef(a,'f(x)'))+'. How does the graph of g compare to '+eq('f(x) = x')+'?', data:{a:a,d:0},
      check:truthDesc(a,0),
      choices:[ CDs({flip:true,steep:s,dy:Z}), CDs({flip:false,steep:s,dy:Z},'The minus out front reflects the line across the x-axis.'),
        CDs({flip:true,steep:o,dy:Z},'The minus flips it, but '+fmtR(p)+(s==='steeper'?' is bigger than 1: still steeper.':' is between 0 and 1: still less steep.')),
        CDs({flip:false,steep:'same',dy:a}, W_MULT) ],
      explain:'The minus reflects it across the x-axis, and '+fmtR(p)+(s==='steeper'?' is bigger than 1, so it’s steeper too.':' is between 0 and 1, so it’s less steep too.') }; },
  flGraph:function(){ var a=pick([R(-2,1),R(-3,1),R(-1,2),R(-1,3),R(-3,2),R(-2,3)]), k=ri(1,3), vis=tfSVG(a,0); if(!vis) return null;
    return { topic:'Reflections', prompt:'f(x) = x is dashed. Which is g(x) (red)?', data:{a:a,d:0}, visual:vis,
      check:truthFn(a,0),
      choices:[ CGb(a,Z), CGb(neg(a),Z,'The red line goes down from left to right, so a is negative.'),
        CGb(inv(a),Z,'Rise over run: count down first, then right. That one is flipped.'),
        C('f(x) '+MINUS+' '+k,{a:ONE,d:R(-k,1)},'g still crosses at (0, 0). It was reflected, not shifted down.') ],
      explain:'From (0, 0): down '+(-a.n)+', right '+a.d+'. The slope is '+M(a)+', so g(x) = '+eq(coef(a,'f(x)'))+'.' }; },
  flStmt:function(){ var p=pick(A_BIG.concat(A_SMALL)), a=Math.random()<0.6?neg(p):p, flip=a.n<0, s=steepOf(a), o=s==='steeper'?'less':'steeper';
    function T(f,st,why){ return C((f?'is':'is not')+' / '+(st==='steeper'?'steeper than':'less steep than'),{flip:f,steep:st},why); }
    var wF=flip?'There’s a minus out front, so it is reflected.':'Nothing negative is out front, so it isn’t reflected.',
        wS=fmtR(p)+(s==='steeper'?' is bigger than 1, so it’s steeper.':' is between 0 and 1, so it’s less steep.');
    return { topic:'Reflections', prompt:eq(gfx(a,Z))+'. The graph of g <b>___</b> reflected across the x-axis and is <b>___</b> the graph of '+eq('f(x) = x')+'.', data:{a:a,d:0},
      check:function(v){ return v.flip===flip&&v.steep===s; },
      choices:[ T(flip,s), T(!flip,s,wF), T(flip,o,wS), T(!flip,o,'Both blanks are off: it '+(flip?'is':'isn’t')+' reflected, and it’s '+(s==='steeper'?'steeper':'less steep')+'.') ],
      explain:(flip?'The minus reflects it':'No minus, so no reflection')+', and '+wS }; },

  adStmt:function(){ var p=pick(A_BIG.concat(A_SMALL,A_FRAC)), a=Math.random()<0.3?neg(p):p, d=nz(-9,9), s=steepOf(a), o=s==='steeper'?'less':'steeper', it=d>0?'greater':'less', io=d>0?'less':'greater';
    function T(st,i,why){ return C((st==='steeper'?'steeper than':'less steep than')+' / '+(i==='same'?'the same as':i+' than'),{steep:st,int:i},why); }
    var wS='a = '+fmtR(a)+': '+fmtR(p)+(s==='steeper'?' is bigger than 1, so g is steeper.':' is between 0 and 1, so g is less steep.'),
        wI='d = '+num(d)+', so g crosses at '+num(d)+': '+it+' than f’s 0.';
    return { topic:'All together: a·f(x) + d', prompt:eq(gfx(a,R(d,1)))+'. The graph of g is <b>___</b> the graph of '+eq('f(x) = x')+' and has a y-intercept <b>___</b> that of f.', data:{a:a,d:d},
      check:function(v){ return v.steep===s&&v.int===it; },
      choices:[ T(s,it), T(o,it,wS), T(s,io,wI), T(s,'same','d isn’t 0, so the y-intercept moved. '+wI) ],
      explain:wS+' '+wI }; },
  adNew:function(){ var a=pick(A_BIG.concat(A_SMALL,A_FRAC)), d=nz(-9,9), s=steepOf(a), o=s==='steeper'?'less':'steeper', up=d>0;
    function T(st,u,why){ return C((st==='steeper'?'Steeper':'Less steep')+'; y-intercept '+(u?'up':'down'),{steep:st,up:u},why); }
    var wS=fmtR(a)+(s==='steeper'?' is bigger than 1, so it’s steeper.':' is between 0 and 1, so it’s less steep.'),
        wI='The y-intercept went from 0 to '+num(d)+': '+(up?'up':'down')+'.';
    return { topic:'All together: a·f(x) + d', prompt:eq('f(x) = x')+' gets a new slope of '+M(a)+' and a new y-intercept of '+B(num(d))+'. Which is true?', data:{a:a,d:d},
      check:function(v){ return v.steep===s&&v.up===up; },
      choices:[ T(s,up), T(o,up,wS), T(s,!up,wI), T(o,!up,'Both are off: it’s '+(s==='steeper'?'steeper':'less steep')+', and the y-intercept went '+(up?'up':'down')+'.') ],
      explain:wS+' '+wI }; },
  adWrite:function(){ var a=pick(A_BIG.concat(A_SMALL,[R(-2,1),R(-3,1),R(-1,2),R(-2,3)])), d=nz(-9,9), D=R(d,1), aTxt=(a.n<0?' '+MINUS+' ':' + ')+fmtR(R(Math.abs(a.n),a.d));
    return { topic:'All together: a·f(x) + d', prompt:eq('f(x) = x')+' gets a new slope of '+M(a)+' and a new y-intercept of '+B(num(d))+'. Which is the new function?', data:{a:a,d:d},
      check:truthFn(a,d),
      choices:[ CGf(a,D), CGf(a,R(-d,1),'Check the sign of d: the y-intercept is '+num(d)+'.'),
        CGf(inv(a),D,'The slope goes out front as it is: '+fmtR(a)+', not '+fmtR(inv(a))+'.'),
        C('g(x) = '+coef(D,'f(x)')+aTxt,{a:D,d:a},'a and d are swapped: slope out front, y-intercept at the end.') ],
      explain:'Slope out front, y-intercept at the end: '+eq(gfx(a,D))+'.' }; },
  adGraph:function(){ var a=pick([R(2,1),R(3,1),R(-2,1),R(-3,1),R(1,2),R(-1,2),R(2,3),R(-2,3)]), d=nz(-4,4), D=R(d,1), vis=tfSVG(a,d); if(!vis) return null;
    return { topic:'All together: a·f(x) + d', prompt:'f(x) = x is dashed. Which is g(x) (red)?', data:{a:a,d:d}, visual:vis,
      check:truthFn(a,d),
      choices:[ CGb(a,D), CGb(a,R(-d,1),'Look where g crosses the y-axis: at '+num(d)+'.'),
        CGb(neg(a),D,'g goes '+(a.n>0?'up':'down')+' from left to right, so a is '+(a.n>0?'positive':'negative')+'.'),
        CGb(inv(a),D,'Rise over run: count '+(a.n>0?'up':'down')+' first, then right.') ],
      explain:'Begin at '+B(num(d))+', then move '+(a.n>0?'up ':'down ')+Math.abs(a.n)+', right '+a.d+': g(x) = '+eq(coef(a,'f(x)')+sgnR(D))+'.' }; }

  };
  var TOPICS={ 'Vertical shifts':['vDescribe','vWrite','newYInt'], 'Horizontal shifts':['hDescribe','hWrite'], 'Graphs':['graphEq','graphHow','graphH'], 'New equations':['eqV','eqH','eqCompare','slopeStays'] };
  var BAG=['Vertical shifts','Vertical shifts','Horizontal shifts','Horizontal shifts','Graphs','Graphs','New equations','New equations'];
  function build(type){ for(var tries=0;tries<400;tries++){ var q=GEN[type](); if(!q) continue;
      var keys=q.choices.map(function(c){ return c.key; }); if(new Set(keys).size!==4) continue;
      if(!q.check(q.choices[0].val)) continue;                                                  // the answer must pass the independent check
      if(q.choices.slice(1).some(function(c){ return q.check(c.val); })) continue;              // and no distractor may pass it
      q.type=type; q.choices.forEach(function(c,i){ c.ok=i===0; });
      for(var i=3;i>0;i--){ var j=Math.floor(Math.random()*(i+1)), t=q.choices[i]; q.choices[i]=q.choices[j]; q.choices[j]=t; }
      q.visual=q.visual||''; delete q.check; return q; } throw new Error('generator failed: '+type); }
  var topicBag=[], lastType='';
  return { build:build }; }

/* Functions, Integers and Squares & roots and Graphing were written for the arcade (tools/sets/func.js, int.js, sq.js, plot.js), not taken from a game. */
function makeFunc(PFX){
  /* ================= QUESTION GENERATOR: is the relation a function? =================
     Ordered pairs, tables, mapping diagrams and graphs. Every picture is a 380×380 SVG with the game's
     -graph class, the same box the slope graphs use, so it fits each game's question panel. */
  var MINUS='−';
  function ri(a,b){ return a+Math.floor(Math.random()*(b-a+1)); }
  function pick(a){ return a[Math.floor(Math.random()*a.length)]; }
  function shuffle(a){ for(var i=a.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)), t=a[i]; a[i]=a[j]; a[j]=t; } return a; }
  function num(n){ return n<0? MINUS+(-n) : ''+n; }
  function pt(x,y){ return '('+num(x)+', '+num(y)+')'; }
  function C(html,val,why){ return {html:html,val:val,why:why||'',key:html}; }
  var FONT=' font-family="Inter,sans-serif" font-weight="800"';
  function svg(h,label){ return '<svg class="'+PFX+'-graph" width="380" height="380" viewBox="0 0 380 380" role="img" aria-label="'+label+'">'+h+'</svg>'; }

  /* a relation: n pairs. A function has n different x's (half the time two of them share a y, the classic trap).
     A non-function repeats one x with two different y's. */
  function relation(isFn,n,lim){ lim=lim||9; var xs=shuffle(range(-lim,lim)).slice(0,isFn?n:n-1), P=[];
    xs.forEach(function(x){ P.push([x,ri(-lim,lim)]); });
    if(!isFn){ var y2; do{ y2=ri(-lim,lim); }while(y2===P[0][1]); P.push([xs[0],y2]); }
    if(Math.random()<0.5){ var a=isFn?0:1, b=isFn?1:2; P[b][1]=P[a][1]; }        /* a repeated y (never on the doubled x) */
    return shuffle(P); }
  function range(a,b){ var r=[]; for(var i=a;i<=b;i++) r.push(i); return r; }
  function ysOf(P,x){ var s={}; P.forEach(function(p){ if(p[0]===x) s[p[1]]=1; }); return Object.keys(s).map(Number); }
  function dupX(P){ for(var i=0;i<P.length;i++) if(ysOf(P,P[i][0]).length>1) return P[i][0]; return null; }
  function dupY(P){ for(var i=0;i<P.length;i++) for(var j=i+1;j<P.length;j++) if(P[i][1]===P[j][1]&&P[i][0]!==P[j][0]) return P[i][1]; return null; }

  /* answers stay short (one line on the narrowest answer button, and short enough for bonus-wave targets): "Yes, it is", or the value that breaks it.
     "No, y = …" is the classic trap: a repeated y never breaks a function. */
  var YES='Yes, it is', ASK=' If not, what breaks it?';
  function noX(x,why){ return C('No, x = '+num(x),{x:x},why); }
  function noY(y,why){ return C('No, y = '+num(y),{y:y},why); }
  var W_Y='A y can repeat. Look for an x with two y’s.';
  function relQ(P,prompt,visual){ var d=dupX(P), r=dupY(P), xs=[]; P.forEach(function(p){ if(xs.indexOf(p[0])<0&&p[0]!==d) xs.push(p[0]); }); shuffle(xs);
    function one(x){ return 'x = '+num(x)+' has only one y.'; }
    var ch= d===null? [ C(YES,{fn:1}), noX(xs[0],one(xs[0])), noX(xs[1],one(xs[1])), r!==null? noY(r,W_Y) : noX(xs[2],one(xs[2])) ]
                    : [ noX(d), C(YES,{fn:1},'x = '+num(d)+' has two y’s.'), noX(xs[0],one(xs[0])), r!==null? noY(r,W_Y) : noX(xs[1],one(xs[1])) ];
    return { topic:'Functions', prompt:prompt, visual:visual||'', data:{P:P}, choices:ch,
      check:function(v){ if(v.fn) return P.every(function(p){ return ysOf(P,p[0]).length===1; });     /* recount every x */
        if(v.x!==undefined) return ysOf(P,v.x).length>1; return false; },                               /* a repeated y never decides it */
      explain: d===null? 'Every x has one y, so it <b>is</b> a function.'+(r!==null?' A repeated y is fine.':'')
        : 'x = <span class="c-ans">'+num(d)+'</span> goes to '+num(ysOf(P,d)[0])+' and '+num(ysOf(P,d)[1])+', so it is <b>not</b> a function.' }; }

  function tableSVG(P){ var n=P.length, h=380/(n+1), s='<rect x="0" y="0" width="380" height="'+h+'" fill="#232838"/>';
    s+='<text x="95" y="'+(h/2+12)+'" text-anchor="middle" font-size="34" fill="#C9D1E0"'+FONT+'>x</text><text x="285" y="'+(h/2+12)+'" text-anchor="middle" font-size="34" fill="#C9D1E0"'+FONT+'>y</text>';
    P.forEach(function(p,i){ var yy=(i+1)*h+h/2+11;
      s+='<text x="95" y="'+yy+'" text-anchor="middle" font-size="32" fill="#F2F4F8"'+FONT+'>'+num(p[0])+'</text><text x="285" y="'+yy+'" text-anchor="middle" font-size="32" fill="#F2F4F8"'+FONT+'>'+num(p[1])+'</text>'; });
    for(var i=1;i<=n;i++) s+='<line x1="0" y1="'+(i*h)+'" x2="380" y2="'+(i*h)+'" stroke="#343B4D" stroke-width="2"/>';
    s+='<line x1="190" y1="0" x2="190" y2="380" stroke="#343B4D" stroke-width="3"/>';
    return svg(s,'Table of x and y values'); }

  function mapSVG(P){ var X=[], Y=[]; P.forEach(function(p){ if(X.indexOf(p[0])<0) X.push(p[0]); if(Y.indexOf(p[1])<0) Y.push(p[1]); });
    X.sort(function(a,b){ return a-b; }); Y.sort(function(a,b){ return a-b; });
    function at(list,i){ return 212+(i-(list.length-1)/2)*64; }
    var s='<defs><marker id="'+PFX+'-mh" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10z" fill="#FFF04D"/></marker></defs>';
    s+='<ellipse cx="80" cy="212" rx="62" ry="158" fill="#1C2130" stroke="#C9D1E0" stroke-width="3"/><ellipse cx="300" cy="212" rx="62" ry="158" fill="#1C2130" stroke="#C9D1E0" stroke-width="3"/>';
    s+='<text x="80" y="38" text-anchor="middle" font-size="30" fill="#C9D1E0"'+FONT+'>x</text><text x="300" y="38" text-anchor="middle" font-size="30" fill="#C9D1E0"'+FONT+'>y</text>';
    P.forEach(function(p){ var y1=at(X,X.indexOf(p[0])), y2=at(Y,Y.indexOf(p[1]));
      s+='<line x1="116" y1="'+y1+'" x2="262" y2="'+y2+'" stroke="#FFF04D" stroke-width="4" marker-end="url(#'+PFX+'-mh)"/>'; });
    X.forEach(function(x,i){ s+='<text x="80" y="'+(at(X,i)+11)+'" text-anchor="middle" font-size="32" fill="#F2F4F8"'+FONT+'>'+num(x)+'</text>'; });
    Y.forEach(function(y,i){ s+='<text x="300" y="'+(at(Y,i)+11)+'" text-anchor="middle" font-size="32" fill="#F2F4F8"'+FONT+'>'+num(y)+'</text>'; });
    return svg(s,'Mapping diagram from x to y'); }

  /* graphs: window −6..6 like the slope graphs. A shape is its sampled points (drawn as a path, or as dots),
     plus a vertical line x = bad that hits it twice (non-functions), x-values whose vertical line does not,
     and a horizontal line y = flat that hits it twice when there is one (the horizontal-line trap). */
  function curve(f,t0,t1,step){ var a=[]; for(var t=t0*10;t<=t1*10;t+=step*10) a.push(f(t/10)); return a; }
  function ints(f){ return range(-5,5).filter(f); }
  var SHAPES={
    line:function(){ var m=pick([2,-2,1,-1,3,-3,0.5,-0.5]), b=ri(-3,3); return {path:curve(function(x){ return [x,m*x+b]; },-7,7,0.5),good:ints(function(){ return true; })}; },
    flat:function(){ var c=ri(-4,4); return {path:curve(function(x){ return [x,c]; },-7,7,0.5),good:ints(function(){ return true; })}; },
    para:function(){ var a=pick([1,-1,0.5,-0.5]), h=ri(-2,2), k=a>0?ri(-5,0):ri(0,5); return {path:curve(function(x){ return [x,a*(x-h)*(x-h)+k]; },-7,7,0.1),good:ints(function(){ return true; }),flat:k+a*4}; },
    abs:function(){ var a=pick([1,-1]), h=ri(-2,2), k=a>0?ri(-5,0):ri(0,5); return {path:curve(function(x){ return [x,a*Math.abs(x-h)+k]; },-7,7,0.1),good:ints(function(){ return true; }),flat:k+a*3}; },
    dots:function(){ var P=relation(true,5,5); return {dots:P,good:P.map(function(p){ return p[0]; }),flat:dupY(P)}; },
    vert:function(){ var c=ri(-4,4); return {path:curve(function(y){ return [c,y]; },-7,7,0.5),bad:c,good:ints(function(x){ return x!==c; })}; },
    side:function(){ var a=pick([1,-1,0.5,-0.5]), k=ri(-2,2), h=a>0?ri(-5,0):ri(0,5); return {path:curve(function(y){ return [a*(y-k)*(y-k)+h,y]; },-7,7,0.1),bad:h+a*4,good:ints(function(x){ return a>0?x<h:x>h; })}; },
    sideAbs:function(){ var a=pick([1,-1]), k=ri(-2,2), h=a>0?ri(-5,0):ri(0,5); return {path:curve(function(y){ return [a*Math.abs(y-k)+h,y]; },-7,7,0.1),bad:h+a*2,good:ints(function(x){ return a>0?x<h:x>h; })}; },
    circle:function(){ var r=ri(2,3), h=ri(-5+r,5-r), k=ri(-5+r,5-r), a=[]; for(var i=0;i<=120;i++){ var t=i*Math.PI/60; a.push([h+r*Math.cos(t),k+r*Math.sin(t)]); }
      return {path:a,bad:h+pick([-1,0,1]),good:ints(function(x){ return Math.abs(x-h)>r; }),flat:k}; },
    dotsNo:function(){ var P=relation(false,5,5), d=dupX(P); return {dots:P,bad:d,good:P.map(function(p){ return p[0]; }).filter(function(x){ return x!==d; }),flat:dupY(P)}; }
  };
  function gSVG(sh){ var S=380, u=S/12, X=function(x){ return ((x+6)*u).toFixed(1); }, Y=function(y){ return ((6-y)*u).toFixed(1); }, h='';
    for(var i=-6;i<=6;i++){ h+='<line x1="'+X(i)+'" y1="0" x2="'+X(i)+'" y2="'+S+'" stroke="#2A3142" stroke-width="2"/><line x1="0" y1="'+Y(i)+'" x2="'+S+'" y2="'+Y(i)+'" stroke="#2A3142" stroke-width="2"/>'; }
    h+='<line x1="0" y1="'+Y(0)+'" x2="'+S+'" y2="'+Y(0)+'" stroke="#C9D1E0" stroke-width="3"/><line x1="'+X(0)+'" y1="0" x2="'+X(0)+'" y2="'+S+'" stroke="#C9D1E0" stroke-width="3"/>';
    [-4,-2,2,4].forEach(function(n){ h+='<text x="'+X(n)+'" y="'+(+Y(0)+24)+'" text-anchor="middle" font-size="20" fill="#9BA5B8"'+FONT+'>'+num(n)+'</text>'+
      '<text x="'+(+X(0)-8)+'" y="'+(+Y(n)+7)+'" text-anchor="end" font-size="20" fill="#9BA5B8"'+FONT+'>'+num(n)+'</text>'; });
    h+='<text x="'+(S-8)+'" y="'+(+Y(0)-10)+'" text-anchor="end" font-size="22" fill="#C9D1E0"'+FONT+'>x</text><text x="'+(+X(0)+10)+'" y="22" font-size="22" fill="#C9D1E0"'+FONT+'>y</text>';
    if(sh.path) h+='<path d="M'+sh.path.map(function(p){ return X(p[0])+' '+Y(p[1]); }).join('L')+'" fill="none" stroke="#FF4B4B" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>';
    (sh.dots||[]).forEach(function(p){ h+='<circle cx="'+X(p[0])+'" cy="'+Y(p[1])+'" r="10" fill="#FFF04D" stroke="#0E1016" stroke-width="3"/>'; });
    return '<svg class="'+PFX+'-graph" width="'+S+'" height="'+S+'" viewBox="0 0 '+S+' '+S+'" role="img" aria-label="Graph">'+h+'</svg>'; }
  /* the checks read only what is drawn inside the window. vlt: does any x carry two different y's?
     hits(a): how many times the vertical line x = a meets the drawing (a segment lying on it counts as many). */
  function inWin(sh){ return (sh.path||sh.dots).filter(function(p){ return Math.abs(p[0])<=6&&Math.abs(p[1])<=6; }); }
  function vlt(sh){ var seen={}, pts=inWin(sh);
    for(var i=0;i<pts.length;i++){ var k=pts[i][0].toFixed(5), y=pts[i][1]; if(seen[k]!==undefined&&Math.abs(seen[k]-y)>0.05) return false; if(seen[k]===undefined) seen[k]=y; }
    return true; }
  function hits(sh,a){ var pts=inWin(sh), n=0;
    if(sh.dots) return pts.filter(function(p){ return p[0]===a; }).length;
    for(var i=0;i<pts.length;i++){ var d=pts[i][0]-a; if(Math.abs(d)<1e-9) n++; else if(i+1<pts.length){ var e=pts[i+1][0]-a; if(Math.abs(e)>=1e-9&&d*e<0) n++; } }
    return n; }

  function graphQ(fn){ var sh=SHAPES[pick(fn?['line','flat','para','para','abs','abs','dots']:['vert','side','side','sideAbs','circle','circle','dotsNo'])](), g=shuffle(sh.good.slice());
    var W_G=function(x){ return 'The vertical line x = '+num(x)+' doesn’t hit it twice.'; }, W_F='That’s a horizontal line. Test with vertical lines.';
    var trap= sh.flat!==undefined&&sh.flat!==null&&Math.abs(sh.flat)<=5? noY(sh.flat,W_F) : null, ch;
    if(fn) ch=[ C(YES,{fn:1}), noX(g[0],W_G(g[0])), noX(g[1],W_G(g[1])), trap||noX(g[2],W_G(g[2])) ];
    else { if(!g.length||Math.abs(sh.bad)>5) return null;
      ch=[ noX(sh.bad), C(YES,{fn:1},'Some vertical line hits it twice.'), noX(g[0],W_G(g[0])), trap||(g[1]!==undefined?noX(g[1],W_G(g[1])):null) ]; if(!ch[3]) return null; }
    return { topic:'Functions', prompt:'Is the graph a function?'+ASK, visual:gSVG(sh), data:{sh:sh}, choices:ch,
      check:function(v){ if(v.fn) return vlt(sh); if(v.x!==undefined) return hits(sh,v.x)>1; return false; },
      explain: fn? 'No vertical line hits it twice, so it <b>is</b> a function.' : 'The vertical line x = <span class="c-ans">'+num(sh.bad)+'</span> hits it twice, so it is <b>not</b> a function.' }; }

  var GEN={
  fnPoints:function(){ var P=relation(Math.random()<0.5,ri(4,5));
    return relQ(P,'Is it a function?'+ASK+' <span class="c-pt">{'+P.map(function(p){ return pt(p[0],p[1]); }).join(', ')+'}</span>'); },
  fnTable:function(){ var P=relation(Math.random()<0.5,ri(4,5)); return relQ(P,'Is the table a function?'+ASK,tableSVG(P)); },
  fnMap:function(){ var P=relation(Math.random()<0.5,4); return relQ(P,'Is the mapping a function?'+ASK,mapSVG(P)); },
  fnGraph:function(){ return graphQ(Math.random()<0.5); }
  };
  function build(type){ for(var tries=0;tries<300;tries++){ var q=GEN[type](); if(!q) continue;
      var keys=q.choices.map(function(c){ return c.key; }); if(new Set(keys).size!==4) continue;
      if(!q.check(q.choices[0].val)) continue;                                                  // the answer must pass the independent check
      if(q.choices.slice(1).some(function(c){ return q.check(c.val); })) continue;              // and no distractor may pass it
      q.type=type; q.choices.forEach(function(c,i){ c.ok=i===0; });
      for(var i=3;i>0;i--){ var j=Math.floor(Math.random()*(i+1)), t=q.choices[i]; q.choices[i]=q.choices[j]; q.choices[j]=t; }
      q.visual=q.visual||''; delete q.check; return q; } throw new Error('generator failed: '+type); }
  return { build:build }; }

function makeInt(PFX){
  /* ================= QUESTION GENERATOR: integers =================
     Adding and subtracting integers from 1 to 100 (either sign), and multiplying signed facts to 12.
     Prompts sit in a span that is at most 80px tall, so "−100 − (−100) = ?" fits the facts games' one-line prompt. */
  var MINUS='−';
  function ri(a,b){ return a+Math.floor(Math.random()*(b-a+1)); }
  function num(n){ return n<0? MINUS+(-n) : ''+n; }
  function par(n){ return n<0? '('+num(n)+')' : ''+n; }
  function C(html,val,why){ return {html:html,val:val,why:why||'',key:html}; }
  function eq(h){ return '<span class="'+PFX+'-eq" style="font-size:clamp(56px,1em,80px);white-space:nowrap">'+h+'</span>'; }
  function eqS(h){ return '<span class="'+PFX+'-eq">'+h+'</span>'; }
  function signed(lo,hi){ var v=ri(lo,hi); return Math.random()<0.5? -v : v; }
  /* at least one negative most of the time: that is the skill */
  function pair(lo,hi){ var a=signed(lo,hi), b=signed(lo,hi); if(a>0&&b>0&&Math.random()<0.8){ if(Math.random()<0.5) a=-a; else b=-b; } return [a,b]; }
  function choices(ans,cands){ var ch=[C(num(ans),ans)], seen={}; seen[ans]=1;
    cands.forEach(function(c){ if(ch.length<4&&!seen[c[0]]&&Math.abs(c[0])<=200){ seen[c[0]]=1; ch.push(C(num(c[0]),c[0],c[1])); } }); return ch; }
  /* the rule, ending on the answer: "Different signs: 82 − 47 = 35, keep the sign of −82: −35." */
  function addRule(a,b){ var A=Math.abs(a), B=Math.abs(b), s='<span class="c-ans">'+num(a+b)+'</span>.';
    if((a<0)===(b<0)) return 'Same signs: add '+A+' + '+B+' = '+(A+B)+' and keep the sign: '+s;
    return 'Different signs: '+Math.max(A,B)+' − '+Math.min(A,B)+' = '+Math.abs(a+b)+', keep the sign of '+num(A>B?a:b)+': '+s; }
  var GEN={
  intAdd:function(){ var p=pair(1,100), a=p[0], b=p[1], s=a+b, A=Math.abs(a), B=Math.abs(b), big=A>B?a:b; if(A===B) return null;
    var same=(a<0)===(b<0), wrongWay=same? (a<0?-1:1)*Math.abs(A-B) : (big<0?-1:1)*(A+B);
    return { topic:'Adding integers', prompt:eq(num(a)+' + '+par(b)+' = ?'), data:{a:a,b:b},
      check:function(v){ return v-b===a; },                                                       /* undo the addition */
      choices:choices(s,[[-s,'Check the sign.'],[wrongWay,same?'Same signs: add the sizes.':'Different signs: subtract the sizes.'],
        [-wrongWay,same?'Same signs: add the sizes and keep the sign.':'Different signs: subtract the sizes.'],[s+(Math.random()<0.5?10:-10),'Check your regrouping.']]),
      explain:addRule(a,b) }; },
  intSub:function(){ var p=pair(1,100), a=p[0], b=p[1], d=a-b; if(Math.abs(a)===Math.abs(b)) return null;
    return { topic:'Subtracting integers', prompt:eq(num(a)+' − '+par(b)+' = ?'), data:{a:a,b:b},
      check:function(v){ return v+b===a; },                                                       /* undo the subtraction */
      choices:choices(d,[[a+b,'Subtracting means adding the opposite.'],[-d,'Check the sign.'],[-(a+b),'Add the opposite first, then use the sign rules.'],
        [d+(Math.random()<0.5?10:-10),'Check your regrouping.']]),
      explain:'Add the opposite: '+eqS(num(a)+' − '+par(b)+' = '+num(a)+' + '+par(-b)+' = <span class="c-ans">'+num(d)+'</span>')+'.' }; },
  intMul:function(){ var p=pair(2,12), a=p[0], b=p[1], m=a*b, A=Math.abs(a), B=Math.abs(b), sg=m<0?-1:1, n=sg*[(A+1)*B,A*(B+1),(A-1)*B,A*(B-1)][ri(0,3)];
    var rule=(a<0)===(b<0)? 'Same signs give a positive.' : 'Different signs give a negative.';
    return { topic:'Multiplying integers', prompt:eq(num(a)+' × '+par(b)+' = ?'), data:{a:a,b:b},
      check:function(v){ var t=0; for(var i=0;i<A;i++) t+=b; return v===(a<0?-t:t); },          /* repeated addition, separate from a*b */
      choices:choices(m,[[-m,'Check the sign. '+rule],[n,'Check the fact: '+A+' × '+B+' = '+(A*B)+'.'],[-n,'Check the fact and the sign.'],[a+b,'You added. This problem multiplies.']]),
      explain:rule+' '+A+' × '+B+' = '+(A*B)+', so '+eqS(num(a)+' × '+par(b)+' = <span class="c-ans">'+num(m)+'</span>')+'.' }; }
  };
  function build(type){ for(var tries=0;tries<400;tries++){ var q=GEN[type](); if(!q||q.choices.length!==4) continue;
      if(!q.check(q.choices[0].val)) continue;                                                  // the answer must pass the independent check
      if(q.choices.slice(1).some(function(c){ return q.check(c.val); })) continue;              // and no distractor may pass it
      q.type=type; q.choices.forEach(function(c,i){ c.ok=i===0; }); q.choices.sort(function(x,y){ return x.val-y.val; });   // smallest to largest, quick to scan
      q.visual=''; delete q.check; return q; } throw new Error('generator failed: '+type); }
  return { build:build }; }

function makeSq(PFX){
  /* ================= QUESTION GENERATOR: squares & square roots =================
     Squaring 1–15, square roots of perfect squares to 225, negative bases ((−7)² vs −7²), and estimating
     a square root between two whole numbers. Prompts are short, like the facts, so the set keeps the one-line prompt. */
  var MINUS='−';
  function ri(a,b){ return a+Math.floor(Math.random()*(b-a+1)); }
  function num(n){ return n<0? MINUS+(-n) : ''+n; }
  function C(html,val,why){ return {html:html,val:val,why:why||'',key:html}; }
  function eq(h,max){ return '<span class="'+PFX+'-eq" style="font-size:clamp(48px,1em,'+(max||80)+'px);white-space:nowrap">'+h+'</span>'; }
  function eqS(h){ return '<span class="'+PFX+'-eq">'+h+'</span>'; }
  function rt(n){ return '√<span style="text-decoration:overline">'+n+'</span>'; }
  function ans(h){ return '<span class="c-ans">'+h+'</span>'; }
  function times(a,b){ var t=0; for(var i=0;i<Math.abs(a);i++) t+=b; return a<0?-t:t; }          /* repeated addition, separate from a*b */
  /* wrong answers in plausibility order, with a random number of them below the answer: choices are sorted
     smallest to largest, so this keeps the right answer from always sitting in the same spot */
  function spread(a,cands,min){ var lo=[], hi=[], seen={}; seen[a]=1;
    cands.forEach(function(c){ if(c[0]<min||seen[c[0]]) return; seen[c[0]]=1; (c[0]<a?lo:hi).push(c); });
    var k=Math.floor(Math.random()*4), out=lo.slice(0,k); out=out.concat(hi.slice(0,3-out.length)); return out.concat(lo.slice(k,k+3-out.length)); }
  function choices(a,cands,label){ label=label||num; var ch=[C(label(a),a)], seen={}; seen[a]=1;
    cands.forEach(function(c){ if(ch.length<4&&!seen[c[0]]&&c[0]>=0){ seen[c[0]]=1; ch.push(C(label(c[0]),c[0],c[1])); } }); return ch; }
  var GEN={
  sqSquare:function(){ var n=ri(2,15), s=n*n;
    return { topic:'Squaring', prompt:eq(n+'² = ?'), data:{n:n},
      check:function(v){ return v===times(n,n); },
      choices:choices(s,spread(s,[[2*n,n+'² means '+n+' × '+n+', not '+n+' × 2.'],[(n+1)*(n+1),'That is '+(n+1)+'².'],[(n-1)*(n-1),'That is '+(n-1)+'².'],
        [n*(n+1),'That is '+n+' × '+(n+1)+'.'],[n*(n-1),'That is '+n+' × '+(n-1)+'.'],[s+10,'Check the multiplication.'],[s-10,'Check the multiplication.'],[n+2,n+'² means '+n+' × '+n+'.']],1)),
      explain:n+'² means '+n+' × '+n+' = '+ans(s)+'.' }; },
  sqRoot:function(){ var n=ri(2,15), s=n*n;
    return { topic:'Square roots', prompt:eq(rt(s)+' = ?'), data:{n:n},
      check:function(v){ return v>=0 && times(v,v)===s; },                                     /* the positive number that times itself makes s */
      choices:choices(n,spread(n,[[Math.round(s/2),'Square root doesn’t mean half. Find the number that times itself makes '+s+'.']].concat([1,-1,2,-2,-3].map(function(d){ var k=n+d; return [k,'Check: '+k+' × '+k+' = '+(k*k)+'.']; })),1)),
      explain:rt(s)+' asks what number times itself makes '+s+': '+n+' × '+n+' = '+s+', so '+eqS(rt(s)+' = '+ans(n))+'.' }; },
  sqNeg:function(){ var n=ri(2,12), s=n*n, paren=Math.random()<0.6, a=paren?s:-s;
    var p=paren? '('+num(-n)+')²' : num(-n)+'²', sg=paren?1:-1, k=n+(Math.random()<0.5?1:-1);
    var third= Math.random()<0.34? C(num(-sg*2*n),-sg*2*n,'Squaring means times itself, not times 2. Then check the sign.') : C(num(sg*k*k),sg*k*k,'That is '+(paren?'':MINUS)+k+'².');
    return { topic:'Negatives', prompt:eq(p+' = ?'), data:{n:n,paren:paren},
      check:function(v){ return v===(paren? times(-n,-n) : -times(n,n)); },
      choices:[ C(num(a),a), C(num(-a),-a, paren? 'The negative is inside the parentheses, so it gets squared too.' : 'No parentheses: square '+n+' first, then put the negative in front.'),
        C(num(sg*2*n),sg*2*n,'Squaring means times itself, not times 2.'), third ],
      explain: paren? 'The negative is inside: ('+num(-n)+')('+num(-n)+') = '+ans(num(s))+'.' : 'Square first, then the negative: '+MINUS+'('+n+' × '+n+') = '+ans(num(-s))+'.' }; },
  sqEst:function(){ var lo=ri(2,14), N=ri(lo*lo+1,(lo+1)*(lo+1)-1), half=Math.floor(N/2);
    function lab(k){ return k+' and '+(k+1); }
    return { topic:'Estimating roots', prompt:eq(rt(N)+' is between',62), data:{N:N},
      check:function(v){ return times(v,v)<N && N<times(v+1,v+1); },
      choices:choices(lo,spread(lo,[[half,'That is about half of '+N+'. Compare '+N+' to perfect squares.']].concat([1,-1,2,-2,-3].map(function(d){ var k=lo+d;
        return [k, d>0? k+'² = '+(k*k)+', which is more than '+N+'.' : (k+1)+'² = '+((k+1)*(k+1))+' is still under '+N+', so go higher.']; })),1),lab),
      explain:lo+'² = '+(lo*lo)+' and '+(lo+1)+'² = '+((lo+1)*(lo+1))+'. '+N+' is between them, so '+rt(N)+' is between '+ans(lab(lo))+'.' }; }
  };
  function build(type){ for(var tries=0;tries<400;tries++){ var q=GEN[type](); if(!q||q.choices.length!==4) continue;
      if(new Set(q.choices.map(function(c){ return c.key; })).size!==4) continue;
      if(!q.check(q.choices[0].val)) continue;                                                  // the answer must pass the independent check
      if(q.choices.slice(1).some(function(c){ return q.check(c.val); })) continue;              // and no distractor may pass it
      q.type=type; q.choices.forEach(function(c,i){ c.ok=i===0; }); q.choices.sort(function(x,y){ return x.val-y.val; });   // smallest to largest, quick to scan
      q.visual=''; delete q.check; return q; } throw new Error('generator failed: '+type); }
  return { build:build }; }

function makePlot(PFX,withB){
  /* ================= QUESTION GENERATOR: graphing slope-intercept lines =================
     withB false: y = mx (through the origin). withB true: y = mx + b with b ≠ 0.
     Pick the line that matches the equation, read the equation off a graph, plot it (start point and rise/run move),
     and points on the line. Graphs use the same 380×380 -graph box as the slope set, so they fit every game. */
  var MINUS='−';
  function gcd(a,b){ a=Math.abs(a); b=Math.abs(b); while(b){ var t=a%b; a=b; b=t; } return a; }
  function R(n,d){ if(d<0){ n=-n; d=-d; } var g=gcd(n,d)||1; return {n:n/g,d:d/g}; }
  function ri(a,b){ return a+Math.floor(Math.random()*(b-a+1)); }
  function nz(a,b){ var v; do{ v=ri(a,b); }while(v===0); return v; }
  function pick(a){ return a[Math.floor(Math.random()*a.length)]; }
  function shuffle(a){ for(var i=a.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)), t=a[i]; a[i]=a[j]; a[j]=t; } return a; }
  function num(n){ return n<0? MINUS+(-n) : ''+n; }
  function frac(n,d){ return '<span class="'+PFX+'-fr"><span>'+n+'</span><span>'+d+'</span></span>'; }
  function fmtR(r){ if(r.d===1) return num(r.n); return (r.n<0?MINUS:'')+frac(Math.abs(r.n),r.d); }
  function coef(r,v){ if(r.d===1&&r.n===1) return v; if(r.d===1&&r.n===-1) return MINUS+v; return fmtR(r)+v; }
  function sgnR(r){ return r.n>0? ' + '+fmtR(r) : r.n<0? ' '+MINUS+' '+fmtR(R(-r.n,r.d)) : ''; }
  function pt(x,y){ return '('+num(x)+', '+num(y)+')'; }
  function rEq(a,b){ return a.n*b.d===b.n*a.d; }
  function C(html,val,why){ return {html:html,val:val,why:why||'',key:html}; }
  function eq(h){ return '<span class="'+PFX+'-eq">'+h+'</span>'; }
  function yeq(m,b){ return 'y = '+coef(m,'x')+sgnR(b||R(0,1)); }
  function M(r){ return '<span class="c-m">'+fmtR(r)+'</span>'; }
  function B(v){ return '<span class="c-b">'+v+'</span>'; }
  function lc(s){ return s.charAt(0).toLowerCase()+s.slice(1); }
  var FONT=' font-family="Inter,sans-serif" font-weight="800"';
  var SLOPES=[2,-2,3,-3,4,-4].map(function(n){ return R(n,1); }).concat(
    [[1,2],[-1,2],[1,3],[-1,3],[2,3],[-2,3],[3,2],[-3,2],[3,4],[-3,4]].map(function(a){ return R(a[0],a[1]); }));
  function move(r){ return (r.n>0?'Up ':'Down ')+Math.abs(r.n)+', right '+r.d; }
  function newB(){ return withB? nz(-4,4) : 0; }
  var START=withB? 'the y-intercept' : '(0, 0)';

  /* grid −6..6. Each line {m,b,col,label}; a label sits on its line near the right edge of what is visible. */
  var COLS=['#FF4B4B','#3DE0FF','#FFF04D','#FF8BD8'];
  /* labels: for each line, the visible spot farthest from the other lines and labels (so a label never sits on a crossing) */
  function dist(L,p){ var k=L.m.n/L.m.d; return Math.abs(k*p[0]-p[1]+L.b)/Math.sqrt(k*k+1); }
  function place(lines){ var spots=[];
    lines.forEach(function(L){ var k=L.m.n/L.m.d, best=null, bs=-1;
      for(var x=-4.6;x<=4.61;x+=0.1){ var p=[x,k*x+L.b]; if(Math.abs(p[1])>4.6) continue;
        var sc=Math.min.apply(null,lines.filter(function(o){ return o!==L; }).map(function(o){ return dist(o,p); }).concat(spots.map(function(q){ return Math.hypot(q[0]-p[0],q[1]-p[1])/1.6; })).concat([9]));
        if(sc>bs){ bs=sc; best=p; } }
      spots.push(best); L.at=best; L.room=bs; }); }
  function gSVG(lines,dots){ var S=380, u=S/12, X=function(x){ return ((x+6)*u).toFixed(1); }, Y=function(y){ return ((6-y)*u).toFixed(1); }, h='';
    for(var i=-6;i<=6;i++){ h+='<line x1="'+X(i)+'" y1="0" x2="'+X(i)+'" y2="'+S+'" stroke="#2A3142" stroke-width="2"/><line x1="0" y1="'+Y(i)+'" x2="'+S+'" y2="'+Y(i)+'" stroke="#2A3142" stroke-width="2"/>'; }
    h+='<line x1="0" y1="'+Y(0)+'" x2="'+S+'" y2="'+Y(0)+'" stroke="#C9D1E0" stroke-width="3"/><line x1="'+X(0)+'" y1="0" x2="'+X(0)+'" y2="'+S+'" stroke="#C9D1E0" stroke-width="3"/>';
    [-4,-2,2,4].forEach(function(n){ h+='<text x="'+X(n)+'" y="'+(+Y(0)+24)+'" text-anchor="middle" font-size="20" fill="#9BA5B8"'+FONT+'>'+num(n)+'</text>'+
      '<text x="'+(+X(0)-8)+'" y="'+(+Y(n)+7)+'" text-anchor="end" font-size="20" fill="#9BA5B8"'+FONT+'>'+num(n)+'</text>'; });
    lines.forEach(function(L){ var k=L.m.n/L.m.d;
      h+='<line x1="'+X(-7)+'" y1="'+Y(-7*k+L.b)+'" x2="'+X(7)+'" y2="'+Y(7*k+L.b)+'" stroke="'+L.col+'" stroke-width="5" stroke-linecap="round"/>'; });
    lines.forEach(function(L){ if(!L.label) return; var p=L.at;
      h+='<circle cx="'+X(p[0])+'" cy="'+Y(p[1])+'" r="17" fill="#0E1016" stroke="'+L.col+'" stroke-width="4"/><text x="'+X(p[0])+'" y="'+(+Y(p[1])+8)+'" text-anchor="middle" font-size="22" fill="'+L.col+'"'+FONT+'>'+L.label+'</text>'; });
    (dots||[]).forEach(function(p){ h+='<circle cx="'+X(p[0])+'" cy="'+Y(p[1])+'" r="9" fill="#FFF04D" stroke="#0E1016" stroke-width="3"/>'; });
    return '<svg class="'+PFX+'-graph" width="'+S+'" height="'+S+'" viewBox="0 0 '+S+' '+S+'" role="img" aria-label="Graph of lines">'+h+'</svg>'; }
  /* every label must be visible and clear of the others */
  function roomy(lines){ place(lines); return lines.every(function(L){ return L.at&&L.room>=0.8; }); }
  function same(a,b){ return rEq(a.m,b.m)&&a.b===b.b; }

  var GEN={
  plotMatch:function(){ var m=pick(SLOPES), b=newB(), ok={m:m,b:b}, set=[ok,{m:R(-m.n,m.d),b:b},{m:R(m.d,m.n),b:b}];
    set.push(withB? {m:m,b:-b} : {m:R(m.n+(m.n>0?1:-1)*m.d,m.d),b:0});
    if(set.some(function(s,i){ return set.some(function(t,j){ return j<i&&same(s,t); }); })) return null;
    var order=shuffle([0,1,2,3]), L='ABCD', lines=[], idx=[];
    order.forEach(function(k,pos){ lines.push({m:set[k].m,b:set[k].b,col:COLS[pos],label:L[pos]}); idx[k]=pos; });
    if(!roomy(lines)) return null;
    var how='Start at '+(withB?pt(0,b):'(0, 0)')+' and go '+lc(move(m))+'.';
    var why={1:'That line goes the other way.', 2:'That line has rise and run flipped.', 3: withB? 'That line crosses the y-axis at '+num(-b)+'.' : 'Check the steepness.'};
    return { topic:'Pick the line', prompt:'Which line is '+eq(yeq(m,R(b,1)))+'?', visual:gSVG(lines), data:{m:m,b:b}, keepOrder:true,
      check:function(v){ var s=lines[v.i]; return s.m.n*m.d===m.n*s.m.d && s.b===b; },                /* the labeled line has slope m and crosses at b */
      choices:[0,1,2,3].map(function(k){ return C('Line '+L[idx[k]],{i:idx[k]},k?why[k]:''); }),
      explain:how+' That’s <span class="c-ans">Line '+L[idx[0]]+'</span>.' }; },
  plotEq:function(){ var m=pick(SLOPES), b=newB(); if(Math.abs(b+m.n)>5) return null;
    var c4= withB? (m.d===1&&Math.abs(m.n)!==Math.abs(b)? C(yeq(R(b,1),m),{m:R(b,1),b:m},'Swapped: the slope goes with x.') : C(yeq(m,R(-b,1)),{m:m,b:R(-b,1)},'Check where it crosses the y-axis.'))
                 : C('y = x + '+(m.d===1?Math.abs(m.n):frac(Math.abs(m.n),m.d)),{m:R(1,1),b:R(Math.abs(m.n),m.d)},'It goes through (0, 0), so b = 0.');
    return { topic:'Write the equation', prompt:'Which equation matches the line?', visual:gSVG([{m:m,b:b,col:COLS[0]}],[[0,b],[m.d,b+m.n]]), data:{m:m,b:b},
      check:function(v){ return rEq(v.m,R((b+m.n)-b,m.d)) && rEq(v.b,R(b,1)); },                     /* slope between the dots, and where it crosses x = 0 */
      choices:[ C(yeq(m,R(b,1)),{m:m,b:R(b,1)}), C(yeq(R(-m.n,m.d),R(b,1)),{m:R(-m.n,m.d),b:R(b,1)},m.n>0?'Uphill means a positive slope.':'Downhill means a negative slope.'),
        C(yeq(R(m.d,m.n),R(b,1)),{m:R(m.d,m.n),b:R(b,1)},'That is run over rise.'), c4 ],
      explain:(withB?'b = '+B(num(b))+', ':'')+'slope = '+M(m)+' ('+lc(move(m))+').' }; },
  plotSteps:function(){ var m=pick(SLOPES), b=newB(); if(Math.abs(m.n)===m.d) return null;
    var E=eq(yeq(m,R(b,1)));
    if(withB&&Math.random()<0.4){                                                                   /* where does the graph start? */
      return { topic:'Plot it', prompt:'To graph '+E+', which point do you plot first?', data:{m:m,b:b},
        check:function(v){ return v.x===0 && v.y===b; },                                               /* the y-intercept: x = 0 */
        choices:[ C(pt(0,b),{x:0,y:b}), C(pt(b,0),{x:b,y:0},'That point is on the x-axis.'),
          C(pt(0,-b),{x:0,y:-b},'Keep b’s sign: b = '+num(b)+'.'), C(pt(m.d,m.n),{x:m.d,y:m.n},'That comes from the slope. Plot b first.') ],
        explain:'Start at b: <span class="c-ans">'+pt(0,b)+'</span>.' }; }
    function mv(r,u,why){ return C((r>0?'Up ':'Down ')+Math.abs(r)+', right '+u,{rise:r,run:u},why); }
    return { topic:'Plot it', prompt:'Graph '+E+'. Start at '+(withB?pt(0,b):'(0, 0)')+'. Which move gets to the next point?', data:{m:m,b:b},
      check:function(v){ return v.rise*m.d===m.n*v.run; },                                            /* rise/run equals m */
      choices:[ mv(m.n,m.d), mv(-m.n,m.d,'Check the sign.'),
        mv(m.n>0?m.d:-m.d,Math.abs(m.n),'Rise is the top, run is the bottom.'), mv(m.n>0?-m.d:m.d,Math.abs(m.n),'Rise over run, with the sign.') ],
      explain:'Rise over run: '+lc(move(m))+', to <span class="c-ans">'+pt(m.d,b+m.n)+'</span>.' }; },
  plotPoint:function(){ var m=pick(SLOPES), b=newB(), k=pick([1,1,2,-1]), x=m.d*k, y=m.n*k+b; if(Math.abs(y)>12||(withB&&y===m.n*k)) return null;
    return { topic:'Points on the line', prompt:'Which point is on '+eq(yeq(m,R(b,1)))+'?', data:{m:m,b:b},
      check:function(v){ return (v.y-b)*m.d===m.n*v.x; },                                             /* y − b = mx, cross-multiplied */
      choices:[ C(pt(x,y),{x:x,y:y}), C(pt(y,x),{x:y,y:x},'x and y are swapped.'),
        withB? C(pt(x,m.n*k),{x:x,y:m.n*k},'Don’t forget b.') : C(pt(x,-y),{x:x,y:-y},'Check the slope’s sign.'),
        withB? C(pt(x,m.n*k-b),{x:x,y:m.n*k-b},'Check b’s sign.') : C(pt(0,m.n),{x:0,y:m.n},'At x = 0, y is 0.') ],
      explain:'y = '+fmtR(m)+' · '+(x<0?'('+num(x)+')':num(x))+(withB?(b>0?' + '+b:' '+MINUS+' '+(-b)):'')+' = '+num(y)+': <span class="c-ans">'+pt(x,y)+'</span>.' }; }
  };
  function build(type){ for(var tries=0;tries<500;tries++){ var q=GEN[type](); if(!q) continue;
      if(new Set(q.choices.map(function(c){ return c.key; })).size!==4) continue;
      if(!q.check(q.choices[0].val)) continue;                                                  // the answer must pass the independent check
      if(q.choices.slice(1).some(function(c){ return q.check(c.val); })) continue;              // and no distractor may pass it
      q.type=type; q.choices.forEach(function(c,i){ c.ok=i===0; });
      if(q.keepOrder) q.choices.sort(function(a,b){ return a.val.i-b.val.i; });                // Line A, B, C, D
      else for(var i=3;i>0;i--){ var j=Math.floor(Math.random()*(i+1)), t=q.choices[i]; q.choices[i]=q.choices[j]; q.choices[j]=t; }
      delete q.keepOrder; q.visual=q.visual||''; delete q.check; return q; } throw new Error('generator failed: '+type); }
  return { build:build }; }
function makePlot0(PFX){ return makePlot(PFX,false); }
function makePlotB(PFX){ return makePlot(PFX,true); }

function makeFam(PFX){
  /* ================= QUESTION GENERATOR: function families =================
     Name the family from an equation or a graph: linear, quadratic or exponential. "None of these" is right now and then
     (absolute value, square root, cube, 1/x) so students check the shape instead of guessing among three.
     The answer is checked by numbers alone: constant differences (linear), constant second differences (quadratic),
     constant ratios (exponential), on two windows of x. */
  var MINUS='−';
  function ri(a,b){ return a+Math.floor(Math.random()*(b-a+1)); }
  function nz(a,b){ var v; do{ v=ri(a,b); }while(v===0); return v; }
  function pick(a){ return a[Math.floor(Math.random()*a.length)]; }
  function num(n){ return n<0? MINUS+(-n) : ''+n; }
  function sgn(v){ return v>0? ' + '+v : v<0? ' '+MINUS+' '+(-v) : ''; }
  function cx(c,v){ return c===1? v : c===-1? MINUS+v : num(c)+v; }
  function frac(n,d){ return '<span class="'+PFX+'-fr"><span>'+n+'</span><span>'+d+'</span></span>'; }
  function C(html,val,why){ return {html:html,val:val,why:why||'',key:html}; }
  function eq(h){ return '<span class="'+PFX+'-eq">'+h+'</span>'; }
  function sup(h){ return '<sup>'+h+'</sup>'; }
  var FONT=' font-family="Inter,sans-serif" font-weight="800"';
  var FAM=['lin','quad','exp','none'], LABEL={lin:'Linear',quad:'Quadratic',exp:'Exponential',none:'None of these'};

  /* each maker returns {f, html, kind} — kind only picks the explanation; the check never reads it */
  var MAKE={
    lin:[ function(){ var m=nz(-5,5), b=nz(-9,9); return {f:function(x){ return m*x+b; }, html:'y = '+cx(m,'x')+sgn(b), kind:'line'}; },
          function(){ var m=nz(-4,4), b=nz(-9,9); return {f:function(x){ return b+m*x; }, html:'y = '+num(b)+(m>0?' + ':' '+MINUS+' ')+cx(Math.abs(m),'x'), kind:'line'}; },
          function(){ var d=pick([2,3,4]), n=pick([1,-1,3,-3]), b=nz(-6,6); if(Math.abs(n)===d) return null; return {f:function(x){ return n*x/d+b; }, html:'y = '+(n<0?MINUS:'')+frac(Math.abs(n),d)+'x'+sgn(b), kind:'line'}; },
          function(){ var m=pick([2,3,4,5,10]); return {f:function(x){ return m*x; }, html:'y = '+m+'x', kind:'line'}; } ],
    quad:[ function(){ var a=nz(-3,3), c=nz(-9,9); return {f:function(x){ return a*x*x+c; }, html:'y = '+cx(a,'x'+sup(2))+sgn(c), kind:'para'}; },
           function(){ var a=nz(-2,3), b=nz(-6,6), c=nz(-9,9); return {f:function(x){ return a*x*x+b*x+c; }, html:'y = '+cx(a,'x'+sup(2))+(b>0?' + ':' '+MINUS+' ')+cx(Math.abs(b),'x')+sgn(c), kind:'para'}; },
           function(){ var a=pick([1,-1,2]), h=nz(-5,5), k=nz(-9,9); return {f:function(x){ return a*(x-h)*(x-h)+k; }, html:'y = '+(a===1?'':a===-1?MINUS:a)+'(x'+sgn(-h)+')'+sup(2)+sgn(k), kind:'para'}; },
           function(){ var p=nz(-6,6); return {f:function(x){ return x*(x+p); }, html:'y = x(x'+sgn(p)+')', kind:'para'}; } ],
    exp:[ function(){ var a=pick([1,2,3,4,5,10]), b=pick([2,3,4,5]); return {f:function(x){ return a*Math.pow(b,x); }, html:'y = '+(a===1?'':a+'(')+b+(a===1?'':')')+sup('x'), kind:'grow'}; },
          function(){ var a=pick([2,4,8,10,50,100]); return {f:function(x){ return a*Math.pow(0.5,x); }, html:'y = '+a+'('+frac(1,2)+')'+sup('x'), kind:'decay'}; },
          function(){ var a=pick([100,200,500,1000]), r=pick(['1.05','1.1','0.9','0.8','1.5']); return {f:function(x){ return a*Math.pow(+r,x); }, html:'y = '+a+'('+r+')'+sup('x'), kind:+r>1?'grow':'decay'}; },
          function(){ var b=pick([2,3,5]); return {f:function(x){ return Math.pow(b,x); }, html:'y = '+b+sup('x'), kind:'grow'}; } ],
    none:[ function(){ var c=nz(-5,5); return {f:function(x){ return Math.abs(x)+c; }, html:'y = |x|'+sgn(c), kind:'abs'}; },
           function(){ var c=nz(-5,5); return {f:function(x){ return Math.sqrt(x)+c; }, html:'y = √<span style="text-decoration:overline">x</span>'+sgn(c), kind:'root'}; },
           function(){ var c=nz(-5,5); return {f:function(x){ return x*x*x+c; }, html:'y = x'+sup(3)+sgn(c), kind:'cube'}; },
           function(){ var k=pick([1,2,4,6]); return {f:function(x){ return k/x; }, html:'y = '+frac(k,'x'), kind:'inv'}; } ]
  };
  /* family by numbers alone; both windows must agree */
  function famOf(vals){ var d1=[], d2=[], r=[]; for(var i=1;i<vals.length;i++) d1.push(vals[i]-vals[i-1]); for(i=1;i<d1.length;i++) d2.push(d1[i]-d1[i-1]);
    for(i=1;i<vals.length;i++) r.push(vals[i-1]===0? NaN : vals[i]/vals[i-1]);
    function flat(a){ return a.every(function(v){ return isFinite(v)&&Math.abs(v-a[0])<1e-9*Math.max(1,Math.abs(a[0])); }); }
    if(flat(d1)&&Math.abs(d1[0])>1e-9) return 'lin'; if(flat(d2)&&Math.abs(d2[0])>1e-9) return 'quad'; if(flat(r)&&r[0]>0&&Math.abs(r[0]-1)>1e-9) return 'exp'; return 'none'; }
  function classify(f){ var out=null;
    [[-2,-1,0,1,2],[1,2,3,4,5]].forEach(function(xs){ var v=xs.map(f); if(!v.every(isFinite)) return; var t=famOf(v); out= out===null||out===t? t : 'none'; });
    return out||'none'; }

  var WHY={ lin:'Linear: x has power 1, a straight line.', quad:'Quadratic: it has x'+sup(2)+', a parabola.',
    exp:'Exponential: x is the exponent.', none:'It’s one of the three. Look at where x is.' };
  var EXPL={ line:'x has power 1: <b>linear</b>.', para:'The highest power of x is 2: <b>quadratic</b>.',
    grow:'x is the exponent: <b>exponential</b> growth.', decay:'x is the exponent: <b>exponential</b> decay.',
    abs:'Absolute value: <b>none of these</b>.', root:'Square root: <b>none of these</b>.', cube:'x has power 3: <b>none of these</b>.', inv:'x is in the denominator: <b>none of these</b>.' };
  var EXPLG={ line:'A straight line is <b>linear</b>.', para:'A U-shaped parabola is <b>quadratic</b>.', grow:'Flat near 0, then shoots up: <b>exponential</b> growth.',
    decay:'Drops fast, then flattens near 0: <b>exponential</b> decay.', abs:'A V shape: <b>none of these</b>.',
    root:'Starts at a point and bends: <b>none of these</b>.', cube:'Rises, flattens, rises: <b>none of these</b>.', inv:'Two separate pieces: <b>none of these</b>.' };

  function gSVG(f){ var S=380, u=S/12, X=function(x){ return ((x+6)*u).toFixed(1); }, Y=function(y){ return ((6-y)*u).toFixed(1); }, h='', segs=[], cur=[];
    for(var i=-6;i<=6;i++){ h+='<line x1="'+X(i)+'" y1="0" x2="'+X(i)+'" y2="'+S+'" stroke="#2A3142" stroke-width="2"/><line x1="0" y1="'+Y(i)+'" x2="'+S+'" y2="'+Y(i)+'" stroke="#2A3142" stroke-width="2"/>'; }
    h+='<line x1="0" y1="'+Y(0)+'" x2="'+S+'" y2="'+Y(0)+'" stroke="#C9D1E0" stroke-width="3"/><line x1="'+X(0)+'" y1="0" x2="'+X(0)+'" y2="'+S+'" stroke="#C9D1E0" stroke-width="3"/>';
    [-4,-2,2,4].forEach(function(n){ h+='<text x="'+X(n)+'" y="'+(+Y(0)+24)+'" text-anchor="middle" font-size="20" fill="#9BA5B8"'+FONT+'>'+num(n)+'</text>'+
      '<text x="'+(+X(0)-8)+'" y="'+(+Y(n)+7)+'" text-anchor="end" font-size="20" fill="#9BA5B8"'+FONT+'>'+num(n)+'</text>'; });
    for(var t=-700;t<=700;t+=4){ var x=t/100, y=f(x); if(isFinite(y)&&Math.abs(y)<9) cur.push(X(x)+' '+Y(y)); else if(cur.length){ segs.push(cur); cur=[]; } }
    if(cur.length) segs.push(cur);
    segs.forEach(function(s){ if(s.length>1) h+='<path d="M'+s.join('L')+'" fill="none" stroke="#FF4B4B" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>'; });
    return '<svg class="'+PFX+'-graph" width="'+S+'" height="'+S+'" viewBox="0 0 '+S+' '+S+'" role="img" aria-label="Graph of a function">'+h+'</svg>'; }
  /* graphs need the shape on screen: some of the curve inside the window, and a parabola's turn visible */
  function shows(g,fam){ var on=0; for(var x=-5;x<=5;x+=0.5){ var y=g.f(x); if(isFinite(y)&&Math.abs(y)<=5.5) on++; } if(on<6) return false;
    if(fam==='quad'){ var best=null; for(x=-5;x<=5;x+=0.25){ var v=g.f(x); if(best===null||Math.abs(g.f(x+0.25)-v)+Math.abs(v-g.f(x-0.25))<best[1]) best=[x,Math.abs(g.f(x+0.25)-v)+Math.abs(v-g.f(x-0.25))]; }
      return Math.abs(best[0])<=3&&Math.abs(g.f(best[0]))<=4; }                               /* the turn sits near the middle, so both arms show */
    return true; }

  function famQ(graph){ var fam=pick(['lin','lin','quad','quad','exp','exp','none']), g=pick(MAKE[fam])(); if(!g) return null;
    if(graph){ if(fam==='exp'&&(g.f(0)>3||g.f(0)<0.4)) return null; if(fam==='lin'&&Math.abs(g.f(1)-g.f(0))>3) return null; if(fam==='quad'&&Math.abs(g.f(1)+g.f(-1)-2*g.f(0))>4) return null; if(!shows(g,fam)) return null; }
    var order=[fam].concat(FAM.filter(function(k){ return k!==fam; }));
    return { topic:graph?'From the graph':'From the equation', prompt: graph? 'Which family is this function?' : 'Which family is '+eq(g.html)+'?',
      visual: graph? gSVG(g.f) : '', data:{fam:fam}, keepOrder:true,
      check:function(v){ return v.k===classify(g.f); },
      choices: order.map(function(k,i){ return C(LABEL[k],{k:k,i:FAM.indexOf(k)},i?(fam==='none'?'It isn’t '+LABEL[k].toLowerCase()+'. Check the shape.':k==='none'?WHY.none:WHY[fam]):''); }),
      explain:(graph?EXPLG:EXPL)[g.kind] }; }

  var GEN={ famEq:function(){ return famQ(false); }, famGraph:function(){ return famQ(true); } };
  function build(type){ for(var tries=0;tries<400;tries++){ var q=GEN[type](); if(!q) continue;
      if(!q.check(q.choices[0].val)) continue;                                                  // the answer must pass the independent check
      if(q.choices.slice(1).some(function(c){ return q.check(c.val); })) continue;              // and no distractor may pass it
      q.type=type; q.choices.forEach(function(c,i){ c.ok=i===0; });
      q.choices.sort(function(a,b){ return a.val.i-b.val.i; });                                 // always Linear, Quadratic, Exponential, None
      delete q.keepOrder; q.visual=q.visual||''; delete q.check; return q; } throw new Error('generator failed: '+type); }
  return { build:build }; }

function makeFindSlope(PFX){
  /* ================= QUESTION GENERATOR: finding slope =================
     From two points, a graph, a table, or an equation (slope-intercept or point-slope form).
     Every answer is a rational number; the check works the slope out a second, separate way. */
  var MINUS='−';
  function gcd(a,b){ a=Math.abs(a); b=Math.abs(b); while(b){ var t=a%b; a=b; b=t; } return a; }
  function R(n,d){ if(d<0){ n=-n; d=-d; } var g=gcd(n,d)||1; return {n:n/g,d:d/g}; }
  function ri(a,b){ return a+Math.floor(Math.random()*(b-a+1)); }
  function nz(a,b){ var v; do{ v=ri(a,b); }while(v===0); return v; }
  function pick(a){ return a[Math.floor(Math.random()*a.length)]; }
  function shuffle(a){ for(var i=a.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)), t=a[i]; a[i]=a[j]; a[j]=t; } return a; }
  function num(n){ return n<0? MINUS+(-n) : ''+n; }
  function frac(n,d){ return '<span class="'+PFX+'-fr"><span>'+n+'</span><span>'+d+'</span></span>'; }
  function fmtR(r){ if(r.d===1) return num(r.n); return (r.n<0?MINUS:'')+frac(Math.abs(r.n),r.d); }
  function coef(r,v){ if(r.d===1&&r.n===1) return v; if(r.d===1&&r.n===-1) return MINUS+v; return fmtR(r)+v; }
  function sgn(v){ return v>0? ' + '+v : v<0? ' '+MINUS+' '+(-v) : ''; }
  function pt(x,y){ return '('+num(x)+', '+num(y)+')'; }
  function rEq(a,b){ return a.n*b.d===b.n*a.d; }
  function C(html,val,why){ return {html:html,val:val,why:why||'',key:html}; }
  function eq(h){ return '<span class="'+PFX+'-eq">'+h+'</span>'; }
  function M(r){ return '<span class="c-m">'+fmtR(r)+'</span>'; }
  function P(x,y){ return '<span class="c-pt">'+pt(x,y)+'</span>'; }
  function par(n){ return n<0? '('+num(n)+')' : num(n); }
  var FONT=' font-family="Inter,sans-serif" font-weight="800"';
  var SLOPES=[1,-1,2,-2,3,-3,4,-4,5,-5].map(function(n){ return R(n,1); }).concat(
    [[1,2],[-1,2],[1,3],[-1,3],[2,3],[-2,3],[3,2],[-3,2],[3,4],[-3,4],[1,4],[-1,4],[2,5],[-2,5]].map(function(a){ return R(a[0],a[1]); }));
  /* the usual slips, with the slope itself first */
  function slips(m,extra){ var c=[[m,''],[R(-m.n,m.d),'Check the sign: '+(m.n>0?'y goes up as x goes right, so the slope is positive.':'y goes down as x goes right, so the slope is negative.')]];
    if(Math.abs(m.n)!==m.d) c.push([R(m.d,m.n),'That is run over rise. Slope = change in y ÷ change in x.']);
    c=c.concat(extra||[]); if(Math.abs(m.n)!==m.d) c.push([R(-m.d,m.n),'Flipped and the wrong sign. Slope = change in y ÷ change in x.']); var out=[], seen={};
    c.forEach(function(x){ var k=x[0].n+'/'+x[0].d; if(out.length<4&&!seen[k]&&x[0].d!==0){ seen[k]=1; out.push(C(fmtR(x[0]),x[0],x[1])); } }); return out; }

  function gridSVG(m,b,dots){ var S=380, u=S/12, X=function(x){ return ((x+6)*u).toFixed(1); }, Y=function(y){ return ((6-y)*u).toFixed(1); }, h='', k=m.n/m.d;
    for(var i=-6;i<=6;i++){ h+='<line x1="'+X(i)+'" y1="0" x2="'+X(i)+'" y2="'+S+'" stroke="#2A3142" stroke-width="2"/><line x1="0" y1="'+Y(i)+'" x2="'+S+'" y2="'+Y(i)+'" stroke="#2A3142" stroke-width="2"/>'; }
    h+='<line x1="0" y1="'+Y(0)+'" x2="'+S+'" y2="'+Y(0)+'" stroke="#C9D1E0" stroke-width="3"/><line x1="'+X(0)+'" y1="0" x2="'+X(0)+'" y2="'+S+'" stroke="#C9D1E0" stroke-width="3"/>';
    [-4,-2,2,4].forEach(function(n){ h+='<text x="'+X(n)+'" y="'+(+Y(0)+24)+'" text-anchor="middle" font-size="20" fill="#9BA5B8"'+FONT+'>'+num(n)+'</text>'+
      '<text x="'+(+X(0)-8)+'" y="'+(+Y(n)+7)+'" text-anchor="end" font-size="20" fill="#9BA5B8"'+FONT+'>'+num(n)+'</text>'; });
    h+='<line x1="'+X(-7)+'" y1="'+Y(-7*k+b)+'" x2="'+X(7)+'" y2="'+Y(7*k+b)+'" stroke="#FF4B4B" stroke-width="6" stroke-linecap="round"/>';
    dots.forEach(function(p){ h+='<circle cx="'+X(p[0])+'" cy="'+Y(p[1])+'" r="9" fill="#FFF04D" stroke="#0E1016" stroke-width="3"/>'; });
    return '<svg class="'+PFX+'-graph" width="'+S+'" height="'+S+'" viewBox="0 0 '+S+' '+S+'" role="img" aria-label="Graph of a line">'+h+'</svg>'; }
  function tableSVG(rows){ var n=rows.length, h=380/(n+1), s='<rect x="0" y="0" width="380" height="'+h+'" fill="#232838"/>';
    s+='<text x="95" y="'+(h/2+12)+'" text-anchor="middle" font-size="34" fill="#C9D1E0"'+FONT+'>x</text><text x="285" y="'+(h/2+12)+'" text-anchor="middle" font-size="34" fill="#C9D1E0"'+FONT+'>y</text>';
    rows.forEach(function(p,i){ var yy=(i+1)*h+h/2+11;
      s+='<text x="95" y="'+yy+'" text-anchor="middle" font-size="32" fill="#F2F4F8"'+FONT+'>'+num(p[0])+'</text><text x="285" y="'+yy+'" text-anchor="middle" font-size="32" fill="#F2F4F8"'+FONT+'>'+num(p[1])+'</text>'; });
    for(var i=1;i<=n;i++) s+='<line x1="0" y1="'+(i*h)+'" x2="380" y2="'+(i*h)+'" stroke="#343B4D" stroke-width="2"/>';
    s+='<line x1="190" y1="0" x2="190" y2="380" stroke="#343B4D" stroke-width="3"/>';
    return '<svg class="'+PFX+'-graph" width="380" height="380" viewBox="0 0 380 380" role="img" aria-label="Table of x and y values">'+s+'</svg>'; }

  var GEN={
  fsPoints:function(){ var x1=ri(-9,9), y1=ri(-9,9), x2=ri(-9,9), y2=ri(-9,9); if(x1===x2||y1===y2) return null;
    var m=R(y2-y1,x2-x1); if(m.d>6||Math.abs(m.n)>9) return null;
    var extra=[]; if(x1+x2!==0) extra.push([R(y1+y2,x1+x2),'Subtract the coordinates, don’t add them.']); extra.push([R(y2-y1,x1-x2),'Subtract in the same order on top and bottom.']);
    return { topic:'From two points', prompt:'What is the <span class="c-m">slope</span> of the line through '+P(x1,y1)+' and '+P(x2,y2)+'?', data:{m:m},
      check:function(v){ return rEq(v,R(y1-y2,x1-x2)); },                                            /* the other order gives the same slope */
      choices:slips(m,extra),
      explain:'Change in y ÷ change in x: '+eq('('+num(y2)+' − '+par(y1)+') ÷ ('+num(x2)+' − '+par(x1)+')')+' = '+num(y2-y1)+' ÷ '+num(x2-x1)+' = '+M(m)+'.' }; },
  fsGraph:function(){ var m=pick(SLOPES), x1=ri(-4,2), y1=ri(-4,4), x2=x1+m.d*(m.d===1?pick([1,2]):1), y2=y1+(x2-x1)*m.n/m.d; if(Math.abs(x2)>5||Math.abs(y2)>5) return null;
    var b=y1-m.n*x1/m.d;
    return { topic:'From a graph', prompt:'What is the <span class="c-m">slope</span> of the line?', visual:gridSVG(m,b,[[x1,y1],[x2,y2]]), data:{m:m},
      check:function(v){ return rEq(v,R(y2-y1,x2-x1)); },                                            /* rise and run between the two dots */
      choices:slips(m,[[R(y2-y1,1),'Divide the rise by the run.']]),
      explain:'From dot to dot: rise '+num(y2-y1)+', run '+(x2-x1)+'. Slope = '+M(m)+'.' }; },
  fsTable:function(){ var m=pick(SLOPES), dx=m.d*pick(m.d===1?[1,2,3]:[1,2]), b=ri(-6,6), x0=m.d===1?ri(-4,2):m.d*ri(-2,1), rows=[];
    for(var i=0;i<4;i++){ var x=x0+i*dx; rows.push([x,b+m.n*x/m.d]); } if(rows.some(function(r){ return r[1]!==Math.round(r[1])||Math.abs(r[1])>30||Math.abs(r[0])>20; })) return null;   /* whole numbers only */
    var dy=rows[1][1]-rows[0][1], extra=[]; if(dx!==1) extra.push([R(dy,1),'That is the change in y. Divide by the change in x, '+dx+'.']);
    return { topic:'From a table', prompt:'What is the <span class="c-m">slope</span> of the line in the table?', visual:tableSVG(rows), data:{m:m},
      check:function(v){ return rEq(v,R(rows[3][1]-rows[0][1],rows[3][0]-rows[0][0])); },              /* first row to last row */
      choices:slips(m,extra),
      explain:'Each row: y changes by '+num(dy)+' when x changes by '+dx+'. Slope = '+num(dy)+' ÷ '+dx+' = '+M(m)+'.' }; },
  fsEq:function(){ var m=pick(SLOPES); if(m.n===1&&m.d===1||m.n===-1&&m.d===1) return null;
    if(Math.random()<0.5){ var b=nz(-9,9); if(m.d===1&&Math.abs(m.n)===Math.abs(b)) return null;
      return { topic:'From an equation', prompt:'What is the <span class="c-m">slope</span> of '+eq('y = '+coef(m,'x')+sgn(b))+'?', data:{m:m},
        check:function(v){ return rEq(v,R((b*m.d+m.n)-b*m.d,m.d)); },                                /* y at x = 1 minus y at x = 0 */
        choices:slips(m,[[R(b,1),'That is b, the y-intercept. The slope is the number with x.']]),
        explain:'In y = mx + b, the slope is the number with x: '+M(m)+'.' }; }
    var h=nz(-9,9), k=nz(-9,9); if(Math.abs(h)===Math.abs(k)) return null;
    var c=(m.d===1&&m.n===1)?'':(m.d===1&&m.n===-1)?MINUS:fmtR(m);
    return { topic:'From an equation', prompt:'What is the <span class="c-m">slope</span> of '+eq('y'+sgn(-k)+' = '+c+'(x'+sgn(-h)+')')+'?', data:{m:m},
      check:function(v){ return rEq(v,R((k+m.n)-k,(h+m.d)-h)); },                                    /* from the point (h, k) to the next one */
      choices:slips(m,[[R(k,1),'That is y₁, part of the point. The slope is the number in front of the parentheses.'],[R(-h,1),'That number is inside the parentheses, with the point.']]),
      explain:'In y − y₁ = m(x − x₁), the slope is the number in front of the parentheses: '+M(m)+'.' }; }
  };
  function build(type){ for(var tries=0;tries<400;tries++){ var q=GEN[type](); if(!q||q.choices.length!==4) continue;
      if(new Set(q.choices.map(function(c){ return c.key; })).size!==4) continue;
      if(!q.check(q.choices[0].val)) continue;                                                  // the answer must pass the independent check
      if(q.choices.slice(1).some(function(c){ return q.check(c.val); })) continue;              // and no distractor may pass it
      q.type=type; q.choices.forEach(function(c,i){ c.ok=i===0; });
      shuffle(q.choices); q.visual=q.visual||''; delete q.check; return q; } throw new Error('generator failed: '+type); }
  return { build:build }; }

function makeStdForm(PFX){
  /* ================= QUESTION GENERATOR: standard form intercepts =================
     Ax + By = C with whole-number intercepts, like Kody's "Graphing Using Intercepts" worksheet
     (3x + 5y = 15, x − 2y = 4, 5x + 4y = −20, 3x − y = −3). Students use the cover-up method and
     answer with the intercept as a point. The check plugs the point back into the equation. */
  var MINUS='−';
  function gcd(a,b){ a=Math.abs(a); b=Math.abs(b); while(b){ var t=a%b; a=b; b=t; } return a; }
  function ri(a,b){ return a+Math.floor(Math.random()*(b-a+1)); }
  function nz(a,b){ var v; do{ v=ri(a,b); }while(v===0); return v; }
  function shuffle(a){ for(var i=a.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)), t=a[i]; a[i]=a[j]; a[j]=t; } return a; }
  function num(n){ return n<0? MINUS+(-n) : ''+n; }
  function pt(x,y){ return '('+num(x)+', '+num(y)+')'; }
  function C(x,y,why){ var h=pt(x,y); return {html:h,val:{x:x,y:y},why:why||'',key:h}; }
  function eq(h){ return '<span class="'+PFX+'-eq">'+h+'</span>'; }
  function term(a,v){ return a===1? v : a===-1? MINUS+v : num(a)+v; }
  function lhs(A,B){ return term(A,'x')+(B<0? ' '+MINUS+' ' : ' + ')+term(Math.abs(B),'y'); }
  /* intercepts a (x) and b (y) first, then the smallest whole-number equation through them, x coefficient positive */
  function line(){ var a=nz(-6,6), b=nz(-6,6), c=Math.abs(a*b)/gcd(a,b);
    if(Math.random()<0.5) c=-c; var A=c/a, B=c/b; if(A<0){ A=-A; B=-B; c=-c; }
    if(Math.abs(A)>9||Math.abs(B)>9||Math.abs(c)>40) return null;
    return {a:a,b:b,A:A,B:B,c:c}; }
  function onLine(L,v){ return L.A*v.x+L.B*v.y===L.c; }
  var GEN={
  sfX:function(){ var L=line(); if(!L) return null; var a=L.a, b=L.b;
    var wrong=[C(0,a,'Order matters: the x-intercept is (x, 0), so y is 0.'), C(-a,0,'Check the sign when you divide.'),
      C(b,0,'That divides by the y coefficient. Cover up the y term instead.'), C(0,b,'That is the y-intercept, not the x-intercept.')];
    if(L.A!==1) wrong.push(C(L.c,0,'Divide '+num(L.c)+' by '+L.A+', the number with x.'));
    return { topic:'x-intercept', prompt:'What is the <span class="c-m">x-intercept</span> of '+eq(lhs(L.A,L.B)+' = '+num(L.c))+'?', data:L,
      check:function(v){ return v.y===0 && onLine(L,v); },
      choices:[C(a,0)].concat(shuffle(wrong)),
      explain:'Cover up the y term: '+term(L.A,'x')+' = '+num(L.c)+(L.A===1?'':', so x = '+num(a))+'. The x-intercept is <span class="c-ans">'+pt(a,0)+'</span>.' }; },
  sfY:function(){ var L=line(); if(!L) return null; var a=L.a, b=L.b;
    var wrong=[C(b,0,'Order matters: the y-intercept is (0, y), so x is 0.'), C(0,-b,'Check the sign when you divide.'),
      C(0,a,'That divides by the x coefficient. Cover up the x term instead.'), C(a,0,'That is the x-intercept, not the y-intercept.')];
    if(Math.abs(L.B)!==1) wrong.push(C(0,L.c,'Divide '+num(L.c)+' by '+num(L.B)+', the number with y.'));
    return { topic:'y-intercept', prompt:'What is the <span class="c-m">y-intercept</span> of '+eq(lhs(L.A,L.B)+' = '+num(L.c))+'?', data:L,
      check:function(v){ return v.x===0 && onLine(L,v); },
      choices:[C(0,b)].concat(shuffle(wrong)),
      explain:'Cover up the x term: '+term(L.B,'y')+' = '+num(L.c)+(L.B===1?'':', so y = '+num(b))+'. The y-intercept is <span class="c-ans">'+pt(0,b)+'</span>.' }; }
  };
  function build(type){ for(var tries=0;tries<400;tries++){ var q=GEN[type](); if(!q) continue;
      var seen={}; q.choices=q.choices.filter(function(c){ if(seen[c.key]) return false; seen[c.key]=1; return true; }).slice(0,4);
      if(q.choices.length!==4) continue;
      if(!q.check(q.choices[0].val)) continue;                                                  // the answer must pass the independent check
      if(q.choices.slice(1).some(function(c){ return q.check(c.val); })) continue;              // and no distractor may pass it
      q.type=type; q.choices.forEach(function(c,i){ c.ok=i===0; });
      shuffle(q.choices); q.visual=''; delete q.check; return q; } throw new Error('generator failed: '+type); }
  return { build:build }; }

function makeSlideSlice(PFX){
  /* ================= QUESTION GENERATOR: Slide and Slice =================
     Standard form Ax + By = C to slope-intercept form. Slide: move the x term across (By = −Ax + C).
     Slice: divide everything by B (y = −A/B x + C/B). Every line has gcd(A, B) = 1, A > 0 and a whole-number b.
     The checks plug points back into the standard form equation, separate from how the answer was made. */
  var MINUS='−';
  function gcd(a,b){ a=Math.abs(a); b=Math.abs(b); while(b){ var t=a%b; a=b; b=t; } return a; }
  function R(n,d){ if(d<0){ n=-n; d=-d; } var g=gcd(n,d)||1; return {n:n/g,d:d/g}; }
  function ri(a,b){ return a+Math.floor(Math.random()*(b-a+1)); }
  function nz(a,b){ var v; do{ v=ri(a,b); }while(v===0); return v; }
  function shuffle(a){ for(var i=a.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)), t=a[i]; a[i]=a[j]; a[j]=t; } return a; }
  function num(n){ return n<0? MINUS+(-n) : ''+n; }
  function frac(n,d){ return '<span class="'+PFX+'-fr"><span>'+n+'</span><span>'+d+'</span></span>'; }
  function fmtR(r){ if(r.d===1) return num(r.n); return (r.n<0?MINUS:'')+frac(Math.abs(r.n),r.d); }
  function rEq(a,b){ return a.n*b.d===b.n*a.d; }
  function sgn(v){ return v>0? ' + '+v : v<0? ' '+MINUS+' '+(-v) : ''; }
  function term(a,v){ return a===1? v : a===-1? MINUS+v : num(a)+v; }
  function coefR(r,v){ if(r.d===1) return term(r.n,v); return fmtR(r)+v; }
  function eq(h){ return '<span class="'+PFX+'-eq">'+h+'</span>'; }
  function std(L){ return term(L.A,'x')+(L.B<0? ' '+MINUS+' ' : ' + ')+term(Math.abs(L.B),'y')+' = '+num(L.C); }
  function expr(k,c){ return term(k,'x')+sgn(c); }                        /* −3x + 15 */
  function yeq(m,b){ return 'y = '+coefR(m,'x')+sgn(b); }                  /* y = −3/5x + 3 */
  function C(html,val,why){ return {html:html,val:val,why:why||'',key:html}; }
  /* A > 0, gcd(A, B) = 1, C a multiple of B so b is whole */
  function line(minB){ var A=ri(1,8), B=nz(-6,6), b=nz(-8,8); if(Math.abs(B)<minB||gcd(A,B)!==1) return null;
    return {A:A,B:B,C:B*b,b:b,m:R(-A,B)}; }
  /* (m, b) is right when (0, b) and (1, m + b) both satisfy Ax + By = C */
  function fits(L,v){ return L.B*v.b===L.C && L.A*v.m.d+L.B*(v.m.n+v.b*v.m.d)===L.C*v.m.d; }
  function YC(m,b,why){ return C(yeq(m,b),{m:m,b:b},why); }
  var GEN={
  ssSlide:function(){ var L=line(2); if(!L) return null; var A=L.A, B=L.B, c=L.C;
    var By=term(B,'y');
    return { topic:'Slide', prompt:'Slide the x term over. '+eq(std(L))+' becomes '+eq(By+' = ?'), data:L,
      check:function(v){ return v.k+A===0 && v.c===c; },                                            /* Ax + (kx + c) = C for every x */
      choices:[C(expr(-A,c),{k:-A,c:c}), C(expr(A,c),{k:A,c:c},'Sliding across the = changes the sign: '+term(A,'x')+' becomes '+term(-A,'x')+'.'),
        C(expr(-A,-c),{k:-A,c:-c},'Only the x term moves. '+num(c)+' stays as it is.'), C(expr(A,-c),{k:A,c:-c},'Only the x term changes sign.')],
      explain:'Subtract '+term(A,'x')+' from both sides: <span class="c-ans">'+By+' = '+expr(-A,c)+'</span>.' }; },
  ssSlice:function(){ var L=line(2); if(!L) return null; var A=L.A, B=L.B, c=L.C, m=L.m, b=L.b;
    var By=term(B,'y'), wrong=[YC(m,c,'Slice everything: divide '+num(c)+' by '+num(B)+' too.'), YC(R(-A,1),b,'Slice everything: divide '+term(-A,'x')+' by '+num(B)+' too.')];
    if(B<0) wrong.push(YC(R(-A,-B),-b,'Divide by '+num(B)+', sign and all.')); else wrong.push(YC(R(A,B),b,'Check the sign of the x term.'));
    wrong.push(YC(R(B,-A),b,'Divide by '+num(B)+'. It goes on the bottom.'));
    return { topic:'Slice', prompt:'Slice: divide by '+num(B)+'. '+eq(By+' = '+expr(-A,c))+' becomes', data:L,
      check:function(v){ return fits(L,v); },
      choices:[YC(m,b)].concat(shuffle(wrong)),
      explain:'Divide every term by '+num(B)+': <span class="c-ans">'+yeq(m,b)+'</span>.' }; },
  ssBoth:function(){ var L=line(1); if(!L) return null; var A=L.A, B=L.B, c=L.C, m=L.m, b=L.b;
    var wrong=[YC(R(A,B),b,'Sliding '+term(A,'x')+' across makes it '+term(-A,'x')+'.'), YC(R(B,-A),b,'Divide by '+num(B)+', the number with y.')];
    if(Math.abs(B)!==1) wrong.push(YC(m,c,'Slice everything: divide '+num(c)+' by '+num(B)+' too.'));
    wrong.push(YC(m,-b,'Check the sign of b.'));
    var steps= Math.abs(B)===1&&B===1? 'Slide: <span class="c-ans">'+yeq(m,b)+'</span>.' :
      'Slide: '+term(B,'y')+' = '+expr(-A,c)+'. Slice by '+num(B)+': <span class="c-ans">'+yeq(m,b)+'</span>.';
    return { topic:'Both steps', prompt:'Write '+eq(std(L))+' in slope-intercept form.', data:L,
      check:function(v){ return fits(L,v); },
      choices:[YC(m,b)].concat(shuffle(wrong)),
      explain:steps }; },
  ssSlope:function(){ var L=line(1); if(!L) return null; var A=L.A, B=L.B, c=L.C, m=L.m, b=L.b; if(m.d===1&&Math.abs(m.n)===Math.abs(b)) return null;
    function M(r,why){ return C(fmtR(r),r,why); }
    var wrong=[M(R(A,B),'Sliding '+term(A,'x')+' across changes its sign.'), M(R(-B,A),'That is upside down. Divide by '+num(B)+', the number with y.'), M(R(b,1),'That is b, the y-intercept.')];
    if(Math.abs(A)!==Math.abs(B)) wrong.push(M(R(B,A),'Upside down and the wrong sign.'));
    return { topic:'Find the slope', prompt:'What is the <span class="c-m">slope</span> of '+eq(std(L))+'?', data:L,
      check:function(v){ return rEq(v,R((c-A*B)-c,B*B)); },                                          /* from (0, C/B) to (B, (C − AB)/B) */
      choices:[M(m)].concat(wrong),
      explain:'Slide and slice: '+yeq(m,b)+', so the slope is <span class="c-ans">'+fmtR(m)+'</span>.' }; }
  };
  function build(type){ for(var tries=0;tries<400;tries++){ var q=GEN[type](); if(!q) continue;
      var seen={}; q.choices=q.choices.filter(function(c){ if(seen[c.key]) return false; seen[c.key]=1; return true; }).slice(0,4);
      if(q.choices.length!==4) continue;
      if(!q.check(q.choices[0].val)) continue;                                                  // the answer must pass the independent check
      if(q.choices.slice(1).some(function(c){ return q.check(c.val); })) continue;              // and no distractor may pass it
      q.type=type; q.choices.forEach(function(c,i){ c.ok=i===0; });
      shuffle(q.choices); q.visual=''; delete q.check; return q; } throw new Error('generator failed: '+type); }
  return { build:build }; }

var SETS={
  mult:{ name:'Multiplication facts', make:makeMult, big:true, topics:[['f03','Facts 0–3',['Facts 0–3'],1],['f46','Facts 4–6',['Facts 4–6'],2],['f79','Facts 7–9',['Facts 7–9'],3],['f1012','Facts 10–12',['Facts 10–12'],2]] },
  /* 'yint' was its own topic until 2026-10-19, when Kody merged it into 'slope'; alias keeps old links and saves working */
  slope:{ name:'Slope-intercept form', make:makeLinear, alias:{yint:'slope'}, topics:[['write','Write the equation',['siBuild']],['slope','Find slope or y-intercept',['siSlope','siYInt']],['graph','Read a graph',['graphSlope','graphYInt','graphXInt']]] },
  point:{ name:'Point-slope form', make:makeLinear, topics:[['write','Write the equation',['psWrite']],['point','Find the point',['psPoint']],['slope','Find the slope',['psSlope']]] },
  hoy:{ name:'HOY & VUX', make:makeLinear, topics:[['describe','Describe the line',['hvType']],['graph','Match the graph',['hvGraph']],['slope','Find the slope',['slopeHV']]] },
  shift:{ name:'Linear transformations', make:makeShift, topics:[['vs','Vertical shifts',['vDescribe','vWrite','newYInt']],['hs','Horizontal shifts',['hDescribe','hWrite']],['gr','Graphs',['graphEq','graphHow','graphH']],['ne','New equations',['eqV','eqH','eqCompare','slopeStays']],['st','Stretches & compressions',['stDescribe','stWrite','stGraph']],['fl','Reflections',['flDescribe','flGraph','flStmt']],['af','All together: a·f(x) + d',['adStmt','adNew','adWrite','adGraph']]] },
  func:{ name:'Functions', make:makeFunc, topics:[['points','Ordered pairs',['fnPoints']],['table','Tables',['fnTable']],['map','Mapping diagrams',['fnMap']],['graph','Graphs',['fnGraph']]] },
  int:{ name:'Integers', make:makeInt, big:true, topics:[['add','Adding',['intAdd']],['sub','Subtracting',['intSub']],['mult','Multiplying',['intMul']]] },
  sq:{ name:'Squares & roots', make:makeSq, big:true, topics:[['square','Squaring',['sqSquare']],['root','Square roots',['sqRoot']],['neg','Negatives',['sqNeg']],['est','Estimating roots',['sqEst']]] },
  plot0:{ name:'Graphing y = mx', make:makePlot0, topics:[['match','Pick the line',['plotMatch']],['eq','Write the equation',['plotEq']]] },
  plot:{ name:'Graphing y = mx + b', make:makePlotB, topics:[['match','Pick the line',['plotMatch']],['eq','Write the equation',['plotEq']]] },
  fam:{ name:'Function families', make:makeFam, topics:[['eq','From the equation',['famEq']],['graph','From the graph',['famGraph']]] },
  fslope:{ name:'Finding slope', make:makeFindSlope, topics:[['pts','From two points',['fsPoints']],['graph','From a graph',['fsGraph']],['table','From a table',['fsTable']],['eq','From an equation',['fsEq']]] },
  stdform:{ name:'Standard form', make:makeStdForm, topics:[['x','x-intercept',['sfX']],['y','y-intercept',['sfY']]] },
  slide:{ name:'Slide and Slice', make:makeSlideSlice, topics:[['slide','Slide',['ssSlide']],['slice','Slice',['ssSlice']],['both','Both steps',['ssBoth']],['slope','Find the slope',['ssSlope']]] }
};

/* Teacher settings: Mr. Spitz changes these on topics.html (the teacher control panel), which saves data/topics.json in the repo.
   hidden: sets students can't pick. off: topics turned off, by set. assign: the lock; while it lists sets a game only plays those sets
   and topics (no topics = every topic that is on). suggest: the hub's "Suggested by Mr. Spitz" sets, and the note under them.
   bonus: score bonus percent for suggested runs (scorecode.js), 0 = off. Read once, before the game reads its link, so the game, its save
   slot and its score code all agree. The last copy that loaded stays in this browser; DEF (no limits) is used when neither is there.
   Shared with scorecode.js as window.SpitzTopics; index.html reads the same file. */
var TOPICS=window.SpitzTopics=window.SpitzTopics||(function(){
  var DEF={ hidden:[], off:{}, assign:[], suggest:{ sets:[], note:'' }, bonus:25 }, t=null, K='spitz_topics';
  /* a copy fetched in the last minute is used as is (switching games on slow Wi-Fi doesn't wait on the site again; 2026-10-24) */
  try{ if(Date.now()-(+localStorage.getItem(K+'_at')||0)<60e3) t=JSON.parse(localStorage.getItem(K)); }catch(e){ t=null; }
  if(!t||typeof t!=='object') try{ var x=new XMLHttpRequest(), src=document.currentScript&&document.currentScript.src||location.href;
    x.open('GET',new URL('../data/topics.json',src).href+'?v='+Math.floor(Date.now()/60000),false); x.send();
    if(x.status===200){ t=JSON.parse(x.responseText); try{ localStorage.setItem(K,x.responseText); localStorage.setItem(K+'_at',String(Date.now())); }catch(e){} } }catch(e){ t=null; }
  if(!t||typeof t!=='object') try{ t=JSON.parse(localStorage.getItem(K)); }catch(e){ t=null; }
  if(!t||typeof t!=='object') t=DEF;
  function ids(a){ return Array.isArray(a)?a.filter(function(v){ return typeof v==='string'; }):[]; }
  function list(a){ return Array.isArray(a)?a.filter(function(k){ return k&&typeof k.id==='string'; }).map(function(k){ return { id:k.id, topics:ids(k.topics) }; }):[]; }
  var off={}; if(t.off&&typeof t.off==='object') Object.keys(t.off).forEach(function(s){ off[s]=ids(t.off[s]); });
  var sg=t.suggest&&typeof t.suggest==='object'?t.suggest:{};
  return { hidden:ids(t.hidden), off:off, assign:list(t.assign), suggest:{ sets:list(sg.sets), note:typeof sg.note==='string'?sg.note:'' },
    bonus:typeof t.bonus==='number'&&t.bonus>=0?Math.min(100,Math.round(t.bonus)):DEF.bonus, updated:t.updated||'' };
})();
var HIDDEN=TOPICS.hidden, OFF=TOPICS.off, ASSIGN=TOPICS.assign.filter(function(k){ return SETS[k.id]; });
/* where a link with a hidden set, or with no set at all (most games' own questions are multiplication facts), goes */
var FALLBACK=ASSIGN.length?ASSIGN[0].id:HIDDEN.indexOf('slope')<0?'slope':Object.keys(SETS).filter(function(s){ return HIDDEN.indexOf(s)<0; })[0]||'slope';
(function(){ var qs=params(), id=qs.set, k=null;
  if(ASSIGN.length){ k=ASSIGN.filter(function(a){ return a.id===id; })[0]||ASSIGN[0]; id=k.id; }
  else if(!SETS[id]||HIDDEN.indexOf(id)>=0) id=FALLBACK;
  var set=SETS[id], all=set.topics.map(function(t){ return t[0]; }), on=all.filter(function(t){ return (OFF[id]||[]).indexOf(t)<0; });
  if(!on.length) on=all;
  var ok=k&&k.topics.length?on.filter(function(t){ return k.topics.indexOf(t)>=0; }):on; if(!ok.length) ok=on;
  if(id===qs.set&&!qs.topics&&ok.length===all.length) return;   /* the whole set, as before */
  var want=(id===qs.set?(qs.topics||'').split(','):[]).map(function(t){ return set.alias&&set.alias[t]||t; }).filter(function(t,i,a){ return ok.indexOf(t)>=0&&a.indexOf(t)===i; });
  if(!want.length) want=ok;
  if(id===qs.set&&want.join(',')===(qs.topics||'')) return;
  try{ history.replaceState(history.state,'',location.pathname+'?set='+id+'&topics='+want.join(',')+location.hash); }catch(e){} })();

function plain(h){ return String(h).replace(/<span class="[a-z]+-fr"><span>(.*?)<\/span><span>(.*?)<\/span><\/span>/g,'$1/$2').replace(/<[^>]+>/g,''); }
function params(){ var qs={}; try{ (location.search||'').replace(/^\?/,'').split('&').forEach(function(kv){ var p=kv.split('='); if(p[0]) qs[decodeURIComponent(p[0])]=decodeURIComponent(p[1]||''); }); }catch(e){} return qs; }

/* Returns null when the link names no set, so a game opened on its own plays exactly as it always has. */
function forGame(PFX){
  var qs=params(), id=qs.set; if(!SETS[id]) return null;
  var set=SETS[id], want=(qs.topics||'').split(',').map(function(t){ return set.alias&&set.alias[t]||t; }), picked=set.topics.filter(function(t){ return want.indexOf(t[0])>=0; });
  if(!picked.length) picked=set.topics;
  /* sentence-length prompts: the facts games set their prompt at 104px on one line, so give it room to wrap (big sets keep the one-line prompt) */
  if(!set.big){ try{ var st=document.createElement('style'); st.textContent='.'+PFX+'-prompt{ font:700 36px/1.3 var(--body) !important; height:auto !important; min-height:96px; white-space:normal !important; overflow:visible !important; text-align:left !important; }'; document.head.appendChild(st); }catch(e){} }
  var Q=set.make(PFX), bag=[]; picked.forEach(function(t){ for(var i=0;i<(t[3]||1);i++) bag.push(t); });
  var topicBag=[], lastType='', lastFact='';
  function next(){ var q; for(var n=0;n<20;n++){ if(!topicBag.length) topicBag=bag.slice().sort(function(){ return Math.random()-0.5; });
      var t=topicBag.pop(), list=t[2], type; do{ type=list[Math.floor(Math.random()*list.length)]; }while(type===lastType&&list.length>1); lastType=type;
      q=Q.build(type); q.topic=t[1];
      if(id!=='mult') return q;
      var k=Math.min(q.data.a,q.data.b)+'x'+Math.max(q.data.a,q.data.b); if(k!==lastFact){ lastFact=k; return q; } }
    return q; }
  /* bonus waves print the answers on small targets: no pictures, short labels */
  function fits(q,max){ return !q.visual&&q.choices.every(function(c){ return plain(c.html).length<=max; }); }
  function short(max){ var q; for(var n=0;n<60;n++){ q=next(); if(fits(q,max)) return q; }
    /* the picked topics are all pictures (a graphs-only link): borrow a picture-free question from the same set */
    var all=[]; set.topics.forEach(function(t){ all=all.concat(t[2]); });
    for(n=0;n<60;n++){ var b=Q.build(all[Math.floor(Math.random()*all.length)]); if(fits(b,max)){ b.topic=picked[0][1]; return b; } }
    return q; }
  return { set:id, name:set.name, custom:true, suffix:'_'+id+'_'+picked.map(function(t){ return t[0]; }).join('-'),
    topicTable:function(){ var o={}; picked.forEach(function(t){ o[t[1]]=[0,0]; }); return o; },
    next:next, short:short };
}

window.SpitzQ={ sets:SETS, forGame:forGame };
})();
