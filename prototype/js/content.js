/* content.js: the game's static content. Realms, the armory catalogue, the pool of short-term goals, and the voice (hype after wins, playful roasts after misses).
   Roasts are about the habit that was skipped. They never mention the body, weight or looks. */
(function(){
'use strict';
const HS=window.HS=window.HS||{};
HS.VERSION='0.5';
HS.BUILD=0;   /* set by build.py --native --build N (the CI run number); 0 means a development or web build */
HS.REPO='zeralinguistics/Habit-Sync';

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
  {id:'title_extra',slot:'title',name:'Extra Credit',desc:'Thirty bonus quests, nobody made you.',req:{t:'bonus',v:30}},
  {id:'title_monarch',slot:'title',name:'Shadow Monarch',desc:'The campaign is complete.',req:{t:'boss',v:4}}
];
HS.ITEM_BY_ID={};HS.ITEMS.forEach(i=>{HS.ITEM_BY_ID[i.id]=i});
HS.EQUIP_DEFAULT={hood:'hood_plain',body:'body_robe',eyes:'eyes_ice',weapon:'wpn_none',aura:'aura_none',pet:'pet_none',title:'title_rookie'};
HS.EYE_COLOR={eyes_ice:'#ffffff',eyes_azure:'#6fd3ff',eyes_violet:'#c79bff',eyes_crimson:'#ff5a6e',eyes_gold:'#ffd76a'};

/* ---------------- short plain-language cues for the rehab figures (general, not a prescription) ---------------- */
HS.CUES={
  rot:'Top view. Lie on your back, knees bent, feet flat. Let both knees drop gently to one side, then the other. Keep your shoulders on the floor.',
  kneechest:'Lie on your back. Gently draw one knee toward your chest, hold, then switch legs.',
  cobra:'Lie face down with hands under your shoulders. Lift your chest a little, hips staying down. Stay in a pain-free range.',
  bridge:'Lie on your back, knees bent, a pillow between your knees. Squeeze the pillow and lift your hips.',
  heelslide:'Lie on your back. Slide your heel toward your buttocks to bend the knee, then slide it back out.',
  pallof:'Stand side-on to the band. Press your hands straight out and hold without letting your trunk twist.',
  deadbug:'Lie on your back, arms up, knees bent. Lower the opposite arm and leg slowly while your lower back stays flat.',
  superman:'Lie face down. Lift the opposite arm and leg a little, hold, then switch. Keep your neck long.',
  plank:'Hold a straight line from head to heels. Stop when your lower back starts to sag.',
  hinge:'Sit tall and hinge forward from the hips with a straight back, then come back up.',
  farmer:'Carry the weights as set (uneven loads), walking tall without leaning to one side.',
  sbext:'Lie over the Swiss ball and gently lift your chest. Hold briefly at the top.',
  sbsquat:'Ball between your back and the wall. Lower into a comfortable squat, then stand.',
  sbbridge:'Feet on the ball. Lift your hips into a bridge and hold. Keep the ball steady.',
  sbplank:'Forearms on the ball. Hold a straight line from head to heels.',
  birddog:'On hands and knees, reach the opposite arm and leg out. Keep your back still.',
  sideplank:'Prop on your forearm and lift your hips into a straight line. Hold.',
  stepup:'Step up sideways onto the box, push through the heel, step down slowly.',
  sbcalf:'Ball against the wall. Rise onto your toes slowly and lower with control.',
  static:'Stand with soft knees in a half squat and eyes closed. Hold steady.',
  squat:'Feet shoulder-width. Sit back and down in a pain-free range, inside your own weight limit.',
  trapbar:'Hinge at the hips with a flat back, then stand up tall. Stay inside your own weight limit.',
  split:'Take a long step. Lower straight down, then push back up.',
  sumo:'Wide stance, toes turned out. Lower straight down, then stand.',
  hipthrust:'Upper back on the bench, feet flat. Drive your hips up and squeeze.',
  calf:'Rise onto your toes slowly and lower with control.',
  balance:'Stand on one leg and hold steady, then switch.',
  walk:'Easy pace. If the knee complains, slow down or stop.'
};

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
 "hype": {
  "workout": [
   "[SYSTEM] Training complete. Your muscles are filing a thank-you note.",
   "Another brick in the monarch's castle. Keep stacking.",
   "You showed up. Most people only plan to.",
   "Strength stat rising. The mirror can catch up later.",
   "Sweat logged. The System approves.",
   "That was a dungeon clear. Loot: strength, discipline and a better night's sleep.",
   "S-rank behaviour. Training on a day you did not feel like it counts double.",
   "Hunters do not wait for motivation. They show up and let it arrive.",
   "The bar was lighter than the excuse you left at the door.",
   "Done. The hardest rep was walking in.",
   "Your future self just high-fived you. Quietly, because he is tired too.",
   "Quest complete. The couch is already jealous."
  ],
  "pr": [
   "NEW PR. Yesterday's you just got demoted.",
   "The bar moved. So did your ceiling.",
   "A personal record is not luck. It is receipts.",
   "Number go up. Hunter go brr.",
   "That weight used to be a boss. Now it is a regular mob.",
   "Progressive overload, achieved. Smile quietly.",
   "A new best, and your knee and back stayed in line. That is the real win.",
   "Log it, screenshot it, do not brag. Okay, brag a little."
  ],
  "protein": [
   "Protein locked. Your muscles are celebrating quietly.",
   "Target hit. Recovery crew has clocked in.",
   "That is a full tank of building material.",
   "Protein goal cleared. Muscles: finally, bricks.",
   "Amino acids delivered. The System is pleased.",
   "Enough protein to rebuild a small castle.",
   "Repair crew fully staffed today.",
   "Protein target hit. Elite behaviour."
  ],
  "rehab": [
   "Rehab done. Boring work, legendary results.",
   "Your knee and back say thanks. They never say it loudly.",
   "Healing is a quest too. Cleared.",
   "Ten minutes of care, years of knee. Good trade.",
   "Patience is a stat. It just went up.",
   "Every rehab rep is a deposit in the move-freely account.",
   "The unglamorous quest, cleared. That is how monarchs are made.",
   "Joints oiled, tissue trained. Now go be strong."
  ],
  "water": [
   "Water target hit. Even your joints approve.",
   "Hydration cleared. Plain, and it works.",
   "Your cells are throwing a tiny party.",
   "Three litres. Your kidneys salute you.",
   "Hydrated hunter, happy hunter.",
   "Water quest done. The easiest S-rank of the day."
  ],
  "sleep": [
   "Sleep logged. Recovery is where the growth happens.",
   "Rest counts. The System is pleased.",
   "Good sleep is the cheapest supplement. You just took it.",
   "Sleep is the one stat that boosts all the others.",
   "Well rested. Today's cooldowns are shorter.",
   "Hours in the bank. Spend them wisely."
  ],
  "clear": [
   "Day cleared. The gate closes behind you.",
   "Another day banked. Streak intact.",
   "That is a wrap. Open the chest.",
   "Quests done, conscience clear. Sleep well, hunter.",
   "One more day on the board. They add up faster than you think.",
   "Cleared. Tomorrow's gate opens at dawn.",
   "Consistency beats intensity. You just proved it again.",
   "A good day is a bunch of small quests, finished."
  ],
  "streak": [
   "{n} days in a row. This is what a habit looks like.",
   "{n}-day streak. The flame is hungry. Feed it tomorrow.",
   "{n} days. You are not trying anymore, you are just someone who does this.",
   "The streak is {n} days old and already has opinions. Do not disappoint it.",
   "{n} straight. Never miss twice, and you never will.",
   "{n} days of showing up. That is the whole secret."
  ],
  "gate": [
   "A gate falls. Something rises from its shadow.",
   "Weight trend broke through. The System takes notes.",
   "Gate cleared. The trend does not lie, and today it is smiling.",
   "Another gate in the books. The boss is getting nervous.",
   "Half a kilo of trend, earned the slow way. Those stay gone."
  ],
  "level": [
   "LEVEL UP. Stats increased.",
   "Power rising. Keep climbing.",
   "New level unlocked. Same hunter, bigger numbers.",
   "Aura overflowing. The System recalibrates.",
   "Level up. The next one is closer than it feels."
  ],
  "comeback": [
   "Comeback complete. Missing once is human. You fixed it fast.",
   "Fatigue broken. Never miss twice, and you did not.",
   "That is a redemption arc. The System loves a redemption arc.",
   "Back in the saddle. The streak of excuses ends here."
  ],
  "weigh": [
   "Weigh-in logged. Data beats guessing.",
   "The scale is a number. The trend is the truth.",
   "One reading is noise. The trend is signal. Keep feeding it.",
   "Logged. No drama, just data.",
   "Weigh-in done early. Textbook.",
   "Honest number, honest plan. That is the combo."
  ],
  "meal": [
   "Plate logged. Fuel secured.",
   "Meal done. Macros on the board.",
   "Logged while it is fresh. Future you says thanks.",
   "Another plate, accounted for.",
   "Fuel in, data in. Efficient.",
   "Eat, log, win. In that order."
  ],
  "goal": [
   "Goal cleared. Reward claimed.",
   "Short-term win banked. Next one is already loading.",
   "Weekly goal crushed. The board is getting greener.",
   "That one is done. Pick the next target.",
   "Small wins stack into big ones. Stacked.",
   "Quest complete. Aura delivered."
  ],
  "unlock": [
   "New gear acquired. Time to look the part.",
   "The armory just got better.",
   "Earned, not bought. That is why it shines.",
   "Fresh loot. Check the armory."
  ],
  "camp": [
   "Camp week. Eat at maintenance, train as normal, and let the body catch up.",
   "Rest at the campfire. The next realm needs a fed hunter.",
   "Maintenance week: recover, refuel, return stronger."
  ],
  "chest": [
   "The chest cracks open.",
   "Loot incoming.",
   "Let us see what the System left for you."
  ],
  "bonus": [
   "Extra credit. Nobody asked, which is why it counts.",
   "That one was optional. You did it anyway.",
   "Tiny win, real aura. Stack them.",
   "Bonus banked. The System is mildly impressed.",
   "Free points, taken.",
   "Side quest cleared."
  ],
  "bonusall": [
   "Full bonus row. Today's chest just got fancier.",
   "Three for three. The System checked the numbers twice, then nodded.",
   "Clean sweep of the side quests. Show-off.",
   "Perfect bonus row. The chest moves up a tier."
  ]
 },
 "roast": {
  "playful": {
   "skip": [
    "The couch sends its regards. It is winning. Take the win back tomorrow.",
    "Skipped. Your dumbbells are writing you a very polite letter.",
    "Rest is a strategy. This was a vibe. Different things, hunter.",
    "Quest failed. The gate will be there tomorrow, tapping its foot.",
    "Your workout clothes are filing a missing-person report.",
    "The gym still has your spot. The dumbbells are lonely.",
    "Skipped. The barbell sighed and went back to its book.",
    "Tomorrow-you has so many chores today-you handed over.",
    "Skipping happens. Skipping twice is a hobby. Pick the right one.",
    "The System noted a no-show. Make it a one-time thing."
   ],
   "absent": [
    "You vanished. The System sent a search party. It found your couch.",
    "Missing in action. Respawn point: today.",
    "The gate waited. The gate does not do refunds.",
    "Days quiet. The shadow army is holding a search party.",
    "Welcome back, stranger. The quests kept your seat warm.",
    "The gate did not move. You did. Go back."
   ],
   "late": [
    "It is late and your quest list is still open. Plot twist: quests do not complete themselves.",
    "Night is falling. Your quest list is not impressed.",
    "The System checks the clock. The clock checks you.",
    "The quest list is not asleep. It is waiting.",
    "Last call for quests. Even one counts.",
    "Midnight is coming. Cheap wins still count: log, drink, stretch."
   ],
   "fatigue": [
    "FATIGUED. Gains halved, level locked. One workout breaks the curse.",
    "Running on low. Train once and the System resets.",
    "Level locked, gains halved. A workout resets the curse.",
    "You are running on fumes. One session refuels the whole system.",
    "The System is not angry. It is just locked. Train once to unlock."
   ],
   "sugar": [
    "Sugar detected. The System noticed. The System always notices.",
    "A sweet moment. Logged, not judged. Mostly.",
    "Sweet detour logged. No shame, just math.",
    "The sugar quest hits back. Balance it with protein next.",
    "A treat is fine. A pattern is a plot twist you do not want."
   ],
   "mealSkip": [
    "Skipped a meal. Muscles do not build on vibes.",
    "Empty plate logged. Your protein target looked sad.",
    "A meal-shaped hole in the log. Fill it or skip it officially.",
    "Unlogged is invisible to the System, but not to your protein target."
   ],
   "idle": [
    "Nothing done yet today. Every legend starts with one tap.",
    "The day's clock is ticking. The first quest takes ten seconds.",
    "Half the day gone and the quest board is spotless. Suspiciously spotless.",
    "The first quest takes ten seconds. The couch takes ten minutes to leave. Pick one.",
    "The first tap is the hardest. After that it is momentum.",
    "Nothing logged yet. The System is patient. It is also watching."
   ],
   "weigh": [
    "No weigh-in yet. The scale is lonely.",
    "Step on. It will not bite.",
    "No weigh-in yet. The trend is waiting for its daily dose of truth.",
    "Scale first, excuses later."
   ],
   "water": [
    "Water bottle: still full. Hydration is not a spectator sport.",
    "Your water target is waiting by the door.",
    "Hydration level: desert. Walk to the tap, hunter.",
    "A glass of water is a quest too, and it is the easiest one."
   ],
   "streak": [
    "Streak broken. It happens. Never miss twice.",
    "The flame went out. Light another one today.",
    "Reset. Day one of the next streak starts now."
   ]
  },
  "savage": {
   "skip": [
    "You skipped. Bold strategy: expecting results from a plan you did not show up to.",
    "Tomorrow-you called. He is tired of covering for you.",
    "The barbell waited. It is used to being stood up.",
    "Excuses are just quests you refuse to clear.",
    "Skipped again? The later you keep promising is a fictional character.",
    "The only thing you lifted today was the remote.",
    "Your goals asked about you. I told them you were busy.",
    "A plan you do not follow is a wish with a schedule."
   ],
   "absent": [
    "Days of silence. The System assumed you had been abducted by your blanket.",
    "You ghosted a game about your own life. Impressive.",
    "You have been gone so long the dust filed a complaint.",
    "The System waited. The System is not a patient system.",
    "Bold move, disappearing from your own transformation."
   ],
   "late": [
    "It is late. The quest list is full. Your effort tonight is empty. Fix one.",
    "Midnight is when tomorrow lies best.",
    "Tonight's productivity report: loading... still loading...",
    "You had all day. The day is now filing a complaint."
   ],
   "fatigue": [
    "Fatigued and locked. The System is not mad. It is just disappointed. Train.",
    "Locked. Halved. Fixable? Yes. Train.",
    "Fatigued by your own choices. Train once to undo it."
   ],
   "sugar": [
    "Sugar again. The System keeps a ledger and it is getting long.",
    "That is the penalty talking. You can still win the day.",
    "Sugar again. Your willpower called in sick.",
    "Treat logged. The System is rolling its eyes politely."
   ],
   "mealSkip": [
    "No meal logged. Either you forgot, or you are bluffing the System. It is not fooled.",
    "Meal missing. Either you forgot, or hunger is bluffing.",
    "A blank meal log is fiction by omission."
   ],
   "idle": [
    "Zero quests done. The leaderboard is you versus you, and you are losing.",
    "Still nothing? The first tap is free.",
    "Nothing done and the day is mostly over. Impressive restraint.",
    "Zero quests by now is a lifestyle choice. Choose again."
   ],
   "weigh": [
    "No weigh-in. The System cannot fix what it will not measure.",
    "No weigh-in. Ignorance is not a strategy, it is a delay.",
    "The scale does not judge. I do. Step on."
   ],
   "water": [
    "Hydration: AWOL. Your cells are sending postcards.",
    "Zero water. Even cacti are judging you.",
    "Water bottle untouched. Heroic commitment to the wrong thing."
   ],
   "streak": [
    "Streak gone. Well. Time to build a better one.",
    "The streak died of neglect. Start a new one."
   ]
  }
 },
 "quips": [
  "Poke me again and I start charging aura.",
  "I am a shadow, not a stress ball.",
  "Quest list is below. I am just the scenery.",
  "Fun fact: shadows do not get tired. You do. Train anyway.",
  "Stand tall. The gate is watching.",
  "Hydrate. I cannot do it for you.",
  "Arise... a little more water.",
  "Ten seconds. One tap. That is all it takes to start.",
  "I only have one move: standing here being dramatic.",
  "Shadow soldiers never tire. You do. So rest, then come back.",
  "Bored? Do one rehab move. Boredom cures itself.",
  "Water. Now. Then we talk.",
  "I am not saying you should log lunch, but the System is saying it.",
  "You are doing better than you think. Check the Path tab.",
  "The best workout is the one you start. Even at eighty percent.",
  "I cannot flex without arms. You can.",
  "Careful. One more poke and I level up.",
  "Sleep is a quest. Do not skip it.",
  "Knees and back first, ego last."
 ]
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
