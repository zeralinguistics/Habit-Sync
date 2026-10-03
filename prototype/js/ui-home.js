/* ui-home.js: the Quests screen. The hunter in his realm, one clear next move, three quick tiles (water, streak, chest),
   this week's goals, today's rings and the daily quest list. */
(function(){
'use strict';
const HS=window.HS=window.HS||{};
const E=HS.E,F=HS.fx,U=HS.ui;
const esc=U.esc,fmt=U.fmt,cap=U.cap,hhmm=U.hhmm,IC=U.IC,$=U.$,A=U.act;
const RCOL={E:'#8aa5c2',D:'#3ddc97',C:'#3aa8ff',B:'#8b5cff',A:'#f5c451',S:'#ff4d5e'};
const prev={};
function cnt(id,val,f,ms){const el=$('#'+id);if(!el)return;if(prev[id]!=null)el.dataset.v=prev[id];F.countTo(el,val,f,ms);prev[id]=val}
U.RCOL=RCOL;

/* ---------------- quests ---------------- */
U.rehabAura=n=>Math.min(100,n*8);
function rehabMinutes(){const k=E.rehabKeys().filter(x=>x!=='aero');return Math.max(4,Math.round(k.length*1.4))}
function gymQ(d,plan){
  if(plan==='Rest')return{id:'gym',ic:'moon',st:'done',t:'Rest day',s:'Recovery counts',r:''};
  const n=E.routine(plan).length;
  if(d.workout==='done')return{id:'gym',ic:'check',st:'done',t:plan+' day',s:'Done'+(d.burn?' · ~'+fmt(d.burn)+' kcal burned':''),r:'+100'};
  if(d.workout==='pain')return{id:'gym',ic:'check',st:'done',t:plan+' day',s:'Pain day, no penalty',r:''};
  if(d.workout==='pass')return{id:'gym',ic:'pass',st:'skip',t:plan+' day',s:'Rest pass used',r:''};
  if(d.workout==='lazy')return{id:'gym',ic:'x',st:'miss',t:plan+' day',s:'Skipped',r:'PENALTY'};
  return{id:'gym',ic:'gym',st:'todo',t:'Train: '+plan,s:E.fatigued()?'Comeback quest: breaks fatigue':n+' exercises',r:'+100'};
}
function rehabQ(d){
  const r=d.reh,pr=E.rehabProgress(),t=E.rehabToday();
  if(r&&r.done)return{id:'rehab',ic:'check',st:'done',t:'Rehab',s:pr.done+' of '+pr.total+' moves',r:'+'+U.rehabAura(r.n||pr.done)};
  const part=pr.done>0;
  const sub=part?pr.done+' of '+pr.total+' moves so far':pr.total+' moves · about '+rehabMinutes()+' min'+(t.hold?' · gentle ('+t.hold+')':'');
  return{id:'rehab',ic:'rehab',st:'todo',t:'Rehab',s:sub,r:'+'+U.rehabAura(pr.total)};
}
U.quests=function(){
  const d=E.day(),plan=E.planFor(),t=E.nowMin(),T=E.T(),tot=E.totals(d),out=[];
  out.push(d.weighed?{id:'weigh',ic:'scale',st:'done',t:'Weigh-in',s:E.S().weights[E.dkey()].toFixed(1)+' kg'+(d.sleep!=null?' · slept '+d.sleep+' h':''),r:'+15'}:{id:'weigh',ic:'scale',st:'todo',t:'Weigh-in',s:'Before food, plus last night’s sleep',r:'+15'});
  U.MEALS.forEach(m=>{
    const k=E.mealKcal(d,m),n=d.items.filter(i=>i.meal===m).length,w=U.WIN[m];
    const q={id:m,ic:'plate',t:cap(m),r:''};
    if(d.done[m])Object.assign(q,{st:'done',s:fmt(k)+' kcal'+(d.stars&&d.stars[m]?' · '+'★'.repeat(d.stars[m]):'')});
    else if(d.skip[m])Object.assign(q,{st:'skip',s:'Skipped',ic:'dash'});
    else if(!n&&t>w[1]+120)Object.assign(q,{st:'late',s:'Window missed',ic:'dash'});
    else Object.assign(q,{st:'todo',s:n?fmt(k)+' kcal so far':hhmm(w[0])+' to '+hhmm(w[1])});
    if(m==='dinner')out.push(gymQ(d,plan),rehabQ(d));
    out.push(q);
  });
  out.push(d.pAward?{id:'protein',ic:'prot',st:'done',t:'Protein '+T.protein+' g',s:Math.round(tot.p)+' g locked in',r:'+60'}:{id:'protein',ic:'prot',st:'prog',t:'Protein '+T.protein+' g',s:Math.round(tot.p)+' of '+T.protein+' g',r:'+60'});
  out.push(d.closed?{id:'close',ic:'moon',st:'done',t:'Clear the day',s:d.score+' of 4 quests',r:(d.delta>=0?'+':'−')+Math.abs(d.delta)}:{id:'close',ic:'moon',st:'todo',t:'Clear the day',s:'Final tally and your chest',r:'+80'});
  return out;
};
U.justRow=null;U.pulse=false;
A.node=function(v){
  F.play('tap');
  if(v==='weigh')return U.weighSheet();
  if(U.MEALS.indexOf(v)>=0)return U.plateSheet(v);
  if(v==='protein')return U.plateSheet(U.mealNow());
  if(v==='gym')return U.gymSheet();
  if(v==='rehab')return U.rehabSheet();
  return U.closeDaySheet();
};
A.snack=function(){F.play('tap');U.plateSheet('snack')};

/* ---------------- the one next move ---------------- */
U.nextMove=function(){
  const d=E.day(),m=E.nowMin(),T=E.T(),plan=E.planFor(),fat=E.fatigued(),qs=U.quests();
  const q=id=>qs.find(x=>x.id===id);
  const mk=(id,ic,title,sub,reward)=>({id:id,ic:ic,title:title,sub:sub,reward:reward});
  if(d.closed){
    if(!d.chest)return mk('chest','star','Open today’s chest','You cleared the day. Loot is waiting.','?');
    const left=E.bonusToday().filter(b=>!b.done);
    if(left.length)return mk('bonus','bolt','Bonus quests',left.length+' left today. Easy points, no penalty.','+'+left.reduce((a,b)=>a+b.a,0));
    return mk('rest','moon','Day cleared','Nothing left. Sleep is the last quest: aim for 7 hours.','');
  }
  const gq=q('gym'),open=gq&&gq.st==='todo';
  if(fat&&open)return mk('gym','gym','Break the fatigue','Finish '+plan+' day to lift the level lock and the aura penalty.','+100');
  if(!d.weighed&&m<720)return mk('weigh','scale','Step on the scale','Before food. Then tell the System how you slept.','+15');
  for(let i=0;i<3;i++){
    const ml=U.MEALS[i],w=U.WIN[ml],mq=q(ml);
    if(mq&&mq.st==='todo'&&m>=w[0]-30&&m<=w[1]+90){
      const mm=E.mealKcal(d,ml);
      return mk(ml,'plate','Log '+ml,mm?fmt(mm)+' kcal so far. Add more or finish the plate.':'Window '+hhmm(w[0])+' to '+hhmm(w[1])+'. Build your plate, 10 seconds.','+'+E.rateMeal(ml).stars*4);
    }
  }
  if(open)return mk('gym','gym','Train: '+plan,E.routine(plan).length+' exercises. Tap a bubble per set.','+100');
  const rq=q('rehab');
  if(rq&&rq.st==='todo')return mk('rehab','rehab','Rehab session',rq.s+'. The boring work that heals you.','+'+U.rehabAura(E.rehabProgress().total));
  if(!d.weighed)return mk('weigh','scale','Weigh in','Even late counts. Data beats guessing.','+15');
  const mpend=U.MEALS.find(ml=>{const mq=q(ml);return mq&&mq.st==='todo'&&m>U.WIN[ml][0]});
  if(mpend)return mk(mpend,'plate','Log '+mpend,'Still open. Fast taps, no judgement.','+8');
  if((d.water||0)<E.waterPace()-300)return mk('water','drop','Drink water',fmt(d.water||0)+' of '+fmt(E.cfg().water)+' ml. A bottle now catches you up.','+30');
  if(!d.pAward)return mk('protein','prot','Close the protein gap',fmt(Math.max(0,T.protein-E.totals(d).p))+' g to go. Eggs, soya or chicken do it.','+60');
  if(E.nowMin()>=1140||qs.every(x=>x.id==='close'||x.st!=='todo'))return mk('close','moon','Clear the day','Final tally, then your chest.','+80');
  return mk('close','moon','You are ahead of the day','Keep going, or clear the day when you are done.','');
};
A.move=function(){
  const mv=U.nextMove();
  if(mv.id==='chest')return A.chestOpen();
  if(mv.id==='bonus'){F.play('tap');const w=$('#bonusWin');if(w){w.scrollIntoView({behavior:'smooth',block:'center'});w.classList.remove('flash');void w.offsetWidth;w.classList.add('flash')}return}
  if(mv.id==='water')return A.water();
  if(mv.id==='rest'||!mv.id)return;
  A.node(mv.id);
};

/* ---------------- the hunter's voice ---------------- */
function bubbleLine(){
  const h=U.lastHype;
  if(h&&Date.now()-h.t<120000)return{t:h.text,tone:'good'};
  const k=E.situation();
  if(k){const t=U.say('roast',k);if(t)return{t:t,tone:'bad'}}
  const d=E.day(),nu=E.nextUnlock();
  if(d.closed)return{t:U.say('hype','clear'),tone:'good'};
  if(nu&&nu.p.pct>=.6)return{t:'Close: '+nu.p.text+' ('+nu.p.have+'/'+nu.p.need+') unlocks '+nu.it.name+'.',tone:'info'};
  const hr=Math.floor(E.nowMin()/60)%24,nm=E.cfg().name||'Hunter';
  const g=hr<5?'Up this late, '+nm+'? Sleep is a quest too.':hr<12?'Morning, '+nm+'. Scale first, then food.':hr<17?'Afternoon, '+nm+'. Keep the quests moving.':hr<21?'Evening, '+nm+'. Finish strong.':'Night, '+nm+'. Clear the day and rest.';
  return{t:g,tone:'info'};
}
U.bubble=function(txt,tone){
  const b=$('#bubble');if(!b)return;
  const l=txt?{t:txt,tone:tone||'info'}:bubbleLine();
  b.className='bubble '+l.tone;b.textContent=l.t;
  b.classList.remove('pop');void b.offsetWidth;b.classList.add('pop');
};
let pokes=[];
A.poke=function(){
  F.play('tap');F.vib(8);
  const hero=$('.hero-av');if(hero){hero.classList.remove('hop');void hero.offsetWidth;hero.classList.add('hop')}
  const now=Date.now();pokes=pokes.filter(t=>now-t<8000);pokes.push(now);
  const d=E.day();
  if(pokes.length>=7&&!d.poked){d.poked=true;pokes=[];E.addAura(5);E.save();U.bubble('Okay okay, you are persistent. +5 aura. Now go do a quest.','good');F.burstCenter(30);return}
  if(Math.random()<.5){const k=E.situation();const t=k&&U.say('roast',k);if(t){U.bubble(t,'bad');return}}
  const qp=HS.VOICE.quips;U.bubble(qp[Math.floor(Math.random()*qp.length)],'info');
};

/* ---------------- quick tiles: water, streak, chest ---------------- */
const BOTTLE='M16 4h12v8c0 4 10 6 10 18v34a6 6 0 0 1-6 6H12a6 6 0 0 1-6-6V30c0-12 10-14 10-18z';
function waterLevel(){const d=E.day(),c=E.cfg();return Math.max(0,Math.min(1,(d.water||0)/c.water))}
function waterTile(){
  const d=E.day(),c=E.cfg(),pct=waterLevel(),y=70-pct*54,py=prev.wy!=null?prev.wy:70;
  return `<div class="tw water${d.waterHit?' hit':''}" id="waterTile"><button class="wmain" data-a="water" aria-label="Drink 250 millilitres. ${fmt(d.water||0)} of ${fmt(c.water)}">
    <svg class="bottle" viewBox="0 0 44 72" aria-hidden="true"><defs><clipPath id="botclip"><path d="${BOTTLE}"/></clipPath></defs>
      <g clip-path="url(#botclip)"><g class="wlev" id="wlev" style="transform:translateY(${py}px)"><path class="wwave" d="M-30 0q7.500-5 15 0t15 0t15 0t15 0t15 0t15 0t15 0t15 0V80H-30z"/><path class="wwave b" d="M-22 2q7.500-5 15 0t15 0t15 0t15 0t15 0t15 0t15 0t15 0V80H-22z"/></g></g>
      <path class="botline" d="${BOTTLE}"/><rect class="botcap" x="17" y="1" width="10" height="4" rx="1.500"/></svg>
    <span class="tv"><b id="wTxt">${((d.water||0)/1000).toFixed(2).replace(/0$/,'')}</b> / ${(c.water/1000).toFixed(1)} L</span><span class="tl" id="wLbl">${d.waterHit?'TARGET HIT':'TAP +250 ML'}</span></button>
    <button class="wundo" data-a="waterUndo" aria-label="Undo 250 millilitres">${IC.minus}</button></div>`;
}
function setWaterVisual(){
  const d=E.day(),c=E.cfg(),pct=waterLevel(),y=70-pct*54;
  const lev=$('#wlev');if(lev)lev.style.transform='translateY('+y+'px)';prev.wy=y;
  const t=$('#wTxt');if(t)t.textContent=((d.water||0)/1000).toFixed(2).replace(/0$/,'');
  const l=$('#wLbl');if(l)l.textContent=d.waterHit?'TARGET HIT':'TAP +250 ML';
  const tile=$('#waterTile');if(tile)tile.classList.toggle('hit',!!d.waterHit);
}
A.water=function(){
  const hit=E.addWater(250);
  setWaterVisual();
  const tile=$('#waterTile');
  if(tile){tile.classList.remove('splash');void tile.offsetWidth;tile.classList.add('splash');F.burstAt(tile,hit?60:10,['#7fe3ff','#ffffff','#3aa8ff'])}
  if(hit){U.sys(U.hype('water')+' +30 aura.','good',true);F.burstCenter(60,['#7fe3ff','#ffffff','#3aa8ff'])}
  U.bubble();
};
A.waterUndo=function(){E.addWater(-250);F.play('tick',60);setWaterVisual()};

function streakTile(){
  const n=E.streak('clear'),best=Math.max(E.S().bestStreak||0,n),next=HS.STREAK_STEPS.find(x=>x>n);
  return `<button class="tw streak" data-a="streaks" aria-label="${n} day clear streak. Best ${best}.">
    ${U.flame(n)}<span class="tv"><b>${n}</b> day${n===1?'':'s'}</span><span class="tl">${n?'CLEAR STREAK':'START A STREAK'}</span><span class="ts">${next?'Next: '+next+' days':'Best '+best}</span></button>`;
}
function chestTile(){
  const d=E.day();
  const state=d.chest?'open':d.closed?'ready':'locked';
  const tier=d.chest?d.chest.tier:'';
  const svg=`<svg class="chestsvg" viewBox="0 0 64 56" aria-hidden="true"><path class="cb" d="M6 26h52v26a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z"/><path class="cl" d="M6 26c0-12 10-20 26-20s26 8 26 20z"/><path class="cband" d="M6 34h52M30 26v12h4V26"/><rect class="clock" x="29" y="30" width="6" height="8" rx="1.500"/>${state==='open'?'<g class="cspark"><path d="M32 4v-4M20 8l-3-3M44 8l3-3"/></g>':''}</svg>`;
  return `<button class="tw chest ${state} ${tier}" data-a="chest" aria-label="Daily chest, ${state}">${svg}
    <span class="tv">${state==='open'?'<b>+'+d.chest.aura+'</b> aura':state==='ready'?'<b>OPEN</b>':'<b>—</b>'}</span><span class="tl">${state==='open'?(d.chest.crit?'CRITICAL! ':'')+tier.toUpperCase()+' CHEST':state==='ready'?'TAP TO OPEN':'CLEAR THE DAY'}</span></button>`;
}
A.chest=function(){
  const d=E.day();
  if(d.chest){U.sys('Opened: '+d.chest.tier+' chest, +'+d.chest.aura+' aura. A new one tomorrow.','');return}
  if(!d.closed){U.sys('Clear the day first. 3 of 4 quests makes it a rare chest, 4 of 4 an epic one.','');F.play('shake');return}
  A.chestOpen();
};
let chestBusy=false;
A.chestOpen=function(){
  const d=E.day();
  if(!d.closed){A.chest();return}
  if(d.chest||chestBusy)return;   /* a second tap while the lid is opening must not replay the reveal */
  chestBusy=true;
  U.act.ovClose&&U.act.ovClose();
  F.play('shake');F.vib([30,30,30,30,30]);
  U.cele({kind:'chest',ms:600,html:'<div class="chestbig shake"><svg viewBox="0 0 64 56"><path class="cb" d="M6 26h52v26a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z"/><path class="cl" d="M6 26c0-12 10-20 26-20s26 8 26 20z"/><path class="cband" d="M6 34h52M30 26v12h4V26"/><rect class="clock" x="29" y="30" width="6" height="8" rx="1.500"/></svg></div><p>Opening...</p>'});
  setTimeout(()=>{
    chestBusy=false;
    const c=E.openChest(d.score);
    F.confetti(c.crit?200:110);
    U.cele({kind:'chest tier-'+c.tier,ms:3600,
      html:'<div class="rays"></div><div class="chestbig open"><svg viewBox="0 0 64 56"><path class="cb" d="M6 26h52v26a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z"/><path class="cl up" d="M6 26c0-12 10-20 26-20s26 8 26 20z"/><path class="cband" d="M6 34h52"/></svg></div><div class="kicker">'+(c.crit?'CRITICAL! ':'')+c.tier.toUpperCase()+' CHEST</div><div class="big">+'+c.aura+'</div><p>aura. '+esc(c.crit?'Luck is on your side.':'Show up again tomorrow for another.')+'</p>'});
  },700);
};

/* ---------------- bonus quests: three small optional extras ---------------- */
function bonusRow(b,i){
  const sub=b.auto?'AUTO \u00B7 '+(b.done?'done':(b.prog||b.s)):b.s;
  return `<button class="qrow brow ${b.done?'done':'todo'}${U.justBonus===b.id?' just':''}" style="--i:${i}" data-a="bonus:${b.id}" aria-pressed="${b.done}" aria-label="${esc(b.t+', '+(b.done?'done':'not done')+', plus '+b.a+' aura'+(b.auto?', ticks itself':''))}">
    <span class="qic">${b.done?IC.check:b.auto?IC.bolt:IC.ring}</span>
    <span class="qm"><span class="qt">${esc(b.t)}</span><span class="qs">${esc(sub)}</span></span><span class="qr">+${b.a}</span></button>`;
}
function bonusHead(row){
  const n=row.filter(b=>b.done).length;
  return '[ Bonus quests ] <em>'+(n===row.length?'3 of 3 \u00B7 chest upgraded':n+' of 3 \u00B7 optional, no penalty')+'</em>';
}
function bonusCard(i){
  const row=E.bonusToday(),all=row.every(b=>b.done);
  return `<div class="win rise bonus${all?' allset':''}" id="bonusWin" style="--i:${i}"><div class="wt" id="bonusHd">${bonusHead(row)}</div><div id="bonusRows">${row.map(bonusRow).join('')}</div></div>`;
}
/* redraw only the bonus card, so the rest of the screen does not move */
U.refreshBonus=function(justId){
  const w=$('#bonusWin');if(!w||U.tab!=='home')return;
  const row=E.bonusToday(),all=row.every(b=>b.done);
  U.justBonus=justId||null;
  $('#bonusHd').innerHTML=bonusHead(row);
  $('#bonusRows').innerHTML=row.map(bonusRow).join('');
  w.classList.toggle('allset',all);
  U.justBonus=null;
};
A.bonus=function(id){
  const b=E.bonusToday().find(x=>x.id===id);if(!b)return;
  if(b.auto){F.play('pick');U.sys(b.done?'Done. That one ticked itself.':'This one ticks itself when you do it ('+(b.prog||b.s).toLowerCase()+').','');return}
  const fresh=!b.claimed,on=E.tickBonus(id);
  F.play(on?'quest':'tick',60);F.vib(on?[12,24,12]:6);
  U.refreshBonus(on?id:null);
  if(on&&fresh){const el=document.querySelector('#bonusRows .qrow.done.just, #bonusRows [data-a="bonus:'+id+'"]');if(el)F.burstAt(el.querySelector('.qic')||el,18,['#f5c451','#ffffff','#3aa8ff']);U.bubble(U.hype('bonus'),'good');U.bump()}
};

/* ---------------- the home screen ---------------- */
function goalCard(g){
  const pct=Math.min(100,g.have/g.need*100);
  return `<div class="gc${g.done?' done':''}"><b>${esc(g.t)}</b><small>${esc(g.d)}</small><div class="xp"><i style="width:${pct}%"></i></div><span>${g.done?'✓ CLEARED':g.have+' / '+g.need}</span><em>+${g.aura}</em></div>`;
}
function streakCard(s){
  const pct=Math.min(100,s.have/s.need*100);
  return `<div class="gc st"><b>${esc(s.name)}</b><small>${s.have} of ${s.need} days</small><div class="xp"><i style="width:${pct}%"></i></div><span>${s.need-s.have} to go</span><em>+${s.aura}</em></div>`;
}
/* the boss's health is the distance left between the previous boss (or the start) and this one */
function bossHpPct(ng,tr,S){
  if(!ng.boss)return 0;
  const bosses=E.bossKgs(),i=bosses.indexOf(ng.boss.kg),from=i>0?bosses[i-1]:S.startW;
  const span=from-ng.boss.kg;
  return span>0?Math.max(0,Math.min(100,(tr-ng.boss.kg)/span*100)):100;
}
const dayLeft=()=>Math.max(0,1440+(E.cfg().dayStart||0)*60-E.nowMin());
U.views.home=function(){
  const S=E.S(),cfg=E.cfg(),d=E.day(),T=E.T(),tot=E.totals(d),L=E.lv(),fat=E.fatigued();
  const kp=Math.min(100,tot.k/T.kcal*100),pp=Math.min(100,tot.p/T.protein*100),left=T.kcal-tot.k;
  const qs=U.quests(),next=qs.find(q=>q.st==='todo');
  const ng=E.nextGates(),tr=E.trend(),mv=U.nextMove();
  const title=(HS.ITEM_BY_ID[S.equip.title]||{}).name||'Rookie Hunter';
  const bossHp=bossHpPct(ng,tr,S),goals=E.goalsActive(),st=E.streakTargets().sort((a,b)=>(b.have/b.need)-(a.have/a.need)).slice(0,3);
  const daysLeft=7-E.di();
  const camp=E.campInfo();
  const bl=bubbleLine();
  let h=`<section class="scene${fat?' fat':''}" style="--rc:var(--glow);--pw:${Math.min(1,L.L/40).toFixed(2)}">
    ${HS.avatar.scene(S.realm)}
    <div class="aglow"></div>
    <div class="ground"><svg viewBox="0 0 300 300" aria-hidden="true"><circle cx="150" cy="150" r="140" class="r1"/><circle cx="150" cy="150" r="108" class="r2"/><circle cx="150" cy="150" r="76" class="r3"/></svg></div>
    <div class="army">${HS.avatar.army(S.gates.length)}</div>
    <button class="hero-av" data-a="poke" aria-label="Poke your hunter">${HS.avatar.svg(S.equip,{mood:E.mood()})}</button>
    <div class="s-top"><div class="rbadge" style="color:${RCOL[L.rank]}"><svg viewBox="0 0 58 64" aria-hidden="true"><polygon points="29,2 55,17 55,47 29,62 3,47 3,17" fill="rgba(6,12,26,.85)" stroke="currentColor" stroke-width="2.5"/></svg><b>${L.rank}</b></div>
      <div class="who"><b>${esc(cfg.name||'PLAYER')}</b><span>LEVEL ${L.L}${L.locked?' · LOCKED':''}${fat?' · <i class="fatl">FATIGUED</i>':''}</span><small>« ${esc(title)} »</small></div>
      <div class="aur"><b id="auraNum">${fmt(S.aura)}</b><span>AURA</span></div></div>
    <div class="bubble ${bl.tone}" id="bubble">${esc(bl.t)}</div>
    <div class="s-bot"><div class="xp"><i id="xpFill" style="width:${prev.xp!=null?prev.xp:0}%"></i></div><div class="xpt">${L.locked?'LEVEL UP READY. LOCKED BY FATIGUE':'AURA '+fmt(L.have)+' / '+fmt(L.need)+' TO LEVEL '+(L.L+1)}</div></div>
  </section>
  <button class="move rise k-${mv.id}" style="--i:0" data-a="move" aria-label="Next move: ${esc(mv.title)}">
    <span class="mic">${IC[mv.ic]||IC.check}</span>
    <span class="mm"><em>${camp?'CAMP WEEK · ':''}NEXT MOVE</em><b>${esc(mv.title)}</b><small>${esc(mv.sub)}</small></span>
    <span class="mr">${mv.reward?'<b>'+esc(mv.reward)+'</b>':''}<i>${IC.chev}</i></span></button>
  <div class="trio rise" style="--i:1">${waterTile()}${streakTile()}${chestTile()}</div>
  <button class="bosschip rise" style="--i:2" data-a="tab:path" aria-label="${ng.boss?'Boss gate '+ng.boss.kg+' kilograms, '+ng.toBoss.toFixed(1)+' kilograms to go':'Every boss cleared'}">
    <div class="bh"><span>${ng.boss?'BOSS · '+ng.boss.kg+' KG':'FINAL FORM'}</span><b>${ng.boss?ng.toBoss.toFixed(1)+' kg to go':'Cleared'}</b></div>
    <div class="hp"><i style="width:${bossHp}%"></i></div><small>${ng.boss?'Boss HP '+Math.round(bossHp)+'%':'Every boss is down'}</small></button>
  <div class="win ringrow rise" style="--i:3">
    <div class="rings${U.pulse?' pulse':''}" role="img" aria-label="${fmt(tot.k)} of ${fmt(T.kcal)} kilocalories, ${Math.round(tot.p)} of ${T.protein} grams protein"><svg viewBox="0 0 100 100" aria-hidden="true">
      <circle class="trk" cx="50" cy="50" r="43"/><circle id="ringK" class="arc k${tot.k>T.hi?' over':''}" cx="50" cy="50" r="43" pathLength="100" style="stroke-dashoffset:${prev.rk!=null?prev.rk:100}"/>
      <circle class="trk" cx="50" cy="50" r="31"/><circle id="ringP" class="arc p${tot.p>=T.protein?' full':''}" cx="50" cy="50" r="31" pathLength="100" style="stroke-dashoffset:${prev.rp!=null?prev.rp:100}"/></svg>
      <div class="rc"><b id="leftNum">${fmt(Math.abs(left))}</b><span>${left>=0?'KCAL LEFT':'KCAL OVER'}</span></div></div>
    <div class="rl"><div><b class="k">${fmt(tot.k)}</b> / ${fmt(T.kcal)} kcal${camp?' <em class="campt">camp</em>':''}</div><div><b class="p">${Math.round(tot.p)}</b> / ${T.protein} g protein</div>
      <small>${d.burn?'Burned about '+fmt(d.burn)+' kcal. Info only: your target already counts training.':'Finish a workout to see your burn estimate.'}</small></div></div>
  <div class="win rise" style="--i:4"><div class="wt">[ This week ] <em>resets in ${daysLeft} day${daysLeft===1?'':'s'}</em></div>
    <div class="goals">${goals.map(goalCard).join('')}${st.map(streakCard).join('')}</div></div>
  <div class="win rise" style="--i:5"><div class="wt">[ Daily quest ] <em class="${d.closed?'':dayLeft()<180?'warn':''}">${qs.filter(x=>x.st==='done').length} of ${qs.length} done${d.closed?' \u00B7 cleared':' \u00B7 closes in '+Math.floor(dayLeft()/60)+'h '+String(dayLeft()%60).padStart(2,'0')+'m'}</em></div>`;
  qs.forEach((q,i)=>{
    const isNext=next&&next.id===q.id;
    h+=`<button class="qrow ${isNext?'next':q.st}${U.justRow===q.id?' just':''}" style="--i:${i}" data-a="node:${q.id}" aria-label="${esc(q.t+', '+q.s)}">
      <span class="qic">${q.st==='done'&&q.ic!=='moon'?IC.check:IC[q.ic]}</span>
      <span class="qm"><span class="qt">${esc(q.t)}</span><span class="qs">${esc(q.s)}</span></span><span class="qr">${esc(q.r)}</span></button>`;
  });
  h+=`</div>${bonusCard(6)}<button class="link" data-a="snack">Ate something else? Log a snack</button>`;
  $('#screen').innerHTML=h;
  requestAnimationFrame(()=>{
    const rk=100-kp,rp=100-pp,ek=$('#ringK');
    if(!ek)return;   /* the screen changed before the frame */
    ek.style.strokeDashoffset=rk;$('#ringP').style.strokeDashoffset=rp;prev.rk=rk;prev.rp=rp;
    $('#xpFill').style.width=(L.pct*100)+'%';prev.xp=L.pct*100;
    const y=70-waterLevel()*54;const lev=$('#wlev');if(lev)lev.style.transform='translateY('+y+'px)';prev.wy=y;
  });
  cnt('auraNum',S.aura);
  U.justRow=null;U.pulse=false;
};
})();
