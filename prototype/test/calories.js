/* calories.js: checks that the food numbers and the workout calorie formulas are right. Pure Node, no browser.
   usage: node prototype/test/calories.js
   Food: every row is well formed, kcal agrees with the macros (Atwater), well-known foods sit inside the ranges published by USDA FoodData Central and IFCT 2017,
   every dish on the printed mess menu has a row, and the totals add up.
   Workouts: the ACSM treadmill equations give the numbers worked out by hand below. */
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'..','js');
const store={};
const sandbox={console,Math,JSON,Object,Array,String,Number,Date,Set,Map,isNaN,parseFloat,parseInt,setTimeout,clearTimeout,
  localStorage:{getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>{delete store[k]}},
  navigator:{},document:{addEventListener(){},hidden:false,visibilityState:'visible'},location:{href:'file:///x'}};
sandbox.window=sandbox;sandbox.self=sandbox;
vm.createContext(sandbox);
['nutri-data.js','data.js','content.js','engine.js','engine-plus.js','nutri.js'].forEach(f=>{
  vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),sandbox,{filename:f});
});
const HS=sandbox.HS,E=HS.E;
let fails=0,n=0;
const ok=(c,msg)=>{n++;if(!c){fails++;console.log('FAIL',msg)}};
const near=(a,b,tol,msg)=>ok(Math.abs(a-b)<=tol,msg+' (got '+a+', want '+b+' ± '+tol+')');

/* ---- the table itself ---- */
const C=HS.NUT_COLS,IX=HS.NUT_IX,rows=HS.NUT_ROWS;
ok(C.length===26&&rows.length>=190,'table size '+C.length+' columns, '+rows.length+' rows');
const known=new Set(['Guava','Sapota (chikoo)']);   /* IFCT prints a lower energy than the macros give for these two fruits; the printed value is kept */
rows.forEach(r=>{
  const v=r[6].split(',').map(Number),name=r[0];
  ok(v.length===C.length&&v.every(x=>isFinite(x)&&x>=0),name+': 26 finite, non-negative numbers');
  ok(r[2]>0&&r[2]<=1000,name+': serving size '+r[2]+' g is plausible');
  const k=v[IX.k],at=4*v[IX.p]+4*v[IX.c]+9*v[IX.f]+2*v[IX.fi],d=Math.abs(k-at);
  if(!known.has(name))ok(d<=12||d/Math.max(at,1)<=.15,name+': kcal '+Math.round(k)+' against '+Math.round(at)+' from protein, carbs, fat and fibre');
  ok(v[IX.p]+v[IX.c]+v[IX.f]<=100.5,name+': macros add up to more than 100 g in 100 g');
  ok(v[IX.su]<=v[IX.c]+.6,name+': sugar '+v[IX.su]+' is more than carbohydrate '+v[IX.c]);
  ok(v[IX.sf]<=v[IX.f]+.6,name+': saturated fat is more than total fat');
  if(!/animal|egg|milk|fish|chicken|fortified|whey|pro/i.test(name)&&v[IX.vd]>3&&!/mushroom/i.test(name))ok(false,name+': vitamin D '+v[IX.vd]+' µg on a food with no animal source');
});
/* ---- anchors: per 100 g, ranges taken from USDA FoodData Central and IFCT 2017 ---- */
const f100=(name,col)=>{const f=HS.DB[name];return f?f.n[IX[col]]:NaN};
[['Chicken breast, raw','k',100,130],['Chicken breast, raw','p',20,24],['Chicken breast, cooked','k',150,175],['Chicken breast, cooked','p',28,33],
 ['Milk','p',3,3.6],['Milk','k',55,70],['Curd','p',3,4],['Plain rice','k',115,140],['Plain rice','p',2.2,3.2],['Chapati','k',230,290],['Chapati','p',7,10],
 ['Boiled egg','k',140,160],['Boiled egg','p',12.5,14],['Boiled egg','f',9,11.5],['Egg white','p',10,12.5],['Banana','k',85,110],['Banana','c',20,26],['Apple','k',45,65],
 ['Whey protein (1 scoop)','p',70,85],['Soya chunks, dry','p',48,54],['Soya chunks, dry','k',320,350],['Peanuts, roasted','k',540,600],['Almonds','k',560,620],['Peanut butter','k',570,640]
].forEach(a=>{const x=f100(a[0],a[1]);ok(x>=a[2]&&x<=a[3],a[0]+' '+a[1]+' per 100 g is '+Math.round(x*10)/10+', published range '+a[2]+' to '+a[3])});
/* vitamin D: only animal foods and fortified products carry any. IFCT prints 0.7 µg per 100 g for a boiled egg (USDA 2.2), so the range spans both */
ok(f100('Boiled egg','vd')>=.5&&f100('Boiled egg','vd')<=2.5,'egg vitamin D per 100 g '+f100('Boiled egg','vd'));
ok(f100('Plain rice','vd')===0&&f100('Banana','vd')===0,'rice and banana have no vitamin D');

