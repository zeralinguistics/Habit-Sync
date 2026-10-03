/* fx.js: synthesised sound design, haptics, realm themes, ambient particles per realm, bursts, flying orbs, number count-up. */
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
  if(o.vib){const l=a.createOscillator(),lg=a.createGain();l.frequency.value=o.vib;lg.gain.value=f*.02;l.connect(lg);lg.connect(osc.frequency);l.start(t);l.stop(t+d+.05)}
  let n=osc;if(o.lp){const fl=a.createBiquadFilter();fl.type='lowpass';fl.frequency.value=o.lp;osc.connect(fl);n=fl}
  n.connect(g);g.connect(master);
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(o.vol||.2,t+(o.att||.006));g.gain.exponentialRampToValueAtTime(.0001,t+d);
  osc.start(t);osc.stop(t+d+.05);
}
function noise(t,d,o){
  o=o||{};const a=ac,s=a.createBufferSource(),fl=a.createBiquadFilter(),g=a.createGain();
  s.buffer=nbuf;fl.type=o.hp?'highpass':'bandpass';fl.frequency.setValueAtTime(o.f||2000,t);if(o.to)fl.frequency.exponentialRampToValueAtTime(o.to,t+d);fl.Q.value=o.q||.7;
  s.connect(fl);fl.connect(g);g.connect(master);
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(o.vol||.15,t+(o.att||.004));g.gain.exponentialRampToValueAtTime(.0001,t+d);
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
  pick(){const t=now();note(990,t,.06,{type:'triangle',vol:.12});note(1480,t+.05,.08,{type:'triangle',vol:.08})},
  /* the new voices */
  water(){const t=now();note(260,t,.13,{to:720,vol:.26});note(420,t+.075,.1,{to:900,vol:.16});noise(t,.2,{f:700,to:2400,q:1.2,vol:.1})},
  shake(){const t=now();for(let i=0;i<4;i++){noise(t+i*.09,.07,{f:380,q:1.4,vol:.22});note(90,t+i*.09,.06,{to:60,vol:.18})}},
  chest(){const t=now();noise(t,.5,{f:600,to:6000,q:.8,vol:.12,att:.2});[523,659,784,1047,1319,1568,2093].forEach((f,i)=>note(f,t+.18+i*.055,.5,{type:'triangle',vol:.1}));note(80,t,.4,{to:40,vol:.4})},
  unlock(){const t=now();[392,523,659,784,1047].forEach((f,i)=>note(f,t+i*.09,.5,{type:'sawtooth',lp:2400,vol:.07}));for(let i=0;i<8;i++)note(2000+Math.random()*2400,t+.45+i*.06,.25,{vol:.04});note(98,t,.6,{to:60,vol:.35})},
  goal(){const t=now();note(1319,t,.28,{type:'triangle',vol:.16});note(1760,t+.1,.5,{type:'triangle',vol:.14});note(2637,t+.2,.4,{vol:.05})},
  streak(){const t=now();noise(t,.55,{f:300,to:5000,hp:true,q:.4,vol:.12,att:.25});note(220,t,.5,{to:440,type:'sawtooth',lp:900,vol:.12});[784,988,1175].forEach((f,i)=>note(f,t+.3+i*.08,.3,{type:'triangle',vol:.1}))},
  arise(){const t=now();note(55,t,2,{type:'sawtooth',lp:260,vol:.45,att:.5});note(82,t+.1,1.8,{type:'sawtooth',lp:300,vol:.3,att:.6});noise(t,1.6,{f:200,to:3000,q:.5,vol:.1,att:.8});[1,2.76,5.4].forEach((p,i)=>note(110*p,t+1.1,2/(i+1),{vol:.26/(i+1)}));note(40,t+1.1,1.4,{to:30,vol:.6})},
  wah(){const t=now();[[392,.28],[370,.28],[349,.28]].forEach((n,i)=>note(n[0],t+i*.3,n[1],{type:'sawtooth',lp:900,vol:.11,vib:6}));note(330,t+.9,.8,{to:196,type:'sawtooth',lp:800,vol:.12,vib:7})},
  equip(){const t=now();noise(t,.06,{f:5000,hp:true,vol:.14});note(1500,t,.05,{type:'square',lp:3000,vol:.06});note(2200,t+.05,.08,{type:'triangle',vol:.08});note(110,t,.12,{to:70,vol:.25})},
  star(i){const t=now();note(880*Math.pow(2,(i||0)*4/12),t,.28,{type:'triangle',vol:.16});note(1760*Math.pow(2,(i||0)*4/12),t+.04,.2,{vol:.05})},
  hype(){const t=now();[[196,247,294],[262,330,392],[330,392,523]].forEach((ch,i)=>ch.forEach(f=>note(f,t+i*.14,i===2?.7:.22,{type:'sawtooth',lp:2000,vol:.07})));note(55,t,.5,{to:38,vol:.6});noise(t,.12,{f:1800,q:.5,vol:.18})},
  camp(){const t=now();[196,294,392,494].forEach((f,i)=>note(f,t+i*.2,1.2,{type:'triangle',vol:.1,att:.1}))},
  flame(){const t=now();noise(t,.4,{f:900,to:3000,q:.6,vol:.1,att:.12});note(300,t,.3,{to:600,type:'triangle',vol:.1})}
};
F.play=function(name,arg){if(!ctx())return;try{SND[name]&&SND[name](arg)}catch(e){}};
F.vib=function(p){if(!E.cfg().haptics)return;try{navigator.vibrate&&navigator.vibrate(p)}catch(e){}};

