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
    if(withLetters)text(c,q.d,cx,y+d+12.5,10.5,q.today?'#fff':'rgba(255,255,255,.5)',{weight:700,font:F_CAP,align:'center',ls:.6});
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
/* the native +250 ml button sits on the Today picture: its size and margins in dp. The picture keeps that corner clear and draws nothing
   under it, so the button can never cover a number or the next move. The Android layout uses the same figures. */
const BTN={w:76,h:24,mr:10,mb:8};
const btnSlot=(w,h)=>({x:w-BTN.mr-BTN.w,y:h-BTN.mb-BTN.h,w:BTN.w,h:BTN.h});
/* only for the preview in the widget picker: the button is a real Android view on the home screen */
function drawBtn(c,w,h){
  const b=btnSlot(w,h);c.save();rr(c,b.x,b.y,b.w,b.h,b.h/2);c.fillStyle='rgba(94,200,255,.2)';c.fill();c.lineWidth=1;c.strokeStyle='#5ec8ff';c.stroke();
  text(c,'+250 ml',b.x+b.w/2,b.y+b.h/2+4,11,'#9fe0ff',{weight:700,align:'center',font:F_CAP,ls:.3});c.restore();
}
function tick(c,x,y,r){c.save();c.beginPath();c.arc(x,y,r,0,6.3);c.fillStyle='#3ddc97';c.fill();c.lineWidth=r*.3;c.lineCap='round';c.lineJoin='round';c.strokeStyle='#07221a';
  c.beginPath();c.moveTo(x-r*.45,y);c.lineTo(x-r*.1,y+r*.38);c.lineTo(x+r*.5,y-r*.34);c.stroke();c.restore()}

