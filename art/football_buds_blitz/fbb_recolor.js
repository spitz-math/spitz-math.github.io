// Team palettes: [main lit, main shade, trim lit, trim shade]
var FB_TEAMS=[
 {id:'orange',name:'Orange',c:['#FF8A1F','#C85600','#1E2A5A','#10173A']},
 {id:'cyan',name:'Cyan',c:['#22D3FF','#0A8FC2','#F4F8FF','#AEBCD2']},
 {id:'red',name:'Red',c:['#EE3B43','#A3141D','#F4F8FF','#AEBCD2']},
 {id:'blue',name:'Royal Blue',c:['#3563FF','#1A34B5','#FFC627','#C48A00']},
 {id:'green',name:'Green',c:['#36CF4F','#178A2C','#F4F8FF','#AEBCD2']},
 {id:'purple',name:'Purple',c:['#9B50FF','#6024C2','#FFC627','#C48A00']},
 {id:'gold',name:'Gold',c:['#FFC627','#C88C00','#2A2A38','#141420']},
 {id:'pink',name:'Pink',c:['#FF62B4','#C42A7C','#F4F8FF','#AEBCD2']}
];
function fbHex(h){return [parseInt(h.substr(1,2),16),parseInt(h.substr(3,2),16),parseInt(h.substr(5,2),16)];}
// sheet uniform is painted in marker green (main) and magenta (trim); swap them for a team, keeping shading and soft edges
function fbRecolor(img,team){
  var cv=document.createElement('canvas'); cv.width=img.width; cv.height=img.height;
  var x=cv.getContext('2d'); x.drawImage(img,0,0);
  var d=x.getImageData(0,0,cv.width,cv.height), p=d.data, c=team.c.map(fbHex);
  var ml=c[0],ms=c[1],tl=c[2],ts=c[3];
  function mix(k,lit,sh,SK,out){ var col=[0,0,0],i,t;
    if(k>=SK){ t=Math.min(1,(k-SK)/(1-SK)); for(i=0;i<3;i++) col[i]=sh[i]+(lit[i]-sh[i])*t; }
    else { t=k/SK; for(i=0;i<3;i++) col[i]=sh[i]*t; }
    return col; }
  for(var i=0;i<p.length;i+=4){ if(!p[i+3]) continue;
    var r=p[i],g=p[i+1],b=p[i+2], base, k, col;
    if(g-Math.max(r,b)>8){ base=Math.max(r,b); k=Math.min(1,(g-base)/(245-base*0.96||1)); col=mix(k,ml,ms,0.61); }
    else if(Math.min(r,b)-g>8){ base=g; k=Math.min(1,(Math.min(r,b)-base)/(240-base*0.94||1)); col=mix(k,tl,ts,0.46); }
    else continue;
    var w=base/255; // share of white/grey mixed in (facemask, gloves edges)
    for(var j=0;j<3;j++) p[i+j]=Math.max(0,Math.min(255,Math.round(base+col[j]*(1-w))));
  }
  x.putImageData(d,0,0); return cv;
}
