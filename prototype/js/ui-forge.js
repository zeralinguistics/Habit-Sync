/* ui-forge.js: Settings. A short list: your profile, then one row per topic, each opening a focused sheet. Also the data vault (backup,
   restore, storage) that keeps the app alive for years, "How it works", and the first-run welcome. */
(function(){
'use strict';
const HS=window.HS=window.HS||{};
const E=HS.E,F=HS.fx,U=HS.ui;
const esc=U.esc,fmt=U.fmt,cap=U.cap,IC=U.IC,$=U.$,A=U.act;
let rTab='Push';

const NUMF=[
  ['Profile and goals',[
    ['name','Name','text'],['startW','Starting weight (kg)','num',{step:.1,root:true}],['goalW','Goal weight (kg)','num',{step:.5}],['bossEvery','Boss gate every (kg)','num',{step:1}]]],
  ['Daily targets',[['kcal','Daily calories','num',{step:50}],['protein','Daily protein (g)','num',{step:5}],['water','Water target (ml)','num',{step:250}],['stepGoal','Step goal (0 = none yet)','num',{step:500}]]]
];
function fieldRow(f){
  const c=E.cfg(),S=E.S(),val=f[3]&&f[3].root?S[f[0]]:c[f[0]];
  return `<label class="fr"><span>${f[1]}</span><input ${f[2]==='num'?'type="number" inputmode="decimal" step="'+((f[3]&&f[3].step)||1)+'"':'type="text" maxlength="14"'} data-cfg="${f[0]}" ${f[3]&&f[3].root?'data-root="1"':''} value="${esc(val)}"></label>`;
}
const seg=(act,opts,cur)=>`<div class="seg2">${opts.map(o=>`<button data-a="${act}:${o[0]}" aria-pressed="${String(cur)===String(o[0])}">${o[1]}</button>`).join('')}</div>`;
function routineEditor(){
  const list=E.routine(rTab);
  return `<div class="tg">${['Push','Pull','Legs'].map(t=>`<button data-a="rtab:${t}" aria-pressed="${rTab===t}">${t}</button>`).join('')}</div>
   <div class="small">${list.length} exercises · ${list.reduce((a,x)=>a+x.sets,0)} sets. Two exercises per muscle at three sets each is plenty on a deficit. Weights are logged in the workout, so this list only holds the plan.</div>
   ${list.map((x,i)=>`<div class="rxr"><div class="rxn"><input data-rx="n" data-i="${i}" value="${esc(x.n)}" aria-label="Exercise name"><input data-rx="g" data-i="${i}" value="${esc(x.g)}" aria-label="Muscle group" class="sm"></div>
     <div class="rxc"><div class="mini"><button data-a="rxs:${i}:-1" aria-label="Fewer sets">−</button><b>${x.sets}</b><span>sets</span><button data-a="rxs:${i}:1" aria-label="More sets">+</button></div>
     <div class="mini"><button data-a="rxr:${i}:-1" aria-label="Fewer reps">−</button><b>${x.reps}</b><span>reps</span><button data-a="rxr:${i}:1" aria-label="More reps">+</button></div>
     <button class="capb" data-a="rxcap:${i}" aria-pressed="${!!x.cap}">cap ${HS.CAP_KG} kg</button><button class="del" data-a="rxdel:${i}" aria-label="Remove">×</button></div></div>`).join('')}
   <div class="rxadd"><input id="rxNew" placeholder="New exercise" aria-label="New exercise name"><input id="rxNewG" placeholder="Muscle" class="sm" aria-label="Muscle group"><button data-a="rxadd">Add</button></div>`;
}
function strictTxt(s){return s==='chill'?'Skipping a session costs 30 aura. No fatigue.':s==='hard'?'Skipping costs 100 aura, a strength point and fatigue. A second miss in a row hits twice.':'Skipping costs 60 aura and fatigue: aura gains are halved and your level is locked until you train. Absence is punished too.'}
function roastTxt(r){return r==='off'?'No teasing. Only encouragement.':r==='savage'?'Savage: sharper lines when you skip. Still only about the habit you skipped, never your body or looks.':'Playful: light teasing when you skip. Only about the habit you skipped, never your body or looks.'}

/* ---------------- data vault ---------------- */
function vaultHtml(){
  const info=E.dataInfo(),P=HS.pwa||{},kb=(info.bytes/1024).toFixed(0);
  const age=info.backupAgeDays;
  const bk=info.lastBackup?(age===0?'today':age===1?'yesterday':age+' days ago'):'never';
  const due=E.backupDue();
  return `<div class="vault ${due?'due':''}"><div><span>DAYS STORED</span><b>${info.days}</b></div><div><span>SIZE</span><b>${kb} KB</b></div><div><span>LAST BACKUP</span><b>${bk}</b></div></div>
   ${due?'<div class="warn" style="margin-top:10px">Your data lives only on this phone. Save a backup file now and then (it takes five seconds). It is your insurance if the phone is lost or reset.</div>':''}
   <div class="stack2"><button class="btn good" data-a="bkSave">${IC.down.replace('<svg','<svg class="bi"')}Save a backup file</button>
    <button class="btn ghost" data-a="bkCopy">Copy backup text</button>
    <label class="btn ghost filebtn">Restore from a backup file<input type="file" accept=".json,application/json,text/plain" id="restoreFile" hidden></label>
    <button class="btn ghost" data-a="bkPaste">Restore from pasted text</button>
    <button class="btn ghost" data-a="bkAuto">Restore yesterday’s automatic copy</button>
    ${E.undoInfo()?'<button class="btn ghost" data-a="undo">Undo last reset or restore \u00B7 '+E.undoInfo().days+' days</button>':''}</div>
   <div class="small">${P.persisted===true?'Storage is protected: the browser will not clear it when space runs low.':P.persisted===false?'The browser may clear storage if the phone runs very low on space. Install the app or save backups.':'Storage protection status is unknown here.'}
     ${P.native?' You are using the Android app, which keeps its data in private app storage.':P.standalone?' Installed as an app.':''}</div>
   ${P.deferred?'<div class="stack2"><button class="btn vio" data-a="install">Install on this phone</button></div>':''}
   <div id="exWrap"></div>`;
}
E.backupDue=function(){const i=E.dataInfo();return i.days>=7&&(i.backupAgeDays==null||i.backupAgeDays>=21)};
E.on('pwa',()=>{if(U.tab==='forge'&&!U.sh)U.views.forge()});


/* ---------------- the screen: a list of doors ---------------- */
const DAYN=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
function refreshSet(){if(U.sh&&U.sh.type==='set')U.keepScroll(()=>renderSetting(U.sh.sec))}
const SECS={
  profile:{t:'Profile and goals',html:()=>{const c=E.cfg();return NUMF[0][1].map(fieldRow).join('')+`<div class="fr"><span>Gate size</span><div class="seg2">${[.5,1].map(g=>`<button data-a="gate:${g}" aria-pressed="${c.gateStep===g}">${g} kg</button>`).join('')}</div></div>
      <div class="fr"><span>Camp week after each boss</span>${seg('camp',[[1,'On'],[0,'Off']],c.camp!==false?1:0)}</div>
      <div class="fr"><span>Auto-lower calories at bosses</span>${seg('autok',[[1,'On'],[0,'Off']],c.autoKcal!==false?1:0)}</div>
      <div class="fr"><span>Your day ends at</span>${seg('dayend',[[0,'12 am'],[2,'2 am'],[3,'3 am'],[4,'4 am']],c.dayStart==null?3:c.dayStart)}</div>
      <div class="small">Go to bed after midnight? Quests, the chest and your streak stay on the same day until this hour.</div>`}},
  targets:{t:'Daily targets',html:()=>{const c=E.cfg(),g=E.sparkGoal();return NUMF[1][1].map(fieldRow).join('')+
      `<div class="fr"><span>Daily streak goal<small class="sub2">pillars to light the day</small></span>${seg('sgoalset',[[3,'Easy 3'],[4,'Steady 4'],[5,'Hard 5']],g)}</div>
       <div class="small">Starting estimates. After two to three weeks, your weight trend should decide whether to move them. The streak goal is how many of the six daily pillars light a day.</div>`}},
  protein:{t:'Protein backup',html:()=>{
      const c=E.cfg(),cur=c.backup,opts=['Yogabar Pro Clean Plant Protein (1 scoop)','Plant protein powder (1 scoop)','Whey protein (1 scoop)','Protein bar (20 g protein)','Protein bar (10 g protein)'].concat(Object.keys(E.S().custom).filter(n=>E.S().custom[n].p100>0));
      return `<div class="hint">For the days food alone will not reach your protein target. When you are short late in the day, Today offers it in one tap.</div>
        ${opts.map(n=>{const f=E.food(n);return f?`<button class="chk" data-a="backupset:${esc(n)}" aria-pressed="${cur===n}"><i>✓</i><span>${esc(n)}<small>${f.kcal} kcal · ${Math.round(f.p)} g protein per ${f.ug} g</small></span></button>`:''}).join('')}
        <button class="chk" data-a="backupset:"><i>✓</i><span>No backup<small>Hide the suggestion</small></span></button>
        <div class="stack2"><button class="btn vio" data-a="backupLabel">Enter my protein powder from its label</button></div>
        <div class="small">Brands differ a lot. Read the "per serving" column on your tub (for example Yogabar) and enter it: serving size in grams, calories, protein, carbs and fat.</div>`}},
  routine:{t:'Training routine',html:()=>`<div id="rxWrap">${routineEditor()}</div>`},
  rules:{t:'Rules and teasing',html:()=>{const c=E.cfg();return `<div class="small" style="margin-top:0">Penalties</div>${seg('strict',[['chill','Chill'],['standard','Standard'],['hard','Hard']],c.strict).replace('seg2','seg2 full')}
    <div class="small" id="strictTxt">${strictTxt(c.strict)}</div>
    <div class="small">Pain days never count as a skip. You also get one rest pass a week.</div>
    <div class="small" style="margin-top:14px">Teasing when you slack</div>${seg('roast',[['off','Off'],['playful','Playful'],['savage','Savage']],c.roast).replace('seg2','seg2 full')}
    <div class="small" id="roastTxt">${roastTxt(c.roast)}</div>
    <label class="fr col"><span>Habit contract: a real cost when you skip (you enforce it)</span><textarea data-cfg="contract" rows="2" placeholder="e.g. No Instagram or YouTube until I train. Rs 100 into the cheat jar.">${esc(c.contract)}</textarea></label>`}},
  look:{t:'Look and sound',html:()=>{const c=E.cfg();return `<div class="themes">
      <button class="th auto" data-a="theme:auto" aria-pressed="${c.theme==='auto'}" style="--c:${F.THEMES[E.realm().theme].glow};--c2:${F.THEMES[E.realm().theme].acc}"><i></i>My realm</button>
      ${Object.keys(F.THEMES).map(k=>`<button class="th" data-a="theme:${k}" aria-pressed="${c.theme===k}" style="--c:${F.THEMES[k].glow};--c2:${F.THEMES[k].acc}"><i></i>${F.THEMES[k].name}</button>`).join('')}</div>
    <div class="small">"My realm" changes the look every time a boss gate falls. Pick a fixed colour if you prefer.</div>
    <label class="fr"><span>Sound</span>${seg('snd',[[1,'On'],[0,'Off']],c.sound?1:0)}</label>
    <label class="fr col"><span>Volume</span><input type="range" min="0" max="1" step="0.05" value="${c.volume}" data-vol="1" aria-label="Volume"></label>
    <label class="fr"><span>Vibration</span>${seg('hap',[[1,'On'],[0,'Off']],c.haptics?1:0)}</label>`}},
  samsung:{t:'Samsung Health',html:()=>{const N=HS.native;if(!(N&&N.native()))return '<div class="small" style="margin-top:0">Samsung Health sync works in the Android app. This is the browser version.</div>';const hs=E.S().health;
    return `${hs.on?`<div class="hrow"><div><b>Connected</b><small>Steps, distance, floors, active calories, heart rate, sleep and weight, read-only.</small></div><button class="btn ghost sm" data-a="hsync">Sync now</button></div>`:`<div class="small" style="margin-top:0">Reads steps, distance, floors, active calories, heart rate, sleep and weight from Samsung Health through Health Connect. Nothing is written back and nothing leaves your phone.</div><div class="stack2"><button class="btn good" data-a="hconnect">Connect Samsung Health</button></div>`}
      <div class="stack2"><button class="btn ghost" data-a="healthOpen2">See today’s data</button></div>
      <div class="small">If the permission window does not appear, open Samsung Health, then Settings, then Health Connect, and allow it there.</div>`}},
  remind:{t:'Reminders',html:()=>{const N=HS.native;if(!(N&&N.native()))return '<div class="small" style="margin-top:0">Reminders work in the Android app.</div>';const rm=E.S().remind;
    return `<label class="fr"><span>Daily nudges</span>${seg('remind',[[1,'On'],[0,'Off']],rm.on?1:0)}</label>
      ${rm.on?['weigh','lunch','dinner','rehab','spark','clear'].map(k=>`<label class="fr"><span>${{weigh:'Weigh-in',lunch:'Lunch',dinner:'Dinner',rehab:'Rehab',spark:'Streak at risk',clear:'Clear the day'}[k]}</span><input type="time" data-rm="${k}" value="${esc(rm[k]||HS.notify.DEFAULT[k])}"></label>`).join(''):''}
      <div class="small">Friendly pokes from the System at the times you choose. "Streak at risk" only fires if the day is not lit yet. They are scheduled on this phone, no internet needed.</div>`}},
  widgets:{t:'Home-screen widgets',html:()=>{const W=HS.widget,nat=W&&W.available();return `<div class="hint">Three widgets show your day without opening the app: <b>Streak</b> (the flame), <b>Streak week</b> (the flame and your last seven days) and <b>Today</b> (calories left, protein, water, your next move and a +250 ml button).</div>
      <div class="wprev"><div class="wp1"><b>10</b><span>day streak</span></div><div class="wp2"><div><b>1,437</b><span>kcal left</span></div><div><b>79/140</b><span>g protein</span></div><div><b>1.8/3</b><span>L water</span></div></div></div>
      ${nat?`<div class="sec">How to add one</div><ol class="steps"><li>Touch and hold an empty spot on your home screen.</li><li>Tap <b>Widgets</b>, then find <b>Habit Sync</b>.</li><li>Drag <b>Streak</b>, <b>Streak week</b> or <b>Today</b> onto the screen.</li></ol>
        <div class="stack2"><button class="btn" data-a="widgetPush">Refresh the widgets now</button></div>`:'<div class="note">Widgets work in the Android app. In the browser version there is nothing to add.</div>'}
      <div class="small">Widgets update whenever you use the app. They show what the app last knew, so open it once after a meal for the freshest numbers. Nothing leaves your phone.</div>`}},
  menu:{t:'Mess menu',html:()=>{const di=E.di();return `<div class="tg" style="margin-top:0;flex-wrap:wrap">${DAYN.map((n,i)=>`<button data-a="menuday:${i}" aria-pressed="${(U.sh.day==null?di:U.sh.day)===i}">${n.slice(0,3)}</button>`).join('')}</div>
      ${(()=>{const d=U.sh.day==null?di:U.sh.day,mm=HS.menuDay(d);return ['breakfast','lunch','dinner'].map(k=>`<div class="sec">${cap(k)}</div><div class="menuchips">${mm[k].map(n=>{const f=E.food(n);return `<span>${HS.emoji(n)} ${esc(n)}<small>${f?f.kcal+' kcal':''}</small></span>`}).join('')}</div>`).join('')})()}
      <div class="small">Typed from the printed IIM Kozhikode students mess menu, October 2026. The mess says the menu is tentative. When a new month’s menu arrives, send it over and it gets updated here.</div>`}},
  backup:{t:'Backup and data',html:()=>`<div id="vaultWrap">${vaultHtml()}<div class="stack2"><button class="btn bad" data-a="reset" id="resetBtn">Reset everything</button></div></div>`},
  sources:{t:'Where the numbers come from',html:()=>`<div class="sec" style="margin-top:0">Foods</div><div class="hp2">Every food has calories, protein, carbohydrate, fat, fibre and the main vitamins and minerals per 100 g. They come from the <b>Indian Food Composition Tables 2017</b> (IFCT, National Institute of Nutrition, Hyderabad, ICMR), the national reference for Indian foods. Cooked mess dishes are <b>recipes built from those rows</b>: for example, dal tadka is about 14 g of dry toor dal, onion, tomato and 2 g of oil in every 100 g served. Packed and restaurant foods (protein bars, whey, biscuits, shawarma) are typical values and are marked <b>TYPICAL</b>.</div>
      <div class="sec">How close is it?</div><div class="hp2">Single foods such as eggs, milk and rice are usually within 10 percent, packed foods match their label, and a few rows (paneer, roasted snacks, fried foods) depend on the brand or the cook. Mess dishes can be off by 15 to 25 percent, sometimes more, because oil, portion size and how thin the dal is change daily. The portion ruler, the “add from a label” form and your own weight trend are the checks. If the weight trend disagrees with the calories for two weeks, trust the trend: the Weekly report shows that cross-check.</div>
      <div class="sec">What is not included</div><div class="hp2">IFCT counts only available carbohydrate and part of the fibre as energy, so dals, chickpeas and rajma read about 20 percent lower than US tables such as the USDA one that most phone apps use. Both are honest; they use different rules. Vitamin B12 is not measured in IFCT, so it is not shown. Vitamin D only counts from animal foods, because IFCT lists large D2 values in some cereals and spices that no other source supports. Cooking losses of vitamin C, folate and B vitamins are estimated. Targets are the ICMR-NIN 2020 allowances for men of your age, rounded. They are guides, not a diagnosis: ask your doctor about supplements and blood tests.</div>
      <div class="note">Every dish with its recipe, the old estimate it replaced and the checks run on it are in the project folder: prototype/tools/nutrition/REPORT.md.</div>`}
};
function renderSetting(sec){
  const s=SECS[sec];if(!s)return;
  const full=sec==='routine'||sec==='backup'||sec==='menu'||sec==='sources';
  U.openSheet(s.t,s.html(),s.foot||'<button class="btn ghost" data-a="close">Done</button>',{full:full});
  const rf=$('#restoreFile');if(rf)rf.addEventListener('change',onRestoreFile);
}
U.settingSheet=function(sec){U.sh={type:'set',sec:sec,day:null};renderSetting(sec)};
A.set_=function(v){F.play('nav');U.settingSheet(v)};
A.menuday=function(v){U.sh.day=+v;F.play('tick',140);U.keepScroll(()=>renderSetting('menu'))};
A.healthOpen2=function(){U.healthSheet()};
A.sgoalset=function(v){E.cfg().sparkGoal=+v;E.save();F.play('pick');refreshSet()};
A.backupset=function(v){E.cfg().backup=v;E.save();F.play('pick');refreshSet()};
A.backupLabel=function(){U.customSheet({name:'Yogabar protein powder',g:33,asBackup:true})};
A.widgetPush=async function(){const ok=await HS.widget.push(true);U.sys(ok?'Widgets refreshed.':'Could not reach the widgets. Add one to your home screen first.',ok?'good':'');};

U.views.forge=function(){
  const c=E.cfg(),S=E.S(),L=E.lv(),T=E.T(),hs=S.health,bk=E.backupFood();
  const row=(sec,ic,t,s,badge)=>`<button class="mrow" data-a="set_:${sec}"><span class="mri">${IC[ic]}</span><span class="mrm"><b>${esc(t)}</b><small>${esc(s)}</small></span>${badge?'<em class="bdg">'+esc(badge)+'</em>':''}<i class="chev">${IC.chev}</i></button>`;
  let h='';
  if(U.update)h+=`<a class="btn good rise lnk" style="--i:0;margin:0 0 12px" target="_blank" rel="noopener" href="${esc(U.update.url)}">Update ready: download build ${U.update.latest} (you have ${HS.BUILD})</a>`;
  h+=`<button class="card prof rise" style="--i:0" data-a="set_:profile"><div class="pav">${HS.avatar.svg(S.equip,{mood:'idle'})}</div><div class="pm"><b>${esc(c.name||'PLAYER')}</b><span>Level ${L.L} · rank ${L.rank}</span><small>${S.startW.toFixed(1)} → ${S.cfg.goalW.toFixed(1)} kg · ${fmt(T.kcal)} kcal · ${T.protein} g protein</small></div><i class="chev">${IC.chev}</i></button>
  <div class="slabel rise" style="--i:1">You</div>
  <div class="card more rise" style="--i:1">${row('targets','list','Daily targets',fmt(c.kcal)+' kcal · '+c.protein+' g protein · '+(c.water/1000).toFixed(1)+' L water')}
    ${row('protein','prot','Protein backup',bk?bk.name.replace(/\s*\(.*\)/,'')+' · '+Math.round(bk.p)+' g per scoop':'None set')}
    ${row('routine','gym','Training routine','Push, Pull, Legs · sets, reps and your 40 kg cap')}
    ${row('rules','shield','Rules and teasing','Penalties '+cap(c.strict)+' · teasing '+cap(c.roast))}</div>
  <div class="slabel rise" style="--i:2">Connected</div>
  <div class="card more rise" style="--i:2">${row('samsung','heartbeat','Samsung Health',hs.on?'Connected':'Not connected')}
    ${row('remind','bell','Reminders',S.remind.on?'On':'Off')}
    ${row('widgets','widget','Home-screen widgets','Streak, week and Today')}
    ${row('menu','food','Mess menu','October 2026, typed from the printed menu')}</div>
  <div class="slabel rise" style="--i:3">App</div>
  <div class="card more rise" style="--i:3">${row('look','user','Look and sound',(c.theme==='auto'?'My realm':'Fixed colour')+' · sound '+(c.sound?'on':'off'))}
    ${row('backup','down','Backup and data',E.backupDue()?'Back up now':(E.dataInfo().days+' days stored'),E.backupDue()?'!':'')}
    ${row('sources','info','Where the numbers come from','IFCT 2017, recipes and how accurate it is')}
    <button class="mrow" data-a="help"><span class="mri">${IC.star}</span><span class="mrm"><b>How the game works</b><small>Aura, ranks, streaks, gates and realms</small></span><i class="chev">${IC.chev}</i></button></div>
  <div class="foot rise" style="--i:4">Habit Sync ${HS.VERSION||''}${HS.BUILD?' · build '+HS.BUILD:''}. Every number stays on this phone. Mess dishes are estimates.</div>`;
  $('#screen').innerHTML=h;
};


/* ---------------- how the game works ---------------- */
A.help=function(){
  U.sh={type:'help'};
  const S=E.S(),c=S.cfg,pl=E.plan();
  const sec=(t,b)=>`<div class="sec">${t}</div><div class="hp2">${b}</div>`;
  U.openSheet('How it works',
    sec('Aura and levels','Everything you do earns <b>aura</b>: a weigh-in, a finished plate, a workout, rehab, water, sleep, a cleared day. Aura builds your level. Level 2 needs 200 aura and every level after that needs a little more. A new <b>rank</b> (E, D, C, B, A, S) arrives every six levels: D at level 6 (about 5,000 aura), then C, B, A, and S at level 30. Steady play reaches A around the end of the campaign. Early levels come fast so you feel progress. Later ones are earned.')+
    sec('Quests and clearing the day','Each day has quests: weigh-in with last night\u2019s sleep, three meals, a workout (or rest), rehab, protein. One score runs through the whole app, the <b>six pillars</b>: <b>check-in</b>, <b>fuel</b> (two meals logged), <b>protein</b>, <b>move</b> (train, or on a rest day a walk, rehab or 6,000 steps), <b>rehab</b> and <b>water</b>. The same pillars light your streak flame and fill the tally when you clear the day. Three or more is a good day. Clearing pays a bonus when your calories land inside the window and opens a chest: common, rare for 3 or 4 pillars, epic for 5 or 6.')+
    sec('Real penalties','Skipping a session with no pain costs aura and gives you <b>fatigue</b>: aura gains are halved and your level is locked until you train. Missing a planned session without opening the app is punished when you come back. <b>Pain days are never punished</b>, and you get <b>one rest pass a week</b>. Strictness (Chill, Standard, Hard) is in Settings, under Rules and teasing.')+
    sec('Plates and stars','Every finished plate gets up to three stars: one for logging it, one for 25 g of protein or more, one for balance (a veg side, no sugar, not more than half your day\u2019s calories). Stars pay aura. Sugar and outside food cost a little aura, on purpose.')+
    sec('Bonus quests','Under the daily quests sit three small extras: one ticks itself from your data (like logging all three meals), two you tick yourself (a short walk, ten slow breaths). They are optional and skipping them costs nothing. Finish all three and the day\u2019s chest goes up a tier. Thirty bonus quests earn a title.')+
    sec('Streaks and goals','Five weekly goals are picked fresh every Monday. Streaks pay milestone rewards at 3, 7, 14, 30 and 60 days. Training streaks skip rest days and pain days. The clear streak forgives one off day, because never missing <i>twice</i> is the rule that works.')+
    sec('Gates, bosses and realms','You are going from '+S.startW+' kg to '+c.goalW+' kg in '+pl.gates.length+' gates of '+c.gateStep+' kg of <i>trend</i>. Every fourth kilo is a <b>boss gate</b>: it opens a new realm that changes the colours, backdrop and weather of the whole app, unlocks gear, lowers your daily calories a little, and starts a <b>camp week</b> at maintenance so you recover before the next push.')+
    sec('Gear','Gear is never bought. It unlocks when you do the work, and the closest unlock is always shown on the Hunter tab. Wear whatever you have earned.')+
    sec('Rehab','Rehab comes from your physio\u2019s list, spread over the training cycle. The guided session shows one move at a time with a moving outline and a hold timer. Your pain check-in sets a traffic light: green carries on, amber holds the strength work back, red keeps it gentle and tells you to message your physio.')+
    sec('Your data','Everything is stored on this phone only. Save a backup file now and then from Backup and data in Settings. A reset or restore keeps one undo copy there. Your day ends at '+(c.dayStart==null?3:c.dayStart)+' am, so clearing it after midnight still counts for yesterday.'),
    '<button class="btn" data-a="close">Got it</button>');
};

/* ---------------- settings actions ---------------- */
A.gate=v=>{E.cfg().gateStep=parseFloat(v);E.save();refreshSet()};
A.camp=v=>{E.cfg().camp=v==='1';E.save();refreshSet()};
A.autok=v=>{E.cfg().autoKcal=v==='1';E.save();refreshSet()};
A.dayend=v=>{E.cfg().dayStart=+v;E.setShift(+v);E.save();refreshSet()};
A.strict=v=>{E.cfg().strict=v;E.save();refreshSet()};
A.roast=v=>{E.cfg().roast=v;E.save();F.play(v==='off'?'pick':'wah');refreshSet()};
A.theme=v=>{E.cfg().theme=v;E.save();F.applyTheme();F.play('pick');refreshSet()};
A.snd=v=>{E.cfg().sound=v==='1';E.save();if(E.cfg().sound){F.unlock();F.play('pick')}refreshSet()};
A.hap=v=>{E.cfg().haptics=v==='1';E.save();F.vib(30);refreshSet()};
A.rtab=v=>{rTab=v;$('#rxWrap').innerHTML=routineEditor()};
A.rxs=v=>{const p=v.split(':'),x=E.routine(rTab)[+p[0]];x.sets=Math.max(1,Math.min(8,x.sets+ +p[1]));E.save();$('#rxWrap').innerHTML=routineEditor()};
A.rxr=v=>{const p=v.split(':'),x=E.routine(rTab)[+p[0]];x.reps=Math.max(1,Math.min(30,x.reps+ +p[1]));E.save();$('#rxWrap').innerHTML=routineEditor()};
A.rxcap=v=>{const x=E.routine(rTab)[+v];x.cap=!x.cap;E.save();$('#rxWrap').innerHTML=routineEditor()};
A.rxdel=v=>{E.routine(rTab).splice(+v,1);E.save();$('#rxWrap').innerHTML=routineEditor()};
A.rxadd=()=>{const n=$('#rxNew').value.trim();if(!n){U.sys('Type an exercise name first.','bad');return}
  E.routine(rTab).push({n:n,g:$('#rxNewG').value.trim()||'Other',sets:3,reps:10});E.save();F.play('pick');$('#rxWrap').innerHTML=routineEditor()};
A.install=async function(){const ok=await HS.pwa.install();U.sys(ok?'Installed. Open it from your home screen.':'Install cancelled.','');};
A.remind=async function(v){
  const rm=E.S().remind;
  if(v==='1'){
    const r=await HS.notify.enable();
    if(!r.ok){U.sys(r.msg,'bad');return}
    rm.on=true;
  }else{rm.on=false;await HS.notify.disable()}
  E.save();refreshSet();
};

/* backup and restore */
const stamp=()=>E.dkey();
A.bkSave=async function(){
  const txt=E.backupText(),name='habit-sync-backup-'+stamp()+'.json';
  const showText=(why)=>{$('#exWrap').innerHTML='<div class="small">'+why+'</div><textarea class="ta" id="bkText" readonly aria-label="Backup text">'+esc(txt)+'</textarea>'};
  try{
    if(HS.native&&HS.native.native()&&await HS.native.saveFile(name,txt)){E.markBackup();U.sys('Backup ready. Choose where to keep it: Drive, WhatsApp, Files.','good');U.render();return}
    const blob=new Blob([txt],{type:'application/json'}),a=document.createElement('a');
    a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();
    setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1500);
    E.markBackup();
    U.sys('Backup file requested: '+name+'.','good');
    /* some embedded viewers silently block downloads, so the text is always shown as a fallback */
    showText('If no file appeared in your downloads, copy this text and keep it somewhere safe. It is the same backup.');
  }catch(e){
    showText('Your browser blocked the download. Copy this text and keep it somewhere safe:');
  }
  E.dataInfo();
};
A.bkCopy=function(){
  const txt=E.backupText();
  $('#exWrap').innerHTML='<div class="small" id="bkMsg">Select all of this text and copy it:</div><textarea class="ta" id="bkText" readonly aria-label="Backup text">'+esc(txt)+'</textarea>';
  const ta=$('#bkText');
  U.copyText(txt,ta).then(ok=>{
    const m=$('#bkMsg');if(!m)return;
    if(ok){E.markBackup();m.textContent='Copied to the clipboard. Paste it into a note or message to yourself.';U.sys('Backup text copied.','good')}
    else{ta.focus();ta.select();U.sys('Select and copy the text below.','good')}
  });
};
function onRestoreFile(e){
  const f=e.target.files&&e.target.files[0];if(!f)return;
  const r=new FileReader();
  r.onload=()=>{
    try{const n=E.importText(String(r.result));U.sys('Restored '+n+' days from '+f.name+'.','good');U.tab='home';U.render(true)}
    catch(err){U.sys(err.message,'bad')}
  };
  r.readAsText(f);
}
/* a destructive button needs a deliberate second tap: not an instant double tap, and not after it has timed out */
function armed(el,label,again){
  const now=Date.now();
  if(el.dataset.armed){if(now-(+el.dataset.at||0)<800)return false;return true}
  el.dataset.armed='1';el.dataset.at=now;el.textContent=again;
  setTimeout(()=>{if(el.isConnected){delete el.dataset.armed;delete el.dataset.at;el.textContent=label}},3500);
  return false;
}
A.bkAuto=function(b,el){
  if(!armed(el,'Restore yesterday’s automatic copy','Tap again to replace everything with the automatic copy'))return;
  try{const n=E.restoreAuto();U.sys('Restored '+n+' days from the automatic copy. You can undo this in Backup and data.','good');U.tab='home';U.render(true)}catch(err){U.sys(err.message,'bad')}
};
A.bkPaste=function(){
  $('#exWrap').innerHTML='<div class="small">Paste the backup text here, then restore. It replaces what is on this phone, and you can undo it.</div><textarea class="ta" id="pasteBk" aria-label="Backup text to restore" placeholder="Paste the backup text"></textarea><div class="stack2"><button class="btn ghost" data-a="bkPasteGo">Restore from this text</button></div>';
  $('#pasteBk').focus();
};
A.bkPasteGo=function(v,el){
  const t=($('#pasteBk')||{}).value;if(!t||!t.trim()){U.sys('Paste the backup text first.','bad');return}
  if(!armed(el,'Restore from this text','Tap again to replace everything with this text'))return;
  try{const n=E.importText(t.trim());U.sys('Restored '+n+' days from the pasted text. You can undo this in Backup and data.','good');U.tab='home';U.render(true)}
  catch(err){U.sys(err.message,'bad')}
};
A.undo=function(b,el){
  if(!armed(el,el.textContent,'Tap again to bring back what you had before'))return;
  try{const n=E.undoLast();U.sys('Back to '+n+' days, as before.','good');U.tab='home';U.render(true)}catch(err){U.sys(err.message,'bad')}
};
A.reset=function(v,b){
  if(!armed(b,'Reset everything','Tap again to erase everything'))return;
  E.reset();U.tab='home';F.applyTheme();U.render(true);U.sys('Everything cleared. You can undo this in Backup and data.','');
};
document.addEventListener('input',e=>{
  const t=e.target;
  if(t.dataset.cfg){
    const S=E.S(),c=E.cfg(),k=t.dataset.cfg;let v=t.value;
    if(t.type==='number'){v=parseFloat(v);if(isNaN(v))return}
    if(t.dataset.root)S[k]=v;else c[k]=v;E.save();
  }else if(t.dataset.rx){
    const x=E.routine(rTab)[+t.dataset.i];if(x){x[t.dataset.rx]=t.value;E.save()}
  }else if(t.dataset.vol){
    E.cfg().volume=parseFloat(t.value);E.save();
  }else if(t.dataset.rm){
    const rm=E.S().remind;rm[t.dataset.rm]=t.value;E.save();HS.notify&&HS.notify.schedule();
  }
});
document.addEventListener('change',e=>{if(e.target.dataset&&e.target.dataset.vol){F.play('pick')}});

/* ---------------- first run: the awakening ---------------- */
U.welcome=function(){
  U.sh={type:'welcome',roast:'playful'};
  const c=E.cfg(),S=E.S();
  U.openSheet('Awakening',
    `<div class="wel"><div class="wav">${HS.avatar.svg(S.equip,{mood:'idle'})}</div>
      <h2>Welcome, hunter.</h2>
      <p>Every quest you finish builds your character. Skipped quests cost you. Your data never leaves this phone.</p>
      <label class="fr"><span>Your name</span><input id="wName" type="text" maxlength="14" value="${esc(c.name==='PLAYER'?'':c.name)}" placeholder="PLAYER"></label>
      <label class="fr"><span>Weight today (kg)</span><input id="wStart" type="number" inputmode="decimal" step="0.1" value="${S.startW}"></label>
      <label class="fr"><span>Goal weight (kg)</span><input id="wGoal" type="number" inputmode="decimal" step="0.5" value="${c.goalW}"></label>
      <div class="small" style="margin-top:12px">When you slack, the System can tease you. It only ever teases the skipped habit, never your body.</div>
      <div id="wRoast">${seg('wroast',[['off','Off'],['playful','Playful'],['savage','Savage']],'playful').replace('seg2','seg2 full')}</div></div>`,
    '<button class="btn" data-a="wGo">ARISE</button><button class="link" data-a="wRestore">I already have a backup</button>');
};
A.wRestore=function(){
  U.closeSheetQuiet();U.tab='forge';U.render(true);
  setTimeout(()=>U.settingSheet('backup'),350);
};
A.wroast=function(v){U.sh.roast=v;$('#wRoast').innerHTML=seg('wroast',[['off','Off'],['playful','Playful'],['savage','Savage']],v).replace('seg2','seg2 full');F.play('pick')};
A.wGo=function(){
  const S=E.S(),c=E.cfg();
  const sw=parseFloat($('#wStart').value),gw=parseFloat($('#wGoal').value),nm=$('#wName').value.trim();
  if(!(sw>30&&sw<250)||!(gw>30&&gw<sw)){U.sys('Enter your weight today, and a goal weight below it.','bad');return}
  S.startW=Math.round(sw*10)/10;c.goalW=Math.round(gw*2)/2;c.name=(nm||'PLAYER').toUpperCase();c.roast=U.sh.roast||'playful';
  c.kcal=E.kcalFor(S.startW);c.protein=Math.round(2*c.goalW/5)*5;
  S.start=E.dkey();S.welcomed=true;E.save();
  U.closeSheetQuiet();
  U.render(true);
  F.play('arise');F.vib([40,40,40,40,200]);F.burstCenter(110);
  U.cele({kind:'realm',ms:3800,html:'<div class="rays"></div><div class="kicker">THE SYSTEM HAS CHOSEN YOU</div><h1>ARISE</h1><p>'+esc(c.name)+', your first gate is '+(S.startW-c.gateStep).toFixed(1)+' kg. Start with the scale.</p>'});
};
})();
