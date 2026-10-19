/* widget-art.js: draws the home-screen widgets on a canvas. The Android app turns these pictures into widget images, so they use the same
   fonts, flame and hunter as the app. Three sizes: streak (2x2), week (4x1) and today (4x2).
   The look borrows from Duolingo's widgets: one big glowing flame, a chunky streak number, a week of round status dots, friendly states
   (lit, still to light, at risk), and the mascot peeking in from the corner. Sizes are in dp; the canvas is scaled by dpr. */
(function(){
'use strict';
const HS=window.HS=window.HS||{};
const A=HS.widgetArt={};
const FLAME='M0 0 C-10 -4 -12 -16 -4 -24 C-3 -18 0 -16 1 -20 C2 -28 -2 -32 2 -40 C10 -30 14 -14 8 -4 C6 -1 3 0 0 0 Z';
const FLAME_IN='M0 -2 C-5 -5 -5 -12 -1 -16 C0 -12 2 -11 3 -14 C6 -9 5 -4 0 -2Z';
const SHIELD='M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z';
const HEAD='M80 6 C64 6 58 20 58 32 C58 44 68 52 80 52 C92 52 102 44 102 32 C102 20 96 6 80 6 Z';
const BODY='M80 44 C62 44 50 54 46 72 L34 122 L52 126 L56 206 L74 206 L80 152 L86 206 L104 206 L108 126 L126 122 L114 72 C110 54 98 44 80 44 Z';
const P={flame:new Path2D(FLAME),flameIn:new Path2D(FLAME_IN),shield:new Path2D(SHIELD),head:new Path2D(HEAD),body:new Path2D(BODY)};
const F_NUM='"Exo 2","Rajdhani",system-ui,sans-serif',F_CAP='"Rajdhani","Exo 2",system-ui,sans-serif';

/* flame colours by streak tier: the same steps as the app (7, 14, 30, 60 days) */
const TIERS={
  cold:{g:['#7d8aa6','#4b5878','#323c57'],glow:'rgba(120,140,190,.25)'},
  warm:{g:['#ffe28a','#ff9a3d','#ff4d2e'],glow:'rgba(255,140,50,.55)'},
  hot:{g:['#ffd36a','#ff6a2e','#e0200f'],glow:'rgba(255,100,40,.6)'},
  blue:{g:['#d2f6ff','#5ec8ff','#2a6fff'],glow:'rgba(80,190,255,.6)'},
  vio:{g:['#eadcff','#a47bff','#5a2bd6'],glow:'rgba(150,100,255,.6)'},
  gold:{g:['#fff8d2','#f5c451','#e08a14'],glow:'rgba(255,210,90,.65)'}
};
const tierOf=n=>n>=60?'gold':n>=30?'vio':n>=14?'blue':n>=7?'hot':n>=1?'warm':'cold';
const EMBER={g:['#c9b8ac','#8d7d78','#5b4d57'],glow:'rgba(255,255,255,.06)'};   /* a flame that is not lit yet today */

function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()}
function text(c,s,x,y,size,color,o){
  o=o||{};
  c.save();c.font=(o.weight||700)+' '+size+'px '+(o.font||F_NUM);c.textAlign=o.align||'left';c.textBaseline='alphabetic';
  if('letterSpacing' in c)c.letterSpacing=(o.ls||0)+'px';
  if(o.shadow){c.shadowColor=o.shadow;c.shadowBlur=o.sb||6;c.shadowOffsetY=o.sy||2}
  if(o.stroke){c.lineJoin='round';c.lineWidth=o.stroke;c.strokeStyle=o.strokeColor||color;c.strokeText(s,x,y)}
  c.fillStyle=color;c.fillText(s,x,y);c.restore();
}
function ellipsize(c,s,font,maxW){c.save();c.font=font;if('letterSpacing' in c)c.letterSpacing='0px';let t=s;if(c.measureText(t).width>maxW){while(t.length>1&&c.measureText(t+'…').width>maxW)t=t.slice(0,-1);t=t.trim()+'…'}c.restore();return t}
/* a number that always fits its box: the font shrinks for three digits */
function fitSize(c,s,size,maxW){c.save();c.font='800 '+size+'px '+F_NUM;let w=c.measureText(s).width;c.restore();return w>maxW?size*maxW/w:size}

function background(c,w,h,mode){
  c.save();rr(c,0,0,w,h,Math.min(28,h*.22));c.clip();
  const g=c.createLinearGradient(0,0,w,h);
  if(mode==='lit'){g.addColorStop(0,'#4a1f5a');g.addColorStop(.55,'#2a1140');g.addColorStop(1,'#15092a')}
  else if(mode==='risk'){g.addColorStop(0,'#3a2a2a');g.addColorStop(.55,'#241a2c');g.addColorStop(1,'#120e22')}
  else{g.addColorStop(0,'#1d2c63');g.addColorStop(.55,'#121d47');g.addColorStop(1,'#0a1030')}
  c.fillStyle=g;c.fillRect(0,0,w,h);
  /* soft light from the top left, warm glow in the corner when the day is lit */
  const r1=c.createRadialGradient(w*.18,-h*.1,0,w*.18,-h*.1,w*.9);r1.addColorStop(0,'rgba(140,160,255,.22)');r1.addColorStop(1,'rgba(140,160,255,0)');c.fillStyle=r1;c.fillRect(0,0,w,h);
  if(mode==='lit'){const r2=c.createRadialGradient(w*.3,h*.55,0,w*.3,h*.55,Math.max(w,h)*.7);r2.addColorStop(0,'rgba(255,150,60,.32)');r2.addColorStop(1,'rgba(255,150,60,0)');c.fillStyle=r2;c.fillRect(0,0,w,h)}
  if(mode==='risk'){const r2=c.createRadialGradient(w*.3,h*.6,0,w*.3,h*.6,Math.max(w,h)*.7);r2.addColorStop(0,'rgba(255,170,60,.18)');r2.addColorStop(1,'rgba(255,170,60,0)');c.fillStyle=r2;c.fillRect(0,0,w,h)}
  /* a faint dotted sky */
  c.fillStyle='rgba(255,255,255,.05)';for(let i=0;i<14;i++){const x=(i*97%100)/100*w,y=(i*53%100)/100*h;c.beginPath();c.arc(x,y,.9+(i%3)*.4,0,6.3);c.fill()}
  c.restore();
  c.save();rr(c,.5,.5,w-1,h-1,Math.min(28,h*.22));c.lineWidth=1;c.strokeStyle=mode==='lit'?'rgba(255,200,120,.35)':mode==='risk'?'rgba(255,178,61,.4)':'rgba(255,255,255,.1)';c.stroke();c.restore();
}

/* the flame: glow, body, bright core, a little highlight. cx is the middle, by the bottom, h the height. */
function flame(c,cx,by,h,tier,on){
  const T=on?TIERS[tier]:EMBER,s=h/46;
  c.save();
  if(on){const gl=c.createRadialGradient(cx,by-h*.45,0,cx,by-h*.45,h*.95);gl.addColorStop(0,T.glow);gl.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=gl;c.fillRect(cx-h*1.2,by-h*1.5,h*2.4,h*2.2)}
  c.translate(cx,by);c.scale(s,s);
  const g=c.createLinearGradient(0,-44,0,2);g.addColorStop(0,T.g[0]);g.addColorStop(.5,T.g[1]);g.addColorStop(1,T.g[2]);
  c.shadowColor=on?T.glow:'rgba(0,0,0,.35)';c.shadowBlur=on?16/s*(h/50):6;c.shadowOffsetY=on?0:2/s;
  c.fillStyle=g;c.fill(P.flame);
  c.shadowBlur=0;c.shadowOffsetY=0;
  const g2=c.createLinearGradient(0,-18,0,0);g2.addColorStop(0,on?'#fffbe8':'#e6dcd6');g2.addColorStop(1,on?'#ffe08a':'#b3a5a0');
  c.fillStyle=g2;c.globalAlpha=on?.95:.7;c.fill(P.flameIn);
  c.globalAlpha=.5;c.fillStyle='#fff';c.beginPath();c.ellipse(-4,-27,1.6,3.2,-.5,0,6.3);c.fill();
  c.restore();
}
function sparkle(c,x,y,r,a){c.save();c.globalAlpha=a;c.fillStyle='#fff';c.beginPath();c.moveTo(x,y-r);c.quadraticCurveTo(x,y,x+r,y);c.quadraticCurveTo(x,y,x,y+r);c.quadraticCurveTo(x,y,x-r,y);c.quadraticCurveTo(x,y,x,y-r);c.fill();c.restore()}

/* the hunter peeking in from the bottom edge, eyes show the mood: gold when lit, cyan while waiting, red when the streak is at risk */
function mascot(c,cx,bottom,h,mood){
  const s=h/110,eye=mood==='lit'?'#ffd76a':mood==='risk'?'#ff5a6e':'#7fd3ff';
  c.save();c.translate(cx-80*s,bottom-110*s);c.scale(s,s);
  const g=c.createLinearGradient(0,6,0,130);g.addColorStop(0,'#2a3a6a');g.addColorStop(1,'#0b1226');
  c.shadowColor=eye;c.shadowBlur=14;c.fillStyle=g;c.fill(P.body);c.fill(P.head);c.shadowBlur=0;
  c.lineWidth=1.6;c.strokeStyle='rgba('+(mood==='lit'?'255,215,106':mood==='risk'?'255,90,110':'127,211,255')+',.55)';c.stroke(P.head);
  c.shadowColor=eye;c.shadowBlur=10;c.fillStyle=eye;
  if(mood==='risk'){rr(c,66,30,12,3.6,1.8);c.fill();rr(c,82,30,12,3.6,1.8);c.fill()}   /* narrow, worried eyes */
  else{rr(c,66,28,12,6,3);c.fill();rr(c,82,28,12,6,3);c.fill()}
  c.restore();
}

function shieldGlyph(c,x,y,sz,color,fill){c.save();c.translate(x-sz/2,y-sz/2);c.scale(sz/24,sz/24);c.lineWidth=2.2;c.lineJoin='round';c.strokeStyle=color;if(fill){c.fillStyle=fill;c.fill(P.shield)}c.stroke(P.shield);c.restore()}
function chip(c,x,y,label,fg,bg,border,size,icon){
  c.save();c.font='700 '+size+'px '+F_CAP;if('letterSpacing' in c)c.letterSpacing='1.2px';
  const tw=c.measureText(label).width,pad=size*.7,iw=icon?size*1.2:0,w=tw+pad*2+iw,h=size*1.9;
  rr(c,x,y,w,h,h/2);c.fillStyle=bg;c.fill();if(border){c.lineWidth=1;c.strokeStyle=border;c.stroke()}
  if(icon==='shield')shieldGlyph(c,x+pad+size*.5,y+h/2,size*1.05,fg,null);
  c.fillStyle=fg;c.textBaseline='middle';c.fillText(label,x+pad+iw,y+h/2+size*.04);c.restore();return w;
}

/* the week of round dots: lit, shield, protected, missed, today still open, future */
function weekDots(c,days,x,y,w,d,withLetters){
  const n=days.length,gap=(w-d*n)/(n-1);
  days.forEach((q,i)=>{
    const cx=x+d/2+i*(d+gap),cy=y+d/2,st=q.st==='before'?'future':q.st;
    c.save();
    if(st==='lit'){
      const g=c.createLinearGradient(0,cy-d/2,0,cy+d/2);g.addColorStop(0,'#ffd36a');g.addColorStop(1,'#ff7a30');
      c.shadowColor='rgba(255,140,50,.6)';c.shadowBlur=d*.5;c.fillStyle=g;c.beginPath();c.arc(cx,cy,d/2,0,6.3);c.fill();c.shadowBlur=0;
      c.translate(cx,cy+d*.27);const s=d*.5/46;c.scale(s,s);c.fillStyle='#fff';c.fill(P.flame);
    }else if(st==='shield'){
      c.fillStyle='rgba(94,200,255,.18)';c.beginPath();c.arc(cx,cy,d/2,0,6.3);c.fill();c.lineWidth=1.6;c.strokeStyle='#5ec8ff';c.stroke();
      shieldGlyph(c,cx,cy,d*.55,'#8fdcff',null);
    }else if(st==='safe'){
      c.fillStyle='rgba(61,220,151,.18)';c.beginPath();c.arc(cx,cy,d/2,0,6.3);c.fill();c.lineWidth=1.6;c.strokeStyle='#3ddc97';c.stroke();
      c.lineWidth=d*.1;c.lineCap='round';c.lineJoin='round';c.beginPath();c.moveTo(cx-d*.17,cy);c.lineTo(cx-d*.04,cy+d*.13);c.lineTo(cx+d*.2,cy-d*.12);c.stroke();
    }else if(st==='miss'){
      c.fillStyle='rgba(255,255,255,.07)';c.beginPath();c.arc(cx,cy,d/2,0,6.3);c.fill();
      c.fillStyle='rgba(255,255,255,.28)';c.beginPath();c.arc(cx,cy,d*.07,0,6.3);c.fill();
    }else if(st==='open'){
      c.fillStyle='rgba(255,255,255,.05)';c.beginPath();c.arc(cx,cy,d/2,0,6.3);c.fill();
      c.setLineDash([d*.18,d*.12]);c.lineWidth=2;c.strokeStyle='#ffd36a';c.beginPath();c.arc(cx,cy,d/2-1,0,6.3);c.stroke();c.setLineDash([]);
    }else{
      c.lineWidth=1.3;c.strokeStyle='rgba(255,255,255,.16)';c.setLineDash([2,3]);c.beginPath();c.arc(cx,cy,d/2-.7,0,6.3);c.stroke();c.setLineDash([]);
    }
    if(q.today){c.lineWidth=2;c.strokeStyle='rgba(255,255,255,.9)';c.beginPath();c.arc(cx,cy,d/2+2.6,0,6.3);c.stroke()}
    c.restore();
    if(withLetters)text(c,q.d,cx,y+d+11,9.5,q.today?'#fff':'rgba(255,255,255,.5)',{weight:700,font:F_CAP,align:'center',ls:.6});
    else if(st!=='lit'&&st!=='shield'&&st!=='safe'&&st!=='miss')text(c,q.d,cx,cy+d*.18,d*.42,st==='open'?'#ffd36a':'rgba(255,255,255,.4)',{weight:700,font:F_CAP,align:'center'});
  });
}
function bar(c,x,y,w,h,pct,c0,c1,over){
  c.save();rr(c,x,y,w,h,h/2);c.fillStyle='rgba(255,255,255,.11)';c.fill();
  const fw=Math.max(h,Math.min(1,pct)*w);
  if(pct>0){const g=c.createLinearGradient(x,0,x+w,0);g.addColorStop(0,over?'#ff8a8a':c0);g.addColorStop(1,over?'#ff4d5e':c1);rr(c,x,y,fw,h,h/2);c.fillStyle=g;c.shadowColor=over?'rgba(255,77,94,.5)':c1;c.shadowBlur=6;c.fill();c.shadowBlur=0;
    c.globalAlpha=.35;c.fillStyle='#fff';rr(c,x+h*.4,y+h*.18,Math.max(0,fw-h*.8),h*.28,h*.14);c.fill()}
  c.restore();
}
const fmt=n=>Math.round(n).toLocaleString('en-US');

/* ---------------- the three widgets ---------------- */
function draw(kind,w,h,dpr,d){
  const cv=document.createElement('canvas');cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr);
  const c=cv.getContext('2d');c.scale(dpr,dpr);
  const n=d.streak|0,lit=!!d.lit,risk=!lit&&n>=2&&d.hour>=18,mode=lit?'lit':risk?'risk':'night',tier=tierOf(n),moodOf=lit?'lit':risk?'risk':'idle';
  background(c,w,h,mode);
  if(kind==='streak')streak(c,w,h,d,n,lit,risk,tier,moodOf);
  else if(kind==='week')week(c,w,h,d,n,lit,risk,tier,moodOf);
  else today(c,w,h,d,n,lit,risk,tier,moodOf);
  return cv;
}
function statusLabel(d,lit,risk,n){
  if(lit)return{t:d.met>=6?'PERFECT DAY':'LIT TODAY',fg:'#3a2200',bg:'#ffd36a',border:null};
  const need=Math.max(1,(d.goal||3)-(d.met||0));
  if(risk)return{t:'AT RISK',fg:'#ffb23d',bg:'rgba(255,178,61,.14)',border:'rgba(255,178,61,.6)'};
  return{t:need+' TO LIGHT',fg:'#cfe1ff',bg:'rgba(255,255,255,.1)',border:'rgba(255,255,255,.18)'};
}
function streak(c,w,h,d,n,lit,risk,tier,mood){
  const st=statusLabel(d,lit,risk,n);
  /* the status ribbon and the shields */
  chip(c,w*.07,h*.075,st.t,st.fg,st.bg,st.border,Math.max(8.5,h*.062));
  if(d.shields>0){c.save();c.font='700 '+Math.max(9,h*.065)+'px '+F_CAP;const tw=c.measureText(String(d.shields)).width;c.restore();const cw=tw+h*.2+h*.1;chip(c,w-w*.07-cw-h*.04,h*.075,String(d.shields),'#8fdcff','rgba(94,200,255,.14)','rgba(94,200,255,.5)',Math.max(8.5,h*.062),'shield')}
  const fh=h*.4;flame(c,w/2,h*.62,fh,tier,lit);
  if(lit){sparkle(c,w/2-fh*.55,h*.3,h*.05,.9);sparkle(c,w/2+fh*.6,h*.4,h*.04,.8);sparkle(c,w/2+fh*.3,h*.2,h*.028,.7)}
  const s=String(n),sz=fitSize(c,s,h*.3,w*.8);
  text(c,s,w/2,h*.855,sz,lit?'#ffe08a':'#ffffff',{weight:800,align:'center',stroke:sz*.07,shadow:'rgba(0,0,0,.5)',sb:8,sy:3});
  text(c,n===1?'DAY STREAK':'DAY STREAK',w/2,h*.945,Math.max(9,h*.07),lit?'#ffd36a':'rgba(255,255,255,.62)',{weight:700,font:F_CAP,align:'center',ls:2.4});
}
function week(c,w,h,d,n,lit,risk,tier,mood){
  const padX=14;
  const fh=h*.62;flame(c,padX+h*.32,h*.74,fh,tier,lit);
  const s=String(n),sz=fitSize(c,s,h*.56,h*.9);
  text(c,s,padX+h*.78,h*.6,sz,lit?'#ffe08a':'#fff',{weight:800,stroke:sz*.07,shadow:'rgba(0,0,0,.5)',sb:6,sy:2});
  text(c,'DAY STREAK',padX+h*.8,h*.8,Math.max(8.5,h*.12),lit?'#ffd36a':'rgba(255,255,255,.6)',{weight:700,font:F_CAP,ls:1.6});
  const x0=padX+h*.78+Math.max(h*.62,c.measureText?h*.62:0)+h*.55,wDots=w-x0-padX,dd=Math.min(h*.36,(wDots/7)-4);
  weekDots(c,d.week,x0,h*.2,wDots,dd,true);
}
function today(c,w,h,d,n,lit,risk,tier,mood){
  const lw=Math.min(112,w*.34);
  /* left: the flame and the number, the hunter peeking in below */
  const fh=h*.3;flame(c,lw/2+4,h*.36,fh,tier,lit);
  if(lit){sparkle(c,lw/2-fh*.5,h*.14,h*.034,.9);sparkle(c,lw/2+fh*.7,h*.2,h*.026,.8)}
  const s=String(n),sz=fitSize(c,s,h*.25,lw*.8);
  text(c,s,lw/2+4,h*.6,sz,lit?'#ffe08a':'#fff',{weight:800,align:'center',stroke:sz*.07,shadow:'rgba(0,0,0,.5)',sb:6,sy:2});
  text(c,'DAY STREAK',lw/2+4,h*.69,Math.max(8,h*.056),lit?'#ffd36a':'rgba(255,255,255,.6)',{weight:700,font:F_CAP,align:'center',ls:1.4});
  mascot(c,lw/2+4,h+4,h*.3,lit?'lit':risk?'risk':'idle');
  /* a thin divider */
  c.fillStyle='rgba(255,255,255,.1)';c.fillRect(lw+8,h*.12,1,h*.76);
  const x0=lw+22,wr=w-x0-14;
  const tall=h>=118;
  if(tall)weekDots(c,d.week,x0,h*.09,wr,Math.min(22,wr/7-5),false);
  const rows=[['KCAL',(d.kcalT-d.kcal)>=0?fmt(d.kcalT-d.kcal)+' left':fmt(d.kcal-d.kcalT)+' over',d.kcal/d.kcalT,'#3aa8ff','#7fd3ff',d.kcal>d.kcalT*1.05],
              ['PROTEIN',fmt(d.protein)+'/'+fmt(d.proteinT)+' g',d.protein/d.proteinT,'#8b5cff','#c9a7ff',false],
              ['WATER',(d.water/1000).toFixed(1)+'/'+(d.waterT/1000).toFixed(1)+' L',d.water/d.waterT,'#34b6f0','#b5f0ff',false]];
  const y0=tall?h*.36:h*.16,step=tall?h*.18:h*.22,labW=46,valW=60;
  rows.forEach((r,i)=>{
    const y=y0+i*step;
    text(c,r[0],x0,y+8,Math.max(8,h*.058),'rgba(255,255,255,.58)',{weight:700,font:F_CAP,ls:1.2});
    bar(c,x0+labW,y+1,wr-labW-valW-6,8,Math.max(0,Math.min(1,r[2])),r[3],r[4],r[5]);
    text(c,r[1],x0+wr,y+9,Math.max(9.5,h*.07),r[5]?'#ff8a8a':'#fff',{weight:700,align:'right',font:F_CAP,ls:.3});
  });
  /* the next move; the water button of the widget sits at the bottom right */
  const ny=h-13,nsz=Math.max(10,h*.075);
  text(c,ellipsize(c,'› '+(d.next||'Open Habit Sync'),'700 '+nsz+'px '+F_CAP,wr-104),x0,ny,nsz,'#ffd36a',{weight:700,font:F_CAP,ls:.4});
}
A.draw=draw;
A.sample=function(){return{streak:10,lit:false,met:1,goal:3,shields:1,hour:13,kcal:613,kcalT:2050,protein:79,proteinT:140,water:1750,waterT:3000,steps:5400,next:'Log lunch',
  week:[{st:'lit',d:'T'},{st:'lit',d:'F'},{st:'lit',d:'S'},{st:'shield',d:'S'},{st:'lit',d:'M'},{st:'lit',d:'T'},{st:'open',d:'W',today:true}]}};
})();
