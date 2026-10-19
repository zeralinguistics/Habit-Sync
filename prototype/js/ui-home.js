/* ui-home.js: the Today screen. A short look at the hunter, the daily streak, one clear next move, what you have eaten, and the four things
   left to do. Everything else (goals, bonus quests, the boss, the chest) is one tap deeper. */
(function(){
'use strict';
const HS=window.HS=window.HS||{};
const E=HS.E,F=HS.fx,U=HS.ui;
const esc=U.esc,fmt=U.fmt,cap=U.cap,hhmm=U.hhmm,IC=U.IC,$=U.$,A=U.act;
const RCOL={E:'#8aa5c2',D:'#3ddc97',C:'#3aa8ff',B:'#8b5cff',A:'#f5c451',S:'#ff4d5e'};
const prev={};
function cnt(id,val,f,ms){const el=$('#'+id);if(!el)return;if(prev[id]!=null)el.dataset.v=prev[id];F.countTo(el,val,f,ms);prev[id]=val}
U.RCOL=RCOL;

/* ---------------- quests (the data behind the tiles, the next move and the clear-the-day check) ---------------- */
U.rehabAura=n=>Math.min(100,n*8);
function rehabMinutes(){const k=E.rehabKeys().filter(x=>x!=='aero');return Math.max(4,Math.round(k.length*1.4))}
function gymQ(d,plan){
  if(plan==='Rest'&&!d.sess){
    if(d.cardio){const m=d.mins||{};return{id:'gym',ic:'check',st:'done',t:'Cardio day',s:(m.walk?m.walk+' min walk':'')+(m.walk&&m.run?' \u00B7 ':'')+(m.run?m.run+' min run':'')+(d.burn?' \u00B7 ~'+fmt(d.burn)+' kcal':''),r:'+60'}}
    return{id:'gym',ic:'walk',st:'todo',t:'Cardio day',s:'Easy walk or a run',r:'+60',opt:true};
  }
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
  out.push(d.weighed?{id:'weigh',ic:'scale',st:'done',t:'Weigh-in',s:(E.S().weights[E.dkey()]!=null?E.S().weights[E.dkey()].toFixed(1)+' kg':'Done')+(d.sleep!=null?' · slept '+d.sleep+' h':''),r:'+15'}:{id:'weigh',ic:'scale',st:'todo',t:'Weigh-in',s:'Weight and sleep',r:'+15'});
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
  out.push(d.closed?{id:'close',ic:'moon',st:'done',t:'Clear the day',s:d.score+' of 6 pillars',r:(d.delta>=0?'+':'−')+Math.abs(d.delta)}:{id:'close',ic:'moon',st:'todo',t:'Clear the day',s:'Final tally and your chest',r:'+80'});
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
  if(v==='water')return A.water();
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
    if(left.length)return mk('bonus','bolt','Bonus quests',left.length+' left today','+'+left.reduce((a,b)=>a+b.a,0));
    return mk('rest','moon','Day cleared','Nothing left. Get some sleep.','');
  }
  const gq=q('gym'),restDay=plan==='Rest'&&!d.sess,open=gq&&gq.st==='todo'&&!restDay;
  if(fat&&open)return mk('gym','gym','Break the fatigue','Finish '+plan+' day to lift the level lock','+100');
  /* the streak is on the line: point at the easiest pillar still dark */
  const si=E.sparkInfo();
  if(!d.spark&&si.n>=2&&m>=1080){
    const pil=E.pillarsFor(),need=E.sparkGoal()-pil.filter(p=>p.met).length,easy=['check','water','fuel','rehab','protein','move'].map(id=>pil.find(p=>p.id===id)).find(p=>!p.met);
    if(easy&&need>0){
      const to={check:'weigh',water:'water',fuel:U.mealNow()==='snack'?'dinner':U.mealNow(),rehab:'rehab',protein:'protein',move:'gym'}[easy.id];
      return mk(to,'flame','Keep your '+si.n+'-day flame',need+' more pillar'+(need>1?'s':'')+' to light today. Easiest: '+easy.t.toLowerCase(),'');
    }
  }
  if(!d.weighed&&m<720)return mk('weigh','scale','Step on the scale','Before food, then log your sleep','+15');
  for(let i=0;i<3;i++){
    const ml=U.MEALS[i],w=U.WIN[ml],mq=q(ml);
    if(mq&&mq.st==='todo'&&m>=w[0]-30&&m<=w[1]+90){
      const mm=E.mealKcal(d,ml);
      return mk(ml,'plate','Log '+ml,mm?fmt(mm)+' kcal so far':hhmm(w[0])+' to '+hhmm(w[1]),'+'+E.rateMeal(ml).stars*4);
    }
  }
  if(open)return mk('gym','gym','Train: '+plan,E.routine(plan).length+' exercises','+100');
  const rq=q('rehab');
  if(rq&&rq.st==='todo')return mk('rehab','rehab','Rehab session',rq.s,'+'+U.rehabAura(E.rehabProgress().total));
  if(restDay&&gq&&gq.st==='todo'&&m<1260)return mk('gym','walk','Cardio day','Easy walk or a run','+60');
  if(!d.weighed)return mk('weigh','scale','Weigh in','Even late counts','+15');
  const mpend=U.MEALS.find(ml=>{const mq=q(ml);return mq&&mq.st==='todo'&&m>U.WIN[ml][0]});
  if(mpend)return mk(mpend,'plate','Log '+mpend,'Still open','+8');
  if((d.water||0)<E.waterPace()-300)return mk('water','drop','Drink water',fmt(d.water||0)+' of '+fmt(E.cfg().water)+' ml','+30');
  if(!d.pAward)return mk('protein','prot','Close the protein gap',fmt(Math.max(0,T.protein-E.totals(d).p))+' g to go','+60');
  if(E.nowMin()>=1140||qs.every(x=>x.id==='close'||x.st!=='todo'||x.opt))return mk('close','moon','Clear the day','Final tally and your chest','+80');
  return mk('close','moon','You are ahead of the day','Clear the day when you are done','');
};
A.move=function(){
  const mv=U.nextMove();
  if(mv.id==='chest')return A.chestOpen();
  if(mv.id==='bonus')return A.bonusSheet();
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

/* ---------------- water ---------------- */
const BOTTLE='M16 4h12v8c0 4 10 6 10 18v34a6 6 0 0 1-6 6H12a6 6 0 0 1-6-6V30c0-12 10-14 10-18z';
function waterLevel(){const d=E.day(),c=E.cfg();return Math.max(0,Math.min(1,(d.water||0)/c.water))}
function waterTile(){
  const d=E.day(),c=E.cfg(),y=70-waterLevel()*54,py=prev.wy!=null?prev.wy:70;
  return `<div class="trow water${d.waterHit?' done hit':''}" id="waterTile" style="--c:#3aa8ff"><button class="wmain" data-a="water" aria-label="Drink 250 millilitres. ${fmt(d.water||0)} of ${fmt(c.water)}">
    <span class="tic"><svg class="bottle" viewBox="0 0 44 72" aria-hidden="true"><defs><clipPath id="botclip"><path d="${BOTTLE}"/></clipPath></defs>
      <g clip-path="url(#botclip)"><g class="wlev" id="wlev" style="transform:translateY(${py}px)"><path class="wwave" d="M-30 0q7.500-5 15 0t15 0t15 0t15 0t15 0t15 0t15 0t15 0V80H-30z"/><path class="wwave b" d="M-22 2q7.500-5 15 0t15 0t15 0t15 0t15 0t15 0t15 0t15 0V80H-22z"/></g></g>
      <path class="botline" d="${BOTTLE}"/><rect class="botcap" x="17" y="1" width="10" height="4" rx="1.500"/></svg></span>
    <span class="tm"><b>Water</b><small><span id="wTxt">${((d.water||0)/1000).toFixed(2).replace(/0$/,'')}</span> of ${(c.water/1000).toFixed(1)} L</small><i class="wbar"><u id="wbar" style="width:${Math.round(waterLevel()*100)}%"></u></i></span>
    <em class="tr" id="wLbl">${d.waterHit?'Done':'+250 ml'}</em></button>
    <button class="wundo" data-a="waterUndo" aria-label="Undo 250 millilitres">${IC.minus}</button></div>`;
}
function setWaterVisual(){
  const d=E.day(),c=E.cfg(),y=70-waterLevel()*54;
  const lev=$('#wlev');if(lev)lev.style.transform='translateY('+y+'px)';prev.wy=y;
  const t=$('#wTxt');if(t)t.textContent=((d.water||0)/1000).toFixed(2).replace(/0$/,'');
  const l=$('#wLbl');if(l)l.textContent=d.waterHit?'Done':'+250 ml';
  const bar=$('#wbar');if(bar)bar.style.width=Math.round(waterLevel()*100)+'%';
  const tile=$('#waterTile');if(tile){tile.classList.toggle('hit',!!d.waterHit);tile.classList.toggle('done',!!d.waterHit)}
  const tc=$('#tcount');if(tc)tc.textContent=document.querySelectorAll('#taskCard .trow.done').length+' of 4';
}
A.water=function(){
  const hit=E.addWater(250);
  setWaterVisual();
  const tile=$('#waterTile');
  if(tile){tile.classList.remove('splash');void tile.offsetWidth;tile.classList.add('splash');F.burstAt(tile,hit?60:10,['#7fe3ff','#ffffff','#3aa8ff'])}
  if(hit){U.sys(U.hype('water')+' +30 aura.','good',true);F.burstCenter(60,['#7fe3ff','#ffffff','#3aa8ff'])}
  U.bubble();
  if(U.tab==='home')refreshStreak();
};
A.waterUndo=function(){E.addWater(-250);F.play('tick',60);setWaterVisual();if(U.tab==='home')refreshStreak()};

/* ---------------- the chest ---------------- */
let chestBusy=false;
A.chest=function(){
  const d=E.day();
  if(d.chest){U.sys('Opened: '+d.chest.tier+' chest, +'+d.chest.aura+' aura. A new one tomorrow.','');return}
  if(!d.closed){U.sys('Clear the day first.','');F.play('shake');return}
  A.chestOpen();
};
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

/* ---------------- bonus quests: three small optional extras (now a sheet) ---------------- */
function bonusRow(b,i){
  const sub=b.auto?'AUTO · '+(b.done?'done':(b.prog||b.s)):b.s;
  return `<button class="qrow brow ${b.done?'done':'todo'}${U.justBonus===b.id?' just':''}" style="--i:${i}" data-a="bonus:${b.id}" aria-pressed="${b.done}" aria-label="${esc(b.t+', '+(b.done?'done':'not done')+', plus '+b.a+' aura'+(b.auto?', ticks itself':''))}">
    <span class="qic">${b.done?IC.check:b.auto?IC.bolt:IC.ring}</span>
    <span class="qm"><span class="qt">${esc(b.t)}</span><span class="qs">${esc(sub)}</span></span><span class="qr">+${b.a}</span></button>`;
}
function bonusHead(row){
  const n=row.filter(b=>b.done).length;
  return n===row.length?'3 of 3. Your chest goes up a tier.':n+' of 3 done';
}
function bonusBody(){const row=E.bonusToday();return `<div class="hint" id="bonusHd">${bonusHead(row)}</div><div class="bonusbox" id="bonusRows">${row.map(bonusRow).join('')}</div>`}
A.bonusSheet=function(){F.play('tap');U.sh={type:'bonus'};U.openSheet('Bonus quests',bonusBody(),'<button class="btn ghost" data-a="close">Close</button>')};
/* redraw the bonus rows in the open sheet, so the rest of the screen does not move */
U.refreshBonus=function(justId){
  if(U.tab==='home')refreshMore();
  if(!U.sh||U.sh.type!=='bonus'||!$('#bonusRows'))return;
  const row=E.bonusToday();
  U.justBonus=justId||null;
  $('#bonusHd').textContent=bonusHead(row);
  $('#bonusRows').innerHTML=row.map(bonusRow).join('');
  U.justBonus=null;
};
A.bonus=function(id){
  const b=E.bonusToday().find(x=>x.id===id);if(!b)return;
  if(b.auto){F.play('pick');U.sys(b.done?'Done. That one ticked itself.':'This one ticks itself when you do it ('+(b.prog||b.s).toLowerCase()+').','');return}
  const fresh=!b.claimed,on=E.tickBonus(id);
  F.play(on?'quest':'tick',60);F.vib(on?[12,24,12]:6);
  U.refreshBonus(on?id:null);
  if(on&&fresh){const el=document.querySelector('#bonusRows [data-a="bonus:'+id+'"]');if(el)F.burstAt(el.querySelector('.qic')||el,18,['#f5c451','#ffffff','#3aa8ff']);U.bubble(U.hype('bonus'),'good');U.bump()}
};

/* ---------------- the streak: a small chip in the top bar. The week, the pillars and the shields are in the sheet behind it ---------------- */
function streakChip(){
  const n=E.sparkInfo().n,goal=E.sparkGoal(),met=E.pillarsMet(),lit=met>=goal||!!E.day().spark,risk=!lit&&n>=2&&E.nowMin()>=1080;
  return `<button class="chip skc ${lit?'lit':risk?'risk':n?'warm':'cold'}" data-a="streaks" id="skCard" aria-label="${n} day streak. ${met} of 6 pillars lit today, ${goal} needed.">${U.flame(lit||n?n:0)}<b>${n}</b></button>`;
}
function refreshStreak(){const el=$('#skCard');if(!el)return;const t=document.createElement('div');t.innerHTML=streakChip();el.replaceWith(t.firstElementChild)}

/* ---------------- fuel: calories, protein, macros, meals ---------------- */
function mealBtn(m,qs){
  const q=qs.find(x=>x.id===m),d=E.day(),w=U.WIN[m],t=E.nowMin(),k=E.mealKcal(d,m),n=d.items.filter(i=>i.meal===m).length;
  const now=q.st==='todo'&&t>=w[0]-30&&t<=w[1]+90;
  const sub=q.st==='done'?fmt(k)+' kcal'+(d.stars&&d.stars[m]?' · '+'★'.repeat(d.stars[m]):''):q.st==='skip'?'Skipped':q.st==='late'?'Missed':n?fmt(k)+' so far':hhmm(w[0]);
  return `<button class="mb ${q.st}${now?' now':''}" data-a="node:${m}" aria-label="${esc(cap(m)+', '+sub)}"><span class="mbi">${q.st==='done'?IC.check:HS.emoji(m==='breakfast'?'Idli':m==='lunch'?'Plain rice':'Chapati')}</span><b>${cap(m)}</b><small>${esc(sub)}</small></button>`;
}
/* the protein backup: a powder or bar for the days the target will not be reached with food alone */
function gapHtml(){
  const g=E.proteinGap();if(!g||!g.late)return'';
  return `<div class="fgap"><span>Short by <b>${g.gap} g</b> of protein. One scoop of <b>${esc(g.food.name.replace(/\s*\(.*\)/,''))}</b> gives about ${Math.round(g.food.p)} g.</span><button data-a="backupAdd">Add it</button></div>`;
}
A.backupAdd=function(){
  const f=E.backupFood();if(!f)return;
  E.addFood(f.name,null,'snack');F.play('add',{cat:'protein',combo:0});F.vib(12);
  U.sys(f.name+' added: +'+Math.round(f.p)+' g protein.','good',true);U.render();
};
function fuelHtml(qs){
  const d=E.day(),T=E.T(),tot=E.totals(d),camp=E.campInfo(),left=T.kcal-tot.k,kp=Math.min(100,tot.k/T.kcal*100),pp=Math.min(100,tot.p/T.protein*100);
  return `<div class="card fuel rise" style="--i:2">
    <button class="fuelt" data-a="nutri" aria-label="Open today's nutrition">
      <div class="rings${U.pulse?' pulse':''}" role="img" aria-label="${fmt(tot.k)} of ${fmt(T.kcal)} kilocalories, ${Math.round(tot.p)} of ${T.protein} grams protein"><svg viewBox="0 0 100 100" aria-hidden="true">
        <circle class="trk" cx="50" cy="50" r="43"/><circle id="ringK" class="arc k${tot.k>T.hi?' over':''}" cx="50" cy="50" r="43" pathLength="100" style="stroke-dashoffset:${prev.rk!=null?prev.rk:100}"/>
        <circle class="trk" cx="50" cy="50" r="31"/><circle id="ringP" class="arc p${tot.p>=T.protein?' full':''}" cx="50" cy="50" r="31" pathLength="100" style="stroke-dashoffset:${prev.rp!=null?prev.rp:100}"/></svg>
        <div class="rc"><b id="leftNum">${fmt(Math.abs(left))}</b><span>${left>=0?'KCAL LEFT':'KCAL OVER'}</span></div></div>
      <div class="fl2"><div class="fk"><b>${fmt(tot.k)}</b><span>/ ${fmt(T.kcal)} kcal${camp?' <em class="campt">camp</em>':''}</span></div>
        <div class="fp"><b>${Math.round(tot.p)}</b><span>/ ${T.protein} g protein</span></div>
        <div class="fmac"><span><b>${Math.round(tot.c||0)}</b> g carbs</span><span><b>${Math.round(tot.f||0)}</b> g fat</span><span><b>${Math.round(tot.fi||0)}</b> g fibre</span></div></div>
      <i class="chev">${IC.chev}</i></button>
    ${gapHtml()}
    <div class="meals3">${U.MEALS.map(m=>mealBtn(m,qs)).join('')}</div>
    <button class="link snk" data-a="snack">Ate something else? Log a snack</button></div>`;
}

/* ---------------- today's tasks: one clean list ---------------- */
function trow(id,ic,title,sub,st,reward,c){
  const mark=st==='done'?IC.check:st==='miss'?IC.x:IC[ic];
  return `<button class="trow ${st}${U.justRow===id&&st==='done'?' just':''}" data-a="node:${id}" style="--c:${c}" aria-label="${esc(title+', '+sub)}"><span class="tic">${mark}</span><span class="tm"><b>${esc(title)}</b><small>${esc(sub)}</small></span>${reward&&st!=='done'?'<em class="tr">'+esc(reward)+'</em>':''}</button>`;
}
function tasksHtml(qs){
  const d=E.day(),plan=E.planFor(),g=qs.find(x=>x.id==='gym'),r=qs.find(x=>x.id==='rehab'),w=qs.find(x=>x.id==='weigh');
  const gSt=g.st==='todo'?'todo':g.st==='miss'?'miss':g.st==='skip'?'skip':'done';
  const rest=plan==='Rest'&&!d.sess;
  const gTitle=rest?'Cardio day':d.workout==='done'?plan+' done':'Train · '+plan;
  const gSub=rest&&!d.cardio?'Easy walk or a run':g.s;
  const rSub=r.st==='done'?r.s:(HS.REHAB_FOR[plan]||'Daily block').replace(/ and a walk/,'')+' · '+r.s.replace(/ · gentle.*/,'').replace(/ · about /,' · ');
  const n=[w.st==='done',gSt==='done',r.st==='done',!!d.waterHit].filter(Boolean).length;
  return `<div class="sect rise" style="--i:3"><h3>Today</h3><span id="tcount">${n} of 4</span></div>
    <div class="card tlist rise" style="--i:3" id="taskCard">${trow('weigh','scale','Check-in',w.s,w.st==='done'?'done':'todo',w.r,'#8b5cff')}${trow('gym',rest?'walk':'gym',gTitle,gSub,rest&&!d.cardio?'cardio':gSt,g.r,'#ff7a45')}${trow('rehab','rehab','Rehab',rSub,r.st==='done'?'done':'todo',r.r,'#3ddc97')}${waterTile()}</div>`;
}

/* ---------------- the quiet list at the bottom ---------------- */
function moreHtml(){
  const goals=E.goalsActive(),gd=goals.filter(g=>g.done).length,bn=E.bonusToday(),bd=bn.filter(b=>b.done).length,d=E.day(),ng=E.nextGates(),tr=E.trend();
  const daysLeft=7-E.di(),dl=Math.max(0,1440+(E.cfg().dayStart||0)*60-E.nowMin());
  const row=(a,ic,t,s,hi)=>`<button class="mrow${hi?' hi':''}" data-a="${a}"><span class="mri">${IC[ic]}</span><span class="mrm"><b>${esc(t)}</b><small>${esc(s)}</small></span><i class="chev">${IC.chev}</i></button>`;
  const ready=d.closed&&!d.chest;
  const clear=d.closed
    ?`<div class="clearbar done"><span class="tic">${IC.check}</span><span class="tm"><b>Day cleared</b><small>${d.score} of 6 pillars · ${d.delta>=0?'+':'−'}${Math.abs(d.delta)} aura</small></span></div>`
    :`<button class="clearbar${E.nowMin()>=1140?' hi':''}" data-a="node:close"><span class="tic">${IC.moon}</span><span class="tm"><b>Clear the day</b><small>closes in ${Math.floor(dl/60)}h ${String(dl%60).padStart(2,'0')}m</small></span><em class="tr">+80</em></button>`;
  return `<div id="moreCard" class="moreg rise" style="--i:5"><div class="card tlist">
    ${row('bonusSheet','bolt','Bonus quests',bd+' of 3')}
    ${row('goalsOpen','star','Weekly goals',gd+' of '+goals.length+' · '+daysLeft+' day'+(daysLeft===1?'':'s')+' left')}
    ${row('tab:path','path',ng.boss?'Boss gate · '+ng.boss.kg+' kg':'Every boss is down',ng.boss?ng.toBoss.toFixed(1)+' kg to go':'Goal reached')}
    ${ready?row('chest','star','Open today’s chest','Ready',true):''}
  </div>${clear}</div>`;
}
function refreshMore(){const el=$('#moreCard');if(!el)return;const t=document.createElement('div');t.innerHTML=moreHtml();el.replaceWith(t.firstElementChild);$('#moreCard').classList.remove('rise')}
A.goalsOpen=function(){F.play('nav');U.goalsSheet()};

/* ---------------- the home screen ---------------- */
U.views.home=function(){
  const S=E.S(),cfg=E.cfg(),L=E.lv(),fat=E.fatigued(),qs=U.quests(),mv=U.nextMove(),camp=E.campInfo(),bl=bubbleLine(),d=E.day(),T=E.T(),tot=E.totals(d);
  const title=(HS.ITEM_BY_ID[S.equip.title]||{}).name||'Rookie Hunter';
  const kp=Math.min(100,tot.k/T.kcal*100),pp=Math.min(100,tot.p/T.protein*100),sh=S.shield.n;
  let h=`<header class="hb rise${fat?' fat':''}" style="--i:0">
    <button class="hb-id" data-a="tab:armory" aria-label="Your hunter">
      <span class="rbadge" style="color:${RCOL[L.rank]}"><svg viewBox="0 0 58 64" aria-hidden="true"><polygon points="29,2 55,17 55,47 29,62 3,47 3,17" fill="rgba(6,12,26,.85)" stroke="currentColor" stroke-width="3"/></svg><b>${L.rank}</b></span>
      <span class="who"><b>${esc(cfg.name||'PLAYER')}</b><small>Level ${L.L}${L.locked?' · locked':''}${fat?' · <i class="fatl">fatigued</i>':''}</small></span></button>
    ${streakChip()}
    <button class="chip shc" data-a="streaks" aria-label="${sh} streak shield${sh===1?'':'s'}">${IC.shield}<b>${sh}</b></button>
    <button class="chip auc" data-a="tab:armory" aria-label="Aura ${fmt(S.aura)}">${IC.star}<b id="auraNum">${fmt(S.aura)}</b></button>
  </header>
  <div class="hb-xp rise" style="--i:0" aria-label="Aura ${fmt(L.have)} of ${fmt(L.need)} to level ${L.L+1}"><i id="xpFill" style="width:${prev.xp!=null?prev.xp:0}%"></i></div>
  <div class="hrow rise${fat?' fat':''}" style="--i:1">
    <button class="hero-av sm" data-a="poke" aria-label="Poke your hunter">${HS.avatar.svg(S.equip,{mood:E.mood()})}</button>
    <div class="bubble ${bl.tone}" id="bubble">${esc(bl.t)}</div>
  </div>
  <button class="move rise k-${mv.id}" style="--i:2" data-a="move" aria-label="Next move: ${esc(mv.title)}">
    <span class="mic">${IC[mv.ic]||IC.check}</span>
    <span class="mm"><em>${camp?'CAMP WEEK · ':''}NEXT MOVE</em><b>${esc(mv.title)}</b><small>${esc(mv.sub)}</small></span>
    <span class="mr">${mv.reward?'<b>'+esc(mv.reward)+'</b>':''}<i>${IC.chev}</i></span></button>
  ${fuelHtml(qs)}${tasksHtml(qs)}${moreHtml()}`;
  $('#screen').innerHTML=h;
  requestAnimationFrame(()=>{
    const ek=$('#ringK');
    if(!ek)return;   /* the screen changed before the frame */
    ek.style.strokeDashoffset=100-kp;$('#ringP').style.strokeDashoffset=100-pp;prev.rk=100-kp;prev.rp=100-pp;
    $('#xpFill').style.width=(L.pct*100)+'%';prev.xp=L.pct*100;
    const y=70-waterLevel()*54;const lev=$('#wlev');if(lev)lev.style.transform='translateY('+y+'px)';prev.wy=y;
  });
  cnt('auraNum',S.aura);
  U.justRow=null;U.pulse=false;
};
})();