/* ---- the printed mess menu: every dish has a row ---- */
for(let di=0;di<7;di++)['breakfast','lunch','dinner'].forEach(m=>{ok(HS.menuFor(m,di).length>=8,'menu day '+di+' '+m+' lists at least 8 foods')});
ok(!HS.MENU_MISSING||Object.keys(HS.MENU_MISSING).length===0,'mess dishes without a row: '+JSON.stringify(Object.keys(HS.MENU_MISSING||{})));
HS.STAPLES.concat(HS.OUTSIDE).forEach(nm=>ok(!!HS.DB[nm],'listed food has a row: '+nm));
ok(HS.menuFor('dinner',4).includes('Hyd chicken dum biryani')&&HS.menuFor('lunch',1).includes('Fish curry'),'Friday dinner and Tuesday lunch show their printed dishes');
ok(HS.STAPLES.some(x=>/^Protein bar/.test(x)),'a protein bar is listed');

/* ---- totals: grams times per-100 g, added up ---- */
const S=E.S();S.days={};
const d=E.day();d.items=[{name:'Boiled egg',g:100,meal:'breakfast'},{name:'Plain rice',g:150,meal:'lunch'}];
const t=E.totals(d),egg=HS.DB['Boiled egg'],rice=HS.DB['Plain rice'];
near(t.k,egg.k100+rice.k100*1.5,.01,'totals add kcal');near(t.p,egg.p100+rice.p100*1.5,.01,'totals add protein');
const nn=E.nutrients(d);near(nn.v.k,t.k,1,'nutrients() and totals() agree on kcal');near(nn.v.p,t.p,.1,'nutrients() and totals() agree on protein');

