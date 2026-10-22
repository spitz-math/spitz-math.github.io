/* Algebra I Practice Set 1: original practice items written for Spitz Checkpoint. */
(function(){
const ITEMS=[
 {type:'mc',teks:'A.3B',label:'Multiple choice',
  stem:`<p>The table shows some values of a linear function.</p>
   <table class="data"><tr><th>${x}</th><td>2</td><td>5</td><td>8</td><td>11</td></tr><tr><th>${y}</th><td>7</td><td>13</td><td>19</td><td>25</td></tr></table>
   <p>What is the rate of change of ${y} with respect to ${x}?</p>`,
  choices:[F(1,2),'2','3','6'],answer:1},
 {type:'ms',teks:'A.10E',label:'Multiselect',
  stem:`<p>Which expressions are factors of ${x}<sup>2</sup> − ${x} − 12?</p><p class="direct">Select TWO correct answers.</p>`,
  choices:[`${x} + 4`,`${x} − 4`,`${x} + 3`,`${x} − 3`,`${x} − 12`],answer:[1,2]},
 {type:'num',teks:'A.5A',label:'Equation editor',
  stem:`<p>What value of ${x} makes this equation true?</p><span class="eq">4(${x} − 3) + 2${x} = 18</span><p class="direct">Enter your answer in the box.</p>`,
  answer:5},
 {type:'inline',teks:'A.3C',label:'Drop-down',
  stem:`<p class="direct">Select the correct answer from each drop-down menu.</p>`,
  text:`The graph of ${y} = 4 − 3${x} has a slope of {0} and crosses the ${y}-axis at {1}. As ${x} increases, the function is {2}.`,
  drops:[['4','−3','3',F(1,3)],['(0, 4)','(4, 0)','(0, −3)','(−3, 0)'],['increasing','decreasing','constant']],
  answer:[1,0,1]},
 {type:'table',teks:'A.5B',label:'Match table',
  stem:`<p>Consider this inequality.</p><span class="eq">2${x} − 5 &lt; 7</span><p class="direct">For each value of ${x}, select whether it is a solution to the inequality.</p>`,
  rows:[`${x} = 3`,`${x} = 6`,`${x} = −2`,`${x} = 8`],cols:['Solution','Not a solution'],answer:[0,1,0,1]},
 {type:'dnd',teks:'A.3A',label:'Drag and drop',
  stem:`<p>Each equation represents a line.</p><p class="direct">Drag each equation into the box that shows its slope.</p>`,
  tiles:[`${y} = 2${x} + 5`,`4${x} − 2${y} = 6`,`${y} = −${F(1,2)}${x} + 1`,`${x} + 2${y} = 8`,`${y} = 7`,`${y} − 3 = 0`],
  zones:['Slope of 2',`Slope of −${F(1,2)}`,'Slope of 0'],answer:[0,0,1,1,2,2]},
 {type:'mc',teks:'A.2B',label:'Multiple choice with graph',
  stem:`<p>The graph of a line is shown.</p>{GRAPH}<p>Which equation represents the line?</p>`,
  graph:{R:6,lines:[[2,-2]]},
  choices:[`${y} = ${F(1,2)}${x} − 2`,`${y} = 2${x} + 2`,`${y} = 2${x} − 2`,`${y} = −2${x} − 2`],answer:2},
 {type:'num',teks:'A.12B',label:'Equation editor',
  stem:`<p>A function is shown.</p><span class="eq">${V('f')}(${x}) = ${x}<sup>2</sup> − 3${x} + 2</span><p>What is the value of ${V('f')}(−2)?</p><p class="direct">Enter your answer in the box.</p>`,
  answer:12},
 {type:'ms',teks:'A.9C',label:'Multiselect',
  stem:`<p>The balance of a savings account can be modeled by ${V('f')}(${x}) = 500(1.04)<sup>${x}</sup>, where ${x} is the number of years since the account was opened.</p><p>Which statements are true?</p><p class="direct">Select TWO correct answers.</p>`,
  choices:['The balance grows by 4% each year.','The balance grows by $4 each year.','The starting balance was $500.','The starting balance was $1.04.','The balance decreases over time.'],answer:[0,2]},
 {type:'graph',teks:'A.5C',label:'Graphing (plot a point)',
  stem:`<p>Consider this system of equations.</p><span class="eq">${y} = ${x} + 1<br>${y} = −2${x} + 7</span><p class="direct">Click the grid to plot the point that represents the solution to the system.</p>`,
  R:10,answer:[2,3]},
 {type:'graphline',teks:'A.3C',label:'Graphing (draw a line)',
  stem:`<p>Graph the line represented by this equation.</p><span class="eq">2${x} − 3${y} = 12</span><p class="direct">Use the Add Line tool to graph the line. Click two points on the grid to draw a line through them.</p>`,
  R:10,eq:[2,-3,12]}
];
SpitzTest({ id:'practice-1', title:'Algebra I Practice Set 1', course:'Algebra I', reference:'alg1', items:ITEMS });
})();
