/* ui-sheets.js: the task windows. Plate (food), workout logger, rehab with animated outlines and roadmap, weigh-in, clear the day, physio sheet. */
(function(){
'use strict';
const HS=window.HS=window.HS||{};
const E=HS.E,F=HS.fx,U=HS.ui;
const esc=U.esc,fmt=U.fmt,cap=U.cap,hhmm=U.hhmm,$=U.$,A=U.act;
const seg=(g,opts,cur)=>`<div class="seg">${opts.map(o=>`<button data-a="${g}:${o[0]}" aria-pressed="${cur===o[0]}" class="${o[0]==='sharp'?'sharp':''}">${o[1]}</button>`).join('')}</div>`;

/* =====================================================================
   PLATE: build the meal. Tiles fly onto a plate, macros fly into the counters, the combo walks up a scale,
   and portions are set by scrolling a ruler that ticks under your thumb.
   ===================================================================== */
const PX=2,MAXG=800;
let rulerTimer=null;
U.plateSheet=function(meal){
  U.sh={type:'plate',meal:meal,edit:-1,combo:0,last:0,lastName:null,rulerUser:false};
  U.openSheet(meal==='snack'?'Snack':cap(meal),
    `<div class="pl">
      <div class="stage">
        <div class="sd"><b id="sK">0</b><span>KCAL TODAY</span><em id="sKL"></em></div>
        <div class="pw"><svg class="pring" viewBox="0 0 180 180" aria-hidden="true"><circle class="trk" cx="90" cy="90" r="82"/><circle id="prK" class="arc k" cx="90" cy="90" r="82" pathLength="100"/><circle class="trk" cx="90" cy="90" r="71"/><circle id="prP" class="arc p" cx="90" cy="90" r="71" pathLength="100"/></svg>
          <div class="disc" id="disc"></div><div class="combo" id="combo"></div></div>
        <div class="sd r"><b id="sP">0</b><span>G PROTEIN</span><em id="sPL"></em></div>
      </div>
      <div class="plate" id="plate"></div><div id="ed"></div>
      <div class="inrow"><input id="mIn" type="text" enterkeyhint="done" autocomplete="off" autocapitalize="none" aria-label="Type what you ate" placeholder="Type: 2 chapati, rice 200g, shake 400 kcal"><button data-a="mAdd">ADD</button></div>
      <div class="sug" id="mSug"></div>
      <div class="rows" id="rows"></div></div>`,
    `<button class="btn" data-a="mealDone">Done</button><button class="link" data-a="mealSkip" id="mSkip">Skip this meal</button>`,{full:true,col:true});
  $('#mSkip').hidden=meal==='snack';
  drawRows();drawPlate();drawStage(true);
};
function items(){const sh=U.sh,d=E.day();return d.items.map((it,ix)=>({it:it,ix:ix})).filter(o=>o.it.meal===sh.meal)}
function drawStage(first){
  const sh=U.sh;if(!sh||sh.type!=='plate')return;
  const d=E.day(),T=E.T(),tot=E.totals(d);
  const kp=Math.min(100,tot.k/T.kcal*100),pp=Math.min(100,tot.p/T.protein*100);
  $('#prK').style.strokeDashoffset=100-kp;$('#prP').style.strokeDashoffset=100-pp;
  $('#prK').classList.toggle('over',tot.k>T.hi);$('#prP').classList.toggle('full',tot.p>=T.protein);
  const sK=$('#sK'),sP=$('#sP');
  F.countTo(sK,tot.k,null,500);F.countTo(sP,tot.p,null,500);
  $('#sKL').textContent=(T.kcal-tot.k>=0?fmt(T.kcal-tot.k)+' left':fmt(tot.k-T.kcal)+' over');
  $('#sPL').textContent=tot.p>=T.protein?'target hit':fmt(T.protein-tot.p)+' to go';
  /* the plate itself */
  const its=items(),n=its.length,disc=$('#disc');
  let h='';
  if(!n)h='<span class="dempty">tap food</span>';
  const show=its.slice(-7);
  show.forEach((o,i)=>{
    const f=E.food(o.it.name),u=E.units(f,o.it.g),sz=Math.round(30+16*Math.max(-.4,Math.min(1.3,u-1)));
    let x=0,y=0;
    if(show.length>1){const a=-Math.PI/2+i*(2*Math.PI/show.length);x=Math.cos(a)*34;y=Math.sin(a)*34}
    h+='<span class="fd'+(sh.lastName===o.it.name&&!first?' drop':'')+(sh.edit===o.ix?' sel':'')+'" style="--x:'+x.toFixed(0)+'px;--y:'+y.toFixed(0)+'px;font-size:'+sz+'px" data-a="edit:'+o.ix+'">'+HS.emoji(o.it.name)+'</span>';
  });
  if(n>7)h+='<em class="more">+'+(n-7)+'</em>';
  disc.innerHTML=h;
}
function drawPlate(){
  const sh=U.sh;if(!sh||sh.type!=='plate')return;
  const its=items(),d=E.day();
  $('#plate').innerHTML=its.map(o=>`<button class="pc${sh.edit===o.ix?' sel':''}" data-a="edit:${o.ix}">${HS.emoji(o.it.name)} ${esc(o.it.name)}<small>${Math.round(o.it.g)} g</small></button>`).join('');
  const ed=$('#ed');
  if(sh.edit>=0&&d.items[sh.edit]&&d.items[sh.edit].meal===sh.meal){
    const it=d.items[sh.edit],f=E.food(it.name);
    let lab='';for(let g=0;g<=MAXG;g+=100)lab+='<b style="left:'+(g*PX)+'px">'+g+'</b>';
    ed.innerHTML=`<div class="ed"><div class="edh"><span>${HS.emoji(it.name)} ${esc(it.name)}</span><button data-a="edClose" aria-label="Close editor">×</button></div>
      <div class="gbigr"><b id="gNum">${Math.round(it.g)}</b><span>g</span><em id="gUnits"></em></div>
      <div class="rw"><div class="ruler" id="ruler" aria-label="Scroll to set grams"><i class="sp"></i><div class="rin">${lab}</div><i class="sp"></i></div><div class="needle"></div></div>
      <div class="edq"><button data-a="gx:.5">½×</button><button data-a="gx:1">1×</button><button data-a="gx:1.5">1½×</button><button data-a="gx:2">2×</button><button class="del" data-a="gdel">Remove</button></div>
      <div class="edi" id="edI"></div></div>`;
    sh.rulerUser=false;
    const ru=$('#ruler');
    requestAnimationFrame(()=>{ru.scrollLeft=it.g*PX;drawEdInfo()});
    const go=()=>{sh.rulerUser=true};
    ru.addEventListener('pointerdown',go);ru.addEventListener('touchstart',go,{passive:true});ru.addEventListener('wheel',go,{passive:true});
    ru.addEventListener('scroll',onRuler,{passive:true});
  }else{sh.edit=-1;ed.innerHTML=''}
}
function onRuler(){
  const sh=U.sh;if(!sh||!sh.rulerUser)return;
  const d=E.day(),it=d.items[sh.edit];if(!it)return;
  const ru=$('#ruler'),g=Math.max(5,Math.min(MAXG,Math.round(ru.scrollLeft/PX/5)*5));
  if(g===it.g)return;
  const oldB=Math.floor(it.g/10);it.g=g;
  if(Math.floor(g/10)!==oldB){F.play('tick',g);F.vib(4)}
  $('#gNum').textContent=g;drawEdInfo();updateChip();
  drawStage();E.checkProtein();
  clearTimeout(rulerTimer);rulerTimer=setTimeout(()=>{E.save();drawRows()},180);
}
function updateChip(){const c=document.querySelector('.pc.sel small');const it=E.day().items[U.sh.edit];if(c&&it)c.textContent=Math.round(it.g)+' g'}
function drawEdInfo(){
  const sh=U.sh;if(!sh||sh.edit<0)return;
  const it=E.day().items[sh.edit];if(!it)return;
  const f=E.food(it.name),n=E.nut(f,it.g),u=E.units(f,it.g);
  const e=$('#edI');if(e)e.textContent='1 serving = '+f.ug+' g ('+f.kcal+' kcal). This is '+u+' serving'+(u===1?'':'s')+': '+Math.round(n.k)+' kcal, '+Math.round(n.p)+' g protein.';
  const gu=$('#gUnits');if(gu)gu.textContent=u+' × '+(/^\d/.test(f.unit)?f.unit:f.unit);
}
function tile(name,cls){
  const f=E.food(name);if(!f)return'';
  const d=E.day(),g=d.items.filter(i=>i.name===name&&i.meal===U.sh.meal).reduce((a,i)=>a+i.g,0);
  const lab=/^\d/.test(f.unit)?f.unit:'1 '+f.unit;
  return `<button class="tile r-${f.rar} ${cls||''}" data-a="add:${esc(name)}"><span class="te">${HS.emoji(name)}</span><span class="tn">${esc(name)}</span><span class="tk">${f.kcal} kcal · ${esc(lab)}</span>${g?`<b>${E.units(f,g)}</b>`:''}</button>`;
}
function utile(u){
  const f=E.food(u.name);if(!f)return'';
  const k=Math.round(E.nut(f,u.g).k);
  return `<button class="tile r-${f.rar} usual" data-a="usual:${esc(u.name)}|${u.g}"><span class="te">${HS.emoji(u.name)}</span><span class="tn">${esc(u.name)}</span><span class="tk">${Math.round(u.g)} g \u00B7 ${k} kcal</span><i class="ux">${u.n}\u00D7</i></button>`;
}
function drawRows(){
  const sh=U.sh;if(!sh||sh.type!=='plate')return;
  const pool=E.poolFor(sh.meal).map(E.food).filter(Boolean),by=c=>pool.filter(f=>f.cat===c).sort((a,b)=>b.p-a.p).map(f=>f.name);
  const pk=E.picks(sh.meal),treats=Array.from(new Set(by('treat').concat(HS.OUTSIDE)));
  const row=(t,names,cls,tc)=>names.length?`<div class="rl2"><div class="rt ${tc||''}">${t}</div><div class="tiles">${names.map(n=>tile(n,cls)).join('')}</div></div>`:'';
  const empty=!items().length,last=empty?E.lastMeal(sh.meal):null,us=E.usuals(sh.meal);
  const rep=last?`<button class="repeat" data-a="repeat"><span class="ri"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 3-6.2"/><path d="M4 4v5h5"/></svg></span><span class="rm"><b>Same as last time</b><small>${esc(last.items.map(x=>x.name).slice(0,3).join(', '))}${last.items.length>3?' +'+(last.items.length-3):''} \u00B7 ${fmt(last.kcal)} kcal \u00B7 ${U.date(last.k)}</small></span><span class="rg">ONE TAP</span></button>`:'';
  const usr=us.length?`<div class="rl2"><div class="rt pick">Your usuals</div><div class="tiles">${us.map(utile).join('')}</div></div>`:'';
  $('#rows').innerHTML=rep+usr+row('\u2605 System picks for your remaining macros',pk,'pickt','pick')+row('Protein',by('protein'))+row('Carbs',by('carb'))+row('Sides and veg',by('side'))+row('Treats and outside (sugar costs aura)',treats,'trt');
}
const COMBO_MS=4500;
function afterAdd(name,srcEl,mult){
  const sh=U.sh,f=E.food(name),t=Date.now();
  sh.combo=(t-sh.last<COMBO_MS)?sh.combo+1:0;sh.last=t;sh.lastName=name;
  F.play('add',{cat:f.cat,combo:sh.combo});F.vib(sh.combo>=3?[10,20,10]:10);
  const k=Math.round(f.k100*(f.ug)/100*mult),p=Math.round(f.p100*f.ug/100*mult);
  const land=()=>{drawStage();drawPlate();};
  if(srcEl&&$('#disc')){
    F.fly(srcEl,$('#disc'),'<span class="oe">'+HS.emoji(name)+'</span>',{cls:'em',ms:480,arc:70,done:land});
    if(p>=2)F.fly(srcEl,$('#sP'),'+'+p+'g',{cls:'p',ms:760,arc:90});
    F.fly(srcEl,$('#sK'),'+'+k,{cls:'k',ms:700,arc:40});
  }else land();
  const cb=$('#combo');
  if(cb){
    if(sh.combo>=1){cb.textContent='×'+(sh.combo+1)+' COMBO';cb.classList.remove('on');void cb.offsetWidth;cb.classList.add('on');
      if(sh.combo>=3&&$('#disc'))F.burstAt($('#disc'),14);
      clearTimeout(sh.comboT);sh.comboT=setTimeout(()=>{cb.classList.remove('on')},COMBO_MS)}
  }
  drawRows();
}
A.add=function(v,b){
  const sh=U.sh;if(!sh)return;
  const f=E.food(v);if(!f)return;
  E.addFood(v,null,sh.meal);
  afterAdd(v,b,1);
};
E.on('add',a=>{
  if(a.pen)U.sys('Sugar detected: '+a.food.name+' is '+Math.round(a.kcal)+' kcal, '+a.pct+'% of today. −'+a.pen+' aura.','bad',true);
  else if(a.food.sugar)U.sys('Sugar again: '+Math.round(a.kcal)+' kcal ('+a.pct+'% of today). The daily sugar penalty is already used.','',true);
  else if(a.food.out)U.sys(a.food.name+': '+Math.round(a.kcal)+' kcal, '+a.pct+'% of today.','',true);
});
A.sugadd=function(v){
  const sh=U.sh;if(!sh)return;
  const inp=$('#mIn'),parts=inp.value.split(/(,|\+|\band\b)/i),lastRaw=parts.pop(),r=E.parsePart(lastRaw)||{},f=E.food(v);
  E.addFood(v,r.g!=null?r.g:r.units!=null?r.units*f.ug:null,sh.meal);
  afterAdd(v,inp,1);
  inp.value=parts.join('').replace(/[,+]\s*$/,'').trim();$('#mSug').innerHTML='';inp.focus();
};
A.mAdd=function(){
  const sh=U.sh,inp=$('#mIn'),txt=inp.value.trim();if(!sh||!txt)return;
  const miss=[];let unnamed=false,zero=false;
  txt.split(/,|\+|\band\b/i).forEach(p=>{
    const r=E.parsePart(p);if(!r)return;
    if(!r.name){if(r.g!=null||r.kc!=null||r.tn!=null||r.units!=null)unnamed=true;return}
    const hit=E.scoreFoods(r.name,sh.meal)[0];
    if(hit){
      let amt=r.g!=null?r.g:r.units!=null?r.units*hit.ug:r.tn!=null?r.tn:null;
      if(r.kc!=null&&r.g==null&&hit.k100>0)amt=Math.round(r.kc/hit.k100*100);   /* "momos 500 kcal" means 500 kcal of momos */
      else if(r.tn!=null&&r.g==null&&r.units==null&&hit.custom&&hit.k100>0)amt=Math.round(r.tn/hit.k100*100);   /* a custom food was made from kcal, so a bare number stays kcal */
      if(amt!=null&&!(amt>0)){zero=true;return}
      E.addFood(hit.name,amt,sh.meal);afterAdd(hit.name,inp,1);return;
    }
    const kc=r.kc!=null?r.kc:r.tn;
    if(kc){E.customFood(r.name,kc);E.addFood(r.name,r.g!=null?r.g:100,sh.meal);afterAdd(r.name,inp,1);return}
    miss.push(r.name);
  });
  inp.value='';$('#mSug').innerHTML='';
  if(miss.length)U.sys('Not found: '+miss.join(', ')+'. Add a number, like "momos 350 kcal".','bad');
  else if(unnamed)U.sys('Add a name too, like "rice 200g" or "momos 350 kcal".','bad');
  else if(zero)U.sys('An amount of zero adds nothing.','bad');
};
A.edit=function(v){const sh=U.sh;if(!sh||sh.type!=='plate')return;sh.edit=(sh.edit===+v)?-1:+v;F.play('pick');drawPlate();drawStage()};
A.edClose=function(){U.sh.edit=-1;drawPlate();drawStage()};
A.gx=function(v){
  const sh=U.sh,it=E.day().items[sh.edit];if(!it)return;
  const f=E.food(it.name),ru=$('#ruler');sh.rulerUser=true;
  ru.scrollTo({left:Math.round(f.ug*(+v))*PX,behavior:'smooth'});
};
A.gdel=function(){const sh=U.sh;E.removeItem(sh.edit);sh.edit=-1;F.play('remove');F.vib(14);drawPlate();drawStage();drawRows()};
A.usual=function(v,b){
  const sh=U.sh;if(!sh)return;
  const i=v.lastIndexOf('|'),name=v.slice(0,i),g=parseFloat(v.slice(i+1));
  if(!E.food(name))return;
  E.addFood(name,g,sh.meal);afterAdd(name,b,g/E.food(name).ug);
};
A.repeat=function(){
  const sh=U.sh;if(!sh)return;
  const last=E.lastMeal(sh.meal);if(!last)return;
  last.items.forEach((x,i)=>setTimeout(()=>{
    if(!U.sh||U.sh.type!=='plate')return;
    E.addFood(x.name,x.g,sh.meal);afterAdd(x.name,$('#rows .repeat')||$('#mIn'),1);
  },i*170));
};
function starsOverlay(r){
  const filled='<i class="on" style="--i:0">\u2605</i><i class="'+(r.stars>=2?'on':'')+'" style="--i:1">\u2605</i><i class="'+(r.stars>=3?'on':'')+'" style="--i:2">\u2605</i>';
  U.cele({kind:'stars',ms:2800,
    fx:()=>{for(let i=0;i<r.stars;i++)setTimeout(()=>F.play('star',i),380+i*300);if(r.stars===3)setTimeout(()=>F.burstCenter(60),1000)},
    html:'<div class="kicker">PLATE RATING</div><div class="stars">'+filled+'</div><p>'+esc(r.stars===3?'Three stars. Protein and a balanced plate.':r.stars===2?'Solid plate. '+(r.notes[0]||''):'Logged. '+(r.notes[0]||''))+'</p><p class="sub">'+r.k+' kcal \u00B7 '+r.p+' g protein \u00B7 +'+(r.stars*4)+' aura</p>'});
}
A.mealDone=function(){
  const sh=U.sh;if(!sh||sh.type!=='plate')return;
  const d=E.day(),m=sh.meal;
  if(m==='snack'){U.closeSheet();return}
  if(!d.items.some(i=>i.meal===m)){U.sys('Add something first, or skip the meal.','bad');return}
  const r=E.finishMeal(m);
  U.justRow=m;F.play('plate');F.vib([20,30,30]);F.burstCenter(34);U.closeSheet();
  if(r.first)setTimeout(()=>starsOverlay(r),380);
};
A.mealSkip=function(){if(!U.sh||U.sh.type!=='plate')return;E.day().skip[U.sh.meal]=true;E.save();U.closeSheet();U.sys('Meal skipped. Your calories will show it.','')};
document.addEventListener('input',e=>{
  const sh=U.sh;if(!sh||sh.type!=='plate'||e.target.id!=='mIn')return;
  const last=e.target.value.split(/,|\+|\band\b/i).pop(),r=E.parsePart(last);
  const list=r&&r.name?E.scoreFoods(r.name,sh.meal).slice(0,6):[];
  $('#mSug').innerHTML=list.map(f=>`<button class="pc" data-a="sugadd:${esc(f.name)}">${HS.emoji(f.name)} ${esc(f.name)}<small>${f.kcal}</small></button>`).join('');
});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.id==='mIn'){e.preventDefault();A.mAdd()}});

