/* ui-core.js: shared UI helpers, navigation, bottom sheets, system messages, event dispatch. */
(function(){
'use strict';
const HS=window.HS=window.HS||{};
const E=HS.E,F=HS.fx;
const U=HS.ui={act:{},sh:null,tab:'home',views:{}};

U.$=s=>document.querySelector(s);
U.esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
U.fmt=n=>Math.round(n).toLocaleString('en-US');
U.cap=s=>s.charAt(0).toUpperCase()+s.slice(1);
U.hhmm=m=>{const h=Math.floor(m/60),mm=m%60,ap=h>=12?'pm':'am';return ((h+11)%12+1)+(mm?':'+String(mm).padStart(2,'0'):'')+ap};
U.DAYS=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
U.WIN={breakfast:[480,570],lunch:[780,870],dinner:[1200,1290]};
U.MEALS=['breakfast','lunch','dinner'];
U.mealNow=function(){const t=E.nowMin();return t>=360&&t<660?'breakfast':t>=660&&t<960?'lunch':t>=1140&&t<1440?'dinner':'snack'};

const IC={
  home:'<svg viewBox="0 0 24 24"><path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z"/></svg>',
  hunter:'<svg viewBox="0 0 24 24"><path d="M12 3l7 4v6c0 4-3 7-7 8-4-1-7-4-7-8V7z"/><path d="M9 12l2 2 4-4"/></svg>',
  gear:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/></svg>',
  on:'<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/></svg>',
  off:'<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M17 9l4 6M21 9l-4 6"/></svg>',
  scale:'<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 10a4 4 0 0 1 8 0"/><path d="M12 10l2-2"/></svg>',
  plate:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/></svg>',
  gym:'<svg viewBox="0 0 24 24"><path d="M3 9v6M6 7v10M18 7v10M21 9v6M6 12h12"/></svg>',
  rehab:'<svg viewBox="0 0 24 24"><path d="M12 4v16M4 12h16"/><circle cx="12" cy="12" r="9"/></svg>',
  moon:'<svg viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>',
  prot:'<svg viewBox="0 0 24 24"><path d="M6 14c0-5 4-9 9-9 2 0 3 1 3 3 0 5-4 9-9 9-2 0-3-1-3-3z"/><path d="M7 17l-3 3"/></svg>',
  check:'<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  x:'<svg viewBox="0 0 24 24"><path d="M7 7l10 10M17 7L7 17"/></svg>',
  dash:'<svg viewBox="0 0 24 24"><path d="M7 12h10"/></svg>',
  pass:'<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'
};
U.IC=IC;

/* ---- messages ---- */
let tSys,tOv;
U.sys=function(msg,kind,silent){
  const e=U.$('#sys');U.$('#sysT').textContent=msg;e.className='show '+(kind||'');
  if(!silent){if(kind==='bad')F.play('sharp');else if(kind==='good')F.play('quest');else F.play('pick')}
  clearTimeout(tSys);tSys=setTimeout(()=>{e.className=''},4200);
};
U.overlay=function(kind,h,big,p,ms){
  const o=U.$('#ov');U.$('#ovH').textContent=h;U.$('#ovBig').textContent=big||'';U.$('#ovP').textContent=p||'';
  o.className='on '+(kind||'');clearTimeout(tOv);tOv=setTimeout(()=>{o.className=''},ms||2800);
};
U.act.ovClose=()=>{U.$('#ov').className=''};

/* ---- sheets ---- */
U.openSheet=function(title,body,foot,opts){
  opts=opts||{};
  U.$('#shT').textContent=title;const b=U.$('#shBody');b.innerHTML=body;b.className=opts.col?'col':'';
  U.$('#shFoot').innerHTML=foot||'';U.$('#shFoot').hidden=!foot;
  U.$('#sheet').className=(opts.full?'full ':'')+'on';
  U.$('#scrim').classList.add('on');document.body.classList.add('lock');b.scrollTop=0;
};
U.closeSheet=function(){
  U.$('#scrim').classList.remove('on');U.$('#sheet').classList.remove('on');document.body.classList.remove('lock');
  U.sh=null;U.render();
};
U.act.close=U.closeSheet;
U.keepScroll=function(fn){const y=U.$('#shBody').scrollTop;fn();U.$('#shBody').scrollTop=y};

/* ---- navigation and rendering ---- */
const TABS=['home','hunter','settings'];
U.render=function(anim){
  const v=U.views[U.tab];if(v)v();
  const idx=TABS.indexOf(U.tab);
  document.querySelectorAll('#dock button').forEach((b,i)=>{b.setAttribute('aria-selected',i===idx)});
  U.$('#dockInd').style.transform='translateX('+(idx*100)+'%)';
  const sb=U.$('#sndBtn');sb.innerHTML=E.cfg().sound?IC.on:IC.off;sb.className=E.cfg().sound?'':'off';
  const sc=U.$('#screen');
  if(anim){sc.classList.remove('in');void sc.offsetWidth;sc.classList.add('in')}
};
U.act.tab=function(v){if(v===U.tab)return;U.tab=v;F.play('nav');F.vib(8);U.render(true);U.$('#screen').scrollTop=0};
U.act.sound=function(){
  const c=E.cfg();c.sound=!c.sound;E.save();
  if(c.sound){F.unlock();F.play('pick')}
  U.render();
};

/* ---- event dispatch: data-a="name:arg" ---- */
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-a]');if(!b)return;
  const a=b.dataset.a,i=a.indexOf(':'),k=i<0?a:a.slice(0,i),v=i<0?'':a.slice(i+1);
  const fn=U.act[k];if(fn)fn(v,b,e);
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&U.sh)U.closeSheet()});

