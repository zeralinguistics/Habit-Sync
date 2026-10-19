/* widget.js: the bridge to the Android home-screen widgets (Streak, Streak week and Today). The web app tells the native side what to show,
   and collects water poured from a widget while the app was closed. Android app only; in a browser everything here is a no-op.
   Nothing leaves the phone: the numbers go to private app storage on the same device. */
(function(){
'use strict';
const HS=window.HS=window.HS||{};
const E=HS.E,W=HS.widget={};
const P=()=>HS.native&&HS.native.plugin('HabitWidget');
W.available=()=>!!(HS.native&&HS.native.native()&&P());
/* what the pictures need to know */
W.data=function(){
  const d=E.day(),T=E.T(),tot=E.totals(d),cfg=E.cfg(),si=E.sparkInfo(),met=E.pillarsMet(),mv=HS.ui&&HS.ui.nextMove?HS.ui.nextMove():null;
  return{streak:si.n,lit:!!d.spark||met>=E.sparkGoal(),met:met,goal:E.sparkGoal(),shields:E.S().shield.n,hour:Math.floor(E.nowMin()/6)/10,
    kcal:Math.round(tot.k),kcalT:T.kcal,protein:Math.round(tot.p),proteinT:T.protein,water:d.water||0,waterT:cfg.water,steps:+d.hSteps||+d.steps||0,
    next:mv?mv.title:'',week:E.sparkWeek().map(x=>({st:x.st,d:x.d,today:x.today}))};
};
let last='',t=null,fontsReady=false;
/* The widgets are pictures drawn here, in the app's own fonts, at the exact size of each widget on your home screen.
   Only widgets that exist are drawn. They show what the app last knew, so they refresh whenever you use the app. */
W.push=async function(force){
  if(!W.available())return false;
  try{
    const sz=await P().sizes();
    const list=(sz&&sz.widgets)||[];
    if(!list.length)return true;
    const data=W.data(),key=JSON.stringify([data,list]);
    if(!force&&key===last)return true;
    if(!fontsReady){try{await document.fonts.load('700 20px "Exo 2"');await document.fonts.load('700 12px "Rajdhani"');await document.fonts.ready}catch(e){}fontsReady=true}
    const dpr=Math.min(3,Math.max(1.5,sz.density||2)),images=[];
    list.forEach(w=>{
      const sc=Math.min(dpr,900/Math.max(w.w,1)),cv=HS.widgetArt.draw(w.kind,w.w,w.h,sc,data);
      images.push({id:w.id,png:cv.toDataURL('image/png').split(',')[1]});
    });
    const cfg=E.cfg();
    await P().update({day:E.dkey(),dayStart:cfg.dayStart==null?3:cfg.dayStart,images:images});
    last=key;return true;
  }catch(e){return false}
};
W.schedule=function(){clearTimeout(t);t=setTimeout(()=>{W.push()},900)};
/* water poured from a widget while the app was closed */
W.consume=async function(){
  if(!W.available())return 0;
  try{
    const r=await P().consume(),ml=r&&r.water>0?r.water:0;
    if(ml){E.addWater(ml);if(HS.ui&&HS.ui.sys)HS.ui.sys('Added '+ml+' ml of water from your widget.','good',true)}
    return ml;
  }catch(e){return 0}
};
W.start=async function(){
  if(!W.available())return;
  await W.consume();W.push();
  const prev=E.afterSave;E.afterSave=function(){if(prev)prev();W.schedule()};
  document.addEventListener('visibilitychange',()=>{if(document.hidden)W.push(true);else W.consume().then(()=>W.push())});
};
})();