/* =====================================================================
   WORKOUT: tap a set bubble to log it from last time's numbers. Rest timer, PRs, your own weight cap.
   ===================================================================== */
let restTimer=null;
function stopRest(){clearInterval(restTimer);restTimer=null;if(U.sh)U.sh.rest=null}
U.gymSheet=function(){
  const d=E.day();
  U.sh={type:'gym',step:d.workout==='done'?'pain':'choose',tmp:null,exEdit:-1,rest:null};
  const m=d.mins||{};
  U.sh.tmp={lift:m.lift||60,walk:m.walk||15,run:m.run||10,free:d.runFree!=null?d.runFree:3};
  renderGym();
};
const stp=(k,label,sub,v)=>`<div class="stp"><span>${label}<small>${sub}</small></span><div class="c"><button data-a="st:${k}:-5" aria-label="Less ${label}">−</button><i>${v}</i><button data-a="st:${k}:5" aria-label="More ${label}">+</button></div></div>`;
const kg=()=>E.trend()||E.S().startW;
function penaltyLine(){
  const s=E.cfg().strict;
  return s==='chill'?'Skipping costs 30 aura.':s==='hard'?'Skipping costs 100 aura, 1 STR and fatigue. A second miss in a row hits twice.':'Skipping costs 60 aura and fatigue: aura gains halved and your level locked until you train.';
}
function renderGym(){
  const sh=U.sh,d=E.day(),plan=E.planFor();stopRest();
  if(plan==='Rest'&&sh.step==='choose'){U.openSheet('Rest day','<div class="hint">Recovery is part of the plan. Do your rehab and walk.</div>'+seg('sess',[['Push','Push'],['Pull','Pull'],['Legs','Legs'],['Rest','Rest']],plan)+'<div class="small">Wrong day? Pick today\'s real session. The cycle follows from there.</div>','<button class="btn ghost" data-a="close">Got it</button>');return}
  if(sh.step==='lift')return renderLift();
  if(sh.step==='details'){
    const est=E.burnEst(kg(),sh.tmp.lift,sh.tmp.walk,sh.tmp.run);
    U.openSheet(plan+' report',
      '<div class="hint">Quick numbers for your burn estimate.</div>'+stp('lift','Lifting','minutes',sh.tmp.lift)+stp('walk','Incline walk','5 km/h, 9% incline, minutes',sh.tmp.walk)+stp('run','Run','9 km/h, minutes done',sh.tmp.run)+stp('free','Run minutes before pain','0 if no pain at all',sh.tmp.free)+
      `<div class="est">~${fmt(sh.tmp.useH&&d.hWork?d.hWork.kcal:est)} kcal burned<small>Rough estimate, can be off by 30%. Info only: your calorie target already includes training, so do not eat it back.</small></div>`+(d.hWork?`<button class="chipbtn${sh.tmp.useH?' on':''}" data-a="useHB"><b>Samsung Health recorded ${d.hWork.min} min, ${fmt(d.hWork.kcal)} kcal</b><span>${sh.tmp.useH?'Using it':'Use that number'}</span></button>`:''),
      '<button class="btn" data-a="gymNext">Next</button>');
    return;
  }
  if(sh.step==='pain'){
    const p=d.pain||{knee:'none',back:'none'};
    U.openSheet(plan+' done','<div class="hint">How did it feel? This goes in your pain log for the physio.</div><div class="sec">Right knee</div>'+seg('pk',[['none','None'],['mild','Mild'],['sharp','Sharp']],p.knee)+'<div class="sec">Lower back</div>'+seg('pb',[['none','None'],['mild','Mild'],['sharp','Sharp']],p.back)+
      (p.knee==='sharp'||p.back==='sharp'?'<div class="warn">Sharp pain is a stop signal for that movement. Note which exercise caused it and tell your physio.</div>':''),
      '<button class="btn good" data-a="gymFinish">Finish</button>');
    return;
  }
  if(d.workout==='pain'||d.workout==='lazy'||d.workout==='pass'){
    const t=d.workout==='pain'?': pain day':d.workout==='pass'?': rest pass':': skipped';
    U.openSheet(plan+t,'<div class="hint">'+(d.workout==='pain'?'No penalty. Tell your physio what hurt.':d.workout==='pass'?'Covered by your weekly rest pass.':'Logged. Tomorrow you show up.')+'</div>','<button class="btn ghost" data-a="close">Close</button>');return;
  }
  const capn=plan==='Legs'?'<div class="note">Your own cap: 30 to 40 kg on squats and deadlifts until your physio says otherwise.</div>':'';
  const fat=E.fatigued()?'<div class="warn" style="margin-top:0">You are fatigued. Finishing this workout is your comeback quest: it lifts the level lock and the aura penalty.</div>':'';
  U.openSheet(plan+' day',fat+'<div class="hint">Ready?</div>'+seg('sess',[['Push','Push'],['Pull','Pull'],['Legs','Legs']],plan)+capn+'<div class="small">Wrong session? Pick the right one. The cycle follows from there.</div><div class="small pen">'+penaltyLine()+'</div>',
    '<button class="btn" data-a="liftStart">Start workout</button><button class="btn vio" data-a="gym:pain">Pain day, could not train</button>'+(E.passLeft()?'<button class="btn ghost" data-a="gym:pass">Use my weekly rest pass</button>':'')+'<button class="btn bad" data-a="gym:lazy">Skip with no excuse</button>');
}
A.sess=function(v){if(v==='Rest'&&E.planFor()!=='Rest')return;   /* a rest day on demand is the rest pass or a pain day, not a relabel */
  E.setSession(v);E.save();U.sh.step='choose';renderGym()};
