/* Algebra I 2026 STAAR released test (TEA), rebuilt for Spitz Checkpoint.
   Answer key, item types, TEKS, point values, reporting categories and readiness/supporting from TEA's 2026 answer key.
   Wording from the released items. Every graph is redrawn here from the math stated in the item, the key or TEA's
   rationale (no picture files). One estimate: Q32's curve (TEA gives only the y-intercept, 15); drawn as 15(0.7)^x to match the picture.
   Q13 and Q21 drop-down choices and the Q39 graphing tool come from Kody's screenshots and recording of the 2026 released test in Cambium.
   Partial credit (Kody's rules): Q39 = 1 point for both lines, 1 point for the region; Q42 = 1 point for 2 rows right, 2 points for all 4. */
(function(){
/* static graph with any window (Cambium style: gray grid, black axes, arrowheads, Verdana labels) */
let CGID=0;
function CG(o){
  const id='cg26'+(++CGID), x0=o.x[0], x1=o.x[1], y0=o.y[0], y1=o.y[1], gx=o.gx||1, gy=o.gy||1, lx=o.lx||gx, ly=o.ly||gy, cell=o.cell||20;
  const quad=x0===0&&y0===0, padL=o.yt?58:30, padB=o.xt?40:22, padT=o.title?34:20, padR=22;
  const kx=cell/gx, ky=cell/gy, PW=(x1-x0)*kx, PH=(y1-y0)*ky, W=PW+padL+padR, H=PH+padT+padB;
  const X=v=>padL+(v-x0)*kx, Y=v=>padT+(y1-v)*ky, n=v=>v<0?'−'+(-v):String(v), r=v=>Math.round(v*1e6)/1e6;
  const font='font-family="Verdana,sans-serif"';
  let s=`<svg class="${o.cls||'fig'}" viewBox="0 0 ${W} ${H}" style="width:${o.w||300}px;max-width:100%;background:#fff" role="img" aria-label="${o.label||'Graph'}">
   <defs><marker id="${id}a" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10" fill="none" stroke="#000" stroke-width="1.8"/></marker>
   <clipPath id="${id}c"><rect x="${X(x0)}" y="${Y(y1)}" width="${PW}" height="${PH}"/></clipPath></defs>
   <rect x="${X(x0)}" y="${Y(y1)}" width="${PW}" height="${PH}" fill="#fff"/>`;
  for(let v=x0+gx;v<x1-1e-9;v=r(v+gx)) s+=`<line x1="${X(v)}" y1="${Y(y1)}" x2="${X(v)}" y2="${Y(y0)}" stroke="#bdbdbd"/>`;
  for(let v=y0+gy;v<y1-1e-9;v=r(v+gy)) s+=`<line x1="${X(x0)}" y1="${Y(v)}" x2="${X(x1)}" y2="${Y(v)}" stroke="#bdbdbd"/>`;
  s+=`<rect x="${X(x0)}" y="${Y(y1)}" width="${PW}" height="${PH}" fill="none" stroke="#000" stroke-width="2"/>`;
  const ax=quad?x0:0, ay=quad?y0:0;
  if(quad){ s+=`<line x1="${X(0)}" y1="${Y(0)}" x2="${X(x1)+12}" y2="${Y(0)}" stroke="#000" stroke-width="1.6" marker-end="url(#${id}a)"/><line x1="${X(0)}" y1="${Y(0)}" x2="${X(0)}" y2="${Y(y1)-12}" stroke="#000" stroke-width="1.6" marker-end="url(#${id}a)"/>`; }
  else s+=`<line x1="${X(x0)+2}" y1="${Y(0)}" x2="${X(x1)-2}" y2="${Y(0)}" stroke="#000" stroke-width="1.6" marker-start="url(#${id}a)" marker-end="url(#${id}a)"/><line x1="${X(0)}" y1="${Y(y1)+2}" x2="${X(0)}" y2="${Y(y0)-2}" stroke="#000" stroke-width="1.6" marker-start="url(#${id}a)" marker-end="url(#${id}a)"/>`;
  const fs=o.fs||10;
  for(let v=Math.ceil(x0/lx)*lx;v<=x1+1e-9;v=r(v+lx)){ if(v===0||v<=x0&&!quad||(o.xmax!=null&&v>o.xmax)||(!quad&&v>=x1)) continue; s+=`<text x="${X(v)}" y="${Y(ay)+fs+4}" text-anchor="middle" font-size="${fs}" ${font}>${n(v)}</text>`; }
  for(let v=Math.ceil(y0/ly)*ly;v<=y1+1e-9;v=r(v+ly)){ if(v===0||v<=y0&&!quad||(o.ymax!=null&&v>o.ymax)||(!quad&&v>=y1)) continue; s+=`<text x="${X(ax)-4}" y="${Y(v)+fs*0.35}" text-anchor="end" font-size="${fs}" ${font}>${n(v)}</text>`; }
  if(quad) s+=`<text x="${X(0)-4}" y="${Y(0)+fs+4}" text-anchor="end" font-size="${fs}" ${font}>0</text>`;
  s+=`<text x="${quad?X(x1)+16:X(x1)+8}" y="${Y(ay)+4}" font-size="13" font-weight="700" font-style="italic" ${font}>x</text><text x="${X(ax)}" y="${quad?Y(y1)-16:padT-7}" text-anchor="middle" font-size="13" font-weight="700" font-style="italic" ${font}>y</text>`;
  if(o.title) s+=`<text x="${X((x0+x1)/2)}" y="14" text-anchor="middle" font-size="12" ${font}>${o.title}</text>`;
  if(o.xt) s+=`<text x="${X((x0+x1)/2)}" y="${H-6}" text-anchor="middle" font-size="11" ${font}>${o.xt}</text>`;
  if(o.yt) s+=`<text transform="translate(14 ${Y((y0+y1)/2)}) rotate(-90)" text-anchor="middle" font-size="11" ${font}>${o.yt}</text>`;
  (o.curves||[]).forEach(c=>{ const a=c.from!=null?c.from:x0, b=c.to!=null?c.to:x1, inX=v=>v>=x0+0.12*gx&&v<=x1-0.12*gx, inY=v=>v>=y0+0.12*gy&&v<=y1-0.12*gy;
    const segs=[]; let cur=null; for(let i=0;i<=600;i++){ const xv=a+(b-a)*i/600, yv=c.f(xv); if(inX(xv)&&inY(yv)){ (cur||(cur=[],segs.push(cur),cur)).push([xv,yv]); } else cur=null; }
    segs.forEach(sg=>{ const arr=c.arrows!==false&&!c.dots; s+=`<polyline points="${sg.map(P=>X(P[0]).toFixed(1)+','+Y(P[1]).toFixed(1)).join(' ')}" fill="none" stroke="#000" stroke-width="2.2" ${arr?`marker-start="url(#${id}a)" marker-end="url(#${id}a)"`:''}/>`; });
    if(c.dots) [a,b].forEach(xv=>{ s+=`<circle cx="${X(xv)}" cy="${Y(c.f(xv))}" r="4" fill="#000"/>`; }); });
  (o.pts||[]).forEach(P=>{ s+=`<circle cx="${X(P[0])}" cy="${Y(P[1])}" r="4" fill="#000"/>`; });
  (o.tags||[]).forEach(([xv,yv,t,dx,dy])=>{ const tx=X(xv)+(dx||0), ty=Y(yv)+(dy||0), w=t.length*7.4+8;
    s+=`<rect x="${tx-w/2}" y="${ty-12}" width="${w}" height="17" fill="#fff"/><text x="${tx}" y="${ty+1}" text-anchor="middle" font-size="12" font-weight="700" ${font}>${t}</text>`; });
  return s+'</svg>'; }
const Q2G=f=>CG({x:[-6,6],y:[-3,9],cls:'sgraph',w:220,curves:[{f}]});
const SCAT=pts=>CG({x:[-6,6],y:[-6,6],cls:'sgraph',w:220,pts});
const XT=(rows)=>`<table class="data"><tr><th>${x}</th><th>${y}</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('')}</table>`;
const CAP=(t,tbl)=>`<div class="tcap"><p style="text-align:center;font-weight:bold;margin:.4em 0 .2em">${t}</p>${tbl}</div>`;
const SYSC=(a,b)=>SYS(a,b).replace('class="eq sys"','class="eq sys ctr"');   /* centered, as the 2026 test shows them */
const SEG=s=>`<span style="text-decoration:overline">${V(s)}</span>`;
const TRI=`<svg class="fig" viewBox="0 0 420 120" style="width:420px;max-width:100%" role="img" aria-label="Triangle PQR"><polygon points="20,95 150,20 395,95" fill="none" stroke="#000" stroke-width="1.6"/>
  <g font-family="Verdana,sans-serif" font-size="13"><text x="148" y="13" font-style="italic">P</text><text x="5" y="100" font-style="italic">R</text><text x="401" y="100" font-style="italic">Q</text>
  <text x="62" y="48"><tspan font-style="italic">x</tspan> cm</text><text x="265" y="48">16 cm</text><text x="182" y="114">3(<tspan font-style="italic">x</tspan> − 2) cm</text></g></svg>`;
const DIR_ONE='<p class="direct">Move the correct answer to each box. Not all answers will be used.</p>';
const ITEMS=[
/* 1 */ {type:'mc',stem:`<p>An author signed books at a constant rate. The table shows the linear relationship between the number of books signed and the length of time spent signing those books.</p>${CAP('Book Signing',T(['Time (minutes)','Total Number of Books Signed'],[['14','35'],['20','50'],['26','65'],['32','80'],['38','95']]))}<p>Based on the table, what is the rate of change of the total number of books signed with respect to time?</p>`,
  choices:['1.4 books signed per minute','0.4 book signed per minute','2.5 books signed per minute','0.7 book signed per minute'],answer:2},
/* 2 */ {type:'mc',grid:true,cols2:true,stem:`<p>Which graph best represents the quadratic function ${f}(${x}) = ${x}<sup>2</sup> − 4${x} + 3?</p>`,
  choices:[Q2G(v=>v*v-4*v+3),Q2G(v=>(v-1)*(v-1)+2),Q2G(v=>(v+2)*(v+2)-1),Q2G(v=>(v+1)*(v+1)+2)],answer:0},
/* 3 */ {type:'mc',stem:`<p>A store sells children’s shirts for $15 each and adults’ shirts for $19 each. In a single day, the store sold a total of 14 shirts for $250.</p><p>How many adults’ shirts were sold?</p>`,
  choices:['7','4','10','14'],answer:2},
/* 4 */ {type:'mc',stem:`<p>Which expression is a factor of 2${x}<sup>2</sup> − 16${x} + 32?</p>`,choices:[`${x} + 4`,`2${x} − 1`,`${x} + 2`,`${x} − 4`],answer:3},
/* 5 */ {type:'mc',stem:`<p>When the sales of sweaters decrease, the sales of swimsuits increase. Which statement about the relationship between sweater sales and swimsuit sales is best supported by this information?</p>`,
  choices:['There is both an association and a causation.','There is an association but not a causation.','There is a causation but not an association.','There is neither a causation nor an association.'],answer:1},
/* 6 */ {type:'ms',stem:`<p>Which statements about the graph of ${y} = 30(0.8)<sup>${x}</sup> are true?</p><p class="direct">Select <b>TWO</b> correct answers.</p>`,
  choices:[`The ${x}-intercept of the graph is (0, 30).`,`The ${y}-intercept of the graph is (0, 30).`,`The graph of the function is decreasing for all values of ${x}.`,`The ${x}-intercept of the graph is (0.8, 0).`,`The ${y}-intercept of the graph is (0.8, 0).`,`The graph of the function is increasing for all values of ${x}.`],answer:[1,2]},
/* 7 */ {type:'mc',stem:`<p>The tables of ordered pairs represent some points on the graphs of two lines.</p><div style="display:flex;gap:48px;flex-wrap:wrap;justify-content:center">${CAP('Line 1',XT([['−7','−5'],['−3','−1'],['0','2'],['5','7']]))}${CAP('Line 2',XT([['−4','7'],['−1','1'],['0','−1'],['2','−5']]))}</div><p>Which system of equations represents these lines?</p>`,
  choices:[SYS(`${y} = ${x} + 2`,`${y} = 2${x} − 1`),SYS(`${y} = −${x} + 2`,`${y} = 2${x} − 1`),SYS(`${y} = −${x} + 2`,`${y} = −2${x} − 1`),SYS(`${y} = ${x} + 2`,`${y} = −2${x} − 1`)],answer:3},
/* 8 */ {type:'mc',stem:`<p>For quadratic function ${g}, ${g}(${F(2,3)}) = 0 and ${g}(−${F(3,4)}) = 0. Which function could represent ${g}?</p>`,
  choices:[`${g}(${x}) = (2${x} − 3)(3${x} + 4)`,`${g}(${x}) = (2${x} + 3)(3${x} − 4)`,`${g}(${x}) = (3${x} − 2)(4${x} + 3)`,`${g}(${x}) = (3${x} + 2)(4${x} − 3)`],answer:2},
/* 9 */ {type:'cline',stem:`<p>Graph the line represented by the equation ${y} = −${F(2,3)}${x} + 2.</p><p>Select two points on the coordinate grid. A line will connect the points.</p>`,
  R:5,eq:[2,3,6],keyText:'Line through (0, 2) and (3, 0)'},
/* 10 */ {type:'mc',stem:`<p>A concession stand is selling cookies for $2 each and muffins for $3 each. A student has at most $20 to spend on cookies and muffins.</p><p>Which inequality represents all possible combinations of the number of cookies, ${x}, and the number of muffins, ${y}, the student can purchase?</p>`,
  choices:[`3${x} + 2${y} ≤ 20`,`2${x} + 3${y} ≥ 20`,`2${x} + 3${y} ≤ 20`,`3${x} + 2${y} ≥ 20`],answer:2},
/* 11 */ {type:'boxes',stem:`<p>Which values are closest to the solutions of 2${x}<sup>2</sup> + 8${x} − 6 = 0?</p><p class="direct">Move the correct answer to each box. Each answer may be used more than once. Not all answers will be used.</p>`,
  tiles:['−9.29','−4.65','−1.29','−0.65','0.65','1.29','4.65','9.29'],tpl:`The values of ${x} are approximately {0} and {1}.`,answer:[1,4],reuse:true,unordered:true},
/* 12 */ {type:'mc',stem:`<p>What is the quotient of (4${x} − 8) ÷ (${x} − 2) for all values of ${x} where the expression is defined?</p>`,
  choices:['4',`4 − ${F('6',`${x} − 2`)}`,'6',`6 + ${F('4',`${x} − 2`)}`],answer:0},
/* 13 */ {type:'inline',stem:`<p>The graph of the function ${f}(${x}) = ${x} was transformed to create the graph of the function ${g}(${x}) = ${f}(${x}) − 3. Complete the statements to best describe how the graphs of functions ${f} and ${g} are related.</p><p>Choose the correct answer from each drop-down menu to complete the statements.</p>`,
  text:`The graph of ${g} {0} the graph of ${f}.<br>The ${y}-intercept of the graph of ${g} is {1} the ${y}-intercept of the graph of ${f}.`,
  drops:[['is less steep than','is steeper than','has the same steepness as'],['less than','the same as','greater than']],answer:[2,0]},
/* 14 */ {type:'mc',stem:`<p>A line parallel to the ${x}-axis contains the point (3.6, 8.7). What is the equation of the line?</p>`,choices:[`${x} = 8.7`,`${y} = 3.6`,`${x} = 3.6`,`${y} = 8.7`],answer:3},
/* 15 */ {type:'mc',stem:`<p>The graph of the exponential function shown on the grid passes through the points (−1, 10) and (0, 4).</p>${CG({x:[-2,2.5],y:[-2,16],gx:0.5,gy:2,lx:1,ly:2,w:250,curves:[{f:v=>4*Math.pow(0.4,v)}]})}<p>Which function is represented by the graph?</p>`,
  choices:[`${g}(${x}) = 4(${F(2,5)})<sup>${x}</sup>`,`${g}(${x}) = 4(${F(1,2)})<sup>${x}</sup>`,`${g}(${x}) = ${F(2,5)}(4)<sup>${x}</sup>`,`${g}(${x}) = ${F(1,2)}(4)<sup>${x}</sup>`],answer:0},
/* 16 */ {type:'mc',grid:true,stem:`<p>Which graph best represents the solution set of 3${x} &lt; 4${y} − 12?</p>`,
  choices:[SG({lines:[[4/3,-4,1]],shade:[[4/3,-4,'below']]}),SG({lines:[[0.75,3,1]],shade:[[0.75,3,'above']]}),SG({lines:[[3,3,1]],shade:[[3,3,'below']]}),SG({lines:[[4,-4,1]],shade:[[4,-4,'above']]})],answer:1},
/* 17 */ {type:'boxes',stem:`<p>Triangle ${V('PQR')} and some of its dimensions in centimeters are shown.</p>${TRI}<p>The perimeter of triangle ${V('PQR')} is 5${x} centimeters. What are the lengths of ${SEG('PR')} and ${SEG('RQ')} in centimeters?</p>${DIR_ONE}`,
  tiles:['5.5','10','10.5','22','24','60'],tpl:`${V('PR')} = {0} cm<span class="brk"></span>${V('RQ')} = {1} cm`,answer:[1,4],reuse:false},
/* 18 */ {type:'mc',stem:`<p>A part of quadratic function ${f} is graphed on the grid.</p>${CG({x:[-10,4],y:[-5,8],w:330,curves:[{f:v=>-0.25*(v+4)*(v+4)+6,from:-8,to:2,dots:true}]})}<p>Which statement is true for the part of the function shown?</p>`,
  choices:['The domain is the set of real numbers greater than or equal to −8 and less than or equal to 2.','The domain is the set of real numbers greater than or equal to −3 and less than or equal to 6.','The range is the set of real numbers greater than or equal to −3 and less than or equal to 2.','The range is the set of real numbers greater than or equal to −4 and less than or equal to 6.'],answer:0},
/* 19 */ {type:'boxes',stem:`<p>What is the solution set to the inequality −5${m} + 4 ≤ 3(${m} + 3) + 1?</p>${DIR_ONE}`,
  tiles:['≤','≥',`−${F(4,3)}`,`−${F(3,4)}`,F(3,4),F(4,3)],tpl:`${m} {0} {1}`,answer:[1,3],reuse:false},
/* 20 */ {type:'mc',stem:`<p>Which expression is equivalent to ${F(`${m}<sup>7</sup>`,`${m}<sup>−3</sup>`)} for all values of ${m} where the expression is defined?</p>`,
  choices:[`${m}<sup>4</sup>`,`${m}<sup>10</sup>`,F(1,`${m}<sup>4</sup>`),F(1,`${m}<sup>10</sup>`)],answer:1},
/* 21 */ {type:'inline',stem:`<p>The graph of the quadratic parent function ${f} was transformed to create the graph of ${g}(${x}) = 5${f}(${x} + 3) − 2. What is the vertex of the graph of ${g}?</p><p>Choose the correct answer from each drop-down menu to complete the ordered pair.</p>`,
  text:'({0}, {1})',drops:[['−15','−3','−2','2','3','15'],['−10','−3','−2','2','3','10']],answer:[1,2]},
/* 22 */ {type:'mc',grid:true,cols2:true,stem:`<p>Which relation best represents ${y} as a function of ${x}?</p>`,
  choices:[XT([['15','−3'],['15','−1'],['15','2'],['15','8']]),SCAT([[-4,3],[-3,4],[-3,2],[-2,0],[-1,1],[0,-1],[1,-2],[2,-1],[3,-4]]),XT([['−6','12'],['−2','12'],['−1','12'],['5','12']]),SCAT([[0,0],[1,1],[2,3],[3,2],[4,4],[1,-2],[2,-3],[3,-3],[4,-4]])],answer:2},
/* 23 */ {type:'mc',stem:`<p>The table shows the remaining balance in dollars, ${y}, after a person has made ${x} payments toward the purchase of a pre-owned kayak.</p>${CAP('Kayak Purchase',T([`Number of Payments, ${x}`,`Remaining Balance, ${y} (dollars)`],[['0','100'],['1','75'],['2','50'],['3','25'],['4','0']]))}<p>What is the domain of the function for this situation?</p>`,
  choices:['{0, 25, 50, 75, 100}','{0, 1, 2, 3, 4}','All real numbers greater than 0 and less than 4','All real numbers greater than 0 and less than 100'],answer:1},
/* 24 */ {type:'mc',stem:`<p>What is the slope of the line represented by 5${x} + 2${y} = 8?</p>`,choices:[F(2,5),`−${F(2,5)}`,`−${F(5,2)}`,F(5,2)],answer:2},
/* 25 */ {type:'mc',stem:`<p>A sequence can be generated using the equation shown, where ${a}<sub>1</sub> = 9 is the first term of the sequence.</p><span class="eq ctr">${a}<sub>${n}</sub> = ${a}<sub>(${n}−1)</sub> + 2.8</span><p>What are the first 4 terms of the sequence?</p>`,
  choices:[['9','10.8','21.6','43.2'],['9','11.8','23.6','47.2'],['9','10.8','12.6','14.4'],['9','11.8','14.6','17.4']].map(r=>r.map(v=>`<span style="display:inline-block;min-width:3.6em">${v}</span>`).join('')),answer:3},
/* 26 */ {type:'mc',stem:`<p>The graph of a linear function is shown on a grid.</p>${CG({x:[-10,10],y:[-10,10],cell:15,fs:8,w:330,curves:[{f:v=>-6+2/7*(v+4)}],pts:[[-4,-6],[3,-4]],tags:[[-4,-6,'(−4, −6)',-38,-12],[3,-4,'(3, −4)',36,-10]]})}<p>What is the rate of change of ${y} with respect to ${x} for this function?</p>`,
  choices:[F(2,7),F(1,3),F(3,10),F(1,4)],answer:0},
/* 27 */ {type:'mc',stem:`<p>The table shows the number of years since an online group started meeting, ${x}, and the total number of members in the group, ${y}. The data in the table can be modeled with an exponential function.</p>${CAP('Group Members',T([`Number of Years, ${x}`,`Total Number of Members, ${y}`],[['0','5'],['3','42'],['6','310'],['9','2,555']]))}<p>If the trend continues, which value is the best estimate of the number of members the group will have after it has been meeting for 15 years?</p>`,
  choices:['7,045','3,499','159,560','80,110'],answer:2},
/* 28 */ {type:'mc',stem:`<p>The graph of a quadratic function shown models the distance of a football from the ground in feet after it was kicked, ${y}, as it relates to the horizontal distance of the football from the kicker in yards, ${x}.</p>${CG({x:[0,65],y:[0,60],gx:5,gy:5,cell:16,fs:9,xmax:60,ymax:55,w:330,title:'Field Goal Kick',xt:'Distance from Kicker (yd)',yt:'Distance from Ground (ft)',curves:[{f:v=>50-(v-30)*(v-30)/18,from:0,to:60,arrows:false}]})}<p>What is the equation of the axis of symmetry of the graph?</p>`,
  choices:[`${y} = 50`,`${x} = 30`,`${x} = 60`,`${y} = 25`],answer:1},
/* 29 */ {type:'mc',stem:`<p>The table represents some points on the graph of the linear function ${f}.</p>${T([x,`${f}(${x})`],[['−4','20'],['−2','14'],['3','−1'],['5','−7']])}<p>Which function represents ${f}?</p>`,
  choices:[`${f}(${x}) = −3${x} + 32`,`${f}(${x}) = −${F(1,3)}${x}`,`${f}(${x}) = −${F(1,3)}${x} + 20`,`${f}(${x}) = −3${x} + 8`],answer:3},
/* 30 */ {type:'boxes',stem:`<p>Create an expression that is equivalent to (${x}<sup>12</sup>${y}<sup>−9</sup>)<sup>${F(1,3)}</sup> for all values of ${x} and ${y} where the expression is defined.</p>${DIR_ONE}`,
  tiles:[3,4,27,36].map(e=>`${x}<sup>${e}</sup>`).concat([3,4,27,36].map(e=>`${y}<sup>${e}</sup>`)),tpl:`<span class="boxfrac"><span>{0}</span><span>{1}</span></span>`,answer:[1,4],reuse:false},
/* 31 */ {type:'mc',stem:`<p>The graph of the function ${f}(${x}) = ${x}<sup>2</sup> was transformed to create the graph of the function ${g}(${x}) = ${f}(${x} + 5). Which statement describes the relationship between the two graphs?</p>`,
  choices:[`The graph of ${f} was shifted 5 units up to create the graph of ${g}.`,`The graph of ${f} was shifted 5 units down to create the graph of ${g}.`,`The graph of ${f} was shifted 5 units to the left to create the graph of ${g}.`,`The graph of ${f} was shifted 5 units to the right to create the graph of ${g}.`],answer:2},
/* 32 */ {type:'mc',stem:`<p>The graph of an exponential function is shown on the grid.</p>${CG({x:[-4,7],y:[-8,35],gy:5,ly:5,cell:22,w:300,curves:[{f:v=>15*Math.pow(0.7,v)}]})}<p>Which statement is best supported by the graph of the function?</p>`,
  choices:[`The coordinates of the ${x}-intercept are (15, 0).`,`The graph has an asymptote at ${y} = 0.`,'The graph of the exponential function is increasing.',`The coordinates of the ${y}-intercept are (0, 3).`],answer:1},
/* 33 */ {type:'mc',stem:`<p>Function ${f} is a quadratic function. The solutions to ${f}(${x}) = 0 are ${x} = 11 and ${x} = −11.</p><p>Which function could represent ${f}?</p>`,
  choices:[`${f}(${x}) = ${x}<sup>2</sup> − 121`,`${f}(${x}) = ${x}<sup>2</sup> + 121`,`${f}(${x}) = ${x}<sup>2</sup> − 2${x} − 121`,`${f}(${x}) = ${x}<sup>2</sup> + 2${x} + 121`],answer:0},
/* 34 */ {type:'mc',stem:`<p>The table shows some points on the graph of an exponential function.</p>${T([x,`${f}(${x})`],[['−2','64'],['−1','16'],['0','4'],['1','1']])}<p>Which function represents the relation shown in the table?</p>`,
  choices:[`${f}(${x}) = ${F(1,4)}(4)<sup>${x}</sup>`,`${f}(${x}) = 4(${F(1,4)})<sup>${x}</sup>`,`${f}(${x}) = (${F(1,4)})<sup>${x}</sup>`,`${f}(${x}) = 4<sup>${x}</sup>`],answer:1},
/* 35 */ {type:'mc',stem:`<p>A function is shown.</p><span class="eq ctr">${f}(${x}) = −4${x} + 20</span><p>What is the value of ${f}(−8)?</p>`,choices:['52','12','−128','−12'],answer:0},
/* 36 */ {type:'mc',stem:`<p>What value of ${v} makes this equation true?</p><span class="eq ctr">3(${v} + 2) = 2(${v} − 9)</span>`,choices:['−11',`−${F(12,5)}`,`−${F(7,5)}`,'−24'],answer:3},
/* 37 */ {type:'mc',stem:`<p>Which expression is equivalent to 3${x}<sup>2</sup> + 11${x} − 42?</p>`,choices:[`(3${x} − 7)(${x} + 6)`,`(3${x} − 7)(${x} − 6)`,`(3${x} + 7)(${x} + 6)`,'None of these'],answer:0},
/* 38 */ {type:'mc',stem:`<p>A system of equations is shown.</p>${SYSC(`6${x} + 3${y} = 0`,`${y} = ${x} − 1`)}<p>What is the value of ${x} in the solution to this system of equations?</p>`,choices:[`−${F(1,3)}`,F(1,3),`−${F(2,3)}`,F(2,3)],answer:1},
/* 39 */ {type:'graphsys',stem:`<p>What is the solution set for the system of linear inequalities?</p>${SYSC(`${y} ≤ ${F(2,3)}${x} + 2`,`${y} &gt; −${x} − 3`)}<p>Graph the solution set of the system of linear inequalities in the coordinate plane.</p><ul class="steps"><li>First, select the Graph 1 button to graph the line and choose the line style. To graph a line, select two points in the coordinate plane. A line will connect the points.</li><li>Then select the Graph 2 button to graph the line and choose the line style.</li><li>Then select the Solution Set button to select the desired region.</li></ul>`,
  R:6,ineqs:[{m:2/3,b:2,op:'<='},{m:-1,b:-3,op:'>'}],keyText:'Solid line through (0, 2) and (3, 4), dashed line through (−3, 0) and (0, −3), with the region that includes (0, 0) selected'},
/* 40 */ {type:'mc',stem:`<p>A rental truck company charges a flat fee to rent a truck and a cost per mile for driving the truck. One customer rented a truck and drove it 20 miles for a total cost of $33. Another customer rented a truck and drove it 100 miles for a total cost of $85. Which linear equation represents the total cost in dollars, ${y}, for renting a truck and driving it ${x} miles?</p>`,
  choices:[`${y} = 0.85${x}`,`${y} = 0.65${x}`,`${y} = 0.85${x} + 33`,`${y} = 0.65${x} + 20`],answer:3},
/* 41 */ {type:'mc',stem:`<p>What are the solutions of the equation (${x} + 5)<sup>2</sup> = 36?</p>`,choices:['−5 and 6','−11 and 1','−1 and 11','−6 and 5'],answer:1},
/* 42 */ {type:'table',stem:`<p>The graph of ${y} = −${F(1,2)}${x} + 3 is shown on the coordinate grid.</p>${CG({x:[-5,9],y:[-7,7],w:300,curves:[{f:v=>-v/2+3}]})}<p>Determine whether each ordered pair in the table is in the solution set of ${y} ≤ −${F(1,2)}${x} + 3.</p><p>Select the correct answer in each row.</p>`,
  head:'Ordered Pair',rows:['(−2, −1)','(2, 2)','(3, 0)','(6, 1)'],cols:['In the Solution Set','Not in the Solution Set'],answer:[0,0,0,1]},
/* 43 */ {type:'mc',stem:`<p>Which expression is equivalent to (−5${k} + 1)(${k}<sup>2</sup> − ${k} + 4)?</p>`,
  choices:[`5${k}<sup>3</sup> + ${k}<sup>2</sup> + 20${k} + 4`,`−5${k}<sup>3</sup> + 6${k}<sup>2</sup> − 21${k} + 4`,`5${k}<sup>3</sup> − 4${k}<sup>2</sup> + 19${k} + 4`,`−5${k}<sup>3</sup> + ${k}<sup>2</sup> − 20${k} + 4`],answer:1},
/* 44 */ {type:'mc',stem:`<p>A student is reading a book for school. The graph shows the total number of pages remaining to be read in the book, ${y}, after ${x} hours of reading time.</p>${CG({x:[0,22],y:[0,550],gx:2,gy:50,cell:15,fs:9,xmax:20,ymax:500,w:300,title:'Reading a Book',xt:'Time Reading (h)',yt:'Number of Pages Remaining',curves:[{f:v=>400-25*v,from:0,to:16,dots:true}]})}<p>Which inequality best represents the range of the function for this situation?</p>`,
  choices:[`0 ≤ ${y} ≤ 400`,`0 ≤ ${x} ≤ 400`,`0 ≤ ${x} ≤ 16`,`0 ≤ ${y} ≤ 16`],answer:0},
/* 45 */ {type:'boxes',stem:`<p>The height in feet of an object is a function of the time in seconds after the object was launched:</p><ul><li>The object was launched from an initial height of 10 feet.</li><li>The object reached a maximum height of 46 feet after 1.5 seconds and hit the ground after 3.2 seconds.</li></ul><p>For this situation, what is the domain of the function?</p>${DIR_ONE}`,
  tiles:['0','1.5','3.2','10','46'],tpl:'The domain is the set of all real numbers greater than or equal to {0} and less than or equal to {1}.',answer:[0,2],reuse:false,flow:true},
/* 46 */ {type:'mc',stem:`<p>Which equation in point-slope form best describes the line that is parallel to ${y} = −${F(8,9)}${x} + 4 and passes through the point (−3, −6)?</p>`,
  choices:[`${y} + 6 = −${F(9,8)}(${x} + 3)`,`${y} + 6 = ${F(9,8)}(${x} + 3)`,`${y} + 6 = −${F(8,9)}(${x} + 3)`,`${y} + 6 = ${F(8,9)}(${x} + 3)`],answer:2},
/* 47 */ {type:'mc',stem:`<p>The table shows the age of a kitten in months and the kitten’s weight in pounds.</p>${CAP('Kitten’s Weight',`<table class="data"><tr><th>Age (months)</th>${['1.1','1.6','2.1','3.2','4.5','5.2','6.0'].map(v=>`<td>${v}</td>`).join('')}</tr><tr><th>Weight (pounds)</th>${['0.8','1.1','2.3','2.8','3.9','5.2','6.5'].map(v=>`<td>${v}</td>`).join('')}</tr></table>`)}<p>What does the correlation coefficient for the data indicate about the strength of the linear association between the age and the weight of the kitten?</p>`,
  choices:['Weak positive correlation','Strong positive correlation','Weak negative correlation','Strong negative correlation'],answer:1},
/* 48 */ {type:'mc',stem:`<p>A part of an exponential function is graphed on the grid.</p>${CG({x:[-4,4],y:[-4,18],gy:2,ly:2,cell:20,w:240,curves:[{f:v=>4*Math.pow(0.5,v),from:-2,to:1,dots:true}]})}<p>Which inequality best represents the range of the part of the function shown?</p>`,
  choices:[`−2 ≤ ${x} ≤ 1`,`−2 ≤ ${y} ≤ 1`,`2 ≤ ${x} ≤ 16`,`2 ≤ ${y} ≤ 16`],answer:3},
/* 49 */ {type:'mc',stem:`<p>The graph of a linear function is shown on the grid.</p>${SG({R:6,lines:[[-1/3,1]],w:290})}<p>Which value best represents the ${y}-intercept of the function?</p>`,choices:['−1','−3','1','3'],answer:2},
/* 50 */ {type:'mc',stem:`<p>An office supply store sells packs of white paper and packs of blue paper.</p><ul><li>One customer bought 8 packs of white paper and 1 pack of blue paper for $75.01.</li><li>Another customer bought 6 packs of white paper and 2 packs of blue paper for $70.12.</li></ul><p>Which system of equations can be used to determine the cost of a pack of white paper, ${x}, and the cost of a pack of blue paper, ${y}, in dollars?</p>`,
  choices:[SYS(`8${x} + ${y} = 75.01`,`2${x} + 6${y} = 70.12`),SYS(`8${x} + ${y} = 75.01`,`6${x} + 2${y} = 70.12`),SYS(`${x} + 8${y} = 75.01`,`6${x} + 2${y} = 70.12`),SYS(`${x} + 8${y} = 75.01`,`2${x} + 6${y} = 70.12`)],answer:1}
];
/* TEA 2026 answer key: TEKS (new codes), points, reporting category, readiness (R) or supporting (S) */
const KEY26={1:['A1.2.3.B',1,2,'R'],2:['A1.4.7.A',1,4,'R'],3:['A1.3.5.C',1,3,'R'],4:['A1.1.10.E',1,1,'R'],5:['A1.2.4.B',1,2,'S'],6:['A1.5.9.D',2,5,'R'],7:['A1.3.2.I',1,3,'R'],8:['A1.4.7.B',1,4,'S'],9:['A1.2.3.C',1,2,'R'],10:['A1.3.2.H',1,3,'S'],
  11:['A1.4.8.A',2,4,'R'],12:['A1.1.10.C',1,1,'S'],13:['A1.2.3.E',2,2,'S'],14:['A1.3.2.G',1,3,'S'],15:['A1.5.9.C',1,5,'R'],16:['A1.2.3.D',1,2,'R'],17:['A1.3.5.A',2,3,'R'],18:['A1.4.6.A',1,4,'R'],19:['A1.3.5.B',2,3,'S'],20:['A1.1.11.B',1,1,'R'],
  21:['A1.4.7.C',1,4,'R'],22:['A1.1.12.A',1,1,'S'],23:['A1.3.2.A',1,3,'R'],24:['A1.2.3.A',1,2,'S'],25:['A1.1.12.C',1,1,'S'],26:['A1.2.3.B',1,2,'R'],27:['A1.5.9.E',1,5,'S'],28:['A1.4.7.A',1,4,'R'],29:['A1.3.2.C',1,3,'R'],30:['A1.1.11.B',2,1,'R'],
  31:['A1.4.7.C',1,4,'R'],32:['A1.5.9.D',1,5,'R'],33:['A1.4.6.C',1,4,'S'],34:['A1.5.9.C',1,5,'R'],35:['A1.1.12.B',1,1,'S'],36:['A1.3.5.A',1,3,'R'],37:['A1.1.10.E',1,1,'R'],38:['A1.3.5.C',1,3,'R'],39:['A1.2.3.H',2,2,'S'],40:['A1.3.2.C',1,3,'R'],
  41:['A1.4.8.A',1,4,'R'],42:['A1.2.3.D',2,2,'R'],43:['A1.1.10.B',1,1,'S'],44:['A1.3.2.A',1,3,'R'],45:['A1.4.6.A',2,4,'R'],46:['A1.3.2.E',1,3,'S'],47:['A1.2.4.A',1,2,'S'],48:['A1.5.9.A',1,5,'S'],49:['A1.2.3.C',1,2,'R'],50:['A1.3.2.I',1,3,'R']};
ITEMS.forEach((it,i)=>{ const K=KEY26[i+1]; it.teks=K[0]; it.max=K[1]; it.cat=K[2]; it.rs=K[3]==='R'?'Readiness':'Supporting'; });
SpitzTest({
  id:'alg1-2026', title:'Algebra I 2026 Released Test', course:'Algebra I', reference:'alg1',
  categories:{1:'Number and Algebraic Methods',2:'Describing and Graphing Linear Functions, Equations, and Inequalities',3:'Writing and Solving Linear Functions, Equations, and Inequalities',4:'Quadratic Functions and Equations',5:'Exponential Functions and Equations'},
  items:ITEMS
});
})();