/* sound and haptics for the game events */
E.on('aura',n=>{if(n>0){F.play('auraUp',n);F.vib(n>=100?[20,30,30]:12)}else if(n<0){F.play('auraDown');F.vib([60,40,90])}});
E.on('level',e=>{F.play(e.rankUp?'rank':'level');F.vib([60,40,60,40,160]);F.burstCenter(e.rankUp?90:60)});
E.on('locked',()=>{F.play('fatigue');F.vib([40,60,40])});
E.on('fatigue',on=>{if(on){F.play('fatigue');F.vib([80,60,80,60,160])}else{F.play('quest');F.vib([20,30,40])}});
E.on('gate',()=>{F.play('gate');F.vib([40,40,40,40,200]);F.burstCenter(120)});
E.on('penalty',()=>{F.vib([100,60,100,60,220]);setTimeout(()=>F.play('wah'),500)});
E.on('goal',()=>{F.play('goal');F.vib([20,40,20])});
E.on('streak',()=>{F.play('streak');F.vib([30,30,30,30,90])});
E.on('unlock',()=>{F.play('unlock');F.vib([30,40,30,40,120])});
E.on('water',w=>{F.play('water');F.vib(w.hit?[20,30,60]:8)});
E.on('chest',()=>{F.play('chest');F.vib([40,30,40,30,160])});