/* ---- workouts: ACSM treadmill equations, net of resting energy ---- */
/* running costs 0.2 ml O2 per kg per metre, which is 1 kcal per kg per km; walking flat is 0.1 ml, so about 0.5 kcal per kg per km */
near(E.burnEst(82,0,0,10,{rSpd:9,rInc:0}),123,1,'82 kg, 10 min at 9 km/h = 1.5 km = 123 kcal');
near(E.burnEst(82,0,0,10,{rSpd:9}),123,1,'run default incline is flat');
near(E.burnEst(82,0,15,0,{wSpd:5,wInc:9}),134,1,'82 kg, 15 min at 5 km/h and 9% incline');
near(E.burnEst(82,0,60,0,{wSpd:5,wInc:0}),205,1,'82 kg, 60 min walking 5 km/h flat (5 km at 0.5 kcal/kg/km)');
near(E.burnEst(82,60,0,0),287,1,'82 kg, 60 min lifting at 3.5 kcal/kg/h');
near(E.burnEst(80,0,0,30,{rSpd:10}),400,1,'80 kg running 5 km = 400 kcal');
ok(E.burnEst(82,0,0,10,{rSpd:12})>E.burnEst(82,0,0,10,{rSpd:9}),'faster run burns more');
ok(E.burnEst(82,0,30,0,{wInc:9})>E.burnEst(82,0,30,0,{wInc:0}),'incline adds');
ok(E.burnEst(90,0,0,10)>E.burnEst(70,0,0,10),'heavier burns more');
ok(E.burnEst(82,0,0,10,{rSpd:200})===E.burnEst(82,0,0,10,{rSpd:22}),'a typo speed is capped, not believed');
ok(E.burnEst(82,0,0,0)===0&&E.burnEst(82,0,0,0,{wSpd:5})===0,'no minutes, no calories');
/* distance to speed and pace */
near(E.speedOf(1.6,10,9),9.6,.01,'1.6 km in 10 min is 9.6 km/h');near(E.speedOf(0,10,9),9,.01,'no distance falls back to the default');
ok(E.paceTxt(9.6)==='6:15','9.6 km/h is a 6:15 pace, got '+E.paceTxt(9.6));ok(E.paceTxt(10)==='6:00','10 km/h is 6:00, got '+E.paceTxt(10));ok(E.paceTxt(12)==='5:00','12 km/h is 5:00');
/* a walk or run logged by hand, including for yesterday */
(function(){
  const st=E.S(),today=E.dkey(),yk=E.keyOffset(-1);
  st.days={};st.start=E.keyOffset(-30);st.rot={i:3,from:today};   /* Rest is due today */
  ok(E.planFor()==='Rest','today is a rest day');
  st.days[yk]={plan:'Rest',workout:null};
  ok(E.cardioDayOk(yk),'yesterday was a rest day: cardio can be logged for it');
  ok(!E.cardioDayOk(E.keyOffset(-40)),'a day before the start cannot be logged');
  st.days[E.keyOffset(-2)]={plan:'Legs',workout:'done'};
  ok(!E.cardioDayOk(E.keyOffset(-2)),'a day with a finished lift is not a cardio day');
  const rotBefore=st.rot.i,auraBefore=st.aura||0;
  const det={wKm:2.5,rKm:1.6,wSpd:5,rSpd:9.6,wInc:0,rInc:0,src:'manual'};
  const r=E.completeCardio({walk:30,run:10,free:10,det:det},yk);
  ok(r.first&&st.days[yk].cardio===true,'cardio saved on yesterday');
  ok(!(st.days[today]&&st.days[today].cardio),'today is untouched');
  ok(st.rot.i===rotBefore,'cardio never moves the Push, Pull, Legs, Rest rotation');
  const est=E.burnEst(E.trendAt(yk)||st.startW,0,30,10,det);
  ok(st.days[yk].burn===est&&est>150&&est<400,'kcal comes from the typed distance and speed: '+st.days[yk].burn);
  ok(st.days[yk].cardioDet&&st.days[yk].cardioDet.rKm===1.6&&st.days[yk].cardioDet.src==='manual','details are kept for the next time');
  ok(st.days[yk].runFree===10,'no-pain run keeps all ten minutes');
  const r2=E.completeCardio({walk:30,run:10,free:3,kcal:250,det:{wSpd:5,rSpd:9,wInc:9,rInc:0,src:'samsung'}},yk);
  ok(!r2.first&&st.days[yk].burn===250,'a Samsung number replaces the estimate and the aura is paid once');
})();
/* the scale check: the log and the weight trend agree or they do not */
(function(){
  const st=E.S();st.days={};st.weights={};st.startW=84;st.start=E.keyOffset(-30);
  for(let i=1;i<=14;i++){const k=E.keyOffset(-i);st.days[k]={items:[{name:'Plain rice',g:600,meal:'lunch'},{name:'Chapati',g:100,meal:'dinner'}],done:{lunch:1,dinner:1}};st.weights[k]=84-(14-i)*0.02}
  const v=E.energyVerdict();
  ok(v&&v.check&&v.check.days===14,'verdict needs 14 logged days with weigh-ins');
  ok(v&&['good','warn','info'].includes(v.tone)&&v.title.length>5,'verdict has a plain title');
  st.weights={};
  ok(E.energyVerdict()===null,'no weigh-ins, no verdict');
})();
/* energy balance and the scale check */
S.startW=84;S.cfg.height=178;S.cfg.age=30;
near(E.bmr(80),10*80+6.25*178-5*30+5,1,'Mifflin-St Jeor for a man');

console.log(fails?fails+' of '+n+' checks FAILED':'all '+n+' calorie checks passed');
process.exit(fails?1:0);
