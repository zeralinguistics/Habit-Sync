/* ui-core.js: shared UI helpers, navigation, bottom sheets, the celebration queue, and the game events turned into moments. */
(function(){
'use strict';
const HS=window.HS=window.HS||{};
const E=HS.E,F=HS.fx;
const U=HS.ui={act:{},sh:null,tab:'home',views:{},bossInfo:null,lastHype:null};

U.$=s=>document.querySelector(s);
U.esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
U.fmt=n=>Math.round(n).toLocaleString('en-US');
U.cap=s=>s.charAt(0).toUpperCase()+s.slice(1);
U.hhmm=m=>{const h=Math.floor(m/60),mm=m%60,ap=h>=12?'pm':'am';return ((h+11)%12+1)+(mm?':'+String(mm).padStart(2,'0'):'')+ap};
U.date=k=>new Date(k+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short'});
U.dateY=k=>new Date(k+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
U.DAYS=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
U.WIN={breakfast:[480,570],lunch:[780,870],dinner:[1200,1290]};
U.MEALS=['breakfast','lunch','dinner'];
U.mealNow=function(){const t=E.nowMin();return t>=360&&t<660?'breakfast':t>=660&&t<960?'lunch':t>=1140&&t<1440?'dinner':'snack'};
const $=U.$,esc=U.esc,fmt=U.fmt;

const sv=d=>'<svg viewBox="0 0 24 24" aria-hidden="true">'+d+'</svg>';
const IC={
  home:sv('<path d="M6 4h12v16H6z"/><path d="M9 9h6M9 13h6M9 17h3"/>'),
  armory:sv('<path d="M4 14a8 8 0 0 1 16 0v5H4z"/><path d="M4 14h16M12 6v8M8 19v-5M16 19v-5"/>'),
  path:sv('<circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M6 16c0-7 12-3 12-8"/>'),
  gear:sv('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>'),
  hunter:sv('<path d="M12 3l7 4v6c0 4-3 7-7 8-4-1-7-4-7-8V7z"/><path d="M9 12l2 2 4-4"/>'),
  on:sv('<path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>'),
  off:sv('<path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M17 9l4 6M21 9l-4 6"/>'),
  scale:sv('<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 10a4 4 0 0 1 8 0"/><path d="M12 10l2-2"/>'),
  plate:sv('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/>'),
  gym:sv('<path d="M3 9v6M6 7v10M18 7v10M21 9v6M6 12h12"/>'),
  rehab:sv('<path d="M12 4v16M4 12h16"/><circle cx="12" cy="12" r="9"/>'),
  moon:sv('<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>'),
  prot:sv('<path d="M6 14c0-5 4-9 9-9 2 0 3 1 3 3 0 5-4 9-9 9-2 0-3-1-3-3z"/><path d="M7 17l-3 3"/>'),
  check:sv('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  x:sv('<path d="M7 7l10 10M17 7L7 17"/>'),
  dash:sv('<path d="M7 12h10"/>'),
  pass:sv('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  drop:sv('<path d="M12 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11z"/>'),
  lock:sv('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
  star:sv('<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.5 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>'),
  bell:sv('<path d="M6 17V11a6 6 0 0 1 12 0v6l2 2H4z"/><path d="M10 21h4"/>'),
  chev:sv('<path d="M9 5l7 7-7 7"/>'),
  plus:sv('<path d="M12 5v14M5 12h14"/>'),
  minus:sv('<path d="M5 12h14"/>'),
  down:sv('<path d="M12 4v12M6 12l6 6 6-6"/>'),
  copy:sv('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>'),
  heart:sv('<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.500-7 10-7 10z"/>'),
  bolt:sv('<path d="M13 2L5 14h6l-1 8 8-12h-6z"/>')
};
U.IC=IC;
/* a small flame that grows with the streak */
U.flame=function(n){
  const t=n>=60?'gold':n>=30?'vio':n>=14?'blue':n>=7?'hot':n>=1?'warm':'cold';
  return '<svg class="flame f-'+t+'" viewBox="-14 -44 28 46" aria-hidden="true"><path class="fl1" d="M0 0 C-10 -4 -12 -16 -4 -24 C-3 -18 0 -16 1 -20 C2 -28 -2 -32 2 -40 C10 -30 14 -14 8 -4 C6 -1 3 0 0 0 Z"/><path class="fl2" d="M0 -2 C-5 -5 -5 -12 -1 -16 C0 -12 2 -11 3 -14 C6 -9 5 -4 0 -2Z"/></svg>';
};

/* ---------------- toasts ---------------- */
let tSys;
U.sys=function(msg,kind,silent){
  const e=$('#sys');$('#sysT').textContent=msg;e.className='show '+(kind||'');
  if(!silent){if(kind==='bad')F.play('sharp');else if(kind==='good')F.play('quest');else F.play('pick')}
  clearTimeout(tSys);tSys=setTimeout(()=>{e.className=''},4200);
};

/* ---------------- the celebration queue ----------------
   Level ups, gates, realms and new gear arrive close together. They wait their turn and play one after another.
   Tap anywhere to move on. */
const Q=[];let showing=false,tOv=null,kick=null;
/* order of importance when several moments arrive together: a penalty, the gate, the new realm, level-ups, gear, then the rest */
const PRIO={bad:1,boss:2,gate:2,realm:3,level:4,item:5};
U.cele=function(c){
  c.prio=PRIO[c.kind]||6;
  /* two level-ups in one go: only the last one matters */
  if(c.kind==='level'){for(let i=Q.length-1;i>=0;i--)if(Q[i].kind==='level')Q.splice(i,1)}
  Q.push(c);
  if(!showing){clearTimeout(kick);kick=setTimeout(()=>{Q.sort((a,b)=>a.prio-b.prio);nextCele()},70)}
};
function defaultHtml(c){
  return '<h1>'+esc(c.h||'')+'</h1>'+(c.big?'<div class="big">'+esc(c.big)+'</div>':'')+(c.p?'<p>'+esc(c.p)+'</p>':'')+(c.btn?'<button class="btn ovbtn" data-a="'+c.btn[0]+'">'+esc(c.btn[1])+'</button>':'');
}
function nextCele(){
  const c=Q.shift();
  if(!c){showing=false;return}
  showing=true;
  const o=$('#ov');$('#ovb').innerHTML=c.html||defaultHtml(c);
  $('#ovb').className='ovb k-'+(c.kind||'plain');
  o.className='on '+(c.kind||'');
  if(c.sound)F.play(c.sound);
  if(c.vib)F.vib(c.vib);
  if(c.fx)try{c.fx()}catch(e){}
  clearTimeout(tOv);tOv=setTimeout(closeCele,c.ms||2800);
}
function closeCele(){
  clearTimeout(tOv);$('#ov').className='';
  setTimeout(nextCele,260);
}
U.act.ovClose=closeCele;
U.clearCele=function(){Q.length=0;freshGear=[];clearTimeout(tOv);clearTimeout(kick);$('#ov').className='';showing=false};
U.overlay=function(kind,h,big,p,ms){U.cele({kind:kind||'',h:h,big:big,p:p,ms:ms})};

/* ---------------- sheets ---------------- */
/* One history entry per open sheet, so the phone's Back button closes the sheet instead of leaving the app.
   The "pop" is delayed a moment: if another sheet opens straight away it reuses the same entry. */
let histOpen=false,backT=null,skipPop=0;
function pushHist(){
  if(backT){clearTimeout(backT);backT=null;histOpen=true;return}
  if(!histOpen){try{history.pushState({hs:1},'');histOpen=true}catch(e){}}
}
function popHist(){
  if(!histOpen)return;
  histOpen=false;
  backT=setTimeout(()=>{backT=null;skipPop++;try{history.back()}catch(e){skipPop--}setTimeout(()=>{skipPop=Math.max(0,skipPop-1)},700)},120);
}
U.openSheet=function(title,body,foot,opts){
  opts=opts||{};
  $('#shT').textContent=title;const b=$('#shBody');b.innerHTML=body;b.className=opts.col?'col':'';
  $('#shFoot').innerHTML=foot||'';$('#shFoot').hidden=!foot;
  $('#sheet').className=(opts.full?'full ':'')+'on';
  $('#scrim').classList.add('on');document.body.classList.add('lock');b.scrollTop=0;
  pushHist();
};
U.hideSheet=function(){
  $('#scrim').classList.remove('on');$('#sheet').classList.remove('on');document.body.classList.remove('lock');
  U.sh=null;
};
U.closeSheet=function(){U.hideSheet();U.render();popHist()};
U.closeSheetQuiet=function(){U.hideSheet();popHist()};
window.addEventListener('popstate',()=>{
  if(skipPop>0){skipPop--;return}
  if(backT){clearTimeout(backT);backT=null;return}
  if(histOpen){histOpen=false;U.hideSheet();U.render()}
});
U.act.close=U.closeSheet;
U.keepScroll=function(fn){const y=$('#shBody').scrollTop;fn();$('#shBody').scrollTop=y};

/* ---------------- navigation and rendering ---------------- */
const TABS=['home','armory','path','forge'];
U.render=function(anim){
  F.applyTheme();
  const v=U.views[U.tab];if(v)v();
  const idx=TABS.indexOf(U.tab),S=E.S();
  document.querySelectorAll('#dock button').forEach((b,i)=>{b.setAttribute('aria-selected',i===idx)});
  $('#dockInd').style.transform='translateX('+(idx*100)+'%)';
  const dots={armory:S.newItems.length>0,path:E.reviewDue(),forge:!!(E.backupDue&&E.backupDue())||!!U.update};
  TABS.forEach((t,i)=>{const b=document.querySelectorAll('#dock button')[i];if(b)b.classList.toggle('dot',!!dots[t])});
  const sb=$('#sndBtn');sb.innerHTML=E.cfg().sound?IC.on:IC.off;sb.className=E.cfg().sound?'':'off';
  const sc=$('#screen');
  if(anim){sc.classList.remove('in');void sc.offsetWidth;sc.classList.add('in')}
};
U.act.tab=function(v){if(v===U.tab)return;U.tab=v;F.play('nav');F.vib(8);U.render(true);$('#screen').scrollTop=0};
U.act.sound=function(){
  const c=E.cfg();c.sound=!c.sound;E.save();
  if(c.sound){F.unlock();F.play('pick')}
  U.render();
};

/* ---------------- event dispatch: data-a="name:arg" ---------------- */
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-a]');if(!b)return;
  const a=b.dataset.a,i=a.indexOf(':'),k=i<0?a:a.slice(0,i),v=i<0?'':a.slice(i+1);
  const fn=U.act[k];if(fn)fn(v,b,e);
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&U.sh)U.closeSheet()});

/* ---------------- voice ---------------- */
const hashStr=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0};
U.say=function(group,key,ctx){
  const lvl=E.cfg().roast||'playful';
  return HS.say(group,key,lvl,ctx||{seed:hashStr(E.dkey()+key+new Date().getHours())});
};
U.hype=function(key,ctx){const t=HS.say('hype',key,'playful',ctx);U.lastHype={text:t,t:Date.now()};return t};

/* ---------------- game events become moments ---------------- */
E.on('aura',n=>{
  if(!n)return;
  const e=document.createElement('div');e.className='apop '+(n<0?'neg':'pos');e.textContent=(n>0?'+':'−')+Math.abs(n)+' AURA';
  document.body.appendChild(e);setTimeout(()=>e.remove(),1400);
});
const ray='<div class="rays" aria-hidden="true"></div>';
E.on('level',e=>{
  const rk=e.rankUp,line=U.hype('level'),nx=E.lv();
  const hex='<svg class="hexb" viewBox="0 0 58 64" aria-hidden="true"><polygon points="29,2 55,17 55,47 29,62 3,47 3,17"/><text x="29" y="43" text-anchor="middle">'+e.to.rank+'</text></svg>';
  U.cele({kind:'level',sound:null,ms:rk?3800:3000,
    html:ray+'<h1>'+(rk?'RANK UP':'LEVEL UP')+'</h1>'+(rk?hex:'<div class="big">LV '+e.to.L+'</div>')+(rk?'<div class="big sm">LEVEL '+e.to.L+'</div>':'')+'<p>'+esc(line)+'</p><p class="sub">Next level at '+fmt(E.LVF(e.to.L+1))+' aura.</p>'});
});
E.on('locked',()=>U.sys('Level-up locked by fatigue. Train to break it.','bad'));
E.on('protein',()=>{U.sys(U.hype('protein'),'good');if(HS.ui.bubble)HS.ui.bubble()});
E.on('fatigue',on=>{if(on)U.sys('FATIGUED. Aura gains halved and levels locked until you train.','bad')});
E.on('penalty',p=>{
  const total=p.base+p.extra,roast=U.say('roast',p.why==='absent'?'absent':'skip');
  U.cele({kind:'bad',ms:p.why==='absent'?5200:4200,
    html:'<h1>'+(p.why==='absent'?'ABSENT':'QUEST FAILED')+'</h1><div class="big">−'+total+'</div><p>'+esc((p.why==='absent'?'You did not show up. ':'You skipped. ')+(p.strict==='chill'?'Aura lost.':'Fatigue holds your level until you train.')+(p.extra?' Second miss in a row hits twice.':''))+'</p>'+(roast?'<p class="roast">'+esc(roast)+'</p>':'')+(E.cfg().contract?'<p class="contract">Your contract: '+esc(E.cfg().contract)+'</p>':'')});
});
/* a gate falls: the shadow soldier rises from the ground */
E.on('kcal',k=>{(U.bossInfo=U.bossInfo||{}).kcal=k});
E.on('camp',c=>{(U.bossInfo=U.bossInfo||{}).camp=c});
E.on('boss',b=>{(U.bossInfo=U.bossInfo||{}).boss=b});
E.on('gate',g=>{
  const info=U.bossInfo||{};U.bossInfo=null;
  const n=E.S().gates.length,boss=!!g.boss,last=boss&&info.boss&&info.boss.last;
  const extra=[];
  if(boss&&!last&&info.kcal)extra.push('Daily target now '+info.kcal.to+' kcal (was '+info.kcal.from+').');
  if(boss&&!last&&info.camp)extra.push('Camp week: eat at '+fmt(info.camp.kcal)+' kcal for 7 days, train as normal.');
  const sold='<svg class="asold" viewBox="0 0 160 220" aria-hidden="true"><path d="'+HS.avatar.BODY+'"/><path d="'+HS.avatar.HEAD+'"/><rect class="se" x="67" y="29" width="10" height="4" rx="2"/><rect class="se" x="83" y="29" width="10" height="4" rx="2"/></svg>';
  U.cele({kind:boss?'boss':'gate',ms:boss?5200:3800,sound:'arise',vib:[40,40,40,40,220],
    fx:()=>F.burstCenter(boss?160:110),
    html:'<div class="arise"><div class="smoke">'+[0,1,2,3,4,5,6,7].map(i=>'<i style="--i:'+i+'"></i>').join('')+'</div>'+sold+'</div><h1 class="atxt">ARISE</h1><div class="big">'+g.kg+' kg</div><p>'+esc(boss?(last?'FINAL BOSS DOWN. You reached your goal.':'BOSS DOWN. A stronger shadow joins your army.'):(g.count>1?g.count+' gates fell at once. ':'Gate cleared. ')+'Shadow '+n+' joins your army.')+'</p>'+extra.map(x=>'<p class="sub">'+esc(x)+'</p>').join('')});
});
/* a new realm: the whole world changes */
E.on('realm',r=>{
  U.cele({kind:'realm',ms:4600,sound:'level',
    fx:()=>{setTimeout(()=>{F.applyTheme();U.render()},900);F.confetti(120)},
    html:ray+'<div class="kicker">NEW REALM</div><h1>'+esc(r.name.toUpperCase())+'</h1><p>'+esc(r.line)+'</p><p class="sub">The look of the whole app has changed. Change it any time in the Armory.</p>'});
});
E.on('realmpick',()=>{F.applyTheme();F.play('equip');U.render()});
/* gear that unlocks together is shown together: one card for one item, a grid for several */
let freshGear=[],freshT=null;
E.on('unlock',it=>{
  const S=E.S();if(S.newItems.indexOf(it.id)<0)S.newItems.push(it.id);E.persist();
  freshGear.push(it);clearTimeout(freshT);freshT=setTimeout(showGear,60);
});
function showGear(){
  const list=freshGear;freshGear=[];if(!list.length)return;
  const S=E.S();
  if(list.length===1){
    const it=list[0],slot=(HS.SLOTS.find(s=>s[0]===it.slot)||[0,it.slot])[1];
    U.cele({kind:'item',ms:3400,fx:()=>F.confetti(70),
      html:ray+'<div class="kicker">ITEM ACQUIRED</div><div class="icard">'+(it.slot==='title'?'<div class="ttl">\u00AB '+esc(it.name)+' \u00BB</div>':'<div class="iprev">'+HS.avatar.thumb(it,S.equip)+'</div>')+'<b>'+esc(it.name)+'</b><small>'+esc(slot)+' \u00B7 equipped</small></div><p>'+esc(it.desc)+'</p><button class="btn ovbtn" data-a="gotoArmory">Open the Armory</button>'});
    return;
  }
  U.cele({kind:'item',ms:4200,fx:()=>F.confetti(110),
    html:ray+'<div class="kicker">'+list.length+' ITEMS ACQUIRED</div><div class="igrid">'+list.slice(0,6).map(it=>'<div class="icard sm">'+(it.slot==='title'?'<div class="ttl sm">\u00AB '+esc(it.name)+' \u00BB</div>':'<div class="iprev">'+HS.avatar.thumb(it,S.equip)+'</div>')+'<b>'+esc(it.name)+'</b></div>').join('')+'</div>'+(list.length>6?'<p class="sub">and '+(list.length-6)+' more</p>':'')+'<button class="btn ovbtn" data-a="gotoArmory">Open the Armory</button>'});
}
U.act.gotoArmory=function(){closeCele();setTimeout(()=>{U.act.tab('armory')},120)};
E.on('goal',g=>{U.sys('Goal cleared: '+g.t+'. +'+g.aura+' aura. '+U.hype('goal'),'good',true);F.burstCenter(40)});
E.on('streak',s=>{
  const nm=HS.STREAK_NAMES[s.kind]||'Streak';
  U.sys(nm+' milestone! '+U.hype('streak',{n:s.step})+' +'+s.aura+' aura.','good',true);F.burstCenter(70);
});
E.on('equip',()=>{F.play('equip');F.vib(12)});
E.on('clear',st=>{
  const line=st.score>=3?U.hype('clear'):st.score===2?'Half a day banked. Tomorrow is a clean slate. Never miss twice.':'Rough one. It happens. The System logged it honestly, and that counts. Show up tomorrow.';
  F.burstCenter(st.score>=3?60:20);
  U.cele({kind:'clear',ms:6000,sound:'quest',
    html:ray+'<h1>DAY CLEARED</h1><div class="big">'+st.score+' / 4</div><p>'+esc(line)+'</p><button class="btn ovbtn" data-a="chestOpen">Open today\'s chest</button>'});
});
E.on('reset',()=>{F.applyTheme();U.render(true)});
E.on('pwa-update',()=>U.sys('A new version is ready. Close and reopen the app to get it.','',true));

/* quest combo: finishing quests back to back builds a combo with a rising note */
let comboN=0,comboT=0;
U.bump=function(){
  const now=Date.now();
  comboN=(now-comboT<90*60000)?comboN+1:1;comboT=now;
  if(comboN<2)return;
  const e=document.createElement('div');e.className='combo2';e.innerHTML='QUEST COMBO \u00D7'+comboN+'<small>'+(comboN>=4?'ON FIRE':'KEEP IT GOING')+'</small>';
  document.body.appendChild(e);setTimeout(()=>e.remove(),1500);
  F.play('star',Math.min(comboN-2,5));
};
E.on('meal',m=>{if(m.first)U.bump()});
E.on('workout',()=>U.bump());
E.on('protein',()=>U.bump());
E.on('rehab',()=>U.bump());
E.on('clear',()=>U.bump());
E.on('water',w=>{if(w.hit)U.bump()});
/* the backdrop drifts slower than the page as you scroll */
(function(){
  const sc=document.getElementById('screen');if(!sc)return;let raf=0;
  sc.addEventListener('scroll',()=>{if(raf)return;raf=requestAnimationFrame(()=>{raf=0;sc.style.setProperty('--sy',sc.scrollTop+'px')})},{passive:true});
})();

/* ---------------- first run, boot ---------------- */
U.boot=function(){
  HS.avatar.mount();
  F.applyTheme();F.startBg();
  if(HS.pwa)HS.pwa.persist();
  E.compact();
  const sw=E.sweep(),S=E.S();
  E.checkUnlocks();E.checkGoals();
  U.render(true);
  if(!S.welcomed){
    if(Object.keys(S.weights).length||S.aura>0){S.welcomed=true;E.persist()}
    else setTimeout(()=>U.welcome&&U.welcome(),250);
  }
  if(E.unreadable)setTimeout(()=>U.sys('Your saved data could not be read, so nothing was changed. In the Forge, “Restore yesterday’s automatic copy” brings back the last good copy.','bad'),900);
  if(sw.length){
    const missed=sw.filter(x=>!x.pass).length,pass=sw.filter(x=>x.pass).length;
    setTimeout(()=>{
      if(missed)U.sys('The System noticed '+missed+' missed session'+(missed>1?'s':'')+'. '+(U.say('roast','absent')||'Penalty applied.'),'bad');
      else if(pass)U.sys('A missed session was covered by your weekly rest pass.','');
    },700);
  }
  /* the Android app learns when a newer build is out */
  if(HS.native&&HS.native.checkUpdate)HS.native.checkUpdate().then(u=>{if(u){U.update=u;setTimeout(()=>{U.sys('A newer version is ready (build '+u.latest+'). Open the Forge to download it.','good',true);U.render()},1500)}}).catch(()=>{});
  /* manifest shortcuts: ?go=food | water | weigh */
  const go=(new URLSearchParams(location.search)).get('go');
  if(go)setTimeout(()=>{
    if(go==='food')U.plateSheet(U.mealNow());
    else if(go==='water')U.act.water&&U.act.water();
    else if(go==='weigh')U.weighSheet();
  },500);
  /* coming back to the app after a while: new day, new windows */
  let lastDay=E.dkey();
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden)return;
    if(E.dkey()!==lastDay){lastDay=E.dkey();E.sweep();E.checkUnlocks();E.checkGoals()}
    if(!U.sh)U.render();
  });
  setInterval(()=>{if(!document.hidden&&!U.sh&&U.tab==='home'&&!showing)U.views.home()},60000);
};
})();
