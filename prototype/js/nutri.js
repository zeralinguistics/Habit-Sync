/* nutri.js: nutrients beyond calories. Daily totals of every nutrient, the supplements you take, the biggest sources, the weak spots of a week,
   and the energy balance when Samsung Health has data. No DOM here. Food values come from IFCT 2017 (see nutri-data.js and tools/nutrition). */
(function(){
'use strict';
const HS=window.HS=window.HS||{};
const E=HS.E,S=()=>E.S(),IX=HS.NUT_IX,COLS=HS.NUT_COLS;

/* ---- supplements: a small checklist, counted in the totals so vitamin D and calcium are honest ---- */
E.supps=function(){const s=S();if(!s.supps)s.supps=JSON.parse(JSON.stringify(HS.SUPP_DEFAULT));return s.supps};
E.suppTaken=function(id,d){d=d||E.day();return!!(d.supp&&d.supp[id])};
E.toggleSupp=function(id){
  if(!E.supps().some(x=>x.id===id))return null;
  const d=E.day();d.supp=d.supp&&typeof d.supp==='object'?d.supp:{};d.supp[id]=!d.supp[id];
  E.save();E.emit('supp',{id:id,on:d.supp[id]});
  return d.supp[id];
};

/* ---- the day's nutrients: food plus supplements ---- */
E.nutrients=function(d){
  d=d||E.day();
  const v={},food={},src={};COLS.forEach(c=>{v[c]=0;food[c]=0});
  (d.items||[]).forEach(it=>{
    const f=E.food(it.name);if(!f||!f.n)return;
    COLS.forEach((c,j)=>{
      const x=(f.n[j]||0)*it.g/100;if(!x)return;
      food[c]+=x;
      (src[c]=src[c]||{})[it.name]=((src[c]||{})[it.name]||0)+x;
    });
  });
  COLS.forEach(c=>{v[c]=food[c]});
  const supp={};
  E.supps().forEach(sp=>{if(!E.suppTaken(sp.id,d))return;Object.keys(sp.v).forEach(c=>{if(!(c in v))return;v[c]+=sp.v[c];supp[c]=(supp[c]||0)+sp.v[c];(src[c]=src[c]||{})[sp.t]=((src[c]||{})[sp.t]||0)+sp.v[c]})});
  const top={};Object.keys(src).forEach(c=>{top[c]=Object.keys(src[c]).map(n=>[n,src[c][n]]).sort((a,b)=>b[1]-a[1]).slice(0,3)});
  return{v:v,food:food,supp:supp,top:top};
};
/* how a nutrient stands against its daily target: share (0 to 1+), a short verdict and a colour class */
E.rdaState=function(r,val){
  if(r.kind==='info'||!r.v)return{pct:null,cls:'info'};
  const pct=val/r.v;
  if(r.kind==='max')return{pct:pct,cls:pct<=.8?'ok':pct<=1?'near':'over'};
  return{pct:pct,cls:pct>=.9?'ok':pct>=.5?'near':'low'};
};

/* ---- a week of nutrients, for the weekly report and the gaps ---- */
E.nutrientWeek=function(days){
  days=days||7;
  const s=S(),ks=[];for(let i=0;i<days;i++)ks.push(E.keyOffset(-i));
  const logged=ks.map(k=>s.days[k]).filter(d=>d&&!d.compact&&Object.keys(d.done||{}).length>=2);
  const avg={};COLS.forEach(c=>{avg[c]=0});
  logged.forEach(d=>{const n=E.nutrients(d);COLS.forEach(c=>{avg[c]+=n.v[c]/logged.length})});
  return{days:logged.length,avg:avg};
};
/* foods from the mess menu and your staples that are rich in a nutrient, per serving, best first */
E.richIn=function(col,meal,n){
  const j=IX[col],pool=E.poolFor(meal||E.mealNowKey());
  return pool.map(E.food).filter(f=>f&&f.n&&!f.out).map(f=>({f:f,x:(f.n[j]||0)*f.ug/100})).filter(o=>o.x>0).sort((a,b)=>b.x-a.x).slice(0,n||3).map(o=>o.f.name);
};
E.mealNowKey=function(){const t=E.nowMin();return t>=360&&t<660?'breakfast':t>=660&&t<960?'lunch':t>=1140&&t<1440?'dinner':'lunch'};

/* ---- energy: what you ate against what the body used, once Samsung Health has told us about the day ---- */
/* resting energy, Mifflin-St Jeor for a man; the same equation the calorie target already uses */
E.bmr=function(kg){const c=S().cfg;return Math.round(10*(kg||E.trend()||S().startW)+6.25*c.height-5*c.age+5)};
/* Samsung Health's active kcal (walking, steps and any recorded workout) plus resting energy. Watches and phones are estimates and can be well off in either direction. */
E.energyDay=function(d,k){
  d=d||E.day();
  const eaten=Math.round(E.totals(d).k),bmr=E.bmr(k?E.trendAt(k):E.trend()),act=d.hAct>0?Math.round(d.hAct):null;
  if(act==null)return{eaten:eaten,bmr:bmr,act:null,out:null,net:null};
  const lift=d.hWork&&d.hWork.kcal?Math.round(d.hWork.kcal):0;
  /* today is only partly over: resting energy is counted for the hours that have passed, so the balance is a fair running total */
  const isToday=!k||k===E.dkey(),frac=isToday?Math.max(.05,Math.min(1,(E.nowMin()-(S().cfg.dayStart||0)*60)/1440)):1,rest=Math.round(bmr*frac);
  return{eaten:eaten,bmr:bmr,rest:rest,act:act,walk:Math.max(0,act-lift),lift:lift,out:rest+act,net:eaten-(rest+act),part:frac<1};
};
/* The honest cross-check: what your trend says you really burn, set against what you log. Needs two weeks of weigh-ins and logging. */
E.energyCheck=function(){
  const s=S(),t0=E.keyOffset(-14);
  const ks=[];for(let i=1;i<=14;i++)ks.push(E.keyOffset(-i));
  const logged=ks.map(k=>s.days[k]).filter(d=>d&&!d.compact&&Object.keys(d.done||{}).length>=2);
  const ws=Object.keys(s.weights).filter(k=>k>=t0);
  if(logged.length<10||ws.length<7)return null;
  const eaten=logged.reduce((a,d)=>a+E.totals(d).k,0)/logged.length;
  const dTrend=E.trendAt(E.keyOffset(-1))-E.trendAt(t0),perDay=dTrend/13;   /* kg per day, negative while losing */
  const burned=eaten-perDay*7700;                                            /* eaten minus the energy that left the body as weight */
  return{eaten:Math.round(eaten),burned:Math.round(burned),trend:Math.round(dTrend*100)/100,predicted:Math.round(-(E.maint(E.trend())-eaten)*13/7700*100)/100,days:logged.length};
};
/* A plain reading of the cross-check: do the logged meals and the scale agree? Over two weeks 1 kg of trend is about 7,700 kcal. */
E.energyVerdict=function(){
  const c=E.energyCheck();if(!c)return null;
  const gap=c.trend-c.predicted,perDay=Math.round(gap*7700/14),maint=Math.round(E.maint(E.trend()));
  let tone='good',title='The log and the scale agree',text='Over '+c.days+' logged days you ate about '+c.eaten.toLocaleString('en-GB')+' kcal a day and your trend moved '+(c.trend<=0?'down ':'up ')+Math.abs(c.trend).toFixed(2)+' kg. That fits what the plan predicted, so your numbers can be trusted.';
  if(gap>=.4){tone='warn';title='The scale is slower than the log says';text='Your log predicts '+Math.abs(c.predicted).toFixed(2)+' kg '+(c.predicted<=0?'down':'up')+' and the trend moved '+(c.trend<=0?'down ':'up ')+Math.abs(c.trend).toFixed(2)+' kg. That is about '+Math.abs(perDay)+' kcal a day more than logged: usually rice, oil and mess servings run bigger than the entry. Check the portion on your biggest meals before cutting calories.'}
  else if(gap<=-.4){tone='info';title='The scale is faster than the log says';text='Your trend moved '+(c.trend<=0?'down ':'up ')+Math.abs(c.trend).toFixed(2)+' kg against '+Math.abs(c.predicted).toFixed(2)+' predicted. Water, a missed weigh-in or small portions can do that. Keep protein up and do not cut further.'}
  return{tone:tone,title:title,text:text,check:c,maint:maint,burned:c.burned};
};
})();