A.liftStart=function(){U.sh.step='lift';F.play('pick');renderGym()};
A.gym=function(v){
  const plan=E.planFor();
  if(v==='pain'){E.painDay();U.justRow='gym';U.closeSheet();U.sys('Smart call. Pain day, no penalty. Log what hurt and tell your physio.','')}
  else if(v==='pass'){E.restPass();U.closeSheet();U.sys('Rest pass used. No penalty, no reward. Never miss twice.','')}
  else if(v==='lazy'){E.skipWorkout();U.closeSheet()}
};
function lastTxt(ex){const l=E.S().last[ex.n];return l?'Last: '+l.w+' kg × '+l.r:'First time. Set a starting weight.'}
function renderLift(){
  const sh=U.sh,plan=E.planFor(),list=E.routine(plan),p=E.liftProgress(plan);
  let body='<div class="lh"><div class="xp"><i style="width:'+(p.total?p.done/p.total*100:0)+'%"></i></div><span>'+p.done+' / '+p.total+' sets</span></div>';
  list.forEach((ex,xi)=>{
    const st=E.exState(ex),open=sh.exEdit===xi,w0=st.sets[0]?st.sets[0].w:0,over=ex.cap&&st.sets.some(s=>s.w>HS.CAP_KG);
    body+=`<div class="ex${st.sets.slice(0,ex.sets).every(s=>s.done)?' fin':''}"><div class="exh"><span class="exe">\u{1F4AA}</span><div class="exn"><b>${esc(ex.n)}</b><small>${esc(ex.g)} · ${ex.sets} × ${ex.reps} · ${lastTxt(ex)}</small></div><button class="exb" data-a="exedit:${xi}" aria-label="Edit weight and reps" aria-pressed="${open}">✎</button></div>
      <div class="sets">${st.sets.slice(0,ex.sets).map((s,si)=>`<button class="sb${s.done?' done':''}" data-a="set:${xi}:${si}" aria-pressed="${s.done}" aria-label="Set ${si+1}"><b>${s.r}</b><small>${s.w?s.w+' kg':'set kg'}</small></button>`).join('')}</div>
      ${over?'<div class="warn capw">Above your own '+HS.CAP_KG+' kg cap for this lift.</div>':''}
      ${open?`<div class="exe2"><div class="stp"><span>Weight<small>all sets not done yet</small></span><div class="c"><button data-a="exw:${xi}:-2.5">−</button><i>${w0}</i><button data-a="exw:${xi}:2.5">+</button></div></div>
        <div class="stp"><span>Reps<small>all sets not done yet</small></span><div class="c"><button data-a="exr:${xi}:-1">−</button><i>${st.sets[0].r}</i><button data-a="exr:${xi}:1">+</button></div></div></div>`:''}</div>`;
  });
  U.openSheet(plan+' day',body,'<div class="rest" id="rest" hidden><svg viewBox="0 0 40 40" aria-hidden="true"><circle class="trk" cx="20" cy="20" r="16"/><circle id="restR" class="arc k" cx="20" cy="20" r="16" pathLength="100"/></svg><b id="restT">1:15</b><span>Rest</span><button data-a="restSkip">Skip</button></div><button class="btn good" data-a="liftFinish">Finish workout</button>',{full:true});
}
A.exedit=function(v){const sh=U.sh;sh.exEdit=sh.exEdit===+v?-1:+v;U.keepScroll(renderLift)};
function liftEx(xi){return E.routine(E.planFor())[xi]}
A.exw=function(v){const p=v.split(':'),ex=liftEx(+p[0]),st=E.exState(ex);st.sets.forEach(s=>{if(!s.done)s.w=Math.max(0,Math.round((s.w+ +p[1])*10)/10)});E.save();F.play('tick',st.sets[0].w*5);F.vib(5);U.keepScroll(renderLift)};
A.exr=function(v){const p=v.split(':'),ex=liftEx(+p[0]),st=E.exState(ex);st.sets.forEach(s=>{if(!s.done)s.r=Math.max(1,s.r+ +p[1])});E.save();F.play('tick',200);F.vib(5);U.keepScroll(renderLift)};
A.set=function(v,b){
  const p=v.split(':'),ex=liftEx(+p[0]),st=E.exState(ex),s=st.sets[+p[1]];
  const on=!s.done;
  if(on&&!s.w&&!U.sh.warned){U.sys('Tip: tap the pencil to set a starting weight, then every set uses it.','')}
  E.setDone(ex,+p[1],on);
  if(on){startRest()}
  U.keepScroll(renderLift);
  if(on){const el=document.querySelector('[data-a="set:'+p[0]+':'+p[1]+'"]');if(el){el.classList.add('pop');F.burstAt(el,10)}}
};
E.on('set',e=>{
  if(!e.on){F.play('tap');return}
  if(e.pr){F.play('pr');F.vib([30,40,30,40,160]);F.burstCenter(70);U.overlay('','NEW PR','',e.ex.n+'. +25 aura.',2600)}
  else{F.play('set');F.vib(18)}
  if(e.over)U.sys('Above your own '+HS.CAP_KG+' kg cap. Drop the weight unless your physio cleared it.','bad',true);
});
function startRest(){
  const sh=U.sh;stopRest();sh.rest={end:Date.now()+75000};
  const el=$('#rest');if(!el)return;
  restTimer=setInterval(()=>{
    const r=U.sh&&U.sh.rest,e=$('#rest');if(!r||!e){stopRest();return}
    const left=Math.max(0,r.end-Date.now());e.hidden=false;
    const secs=Math.ceil(left/1000);$('#restT').textContent=Math.floor(secs/60)+':'+String(secs%60).padStart(2,'0');
    $('#restR').style.strokeDashoffset=100-left/75000*100;
    if(left<=0){F.play('timer');F.vib([100,80,100,80,200]);stopRest();e.hidden=true}
  },250);
}
A.restSkip=function(){stopRest();const e=$('#rest');if(e)e.hidden=true};
A.liftFinish=function(){
  const p=E.liftProgress(E.planFor());
  if(!p.done){U.sys('Log at least one set first.','bad');return}
  stopRest();U.sh.step='details';F.play('pick');renderGym();
};
A.st=function(v){const p=v.split(':'),t=U.sh.tmp;t[p[0]]=Math.max(0,t[p[0]]+ +p[1]);F.play('tick',t[p[0]]*4);F.vib(5);renderGym()};
function victory(plan,r,p){
  const d=E.day(),S=E.S(),prs=Object.keys(d.lift||{}).filter(n=>d.lift[n].pr).length,line=U.hype(prs?'pr':'workout'),str=E.streak('workout');
  const stats=[['+'+r.award,'AURA'],[p.done,'SETS'],[d.burn?'~'+fmt(d.burn):'\u2014','KCAL'],[prs||str||1,prs?'PRS':'IN A ROW']];
  U.cele({kind:'victory',ms:5600,sound:'hype',vib:[40,40,40,40,200],
    fx:()=>{F.confetti(140)},
    html:'<div class="rays"></div><div class="kicker">TRAINING COMPLETE</div><div class="vav">'+HS.avatar.svg(S.equip,{mood:'proud'})+'</div><h1>'+plan.toUpperCase()+' DAY</h1><div class="vstats">'+stats.map(x=>'<div><b>'+x[0]+'</b><span>'+x[1]+'</span></div>').join('')+'</div><p>'+esc(line)+'</p>'+(r.comeback?'<p class="sub">Comeback bonus +40. Fatigue broken, your level can rise again.</p>':'')});
}
A.useHB=function(){const sh=U.sh;sh.tmp.useH=!sh.tmp.useH;F.play('pick');renderGym()};
A.gymNext=function(){
  const sh=U.sh,d=E.day(),t=sh.tmp,plan=E.planFor();
  d.mins={lift:t.lift,walk:t.walk,run:t.run};d.burn=t.useH&&d.hWork?d.hWork.kcal:E.burnEst(kg(),t.lift,t.walk,t.run);d.runFree=t.free;
  E.stat('AGI',Math.floor((t.walk+t.run)/10));
  const p=E.liftProgress(plan),r=E.completeWorkout(plan);U.justRow='gym';
  victory(plan,r,p);
  sh.step='pain';renderGym();
};
A.pk=A.pb=function(v,b){
  const d=E.day();d.pain=d.pain||{knee:'none',back:'none'};
  if(b.dataset.a.slice(0,2)==='pk')d.pain.knee=v;else d.pain.back=v;
  E.save();if(v==='sharp'){F.play('sharp');F.vib([80,60,80])}else F.play('tick',100);
  renderGym();
};
A.gymFinish=function(){const d=E.day();d.pain=d.pain||{knee:'none',back:'none'};E.save();U.closeSheet()};

