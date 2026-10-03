/* notify.js: friendly reminders from the System, scheduled on the phone itself (Android app only, no internet needed).
   Each day gets a different line, so the nudges never go stale. Teasing follows your roast setting and never touches the body. */
(function(){
'use strict';
const HS=window.HS=window.HS||{};
const E=HS.E,N=HS.notify={};
N.DEFAULT={weigh:'08:00',lunch:'13:00',dinner:'20:00',rehab:'18:30',clear:'21:30'};
const LN=()=>HS.native&&HS.native.plugin('LocalNotifications');
N.available=()=>!!(HS.native&&HS.native.native()&&LN());
const SLOTS=['weigh','lunch','dinner','rehab','clear'];
const MSG={
  weigh:{nice:['Morning, {n}. Scale first, then food. 15 aura waiting.','A quick weigh-in keeps the trend honest. Ten seconds.','New day, new data point. Step on and log last night’s sleep.'],
    playful:['The scale is lonely. Step on. It will not bite.','Weigh-in o’clock. Free aura, no cardio required.','Your streak is looking at your shoes. Step on the scale.'],
    savage:['The System cannot fix what it will not measure. Step on.','Skipping the scale does not make the number shy. It makes you blind.','Weigh in. The excuses can wait in the corridor.']},
  lunch:{nice:['Lunch window is open. Build the plate, protein first.','Log lunch while it is fresh. Takes ten seconds.','Fuel up. Three stars means protein and a veg side.'],
    playful:['Lunch will not log itself. Tap, tap, plate.','Your protein target is hungry. Feed it.','Skipped meals get logged too. The System sees everything.'],
    savage:['Lunch is open. Your protein target will not fill on vibes.','Log it or admit you ate air.','The mess has food. You have a phone. Connect the two.']},
  dinner:{nice:['Dinner window is open. Log it, then wind the day down.','Close the protein gap tonight: eggs, soya or chicken.','Log dinner now and the day is almost cleared.'],
    playful:['Dinner time. Plates do not log themselves.','Final meal of the day. Make it count, then clear the day.','The protein bar is a little short. Dinner can fix that.'],
    savage:['Dinner is the last chance to hit your protein. Do not waste it.','Another day, another plate you pretend to remember. Log it.','Eat, then log. In that order. Both.']},
  rehab:{nice:['Ten minutes of rehab now means a healthier knee later.','Rehab time. Gentle and steady wins.','Your back and knee asked for their daily session.'],
    playful:['Rehab: boring work, legendary results. Start the guided session.','Your knee wrote you a polite reminder. Start rehab.','Healing is a quest too. Cleared one move at a time.'],
    savage:['Skip rehab and you are trading a week of progress for a few minutes of nothing.','Your knee does not negotiate. Rehab. Now.','The boring work is the work. Open the guided session.']},
  clear:{nice:['Clear the day and open your chest. Loot inside.','Almost done. Finish the quests and log honestly.','Wrap up the day. Sleep is the last quest.'],
    playful:['Your chest is waiting. So is your quest list.','The day ends soon. Clear it and claim the loot.','Plot twist: quests do not clear themselves.'],
    savage:['The day is almost over. The quest list is not. Fix one.','Midnight is when "tomorrow" lies best. Clear the day.','Open quests, closed chest. Your call.']}
};
const pick=(arr,seed)=>arr[seed%arr.length];
const hash=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0};

N.enable=async function(){
  const p=LN();
  if(!p)return{ok:false,msg:'Reminders work in the Android app.'};
  try{
    let st=await p.checkPermissions();
    if(st.display!=='granted')st=await p.requestPermissions();
    if(st.display!=='granted')return{ok:false,msg:'Notifications are blocked. Allow them in Android Settings, Apps, Habit Sync, Notifications.'};
    try{await p.createChannel({id:'hs-nudges',name:'Quest reminders',description:'Daily nudges from the System',importance:4,visibility:1,vibration:true})}catch(e){}
    setTimeout(N.schedule,50);
    return{ok:true};
  }catch(e){return{ok:false,msg:'Could not turn on reminders: '+((e&&e.message)||e)}}
};
N.disable=async function(){
  const p=LN();if(!p)return;
  try{const pend=await p.getPending();if(pend.notifications&&pend.notifications.length)await p.cancel({notifications:pend.notifications})}catch(e){}
};
/* rebuild the next 14 days. Called on open, when the app is left, and when times change. Today's slot is skipped if it is already done. */
N.schedule=async function(){
  const p=LN(),S=E.S(),rm=S.remind;
  if(!p||!rm.on)return;
  try{
    const lvl=S.cfg.roast==='off'?'nice':S.cfg.roast,name=S.cfg.name||'Hunter',today=E.dkey(),d=S.days[today]||{};
    const done={weigh:!!d.weighed,lunch:!!(d.done&&d.done.lunch),dinner:!!(d.done&&d.done.dinner),rehab:!!(d.reh&&d.reh.done),clear:!!d.closed};
    const list=[],now=Date.now();
    for(let day=0;day<14;day++){
      const k=E.addDays(today,day);
      SLOTS.forEach((slot,si)=>{
        if(day===0&&done[slot])return;
        const t=(rm[slot]||N.DEFAULT[slot]).split(':'),at=new Date(k+'T00:00:00');at.setHours(+t[0],+t[1],0,0);
        if(at.getTime()<=now+30000)return;
        const body=pick(MSG[slot][lvl]||MSG[slot].nice,hash(k+slot)).replace('{n}',name);
        list.push({id:1000+day*10+si,title:'HABIT SYNC',body:body,channelId:'hs-nudges',schedule:{at:at,allowWhileIdle:true},isExactNotification:false,autoCancel:true});
      });
    }
    /* same ids replace the old reminders, so the phone is never left with none: schedule first, then cancel only what is stale */
    if(list.length)await p.schedule({notifications:list});
    const keep=new Set(list.map(x=>x.id)),pend=await p.getPending();
    const stale=(pend.notifications||[]).filter(n=>!keep.has(n.id));
    if(stale.length)await p.cancel({notifications:stale});
  }catch(e){}
};
document.addEventListener('visibilitychange',()=>{if(document.hidden)N.schedule()});
})();
