/* engine.js: state, nutrition math, aura/level/stats, fatigue and penalties, workouts. No DOM access here; the UI listens to events. */
(function(){
'use strict';
const HS=window.HS=window.HS||{};
const E=HS.E={};

/* ---- tiny event bus: the UI and sound layer subscribe, the engine only emits ---- */
const bus={};
E.on=(n,f)=>{(bus[n]=bus[n]||[]).push(f)};
E.emit=(n,d)=>{(bus[n]||[]).forEach(f=>{try{f(d)}catch(e){console.error(e)}})};

/* ---- state ---- */
const KEY='habitsync.proto.v4';   /* same key as before, so existing data keeps working; the schema version lives inside */
const SCHEMA=5;
/* The day does not end at midnight: it ends at cfg.dayStart (3 am by default), so clearing the day at 1 am still belongs to yesterday. */
let SHIFT=3;   /* the default day end, so even the very first blank() (before settings load) dates the day correctly after midnight */
E.setShift=h=>{SHIFT=Math.max(0,Math.min(6,+h||0))};
E.now=()=>SHIFT?new Date(Date.now()-SHIFT*36e5):new Date();
const dkey=E.dkey=(d)=>{d=d||E.now();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const CFG0={name:'PLAYER',kcal:2050,protein:140,goalW:70,gateStep:.5,bossEvery:4,stepGoal:0,strict:'standard',theme:'auto',volume:.8,haptics:true,sound:true,contract:'',partner:'',
  height:166,age:21,deficit:530,water:3000,roast:'playful',camp:true,autoKcal:true,dayStart:3};
const clone=o=>JSON.parse(JSON.stringify(o));
const blank=()=>({v:SCHEMA,cfg:Object.assign({},CFG0),aura:0,stats:{STR:0,VIT:0,AGI:0,SNS:0},startW:84,start:dkey(),weights:{},gates:[],gateDates:{},cycle:{a:dkey(),i:0},cycles:[{a:dkey(),i:0}],passUsed:{},days:{},custom:{},
  rehab:{confirmed:false,next:0},routine:clone(HS.ROUTINE_DEFAULT),last:{},pr:{},fatigue:null,pass:{wk:'',used:false},missStreak:0,swept:{},
  equip:Object.assign({},HS.EQUIP_DEFAULT),owned:{},realm:'r1',realmSeen:1,claimed:{},counters:{pr:0,comeback:0,goals:0,bonus:0},prWeeks:{},camp:null,bestStreak:0,
  lastBackup:0,lastAutoBak:'',reviewSeen:'',welcomed:false,newItems:[],health:{on:false,last:0},remind:{on:false}});
/* bring any saved state up to the current schema without losing anything */
const DAY0=()=>({items:[],done:{},skip:{},workout:null,pain:null,burn:0,mins:null,runFree:null,reh:null,lift:{},weighed:false,pAward:false,closed:false,calOk:false,delta:0,sugarPen:0,score:0,steps:'',stepsAward:false,water:0,waterHit:false,sleep:null,chest:null});
const kindOf=v=>v===null?'null':Array.isArray(v)?'array':typeof v;
function migrate(p){
  const d=blank(),st=Object.assign({},d,(p&&typeof p==='object')?p:{});
  /* a saved field that is missing, null or the wrong kind of thing falls back to its default, so an old or damaged save cannot crash a screen */
  Object.keys(d).forEach(k=>{if(d[k]!==null&&kindOf(st[k])!==kindOf(d[k]))st[k]=d[k]});
  st.cfg=Object.assign({},CFG0,st.cfg);
  if(!p||(p.v||4)<5){
    if(st.cfg.goalW===75)st.cfg.goalW=70;   /* the goal is 70 kg */
    if(st.cfg.theme==='shadow')st.cfg.theme='auto';   /* follow the realm */
    st.v=SCHEMA;
  }
  ['equip','stats','counters','health','remind','rehab','pass','cycle'].forEach(k=>{st[k]=Object.assign({},d[k],st[k])});
  st.equip=Object.assign({},HS.EQUIP_DEFAULT,st.equip);
  /* the training cycle keeps every anchor, so correcting today's session never rewrites past days.
     Judge the SAVED list: the default filled in above must never hide an older save's single anchor. */
  const okCycle=c=>!!c&&typeof c==='object'&&typeof c.a==='string'&&typeof c.i==='number';
  if(!okCycle(st.cycle))st.cycle=Object.assign({},d.cycle);
  const pc=p&&typeof p==='object'?p.cycles:null;
  st.cycles=(Array.isArray(pc)&&pc.length&&pc.every(okCycle))?pc.map(c=>({a:c.a,i:c.i})):[Object.assign({},st.cycle)];
  st.cycles.sort((a,b)=>a.a<b.a?-1:a.a>b.a?1:0);
  st.cycle=Object.assign({},st.cycles[st.cycles.length-1]);
  if(st.pass&&st.pass.used&&st.pass.wk&&!st.passUsed[st.pass.wk])st.passUsed[st.pass.wk]=1;
  ['Push','Pull','Legs'].forEach(t=>{if(!Array.isArray(st.routine[t]))st.routine[t]=clone(HS.ROUTINE_DEFAULT[t])});
  Object.keys(st.days).forEach(k=>{
    const x=st.days[k];
    if(!x||typeof x!=='object'||Array.isArray(x)){delete st.days[k];return}
    const z=DAY0();
    Object.keys(z).forEach(f=>{if(x[f]===undefined||(x[f]===null&&z[f]!==null)||(z[f]!==null&&typeof z[f]==='object'&&kindOf(x[f])!==kindOf(z[f])))x[f]=z[f]});
  });
  return st;
}
let S=blank(),mem=null;
const readable=t=>{try{JSON.parse(t);return true}catch(e){return false}};
(function load(){
  let r=null;
  try{r=localStorage.getItem(KEY)}catch(e){}
  if(r){
    try{S=migrate(JSON.parse(r));return}
    catch(e){
      /* the save could not be read: keep the raw text aside and fall back to yesterday's automatic copy if there is one */
      try{localStorage.setItem(KEY+'.unreadable',r)}catch(_){}
      E.unreadable=true;
      let bak=null;try{bak=localStorage.getItem(KEY+'.bak')}catch(_){}
      if(bak){try{S=migrate(JSON.parse(bak));E.recovered=true;return}catch(_){}}
    }
  }
  if(mem)S=mem;
})();
E.setShift(S.cfg.dayStart);
E.blank=blank;E.migrate=migrate;E.KEY=KEY;E._set=function(x){S=x;E.setShift(S.cfg.dayStart)};
E.S=()=>S;
let warned=false;
E.persist=function(){
  mem=S;
  const today=dkey();
  if(S.lastAutoBak!==today){
    /* once a day the previous save becomes the automatic copy, unless it cannot be read: then the older good copy stays */
    try{const prev=localStorage.getItem(KEY);if(prev&&readable(prev))localStorage.setItem(KEY+'.bak',prev)}catch(e){}
    S.lastAutoBak=today;
  }
  try{localStorage.setItem(KEY,JSON.stringify(S));warned=false}
  catch(e){if(!warned){warned=true;E.emit('storagefail')}}
};
/* a second copy of the app (installed app plus a browser tab) must not overwrite this one with stale data: adopt what the other copy saved */
try{window.addEventListener('storage',e=>{
  if(e.key!==KEY||!e.newValue)return;
  try{S=migrate(JSON.parse(e.newValue));E.setShift(S.cfg.dayStart);E.emit('external')}catch(_){}
})}catch(_){}
/* before anything destructive, a real save is kept aside once under .undo. It is never rotated, and an empty state never replaces it. */
E.snapshot=function(){
  try{
    const has=Object.keys(S.weights).length>0||S.aura>0||Object.keys(S.days).length>2;
    if(has)localStorage.setItem(KEY+'.undo',JSON.stringify(S));
  }catch(e){}
};
E.undoInfo=function(){
  try{const t=localStorage.getItem(KEY+'.undo');if(!t)return null;const o=JSON.parse(t);return{days:Object.keys(o.days||{}).length,aura:o.aura||0}}catch(e){return null}
};
E.undoLast=function(){
  let t=null;try{t=localStorage.getItem(KEY+'.undo')}catch(e){}
  if(!t)throw new Error('There is nothing to undo.');
  const st=migrate(JSON.parse(t));
  E.snapshot();S=st;E.setShift(S.cfg.dayStart);E.ensureOwned&&E.ensureOwned();E.persist();E.emit('reset');
  return Object.keys(S.days).length;
};
E.save=function(){E.persist();if(E.afterSave)E.afterSave()};
E.reset=function(){E.snapshot();S=blank();E.setShift(S.cfg.dayStart);E.ensureOwned&&E.ensureOwned();E.save();E.emit('reset')};
E.cfg=()=>S.cfg;
E.T=function(){
  const camp=E.campInfo&&E.campInfo();
  if(camp)return{kcal:camp.kcal,protein:S.cfg.protein,lo:Math.round(camp.kcal*.92/10)*10,hi:Math.round(camp.kcal*1.06/10)*10,camp:true};
  const k=S.cfg.kcal;return{kcal:k,protein:S.cfg.protein,lo:Math.round(k*.855/10)*10,hi:Math.round(k*1.05/10)*10};
};

/* ---- dates ---- */
E.daysBetween=function(a,b){const f=s=>{const x=s.split('-').map(Number);return Date.UTC(x[0],x[1]-1,x[2])/864e5};return Math.round(f(b)-f(a))};
E.di=()=>(E.now().getDay()+6)%7;
/* minutes since midnight of the current (shifted) day; past midnight but before the day ends this is above 1440 */
E.nowMin=()=>{const n=new Date(),sh=E.now();return n.getHours()*60+n.getMinutes()+(dkey(n)===dkey(sh)?0:1440)};   /* wall-clock minutes, so a daylight-saving change cannot shift them */
function weekKey(){const d=E.now();d.setDate(d.getDate()-E.di());return dkey(d)}
E.weekKey=weekKey;

/* ---- days ---- */
E.day=function(k){k=k||dkey();return S.days[k]||(S.days[k]=DAY0())};
const SEQ=['Push','Pull','Legs','Push','Pull','Legs','Rest'];
/* each correction starts a new anchor from that day; days before it keep the plan they had */
const anchorFor=k=>{let a=S.cycles[0];for(let i=0;i<S.cycles.length;i++){if(S.cycles[i].a<=k)a=S.cycles[i];else break}return a};
E.planFor=function(k){k=k||dkey();const a=anchorFor(k);return SEQ[(((a.i+E.daysBetween(a.a,k))%7)+7)%7]};
E.setSession=function(type){
  const k=dkey();
  {   /* an anchor dated in the future (the clock was set back) is dropped; if every anchor is in the future, restate the first on today */
    const kept=S.cycles.filter(q=>q.a<=k);
    if(kept.length)S.cycles=kept;
    else{const a0=S.cycles[0];S.cycles=[{a:k,i:(((a0.i+E.daysBetween(a0.a,k))%7)+7)%7}]}
  }
  const cur=anchorFor(k),c=(((cur.i+E.daysBetween(cur.a,k))%7)+7)%7;
  if(SEQ[c]===type)return;
  const before=S.cycles.filter(q=>q.a<k);
  if(before.length){
    /* correcting back to what the earlier plan says just removes today's correction, so a mis-tap leaves no trace */
    const pv=before[before.length-1];
    if(SEQ[(((pv.i+E.daysBetween(pv.a,k))%7)+7)%7]===type){S.cycles=before;S.cycle=Object.assign({},pv);return}
  }
  for(let j=0;j<7;j++){
    const x=(c+j)%7;
    if(SEQ[x]===type){
      const ix=S.cycles.findIndex(q=>q.a===k);
      if(ix>=0)S.cycles[ix]={a:k,i:x};else S.cycles.push({a:k,i:x});
      S.cycles.sort((p,q)=>p.a<q.a?-1:p.a>q.a?1:0);
      S.cycle=Object.assign({},S.cycles[S.cycles.length-1]);
      break;
    }
  }
};

/* ---- nutrition ---- */
E.food=n=>HS.DB[n]||S.custom[n];
E.nut=(f,g)=>({k:f.k100*g/100,p:f.p100*g/100});
E.totals=function(d){if(d.compact&&d.sum)return d.sum;let k=0,p=0;d.items.forEach(i=>{const f=E.food(i.name);if(f){const n=E.nut(f,i.g);k+=n.k;p+=n.p}});return{k:k,p:p}};
E.mealKcal=function(d,m){let k=0;d.items.forEach(i=>{if(i.meal===m){const f=E.food(i.name);if(f)k+=E.nut(f,i.g).k}});return k};
E.units=(f,g)=>Math.round(g/f.ug*10)/10;
E.poolFor=function(meal){return Array.from(new Set(HS.menuFor(meal,E.di()).concat(HS.STAPLES)))};
E.picks=function(meal){
  const d=E.day(),t=E.totals(d),T=E.T(),rK=T.kcal-t.k;
  if(t.p>=T.protein)return[];
  return E.poolFor(meal).map(E.food).filter(f=>f&&!f.sugar&&!f.out&&f.p>=10&&f.kcal<=Math.max(150,rK*.5)).sort((a,b)=>b.p/b.kcal-a.p/a.kcal).slice(0,3).map(f=>f.name);
};
const NUMW={half:.5,one:1,two:2,three:3,four:4,five:5};
E.scoreFoods=function(q,meal){
  q=q.toLowerCase().trim();if(!q)return[];
  const qs=[q];if(q.endsWith('es'))qs.push(q.slice(0,-2));if(q.endsWith('s'))qs.push(q.slice(0,-1));
  const menu=new Set(E.poolFor(meal));const out=[];
  Object.values(HS.DB).concat(Object.values(S.custom)).forEach(f=>{const n=f.name.toLowerCase();let best=-1;
    qs.forEach(x=>{const tk=x.split(/\s+/);if(tk.every(t=>n.includes(t))){const s=(menu.has(f.name)?100:0)+(n.startsWith(x)?20:0)+(n.split(/\W+/).includes(x)?10:0)-n.length/50;if(s>best)best=s}});
    if(best>-1)out.push({f:f,s:best})});
  return out.sort((a,b)=>b.s-a.s).map(o=>o.f);
};
/* "2 chapati", "rice 200g", "chicken 150", "momos 350 kcal" */
E.parsePart=function(p){
  p=p.trim();if(!p)return null;
  let g=null,units=null,kc=null,tn=null;
  const m=p.match(/(\d+(?:\.\d+)?)\s*(kg|gms|gm|grams|gram|g)\b/i);
  if(m){g=parseFloat(m[1])*(m[2].toLowerCase()==='kg'?1000:1);p=p.replace(m[0],' ')}
  const k=p.match(/(\d{2,4})\s*(?:kcal|cal)\b/i);
  if(k){kc=+k[1];p=p.replace(k[0],' ')}
  p=p.replace(/\bof\b/i,' ').replace(/\s+/g,' ').trim();
  if(g===null&&kc===null){
    const n=p.match(/^(\d+(?:\.\d+)?|half|one|two|three|four|five)\s*(?:x\s*)?(.*)$/i);
    if(n&&n[2]){units=isNaN(n[1])?NUMW[n[1].toLowerCase()]:parseFloat(n[1]);p=n[2]}
    else{const t=p.match(/^(.*?)\s+(\d{2,4})$/);if(t){tn=+t[2];p=t[1]}}
  }
  return{name:p.trim(),g:g,units:units,kc:kc,tn:tn};
};
/* add a food to the plate. Returns details so the UI can animate; the sound layer reacts to the 'add' event. */
E.addFood=function(name,grams,meal){
  const f=E.food(name);if(!f)return null;
  const d=E.day(),T=E.T(),g=grams||f.ug;
  const ex=d.items.find(i=>i.name===name&&i.meal===meal);
  if(ex)ex.g=Math.round((ex.g+g)*10)/10;else d.items.push({name:name,meal:meal,g:g});
  const k=E.nut(f,g).k;let pen=0;
  if(f.sugar){pen=Math.min(10,20-d.sugarPen);if(pen>0){d.sugarPen+=pen;E.addAura(-pen)}else pen=0}
  E.save();
  const proteinHit=E.checkProtein();
  E.emit('add',{food:f,grams:g,kcal:k,pct:Math.round(k/T.kcal*100),pen:pen,proteinHit:proteinHit});
  return{food:f,kcal:k,pen:pen};
};
E.removeItem=function(ix){
  const d=E.day(),it=d.items[ix];if(!it)return;
  const f=E.food(it.name);
  if(f&&f.sugar&&d.sugarPen>0){const r=Math.min(10,d.sugarPen);d.sugarPen-=r;S.aura+=r;d.delta+=r}
  d.items.splice(ix,1);E.save();E.emit('remove',{food:f});
};
E.customFood=function(name,kcal){
  const f=HS.mkFood(name,kcal,0,'serving','o');f.custom=true;f.p100=0;S.custom[name]=f;return f;
};
E.checkProtein=function(){
  const d=E.day();if(d.pAward)return false;
  if(E.totals(d).p>=E.T().protein){d.pAward=true;E.addAura(60);E.stat('VIT',2);E.emit('protein');E.save();return true}
  return false;
};

/* ---- weight, gates, journey ---- */
E.trend=function(){let t=S.startW;Object.keys(S.weights).sort().forEach(k=>{t=t+.25*(S.weights[k]-t)});return Math.round(t*100)/100};
/* The ladder is anchored on the goal weight, so the last gate is always the goal even if the starting weight is 83.6 or 84.3. */
E.ladder=function(){
  const c=S.cfg,step=c.gateStep||.5,out=[],n=Math.max(0,Math.ceil((S.startW-c.goalW)/step-1e-9)),base=c.goalW+n*step;
  for(let i=1;i<=n;i++){
    const kg=Math.round((c.goalW+(n-i)*step)*10)/10,q=(base-kg)/c.bossEvery;
    out.push({kg:kg,boss:i===n||(c.bossEvery>0&&Math.abs(q-Math.round(q))<1e-6)});
  }
  return out;
};
E.progress=function(){
  const tr=E.trend(),total=S.startW-S.cfg.goalW,left=Math.max(0,tr-S.cfg.goalW);
  const pct=total>0?Math.max(0,Math.min(1,(S.startW-tr)/total)):0;
  const weeks=left/.5,eta=new Date();eta.setDate(eta.getDate()+Math.round(weeks*7));
  return{pct:pct,left:left,weeks:weeks,eta:eta,day:Math.max(1,E.daysBetween(S.start,dkey())+1)};
};
E.logWeight=function(x){
  const d=E.day(),first=!d.weighed;
  S.weights[dkey()]=Math.round(x*10)/10;d.weighed=true;
  if(first){E.addAura(15);E.stat('SNS',1)}
  const tr=E.trend(),all=[];
  /* gates are a high-water mark: only ground lower than anything cleared before pays, so changing the start weight or the gate size can never pay a gate twice */
  const lo=S.gates.length?Math.min.apply(null,S.gates):Infinity;
  E.ladder().forEach(g=>{
    if(tr>g.kg+1e-6||S.gates.includes(g.kg))return;
    S.gates.push(g.kg);
    if(g.kg<lo-1e-6){S.gateDates[g.kg]=dkey();E.addAura(150);all.push(g);if(E.onGate)E.onGate(g)}
  });
  /* several gates can fall at once (a big drop after a break): show the most important one, a boss first */
  const cleared=all.length?(all.find(g=>g.boss)||all[all.length-1]):null;
  E.save();E.emit('weigh',{kg:x,trend:tr});
  if(cleared)E.emit('gate',Object.assign({},cleared,{count:all.length}));
  return{trend:tr,cleared:cleared};
};

/* ---- aura, level, rank, stats ---- */
const LV=a=>Math.floor(Math.sqrt(Math.max(0,a)/200))+1;
const LVF=L=>200*(L-1)*(L-1);
/* a new rank every six levels: with steady play that is roughly D in week 2, C by week 6, B by week 15, A around the finish of the 70 kg campaign, S after about a year */
const rankOf=L=>L>=30?'S':L>=24?'A':L>=18?'B':L>=12?'C':L>=6?'D':'E';
E.rankOf=rankOf;E.LVF=LVF;
E.lv=function(){
  const raw=LV(S.aura),locked=!!(S.fatigue&&S.fatigue.on&&raw>S.fatigue.lock),L=locked?S.fatigue.lock:raw;
  const a=LVF(L),b=LVF(L+1);
  return{L:L,raw:raw,locked:locked,rank:rankOf(L),pct:locked?1:(S.aura-a)/(b-a),have:Math.round(S.aura-a),need:b-a};
};
E.addAura=function(n){
  const before=E.lv(),d=E.day(),fat=S.fatigue&&S.fatigue.on;
  if(n>0&&fat)n=Math.floor(n/2);
  const real=Math.max(-S.aura,n);
  S.aura+=real;d.delta+=real;
  E.emit('aura',real);
  const after=E.lv();
  if(after.L>before.L)E.emit('level',{from:before,to:after,rankUp:after.rank!==before.rank});
  else if(after.locked&&real>0&&!before.locked)E.emit('locked',after);
  return real;
};
E.stat=function(k,n){S.stats[k]=Math.max(0,(S.stats[k]||0)+n);E.emit('stat',{k:k,n:n})};

/* ---- fatigue, penalties, rest pass (the real consequences) ---- */
E.fatigued=()=>!!(S.fatigue&&S.fatigue.on);
E.startFatigue=function(reason){
  if(E.fatigued())return;
  S.fatigue={on:true,lock:LV(S.aura),since:dkey(),reason:reason||'missed'};
  E.emit('fatigue',true);
};
E.clearFatigue=function(){
  if(!E.fatigued())return false;
  const before=E.lv();S.fatigue.on=false;const after=E.lv();
  E.emit('fatigue',false);
  if(after.L>before.L)E.emit('level',{from:before,to:after,rankUp:after.rank!==before.rank});
  return true;
};
const weekOf=k=>{const p=k.split('-').map(Number),d=new Date(p[0],p[1]-1,p[2]);d.setDate(d.getDate()-(d.getDay()+6)%7);return dkey(d)};
E.passLeft=function(k){return!S.passUsed[k?weekOf(k):weekKey()]};
E.usePass=function(k){const w=k?weekOf(k):weekKey();if(S.passUsed[w])return false;S.passUsed[w]=1;if(w===weekKey())S.pass={wk:w,used:true};E.save();return true};
/* A skipped session without pain. Chill: aura only. Standard: aura plus fatigue (half aura, no level-ups until you train).
   Hard: bigger loss, a strength point, and a second miss in a row hits twice. */
E.penalty=function(why){
  const st=S.cfg.strict,base=st==='chill'?30:st==='hard'?100:60;let extra=0;
  E.addAura(-base);
  if(st!=='chill')E.startFatigue(why);
  if(st==='hard'){E.stat('STR',-1);if(S.missStreak>=1){E.addAura(-100);E.stat('STR',-2);extra=100}}
  S.missStreak=(S.missStreak||0)+1;
  E.save();
  E.emit('penalty',{base:base,extra:extra,strict:st,why:why,streak:S.missStreak});
};
/* a day is settled once: a second tap on any of these (or a different one right after) must not change it or cost anything twice */
E.skipWorkout=function(){const d=E.day();if(d.workout)return;d.workout='lazy';E.penalty('skipped');E.save()};
E.painDay=function(){const d=E.day();if(d.workout)return;d.workout='pain';E.stat('SNS',1);E.save()};
E.restPass=function(){const d=E.day();if(d.workout||!E.usePass())return false;d.workout='pass';E.save();return true};
/* On open: any planned session in the last 3 days with nothing logged is an absence. A rest pass covers one per week. */
E.sweep=function(){
  const out=[],chill=S.cfg.strict==='chill';let touched=false;
  for(let i=3;i>=1;i--){
    const dt=E.now();dt.setDate(dt.getDate()-i);const k=dkey(dt);
    if(k<=S.start||S.swept[k])continue;
    S.swept[k]=1;touched=true;
    if(chill)continue;   /* Chill never punishes an absence, but the day is still settled so switching to Standard later cannot punish it */
    if(E.planFor(k)==='Rest')continue;
    const d=S.days[k];if(d&&d.workout)continue;
    const dd=E.day(k);
    if(E.usePass(k)){dd.workout='pass';out.push({k:k,pass:true})}
    else{dd.workout='lazy';E.penalty('absent');out.push({k:k,pass:false})}
  }
  if(out.length)E.save();else if(touched)E.persist();
  return out;
};
E.contractMessage=function(why){
  const c=S.cfg;
  return (c.name||'I')+' here. I broke my own rule ('+why+'). My contract: '+(c.contract||'you pick my penalty')+'. Hold me to it.';
};

/* ---- workouts ---- */
E.routine=type=>S.routine[type]||[];
E.exState=function(ex){
  const d=E.day();d.lift=d.lift||{};
  if(!d.lift[ex.n]){
    const last=S.last[ex.n];
    d.lift[ex.n]={sets:Array.from({length:ex.sets},()=>({w:last?last.w:0,r:last?last.r:ex.reps,done:false})),pr:false};
  }
  const st=d.lift[ex.n];
  while(st.sets.length<ex.sets)st.sets.push({w:st.sets.length?st.sets[st.sets.length-1].w:0,r:ex.reps,done:false});
  return st;
};
E.liftProgress=function(plan){
  let done=0,total=0;
  E.routine(plan).forEach(ex=>{const st=E.exState(ex);st.sets.slice(0,ex.sets).forEach(s=>{total++;if(s.done)done++})});
  return{done:done,total:total};
};
E.setDone=function(ex,i,on){
  const st=E.exState(ex),s=st.sets[i];if(!s)return{};
  s.done=on;let pr=false;
  if(on){
    S.last[ex.n]={w:s.w,r:s.r};
    const e1=s.w*(1+s.r/30);
    if(s.w>0&&S.pr[ex.n]&&e1>S.pr[ex.n]*1.005&&!st.pr){pr=true;st.pr=true;S.counters.pr++;const wkk=E.weekKey();S.prWeeks[wkk]=(S.prWeeks[wkk]||0)+1;E.addAura(25);E.stat('STR',1)}
    if(s.w>0&&(!S.pr[ex.n]||e1>S.pr[ex.n]))S.pr[ex.n]=e1;
  }
  E.save();E.emit('set',{ex:ex,on:on,pr:pr,over:!!(ex.cap&&s.w>HS.CAP_KG)});
  return{pr:pr};
};
E.completeWorkout=function(plan){
  const d=E.day(),p=E.liftProgress(plan),frac=p.total?Math.min(1,p.done/p.total/.8):1;
  const comeback=E.clearFatigue();if(comeback)S.counters.comeback++;
  const award=Math.round(100*frac);
  d.workout='done';
  E.addAura(award);E.stat('STR',3);
  if(comeback)E.addAura(40);
  S.missStreak=0;
  E.save();E.emit('workout',{award:award,comeback:comeback,done:p.done,total:p.total});
  return{award:award,comeback:comeback};
};
/* calories burned: net of resting, ACSM treadmill equations; lifting at about 4.5 MET. Information only. */
E.burnEst=function(kg,lift,walkMin,runMin){
  const m=v=>v*1000/60,wk=(0.1*m(5)+1.8*m(5)*.09)*kg/1000*5*walkMin,rn=(0.2*m(9))*kg/1000*5*runMin,lf=3.5*kg*(lift/60);
  return Math.round(wk+rn+lf);
};

/* ---- rehab and pain ---- */
E.painDays=function(n){
  const out=[];
  for(let i=n-1;i>=0;i--){const x=E.now();x.setDate(x.getDate()-i);const k=dkey(x),d=S.days[k];out.push({k:k,r:d&&E.checkedIn(d.reh)?d.reh:null,run:d&&d.runFree!=null&&d.workout==='done'?d.runFree:null,d:d})}
  return out;
};
/* proposed pain traffic light, to be confirmed by the physio: green 0-3, amber 4-5, red 6+ or any sharp pain */
/* a rehab record counts as a pain check-in only when the player really entered something. A finished session with untouched sliders is not "green". */
E.checkedIn=r=>!!r&&(r.checked===true||r.knee>0||r.back>0||!!r.sharp||(r.checked===undefined&&!!r.done));
E.light=function(r){if(!r)return null;const m=Math.max(r.knee,r.back);return r.sharp||m>=6?'red':m>=4?'amber':'green'};
E.exportJSON=()=>JSON.stringify(S,null,1);
})();