/* =====================================================================
   REHAB: today's schedule, a guided session with a moving outline for every move, the pain check-in, and the roadmap.
   ===================================================================== */
function parseRx(rx){
  let m;
  if((m=rx.match(/(\d+)\s*sec\s*[×x]\s*(\d+)\s*reps?/i)))return{reps:+m[2],sets:1,note:m[1]+' sec hold on each rep'};
  if((m=rx.match(/(\d+)\s*sec\s*[×x]\s*(\d+)/i)))return{secs:+m[1],sets:+m[2]};
  if((m=rx.match(/(\d+)\s*laps\s*[×x]\s*(\d+)\s*sets?/i)))return{laps:+m[1],sets:+m[2]};
  if((m=rx.match(/(\d+)\s*[×x]\s*(\d+)/)))return{reps:+m[1],sets:+m[2]};
  return{sets:1,note:''};
}
/* today's rehab record, made on demand: a sheet left open past the day change must not find it missing */
function rehRec(){const d=E.day();if(!d.reh)d.reh={items:{},day:0,knee:0,back:0,sharp:false,done:false,n:0,checked:false};return d.reh}
U.rehabSheet=function(tab){
  const d=E.day();rehRec();
  stopHold();
  U.sh={type:'rehab',tab:tab||'today',g:null};renderRehab();
};
A.roadmap=function(){U.rehabSheet('road')};
function lightText(l){return l==='red'?'RED: stop, keep it gentle, and message your physio.':l==='amber'?'AMBER: hold your loads today. Do not progress.':'GREEN: fine to continue as planned.'}
function holdBanner(t){
  if(t.hold==='red')return '<div class="warn" style="margin-top:0">Your last check-in was <b>RED</b>. Keep today gentle: only the daily block, only what stays pain-free, no strength work and no cardio. If red repeats, message your physio.</div>';
  if(t.hold==='amber')return '<div class="note amberb" style="margin-top:0">Your last check-in was <b>AMBER</b>. Hold your loads today: the strength finisher is skipped and the daily block should be gentle.</div>';
  return '';
}
function renderRehab(){
  const sh=U.sh,d=E.day(),r=rehRec(),S=E.S();
  const tabs=`<div class="tg" style="margin-top:0"><button data-a="rview:today" aria-pressed="${sh.tab!=='road'}">Today</button><button data-a="rview:road" aria-pressed="${sh.tab==='road'}">Roadmap</button></div>`;
  if(sh.tab==='road'){U.openSheet('Recovery',tabs+roadmapHtml(),'<button class="btn" data-a="rview:today">Back to today</button>');return}
  if(sh.tab==='guide')return renderGuide();
  const rg=E.rehabGroups(),t=rg.t,pr=E.rehabProgress(),green=E.light(r)||'green';
  const row=it=>`<div class="rx"><button class="chk" data-a="rt:${esc(it.key)}" aria-pressed="${!!r.items[it.key]}"><i>✓</i><span>${esc(it.name)}<small>${esc(it.rx)}</small></span>${it.fig?'<div class="rxm">'+HS.figSvg(it.fig,'mini')+'</div>':''}</button></div>`;
  const mins=Math.max(4,Math.round(E.rehabKeys().filter(x=>x!=='aero').length*1.4));
  const left=pr.total-pr.done;
  U.openSheet('Rehab',
    tabs+`<div class="rhead"><div class="rring"><svg viewBox="0 0 44 44" aria-hidden="true"><circle class="trk" cx="22" cy="22" r="18"/><circle class="arc k" cx="22" cy="22" r="18" pathLength="100" style="stroke-dashoffset:${100-(pr.total?pr.done/pr.total*100:0)}"/></svg><b>${pr.done}/${pr.total}</b></div>
      <div class="rtxt"><b>${t.plan} day schedule</b><small>${pr.total} moves · about ${mins} min${t.aerobic?' + 30 min easy cardio':''}</small></div></div>
    ${holdBanner(t)}
    ${r.done?'<div class="note" style="margin-top:12px">Rehab quest cleared today. Extra moves still help. Log how it felt below.</div>':''}
    <button class="btn vio gstart" data-a="rguide">${pr.done?'Continue the guided session':'Start the guided session'}<small>${left} move${left===1?'':'s'} left · one at a time, with a moving outline</small></button>
    ${rg.groups.map(g=>`<div class="sec">${esc(g.title)}${g.bonus?' <em>optional</em>':''}<small>${esc(g.sub)}</small></div>${g.items.map(row).join('')}`).join('')}
    ${t.finisher!=null&&HS.RDAYS[t.finisher].x.some(e=>e[3])?'<div class="small">Jefferson curl is left out, as you chose.</div>':''}
    <div class="note">The moves come from your external physio’s written plan (the sheet shows age 19, so confirm it is still current at your next visit). Figures are simplified outlines of the movement, not technique advice: ask your physio to show you the exact form. "S/B" is drawn as a Swiss ball.</div>
    <button class="chk" data-a="rconf" aria-pressed="${S.rehab.confirmed}"><i>✓</i><span>My physio confirmed this plan is current<small>Tick it once they have seen this</small></span></button>
    <div class="sec" id="checkin">Check-in</div>
    <div class="rngl"><span>RIGHT KNEE</span><b id="kv">${r.knee}</b></div><input class="rng" id="kr" type="range" min="0" max="10" value="${r.knee}" aria-label="Right knee pain 0 to 10">
    <div class="rngl"><span>LOWER BACK</span><b id="bv">${r.back}</b></div><input class="rng" id="br" type="range" min="0" max="10" value="${r.back}" aria-label="Lower back pain 0 to 10">
    <div class="tg"><button data-a="rok" aria-pressed="${!!r.checked&&!r.knee&&!r.back&&!r.sharp}">No pain today</button><button data-a="rsharp" aria-pressed="${r.sharp}">Sharp pain on any exercise today</button></div>
    <div class="light ${green}" id="rlight">${lightText(green)}</div>
    ${r.sharp?'<div class="warn">Stop that exercise. Write down which one and tell your physio.</div>':''}`,
    '<button class="btn good" data-a="rehabFinish">Finish rehab</button>');
}
A.rview=function(v){stopHold();U.sh.tab=v==='today'&&U.sh.tab==='guide'?'today':v;U.sh.g=null;$('#shBody').scrollTop=0;renderRehab()};
A.rt=function(v){
  const m=v.match(/^d(\d)_(\d+)$/);if(m&&HS.RDAYS[+m[1]].x[+m[2]][3])return;
  const r=rehRec();r.items[v]=!r.items[v];E.save();F.play(r.items[v]?'set':'tap');F.vib(8);
  U.keepScroll(renderRehab);
};
A.rconf=function(){const S=E.S();S.rehab.confirmed=!S.rehab.confirmed;E.save();F.play('pick');U.keepScroll(renderRehab)};
A.rsharp=function(){const r=rehRec();r.sharp=!r.sharp;r.checked=true;if(r.sharp){F.play('sharp');F.vib([80,60,80])}E.save();U.keepScroll(renderRehab)};
A.rok=function(){const r=rehRec();r.knee=0;r.back=0;r.sharp=false;r.checked=true;E.save();F.play('pick');F.vib(10);U.keepScroll(renderRehab)};
let sliderT=null;
document.addEventListener('input',e=>{
  const id=e.target.id;if(id!=='kr'&&id!=='br')return;
  const r=rehRec();
  r.checked=true;
  if(id==='kr'){r.knee=+e.target.value;$('#kv').textContent=r.knee}else{r.back=+e.target.value;$('#bv').textContent=r.back}
  F.play('tick',r.knee*20+r.back*20);
  const l=E.light(r),el=$('#rlight');if(el){el.className='light '+l;el.textContent=lightText(l)}
  clearTimeout(sliderT);sliderT=setTimeout(()=>E.save(),250);   /* save when the thumb settles, not on every pixel of the drag */
});

