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
/* defined this early because migrate() reads a saved game while this file is still loading */
E.daysBetween=function(a,b){const f=s=>{const x=s.split('-').map(Number);return Date.UTC(x[0],x[1]-1,x[2])/864e5};return Math.round(f(b)-f(a))};
const CFG0={name:'PLAYER',kcal:2050,protein:140,goalW:70,gateStep:.5,bossEvery:4,stepGoal:0,strict:'standard',theme:'auto',volume:.8,haptics:true,sound:true,contract:'',partner:'',
  height:166,age:21,deficit:530,water:3000,roast:'playful',camp:true,autoKcal:true,dayStart:3,sparkGoal:3,backup:'Yogabar Pro Clean Plant Protein (1 scoop)'};
const clone=o=>JSON.parse(JSON.stringify(o));
const blank=()=>({v:SCHEMA,cfg:Object.assign({},CFG0),aura:0,stats:{STR:0,VIT:0,AGI:0,SNS:0},startW:84,start:dkey(),weights:{},gates:[],gateDates:{},cycle:{a:dkey(),i:0},cycles:[{a:dkey(),i:0}],rot:{i:0,from:dkey()},shield:{n:1,used:{},checked:{}},passUsed:{},days:{},custom:{},supps:null,
  rehab:{confirmed:false,next:0},routine:clone(HS.ROUTINE_DEFAULT),last:{},pr:{},fatigue:null,pass:{wk:'',used:false},missStreak:0,swept:{},
  equip:Object.assign({},HS.EQUIP_DEFAULT),owned:{},realm:'r1',realmSeen:1,claimed:{},counters:{pr:0,comeback:0,goals:0,bonus:0},prWeeks:{},camp:null,bestStreak:0,
  lastBackup:0,lastAutoBak:'',reviewSeen:'',welcomed:false,newItems:[],health:{on:false,last:0},remind:{on:false}});
