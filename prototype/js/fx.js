/* fx.js: synthesised sound design, haptics, background particles, bursts, flying orbs, number count-up, themes. */
(function(){
'use strict';
const HS=window.HS=window.HS||{};
const E=HS.E,F=HS.fx={};

/* ---------------- sound ---------------- */
let ac=null,master=null,nbuf=null;
function ctx(){
  if(!E.cfg().sound)return null;
  try{
    if(!ac){
      ac=new (window.AudioContext||window.webkitAudioContext)();master=ac.createGain();master.connect(ac.destination);
      nbuf=ac.createBuffer(1,ac.sampleRate,ac.sampleRate);const d=nbuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
    }
    if(ac.state==='suspended')ac.resume();
    master.gain.value=E.cfg().volume;
    return ac;
  }catch(e){return null}
}
F.unlock=ctx;
document.addEventListener('pointerdown',ctx,{passive:true});
const now=()=>ac.currentTime+.005;
function note(f,t,d,o){
  o=o||{};const a=ac;
  const osc=a.createOscillator(),g=a.createGain();osc.type=o.type||'sine';osc.frequency.setValueAtTime(f,t);
  if(o.to)osc.frequency.exponentialRampToValueAtTime(o.to,t+d);
  if(o.det)osc.detune.value=o.det;
  let n=osc;if(o.lp){const fl=a.createBiquadFilter();fl.type='lowpass';fl.frequency.value=o.lp;osc.connect(fl);n=fl}
  n.connect(g);g.connect(master);
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(o.vol||.2,t+(o.att||.006));g.gain.exponentialRampToValueAtTime(.0001,t+d);
  osc.start(t);osc.stop(t+d+.05);
}
function noise(t,d,o){
  o=o||{};const a=ac,s=a.createBufferSource(),fl=a.createBiquadFilter(),g=a.createGain();
  s.buffer=nbuf;fl.type=o.hp?'highpass':'bandpass';fl.frequency.value=o.f||2000;fl.Q.value=o.q||.7;
  s.connect(fl);fl.connect(g);g.connect(master);
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(o.vol||.15,t+.004);g.gain.exponentialRampToValueAtTime(.0001,t+d);
  s.start(t,Math.random()*.5);s.stop(t+d+.05);
}
const PENT=[0,2,4,7,9,12,14,16];
const SND={
  tap(){const t=now();noise(t,.025,{f:3500,q:.8,vol:.12});note(1200,t,.03,{vol:.05})},
  nav(){const t=now();noise(t,.14,{f:900,q:.6,vol:.1});note(500,t,.12,{to:950,type:'triangle',vol:.06})},
  /* one voice per food type; the combo count walks up a pentatonic scale like a rhythm game */
  add(a){
    const t=now(),m=Math.pow(2,PENT[Math.min(a.combo||0,7)]/12);
    if(a.cat==='protein'){note(150,t,.16,{to:55,vol:.55});note(520*m,t+.02,.14,{type:'triangle',vol:.22});note(1040*m,t+.06,.1,{vol:.1})}
    else if(a.cat==='carb'){note(300,t,.1,{to:560,vol:.32});note(660*m,t+.05,.12,{type:'triangle',vol:.14})}
    else if(a.cat==='side'){note(880*m,t,.07,{type:'triangle',vol:.22});note(1320*m,t+.035,.09,{type:'triangle',vol:.12})}
    else if(a.cat==='treat'){note(330,t,.22,{to:200,type:'sawtooth',lp:900,vol:.16});note(311,t+.09,.22,{to:180,type:'sawtooth',lp:800,vol:.12})}
    else{noise(t,.18,{f:1200,q:.7,vol:.18});note(500,t,.18,{to:300,type:'triangle',vol:.14})}
  },
  remove(){const t=now();note(520,t,.12,{to:200,type:'triangle',vol:.2});noise(t,.08,{f:1500,vol:.08})},
  tick(g){const t=now();noise(t,.015,{f:4200,q:1,vol:.1});note(300+(g||0)*1.3,t,.025,{vol:.08})},
  plate(){const t=now();[784,988,1319].forEach((f,i)=>note(f,t+i*.1,.28,{type:'triangle',vol:.2}));noise(t,.35,{f:2600,q:.4,vol:.07})},
  quest(){const t=now();[659,784,988,1319,1568].forEach((f,i)=>note(f,t+i*.07,.28,{type:'triangle',vol:.17}));note(2637,t+.36,.45,{vol:.06})},
  auraUp(n){const t=now(),c=n>=100?7:n>=50?5:3;for(let i=0;i<c;i++)note(1300+Math.random()*1500,t+i*.055,.2,{vol:.06});note(880,t,.1,{type:'triangle',vol:.1})},
  auraDown(){const t=now();note(180,t,.45,{to:60,type:'sawtooth',lp:500,vol:.28});note(190,t,.45,{to:62,type:'sawtooth',lp:500,det:35,vol:.18})},
  level(){
    const t=now();[[392,494,587],[440,554,659],[523,659,784,1047]].forEach((ch,i)=>ch.forEach(f=>note(f,t+i*.16,i===2?.9:.3,{type:'sawtooth',lp:2200,vol:.07})));
    note(65,t+.32,.8,{to:40,vol:.5});noise(t,.5,{f:3000,q:.3,vol:.06});
  },
  rank(){SND.level();const t=now()+.7;[523,659,784,1047,1319].forEach((f,i)=>note(f,t+i*.12,.8,{type:'sawtooth',lp:2600,vol:.07}));note(55,t,1.4,{to:35,vol:.55})},
  gate(){const t=now();[1,2.76,5.4,8.9].forEach((p,i)=>note(82*p,t,2.4/(i+1),{vol:.34/(i+1)}));note(660,t+.05,1.2,{type:'triangle',vol:.1})},
  weigh(){const t=now();noise(t,.02,{f:3000,vol:.12});note(440+Math.random()*80,t,.05,{type:'square',lp:1500,vol:.08})},
  sharp(){const t=now();for(let i=0;i<3;i++){note(880,t+i*.22,.12,{type:'square',lp:2500,vol:.12});note(620,t+i*.22+.11,.1,{type:'square',lp:2500,vol:.12})}},
  fatigue(){const t=now();note(70,t,.2,{to:45,vol:.6});note(70,t+.25,.24,{to:42,vol:.5});note(58,t+.6,.5,{to:35,type:'sawtooth',lp:300,vol:.2})},
  set(){const t=now();noise(t,.03,{f:1800,q:.9,vol:.25});note(220,t,.08,{to:140,vol:.38});note(660,t+.03,.1,{type:'triangle',vol:.14})},
  pr(){const t=now();[523,659,784,1047,1319,1568].forEach((f,i)=>note(f,t+i*.09,.34,{type:'sawtooth',lp:2400,vol:.09}));for(let i=0;i<6;i++)note(1800+Math.random()*1800,t+.4+i*.05,.2,{vol:.05})},
  timer(){const t=now();for(let i=0;i<3;i++)note(1000,t+i*.16,.1,{type:'square',lp:3000,vol:.1})},
  pick(){const t=now();note(990,t,.06,{type:'triangle',vol:.12});note(1480,t+.05,.08,{type:'triangle',vol:.08})}
};
F.play=function(name,arg){if(!ctx())return;try{SND[name]&&SND[name](arg)}catch(e){}};
F.vib=function(p){if(!E.cfg().haptics)return;try{navigator.vibrate&&navigator.vibrate(p)}catch(e){}};

/* sound and haptics for the game events */
E.on('aura',n=>{if(n>0){F.play('auraUp',n);F.vib(n>=100?[20,30,30]:12)}else if(n<0){F.play('auraDown');F.vib([60,40,90])}});
E.on('level',e=>{F.play(e.rankUp?'rank':'level');F.vib([60,40,60,40,160]);F.burstCenter(e.rankUp?90:60)});
E.on('locked',()=>{F.play('fatigue');F.vib([40,60,40])});
E.on('fatigue',on=>{if(on){F.play('fatigue');F.vib([80,60,80,60,160])}else{F.play('quest');F.vib([20,30,40])}});
E.on('gate',()=>{F.play('gate');F.vib([40,40,40,40,200]);F.burstCenter(120)});
E.on('penalty',()=>F.vib([100,60,100,60,220]));

/* ---------------- themes ---------------- */
const THEMES={
  shadow:{glow:'#3aa8ff',d:'#1b6fb8',acc:'#8b5cff',name:'Shadow'},
  monarch:{glow:'#a678ff',d:'#5b32b8',acc:'#ff5fd2',name:'Monarch'},
  ember:{glow:'#ff8a3d',d:'#b4501a',acc:'#ffd24a',name:'Ember'},
  jade:{glow:'#2ee6a6',d:'#12805c',acc:'#4ab8ff',name:'Jade'}
};
F.THEMES=THEMES;
F.applyTheme=function(){
  const t=THEMES[E.cfg().theme]||THEMES.shadow,r=document.documentElement.style;
  r.setProperty('--glow',t.glow);r.setProperty('--glow-d',t.d);r.setProperty('--violet',t.acc);
  const m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content','#05070d');
};

/* ---------------- count up ---------------- */
F.countTo=function(el,to,fmtFn,ms){
  if(!el)return;fmtFn=fmtFn||(v=>Math.round(v).toLocaleString('en-US'));
  const from=parseFloat(el.dataset.v);const start=isNaN(from)?to:from;el.dataset.v=to;
  if(start===to||(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)){el.textContent=fmtFn(to);return}
  const t0=performance.now(),dur=ms||700;
  (function step(t){const u=Math.min(1,(t-t0)/dur),e=1-Math.pow(1-u,3);el.textContent=fmtFn(start+(to-start)*e);if(u<1&&el.isConnected)requestAnimationFrame(step);else el.textContent=fmtFn(to)})(t0);
};

/* ---------------- flying orbs ---------------- */
F.fly=function(from,to,html,opts){
  opts=opts||{};
  const a=from.getBoundingClientRect?from.getBoundingClientRect():{left:from.x,top:from.y,width:0,height:0},b=to.getBoundingClientRect();
  const sx=a.left+a.width/2,sy=a.top+a.height/2,ex=b.left+b.width/2,ey=b.top+b.height/2;
  const el=document.createElement('div');el.className='orb '+(opts.cls||'');el.innerHTML=html;document.body.appendChild(el);
  const dx=ex-sx,dy=ey-sy,mx=dx*.5,my=dy*.5-(opts.arc||60);
  if(!el.animate){el.remove();if(opts.done)opts.done();return}
  const an=el.animate([{transform:'translate('+sx+'px,'+sy+'px) translate(-50%,-50%) scale(.6)',opacity:0},
    {transform:'translate('+(sx+mx)+'px,'+(sy+my)+'px) translate(-50%,-50%) scale(1.25)',opacity:1,offset:.45},
    {transform:'translate('+ex+'px,'+ey+'px) translate(-50%,-50%) scale(.5)',opacity:.9}],{duration:opts.ms||620,easing:'cubic-bezier(.3,.7,.3,1)'});
  an.onfinish=()=>{el.remove();if(opts.done)opts.done()};
};

/* ---------------- background particles and bursts ---------------- */
const reduce=()=>window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let bg,bx,parts=[],W=0,H=0,glowCol='#3aa8ff',lastCol=0;
function sizeCanvas(c){const r=window.devicePixelRatio||1;c.width=innerWidth*r;c.height=innerHeight*r;c.style.width=innerWidth+'px';c.style.height=innerHeight+'px';const x=c.getContext('2d');x.setTransform(r,0,0,r,0,0);W=innerWidth;H=innerHeight}
F.startBg=function(){
  bg=document.getElementById('bg');if(!bg)return;bx=bg.getContext('2d');sizeCanvas(bg);
  addEventListener('resize',()=>sizeCanvas(bg));
  for(let i=0;i<46;i++)parts.push(spawn(true));
  (function loop(ts){
    requestAnimationFrame(loop);
    if(document.hidden||reduce())return;
    if(ts-lastCol>1500){lastCol=ts;glowCol=getComputedStyle(document.documentElement).getPropertyValue('--glow').trim()||glowCol}
    bx.clearRect(0,0,W,H);
    const lvl=E.lv(),fat=E.fatigued(),n=fat?18:Math.min(46,22+lvl.L*2);
    bx.fillStyle=fat?'#7f8b99':glowCol;
    for(let i=0;i<n;i++){
      const p=parts[i];p.y-=p.v*(fat?.4:1);p.x+=Math.sin(ts/900+p.ph)*.25;
      if(p.y<-10){parts[i]=spawn(false);continue}
      bx.globalAlpha=p.a*(.5+.5*Math.sin(ts/500+p.ph))*(fat?.4:1);
      bx.beginPath();bx.arc(p.x,p.y,p.r,0,6.283);bx.fill();
    }
    bx.globalAlpha=1;
  })(0);
};
function spawn(any){return{x:Math.random()*(W||400),y:any?Math.random()*(H||800):(H||800)+10,v:.15+Math.random()*.5,r:.8+Math.random()*1.8,a:.2+Math.random()*.5,ph:Math.random()*6}}
let burstC,bctx,bparts=[],bRun=false;
F.burst=function(x,y,n,cols){
  if(reduce())return;
  burstC=burstC||document.getElementById('burst');if(!burstC)return;
  if(!bctx){bctx=burstC.getContext('2d');sizeCanvas(burstC);addEventListener('resize',()=>sizeCanvas(burstC))}
  const cs=cols||[glowCol,'#f5c451','#ffffff'];
  for(let i=0;i<n;i++){const a=Math.random()*6.283,s=2+Math.random()*7;bparts.push({x:x,y:y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-3,r:2+Math.random()*3,c:cs[i%cs.length],l:1})}
  if(!bRun){bRun=true;requestAnimationFrame(stepB)}
};
function stepB(){
  bctx.clearRect(0,0,W,H);
  bparts=bparts.filter(p=>p.l>0);
  bparts.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=.28;p.vx*=.985;p.l-=.016;bctx.globalAlpha=Math.max(0,p.l);bctx.fillStyle=p.c;bctx.fillRect(p.x,p.y,p.r,p.r*1.6)});
  bctx.globalAlpha=1;
  if(bparts.length)requestAnimationFrame(stepB);else{bRun=false;bctx.clearRect(0,0,W,H)}
}
F.burstCenter=function(n){F.burst(innerWidth/2,innerHeight*.38,n||60)};
F.burstAt=function(el,n){const r=el.getBoundingClientRect();F.burst(r.left+r.width/2,r.top+r.height/2,n||24)};
})();