/* ---- the guided session: one move at a time ---- */
function stopHold(){const g=U.sh&&U.sh.g;if(g&&g.t){clearInterval(g.t.iv);g.t=null}}
function guideList(){const out=[];E.rehabGroups().groups.filter(g=>!g.bonus).forEach(g=>g.items.forEach(it=>out.push(Object.assign({group:g.title},it))));return out}
A.rguide=function(){
  const list=guideList(),items=rehRec().items,first=list.findIndex(it=>!items[it.key]);
  U.sh.tab='guide';U.sh.g={list:list,i:first<0?0:first,set:0,t:null};F.play('pick');F.vib(10);renderRehab();
};
function renderGuide(){
  const sh=U.sh,g=sh.g,it=g.list[g.i],px=parseRx(it.rx),total=px.sets||1;
  stopHold();g.busy=false;
  const label=px.secs?'Start hold · '+px.secs+' s'+(total>1?' (set '+(g.set+1)+' of '+total+')':''):total>1?'Set '+(g.set+1)+' of '+total+' done':'Done';
  U.openSheet('Guided rehab',
    `<div class="gd"><div class="gtop"><div class="xp"><i style="width:${g.i/g.list.length*100}%"></i></div><span>${g.i+1} / ${g.list.length}</span></div>
      <div class="ggrp">${esc(it.group)}</div>
      <div class="gfig">${it.fig?HS.figSvg(it.fig,'big'):''}<div class="holdr" id="holdr" hidden><svg viewBox="0 0 120 120" aria-hidden="true"><circle class="trk" cx="60" cy="60" r="52"/><circle class="arc k" id="holdArc" cx="60" cy="60" r="52" pathLength="100" style="stroke-dashoffset:0"/></svg><b id="holdT">${px.secs||0}</b></div></div>
      <h3>${esc(it.name)}</h3><div class="grx">${esc(it.rx)}${px.note?' · '+esc(px.note):''}</div>
      ${HS.CUES&&HS.CUES[it.fig]?'<div class="gcue">'+esc(HS.CUES[it.fig])+'</div>':''}
      <div class="gsets">${Array.from({length:total},(_,i)=>`<i class="${i<g.set?'on':''}"></i>`).join('')}</div>
      <div class="small gtip">General cue, not a prescription: confirm the exact form with your physio. Stop if you feel sharp pain.</div></div>`,
    `<button class="btn good" id="gsetBtn" data-a="gset">${label}</button><div class="gnav"><button class="link" data-a="gprev">Back</button><button class="link" data-a="gskip">Skip this move</button><button class="link" data-a="gend">Back to the list</button></div>`);
}
function guideNext(){
  const sh=U.sh,g=sh.g;stopHold();
  g.i++;g.set=0;
  if(g.i>=g.list.length){
    sh.tab='today';sh.g=null;F.play('quest');F.vib([30,40,60]);F.burstCenter(60);
    renderRehab();
    U.sys('Session complete. Log how it felt, then finish.','good',true);
    setTimeout(()=>{const c=$('#checkin');if(c)c.scrollIntoView({behavior:'smooth',block:'start'})},300);
    return;
  }
  renderGuide();
}
A.gset=function(){
  const sh=U.sh,g=sh&&sh.g;if(!g||g.busy)return;   /* busy: the move is finished and the next one is about to be drawn */
  if(g.t){stopHold();renderGuide();return}
  const it=g.list[g.i],px=parseRx(it.rx),total=px.sets||1;
  const finishSet=()=>{
    g.set++;F.play('set');F.vib(18);
    if(g.set>=total){
      g.busy=true;const i0=g.i;
      rehRec().items[it.key]=true;E.save();F.play('quest');F.burstAt($('.gfig'),16);
      setTimeout(()=>{if(U.sh&&U.sh.g===g&&g.i===i0)guideNext()},350);
    }else renderGuide();
  };
  if(px.secs){
    const end=Date.now()+px.secs*1000,ring=$('#holdr'),arc=$('#holdArc'),tt=$('#holdT'),btn=$('#gsetBtn');
    ring.hidden=false;btn.textContent='Stop';let lastSec=px.secs;
    const iv=setInterval(()=>{
      if(!U.sh||U.sh.g!==g||!g.t){clearInterval(iv);return}   /* the sheet closed or moved on: stop ticking */
      const left=Math.max(0,end-Date.now()),s=Math.ceil(left/1000);
      arc.style.strokeDashoffset=100-left/(px.secs*1000)*100;
      tt.textContent=s;
      if(s!==lastSec){lastSec=s;F.play('tick',200+s*10)}
      if(left<=0){clearInterval(iv);g.t=null;F.play('timer');F.vib([60,50,60]);finishSet()}
    },100);
    g.t={iv:iv};
  }else finishSet();
};
A.gprev=function(){const g=U.sh.g;stopHold();g.i=Math.max(0,g.i-1);g.set=0;F.play('tap');renderGuide()};
A.gskip=function(){F.play('tap');guideNext()};
A.gend=function(){stopHold();U.sh.tab='today';U.sh.g=null;renderRehab()};
A.rehabFinish=function(){
  const sh=U.sh,r=rehRec(),pr=E.rehabProgress();stopHold();
  if(!pr.done){U.sys('Tick at least one move, or close this window.','bad');return}
  r.n=pr.done;
  if(pr.ok&&!r.done){
    r.done=true;E.addAura(U.rehabAura(pr.done));E.stat('SNS',2);E.save();E.emit('rehab',{n:pr.done});
    U.justRow='rehab';F.play('quest');U.closeSheet();
    U.sys(U.hype('rehab')+' '+pr.done+' of '+pr.total+' moves.','good',true);F.burstCenter(40);
  }else if(pr.ok){
    E.save();U.closeSheet();U.sys('Rehab updated: '+pr.done+' of '+pr.total+' moves.','good',true);
  }else{
    E.save();U.closeSheet();U.sys('Saved '+pr.done+' of '+pr.total+'. Finish at least '+Math.ceil(pr.total*.8)+' to clear the rehab quest.','');
  }
};
function weekPlanHtml(){
  const w=E.rehabWeek(),td=E.dkey();
  return '<div class="rweek">'+w.map(x=>`<div class="${x.k===td?'today':''}"><b>${x.d}</b><span>${x.plan}</span><small>${x.fin||'block'}${x.aero?' + walk':''}${x.bonus?' + bonus':''}</small><i>${x.n}</i></div>`).join('')+'</div><div class="small">The daily block every day. Day 1 core with Push, Day 2 Swiss-ball work with Pull, balance after Legs, and a longer session on the rest day. The number is how many moves count that day.</div>';
}
function roadmapHtml(){
  const pd=E.painDays(14),ci=pd.filter(x=>x.r).length,gr=pd.filter(x=>E.light(x.r)==='green').length,runs=pd.filter(x=>x.run!=null).map(x=>x.run);
  const phase=(n,t,w,goal,dos,gate)=>`<div class="ph"><div class="phh"><b>PHASE ${n}</b><span>${t}</span></div><div class="phw">${w}</div><div class="phg"><b>Goal</b> ${goal}</div><ul>${dos.map(x=>'<li>'+x+'</li>').join('')}</ul><div class="phgate"><b>Gate</b> ${gate}</div></div>`;
  return `<div class="warn" style="margin-top:12px"><b>DRAFT for your physio to approve.</b> Not medical advice. Recovery time varies. Three to six months is a target to aim for, not a promise. Nothing here changes the exercises, sets or reps your physio wrote.</div>
   <div class="sec">Your numbers</div>
   <div class="dis"><div><span>CHECK-INS</span><b>${ci} / 14</b></div><div><span>GREEN DAYS</span><b>${gr}</b></div><div><span>RUN BEFORE PAIN</span><b>${runs.length?runs[runs.length-1]+' min':'no data'}</b></div></div>
   <div class="sec">Your rehab week</div>
   ${weekPlanHtml()}
   <div class="sec">Pain traffic light (proposed)</div>
   <div class="tl"><div class="light green">GREEN 0 to 3: continue as planned</div><div class="light amber">AMBER 4 to 5: hold loads, no progression</div><div class="light red">RED 6 or more, or any sharp pain: stop and message your physio</div></div>
   <div class="sec">Phases</div>
   ${phase(1,'Calm and control','Weeks 1 to 4','Settle the knee and low back, and make the daily block a habit.',['Daily block every day it feels OK','Day 1 and Day 2 strength rotation','Lifting inside pain-free range and your own 30 to 40 kg cap','Pain-free aerobic work, 30 minutes, 3 to 4 days a week'],'Mostly green days for two weeks, with no sharp episodes. Physio agrees.')}
   ${phase(2,'Rebuild strength','Weeks 5 to 12','Add load slowly where the plan allows it.',['Day 3 lower-body work at loads your physio sets','Raise one thing at a time, never two','Track run minutes before pain and let your physio set the next target'],'Pain settles within a day of sessions, three weeks running. Physio agrees.')}
   ${phase(3,'Return to full training','Months 4 to 6','Normal training, with the knee and back in charge of the pace.',['More load and impact only with physio sign-off','Re-check the knee and back at a review','Keep the daily block for good'],'Physio reassessment. Then your cap changes, not before.')}
   <div class="sec">Stop and get checked quickly if</div>
   <ul class="stop"><li>Numbness, pins and needles or growing weakness in a leg</li><li>Trouble controlling your bladder or bowels, or numbness around the groin (urgent)</li><li>The knee gives way, locks or swells</li><li>Sharp pain that does not settle</li></ul>
   <div class="small">These are general safety rules, not from your documents.</div>`;
}

