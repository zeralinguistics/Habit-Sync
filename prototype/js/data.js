/* data.js: foods, mess menu, rehab plan, default routine. All nutrition numbers are rough estimates. */
(function(){
'use strict';
const HS=window.HS=window.HS||{};

/* name|kcal per unit|protein g per unit|unit|flags (s=sugar, o=outside the mess) */
const RAW=`Idli|58|2|pc
Medu vada|130|4|pc
Sambar|80|4|katori
Coconut chutney|60|1|2 tbsp
Methi paratha|180|5|pc
Pongal|230|6|katori
Aloo matar sabji|130|3|katori
Masala dosa|330|6|pc
Veg poha|250|5|plate
Coriander mint chutney|20|0|2 tbsp
Kallappam|120|2|pc
Dal pakwana|300|8|plate
Upma|200|5|plate
Vegetable stew|130|3|katori
Aloo paratha|260|6|pc
Veg wheat upma|190|6|plate
Curd|60|3|katori
Uttapam|190|5|pc
Semeya|200|4|plate
Pav|110|3|pc
Bhaaji|150|3|katori
Ragi dosa|130|3|pc
Red chutney|40|1|2 tbsp
Omelette|150|10|pc
Boiled egg|78|6|pc
Chocos|115|2|bowl|s
Corn flakes|110|2|bowl|s
Boiled pulses|120|8|katori
Banana|105|1|pc
Papaya|60|1|cup
Watermelon|90|2|2 cups
Mixed fruits|80|1|katori
Bread, butter, jam|220|5|2 slices|s
Tea (sugar)|50|1|cup|s
Tea (no sugar)|5|0|cup
Coffee (sugar)|50|1|cup|s
Coffee (no sugar)|5|0|cup
Milk|120|6|glass
Veg salad|25|1|bowl
Chapati|100|3|pc
Plain rice|195|4|katori
Ash gourd dal|110|6|katori
Palak dal|120|7|katori
Dal tadka|130|7|katori
Bengal gram dal fry|140|8|katori
Dal makkani|200|8|katori
Yellow dal|120|7|katori
Arhar dal|120|7|katori
Masala dal|130|7|katori
Moong dal thadka|120|8|katori
Chana dal|140|8|katori
Tomato pappu|120|6|katori
Dal maharani|200|8|katori
Broad beans aloo|120|3|katori
Alu gobhi dry|120|3|katori
Guthi vangai|140|3|katori
Dum aloo banaras|180|3|katori
Corn palak|130|4|katori
Kadai veg dry|120|3|katori
Honey chilli potato|250|3|katori|s
Golden corn gobhi dry|120|3|katori
Bhindi kurkure|150|3|katori
Snake gourd chenna dal dry|110|5|katori
Lowki tomatar|80|2|katori
Mix veg poriyal|90|2|katori
Mirchi ka salan|130|3|katori
Chole masala|180|8|katori
Aloo methi dry|120|3|katori
Aalu bhindi|120|3|katori
Punjabi chole|190|9|katori
Kadhi pakoda|200|6|katori
Veg kofta curry|220|5|katori
Rajma raseela|180|8|katori
Dondakai dum fry|110|2|katori
Paneer lababdar|290|13|katori
Soya capsicum|170|13|katori
Rajma masala|180|8|katori
Soya curry|170|13|katori
Besan gatte|220|8|katori
Lobia masala|170|8|katori
Veg manchurian|250|4|katori
Kadala curry|180|8|katori
Mutter masala|150|6|katori
White peas kuruma|160|7|katori
Peanut masala|230|7|katori
Lemon rice|300|6|plate
Curry leaves rice|300|6|plate
Tomato rice|300|6|plate
Ghee rice (pulao)|340|6|plate
Corn pulao|320|7|plate
Tamarind rice|310|6|plate
Tawa pulao|320|7|plate
Basanti pulao|320|6|plate
Schezuan fried rice|380|8|plate
Veg biryani|400|9|plate
Jeera rice|280|5|plate
Hyd paneer dum biryani|520|17|plate
Hyd chicken dum biryani|560|28|plate
Bhagara rice|320|6|plate
Veg pulao|320|7|plate
Rasam|40|1|katori
Buttermilk|40|2|glass
Jeera buttermilk|40|2|glass
Masala buttermilk|45|2|glass
Pappad|35|1|pc
Fryums|60|1|handful
Halwa (dal/carrot)|250|3|katori|s
Sweet boondi|160|1|handful|s
Gulab jamun|150|2|pc|s
Ice-cream|140|2|pc|s
Semiya kheer|220|5|katori|s
Fruit custard|160|4|katori|s
Balushahi|280|3|pc|s
Boondi raitha|90|3|katori
Onion cucumber raitha|60|3|katori
Egg pepper roast|230|13|2 eggs
Fish curry|190|18|piece
Egg tikka masala|260|14|2 eggs
Fish curry (Nellore)|190|18|piece
Egg curry|240|13|2 eggs
Kerala fish curry|200|18|piece
Kadai chicken|280|26|katori
Kadai paneer|290|14|katori
Palak paneer|260|13|katori
Pahdi chicken|270|26|katori
Shahi paneer|330|14|katori
Chicken kolhapuri|280|26|katori
Egg kolhapuri|250|13|2 eggs
Paneer tikka masala|310|15|katori
Chicken tikka masala|300|27|katori
Egg white|17|4|pc
Soya chunks (60 g)|195|32|serving
Boiled chicken (100 g)|116|22|serving
Shawarma (full)|700|40|pc|o
Alfaham (half)|650|50|half|o
Shake|450|12|glass|so
Parotta|300|6|pc|o
Beef fry|290|26|katori|o
Fried chicken (2 pc)|450|28|2 pc|o
Biscuits|100|1|2 pc|so
Soft drink|140|0|can|so
Chai + biscuits|120|2|plate|so`;

/* grams in one default serving (estimates), by unit and by name */
const UG={'pc':60,'katori':150,'plate':250,'glass':200,'cup':150,'bowl':35,'2 slices':60,'2 eggs':100,'piece':100,'handful':25,'can':330,'2 tbsp':30,'serving':100,'half':300,'2 pc':200,'2 cups':300};
const UGN={'Idli':40,'Medu vada':50,'Chapati':40,'Boiled egg':50,'Egg white':33,'Banana':120,'Pav':40,'Omelette':100,'Gulab jamun':40,'Parotta':100,'Shawarma (full)':300,'Alfaham (half)':300,'Aloo paratha':90,'Methi paratha':80,'Masala dosa':140,'Ragi dosa':100,'Uttapam':120,'Kallappam':70,'Pappad':10,'Balushahi':70,'Ice-cream':80,'Soya chunks (60 g)':60,'Boiled chicken (100 g)':100,'Biscuits':20};
const CARB=/rice|pulao|biryani|chapati|idli|dosa|paratha|poha|upma|pav\b|pongal|semeya|uttapam|kallappam|bread|vada|parotta|chocos|corn flakes|fryums|pappad/i;

/* emoji per food, for recognition at a glance */
const EMO=[[/shawarma|alfaham/i,'\u{1F32F}'],[/omelette/i,'\u{1F373}'],[/egg/i,'\u{1F95A}'],[/fish/i,'\u{1F41F}'],[/chicken/i,'\u{1F357}'],[/beef/i,'\u{1F969}'],[/paneer/i,'\u{1F9C0}'],[/soya|pulses|rajma|chole|chana|lobia|kadala|peas/i,'\u{1FAD8}'],
  [/biryani|rice|pulao/i,'\u{1F35A}'],[/chapati|paratha|parotta|pav\b|bread|pappad/i,'\u{1FAD3}'],[/idli/i,'\u{1F358}'],[/dosa|uttapam|kallappam/i,'\u{1F32F}'],[/vada|fryums|fried|fry\b/i,'\u{1F35F}'],
  [/salad/i,'\u{1F957}'],[/milk|buttermilk|curd|raitha/i,'\u{1F95B}'],[/tea|coffee|chai/i,'☕'],[/banana/i,'\u{1F34C}'],[/papaya|watermelon|fruits/i,'\u{1F349}'],
  [/ice-cream/i,'\u{1F368}'],[/gulab|halwa|boondi|kheer|custard|balushahi/i,'\u{1F36E}'],[/shake|soft drink/i,'\u{1F964}'],[/biscuit/i,'\u{1F36A}'],[/chocos|flakes/i,'\u{1F963}'],
  [/aloo|potato/i,'\u{1F954}'],[/gobhi|bhindi|palak|corn|veg|gourd|lowki|poriyal|salan|methi/i,'\u{1F966}'],[/dal|sambar|rasam|curry|masala|stew|kuruma|kadhi|gatte|manchurian|pakwana|bhaaji|sabji/i,'\u{1F35B}'],
  [/poha|upma|semeya|pongal/i,'\u{1F963}'],[/chutney/i,'\u{1F963}']];
HS.emoji=function(name){for(let i=0;i<EMO.length;i++)if(EMO[i][0].test(name))return EMO[i][1];return '\u{1F37D}️'};

function mkFood(n,k,p,u,fl){
  const ug=UGN[n]||UG[u]||100;
  const f={name:n,kcal:+k,p:+p,unit:u,sugar:(fl||'').includes('s'),out:(fl||'').includes('o'),ug:ug,k100:k/ug*100,p100:p/ug*100};
  f.cat=f.out||f.sugar?'treat':(f.p>=12||(f.p>=6&&f.p/f.kcal>=.045&&!CARB.test(n)))?'protein':CARB.test(n)?'carb':'side';
  /* rarity by protein density: loot-style colour on tiles */
  const dens=f.p/Math.max(1,f.kcal);
  f.rar=f.sugar||f.out?'treat':dens>=.14?'legend':dens>=.08?'epic':dens>=.05?'rare':'common';
  return f;
}
HS.mkFood=mkFood;
const DB=HS.DB={};
RAW.trim().split('\n').forEach(l=>{const a=l.split('|');DB[a[0]]=mkFood(a[0],a[1],a[2],a[3],a[4])});

/* IIM Kozhikode students mess, October 2026 (one weekly rotation, Mon to Sun) */
const FRUIT=['Banana','Papaya','Watermelon','Mixed fruits','Banana','Watermelon','Papaya'];
const CEREAL=['Chocos','Corn flakes','Chocos','Corn flakes','Chocos','Corn flakes','Chocos'];
const MENU=[
 {b:['Idli','Medu vada','Coconut chutney','Sambar'],l:['Ash gourd dal','Broad beans aloo','Punjabi chole','Lemon rice','Rasam','Buttermilk','Golden corn gobhi dry','Egg pepper roast'],d:['Chapati','Basanti pulao','Masala dal','Fryums','Gulab jamun','Kadai chicken','Kadai paneer']},
 {b:['Methi paratha','Pongal','Aloo matar sabji','Coconut chutney'],l:['Palak dal','Alu gobhi dry','Kadhi pakoda','Curry leaves rice','Sambar','Jeera buttermilk','Rajma masala','Fish curry'],d:['Chapati','Veg manchurian','Snake gourd chenna dal dry','Schezuan fried rice','Moong dal thadka','Boondi raitha','Fryums','Ice-cream']},
 {b:['Masala dosa','Veg poha','Sambar','Coriander mint chutney'],l:['Dal tadka','Guthi vangai','Veg kofta curry','Tomato rice','Rasam','Buttermilk','Soya curry','Egg tikka masala','Halwa (dal/carrot)'],d:['Chapati','Kadala curry','Lowki tomatar','Veg biryani','Chana dal','Curd','Fryums','Palak paneer','Pahdi chicken']},
 {b:['Kallappam','Dal pakwana','Upma','Coriander mint chutney','Vegetable stew'],l:['Bengal gram dal fry','Dum aloo banaras','Rajma raseela','Ghee rice (pulao)','Sambar','Buttermilk','Besan gatte','Fish curry (Nellore)'],d:['Chapati','Mutter masala','Mix veg poriyal','Jeera rice','Tomato pappu','Jeera buttermilk','Fryums','Semiya kheer','Shahi paneer','Chicken kolhapuri']},
 {b:['Aloo paratha','Veg wheat upma','Curd','Coriander mint chutney'],l:['Dal makkani','Corn palak','Dondakai dum fry','Corn pulao','Rasam','Buttermilk','Bhindi kurkure','Egg curry'],d:['Mirchi ka salan','Hyd paneer dum biryani','Hyd chicken dum biryani','Onion cucumber raitha','Fruit custard']},
 {b:['Uttapam','Semeya','Coriander mint chutney','Coconut chutney'],l:['Yellow dal','Kadai veg dry','Paneer lababdar','Tamarind rice','Sambar','Masala buttermilk','Sweet boondi'],d:['Chapati','Aloo methi dry','Chole masala','Bhagara rice','Dal tadka','Curd','Fryums','Peanut masala','Egg kolhapuri']},
 {b:['Pav','Ragi dosa','Bhaaji','Red chutney'],l:['Arhar dal','Honey chilli potato','Soya capsicum','Tawa pulao','Rasam','Jeera buttermilk','Lobia masala','Kerala fish curry'],d:['Chapati','White peas kuruma','Aalu bhindi','Veg pulao','Dal maharani','Buttermilk','Fryums','Balushahi','Paneer tikka masala','Chicken tikka masala']}
];
/* Mess menu entries that have no database row are skipped, so a missing item never breaks the log. */
HS.menuFor=function(meal,di){
  if(meal==='snack')return [];
  const m=MENU[di];let out;
  if(meal==='breakfast')out=m.b.concat([di===6?'Omelette':'Boiled egg',CEREAL[di],'Boiled pulses',FRUIT[di],'Bread, butter, jam','Milk']);
  else if(meal==='lunch')out=['Veg salad','Chapati','Plain rice','Pappad'].concat(m.l);
  else out=['Veg salad','Plain rice'].concat(m.d);
  return out.filter(n=>DB[n]);
};
HS.STAPLES=['Boiled egg','Egg white','Soya chunks (60 g)','Boiled chicken (100 g)','Banana','Milk','Tea (no sugar)','Coffee (no sugar)','Tea (sugar)'];
HS.OUTSIDE=['Shawarma (full)','Alfaham (half)','Shake','Parotta','Beef fry','Fried chicken (2 pc)','Biscuits','Soft drink','Chai + biscuits'];

/* Rehab: copied from the external physio's written plan (Rinshad_Training_Plan.pdf). Third value is the animation key.
   A fourth value of 1 marks an exercise the user chose to skip. "S/B" is kept as written and drawn as a Swiss ball. */
HS.BLOCK=[['Lumbar rotation','8 × 3','rot'],['Knee-to-chest stretch','10 sec × 3','kneechest'],['Cobra','10 sec × 3','cobra'],['Pelvic bridge + adductor pillow squeeze','20 sec × 3','bridge'],['Knee range-of-motion exercise','4 to 5 days a week','heelslide']];
HS.RDAYS=[
 {t:'Day 1: core and stability',x:[['Pallof press','10 × 3','pallof'],['Dead bug','20 sec × 3','deadbug'],['Superman','20 sec × 3','superman'],['Push-up plank','10 sec × 3','plank'],['Jefferson curl','10 × 2',null,1],['Seated hinges','10 × 2','hinge'],['Uneven-load farmer\'s walk','3 laps × 2 sets','farmer']]},
 {t:'Day 2: S/B work',x:[['S/B lumbar extension','3 sec × 10 reps','sbext'],['S/B squats','8 × 3','sbsquat'],['S/B bridging','20 sec × 4','sbbridge'],['S/B plank','20 sec × 4','sbplank'],['S/B bird dog','20 sec × 4','birddog'],['Side plank','20 sec × 2','sideplank'],['Step-ups to the side','8 × 3','stepup'],['S/B calf raise','12 × 3','sbcalf'],['Static squats, eyes closed','30 sec × 2','static']]},
 {t:'Day 3: lower-body strength',x:[['Squats','8 × 3','squat'],['Trap-bar deadlift','8 × 3','trapbar'],['Split squats','8 × 3','split'],['Sumo squat','8 × 3','sumo'],['Hip thrust','10 × 3','hipthrust'],['Calf raise','15 × 3','calf'],['Single-leg balance','20 sec × 3','balance']]}
];

/* Default gym routine. Everything here is editable in Settings. cap=true flags lifts covered by the user's own 30 to 40 kg limit. */
HS.ROUTINE_DEFAULT={
  Push:[{n:'Incline dumbbell press',g:'Chest',sets:3,reps:10},{n:'Pec deck fly',g:'Chest',sets:3,reps:12},{n:'Seated dumbbell shoulder press',g:'Shoulders',sets:3,reps:10},{n:'Lateral raise',g:'Shoulders',sets:3,reps:12},{n:'Rope pushdown',g:'Triceps',sets:3,reps:12},{n:'Overhead cable extension',g:'Triceps',sets:3,reps:12}],
  Pull:[{n:'Lat pulldown',g:'Back',sets:3,reps:10},{n:'Seated cable row',g:'Back',sets:3,reps:10},{n:'Dumbbell curl',g:'Biceps',sets:3,reps:12},{n:'Hammer curl',g:'Biceps',sets:3,reps:12}],
  Legs:[{n:'Squats',g:'Quads',sets:3,reps:8,cap:true},{n:'Trap-bar deadlift',g:'Posterior chain',sets:3,reps:8,cap:true},{n:'Split squats',g:'Quads',sets:3,reps:8},{n:'Sumo squat',g:'Glutes',sets:3,reps:8},{n:'Hip thrust',g:'Glutes',sets:3,reps:10},{n:'Calf raise',g:'Calves',sets:3,reps:15}]
};
HS.CAP_KG=40;
})();
