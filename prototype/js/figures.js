/* figures.js: simplified stick-figure movement outlines for the rehab exercises.
   Each exercise is two key poses (a, b) that the animator eases between. Limbs are solved with two-bone IK from foot and hand targets,
   so poses are authored as "where the pelvis, feet and hands are". These are movement outlines only, never technique advice. */
(function(){
'use strict';
const HS=window.HS=window.HS||{};
const FLOOR=124;

function ik(a,b,l1,l2,s){
  let dx=b[0]-a[0],dy=b[1]-a[1];const d0=Math.hypot(dx,dy)||.001;
  const d=Math.min(d0,l1+l2-.01),ux=dx/d0,uy=dy/d0;
  const aa=(l1*l1-l2*l2+d*d)/(2*d),h=Math.sqrt(Math.max(0,l1*l1-aa*aa));
  const end=[a[0]+ux*d,a[1]+uy*d];
  return{mid:[a[0]+ux*aa+s*h*(-uy),a[1]+uy*aa+s*h*ux],end:end};
}
const rad=d=>d*Math.PI/180;
function solve(P){
  const t=P.t||0,pel=P.p;
  const neck=[pel[0]+Math.sin(rad(t))*34,pel[1]-Math.cos(rad(t))*34];
  const head=[neck[0]+Math.sin(rad(t))*11,neck[1]-Math.cos(rad(t))*11];
  const f1=P.f,f2=P.f2||P.f;
  const l1=ik(pel,f1,30,30,P.kb==null?-1:P.kb),l2=ik(pel,f2,30,30,P.kb2==null?(P.kb==null?-1:P.kb):P.kb2);
  const h1=P.h||[neck[0],neck[1]+40],h2=P.h2||h1;
  const a1=ik(neck,h1,20,20,P.eb==null?1:P.eb),a2=ik(neck,h2,20,20,P.eb==null?1:P.eb);
  const toe=a=>[a[0]+10,Math.min(FLOOR,a[1]+6)];
  return{pel:pel,neck:neck,head:head,l1:l1,l2:l2,a1:a1,a2:a2,toe1:toe(l1.end),toe2:toe(l2.end)};
}
const pt=a=>a[0].toFixed(1)+','+a[1].toFixed(1);
function render(P){
  const s=solve(P);let o='<line class="fg-floor" x1="4" y1="'+FLOOR+'" x2="196" y2="'+FLOOR+'"/>';
  /* props, behind the body */
  if(P.wall!=null)o+='<line class="fg-prop" x1="'+P.wall+'" y1="-10" x2="'+P.wall+'" y2="'+FLOOR+'"/>';
  if(P.ball)o+='<circle class="fg-ball" cx="'+P.ball[0].toFixed(1)+'" cy="'+P.ball[1].toFixed(1)+'" r="'+P.ball[2]+'"/>';
  if(P.box)o+='<rect class="fg-prop fill" x="'+P.box[0]+'" y="'+P.box[1]+'" width="'+P.box[2]+'" height="'+P.box[3]+'" rx="2"/>';
  if(P.bench)o+='<rect class="fg-prop fill" x="'+P.bench[0]+'" y="'+P.bench[1]+'" width="'+P.bench[2]+'" height="'+P.bench[3]+'" rx="2"/>';
  if(P.seat)o+='<rect class="fg-prop fill" x="'+P.seat[0]+'" y="'+P.seat[1]+'" width="'+P.seat[2]+'" height="'+P.seat[3]+'" rx="2"/>';
  if(P.band)o+='<line class="fg-band" x1="'+s.a1.end[0].toFixed(1)+'" y1="'+s.a1.end[1].toFixed(1)+'" x2="'+P.band[0]+'" y2="'+P.band[1]+'"/>';
  /* far limbs */
  o+='<polyline class="fg-limb far" points="'+pt(s.pel)+' '+pt(s.l2.mid)+' '+pt(s.l2.end)+' '+pt(s.toe2)+'"/>';
  o+='<polyline class="fg-limb far" points="'+pt(s.neck)+' '+pt(s.a2.mid)+' '+pt(s.a2.end)+'"/>';
  /* torso */
  o+='<line class="fg-torso" x1="'+s.pel[0].toFixed(1)+'" y1="'+s.pel[1].toFixed(1)+'" x2="'+s.neck[0].toFixed(1)+'" y2="'+s.neck[1].toFixed(1)+'"/>';
  /* near limbs */
  o+='<polyline class="fg-limb" points="'+pt(s.pel)+' '+pt(s.l1.mid)+' '+pt(s.l1.end)+' '+pt(s.toe1)+'"/>';
  o+='<polyline class="fg-limb" points="'+pt(s.neck)+' '+pt(s.a1.mid)+' '+pt(s.a1.end)+'"/>';
  /* load: bar on the shoulders, plates, carried weights */
  if(P.bar==='neck')o+='<line class="fg-bar" x1="'+(s.neck[0]-26).toFixed(1)+'" y1="'+(s.neck[1]-3).toFixed(1)+'" x2="'+(s.neck[0]+26).toFixed(1)+'" y2="'+(s.neck[1]-3).toFixed(1)+'"/><circle class="fg-plate" cx="'+(s.neck[0]-26).toFixed(1)+'" cy="'+(s.neck[1]-3).toFixed(1)+'" r="6"/><circle class="fg-plate" cx="'+(s.neck[0]+26).toFixed(1)+'" cy="'+(s.neck[1]-3).toFixed(1)+'" r="6"/>';
  if(P.plate)o+='<circle class="fg-plate" cx="'+s.a1.end[0].toFixed(1)+'" cy="'+s.a1.end[1].toFixed(1)+'" r="'+P.plate+'"/>';
  if(P.hipplate)o+='<circle class="fg-plate" cx="'+(s.pel[0]+4).toFixed(1)+'" cy="'+(s.pel[1]-10).toFixed(1)+'" r="10"/>';
  if(P.wts){o+='<circle class="fg-plate" cx="'+s.a1.end[0].toFixed(1)+'" cy="'+(s.a1.end[1]+P.wts[0]-3).toFixed(1)+'" r="'+P.wts[0]+'"/>';o+='<circle class="fg-plate dim" cx="'+s.a2.end[0].toFixed(1)+'" cy="'+(s.a2.end[1]+P.wts[1]-3).toFixed(1)+'" r="'+P.wts[1]+'"/>'}
  if(P.pillow)o+='<ellipse class="fg-pillow" cx="'+s.l1.mid[0].toFixed(1)+'" cy="'+s.l1.mid[1].toFixed(1)+'" rx="6" ry="4"/>';
  /* head last, so it sits on top */
  o+='<circle class="fg-head" cx="'+s.head[0].toFixed(1)+'" cy="'+s.head[1].toFixed(1)+'" r="8"/>';
  o+=P.closed?'<line class="fg-eye" x1="'+(s.head[0]+1).toFixed(1)+'" y1="'+(s.head[1]-1).toFixed(1)+'" x2="'+(s.head[0]+6).toFixed(1)+'" y2="'+(s.head[1]-1).toFixed(1)+'"/>':'<circle class="fg-dot" cx="'+(s.head[0]+3.5).toFixed(1)+'" cy="'+(s.head[1]-1).toFixed(1)+'" r="1.4"/>';
  return o;
}
/* top-down view for the lying lumbar rotation: knees sway while the shoulders stay on the floor */
function renderRot(u){
  const d=(u-.5)*2*26;
  const kL=[88+d,98],kR=[112+d,98],fL=[86+d*.4,122],fR=[114+d*.4,122];
  return '<line class="fg-floor" x1="4" y1="'+FLOOR+'" x2="196" y2="'+FLOOR+'"/>'+
   '<line class="fg-torso" x1="70" y1="26" x2="130" y2="26"/><line class="fg-torso" x1="100" y1="26" x2="100" y2="66"/><line class="fg-torso" x1="88" y1="66" x2="112" y2="66"/>'+
   '<polyline class="fg-limb" points="88,66 '+kL.join(',')+' '+fL.join(',')+'"/><polyline class="fg-limb" points="112,66 '+kR.join(',')+' '+fR.join(',')+'"/>'+
   '<polyline class="fg-limb far" points="70,26 56,40 52,54"/><polyline class="fg-limb far" points="130,26 144,40 148,54"/>'+
   '<circle class="fg-head" cx="100" cy="8" r="8"/>';
}

const S0={p:[100,64],t:0,f:[96,124],f2:[104,124]};
const FIG={
  kneechest:{a:{p:[112,116],t:270,f:[140,124],f2:[172,122],h:[100,121]},b:{p:[112,116],t:270,f:[116,108],f2:[172,122],h:[92,96]}},
  cobra:{a:{p:[122,117],t:270,f:[182,122],h:[90,122]},b:{p:[122,117],t:300,f:[182,122],h:[90,122]}},
  bridge:{a:{p:[100,117],t:270,f:[140,124],h:[92,122],pillow:1},b:{p:[100,96],t:238,f:[140,124],h:[92,122],pillow:1}},
  heelslide:{a:{p:[112,117],t:270,f:[172,122],f2:[140,124],h:[100,121]},b:{p:[112,117],t:270,f:[128,121],f2:[140,124],h:[100,121]}},
  pallof:{a:{p:[100,64],t:0,f:[96,124],f2:[106,124],h:[112,44],band:[190,44]},b:{p:[100,64],t:0,f:[96,124],f2:[106,124],h:[138,34],band:[190,44]}},
  deadbug:{a:{p:[110,117],t:270,f:[140,87],f2:[143,90],h:[78,78],h2:[82,78]},b:{p:[110,117],t:270,f:[140,87],f2:[170,108],h:[40,112],h2:[82,78]}},
  superman:{a:{p:[122,114],t:270,f:[182,122],h:[48,121]},b:{p:[122,114],t:284,f:[182,104],h:[50,100]}},
  plank:{a:{p:[104,95],t:292,f:[160,122],h:[73,124]},b:{p:[104,97],t:292,f:[160,122],h:[73,124]}},
  hinge:{a:{p:[96,92],t:0,f:[118,124],f2:[112,124],h:[104,70],seat:[72,95,56,6]},b:{p:[96,92],t:48,f:[118,124],f2:[112,124],h:[128,82],seat:[72,95,56,6]}},
  farmer:{a:{p:[100,64],t:0,f:[116,124],f2:[84,120],wts:[9,5]},b:{p:[100,64],t:0,f:[84,120],f2:[116,124],wts:[9,5]}},
  sbext:{a:{p:[116,76],t:225,f:[176,124],h:[88,118],ball:[106,100,24]},b:{p:[116,76],t:300,f:[176,124],h:[68,60],ball:[106,100,24]}},
  sbsquat:{a:{p:[76,64],t:0,f:[90,124],f2:[96,124],h:[108,38],wall:44,ball:[58,66,16]},b:{p:[70,88],t:14,f:[96,124],f2:[102,124],h:[106,60],wall:44,ball:[54,80,16]}},
  sbbridge:{a:{p:[104,117],t:270,f:[152,94],f2:[154,96],h:[92,122],ball:[158,108,16]},b:{p:[104,98],t:240,f:[152,94],f2:[154,96],h:[92,122],ball:[158,108,16]}},
  sbplank:{a:{p:[106,96],t:292,f:[162,122],h:[68,88],ball:[68,104,18]},b:{p:[106,98],t:292,f:[162,122],h:[68,88],ball:[68,104,18]}},
  birddog:{a:{p:[116,88],t:272,f:[150,122],f2:[152,122],h:[84,122],h2:[88,122],kb:1,kb2:1},b:{p:[116,88],t:272,f:[150,122],f2:[176,92],h:[44,84],h2:[88,122],kb:1,kb2:1}},
  sideplank:{a:{p:[108,98],t:286,f:[168,124],h:[75,124],h2:[75,52]},b:{p:[108,95],t:286,f:[168,124],h:[75,124],h2:[75,52]}},
  stepup:{a:{p:[100,66],t:0,f:[130,100],f2:[96,124],box:[112,100,44,24]},b:{p:[128,40],t:0,f:[130,100],f2:[124,86],box:[112,100,44,24]}},
  sbcalf:{a:{p:[76,64],t:0,f:[90,124],f2:[96,124],wall:44,ball:[58,60,16]},b:{p:[76,57],t:0,f:[90,117],f2:[96,117],wall:44,ball:[58,53,16]}},
  static:{a:{p:[80,84],t:16,f:[102,124],f2:[108,124],h:[108,56],closed:1},b:{p:[80,89],t:16,f:[102,124],f2:[108,124],h:[108,60],closed:1}},
  squat:{a:{p:[100,64],t:0,f:[96,124],f2:[106,124],h:[106,34],bar:'neck'},b:{p:[78,90],t:22,f:[104,124],f2:[112,124],h:[96,62],bar:'neck'}},
  trapbar:{a:{p:[84,92],t:45,f:[100,124],f2:[108,124],h:[108,112],plate:12},b:{p:[100,64],t:0,f:[96,124],f2:[106,124],h:[102,100],plate:12}},
  split:{a:{p:[100,64],t:0,f:[126,124],f2:[74,124],h:[108,58]},b:{p:[100,92],t:0,f:[126,124],f2:[72,124],h:[108,86]}},
  sumo:{a:{p:[100,64],t:0,f:[72,124],f2:[128,124],kb:1,kb2:-1,h:[94,60],h2:[106,60]},b:{p:[100,90],t:0,f:[72,124],f2:[128,124],kb:1,kb2:-1,h:[94,84],h2:[106,84]}},
  hipthrust:{a:{p:[104,113],t:297,f:[134,124],h:[108,102],bench:[28,100,48,24],hipplate:1},b:{p:[104,93],t:262,f:[134,124],h:[108,82],bench:[28,100,48,24],hipplate:1}},
  calf:{a:{p:[100,64],t:0,f:[96,124],f2:[104,124]},b:{p:[100,56],t:0,f:[96,116],f2:[104,116]}},
  balance:{a:{p:[100,64],t:0,f:[100,124],f2:[114,100],h:[84,46],h2:[116,46]},b:{p:[104,64],t:2,f:[100,124],f2:[118,104],h:[88,46],h2:[120,46]}}
};
HS.figKeys=Object.keys(FIG).concat(['rot']);

function lerpPose(a,b,u){
  const o={};
  Object.keys(a).forEach(k=>{
    const x=a[k],y=b[k];
    if(typeof x==='number'&&typeof y==='number')o[k]=x+(y-x)*u;
    else if(Array.isArray(x)&&Array.isArray(y)&&typeof x[0]==='number')o[k]=x.map((v,i)=>v+(y[i]-v)*u);
    else o[k]=x;
  });
  Object.keys(b).forEach(k=>{if(!(k in o))o[k]=b[k]});
  return o;
}
function frame(key,u){
  if(key==='rot')return renderRot(u);
  const f=FIG[key];if(!f)return'';
  return render(lerpPose(f.a,f.b,u));
}
const LYING={kneechest:1,cobra:1,bridge:1,heelslide:1,deadbug:1,superman:1,sbbridge:1,hipthrust:1,rot:0};
HS.figSvg=function(key,cls){
  const vb=LYING[key]?'8 34 184 96':key==='rot'?'40 -14 120 148':'0 -14 200 148';
  return '<svg class="fig '+(cls||'')+'" data-fig="'+key+'" viewBox="'+vb+'" role="img" aria-label="Animated outline of the movement">'+frame(key,0)+'</svg>';
};

/* one shared animation loop for every figure on screen */
let last=0;
function tick(ts){
  if(ts-last>33){
    last=ts;
    const u=(1-Math.cos(ts/2600*Math.PI*2))/2;
    const reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const els=document.querySelectorAll('svg.fig');
    for(let i=0;i<els.length;i++){
      const el=els[i],r=el.getBoundingClientRect();
      if(r.bottom<0||r.top>innerHeight)continue;
      el.innerHTML=frame(el.dataset.fig,reduce?.5:u);
    }
  }
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
HS.frame=frame;
})();
