/* data.js: foods, mess menu, rehab plan, default routine. Food nutrients come from IFCT 2017 (see nutri-data.js). */
(function(){
'use strict';
const HS=window.HS=window.HS||{};

/* Foods. The nutrients of every food (per 100 g) live in nutri-data.js, generated from IFCT 2017 ingredients and the recipes in
   prototype/tools/nutrition (see REPORT.md there). This file turns those rows into food objects and holds the mess menu. */
const COLS=HS.NUT_COLS,IX={};COLS.forEach((c,i)=>{IX[c]=i});
HS.NUT_IX=IX;

const CARB=/rice|pulao|biryani|chapati|phulka|idli|dosa|paratha|poha|upma|pav\b|pongal|semeya|uttapam|kallappam|bread|vada|parotta|chocos|corn flakes|fryums|pappad|puttu|appam|noodles|oats|momos|roll|sandwich|pizza|samosa|fries/i;

/* emoji per food, for recognition at a glance */
const EMO=[[/shawarma|alfaham|roll/i,'\u{1F32F}'],[/omelette|bhurji/i,'\u{1F373}'],[/egg/i,'\u{1F95A}'],[/fish|tuna/i,'\u{1F41F}'],[/chicken/i,'\u{1F357}'],[/beef/i,'\u{1F969}'],[/paneer/i,'\u{1F9C0}'],
  [/protein bar|whey|chikki/i,'\u{1F4AA}'],[/peanut|almond|makhana|dates|chana,? roasted|roasted chana/i,'\u{1F95C}'],[/soya|pulses|rajma|chole|chana|lobia|kadala|peas/i,'\u{1FAD8}'],
  [/biryani|rice|pulao|puttu/i,'\u{1F35A}'],[/chapati|phulka|paratha|parotta|pav\b|bread|pappad|sandwich/i,'\u{1FAD3}'],[/idli/i,'\u{1F358}'],[/dosa|uttapam|kallappam|appam/i,'\u{1F32F}'],[/vada|fryums|fried|fry\b|samosa|fries|chips|pori/i,'\u{1F35F}'],
  [/pizza/i,'\u{1F355}'],[/momos/i,'\u{1F95F}'],[/maggi|noodles/i,'\u{1F35C}'],
  [/salad|pickle/i,'\u{1F957}'],[/milk|buttermilk|curd|raitha|lassi|oats/i,'\u{1F95B}'],[/black tea|tea|coffee|chai/i,'☕'],[/banana/i,'\u{1F34C}'],[/apple/i,'\u{1F34E}'],[/orange/i,'\u{1F34A}'],[/grapes/i,'\u{1F347}'],[/mango/i,'\u{1F96D}'],[/pineapple/i,'\u{1F34D}'],
  [/papaya|watermelon|fruits|guava|pomegranate|sapota|muskmelon/i,'\u{1F349}'],[/coconut water/i,'\u{1F965}'],[/juice|soda|soft drink/i,'\u{1F379}'],
  [/ice-cream/i,'\u{1F368}'],[/gulab|halwa|boondi|kheer|custard|balushahi|jaggery/i,'\u{1F36E}'],[/shake/i,'\u{1F964}'],[/biscuit/i,'\u{1F36A}'],[/chocos|flakes/i,'\u{1F963}'],
  [/aloo|potato/i,'\u{1F954}'],[/gobhi|bhindi|palak|corn|veg|gourd|lowki|poriyal|salan|methi/i,'\u{1F966}'],[/dal|sambar|rasam|curry|masala|stew|kuruma|kadhi|gatte|manchurian|pakwana|bhaaji|sabji/i,'\u{1F35B}'],
  [/poha|upma|semeya|pongal/i,'\u{1F963}'],[/chutney/i,'\u{1F963}']];
HS.emoji=function(name){for(let i=0;i<EMO.length;i++)if(EMO[i][0].test(name))return EMO[i][1];return '\u{1F37D}️'};

/* what a food is, for the tabs and the loot-style colours: protein if it is protein-dense, carb by name, treat if sugary or outside */
function catOf(f){
  if(f.out||f.sugar)return 'treat';
  const d=f.p/Math.max(1,f.kcal);
  if(f.p>=10||d>=.15||(f.p>=5&&d>=.045&&!CARB.test(f.name)))return 'protein';
  return CARB.test(f.name)?'carb':'side';
}
const TIERS={A:'IFCT 2017 value',B:'Recipe built from IFCT 2017 ingredients',C:'Typical value (pack label or restaurant), approximate'};
HS.TIERS=TIERS;
function finish(f){
  f.k100=f.n[0];f.p100=f.n[1];f.c100=f.n[2];f.f100=f.n[3];f.fi100=f.n[4];
  f.kcal=Math.round(f.k100*f.ug/100);f.p=Math.round(f.p100*f.ug/10)/10;f.c=Math.round(f.c100*f.ug/10)/10;f.f=Math.round(f.f100*f.ug/10)/10;f.fi=Math.round(f.fi100*f.ug/10)/10;
  f.cat=catOf(f);
  /* rarity by protein density: loot-style colour on tiles */
  const dens=f.p/Math.max(1,f.kcal);
  f.rar=f.sugar||f.out?'treat':dens>=.14?'legend':dens>=.08?'epic':dens>=.05?'rare':'common';
  return f;
}
/* a food made from your own label: per serving of g grams (kcal, protein, carbs, fat, fibre, sugar, sodium in mg) */
HS.mkCustom=function(o){
  const g=o.g>0?o.g:100,per=x=>(+x||0)/g*100,n=COLS.map(()=>0);
  n[IX.k]=per(o.kcal);n[IX.p]=per(o.p);n[IX.c]=per(o.c);n[IX.f]=per(o.f);n[IX.fi]=per(o.fi);n[IX.su]=per(o.su);n[IX.na]=per(o.na);
  const f={name:o.name,unit:o.unit||'serving',ug:g,sugar:!!o.sugarPen,out:!!o.out,tier:'L',note:o.note||'From your own label or estimate.',n:n.map(x=>Math.round(x*100)/100),custom:true};
  return finish(f);
};
/* the old API: a food from a name and kcal only (kept so older saves and typed input still work) */
HS.mkFood=function(n,k,p,u,fl){
  const f=HS.mkCustom({name:n,kcal:+k,p:+p,g:100,unit:u||'serving',out:(fl||'').includes('o'),sugarPen:(fl||'').includes('s')});
  f.tier='L';f.note='Your own entry: kcal only.';return f;
};
const DB=HS.DB={};
HS.NUT_ROWS.forEach(r=>{
  const f=finish({name:r[0],unit:r[1],ug:r[2],sugar:r[3].includes('s'),out:r[3].includes('o'),tier:r[4],note:r[5],n:r[6].split(',').map(Number)});
  DB[f.name]=f;
});
/* names the app used before this update, so saved days still find their food */
HS.ALIAS={'Soya chunks (60 g)':'Soya chunks, dry','Boiled chicken (100 g)':'Chicken breast, raw'};

/* IIM Kozhikode students mess, October 2026 (one weekly rotation, Mon to Sun), typed from the printed menu */
const FRUIT=['Banana','Papaya','Watermelon','Mixed fruits','Banana','Watermelon','Papaya'];
const CEREAL=['Chocos','Corn flakes','Chocos','Corn flakes','Chocos','Corn flakes','Chocos'];
const MENU=[
 {b:['Idli','Medu vada','Coconut chutney','Sambar'],l:['Ash gourd dal','Broad beans aloo','Punjabi chole','Lemon rice','Rasam','Buttermilk','Golden corn gobhi dry','Egg pepper roast'],d:['Basanti pulao','Masala dal','Fryums','Gulab jamun','Kadai chicken','Kadai paneer']},
 {b:['Methi paratha','Pongal','Aloo matar sabji','Coconut chutney'],l:['Palak dal','Alu gobhi dry','Kadhi pakoda','Curry leaves rice','Sambar','Jeera buttermilk','Rajma masala','Fish curry'],d:['Veg manchurian','Snake gourd chenna dal dry','Schezuan fried rice','Moong dal thadka','Boondi raitha','Fryums','Ice-cream']},
 {b:['Masala dosa','Veg poha','Sambar','Coriander mint chutney'],l:['Dal tadka','Guthi vangai','Veg kofta curry','Tomato rice','Rasam','Buttermilk','Soya curry','Egg tikka masala','Halwa (dal/carrot)'],d:['Kadala curry','Lowki tomatar','Veg biryani','Chana dal','Curd','Fryums','Palak paneer','Pahdi chicken']},
 {b:['Kallappam','Dal pakwana','Upma','Coriander mint chutney','Vegetable stew'],l:['Bengal gram dal fry','Dum aloo banaras','Rajma raseela','Ghee rice (pulao)','Sambar','Buttermilk','Besan gatte','Fish curry (Nellore)'],d:['Mutter masala','Mix veg poriyal','Jeera rice','Tomato pappu','Jeera buttermilk','Fryums','Semiya kheer','Shahi paneer','Chicken kolhapuri']},
 {b:['Aloo paratha','Veg wheat upma','Curd','Coriander mint chutney'],l:['Dal makkani','Corn palak','Dondakai dum fry','Corn pulao','Rasam','Buttermilk','Bhindi kurkure','Egg curry'],d:['Mirchi ka salan','Hyd paneer dum biryani','Hyd chicken dum biryani','Onion cucumber raitha','Fruit custard']},
 {b:['Uttapam','Semeya','Coriander mint chutney','Coconut chutney'],l:['Yellow dal','Kadai veg dry','Paneer lababdar','Tamarind rice','Sambar','Masala buttermilk','Sweet boondi'],d:['Aloo methi dry','Chole masala','Bhagara rice','Dal tadka','Curd','Fryums','Peanut masala','Egg kolhapuri']},
 {b:['Pav','Ragi dosa','Bhaaji','Red chutney'],l:['Arhar dal','Honey chilli potato','Soya capsicum','Tawa pulao','Rasam','Jeera buttermilk','Lobia masala','Kerala fish curry'],d:['White peas kuruma','Aalu bhindi','Veg pulao','Dal maharani','Buttermilk','Fryums','Balushahi','Paneer tikka masala','Chicken tikka masala']}
];
/* Mess menu entries that have no database row are skipped, so a missing item never breaks the log. */
HS.menuFor=function(meal,di){
  if(meal==='snack')return [];
  const m=MENU[di];let out;
  const salad=meal==='lunch'?(di===0?'Green salad':'Veg salad'):(di===4?'Onion salad':'Veg salad');
  if(meal==='breakfast')out=m.b.concat([di===6?'Omelette':'Boiled egg',CEREAL[di],'Boiled pulses',FRUIT[di],'Bread, butter, jam','Milk','Tea (sugar)','Tea (no sugar)','Coffee (sugar)','Coffee (no sugar)']);
  else if(meal==='lunch')out=[salad,'Chapati','Plain rice','Pappad'].concat(m.l);
  else out=[salad].concat(di===4?[]:['Chapati','Phulka'],['Plain rice','Pickle'],m.d);
  return out.filter(n=>{if(DB[n])return true;(HS.MENU_MISSING=HS.MENU_MISSING||{})[n]=1;return false});   /* a printed dish without a row is recorded here, and a test fails on it */
};
/* the whole day's menu in one list, for the "Today's menu" sheet */
HS.menuDay=function(di){return{breakfast:HS.menuFor('breakfast',di),lunch:HS.menuFor('lunch',di),dinner:HS.menuFor('dinner',di)}};
/* what you bring or buy yourself: protein you add to the mess meals, and snacks */
HS.STAPLES=['Boiled egg','Egg white','Omelette','Chicken breast, cooked','Chicken breast, raw','Soya chunks, boiled','Soya chunks, dry','Paneer, plain','Curd','Milk','Protein bar (20 g protein)','Protein bar (10 g protein)','Plant protein powder (1 scoop)','Whey protein (1 scoop)','Peanut butter','Roasted chana','Peanuts, roasted','Almonds','Makhana, roasted','Banana','Apple','Tea (no sugar)','Coffee (no sugar)','Tea (sugar)','Black tea or coffee'];
HS.OUTSIDE=['Shawarma (full)','Alfaham (half)','Shake','Parotta','Beef fry','Fried chicken (2 pc)','Biscuits','Soft drink','Chai + biscuits','Samosa','Vada pav','Veg momos (6 pc)','Chicken momos (6 pc)','Maggi noodles (1 pack)','French fries','Chicken biryani (Calicut)','Chicken fried rice','Egg roll','Chicken roll','Veg sandwich','Pizza slice','Pazham pori','Banana chips','Unniyappam','Fresh juice (with sugar)','Lime soda (sweet)','Sweet lassi','Peanut chikki'];

/* Rehab: copied from the external physio's written plan. Third value is the animation key.
   A fourth value of 1 marks an exercise the user chose to skip. "S/B" is kept as written and drawn as a Swiss ball.
   A fifth value {sides:'each'} means do the sets on each side (knee to chest: 3 holds on the left leg, then 3 on the right);
   {sides:'alt'} means the sets alternate sides (bird dog: left, right, left, right).
   Knee to chest is held for 30 seconds because the user asked for it; the written sheet says 10 seconds, so confirm it with the physio. */
HS.BLOCK=[['Lumbar rotation','8 × 3','rot'],['Knee-to-chest stretch','30 sec × 3 each leg','kneechest',0,{sides:'each'}],['Cobra','10 sec × 3','cobra'],['Pelvic bridge + adductor pillow squeeze','20 sec × 3','bridge'],['Knee range-of-motion exercise','4 to 5 days a week','heelslide']];
HS.RDAYS=[
 {t:'Day 1: core and stability',x:[['Pallof press','10 × 3 each side','pallof',0,{sides:'each'}],['Dead bug','20 sec × 3','deadbug'],['Superman','20 sec × 3','superman'],['Push-up plank','10 sec × 3','plank'],['Jefferson curl','10 × 2',null,1],['Seated hinges','10 × 2','hinge'],['Uneven-load farmer\'s walk','3 laps × 2 sets','farmer',0,{sides:'alt'}]]},
 {t:'Day 2: S/B work',x:[['S/B lumbar extension','3 sec × 10 reps','sbext'],['S/B squats','8 × 3','sbsquat'],['S/B bridging','20 sec × 4','sbbridge'],['S/B plank','20 sec × 4','sbplank'],['S/B bird dog','20 sec × 4','birddog',0,{sides:'alt'}],['Side plank','20 sec × 2 each side','sideplank',0,{sides:'each'}],['Step-ups to the side','8 × 3 each leg','stepup',0,{sides:'each'}],['S/B calf raise','12 × 3','sbcalf'],['Static squats, eyes closed','30 sec × 2','static']]},
 {t:'Day 3: lower-body strength',x:[['Squats','8 × 3','squat'],['Trap-bar deadlift','8 × 3','trapbar'],['Split squats','8 × 3','split'],['Sumo squat','8 × 3','sumo'],['Hip thrust','10 × 3','hipthrust'],['Calf raise','15 × 3','calf'],['Single-leg balance','20 sec × 3 each leg','balance',0,{sides:'each'}]]}
];
/* which rehab day goes with which gym session */
HS.REHAB_FOR={Push:'Day 1',Pull:'Day 2',Legs:'Day 3',Rest:'Day 1 and a walk'};

/* Default gym routine. Everything here is editable in Settings. cap=true flags lifts covered by the user's own 30 to 40 kg limit. */
HS.ROUTINE_DEFAULT={
  Push:[{n:'Incline dumbbell press',g:'Chest',sets:3,reps:10},{n:'Pec deck fly',g:'Chest',sets:3,reps:12},{n:'Seated dumbbell shoulder press',g:'Shoulders',sets:3,reps:10},{n:'Lateral raise',g:'Shoulders',sets:3,reps:12},{n:'Rope pushdown',g:'Triceps',sets:3,reps:12},{n:'Overhead cable extension',g:'Triceps',sets:3,reps:12}],
  Pull:[{n:'Lat pulldown',g:'Back',sets:3,reps:10},{n:'Seated cable row',g:'Back',sets:3,reps:10},{n:'Dumbbell curl',g:'Biceps',sets:3,reps:12},{n:'Hammer curl',g:'Biceps',sets:3,reps:12}],
  Legs:[{n:'Squats',g:'Quads',sets:3,reps:8,cap:true},{n:'Trap-bar deadlift',g:'Posterior chain',sets:3,reps:8,cap:true},{n:'Split squats',g:'Quads',sets:3,reps:8},{n:'Sumo squat',g:'Glutes',sets:3,reps:8},{n:'Hip thrust',g:'Glutes',sets:3,reps:10},{n:'Calf raise',g:'Calves',sets:3,reps:15}]
};
HS.CAP_KG=40;
})();
