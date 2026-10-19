/* ui-streak.js: the daily streak. The sheet you open from the flame (calendar, today's pillars, your daily goal, shields, the next milestone)
   and the moments: the day lights up, a shield is used, the streak ends, a shield is earned. */
(function(){
'use strict';
const HS=window.HS=window.HS||{};
const E=HS.E,F=HS.fx,U=HS.ui;
const esc=U.esc,fmt=U.fmt,IC=U.IC,$=U.$,A=U.act;
const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
const FLAME_PATH='M0 0 C-10 -4 -12 -16 -4 -24 C-3 -18 0 -16 1 -20 C2 -28 -2 -32 2 -40 C10 -30 14 -14 8 -4 C6 -1 3 0 0 0 Z';
const flameSvg='<svg viewBox="-14 -44 28 46" aria-hidden="true"><path d="'+FLAME_PATH+'"/></svg>';
const cellIcon=st=>st==='lit'?flameSvg:st==='shield'?IC.shield:st==='safe'?IC.heart:'';

let monthOff=0;   /* 0 = this month, -1 = last month */
function monthGrid(){
  const today=E.dkey(),p=today.split('-').map(Number),first=new Date(Date.UTC(p[0],p[1]-1+monthOff,1)),y=first.getUTCFullYear(),m=first.getUTCMonth();
  const days=new Date(Date.UTC(y,m+1,0)).getUTCDate(),lead=(first.getUTCDay()+6)%7,start=E.S().start;
  let cells='';
  for(let i=0;i<lead;i++)cells+='<i class="mc blank"></i>';
  let lit=0,total=0;
  for(let d=1;d<=days;d++){
    const k=y+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
    let st=k>today?'future':k<start?'before':E.sparkDay(k);
    if(st==='lit')lit++;
    if(st!=='future'&&st!=='before')total++;
    cells+=`<div class="mc ${st}${k===today?' today':''}" title="${k}"><span>${d}</span>${cellIcon(st)?'<u>'+cellIcon(st)+'</u>':''}</div>`;
  }
  return{html:cells,title:MONTHS[m]+' '+y,lit:lit,total:total,canBack:E.keyOffset(0)>start&&(y*12+m)>(+start.slice(0,4)*12+ +start.slice(5,7)-1),canFwd:monthOff<0};
}
function nextMile(n){
  const step=HS.STREAK_STEPS.find(x=>x>n);
  return step?{step:step,left:step-n,aura:HS.STREAK_AURA[step],pct:Math.min(100,n/step*100)}:null;
}
U.streakSheet=function(){
  U.sh={type:'streak'};monthOff=0;renderStreak();
};
function renderStreak(){
  const si=E.sparkInfo(),n=si.n,goal=E.sparkGoal(),pil=E.pillarsFor(),met=pil.filter(p=>p.met).length,S=E.S(),sh=S.shield,mg=monthGrid(),nm=nextMile(n),best=Math.max(S.bestStreak||0,n);
  const used=Object.keys(sh.used).sort().slice(-3).map(k=>U.date(k));
  U.openSheet('Daily streak',
    `<div class="sk2"><div class="sk2f">${U.flame(n)}</div><div class="sk2n"><b>${n}</b><span>day streak</span></div><div class="sk2b"><span>BEST</span><b>${best}</b></div></div>
     <div class="hint" style="margin-top:6px">${met>=goal?'Today is lit. See you tomorrow.':'Light '+goal+' of 6 pillars today to keep it going. '+met+' so far.'}</div>
     <div class="sec">Today’s pillars</div>
     <div class="pils">${pil.map(p=>`<button class="pil${p.met?' on':''}" data-a="pil:${p.id}" aria-label="${esc(p.t+', '+(p.met?'done':p.s))}"><span class="pili">${p.met?IC.check:IC[p.ic]}</span><b>${p.t}</b><small>${esc(p.s)}</small></button>`).join('')}</div>
     <div class="sec">Your daily goal</div>
     <div class="seg2 full">${E.SPARK_GOALS.map(g=>`<button data-a="sgoal:${g}" aria-pressed="${goal===g}">${({3:'Easy',4:'Steady',5:'Hard'})[g]} · ${g}</button>`).join('')}</div>
     <div class="small">The day lights up when ${goal} of the 6 pillars are done. Start easy: a streak you keep beats one you break. You can change this any time.</div>
     <div class="sec">${mg.title}</div>
     <div class="mhead"><button class="mnav" data-a="smonth:-1" ${mg.canBack?'':'disabled'} aria-label="Previous month">${IC.chev.replace('<svg','<svg style="transform:scaleX(-1)"')}</button><span>${mg.lit} lit day${mg.lit===1?'':'s'} of ${mg.total}</span><button class="mnav" data-a="smonth:1" ${mg.canFwd?'':'disabled'} aria-label="Next month">${IC.chev}</button></div>
     <div class="mdow">${['M','T','W','T','F','S','S'].map(x=>'<i>'+x+'</i>').join('')}</div><div class="mgrid">${mg.html}</div>
     <div class="legend lg2"><span><b class="lgl"></b>Lit</span><span><b class="lgs"></b>Shield</span><span><b class="lgh"></b>Protected</span><span><b class="lgm"></b>Missed</span></div>
     <div class="sec">Streak shields</div>
     <div class="shieldrow"><span class="shi">${IC.shield}</span><div><b>${sh.n} shield${sh.n===1?'':'s'} held</b><small>${sh.n?'It saves the next day you miss, if your streak is 2 days or more.':'Earn one at every 7th day of a streak.'}${used.length?' Used on '+used.join(', ')+'.':''}</small></div></div>
     <div class="small">A pain day or your weekly rest pass never breaks the streak. Two shields is the most you can hold.</div>
     ${nm?`<div class="sec">Next milestone</div><div class="gl2"><div><b>${nm.step}-day streak</b><small>${nm.left} more day${nm.left===1?'':'s'} for +${fmt(nm.aura)} aura</small><div class="xp"><i style="width:${nm.pct}%"></i></div></div><span class="fl">${U.flame(nm.step)}</span></div>`:''}`,
    '<button class="btn" data-a="goalsOpen">Goals and rewards</button>',{full:true});
}
A.streaks=function(){F.play('nav');U.streakSheet()};
A.sgoal=function(v){E.cfg().sparkGoal=+v;E.save();F.play('pick');U.keepScroll(renderStreak)};
A.smonth=function(v){monthOff=Math.min(0,monthOff+ +v);F.play('tick',120);U.keepScroll(renderStreak)};
/* a pillar row opens the task behind it */
A.pil=function(v){
  const to={check:'weigh',fuel:U.mealNow()==='snack'?'dinner':U.mealNow(),protein:'protein',move:'gym',rehab:'rehab',water:'water'}[v];
  if(v==='water'){A.water();U.keepScroll(renderStreak);return}
  U.closeSheetQuiet();setTimeout(()=>U.act.node(to),160);
};

/* ---------------- the moments ---------------- */
function weekHtml(){
  return '<div class="skw">'+E.sparkWeek().map(x=>`<div class="skd ${x.st==='before'?'future':x.st}${x.today?' today':''}"><i>${cellIcon(x.st)}</i><b>${x.d}</b></div>`).join('')+'</div>';
}
E.on('spark',s=>{
  const hype=U.hype('spark',{n:s.n});
  U.cele({kind:'spark',ms:4200,sound:'streak',vib:[30,40,30,40,120],fx:()=>F.confetti(s.perfect?150:80),
    html:'<div class="rays"></div><div class="kicker">'+(s.perfect?'PERFECT DAY':'STREAK EXTENDED')+'</div><div class="sparkf">'+U.flame(Math.max(1,s.n))+'</div><div class="big">'+s.n+'</div><p class="dsl">DAY STREAK</p>'+weekHtml()+'<p>'+esc(hype)+'</p><p class="sub">+25 aura · '+s.met+' of 6 pillars lit</p>'});
  if(U.tab==='home'&&!U.sh)U.render();
});
E.on('shield',s=>{
  U.cele({kind:'shield',ms:4600,sound:'quest',vib:[40,40,80],
    html:'<div class="kicker">STREAK SHIELD USED</div><div class="shbig">'+IC.shield+'</div><div class="big">'+s.run+'</div><p class="dsl">DAY STREAK SAVED</p><p>'+esc(U.hype('shield',{n:s.run}))+'</p><p class="sub">'+U.date(s.k)+' was covered. '+E.S().shield.n+' shield'+(E.S().shield.n===1?'':'s')+' left.</p>'});
});
E.on('streakend',s=>{
  U.sys('Your '+s.run+'-day streak ended on '+U.date(s.k)+'. Today is day one of the next. Never miss twice.','bad');
});
E.on('shieldearn',s=>U.sys('New streak shield earned at '+s.days+' days. You hold '+s.n+'.','good'));
E.on('supp',()=>{});
})();