/* ---------------- themes: five realm looks, plus Jade for fun ---------------- */
/* glr and acr are r,g,b triples so the stylesheet can use rgba(var(--glr),.2) everywhere. */
const T=(name,glow,d,acc,glr,acr,bg,panel,p2,line,sheet,tile1,tile2,b1,b2)=>({name:name,glow:glow,d:d,acc:acc,glr:glr,acr:acr,bg:bg,panel:panel,p2:p2,line:line,sheet:sheet,tile1:tile1,tile2:tile2,b1:b1,b2:b2});
const THEMES={
  shadow: T('Shadow','#3aa8ff','#1b6fb8','#8b5cff','58,168,255','139,92,255','#05070d','rgba(9,17,36,.82)','#0d1a33','#1d4d7e','#070d1c','#10203d','#0a1429','#1a2f55','#060b18'),
  monarch:T('Monarch','#a678ff','#5b32b8','#ff5fd2','166,120,255','255,95,210','#08050f','rgba(20,11,42,.82)','#1a0f33','#4a2a86','#0c0718','#241448','#140a2c','#2b1a55','#0b0618'),
  ember:  T('Ember','#ff8a3d','#b4501a','#ffd24a','255,138,61','255,210,74','#0d0705','rgba(34,15,7,.82)','#2a120a','#7a3a14','#12090a','#3a1b0d','#1f0d07','#4a2210','#12070a'),
  frost:  T('Frost','#7fe3ff','#2a8fb0','#c9f1ff','127,227,255','201,241,255','#040a10','rgba(8,25,38,.82)','#0c2233','#2a6a86','#061219','#12354b','#091a28','#1f4a63','#06121c'),
  gold:   T('Gold','#f5c451','#a8761a','#fff1b8','245,196,81','255,241,184','#0b0803','rgba(32,23,7,.82)','#261c08','#7a5a1a','#100b04','#3a2a0c','#1f1606','#4d3811','#120d04'),
  jade:   T('Jade','#2ee6a6','#12805c','#4ab8ff','46,230,166','74,184,255','#040d0a','rgba(6,29,23,.82)','#0a2a20','#1d7058','#06130f','#0f3a2c','#082219','#17503d','#06150f')
};
F.THEMES=THEMES;
F.themeId=function(){const c=E.cfg().theme;return c==='auto'||!THEMES[c]?E.realm().theme:c};
F.applyTheme=function(){
  const t=THEMES[F.themeId()]||THEMES.shadow,r=document.documentElement,st=r.style;
  st.setProperty('--glow',t.glow);st.setProperty('--glow-d',t.d);st.setProperty('--violet',t.acc);st.setProperty('--glr',t.glr);st.setProperty('--acr',t.acr);
  st.setProperty('--bg',t.bg);st.setProperty('--panel',t.panel);st.setProperty('--panel2',t.p2);st.setProperty('--line',t.line);st.setProperty('--sheet',t.sheet);
  st.setProperty('--tile1',t.tile1);st.setProperty('--tile2',t.tile2);st.setProperty('--b1',t.b1);st.setProperty('--b2',t.b2);
  r.dataset.realm=E.realm().id;r.dataset.theme=F.themeId();
  const m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',t.bg);
  lastCol=0;
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

/* ---------------- ambient particles: each realm has its own weather ---------------- */
const reduce=()=>window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const rnd=n=>Math.random()*n;
let bg,bx,parts=[],W=0,H=0,glowCol='#3aa8ff',accCol='#8b5cff',lastCol=0,kindNow='';
function sizeCanvas(c){const r=window.devicePixelRatio||1;c.width=innerWidth*r;c.height=innerHeight*r;c.style.width=innerWidth+'px';c.style.height=innerHeight+'px';const x=c.getContext('2d');x.setTransform(r,0,0,r,0,0);W=innerWidth;H=innerHeight}
/* spawn(any) makes one particle; step moves it and returns true when it is gone; draw paints it */
const KINDS={
  souls:{n:46,
    spawn:any=>({x:rnd(W||400),y:any?rnd(H||800):(H||800)+10,v:.15+rnd(.5),r:.8+rnd(1.8),a:.2+rnd(.5),ph:rnd(6)}),
    step:(p,ts,sl)=>{p.y-=p.v*sl;p.x+=Math.sin(ts/900+p.ph)*.25;return p.y<-10},
    draw:(p,ts,sl)=>{bx.globalAlpha=p.a*(.5+.5*Math.sin(ts/500+p.ph))*sl;bx.fillStyle=glowCol;bx.beginPath();bx.arc(p.x,p.y,p.r,0,6.283);bx.fill()}},
  wisps:{n:30,
    spawn:any=>({x:rnd(W||400),y:any?rnd(H||800):(H||800)+20,v:.25+rnd(.5),r:6+rnd(14),a:.18+rnd(.35),ph:rnd(6),dir:Math.random()<.5?-1:1}),
    step:(p,ts,sl)=>{p.y-=p.v*sl;p.x+=Math.sin(ts/1300+p.ph)*.5*p.dir;return p.y<-30},
    draw:(p,ts,sl)=>{bx.globalAlpha=p.a*(.5+.5*Math.sin(ts/700+p.ph))*sl;bx.strokeStyle=p.dir>0?glowCol:accCol;bx.lineWidth=1.4;bx.beginPath();bx.moveTo(p.x,p.y);bx.quadraticCurveTo(p.x+p.dir*p.r*.8,p.y-p.r*.6,p.x,p.y-p.r*1.6);bx.stroke()}},
  embers:{n:44,
    spawn:any=>({x:rnd(W||400),y:any?rnd(H||800):(H||800)+10,v:.5+rnd(1.1),r:.9+rnd(1.8),a:.4+rnd(.5),ph:rnd(6),hot:Math.random()<.4}),
    step:(p,ts,sl)=>{p.y-=p.v*sl;p.x+=Math.sin(ts/380+p.ph)*.55;return p.y<-10},
    draw:(p,ts,sl)=>{bx.globalAlpha=p.a*(.4+.6*Math.abs(Math.sin(ts/170+p.ph)))*sl;bx.fillStyle=p.hot?accCol:glowCol;bx.fillRect(p.x,p.y,p.r,p.r)}},
  snow:{n:60,
    spawn:any=>({x:rnd(W||400),y:any?rnd(H||800):-10,v:.35+rnd(.8),r:.9+rnd(2.2),a:.35+rnd(.5),ph:rnd(6)}),
    step:(p,ts,sl)=>{p.y+=p.v*sl;p.x+=Math.sin(ts/1100+p.ph)*.45;return p.y>(H||800)+10},
    draw:(p,ts,sl)=>{bx.globalAlpha=p.a*sl;bx.fillStyle='#e8f6ff';bx.beginPath();bx.arc(p.x,p.y,p.r,0,6.283);bx.fill()}},
  gold:{n:40,
    spawn:any=>({x:rnd(W||400),y:any?rnd(H||800):(H||800)+10,v:.12+rnd(.35),r:1.4+rnd(2.6),a:.4+rnd(.5),ph:rnd(6)}),
    step:(p,ts,sl)=>{p.y-=p.v*sl;p.x+=Math.sin(ts/1000+p.ph)*.2;return p.y<-10},
    draw:(p,ts,sl)=>{const tw=Math.max(0,Math.sin(ts/260+p.ph));bx.globalAlpha=p.a*tw*sl;bx.strokeStyle=tw>.8?'#fff6cf':glowCol;bx.lineWidth=1.2;const r=p.r*(1+tw);bx.beginPath();bx.moveTo(p.x-r,p.y);bx.lineTo(p.x+r,p.y);bx.moveTo(p.x,p.y-r);bx.lineTo(p.x,p.y+r);bx.stroke()}}
};
F.startBg=function(){
  bg=document.getElementById('bg');if(!bg)return;bx=bg.getContext('2d');sizeCanvas(bg);
  addEventListener('resize',()=>sizeCanvas(bg));
  (function loop(ts){
    requestAnimationFrame(loop);
    if(document.hidden||reduce())return;
    if(ts-lastCol>1500){lastCol=ts;const cs=getComputedStyle(document.documentElement);glowCol=cs.getPropertyValue('--glow').trim()||glowCol;accCol=cs.getPropertyValue('--violet').trim()||accCol}
    const kind=E.realm().fx||'souls',K=KINDS[kind]||KINDS.souls;
    if(kind!==kindNow){kindNow=kind;parts=[];for(let i=0;i<K.n;i++)parts.push(K.spawn(true))}
    bx.clearRect(0,0,W,H);
    const lvl=E.lv(),fat=E.fatigued(),n=fat?Math.round(K.n*.4):Math.min(K.n,Math.round(K.n*.5)+lvl.L*2),sl=fat?.4:1;
    for(let i=0;i<n;i++){
      const p=parts[i];if(!p)continue;
      if(K.step(p,ts,sl)){parts[i]=K.spawn(false);continue}
      if(fat){bx.globalAlpha=1}
      K.draw(p,ts,fat?.4:1);
    }
    bx.globalAlpha=1;
  })(0);
};
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
F.burstCenter=function(n,cols){F.burst(innerWidth/2,innerHeight*.38,n||60,cols)};
F.burstAt=function(el,n,cols){const r=el.getBoundingClientRect();F.burst(r.left+r.width/2,r.top+r.height/2,n||24,cols)};
/* a ring of upward sparks, for the daily chest and unlocks */
F.confetti=function(n){const cols=[glowCol,accCol,'#f5c451','#ffffff'];F.burst(innerWidth/2,innerHeight*.55,n||80,cols)};
})();