/* bring any saved state up to the current schema without losing anything */
const DAY0=()=>({items:[],done:{},skip:{},workout:null,sess:null,plan:null,supp:{},spark:false,cardio:false,pain:null,burn:0,mins:null,cardioDet:null,runFree:null,reh:null,lift:{},weighed:false,pAward:false,closed:false,calOk:false,delta:0,sugarPen:0,score:0,steps:'',stepsAward:false,water:0,waterHit:false,sleep:null,chest:null});
const kindOf=v=>v===null?'null':Array.isArray(v)?'array':typeof v;
const ROT=E.ROT=['Push','Pull','Legs','Rest'];
const LEGACY=['Push','Pull','Legs','Push','Pull','Legs','Rest'];   /* the old seven-day cycle, still used to read days before the rotation began */
const legacyOn=(cycles,k)=>{let a=cycles[0];for(let i=0;i<cycles.length;i++){if(cycles[i].a<=k)a=cycles[i];else break}return LEGACY[(((a.i+E.daysBetween(a.a,k))%7)+7)%7]};
/* which session a finished day was, judged from the exercises logged that day */
function sessionOfDay(st,k){
  const d=st.days[k];if(!d)return null;
  if(d.sess)return d.sess;
  const names=Object.keys(d.lift||{});let best=null,bn=0;
  ['Push','Pull','Legs'].forEach(t=>{const n=names.filter(x=>(st.routine[t]||[]).some(e=>e.n===x)).length;if(n>bn){bn=n;best=t}});
  return best||legacyOn(st.cycles,k);
}
E.sessionOf=k=>sessionOfDay(S,k);
/* the last session you finished and when */
E.lastSession=function(){
  const ks=Object.keys(S.days).filter(k=>S.days[k].workout==='done').sort();
  if(!ks.length)return null;
  const k=ks[ks.length-1];return{k:k,type:sessionOfDay(S,k)};
};
function initRot(st){
  const done=Object.keys(st.days).filter(k=>st.days[k].workout==='done').sort();
  if(done.length){
    const t=sessionOfDay(st,done[done.length-1]),ix=ROT.indexOf(t);
    return{i:ix<0?0:(ix+1)%4,from:dkey()};
  }
  const ix=ROT.indexOf(legacyOn(st.cycles,dkey()));
  return{i:ix<0?0:ix,from:dkey()};
}
function migrate(p){
  const d=blank(),st=Object.assign({},d,(p&&typeof p==='object')?p:{});
  /* a saved field that is missing, null or the wrong kind of thing falls back to its default, so an old or damaged save cannot crash a screen */
  Object.keys(d).forEach(k=>{if(d[k]!==null&&kindOf(st[k])!==kindOf(d[k]))st[k]=d[k]});
  st.cfg=Object.assign({},CFG0,st.cfg);
  /* every day is checked first: the rotation below reads them, and a damaged day must not stop the save from loading */
  Object.keys(st.days).forEach(k=>{
    const x=st.days[k];
    if(!x||typeof x!=='object'||Array.isArray(x)){delete st.days[k];return}
    const z=DAY0();
    if(Array.isArray(x.items)){x.items=x.items.filter(it=>it&&typeof it==='object'&&typeof it.name==='string');x.items.forEach(it=>{if(HS.ALIAS&&HS.ALIAS[it.name])it.name=HS.ALIAS[it.name]})}
    Object.keys(z).forEach(f=>{if(x[f]===undefined||(x[f]===null&&z[f]!==null)||(z[f]!==null&&typeof z[f]==='object'&&kindOf(x[f])!==kindOf(z[f])))x[f]=z[f]});
  });
  if(!p||(p.v||4)<5){
    if(st.cfg.goalW===75)st.cfg.goalW=70;   /* the goal is 70 kg */
    if(st.cfg.theme==='shadow')st.cfg.theme='auto';   /* follow the realm */
    st.v=SCHEMA;
  }
  ['equip','stats','counters','health','remind','rehab','pass','cycle','shield'].forEach(k=>{st[k]=Object.assign({},d[k],st[k])});
  ['used','checked'].forEach(k=>{if(!st.shield[k]||typeof st.shield[k]!=='object')st.shield[k]={}});
  st.equip=Object.assign({},HS.EQUIP_DEFAULT,st.equip);
  /* the training cycle keeps every anchor, so correcting today's session never rewrites past days.
     Judge the SAVED list: the default filled in above must never hide an older save's single anchor. */
  const okCycle=c=>!!c&&typeof c==='object'&&typeof c.a==='string'&&typeof c.i==='number';
  if(!okCycle(st.cycle))st.cycle=Object.assign({},d.cycle);
  const pc=p&&typeof p==='object'?p.cycles:null;
  st.cycles=(Array.isArray(pc)&&pc.length&&pc.every(okCycle))?pc.map(c=>({a:c.a,i:c.i})):[Object.assign({},st.cycle)];
  st.cycles.sort((a,b)=>a.a<b.a?-1:a.a>b.a?1:0);
  st.cycle=Object.assign({},st.cycles[st.cycles.length-1]);
  /* the training rotation: Push, Pull, Legs, Rest follows what you last completed, not the calendar. An older save is read once:
     the session after the last one you finished is due next. */
  const okRot=r=>!!r&&typeof r==='object'&&typeof r.i==='number'&&r.i>=0&&r.i<4&&typeof r.from==='string';
  if(okRot(p&&p.rot))st.rot={i:p.rot.i|0,from:p.rot.from};
  else st.rot=initRot(st);
  if(st.pass&&st.pass.used&&st.pass.wk&&!st.passUsed[st.pass.wk])st.passUsed[st.pass.wk]=1;
  ['Push','Pull','Legs'].forEach(t=>{if(!Array.isArray(st.routine[t]))st.routine[t]=clone(HS.ROUTINE_DEFAULT[t])});
  if(st.supps!==null&&!Array.isArray(st.supps))st.supps=null;
  /* foods you made in an older version have no nutrient columns: rebuild them from the numbers they have */
  Object.keys(st.custom).forEach(k=>{
    const f=st.custom[k];
    if(!f||typeof f!=='object'||Array.isArray(f)){delete st.custom[k];return}
    if(!Array.isArray(f.n)||f.n.length!==HS.NUT_COLS.length){
      const g=f.ug>0?f.ug:100,per=x=>(+x||0)*g/100;
      st.custom[k]=HS.mkCustom({name:f.name||k,g:g,kcal:per(f.k100),p:per(f.p100),c:per(f.c100),f:per(f.f100),fi:per(f.fi100),sugarPen:f.sugar,out:f.out,unit:f.unit});
    }
  });
  ['Push','Pull','Legs'].forEach(t=>{st.routine[t]=st.routine[t].filter(e=>e&&typeof e==='object'&&typeof e.n==='string')});
  if(Array.isArray(st.supps))st.supps=st.supps.filter(e=>e&&typeof e==='object'&&typeof e.id==='string'&&e.v&&typeof e.v==='object');
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
      E.unreadable=true;E.loadError=String(e&&e.message||e);
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
E.di=()=>(E.now().getDay()+6)%7;
/* minutes since midnight of the current (shifted) day; past midnight but before the day ends this is above 1440 */
E.nowMin=()=>{const n=new Date(),sh=E.now();return n.getHours()*60+n.getMinutes()+(dkey(n)===dkey(sh)?0:1440)};   /* wall-clock minutes, so a daylight-saving change cannot shift them */
function weekKey(){const d=E.now();d.setDate(d.getDate()-E.di());return dkey(d)}
E.weekKey=weekKey;

/* ---- days ---- */
E.day=function(k){k=k||dkey();return S.days[k]||(S.days[k]=DAY0())};
/* Today's session is the one after the last you completed (Push, Pull, Legs, Rest, then Push again). A day you did not train does not
   move the rotation, so a missed Push is still Push tomorrow. A day settled in the past keeps the session it had. */
const anchorFor=k=>{let a=S.cycles[0];for(let i=0;i<S.cycles.length;i++){if(S.cycles[i].a<=k)a=S.cycles[i];else break}return a};
E.planFor=function(k){
  const t=dkey();k=k||t;const d=S.days[k];
  if(d&&d.sess)return d.sess;
  if(k===t)return ROT[S.rot.i];
  if(k>t){const td=S.days[t],used=!!(td&&td.workout==='done'),n=E.daysBetween(t,k);return ROT[(((S.rot.i+n-(used?1:0))%4)+4)%4]}   /* a forecast: every session gets done */
  if(d&&d.plan)return d.plan;
  return legacyOn(S.cycles,k);
};
/* "Wrong session? Pick the right one": today's real session. Choosing what is due clears the choice. A finished workout cannot be relabelled. */
E.setSession=function(type){
  const d=E.day();
  if(ROT.indexOf(type)<0||d.workout==='done')return;
  if(type===ROT[S.rot.i])d.sess=null;else d.sess=type;
};

/* ---- nutrition ---- */
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);   /* a food called "constructor" is a name, not a property */
E.food=n=>own(HS.DB,n)?HS.DB[n]:own(S.custom,n)?S.custom[n]:(HS.ALIAS&&own(HS.ALIAS,n)?HS.DB[HS.ALIAS[n]]:undefined);
E.nut=(f,g)=>({k:f.k100*g/100,p:f.p100*g/100,c:(f.c100||0)*g/100,f:(f.f100||0)*g/100,fi:(f.fi100||0)*g/100});
E.totals=function(d){if(d.compact&&d.sum)return d.sum;let k=0,p=0,c=0,f2=0,fi=0;d.items.forEach(i=>{const f=E.food(i.name);if(f){const n=E.nut(f,i.g);k+=n.k;p+=n.p;c+=n.c;f2+=n.f;fi+=n.fi}});return{k:k,p:p,c:c,f:f2,fi:fi}};
E.mealKcal=function(d,m){let k=0;d.items.forEach(i=>{if(i.meal===m){const f=E.food(i.name);if(f)k+=E.nut(f,i.g).k}});return k};
E.units=(f,g)=>Math.round(g/f.ug*10)/10;
E.poolFor=function(meal){return Array.from(new Set(HS.menuFor(meal,E.di()).concat(HS.STAPLES)))};
E.picks=function(meal){
  const d=E.day(),t=E.totals(d),T=E.T(),rK=T.kcal-t.k;
  if(t.p>=T.protein)return[];
  return E.poolFor(meal).map(E.food).filter(f=>f&&!f.sugar&&!f.out&&f.p>=10&&f.kcal<=Math.max(150,rK*.5)).sort((a,b)=>b.p/b.kcal-a.p/a.kcal).slice(0,3).map(f=>f.name);
};
const NUMW={half:.5,one:1,two:2,three:3,four:4,five:5};
const PREFER={egg:'Boiled egg',eggs:'Boiled egg',omelet:'Omelette'};   /* a bare "egg" means the whole egg, not the white */
E.scoreFoods=function(q,meal){
  q=q.toLowerCase().trim();if(!q)return[];
  const qs=[q];if(q.endsWith('es'))qs.push(q.slice(0,-2));if(q.endsWith('s'))qs.push(q.slice(0,-1));
  const menu=new Set(E.poolFor(meal));const out=[];
  Object.values(HS.DB).concat(Object.values(S.custom)).forEach(f=>{const n=f.name.toLowerCase();let best=-1;
    qs.forEach(x=>{const tk=x.split(/\s+/);if(tk.every(t=>n.includes(t))){const s=(menu.has(f.name)?100:0)+(PREFER[x]===f.name?60:0)+(n.startsWith(x)?20:0)+(n.split(/\W+/).includes(x)?10:0)-n.length/50;if(s>best)best=s}});
    if(best>-1)out.push({f:f,s:best})});
  return out.sort((a,b)=>b.s-a.s).map(o=>o.f);
};
/* "2 chapati", "rice 200g", "chicken 150", "momos 350 kcal" */
E.parsePart=function(p){
  p=p.trim();if(!p)return null;
  let g=null,units=null,kc=null,tn=null;
  const m=p.match(/(\d+(?:\.\d+)?)\s*(kg|gms|gm|grams|gram|ml|g)\b/i);   /* a millilitre of milk, curd or juice weighs about a gram */
  if(m){g=parseFloat(m[1])*(m[2].toLowerCase()==='kg'?1000:1);p=p.replace(m[0],' ')}
  const k=p.match(/(\d{2,4})\s*(?:kcal|cal)\b/i);
  if(k){kc=+k[1];p=p.replace(k[0],' ')}
  p=p.replace(/\bof\b/i,' ').replace(/\s+/g,' ').trim();
  if(g===null&&kc===null){
    const n=p.match(/^(\d+(?:\.\d+)?|half|one|two|three|four|five)\s*(?:x\s*)?(.*)$/i);
    if(n&&n[2]){units=isNaN(n[1])?NUMW[n[1].toLowerCase()]:parseFloat(n[1]);p=n[2]}
    else{
      const t=p.match(/^(.*?)\s+(\d{2,4})$/),u=p.match(/^(.*?)\s+x?(\d{1,2}(?:\.\d+)?)$/i);
      if(t&&!(u&&+t[2]<=20)){tn=+t[2];p=t[1]}
      else if(u&&+u[2]>0&&+u[2]<=20){units=+u[2];p=u[1]}   /* "chapati 2" is two chapatis, "chicken 150" is 150 g */
    }
  }
  return{name:p.trim(),g:g,units:units,kc:kc,tn:tn};
};
/* add a food to the plate. Returns details so the UI can animate; the sound layer reacts to the 'add' event. */
E.addFood=function(name,grams,meal){
  const f=E.food(name);if(!f)return null;
  const d=E.day(),T=E.T(),g=grams>0?grams:f.ug;
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
/* a food from a label: per serving of g grams */
E.saveCustom=function(o){
  const nz=x=>x>0?+x:0;
  let name=String(o.name||'').trim().slice(0,40)||'My food';
  if(HS.DB[name]||(HS.ALIAS&&HS.ALIAS[name]))name=name+' (mine)';   /* a label never hides a food from the table */
  const f=HS.mkCustom(Object.assign({},o,{name:name,g:o.g>0?o.g:100,kcal:nz(o.kcal),p:nz(o.p),c:nz(o.c),f:nz(o.f),fi:nz(o.fi),su:nz(o.su),na:nz(o.na)}));
  S.custom[f.name]=f;E.save();return f;
};
/* the protein backup (a powder, a bar): what it gives and whether today needs it */
E.backupFood=function(){const n=S.cfg.backup;return n?E.food(n):null};
E.proteinGap=function(){
  const d=E.day(),f=E.backupFood();if(!f||d.pAward||f.p<=0)return null;
  const gap=Math.round(E.T().protein-E.totals(d).p),hr=E.nowMin()/60,open=['breakfast','lunch','dinner'].filter(m=>!d.done[m]&&!d.skip[m]).length;
  return{gap:gap,food:f,late:gap>10&&(hr>=19||(hr>=17&&open<=1)||(hr>=15&&!open))};
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
/* On open: any planned session in the last 3 days with nothing logged is an absence. A rest pass covers one per week.
   A rest day that passes moves the rotation on to Push; a session you did not do stays due. */
E.sweep=function(){
  const out=[],chill=S.cfg.strict==='chill';let touched=false;
  const lastDone=Object.keys(S.days).filter(k=>S.days[k]&&S.days[k].workout==='done').sort().pop()||null;
  for(let i=3;i>=1;i--){
    const dt=E.now();dt.setDate(dt.getDate()-i);const k=dkey(dt);
    if(k<=S.start||S.swept[k])continue;
    S.swept[k]=1;touched=true;
    const d0=S.days[k];
    if(d0&&d0.workout==='done'){if(!d0.sess)d0.sess=sessionOfDay(S,k);continue}   /* a finished day is known by what was done, never by where the pointer is now */
    if(lastDone&&k<lastDone)continue;   /* the rotation has already moved past a day that came before a finished session */
    const due=(d0&&d0.sess)||ROT[S.rot.i];
    if(d0&&d0.workout){
      if(!d0.sess&&!d0.plan)d0.plan=due;
      if(due==='Rest'&&!d0.sess&&(d0.workout==='pain'||d0.workout==='pass'))S.rot.i=(S.rot.i+1)%4;
      continue;
    }
    const dd=E.day(k);dd.plan=due;
    if(due==='Rest'){S.rot.i=(S.rot.i+1)%4;continue}
    if(chill)continue;   /* Chill never punishes an absence, but the day is still settled so switching to Standard later cannot punish it */
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
/* one set done or undone; returns true when it is a personal record */
function markSet(ex,st,i,on){
  const s=st.sets[i];if(!s)return false;
  s.done=on;let pr=false;
  if(on){
    S.last[ex.n]={w:s.w,r:s.r};
    const e1=s.w*(1+s.r/30);
    if(s.w>0&&S.pr[ex.n]&&e1>S.pr[ex.n]*1.005&&!st.pr){pr=true;st.pr=true;S.counters.pr++;const wkk=E.weekKey();S.prWeeks[wkk]=(S.prWeeks[wkk]||0)+1;E.addAura(25);E.stat('STR',1)}
    if(s.w>0&&(!S.pr[ex.n]||e1>S.pr[ex.n]))S.pr[ex.n]=e1;
  }
  return pr;
}
E.setDone=function(ex,i,on){
  const st=E.exState(ex),s=st.sets[i];if(!s)return{};
  const pr=markSet(ex,st,i,on);
  E.save();E.emit('set',{ex:ex,on:on,pr:pr,over:!!(ex.cap&&s.w>HS.CAP_KG)});
  return{pr:pr};
};
/* the whole exercise in one tap: every set at the weight and reps shown */
E.setAll=function(ex,on){
  const st=E.exState(ex);let pr=false,n=0;
  st.sets.slice(0,ex.sets).forEach((s,i)=>{if(s.done!==on){n++;if(markSet(ex,st,i,on))pr=true}});
  E.save();E.emit('sets',{ex:ex,on:on,pr:pr,n:n,over:!!(ex.cap&&st.sets.some(s=>s.w>HS.CAP_KG))});
  return{pr:pr,n:n};
};
/* one weight for every set of an exercise (and what the next session starts from) */
E.setWeight=function(ex,w){
  const st=E.exState(ex);w=Math.max(0,Math.round(w*10)/10);
  st.sets.forEach(s=>{s.w=w});
  if(st.sets.some(s=>s.done)&&S.last[ex.n])S.last[ex.n].w=w;
  E.save();return w;
};
/* the next weight to try, only when you have been lifting something: a small step up, never past your own cap */
E.suggestW=function(ex){
  const l=S.last[ex.n];if(!l||!(l.w>0))return null;
  const nxt=Math.round((l.w+(l.w<20?1:2.5))*2)/2;
  return ex.cap&&nxt>HS.CAP_KG?null:nxt;
};
/* kilograms moved so far today, for the counter */
E.volumeToday=function(plan){
  let v=0;E.routine(plan).forEach(ex=>{const st=E.exState(ex);st.sets.slice(0,ex.sets).forEach(s=>{if(s.done)v+=s.w*s.r})});
  return Math.round(v);
};
/* the numbers from your last finished session, so the report starts where you left off */
E.lastMins=function(){
  const ks=Object.keys(S.days).filter(k=>k<dkey()&&S.days[k].mins).sort();
  const d=ks.length?S.days[ks[ks.length-1]]:null;
  return d?{lift:d.mins.lift||60,walk:d.mins.walk||0,run:d.mins.run||0,free:d.runFree!=null?d.runFree:3}:{lift:60,walk:15,run:10,free:3};
};
E.completeWorkout=function(plan){
  if(E.day().workout==='done')return{award:0,comeback:false,again:true};   /* a double tap never pays twice or skips a session in the rotation */
  const d=E.day(),p=E.liftProgress(plan),frac=p.total?Math.min(1,p.done/p.total/.8):1;
  const comeback=E.clearFatigue();if(comeback)S.counters.comeback++;
  const award=Math.round(100*frac);
  d.workout='done';d.sess=plan;S.rot.i=(ROT.indexOf(plan)+1)%4;   /* the rotation moves on from the session you really did */
  E.addAura(award);E.stat('STR',3);
  if(comeback)E.addAura(40);
  S.missStreak=0;
  E.save();E.emit('workout',{award:award,comeback:comeback,done:p.done,total:p.total});
  return{award:award,comeback:comeback};
};
/* A rest day is a cardio day: an easy walk and some running. It is optional, never punished, and it never moves the Push, Pull, Legs, Rest rotation.
   Details are optional: minutes alone use the treadmill defaults, and a distance (typed in when the phone stayed in the locker) gives the real speed. */
E.CARDIO_DEF={wSpd:5,wInc:9,rSpd:9,rInc:0};
E.CARDIO_LIM={walk:[1.5,8],run:[4,22]};   /* km/h that a walk or a run can plausibly be: outside it the input is a typo */
E.lastCardio=function(){
  const ks=Object.keys(S.days).filter(k=>k<dkey()&&S.days[k].cardio&&S.days[k].mins).sort();
  const d=ks.length?S.days[ks[ks.length-1]]:null;
  const det=d&&d.cardioDet||{};
  return d?{walk:d.mins.walk||0,run:d.mins.run||0,free:d.runFree!=null?d.runFree:3,wInc:det.wInc!=null?det.wInc:E.CARDIO_DEF.wInc,rInc:det.rInc!=null?det.rInc:E.CARDIO_DEF.rInc}:{walk:30,run:10,free:3,wInc:E.CARDIO_DEF.wInc,rInc:E.CARDIO_DEF.rInc};
};
/* speed in km/h from a distance and minutes; the fallback when either is missing */
E.speedOf=(km,min,fallback)=>km>0&&min>0?km/(min/60):fallback;
E.paceTxt=kmh=>{if(!(kmh>0))return'';const t=60/kmh,m=Math.floor(t),s=Math.round((t-m)*60);return(s===60?m+1:m)+':'+String(s===60?0:s).padStart(2,'0')};
E.completeCardio=function(o,k){
  const d=E.day(k),first=!d.cardio;
  d.cardio=true;d.mins={lift:0,walk:o.walk|0,run:o.run|0};d.runFree=o.free!=null?o.free:null;
  d.cardioDet=o.det?{wKm:o.det.wKm>0?+o.det.wKm:0,rKm:o.det.rKm>0?+o.det.rKm:0,wSpd:o.det.wSpd,rSpd:o.det.rSpd,wInc:o.det.wInc,rInc:o.det.rInc,src:o.det.src||'est'}:null;
  d.burn=o.kcal>0?Math.round(o.kcal):E.burnEst((E.trendAt?E.trendAt(k||dkey()):E.trend())||S.startW,0,o.walk|0,o.run|0,o.det);
  if(first){E.addAura(60);E.stat('AGI',1+Math.floor(((o.walk|0)+(o.run|0))/15))}
  /* yesterday was saved by a shield, and this walk lights it after all: the shield comes back */
  if(k&&k!==dkey()&&S.shield&&S.shield.used&&S.shield.used[k]&&E.pillarsMet(k)>=E.sparkGoal()){delete S.shield.used[k];S.shield.n=Math.min(2,S.shield.n+1)}
  E.save();E.emit('cardio',{first:first,walk:o.walk|0,run:o.run|0,kcal:d.burn,k:k||dkey()});
  return{first:first};
};
/* A walk or run can be logged for yesterday when yesterday was a rest day: a run done without the phone is often typed in the next morning. */
E.cardioDayOk=function(k){
  const d=S.days[k];
  if(k<=S.start||(d&&d.workout==='done'))return false;
  return E.planFor(k)==='Rest';
};
/* Calories burned, net of resting energy (the resting part is counted separately in the energy balance). Information only.
   ACSM treadmill equations, speeds in m/min and grade as a fraction: walking 0.1 v + 1.8 v grade, running 0.2 v + 0.9 v grade, in ml of oxygen per kg per minute; 5 kcal per litre of oxygen.
   Lifting is counted at 4.5 MET gross (between the Compendium's 3.5 for light and 6 for vigorous resistance work), so 3.5 kcal per kg per hour net. Wearables can be off by a third or more either way; this is meant to be the more careful number. */
E.burnEst=function(kg,lift,walkMin,runMin,o){
  const od=Object.assign({},E.CARDIO_DEF);Object.keys(o||{}).forEach(x=>{if(o[x]!=null&&!isNaN(o[x]))od[x]=+o[x]});o=od;
  const L=E.CARDIO_LIM,cl=(v,r)=>Math.min(r[1],Math.max(r[0],+v||0)),m=v=>v*1000/60;
  const vw=m(cl(o.wSpd,L.walk)),vr=m(cl(o.rSpd,L.run)),gw=Math.max(0,Math.min(15,+o.wInc||0))/100,gr=Math.max(0,Math.min(15,+o.rInc||0))/100;
  const wk=(0.1*vw+1.8*vw*gw)*kg/1000*5*(walkMin||0),rn=(0.2*vr+0.9*vr*gr)*kg/1000*5*(runMin||0),lf=3.5*kg*((lift||0)/60);
  return Math.round(wk+rn+lf);
};

/* ---- rehab and pain ---- */
E.painDays=function(n){
  const out=[];
  for(let i=n-1;i>=0;i--){const x=E.now();x.setDate(x.getDate()-i);const k=dkey(x),d=S.days[k];out.push({k:k,r:d&&E.checkedIn(d.reh)?d.reh:null,run:d&&d.runFree!=null&&(d.workout==='done'||d.cardio)?d.runFree:null,d:d})}
  return out;
};
/* proposed pain traffic light, to be confirmed by the physio: green 0-3, amber 4-5, red 6+ or any sharp pain */
/* a rehab record counts as a pain check-in only when the player really entered something. A finished session with untouched sliders is not "green". */
E.checkedIn=r=>!!r&&(r.checked===true||r.knee>0||r.back>0||!!r.sharp||(r.checked===undefined&&!!r.done));
E.light=function(r){if(!r)return null;const m=Math.max(r.knee,r.back);return r.sharp||m>=6?'red':m>=4?'amber':'green'};
E.exportJSON=()=>JSON.stringify(S,null,1);
})();
