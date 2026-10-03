/* engine-plus.js: the long game. Streaks, unlocks, short-term goals, the campaign plan to the goal weight, camp weeks,
   weekly report, rehab schedule, water and sleep, the daily chest, and the data vault (backup, restore, compaction). No DOM here. */
(function(){
'use strict';
const HS=window.HS=window.HS||{};
const E=HS.E,dkey=E.dkey;
const S=()=>E.S();
const addDays=E.addDays=function(k,n){const p=k.split('-').map(Number);const t=new Date(Date.UTC(p[0],p[1]-1,p[2])+n*864e5);return t.getUTCFullYear()+'-'+String(t.getUTCMonth()+1).padStart(2,'0')+'-'+String(t.getUTCDate()).padStart(2,'0')};
const keyOffset=n=>addDays(dkey(),n);
E.keyOffset=keyOffset;

/* ======================== streaks ======================== */
function dayPred(kind,d,k){
  const plan=E.planFor(k);
  switch(kind){
    case 'protein':return d&&d.pAward?1:0;
    case 'weigh':return d&&d.weighed?1:0;
    case 'log':return d&&Object.keys(d.done||{}).length>=2?1:0;
    case 'water':return d&&d.waterHit?1:0;
    case 'rehab':return d&&d.reh&&d.reh.done?1:0;
    case 'clear':return d&&d.closed&&d.score>=3?1:0;
    case 'workout':
      if(plan==='Rest')return -1;
      if(!d)return 0;
      if(d.workout==='done')return 1;
      if(d.workout==='pain'||d.workout==='pass')return -1;
      return 0;
  }
  return 0;
}
/* a pain day, a rest pass and a rest day never break a training streak. The clear streak forgives one gap: never miss twice. */
E.streakInfo=function(kind){
  const s=S();let n=0,gap=0,start=null;
  for(let i=0;i<500;i++){
    const k=keyOffset(-i);
    if(k<s.start&&i>0)break;
    const v=dayPred(kind,s.days[k],k);
    if(v===-1)continue;
    if(v===1){n++;gap=0;start=k;continue}
    if(i===0)continue;
    if(kind==='clear'){gap++;if(gap>=2)break;continue}
    break;
  }
  return{n:n,start:start};
};
E.streak=kind=>E.streakInfo(kind).n;

/* ======================== counters, unlocks, realms ======================== */
E.RANK_LV={E:1,D:8,C:16,B:26,A:41,S:61};
E.bossKgs=()=>E.ladder().filter(g=>g.boss).map(g=>g.kg);
E.bossCleared=function(){const b=E.bossKgs();return S().gates.filter(kg=>b.indexOf(kg)>=0).length};
E.counters=function(){
  const s=S(),c={workouts:0,rehab:0,logdays:0,water:0,protein:0,weigh:0};
  Object.keys(s.days).forEach(k=>{
    const d=s.days[k];
    if(d.workout==='done')c.workouts++;
    if(d.reh&&d.reh.done)c.rehab++;
    if(Object.keys(d.done||{}).length>=2)c.logdays++;
    if(d.waterHit)c.water++;
    if(d.pAward)c.protein++;
    if(d.weighed)c.weigh++;
  });
  c.gates=s.gates.length;c.boss=E.bossCleared();c.prs=s.counters.pr;c.comeback=s.counters.comeback;c.goals=s.counters.goals;
  c.streak=Math.max(s.bestStreak||0,E.streak('clear'));c.level=E.lv().L;
  return c;
};
E.reqMet=function(it,c){
  const r=it.req;
  if(r.t==='free')return true;
  if(r.t==='level')return c.level>=r.v;
  if(r.t==='rank')return c.level>=E.RANK_LV[r.v];
  return(c[r.t]||0)>=r.v;
};
const LABEL={level:v=>'Reach level '+v,rank:v=>'Reach rank '+v,boss:v=>'Clear boss gate '+v,gates:v=>'Clear '+v+' gates',workouts:v=>'Finish '+v+' workouts',streak:v=>'A '+v+'-day clear streak',prs:v=>v+' personal records',rehab:v=>v+' rehab days',comeback:()=>'Break fatigue by training',logdays:v=>v+' days logging 2+ meals',water:v=>v+' days at your water target',goals:v=>'Clear '+v+' short-term goals',protein:v=>v+' protein days',weigh:v=>v+' weigh-ins'};
E.reqProgress=function(it,c){
  c=c||E.counters();const r=it.req;
  if(r.t==='free')return{have:1,need:1,pct:1,text:'Yours'};
  let have,need;
  if(r.t==='rank'){have=c.level;need=E.RANK_LV[r.v]}
  else{have=c[r.t]||0;need=r.v}
  return{have:Math.min(have,need),need:need,pct:Math.min(1,have/need),text:LABEL[r.t]?LABEL[r.t](r.v):''};
};
E.ensureOwned=function(){const s=S();HS.ITEMS.forEach(it=>{if(it.req.t==='free'&&!s.owned[it.id])s.owned[it.id]=s.start})};
E.owned=id=>!!S().owned[id];
E.nextUnlock=function(){
  const c=E.counters();let best=null;
  HS.ITEMS.forEach(it=>{if(S().owned[it.id])return;const p=E.reqProgress(it,c);if(!best||p.pct>best.p.pct)best={it:it,p:p}});
  return best;
};
E.realmsOpen=()=>Math.min(HS.REALMS.length,1+E.bossCleared());
E.realm=function(){const id=S().realm;return HS.REALMS.find(r=>r.id===id)||HS.REALMS[0]};
let checking=false;
E.checkUnlocks=function(){
  if(checking)return;checking=true;
  try{
    const s=S();E.ensureOwned();
    const c=E.counters(),fresh=[];
    if(c.streak>(s.bestStreak||0))s.bestStreak=c.streak;
    HS.ITEMS.forEach(it=>{if(!s.owned[it.id]&&E.reqMet(it,c)){s.owned[it.id]=dkey();s.equip[it.slot]=it.id;fresh.push(it)}});
    const open=E.realmsOpen();let realm=null;
    if(open>s.realmSeen){s.realmSeen=open;s.realm=HS.REALMS[open-1].id;realm=HS.REALMS[open-1]}
    if(fresh.length||realm){E.persist();fresh.forEach(it=>E.emit('unlock',it));if(realm)E.emit('realm',realm)}
  }finally{checking=false}
};

/* ======================== short-term goals ======================== */
const hash=str=>{let h=2166136261;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0};
function weekKeys(){const wk=E.weekKey(),out=[];for(let i=0;i<7;i++){const k=addDays(wk,i);if(k>dkey())break;out.push(k)}return out}
E.goalHave=function(g){
  const s=S(),ks=weekKeys(),ds=ks.map(k=>s.days[k]).filter(Boolean);
  const n=f=>ds.filter(f).length;
  switch(g.id){
    case 'g_gate':return Object.keys(s.gateDates).filter(kg=>ks.indexOf(s.gateDates[kg])>=0).length;
    case 'g_protein':return n(d=>d.pAward);
    case 'g_weigh':return n(d=>d.weighed);
    case 'g_train':return n(d=>d.workout==='done');
    case 'g_water':return n(d=>d.waterHit);
    case 'g_rehab':return n(d=>d.reh&&d.reh.done);
    case 'g_cal':return n(d=>d.closed&&d.calOk);
    case 'g_sleep':return n(d=>d.sleep>=7);
    case 'g_log':return n(d=>Object.keys(d.done||{}).length>=3);
    case 'g_pr':return s.prWeeks[E.weekKey()]||0;
    case 'g_steps':return n(d=>d.steps);
    case 'g_clear':return n(d=>d.closed&&d.score>=3);
  }
  return 0;
};
E.goalsActive=function(){
  const wk=E.weekKey(),s=S();
  const always=HS.GOALS.filter(g=>g.always),arr=HS.GOALS.filter(g=>!g.always);
  let h=hash(wk);
  for(let i=arr.length-1;i>0;i--){h=(Math.imul(h,1664525)+1013904223)>>>0;const j=h%(i+1);const t=arr[i];arr[i]=arr[j];arr[j]=t}
  return always.concat(arr.slice(0,4)).map(g=>{
    const have=Math.min(g.need,E.goalHave(g));
    return Object.assign({},g,{have:have,done:have>=g.need,claimed:!!s.claimed[g.id+'@'+wk]});
  });
};
E.checkGoals=function(){
  const s=S(),wk=E.weekKey();let any=false;
  E.goalsActive().forEach(g=>{
    if(g.done&&!g.claimed){s.claimed[g.id+'@'+wk]=1;s.counters.goals++;any=true;E.addAura(g.aura);E.emit('goal',g)}
  });
  ['protein','weigh','log','water','rehab','workout','clear'].forEach(kind=>{
    const si=E.streakInfo(kind);
    HS.STREAK_STEPS.forEach(step=>{
      if(si.n>=step){
        const key='s:'+kind+':'+step+':'+si.start;
        if(!s.claimed[key]){s.claimed[key]=1;s.counters.goals++;any=true;const a=HS.STREAK_AURA[step];E.addAura(a);E.emit('streak',{kind:kind,step:step,aura:a})}
      }
    });
  });
  if(any)E.persist();
};
/* the next streak step to chase, for the "short-term" strip */
E.streakTargets=function(){
  const out=[];
  Object.keys(HS.STREAK_NAMES).forEach(kind=>{
    const n=E.streak(kind),step=HS.STREAK_STEPS.find(x=>x>n);
    if(step)out.push({kind:kind,name:HS.STREAK_NAMES[kind],have:n,need:step,aura:HS.STREAK_AURA[step]});
  });
  return out;
};
let afterT=null;
E.afterSave=function(){clearTimeout(afterT);afterT=setTimeout(()=>{E.checkUnlocks();E.checkGoals()},0)};

/* ======================== numbers: maintenance, targets, plan ======================== */
E.maint=function(kg){const c=S().cfg;return Math.round((10*kg+6.25*c.height-5*c.age+5)*1.45/10)*10};
E.kcalFor=kg=>Math.round((E.maint(kg)-S().cfg.deficit)/10)*10;
E.campInfo=function(){
  const s=S();if(!s.camp)return null;
  const left=E.daysBetween(dkey(),s.camp.until);
  if(left<0)return null;
  return{left:left+1,kcal:s.camp.kcal};
};
/* called from logWeight for every gate crossed */
E.onGate=function(g){
  const s=S();
  if(!g.boss)return;
  const n=E.bossKgs().indexOf(g.kg)+1,last=g.kg===s.cfg.goalW;
  if(s.cfg.autoKcal&&!last){const to=E.kcalFor(g.kg);if(to&&to!==s.cfg.kcal){const from=s.cfg.kcal;s.cfg.kcal=to;E.emit('kcal',{from:from,to:to})}}
  if(s.cfg.camp!==false&&!last){s.camp={from:dkey(),until:addDays(dkey(),6),kcal:E.maint(E.trend())};E.emit('camp',s.camp)}
  E.emit('boss',{kg:g.kg,n:n,last:last});
};
/* The whole campaign: one row per gate with its week and date, realm summaries, camp weeks after each boss, and a finish date. */
E.plan=function(){
  const s=S(),c=s.cfg,lad=E.ladder(),per=(c.gateStep||.5)/.5,campOn=c.camp!==false;
  const gates=[],realms=[];let wk=0,rFrom=s.startW,rW0=1,rN=0,camps=0;
  lad.forEach((g,i)=>{
    wk+=per;rN++;
    const rec={kg:g.kg,boss:g.boss,week:wk,date:addDays(s.start,Math.round(wk*7)),kcal:E.kcalFor(g.kg)};
    gates.push(rec);
    if(g.boss){
      realms.push({n:realms.length+1,from:rFrom,to:g.kg,w0:rW0,w1:wk,gates:rN,kcal0:E.kcalFor(rFrom),kcal1:E.kcalFor(g.kg),name:(HS.REALMS[realms.length]||{}).name});
      const last=i===lad.length-1;
      if(campOn&&!last){wk+=1;camps++;rec.camp=wk}
      rFrom=g.kg;rW0=wk+1;rN=0;
    }
  });
  if(rN>0)realms.push({n:realms.length+1,from:rFrom,to:c.goalW,w0:rW0,w1:wk,gates:rN,kcal0:E.kcalFor(rFrom),kcal1:E.kcalFor(c.goalW),name:(HS.REALMS[realms.length]||{}).name});
  return{gates:gates,realms:realms,weeks:wk,camps:camps,finish:addDays(s.start,Math.round(wk*7)),startW:s.startW,goalW:c.goalW};
};
E.trendAt=function(k){const s=S();let t=s.startW;Object.keys(s.weights).sort().forEach(d=>{if(d<=k)t=t+.25*(s.weights[d]-t)});return Math.round(t*100)/100};
/* where the plan says your trend should be today, and how far ahead or behind you are (positive = ahead of plan) */
E.expected=function(){
  const s=S(),p=E.plan(),w=Math.max(0,E.daysBetween(s.start,dkey()))/7;
  const nodes=[{w:0,kg:s.startW}];
  p.gates.forEach(g=>{nodes.push({w:g.week,kg:g.kg});if(g.camp)nodes.push({w:g.camp,kg:g.kg})});
  let exp=s.cfg.goalW;
  for(let i=1;i<nodes.length;i++){
    if(w<=nodes[i].w){const a=nodes[i-1],b=nodes[i],f=b.w===a.w?1:(w-a.w)/(b.w-a.w);exp=a.kg+(b.kg-a.kg)*f;break}
  }
  exp=Math.round(exp*10)/10;
  return{expected:exp,ahead:Math.round((exp-E.trend())*10)/10};
};
/* pace-based finish: your recent real rate instead of the plan's 0.5 kg a week */
E.eta=function(){
  const s=S(),tr=E.trend(),left=Math.max(0,tr-s.cfg.goalW);
  const ins=Object.keys(s.weights).length;
  let rate=.5,real=false;
  if(ins>=6&&E.daysBetween(s.start,dkey())>=21){
    const r=(E.trendAt(keyOffset(-28))-tr)/4;
    if(isFinite(r)){rate=Math.max(.2,Math.min(.9,r));real=true}
  }
  const bossLeft=E.bossKgs().filter(kg=>kg<tr&&kg>s.cfg.goalW).length,campWeeks=s.cfg.camp!==false?bossLeft:0;
  const weeks=left/rate+campWeeks;
  return{rate:rate,real:real,weeks:weeks,date:addDays(dkey(),Math.round(weeks*7))};
};

/* ======================== weekly report ======================== */
E.report=function(){
  const s=S(),T=E.T(),ks=[];for(let i=6;i>=0;i--)ks.push(keyOffset(-i));
  const ds=ks.map(k=>s.days[k]).filter(Boolean),closed=ds.filter(d=>d.closed);
  const r={closed:closed.length,cal:closed.filter(d=>d.calOk).length,protein:ds.filter(d=>d.pAward).length,workouts:ds.filter(d=>d.workout==='done').length,skipped:ds.filter(d=>d.workout==='lazy').length,
    rehab:ds.filter(d=>d.reh&&d.reh.done).length,water:ds.filter(d=>d.waterHit).length,weighIns:ds.filter(d=>d.weighed).length,
    sleepAvg:null,kcalAvg:null,rate:null,trend:E.trend(),advice:{tone:'info',title:'Keep logging',text:'The System needs a few more days of data to give you a real read.'}};
  const sl=ds.filter(d=>d.sleep!=null);if(sl.length)r.sleepAvg=Math.round(sl.reduce((a,d)=>a+d.sleep,0)/sl.length*10)/10;
  const eaten=ds.filter(d=>E.totals(d).k>500);if(eaten.length)r.kcalAvg=Math.round(eaten.reduce((a,d)=>a+E.totals(d).k,0)/eaten.length);
  const ins14=Object.keys(s.weights).filter(k=>k>=keyOffset(-14)).length;
  if(ins14>=4){
    r.rate=Math.round((E.trendAt(keyOffset(-7))-r.trend)*100)/100;
    const adherent=closed.length>=3&&r.cal/closed.length>=.7;
    if(r.rate>.9)r.advice={tone:'warn',title:'Dropping fast',text:'Your trend fell '+r.rate.toFixed(1)+' kg this week. Faster than about 0.9 kg is hard on muscle and joints. Add 100 kcal a day and keep your protein.'};
    else if(r.rate<.15&&adherent)r.advice={tone:'warn',title:'Plateau, with good adherence',text:'Trend is flat but you hit your window most days. Check weekend portions and drinks first. If it stays flat another week, trim 100 kcal a day or add a walk.'};
    else if(r.rate<.15)r.advice={tone:'info',title:'Adherence first',text:'Trend is flat and the calorie window was missed on several days. Land the window on 5 of 7 days before changing the plan.'};
    else r.advice={tone:'good',title:'On pace',text:'Trend down '+r.rate.toFixed(2)+' kg this week. This is the pace the plan wants. Do not change anything.'};
  }else{
    r.advice={tone:'info',title:'Weigh in more',text:'Only '+ins14+' weigh-ins in 14 days. The trend needs at least 4 to say anything.'};
  }
  return r;
};

/* ======================== rehab schedule ======================== */
/* The external physio's list, spread over the training cycle. Push gets Day 1, Pull gets Day 2 plus pain-free aerobic, Legs is Day 3 itself,
   rest days get the block, aerobic and optional extras. The pain traffic light holds the strength work back when the knee or back is amber or red. */
E.lastLight=function(){
  const s=S();
  for(let i=0;i<2;i++){const d=s.days[keyOffset(-i)];if(d&&d.reh&&(d.reh.done||d.reh.knee||d.reh.back||d.reh.sharp))return E.light(d.reh)}
  return null;
};
E.rehabToday=function(k,noHold){
  k=k||dkey();
  const plan=E.planFor(k),dow=(new Date(k+'T12:00:00').getDay()+6)%7;
  const o={plan:plan,block:[0,1,2,3],knee:[0,1,3,4,5].indexOf(dow)>=0,finisher:null,only:null,aerobic:false,bonus:null,hold:null};
  if(plan==='Push')o.finisher=0;
  else if(plan==='Pull'){o.finisher=1;o.aerobic=true}
  else if(plan==='Legs'){o.finisher=2;o.only=[6]}   /* the other Day 3 moves are your leg workout */
  else{o.finisher=0;o.aerobic=true;o.bonus=1}
  const lt=noHold?null:E.lastLight();
  if(lt==='amber'){o.hold='amber';o.finisher=null;o.only=null;o.bonus=null}
  if(lt==='red'){o.hold='red';o.finisher=null;o.only=null;o.bonus=null;o.aerobic=false}
  return o;
};
/* the finisher list as [index, entry] pairs, skipping anything you opted out of (the Jefferson curl) */
E.finisherItems=function(t){
  if(t.finisher==null)return[];
  const out=[];HS.RDAYS[t.finisher].x.forEach((e,i)=>{if(e[3])return;if(t.only&&t.only.indexOf(i)<0)return;out.push([i,e])});
  return out;
};
/* every key that counts towards today's rehab */
E.rehabKeys=function(k,noHold){
  const t=E.rehabToday(k,noHold),keys=[];
  t.block.forEach(i=>keys.push('b'+i));
  if(t.knee)keys.push('b4');
  E.finisherItems(t).forEach(x=>keys.push('d'+t.finisher+'_'+x[0]));
  if(t.aerobic)keys.push('aero');
  return keys;
};
/* today's rehab as ordered groups, ready for the checklist and the guided session */
E.rehabGroups=function(k){
  const t=E.rehabToday(k),g=[];
  const mk=(key,e)=>({key:key,name:e[0],rx:e[1],fig:e[2]||null});
  const blk=t.block.map(i=>mk('b'+i,HS.BLOCK[i]));if(t.knee)blk.push(mk('b4',HS.BLOCK[4]));
  g.push({id:'block',title:'Daily block',sub:'Every day \u00B7 about '+Math.round(blk.length*1.5)+' min',items:blk});
  const fin=E.finisherItems(t);
  if(fin.length)g.push({id:'fin',title:HS.RDAYS[t.finisher].t,sub:t.only?'The rest of Day 3 is your leg workout':'Strength and control',items:fin.map(x=>mk('d'+t.finisher+'_'+x[0],x[1]))});
  if(t.aerobic)g.push({id:'aero',title:'Pain-free aerobic',sub:'30 minutes \u00B7 3 to 4 days a week',items:[{key:'aero',name:'30 minutes of easy cardio',rx:'Stay pain-free. Your incline walk counts.',fig:'walk'}]});
  if(t.bonus!=null)g.push({id:'bonus',title:'Bonus \u00B7 '+HS.RDAYS[t.bonus].t,sub:'Optional extra healing on a rest day',bonus:true,items:HS.RDAYS[t.bonus].x.map((e,i)=>e[3]?null:mk('x'+t.bonus+'_'+i,e)).filter(Boolean)});
  return{t:t,groups:g};
};
/* what each day of the week asks for, for the roadmap */
E.rehabWeek=function(){
  const names=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],out=[];
  for(let i=0;i<7;i++){
    const k=addDays(E.weekKey(),i),t=E.rehabToday(k,true);
    const fin=t.finisher!=null?(t.only?'balance':'Day '+(t.finisher+1)):'';
    out.push({d:names[i],k:k,plan:E.planFor(k),fin:fin,aero:t.aerobic,bonus:t.bonus!=null,n:E.rehabKeys(k,true).length});
  }
  return out;
};
E.rehabProgress=function(){
  const d=E.day(),r=d.reh,keys=E.rehabKeys(),done=r?keys.filter(x=>r.items[x]).length:0;
  return{done:done,total:keys.length,ok:keys.length>0&&done>=Math.ceil(keys.length*.8)};
};

/* ======================== water, sleep ======================== */
E.addWater=function(ml){
  const d=E.day(),c=S().cfg;
  d.water=Math.max(0,(d.water||0)+ml);
  let hit=false;
  if(!d.waterHit&&d.water>=c.water){d.waterHit=true;hit=true;E.addAura(30);E.stat('VIT',1)}
  E.save();E.emit('water',{ml:ml,total:d.water,hit:hit});
  return hit;
};
E.logSleep=function(h){
  const d=E.day();d.sleep=h;
  if(!d.sleepAward){d.sleepAward=true;const a=h>=7?15:h>=6?8:0;if(a)E.addAura(a);E.stat('SNS',1)}
  E.save();E.emit('sleep',{h:h});
};

/* ======================== the daily chest: a small surprise after you clear the day ======================== */
E.rng=Math.random;
E.openChest=function(score){
  const d=E.day();if(d.chest)return d.chest;
  const tier=score>=4?'epic':score>=3?'rare':'common',r=E.rng();let aura,crit=false;
  if(tier==='common')aura=15+Math.floor(r*16);
  else if(tier==='rare'){aura=30+Math.floor(r*41);if(E.rng()<.1){aura*=2;crit=true}}
  else{aura=60+Math.floor(r*61);if(E.rng()<.1){aura=200;crit=true}}
  d.chest={tier:tier,aura:aura,crit:crit};
  E.addAura(aura);E.persist();E.emit('chest',d.chest);
  return d.chest;
};

/* ======================== logging helpers: usuals, repeat, plate stars ======================== */
/* the most recent earlier day where this meal was logged, to repeat in one tap */
E.lastMeal=function(meal){
  const s=S(),today=dkey(),ks=Object.keys(s.days).filter(k=>k<today).sort().reverse();
  for(let i=0;i<ks.length;i++){
    const d=s.days[ks[i]];if(d.compact)continue;
    const its=d.items.filter(x=>x.meal===meal&&E.food(x.name));
    if(its.length)return{k:ks[i],items:its.map(x=>({name:x.name,g:x.g})),kcal:Math.round(its.reduce((a,x)=>a+E.nut(E.food(x.name),x.g).k,0))};
  }
  return null;
};
/* what you actually eat at this meal, with your typical portion */
E.usuals=function(meal){
  const s=S(),today=dkey(),from=keyOffset(-28),cnt={};
  Object.keys(s.days).forEach(k=>{
    if(k>=today||k<from)return;const d=s.days[k];if(d.compact)return;
    d.items.forEach(i=>{if(i.meal!==meal||!E.food(i.name))return;const c=cnt[i.name]||(cnt[i.name]={n:0,gs:[]});c.n++;c.gs.push(i.g)});
  });
  return Object.keys(cnt).sort((a,b)=>cnt[b].n-cnt[a].n).slice(0,6).map(n=>{const gs=cnt[n].gs.sort((a,b)=>a-b);return{name:n,g:gs[Math.floor(gs.length/2)],n:cnt[n].n}});
};
/* three stars for a plate: logged, enough protein, balanced (a veg side, no sugar, not a blowout) */
E.rateMeal=function(meal){
  const d=E.day(),T=E.T();let k=0,p=0,side=false,sugar=false;
  d.items.forEach(i=>{if(i.meal!==meal)return;const f=E.food(i.name);if(!f)return;const n=E.nut(f,i.g);k+=n.k;p+=n.p;if(f.cat==='side')side=true;if(f.sugar)sugar=true});
  const notes=[];let stars=1;
  if(p>=25)stars++;else notes.push('Aim for about 25 g of protein in a meal.');
  if(side&&!sugar&&k<=T.kcal*.5)stars++;else notes.push(!side?'Add a veg side for the third star.':sugar?'Sugar keeps this plate at two stars.':'Big plate. Trim a portion next time.');
  return{stars:stars,k:Math.round(k),p:Math.round(p),notes:notes};
};
/* mark a meal done; the star aura is paid once per meal per day */
E.finishMeal=function(meal){
  const d=E.day();d.done[meal]=true;delete d.skip[meal];
  const r=E.rateMeal(meal);d.stars=d.stars||{};
  const first=d.stars[meal]==null;
  if(first){d.stars[meal]=r.stars;E.addAura(r.stars*4);E.stat('VIT',1)}
  E.save();E.emit('meal',{meal:meal,rating:r,first:first});
  return Object.assign({first:first},r);
};

/* ======================== the day: status, clearing, and what the System has to say ======================== */
E.dayStatus=function(){
  const d=E.day(),plan=E.planFor(),T=E.T(),tot=E.totals(d);
  const calOk=tot.k>=T.lo&&tot.k<=T.hi,gymOk=plan==='Rest'||d.workout==='done'||d.workout==='pain'||d.workout==='pass',rehOk=!!(d.reh&&d.reh.done);
  return{plan:plan,T:T,tot:tot,calOk:calOk,gymOk:gymOk,rehOk:rehOk,protOk:!!d.pAward,score:(d.pAward?1:0)+(calOk?1:0)+(gymOk?1:0)+(rehOk?1:0)};
};
E.closeDay=function(){
  const d=E.day();if(d.closed)return null;
  const st=E.dayStatus();
  d.closed=true;d.calOk=st.calOk;d.score=st.score;
  if(st.calOk){E.addAura(80);E.stat('VIT',2)}
  E.save();E.emit('clear',st);
  return st;
};
/* which roast applies right now, if any. Roasts only ever target a skipped habit, never the body. */
E.situation=function(){
  const d=E.day(),h=new Date().getHours(),cfg=S().cfg,tot=E.totals(d);
  if(E.fatigued())return'fatigue';
  if(d.workout==='lazy')return'skip';
  if(d.sugarPen>0)return'sugar';
  const did=Object.keys(d.done||{}).length+(d.workout==='done'?1:0)+(d.weighed?1:0);
  if(h>=21&&!d.closed)return'late';
  if(h>=14&&did===0&&tot.k===0)return'idle';
  if(h>=11&&!d.weighed)return'weigh';
  if(h>=15&&(d.water||0)<cfg.water*.35)return'water';
  if(h>=15&&!d.done.breakfast&&!d.skip.breakfast&&!d.items.some(i=>i.meal==='breakfast'))return'mealSkip';
  return null;
};
/* ml you should have drunk by now if you spread the target from 8:00 to 22:00 */
E.waterPace=function(){const c=S().cfg,f=Math.max(0,Math.min(1,(E.nowMin()-480)/(22*60-480)));return Math.round(c.water*f/50)*50};
E.equip=function(id){
  const it=HS.ITEM_BY_ID[id];if(!it||!S().owned[id])return false;
  S().equip[it.slot]=id;E.persist();E.emit('equip',it);return true;
};
E.setRealm=function(id){
  const i=HS.REALMS.findIndex(r=>r.id===id);if(i<0||i+1>E.realmsOpen())return false;
  S().realm=id;E.persist();E.emit('realmpick',HS.REALMS[i]);return true;
};
E.reviewDue=function(){return S().reviewSeen!==E.weekKey()&&E.daysBetween(S().start,dkey())>=6};
E.reviewSeen=function(){S().reviewSeen=E.weekKey();E.persist()};
/* the gate you are working on now, and the distance to the next boss */
E.nextGates=function(){
  const s=S(),lad=E.ladder(),tr=E.trend();
  const next=lad.find(g=>s.gates.indexOf(g.kg)<0),boss=lad.find(g=>g.boss&&s.gates.indexOf(g.kg)<0);
  return{next:next||null,boss:boss||null,toNext:next?Math.max(0,Math.round((tr-next.kg)*100)/100):0,toBoss:boss?Math.max(0,Math.round((tr-boss.kg)*100)/100):0};
};
/* weeks since the start and where the plan says that falls */
E.weekNo=function(){return Math.floor(Math.max(0,E.daysBetween(S().start,dkey()))/7)+1};

/* ======================== avatar mood ======================== */
E.mood=function(){
  if(E.fatigued())return'tired';
  const d=E.day();
  if(d.closed&&d.score>=3)return'proud';
  if(E.streak('clear')>=3)return'pumped';
  return'idle';
};

/* ======================== data vault: backup, restore, compaction ======================== */
E.backupText=function(){
  const s=S();s.lastBackup=Date.now();E.persist();
  return JSON.stringify({app:'habit-sync',version:s.v,exported:new Date().toISOString(),state:s});
};
E.importText=function(txt){
  let obj;
  try{obj=JSON.parse(txt)}catch(e){throw new Error('That is not a Habit Sync backup (could not read it).')}
  const st=obj&&obj.app==='habit-sync'?obj.state:(obj&&obj.days&&obj.cfg?obj:null);
  if(!st||!st.days||!st.cfg)throw new Error('That file is not a Habit Sync backup.');
  E._set(E.migrate(st));E.ensureOwned();E.persist();E.emit('reset');
  return Object.keys(S().days).length;
};
E.restoreAuto=function(){
  const t=localStorage.getItem(E.KEY+'.bak');if(!t)throw new Error('No automatic backup yet. One is made on the first save of each day.');
  E._set(E.migrate(JSON.parse(t)));E.ensureOwned();E.persist();E.emit('reset');
  return Object.keys(S().days).length;
};
E.dataInfo=function(){
  const s=S();let bytes=0;
  try{bytes=new Blob([localStorage.getItem(E.KEY)||'']).size}catch(e){}
  return{bytes:bytes,days:Object.keys(s.days).length,since:s.start,lastBackup:s.lastBackup,backupAgeDays:s.lastBackup?Math.floor((Date.now()-s.lastBackup)/864e5):null};
};
/* Old days keep their totals and flags but drop the line-by-line detail, so the app can run for years inside browser storage limits. */
E.compact=function(){
  const s=S(),cutoff=keyOffset(-120);let n=0;
  Object.keys(s.days).forEach(k=>{
    const d=s.days[k];
    if(k<cutoff&&!d.compact){d.sum=E.totals(d);d.compact=true;d.items=[];d.lift={};n++}
  });
  if(n)E.persist();
  return n;
};
E.ensureOwned();
})();
