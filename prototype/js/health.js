/* health.js: Samsung Health through Android Health Connect, read-only.
   Samsung Health writes steps, distance, floors, active calories, sleep (with stages), heart rate, weight and workouts into Health Connect, and this module reads them.
   It only runs inside the Android app. Nothing here is written back and nothing leaves the phone. */
(function(){
'use strict';
const HS=window.HS=window.HS||{};
const E=HS.E,H=HS.health={};
const P=()=>HS.native&&HS.native.plugin('Health');
const READ=['steps','distance','calories','sleep','weight','workouts','restingHeartRate','heartRate','flightsClimbed'];
/* the first version asked for these five only; an older connection has to be refreshed once to add the rest */
const CORE=['steps','calories','sleep','weight','workouts'];
H.native=()=>!!(HS.native&&HS.native.native()&&P());
H.types=READ;
H.missing=function(){const got=(E.S().health.got||[]);return E.S().health.on?READ.filter(t=>got.indexOf(t)<0):[]};

H.connect=async function(){
  const p=P();
  if(!p)return{ok:false,msg:'Samsung Health sync works in the Android app.'};
  try{
    const av=await p.isAvailable();
    if(!av.available)return{ok:false,msg:(av.reason||'Health Connect is not available on this phone.')+' On Android 13 or older, install Health Connect from the Play Store, then turn on Samsung Health inside it.'};
    const st=await p.requestAuthorization({read:READ,write:[]});
    const got=st.readAuthorized||[];
    if(!got.length)return{ok:false,msg:'No permission was granted. Open Health Connect, App permissions, Habit Sync, and allow reading.'};
    const S=E.S();S.health.on=true;S.health.got=got;E.save();
    return{ok:true,got:got};
  }catch(e){return{ok:false,msg:'Could not connect: '+((e&&e.message)||e)}}
};

const sum=(r)=>(r&&r.samples||[]).reduce((a,s)=>a+(s.value||0),0);
H.sync=async function(){
  const p=P(),S=E.S();
  if(!p)return{ok:false,msg:'Samsung Health sync works in the Android app.'};
  if(!S.health.on)return{ok:false,msg:'Connect Samsung Health first.'};
  const now=new Date(),mid=new Date(E.dkey()+'T00:00:00');   /* the app's day, which can run past midnight */
  const out={ok:true},d=E.day();
  const day={startDate:mid.toISOString(),endDate:now.toISOString(),bucket:'day',aggregation:'sum'};
  const tryit=async(label,fn)=>{try{await fn()}catch(e){out.errors=(out.errors||[]).concat(label)}};
  await tryit('steps',async()=>{const v=Math.round(sum(await p.queryAggregated(Object.assign({dataType:'steps'},day))));if(v>=0){out.steps=v;d.hSteps=v;if(v>0&&(!d.steps||+d.steps<v))d.steps=String(v);   /* a zero reading is not a logged day */if(v>0&&!d.stepsAward){d.stepsAward=true;E.stat('AGI',1)}}});
  await tryit('calories',async()=>{const v=Math.round(sum(await p.queryAggregated(Object.assign({dataType:'calories'},day))));if(v>=0){out.act=v;d.hAct=v}});
  await tryit('distance',async()=>{const v=sum(await p.queryAggregated(Object.assign({dataType:'distance'},day)));if(v>=0){out.km=Math.round(v/10)/100;d.hDist=out.km}});
  /* floors cannot be aggregated by the plugin, so the day's records are read and added up */
  await tryit('floors',async()=>{const v=Math.round(sum(await p.readSamples({dataType:'flightsClimbed',startDate:mid.toISOString(),endDate:now.toISOString(),limit:500})));if(v>=0){out.floors=v;d.hFloors=v}});
  await tryit('heartRate',async()=>{
    const a=await p.queryAggregated({dataType:'heartRate',startDate:mid.toISOString(),endDate:now.toISOString(),bucket:'day',aggregation:['average','max']});
    const b=(a&&a.samples||[])[0];
    if(b&&b.values&&b.values.average>0)d.hHr={avg:Math.round(b.values.average),max:Math.round(b.values.max||0)};
    else if(b&&b.value>0)d.hHr={avg:Math.round(b.value),max:0};
  });
  await tryit('restingHeartRate',async()=>{
    const r=await p.readSamples({dataType:'restingHeartRate',startDate:new Date(now.getTime()-3*864e5).toISOString(),endDate:now.toISOString(),limit:5,ascending:false});
    const x=(r.samples||[])[0];if(x&&x.value>25&&x.value<150){out.rhr=Math.round(x.value);d.hRhr=out.rhr}
  });
  await tryit('sleep',async()=>{
    const from=new Date(mid.getTime()-6*3600e3);   /* from 6pm yesterday */
    const r=await p.readSamples({dataType:'sleep',startDate:from.toISOString(),endDate:now.toISOString(),limit:30});
    let mins=0;const st={deep:0,rem:0,light:0,awake:0};
    (r.samples||[]).forEach(s=>{
      if(new Date(s.endDate)<mid)return;   /* a session that ended before midnight is not last night's */
      let m=s.value||0;
      if(s.stages&&s.stages.length){
        m-=s.stages.filter(x=>x.stage==='awake'||x.stage==='inBed').reduce((a,x)=>a+(x.durationMinutes||0),0);
        s.stages.forEach(x=>{if(st[x.stage]!=null)st[x.stage]+=x.durationMinutes||0});
      }
      mins+=Math.max(0,m);
    });
    if(mins>60){const hrs=Math.round(mins/60*10)/10;out.sleep=hrs;d.hSleep=hrs;if(st.deep+st.rem+st.light>0)d.hSleepSt={deep:Math.round(st.deep),rem:Math.round(st.rem),light:Math.round(st.light),awake:Math.round(st.awake)};if(d.sleep==null)E.logSleep(Math.round(hrs*2)/2)}
  });
  await tryit('weight',async()=>{
    const r=await p.readSamples({dataType:'weight',startDate:new Date(now.getTime()-3*864e5).toISOString(),endDate:now.toISOString(),limit:5,ascending:false});
    const s=(r.samples||[])[0];
    if(s&&s.value>30&&s.value<250){out.weight=Math.round(s.value*10)/10;d.hWeight=out.weight}
  });
  await tryit('workouts',async()=>{
    const r=await p.queryWorkouts({startDate:mid.toISOString(),endDate:now.toISOString(),limit:20});
    const w=r.workouts||[];
    if(w.length){
      /* walking and running sessions on their own: these are the "walk calories". Everything else (lifting, sport) is the workout. */
      const isWalk=x=>/walking|running|hiking|treadmill/i.test(x.workoutType||''),wk=w.filter(isWalk),rest=w.filter(x=>!isWalk(x));
      const tot=a=>({min:Math.round(a.reduce((m,x)=>m+(x.duration||0),0)/60),kcal:Math.round(a.reduce((m,x)=>m+(x.totalEnergyBurned||0),0))});
      d.hWork=rest.length?Object.assign(tot(rest),{types:rest.map(x=>x.workoutType).slice(0,3)}):null;
      d.hWalk=wk.length?tot(wk):null;
      out.work=d.hWork;
    }
  });
  S.health.last=Date.now();E.save();
  if(out.errors&&out.errors.length>=5){out.ok=false;out.msg='Health Connect did not answer. Open Samsung Health once, then try again.'}
  return out;
};
/* quiet refresh when the app opens, at most every 10 minutes */
H.auto=async function(){
  const S=E.S();
  if(!H.native()||!S.health.on||Date.now()-(S.health.last||0)<600000)return null;
  try{return await H.sync()}catch(e){return null}
};
})();