/* ---- physio sheet ---- */
function physioText(){
  const pd=E.painDays(14),rd=pd.filter(x=>x.r),n=rd.length,S=E.S();
  const avg=k=>n?(rd.reduce((a,x)=>a+x.r[k],0)/n).toFixed(1):'no data';
  const sharp=rd.filter(x=>x.r.sharp).length,runs=pd.filter(x=>x.run!=null).map(x=>x.run);
  const keys=Object.keys(S.days).filter(k=>E.daysBetween(k,E.dkey())<14);
  const gym=keys.filter(k=>S.days[k].workout==='done').length;
  const painGym=keys.filter(k=>S.days[k].pain&&(S.days[k].pain.knee==='sharp'||S.days[k].pain.back==='sharp')).length;
  const greens=pd.filter(x=>E.light(x.r)==='green').length;
  return 'PHYSIO SHEET (self-logged, last 14 days)\nRehab check-ins: '+n+' of 14 days ('+greens+' green)\nRight knee pain average: '+avg('knee')+' / 10\nLower back pain average: '+avg('back')+' / 10\nDays with sharp pain reported in rehab: '+sharp+'\n'+
   'Gym sessions logged: '+gym+', of which with sharp pain afterwards: '+painGym+'\nRun minutes before knee pain (latest entries): '+(runs.length?runs.slice(-5).join(', '):'no data')+'\nSelf-set limit: '+HS.CAP_KG+' kg or less on squats and deadlifts\n\nQUESTIONS FOR YOU\n'+
   '1. Is the written plan (daily block, Day 1 to 3) still right for me now?\n2. How deep may I bend the knee under load?\n3. What squat and deadlift load is safe for now, and what is the rule for increasing it?\n4. I feel knee pain after about 3 minutes of running at 9 km/h. Should I keep running?\n'+
   '5. What exactly counts as a stop signal, and when should I come back for review?\n6. Should my right knee (ACL sprain on the 2024 note) be reassessed or re-imaged?\n7. What does "S/B" mean in my plan, and is Jefferson curl safe for me?\n8. May I use a pain traffic light (green 0-3, amber 4-5, red 6+ or sharp) to decide when to progress?';
}
A.physio=function(){
  U.sh={type:'physio'};
  U.openSheet('Physio sheet','<div class="hint">Built only from what you logged. Show it at your next visit.</div><textarea class="ta" id="phT" readonly aria-label="Physio sheet text">'+esc(physioText())+'</textarea>','<button class="btn" data-a="copy">Copy text</button>');
};
A.copy=function(){
  const t=$('#phT');
  U.copyText(t.value,t).then(ok=>U.sys(ok?'Copied. Paste it into a message to your physio.':'Select the text and copy it from the box.','good'));
};