/* ---- game events to messages ---- */
E.on('aura',n=>{
  if(!n)return;
  const e=document.createElement('div');e.className='apop '+(n<0?'neg':'pos');e.textContent=(n>0?'+':'\u2212')+Math.abs(n)+' AURA';
  document.body.appendChild(e);setTimeout(()=>e.remove(),1400);
});
E.on('level',e=>{setTimeout(()=>U.overlay('',e.rankUp?'RANK UP':'LEVEL UP',e.rankUp?'RANK '+e.to.rank:'LV '+e.to.L,e.rankUp?'ARISE.':'Your power grows.'),380)});
E.on('locked',()=>U.sys('Level-up locked by fatigue. Train to break it.','bad'));
E.on('gate',g=>setTimeout(()=>U.overlay('','GATE CLEARED',g.kg+' kg',g.boss?'BOSS DOWN. A new shadow joins your army.':'A shadow joins your army.',3200),700));
E.on('protein',()=>{U.sys('Protein target reached. Quest complete.','good')});
E.on('fatigue',on=>{if(on)U.sys('FATIGUED. Aura gains halved and levels locked until you train.','bad')});
E.on('penalty',p=>{
  const total=p.base+p.extra;
  U.overlay('bad',p.why==='absent'?'ABSENT':'QUEST FAILED','−'+total,
    (p.why==='absent'?'You did not show up. ':'You skipped. ')+(p.strict==='chill'?'Aura lost.':'Fatigue holds your level until you train.')+(p.extra?' Second miss in a row hits twice.':'')+(E.cfg().contract?' Your contract: '+E.cfg().contract:''),
    p.why==='absent'?5000:3600);
});

/* ---- boot ---- */
U.boot=function(){
  F.applyTheme();F.startBg();
  const sw=E.sweep();
  U.render(true);
  if(sw.length){
    const missed=sw.filter(x=>!x.pass).length,pass=sw.filter(x=>x.pass).length;
    setTimeout(()=>{
      if(missed)U.sys('The System noticed '+missed+' missed session'+(missed>1?'s':'')+'. Penalty applied.','bad');
      else if(pass)U.sys('A missed session was covered by your weekly rest pass.','');
    },600);
  }
};
})();