function statusLabel(d,lit,risk,n){
  if(d.blank)return{t:'OPEN APP',fg:'#cfe1ff',bg:'rgba(255,255,255,.1)',border:'rgba(255,255,255,.18)'};
  if(lit)return{t:d.met>=6?'PERFECT DAY':'LIT TODAY',fg:'#3a2200',bg:'#ffd36a',border:null};
  const need=Math.max(1,(d.goal||3)-(d.met||0));
  if(risk)return{t:'AT RISK',fg:'#ffb23d',bg:'rgba(255,178,61,.14)',border:'rgba(255,178,61,.6)'};
  return{t:need+' TO LIGHT',fg:'#cfe1ff',bg:'rgba(255,255,255,.1)',border:'rgba(255,255,255,.18)'};
}
function streak(c,w,h,d,n,lit,risk,tier,mood){
  const st=statusLabel(d,lit,risk,n),small=h<130,fs=Math.max(10,h*.068);
  /* the status ribbon and the shields, along the top */
  chip(c,w*.07,h*.07,st.t,st.fg,st.bg,st.border,fs);
  if(d.shields>0&&w>=130){c.save();c.font='700 '+fs+'px '+F_CAP;const tw=c.measureText(String(d.shields)).width;c.restore();const cw=tw+fs*1.9+fs*.4;chip(c,w-w*.07-cw,h*.07,String(d.shields),'#8fdcff','rgba(94,200,255,.14)','rgba(94,200,255,.5)',fs,'shield')}
  /* the flame, then the number under it, then the label: three clear bands that never touch */
  const fh=h*(small?.36:.46);flame(c,w/2,h*(small?.56:.635),fh,tier,lit);
  if(lit){sparkle(c,w/2-fh*.55,h*.34,h*.05,.9);sparkle(c,w/2+fh*.6,h*.42,h*.04,.8);sparkle(c,w/2+fh*.32,h*.3,h*.028,.7)}
  const s=String(n),sz=fitSize(c,s,h*(small?.27:.29),w*.8);
  text(c,s,w/2,h*(small?.8:.865),sz,lit?'#ffe08a':'#ffffff',{weight:800,align:'center',stroke:sz*.07,shadow:'rgba(0,0,0,.5)',sb:8,sy:3});
  text(c,'DAY STREAK',w/2,h*(small?.94:.95),Math.max(10,h*.068),lit?'#ffd36a':'rgba(255,255,255,.66)',{weight:700,font:F_CAP,align:'center',ls:2.2});
}
function week(c,w,h,d,n,lit,risk,tier,mood){
  const padX=Math.max(12,h*.2);
  flame(c,padX+h*.3,h*.8,h*.62,tier,lit);
  const s=String(n),sz=fitSize(c,s,h*.5,h*.9),nx=padX+h*.72;
  text(c,s,nx,h*.58,sz,lit?'#ffe08a':'#fff',{weight:800,stroke:sz*.07,shadow:'rgba(0,0,0,.5)',sb:6,sy:2});
  const lsz=Math.max(10,h*.14),nameCol=lit?'#ffd36a':'rgba(255,255,255,.64)';
  c.save();c.font='800 '+sz+'px '+F_NUM;const nw=c.measureText(s).width;c.font='700 '+lsz+'px '+F_CAP;if('letterSpacing' in c)c.letterSpacing='1.6px';
  const full=c.measureText('DAY STREAK').width,short=c.measureText('DAYS').width;c.restore();
  /* the dots start after whichever is wider, the number or its label; on a narrow widget the label shortens so the dots keep their size */
  const room=lab=>{const x0=nx+Math.max(nw,lab)+Math.max(10,h*.22);return{x0:x0,wd:w-x0-padX}};
  let lab='DAY STREAK',r=room(full);
  if(r.wd/7-5<Math.min(h*.3,16)){lab='DAYS';r=room(short)}
  text(c,lab,nx,h*.84,lsz,nameCol,{weight:700,font:F_CAP,ls:1.6});
  const dd=Math.max(6,Math.min(h*.4,r.wd/7-5,30)),y=Math.max(4,(h-(dd+14))/2);
  weekDots(c,d.week,r.x0,y,r.wd,dd,true);
}
function today(c,w,h,d,n,lit,risk,tier,mood){
  const pad=Math.max(10,Math.min(14,h*.09)),lw=Math.min(104,w*.32),cx=lw/2+6,tallL=h>=150;
  /* left: the flame, the number and the label (the hunter peeks in below when there is room) */
  const mcol=lit?'#ffd36a':'rgba(255,255,255,.64)';
  if(tallL){
    const fh=h*.3;flame(c,cx,h*.35,fh,tier,lit);
    if(lit){sparkle(c,cx-fh*.5,h*.14,h*.034,.9);sparkle(c,cx+fh*.7,h*.2,h*.026,.8)}
    const s=String(n),sz=fitSize(c,s,h*.24,lw*.8);
    text(c,s,cx,h*.59,sz,lit?'#ffe08a':'#fff',{weight:800,align:'center',stroke:sz*.07,shadow:'rgba(0,0,0,.5)',sb:6,sy:2});
    text(c,'DAY STREAK',cx,h*.675,10,mcol,{weight:700,font:F_CAP,align:'center',ls:1.4});
    mascot(c,cx,h+4,h*.3,lit?'lit':risk?'risk':'idle');
  }else{
    const fh=h*.36;flame(c,cx,h*.46,fh,tier,lit);
    if(lit){sparkle(c,cx-fh*.5,h*.16,h*.04,.9);sparkle(c,cx+fh*.7,h*.24,h*.03,.8)}
    const s=String(n),sz=fitSize(c,s,h*.27,lw*.8);
    text(c,s,cx,h*.76,sz,lit?'#ffe08a':'#fff',{weight:800,align:'center',stroke:sz*.07,shadow:'rgba(0,0,0,.5)',sb:6,sy:2});
    text(c,'DAY STREAK',cx,h*.9,10,mcol,{weight:700,font:F_CAP,align:'center',ls:1.4});
  }
  c.fillStyle='rgba(255,255,255,.1)';c.fillRect(lw+10,h*.12,1,h*.76);
  const x0=lw+26,wr=w-x0-pad,strip=BTN.h+BTN.mb+6;
  /* right: the week (when the widget is tall enough), then three rows of label, value and a bar */
  let y=pad;
  if(h-strip-pad>=100){const dd=Math.min(24,wr/7-5);weekDots(c,d.week,x0,y,wr,dd,false);y+=dd+10}
  const avail=h-strip-y,pitch=Math.min(30,avail/3),roomy=pitch>=24,tsz=roomy?11.5:10.5,bh=roomy?8:6;
  y+=Math.max(0,(avail-pitch*3)/2);
  const pc=(a,b)=>b>0?Math.max(0,Math.min(1,a/b)):0,left=d.kcalT-d.kcal;
  const rows=[
    {k:'KCAL',v:left>=0?fmt(left)+' left':fmt(-left)+' over',p:pc(d.kcal,d.kcalT),c0:'#ff9a3d',c1:'#ffd36a',over:d.kcal>d.kcalT*1.05,done:false},
    {k:'PROTEIN',v:fmt(d.protein)+'/'+fmt(d.proteinT)+' g',p:pc(d.protein,d.proteinT),c0:'#8b5cff',c1:'#c9a7ff',done:d.proteinT>0&&d.protein>=d.proteinT},
    {k:'WATER',v:(d.water/1000).toFixed(1)+'/'+(d.waterT/1000).toFixed(1)+' L',p:pc(d.water,d.waterT),c0:'#34b6f0',c1:'#b5f0ff',done:d.waterT>0&&d.water>=d.waterT}];
  rows.forEach((r,i)=>{
    const yy=y+i*pitch,base=yy+tsz;
    text(c,r.k,x0,base,tsz,r.over?'#ff9a9a':r.c1,{weight:700,font:F_CAP,ls:1.2});
    const vf='700 '+(tsz+1)+'px '+F_CAP;
    text(c,r.v,x0+wr,base,tsz+1,r.over?'#ff8a8a':'#fff',{weight:700,align:'right',font:F_CAP,ls:.3});
    if(r.done){c.save();c.font=vf;const tw=c.measureText(r.v).width;c.restore();tick(c,x0+wr-tw-12,base-tsz*.34,5.5)}
    bar(c,x0,base+4,wr,bh,r.p,r.c0,r.c1,r.over);
  });
  /* the next move, on the same line as the water button, which has its corner to itself */
  const b=btnSlot(w,h),nsz=12.5;
  text(c,ellipsize(c,'› '+(d.next||'Open Habit Sync'),'700 '+nsz+'px '+F_CAP,Math.max(40,b.x-12-x0)),x0,b.y+b.h/2+4.4,nsz,'#ffd36a',{weight:700,font:F_CAP,ls:.4});
  if(d.preview)drawBtn(c,w,h);
}
A.draw=draw;
A.sample=function(){return{streak:10,lit:false,met:1,goal:3,shields:1,hour:13,kcal:613,kcalT:2050,protein:79,proteinT:140,water:1750,waterT:3000,steps:5400,next:'Log lunch',
  week:[{st:'lit',d:'T'},{st:'lit',d:'F'},{st:'lit',d:'S'},{st:'shield',d:'S'},{st:'lit',d:'M'},{st:'lit',d:'T'},{st:'open',d:'W',today:true}]}};
/* what a widget shows before the app has drawn it: an empty, friendly picture that asks for the first open */
A.blank=function(){return{blank:true,streak:0,lit:false,met:0,goal:3,shields:0,hour:12,kcal:0,kcalT:2000,protein:0,proteinT:120,water:0,waterT:3000,steps:0,next:'Open Habit Sync once',
  week:['M','T','W','T','F','S','S'].map(x=>({st:'future',d:x}))}};
})();