/* =====================================================================
   WEIGH-IN (with last night's sleep) and CLEAR THE DAY
   ===================================================================== */
let wVal=84;
U.weighSheet=function(){
  const S=E.S(),d=E.day(),ks=Object.keys(S.weights).sort();
  wVal=S.weights[E.dkey()]||(ks.length?S.weights[ks[ks.length-1]]:S.startW);
  const lastSleep=ks.map(k=>S.days[k]&&S.days[k].sleep).filter(x=>x!=null).pop();
  U.sh={type:'weigh',sleep:d.sleep!=null?d.sleep:(lastSleep!=null?lastSleep:7),touched:false};
  renderWeigh();
};
const sleepNote=h=>h>=7?'Good. +15 aura':h>=6?'Okay. +8 aura':'Short night. Be kind to yourself today';
function renderWeigh(){
  const sh=U.sh,d=E.day();
  U.openSheet('Morning check-in',
    `<div class="hint">Before food, after the toilet. Same scale every day.</div>
    <div class="wnum"><button data-a="wd" aria-label="Down 0.1">−</button><input id="wIn" type="number" step="0.1" inputmode="decimal" value="${wVal.toFixed(1)}" aria-label="Weight in kg"><button data-a="wu" aria-label="Up 0.1">+</button></div>
    ${d.hWeight&&!d.weighed?`<button class="chipbtn" data-a="useHW"><b>Samsung Health has ${d.hWeight.toFixed(1)} kg</b><span>Use this reading</span></button>`:''}
    <div class="note">One reading never moves your trend by more than a quarter. Water weight is noise.</div>
    <div class="sec">Last night’s sleep</div>
    <div class="stp"><span>Hours slept<small id="slpn">${sleepNote(sh.sleep)}</small></span><div class="c"><button class="sbtn" data-a="slp:-0.5" aria-label="Less sleep">−</button><i class="slpv" id="slpv">${sh.sleep.toFixed(1)}</i><button class="sbtn" data-a="slp:0.5" aria-label="More sleep">+</button></div></div>
    <div class="small">${d.sleep!=null?'Already logged: '+d.sleep+' h. Change it above if it is off.':'Skip this if you would rather not log it today.'}</div>`,
    '<button class="btn" data-a="wSave">Save</button>');
}
A.useHW=function(){const d=E.day();if(!d.hWeight)return;const i=$('#wIn');i.value=d.hWeight.toFixed(1);wVal=d.hWeight;F.play('pick');F.vib(8)};
A.slp=function(v){const sh=U.sh;sh.sleep=Math.max(0,Math.min(14,Math.round((sh.sleep+parseFloat(v))*2)/2));sh.touched=true;F.play('tick',sh.sleep*30);F.vib(5);$('#slpv').textContent=sh.sleep.toFixed(1);$('#slpn').textContent=sleepNote(sh.sleep)};
A.wd=A.wu=function(v,b){
  const i=$('#wIn');let x=parseFloat(i.value)||wVal;
  x=Math.round((x+(b.dataset.a==='wu'?.1:-.1))*10)/10;i.value=x.toFixed(1);F.play('weigh');F.vib(6);
};
A.wSave=function(){
  const sh=U.sh;if(!sh||sh.type!=='weigh')return;
  const x=parseFloat($('#wIn').value);if(!(x>30&&x<250)){U.sys('Enter your weight in kg.','bad');return}
  /* a slipped digit would pay gates that can never be taken back, so a number far from the last reading asks once */
  const S0=E.S(),prevK=Object.keys(S0.weights).filter(k=>k<E.dkey()).sort(),last=prevK.length?S0.weights[prevK[prevK.length-1]]:S0.startW;
  const gap=prevK.length?Math.max(1,E.daysBetween(prevK[prevK.length-1],E.dkey())):1,limit=Math.min(10,3+Math.max(0,gap-3)*.3);
  if(Math.abs(x-last)>limit&&sh.confirmed!==x){sh.confirmed=x;F.play('shake');U.sys('That is '+Math.abs(x-last).toFixed(1)+' kg '+(x<last?'below':'above')+' your last reading ('+last.toFixed(1)+'). Tap Save again if it is right.','bad');return}
  const r=E.logWeight(x);
  if(sh.touched)E.logSleep(sh.sleep);
  U.justRow='weigh';F.vib([20,30,30]);U.closeSheet();
  if(!r.cleared)U.sys('Logged '+x.toFixed(1)+' kg. Trend '+r.trend.toFixed(1)+' kg.'+(sh.touched&&sh.sleep>=7?' '+U.hype('sleep'):''),'',true);
};
U.closeDaySheet=function(){
  U.sh={type:'close'};
  const d=E.day();
  if(d.closed){U.openSheet('Day cleared','<div class="hint">'+d.score+' of 4 quests. Aura today: '+(d.delta>=0?'+':'−')+Math.abs(d.delta)+'.</div>'+(d.chest?'':'<div class="stack2"><button class="btn vio" data-a="chestOpen">Open today’s chest</button></div>'),'<button class="btn ghost" data-a="close">Close</button>');return}
  const open=U.quests().filter(q=>q.st==='todo'&&['close','weigh','rehab'].indexOf(q.id)<0).map(q=>q.id==='gym'?'Log your workout':'Log or skip '+q.id);
  if(open.length){U.openSheet('Not yet','<div class="hint">Finish these first, so the tally is honest.</div>'+open.map(o=>'<div class="q"><span>'+esc(o)+'</span><span class="no">OPEN</span></div>').join(''),'<button class="btn ghost" data-a="close">Back</button>');return}
  const st=E.dayStatus(),T=st.T,tot=st.tot,d2=d;
  const q=[['Protein '+T.protein+' g',st.protOk,Math.round(tot.p)+' g'],['Calories '+fmt(T.lo)+' to '+fmt(T.hi),st.calOk,fmt(tot.k)],['Workout',st.gymOk,st.plan==='Rest'?'Rest day':({done:'Done',pain:'Pain day',pass:'Rest pass'}[d2.workout]||'Skipped')],['Rehab',st.rehOk,st.rehOk?'Done':'Missed']];
  U.openSheet('Clear the day','<div class="hint">Last look. Clearing adds your calorie reward and opens your chest.</div>'+q.map(x=>'<div class="q"><span>'+esc(x[0])+'</span><span class="'+(x[1]?'ok':'no')+'">'+(x[1]?'✓ ':'')+esc(x[2])+'</span></div>').join('')+(tot.k<T.lo?'<div class="note">Under '+fmt(T.lo)+' kcal does not count. Eating too little costs muscle. If you forgot to log something, go back and add it.</div>':''),'<button class="btn" data-a="lock">Clear it</button>');
};
A.lock=function(){
  if(E.day().closed)return;
  U.justRow='close';F.vib([30,40,60]);U.closeSheet();
  E.closeDay();
};
})();
