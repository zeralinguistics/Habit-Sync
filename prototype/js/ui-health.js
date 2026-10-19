/* ui-health.js: the Samsung Health sheet. Steps, distance, floors, calories burned (walking and workouts apart from resting energy),
   sleep with its stages, heart rate and weight, all read from Health Connect. Read-only: nothing is written back. */
(function(){
'use strict';
const HS=window.HS=window.HS||{};
const E=HS.E,F=HS.fx,U=HS.ui;
const esc=U.esc,fmt=U.fmt,IC=U.IC,$=U.$,A=U.act;

/* the step goal: the one you set, or your own median over the last two weeks (never below 6,000), or 8,000 to begin with */
E.stepGoal=function(){
  const g=E.cfg().stepGoal;if(g>0)return g;
  const v=[];for(let i=1;i<=14;i++){const d=E.S().days[E.keyOffset(-i)];const n=d&&(+d.hSteps||+d.steps);if(n>0)v.push(n)}
  if(v.length<5)return 8000;
  v.sort((a,b)=>a-b);return Math.max(6000,Math.round(v[Math.floor(v.length/2)]/500)*500);
};
const hm=m=>Math.floor(m/60)+' h '+String(Math.round(m%60)).padStart(2,'0')+' min';
function stepsWeek(){
  const out=[],goal=E.stepGoal();
  for(let i=6;i>=0;i--){const k=E.keyOffset(-i),d=E.S().days[k],n=d?(+d.hSteps||+d.steps||0):0,dow=new Date(k+'T12:00:00').getDay();out.push({n:n,d:'SMTWTFS'[dow],hit:n>=goal,today:i===0})}
  return out;
}
U.healthSheet=function(){
  U.sh={type:'health'};
  const S=E.S(),d=E.day(),H=HS.health,nat=H&&H.native(),on=S.health.on,goal=E.stepGoal(),steps=+d.hSteps||+d.steps||0;
  const en=E.energyDay(d),wk=stepsWeek(),mx=Math.max(goal,Math.max.apply(null,wk.map(x=>x.n)));
  const miss=on&&H?H.missing():[];
  const st=d.hSleepSt,sleepH=d.hSleep!=null?d.hSleep:d.sleep;
  const pct=Math.min(100,steps/goal*100);
  let b=`<div class="hhero"><div class="hring"><svg viewBox="0 0 100 100" aria-hidden="true"><circle class="trk" cx="50" cy="50" r="43"/><circle class="arc g" cx="50" cy="50" r="43" pathLength="100" style="stroke-dashoffset:${100-pct}"/></svg><div class="rc"><b>${fmt(steps)}</b><span>STEPS</span></div></div>
    <div class="hside"><div><b>${steps>=goal?'Goal reached':fmt(Math.max(0,goal-steps))+' to go'}</b><small>goal ${fmt(goal)}${E.cfg().stepGoal>0?'':' (your usual)'}</small></div>
      <div class="hmini"><span><b>${d.hDist!=null?d.hDist.toFixed(1):'—'}</b> km</span><span><b>${d.hFloors!=null?d.hFloors:'—'}</b> floors</span></div></div></div>
    <div class="wk7" role="img" aria-label="Steps, last seven days">${wk.map(x=>`<div class="${x.hit?'hit':''}${x.today?' today':''}"><i style="height:${Math.max(4,Math.round(x.n/mx*100))}%"></i><span>${x.d}</span></div>`).join('')}</div>`;
  if(en.act!=null){
    const tot=en.rest+en.act,pr=x=>(x/tot*100).toFixed(1);
    const walk=d.hWalk?d.hWalk.kcal:null;
    b+=`<div class="sec">Energy today<small class="sub">so far, from midnight${S.cfg.dayStart?'':''}</small></div>
      <div class="ebar" role="img" aria-label="Resting ${en.rest}, walking and daily movement ${en.walk}, workouts ${en.lift} kilocalories"><i class="e1" style="width:${pr(en.rest)}%"></i><i class="e2" style="width:${pr(Math.max(0,en.walk))}%"></i><i class="e3" style="width:${pr(en.lift)}%"></i></div>
      <div class="eleg"><span><b class="e1"></b>Resting <strong>${fmt(en.rest)}</strong></span><span><b class="e2"></b>Walking and daily movement <strong>${fmt(Math.max(0,en.walk))}</strong></span>${en.lift?`<span><b class="e3"></b>Workouts <strong>${fmt(en.lift)}</strong></span>`:''}</div>
      ${walk!=null?`<div class="fr2"><span>Recorded walks and runs</span><b>${d.hWalk.min} min · ${fmt(walk)} kcal</b></div>`:''}
      <div class="fr2"><span>Burned so far</span><b>${fmt(en.out)} kcal</b></div><div class="fr2"><span>Eaten so far</span><b>${fmt(en.eaten)} kcal</b></div>
      <div class="fr2"><span>Balance so far</span><b class="${en.net<=0?'gd':'wn'}">${en.net<=0?'−':'+'}${fmt(Math.abs(en.net))} kcal</b></div>
      <div class="note">Phones and watches estimate active calories from your steps and heart rate. Studies find they can be off by a third or more, in either direction, so treat the number as a guide. Your weight trend is the real judge. Your calorie target already counts training, so do not eat the active calories back.</div>`;
  }
  if(sleepH!=null){
    const tot=st?st.deep+st.rem+st.light+st.awake:0;
    b+=`<div class="sec">Sleep</div><div class="fr2"><span>Last night</span><b>${sleepH} h</b></div>`;
    if(st&&tot>0){
      const p=x=>(x/tot*100).toFixed(1);
      b+=`<div class="ebar"><i class="s1" style="width:${p(st.deep)}%"></i><i class="s2" style="width:${p(st.rem)}%"></i><i class="s3" style="width:${p(st.light)}%"></i><i class="s4" style="width:${p(st.awake)}%"></i></div>
        <div class="eleg"><span><b class="s1"></b>Deep <strong>${hm(st.deep)}</strong></span><span><b class="s2"></b>REM <strong>${hm(st.rem)}</strong></span><span><b class="s3"></b>Light <strong>${hm(st.light)}</strong></span><span><b class="s4"></b>Awake <strong>${hm(st.awake)}</strong></span></div>`;
    }
  }
  if(d.hRhr||d.hHr){
    b+=`<div class="sec">Heart</div>${d.hRhr?`<div class="fr2"><span>Resting heart rate</span><b>${d.hRhr} bpm</b></div>`:''}${d.hHr?`<div class="fr2"><span>Average today</span><b>${d.hHr.avg} bpm${d.hHr.max?' · peak '+d.hHr.max:''}</b></div>`:''}
      <div class="small">A resting rate that stays a few beats above your normal for several days is a sign to ease off and sleep more.</div>`;
  }
  if(d.hWeight)b+=`<div class="sec">Weight</div><div class="fr2"><span>Samsung Health has</span><b>${d.hWeight.toFixed(1)} kg</b></div>`;
  b+=`<div class="sec">Connection</div>`;
  if(nat){
    if(on)b+=`<div class="hrow"><div><b>Connected</b><small>${S.health.last?'Last sync '+new Date(S.health.last).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}):'Not synced yet'} · read-only</small></div><button class="btn ghost sm" data-a="hsync">Sync now</button></div>
      ${miss.length?`<div class="note amberb">New data is available (${miss.map(esc).join(', ')}). Tap Allow more data once so Android can ask.</div><div class="stack2"><button class="btn good" data-a="hconnect">Allow more data</button></div>`:''}`;
    else b+=`<div class="small" style="margin-top:0">Reads steps, distance, floors, active calories, heart rate, sleep and weight from Samsung Health through Health Connect. Read-only: nothing is written back and nothing leaves your phone.</div><div class="stack2"><button class="btn good" data-a="hconnect">Connect Samsung Health</button></div>`;
    b+=`<div class="small">If the permission window does not appear, open Samsung Health, then Settings, then Health Connect, and allow it there.</div>`;
  }else b+=`<div class="small" style="margin-top:0">Samsung Health sync works in the Android app. In the browser, type your steps below.</div>`;
  b+=`<div class="sec">Steps by hand</div><div class="field"><input id="stepsIn" type="number" inputmode="numeric" min="0" placeholder="e.g. 7400" value="${esc(d.steps||'')}" aria-label="Steps today"><button data-a="saveSteps">Save</button></div>`;
  U.openSheet('Samsung Health',b,'<button class="btn ghost" data-a="close">Close</button>',{full:true});
};
A.healthOpen=function(){F.play('nav');U.healthSheet()};
})();
