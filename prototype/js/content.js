/* content.js: the game's static content. Realms, the armory catalogue, the pool of short-term goals, and the voice (hype after wins, playful roasts after misses).
   Roasts are about the habit that was skipped. They never mention the body, weight or looks. */
(function(){
'use strict';
const HS=window.HS=window.HS||{};
HS.VERSION='0.5';

/* ---------------- realms: the whole look of the app changes at each boss gate ---------------- */
HS.REALMS=[
  {id:'r1',name:'The Gate Opens',theme:'shadow',scene:'gate',fx:'souls',line:'Every hunter starts at a gate.'},
  {id:'r2',name:'Iron Fortress',theme:'monarch',scene:'fortress',fx:'wisps',line:'The fortress walls bow to your discipline.'},
  {id:'r3',name:'Ember Citadel',theme:'ember',scene:'citadel',fx:'embers',line:'Fire forges what comfort never could.'},
  {id:'r4',name:'Frozen Throne',theme:'frost',scene:'spires',fx:'snow',line:'Cold, clear and unstoppable.'},
  {id:'r5',name:"Monarch's Palace",theme:'gold',scene:'palace',fx:'gold',line:'You did not climb to the throne. You became it.'}
];

/* ---------------- the armory ---------------- */
/* req.t: free | level | rank | boss | gates | workouts | streak | prs | rehab | comeback | logdays | water | goals | protein | weigh */
HS.SLOTS=[['hood','Hood'],['body','Body'],['eyes','Eyes'],['weapon','Weapon'],['aura','Aura'],['pet','Companion'],['title','Title']];
HS.ITEMS=[
  {id:'hood_plain',slot:'hood',name:'Shadow Hood',desc:'Where every hunter begins.',req:{t:'free'}},
  {id:'hood_mask',slot:'hood',name:'Silent Mask',desc:'Say less. Lift more.',req:{t:'workouts',v:5}},
  {id:'hood_horn',slot:'hood',name:'Horned Cowl',desc:'For hunters who earned their rank.',req:{t:'rank',v:'D'}},
  {id:'hood_crown',slot:'hood',name:'Iron Crown',desc:'The first boss gate fell. Wear the proof.',req:{t:'boss',v:1}},
  {id:'hood_halo',slot:'hood',name:"Monarch's Halo",desc:'Reserved for the one who finishes.',req:{t:'boss',v:4}},

  {id:'body_robe',slot:'body',name:"Hunter's Robe",desc:'Light, quiet, ready.',req:{t:'free'}},
  {id:'body_coat',slot:'body',name:'Field Coat',desc:'Built for long campaigns.',req:{t:'level',v:3}},
  {id:'body_cape',slot:'body',name:'Shadow Cape',desc:'It follows the ones who keep their streak.',req:{t:'streak',v:7}},
  {id:'body_armor',slot:'body',name:'Knight Plate',desc:'Forged from two boss gates.',req:{t:'boss',v:2}},
  {id:'body_regalia',slot:'body',name:'Monarch Regalia',desc:'The last piece. The first thing people see.',req:{t:'boss',v:4}},

  {id:'eyes_ice',slot:'eyes',name:'Ice White',desc:'Calm. Focused.',req:{t:'free'}},
  {id:'eyes_azure',slot:'eyes',name:'Azure Gaze',desc:'Level 5. You see the path now.',req:{t:'level',v:5}},
  {id:'eyes_violet',slot:'eyes',name:'Violet Gaze',desc:'Fourteen days of honest logging.',req:{t:'logdays',v:14}},
  {id:'eyes_crimson',slot:'eyes',name:'Crimson Gaze',desc:'You fell, then got back up. Eyes remember.',req:{t:'comeback',v:1}},
  {id:'eyes_gold',slot:'eyes',name:'Golden Gaze',desc:'Five personal records.',req:{t:'prs',v:5}},

  {id:'wpn_none',slot:'weapon',name:'Bare Hands',desc:'Honest work.',req:{t:'free'}},
  {id:'wpn_dagger',slot:'weapon',name:"Hunter's Dagger",desc:'Your first finished workout.',req:{t:'workouts',v:1}},
  {id:'wpn_twin',slot:'weapon',name:'Twin Fangs',desc:'Twelve workouts done.',req:{t:'workouts',v:12}},
  {id:'wpn_blade',slot:'weapon',name:'Rune Blade',desc:'Forty workouts. The runes light up.',req:{t:'workouts',v:40}},
  {id:'wpn_scythe',slot:'weapon',name:'Monarch Scythe',desc:'Third boss gate.',req:{t:'boss',v:3}},

  {id:'aura_none',slot:'aura',name:'No Aura',desc:'Subtle.',req:{t:'free'}},
  {id:'aura_mist',slot:'aura',name:'Shadow Mist',desc:'A three-day streak.',req:{t:'streak',v:3}},
  {id:'aura_flame',slot:'aura',name:'Rehab Flame',desc:'Fourteen rehab days. Healing burns bright.',req:{t:'rehab',v:14}},
  {id:'aura_bolt',slot:'aura',name:'Storm Charge',desc:'Twenty-five workouts.',req:{t:'workouts',v:25}},
  {id:'aura_fire',slot:'aura',name:'Monarch Flame',desc:'Second boss gate.',req:{t:'boss',v:2}},

  {id:'pet_none',slot:'pet',name:'Alone',desc:'For now.',req:{t:'free'}},
  {id:'pet_raven',slot:'pet',name:'Night Raven',desc:'Ten days of hitting the water target.',req:{t:'water',v:10}},
  {id:'pet_wolf',slot:'pet',name:'Shadow Wolf',desc:'Six gates cleared.',req:{t:'gates',v:6}},
  {id:'pet_drake',slot:'pet',name:'Shadow Drake',desc:'Twenty gates cleared.',req:{t:'gates',v:20}},

  {id:'title_rookie',slot:'title',name:'Rookie Hunter',desc:'Everyone starts here.',req:{t:'free'}},
  {id:'title_iron',slot:'title',name:'Iron Will',desc:'A seven-day streak.',req:{t:'streak',v:7}},
  {id:'title_comeback',slot:'title',name:'Comeback Kid',desc:'Broke fatigue by showing up.',req:{t:'comeback',v:1}},
  {id:'title_rehab',slot:'title',name:'Rehab Warrior',desc:'Twenty-one rehab days.',req:{t:'rehab',v:21}},
  {id:'title_breaker',slot:'title',name:'Gate Breaker',desc:'First boss gate cleared.',req:{t:'boss',v:1}},
  {id:'title_goals',slot:'title',name:'Quest Collector',desc:'Twenty short-term goals cleared.',req:{t:'goals',v:20}},
  {id:'title_monarch',slot:'title',name:'Shadow Monarch',desc:'The campaign is complete.',req:{t:'boss',v:4}}
];
HS.ITEM_BY_ID={};HS.ITEMS.forEach(i=>{HS.ITEM_BY_ID[i.id]=i});
HS.EQUIP_DEFAULT={hood:'hood_plain',body:'body_robe',eyes:'eyes_ice',weapon:'wpn_none',aura:'aura_none',pet:'pet_none',title:'title_rookie'};
HS.EYE_COLOR={eyes_ice:'#ffffff',eyes_azure:'#6fd3ff',eyes_violet:'#c79bff',eyes_crimson:'#ff5a6e',eyes_gold:'#ffd76a'};

/* ---------------- short-term goals: five per week, picked from this pool ---------------- */
/* kind 'count': days (or events) this week out of need. aura is the reward. */
HS.GOALS=[
  {id:'g_gate',t:'Clear a gate',d:'Weight trend down one full gate this week.',need:1,aura:150,always:true},
  {id:'g_protein',t:'Protein x3',d:'Hit your protein target on 3 days.',need:3,aura:90},
  {id:'g_weigh',t:'Weigh in x5',d:'Five weigh-ins this week. Data beats guessing.',need:5,aura:60},
  {id:'g_train',t:'Train x4',d:'Four finished workouts.',need:4,aura:100},
  {id:'g_water',t:'Hydrate x4',d:'Reach your water target on 4 days.',need:4,aura:80},
  {id:'g_rehab',t:'Rehab x5',d:'Finish rehab on 5 days.',need:5,aura:100},
  {id:'g_cal',t:'In the window x4',d:'Land inside your calorie window on 4 cleared days.',need:4,aura:100},
  {id:'g_sleep',t:'Sleep 7h x4',d:'Four nights of 7 hours or more.',need:4,aura:70},
  {id:'g_log',t:'Full plates x3',d:'Log breakfast, lunch and dinner on 3 days.',need:3,aura:80},
  {id:'g_pr',t:'New personal record',d:'Beat a previous best on any lift (inside your pain rules).',need:1,aura:80},
  {id:'g_steps',t:'Log steps x5',d:'Enter your steps on 5 days.',need:5,aura:50},
  {id:'g_clear',t:'Clear the day x4',d:'Clear four days with 3 of 4 quests.',need:4,aura:120}
];
/* streak milestones: rolling, not weekly */
HS.STREAK_STEPS=[3,7,14,30,60];
HS.STREAK_NAMES={protein:'Protein streak',weigh:'Weigh-in streak',log:'Logging streak',water:'Hydration streak',rehab:'Rehab streak',workout:'Training streak',clear:'Clear streak'};
HS.STREAK_AURA={3:50,7:120,14:250,30:500,60:900};

/* ---------------- voice ---------------- */
HS.VOICE={
  hype:{
    workout:['[SYSTEM] Training complete. Your muscles are filing a thank-you note.','Another brick in the monarch\'s castle. Keep stacking.','You showed up. Most people only plan to.','Strength stat rising. The mirror can catch up later.','Sweat logged. The System approves.'],
    pr:['NEW PR. Yesterday\'s you just got demoted.','The bar moved. So did your ceiling.','A personal record is not luck. It is receipts.'],
    protein:['Protein locked. Your muscles are celebrating quietly.','Target hit. Recovery crew has clocked in.','That is a full tank of building material.'],
    rehab:['Rehab done. Boring work, legendary results.','Your knee and back say thanks. They never say it loudly.','Healing is a quest too. Cleared.'],
    water:['Water target hit. Even your joints approve.','Hydration cleared. Plain, and it works.'],
    sleep:['Sleep logged. Recovery is where the growth happens.','Rest counts. The System is pleased.'],
    clear:['Day cleared. The gate closes behind you.','Another day banked. Streak intact.','That is a wrap. Open the chest.'],
    streak:['{n} days in a row. This is what a habit looks like.','{n}-day streak. The flame is hungry. Feed it tomorrow.'],
    gate:['A gate falls. Something rises from its shadow.','Weight trend broke through. The System takes notes.'],
    level:['LEVEL UP. Stats increased.','Power rising. Keep climbing.'],
    comeback:['Comeback complete. Missing once is human. You fixed it fast.','Fatigue broken. Never miss twice, and you did not.'],
    weigh:['Weigh-in logged. Data beats guessing.','The scale is a number. The trend is the truth.'],
    meal:['Plate logged. Fuel secured.','Meal done. Macros on the board.'],
    goal:['Goal cleared. Reward claimed.','Short-term win banked. Next one is already loading.'],
    unlock:['New gear acquired. Time to look the part.','The armory just got better.'],
    camp:['Camp week. Eat at maintenance, train as normal, and let the body catch up.'],
    chest:['The chest cracks open.','Loot incoming.']
  },
  roast:{
    playful:{
      skip:['The couch sends its regards. It is winning. Take the win back tomorrow.','Skipped. Your dumbbells are writing you a very polite letter.','Rest is a strategy. This was a vibe. Different things, hunter.','Quest failed. The gate will be there tomorrow, tapping its foot.'],
      absent:['You vanished. The System sent a search party. It found your couch.','Missing in action. Respawn point: today.','The gate waited. The gate does not do refunds.'],
      late:['It is late and your quest list is still open. Plot twist: quests do not complete themselves.','Night is falling. Your quest list is not impressed.','The System checks the clock. The clock checks you.'],
      fatigue:['FATIGUED. Gains halved, level locked. One workout breaks the curse.','Running on low. Train once and the System resets.'],
      sugar:['Sugar detected. The System noticed. The System always notices.','A sweet moment. Logged, not judged. Mostly.'],
      mealSkip:['Skipped a meal. Muscles do not build on vibes.','Empty plate logged. Your protein target looked sad.'],
      idle:['Nothing done yet today. Every legend starts with one tap.','The day\'s clock is ticking. The first quest takes ten seconds.'],
      weigh:['No weigh-in yet. The scale is lonely.','Step on. It will not bite.'],
      water:['Water bottle: still full. Hydration is not a spectator sport.','Your water target is waiting by the door.'],
      streak:['Streak broken. It happens. Never miss twice.']
    },
    savage:{
      skip:['You skipped. Bold strategy: expecting results from a plan you did not show up to.','Tomorrow-you called. He is tired of covering for you.','The barbell waited. It is used to being stood up.','Excuses are just lazy quests you refuse to clear.'],
      absent:['Days of silence. The System assumed you had been abducted by your blanket.','You ghosted a game about your own life. Impressive.'],
      late:['It is late. The quest list is full. Your effort tonight is empty. Fix one.','Midnight is when "tomorrow" lies best.'],
      fatigue:['Fatigued and locked. The System is not mad. It is just disappointed. Train.'],
      sugar:['Sugar again. The System keeps a ledger and it is getting long.','That is the penalty talking. You can still win the day.'],
      mealSkip:['No meal logged. Either you forgot, or you are bluffing the System. It is not fooled.'],
      idle:['Zero quests done. The leaderboard is you versus you, and you are losing.','Still nothing? The first tap is free.'],
      weigh:['No weigh-in. The System cannot fix what it will not measure.'],
      water:['Hydration: AWOL. Your cells are sending postcards.'],
      streak:['Streak gone. Well. Time to build a better one.']
    }
  },
  quips:['Poke me again and I start charging aura.','I am a shadow, not a stress ball.','Quest list is below. I am just the scenery.','Fun fact: shadows do not get tired. You do. Train anyway.','Stand tall. The gate is watching.','Hydrate. I cannot do it for you.','Arise... a little more water.','Ten seconds. One tap. That is all it takes to start.']
};
/* pick a line; stable for the same event on the same minute so a re-render does not flicker */
HS.say=function(group,key,roastLevel,ctx){
  let bank;
  if(group==='roast'){
    if(roastLevel==='off')return '';
    bank=(HS.VOICE.roast[roastLevel]||HS.VOICE.roast.playful)[key];
  }else bank=HS.VOICE[group]&&HS.VOICE[group][key];
  if(!bank||!bank.length)return '';
  const seed=(ctx&&ctx.seed!=null)?ctx.seed:Math.floor(Math.random()*bank.length);
  let s=bank[seed%bank.length];
  if(ctx&&ctx.n!=null)s=s.replace('{n}',ctx.n);
  return s;
};
})();
