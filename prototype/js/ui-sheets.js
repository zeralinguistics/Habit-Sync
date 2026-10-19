/* ui-sheets.js: the task windows. Plate (food), workout logger, rehab with animated outlines and roadmap, weigh-in, clear the day, physio sheet. */
(function(){
'use strict';
const HS=window.HS=window.HS||{};
const E=HS.E,F=HS.fx,U=HS.ui;
const esc=U.esc,fmt=U.fmt,cap=U.cap,hhmm=U.hhmm,$=U.$,A=U.act,IC=U.IC;
const seg=(g,opts,cur)=>`<div class="seg">${opts.map(o=>`<button data-a="${g}:${o[0]}" aria-pressed="${cur===o[0]}" class="${o[0]==='sharp'?'sharp':''}">${o[1]}</button>`).join('')}</div>`;
const DAYN=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const r1=x=>x>=100?Math.round(x):Math.round(x*10)/10;

/* =====================================================================
   PLATE: build the meal. Tiles fly onto a plate, macros fly into the counters, the combo walks up a scale,
   and portions are set by scrolling a ruler that ticks under your thumb. Foods are listed by what they are:
   today's mess menu, protein, snacks, your own, treats.
   ===================================================================== */
const PX=2,MAXG=800;
let rulerTimer=null;
const TABS=[['menu','Mess menu'],['protein','Protein'],['snack','Snacks'],['mine','Mine'],['treat','Treats']];
U.plateSheet=function(meal,tab){
  U.sh={type:'plate',meal:meal,edit:-1,combo:0,last:0,lastName:null,rulerUser:false,tab:tab||(meal==='snack'?'snack':'menu'),q:''};
  U.openSheet(meal==='snack'?'Snack':cap(meal),
    `<div class="pl">
      <div class="stage">
        <div class="sd"><b id="sK">0</b><span>KCAL TODAY</span><em id="sKL"></em></div>
        <div class="pw"><svg class="pring" viewBox="0 0 180 180" aria-hidden="true"><circle class="trk" cx="90" cy="90" r="82"/><circle id="prK" class="arc k" cx="90" cy="90" r="82" pathLength="100"/><circle class="trk" cx="90" cy="90" r="71"/><circle id="prP" class="arc p" cx="90" cy="90" r="71" pathLength="100"/></svg>
          <div class="disc" id="disc"></div><div class="combo" id="combo"></div></div>
        <div class="sd r"><b id="sP">0</b><span>G PROTEIN</span><em id="sPL"></em></div>
      </div>
      <div class="mstrip" id="mstrip"></div>
      <div class="plate" id="plate"></div><div id="ed"></div>
      <div class="inrow"><input id="mIn" type="text" enterkeyhint="done" autocomplete="off" autocapitalize="none" aria-label="Search or type what you ate" placeholder="Search, or type: 2 chapati, rice 200g"><button data-a="mAdd">ADD</button></div>
      <div class="ptabs" id="ptabs" role="tablist"></div>
      <div class="rows" id="rows"></div></div>`,
    `<button class="btn" data-a="mealDone">Done</button><button class="link" data-a="mealSkip" id="mSkip">Skip this meal</button>`,{full:true,col:true});
  $('#mSkip').hidden=meal==='snack';
  drawRows();drawPlate();drawStage(true);
};
U.plateRedraw=function(){drawRows();drawPlate();drawStage()};
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
  /* this meal in numbers */
  const its=items();let k=0,p=0,c=0,f2=0;
  its.forEach(o=>{const f=E.food(o.it.name);if(!f)return;const n=E.nut(f,o.it.g);k+=n.k;p+=n.p;c+=n.c;f2+=n.f});
  const ms=$('#mstrip');if(ms)ms.innerHTML=its.length?`<span><b>${fmt(k)}</b> kcal</span><span><b>${Math.round(p)}</b> g protein</span><span><b>${Math.round(c)}</b> g carbs</span><span><b>${Math.round(f2)}</b> g fat</span><em>this ${sh.meal==='snack'?'snack':'meal'}</em>`:'';
  /* the plate itself */
  const n=its.length,disc=$('#disc');
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
    const it=d.items[sh.edit];
    let lab='';for(let g=0;g<=MAXG;g+=100)lab+='<b style="left:'+(g*PX)+'px">'+g+'</b>';
    ed.innerHTML=`<div class="ed"><div class="edh"><span>${HS.emoji(it.name)} ${esc(it.name)}</span><span class="edb"><button data-a="foodInfo" aria-label="Nutrition facts and source">${IC.info}</button><button data-a="edClose" aria-label="Close editor">×</button></span></div>
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
  const e=$('#edI');if(e)e.textContent=Math.round(n.k)+' kcal · '+r1(n.p)+' g protein · '+r1(n.c)+' g carbs · '+r1(n.f)+' g fat. 1 serving = '+f.ug+' g.';
  const gu=$('#gUnits');if(gu)gu.textContent=u+' × '+f.unit;
}
/* a food as a row: what it is, what is in one serving, a plus to add it, an i for the facts */
function frow(name,cls){
  const f=E.food(name);if(!f)return'';
  const g=items().filter(o=>o.it.name===name).reduce((a,o)=>a+o.it.g,0);
  const lab=/^\d/.test(f.unit)?f.unit:'1 '+f.unit;
  return `<div class="frow r-${f.rar} ${cls||''}"><button class="fadd" data-a="${cls==='res'?'sugadd':'add'}:${esc(name)}" aria-label="Add ${esc(name)}"><span class="fe">${HS.emoji(name)}</span><span class="fm"><b>${esc(name)}</b><small><strong>${f.kcal}</strong> kcal · <strong>${r1(f.p)}</strong> g protein · ${r1(f.c)} C · ${r1(f.f)} F<i>${f.ug} g · ${esc(lab)}</i></small></span>${g?`<em class="fq">${E.units(f,g)}</em>`:'<span class="fp2">+</span>'}</button><button class="finfo" data-a="finfo:${esc(name)}" aria-label="Nutrition facts for ${esc(name)}">${IC.info}</button></div>`;
}
function utile(u){
  const f=E.food(u.name);if(!f)return'';
  const k=Math.round(E.nut(f,u.g).k);
  return `<div class="frow r-${f.rar} usual"><button class="fadd" data-a="usual:${esc(u.name)}|${u.g}"><span class="fe">${HS.emoji(u.name)}</span><span class="fm"><b>${esc(u.name)}</b><small><strong>${k}</strong> kcal · your usual ${Math.round(u.g)} g<i>${u.n}× lately</i></small></span><span class="fp2">+</span></button><button class="finfo" data-a="finfo:${esc(u.name)}" aria-label="Nutrition facts for ${esc(u.name)}">${IC.info}</button></div>`;
}
const SNACKS=['Banana','Apple','Orange','Grapes','Guava','Pineapple','Mango','Pomegranate','Sapota (chikoo)','Muskmelon','Papaya','Watermelon','Mixed fruits','Dates','Almonds','Peanuts, roasted','Roasted chana','Makhana, roasted','Peanut butter','Coconut water','Curd','Milk','Oats with milk','Bread, butter, jam','Boiled egg','Egg white','Protein bar (10 g protein)','Protein bar (20 g protein)','Plant protein powder (1 scoop)','Whey protein (1 scoop)','Sattu drink','Tea (no sugar)','Black tea or coffee'];
function allFoods(){return Object.values(HS.DB).concat(Object.values(E.S().custom))}
function rowsFor(sh){
  const meal=sh.meal,pool=new Set(E.poolFor(meal)),by=(a,b)=>(pool.has(b.name)-pool.has(a.name))||(b.p-a.p);
  if(sh.tab==='menu'){
    const names=meal==='snack'?[]:HS.menuFor(meal,E.di());
    return{head:`${DAYN[E.di()]} ${meal} at the mess <small>The printed menu is tentative.</small>`,html:names.map(n=>frow(n)).join('')||'<div class="small">No mess menu for a snack. Try Snacks.</div>'};
  }
  if(sh.tab==='protein'){
    const bk=E.backupFood(),pk=E.picks(meal),seen=new Set();let h='';
    const add=(n,cls,t)=>{if(!n||seen.has(n)||!E.food(n))return;seen.add(n);h+=frow(n,cls)};
    if(bk&&!E.day().pAward){h+='<div class="rt pick">Your protein backup</div>';add(bk.name,'pickt')}
    if(pk.length){h+='<div class="rt pick">★ Picks for your remaining macros</div>';pk.forEach(n=>add(n,'pickt'))}
    h+='<div class="rt">High protein</div>';
    allFoods().filter(f=>f.cat==='protein'&&!f.out&&!f.sugar).sort(by).slice(0,40).forEach(f=>add(f.name));
    return{head:'Protein first: it is the hardest number to hit',html:h};
  }
  if(sh.tab==='snack')return{head:'Snacks, fruit and quick protein',html:SNACKS.filter(n=>E.food(n)).map(n=>frow(n)).join('')};
  if(sh.tab==='mine'){
    const empty=!items().length,last=empty?E.lastMeal(meal):null,us=E.usuals(meal),cu=Object.values(E.S().custom).filter(f=>f&&f.name);
    const rep=last?`<button class="repeat" data-a="repeat"><span class="ri"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 3-6.2"/><path d="M4 4v5h5"/></svg></span><span class="rm"><b>Same as last time</b><small>${esc(last.items.map(x=>x.name).slice(0,3).join(', '))}${last.items.length>3?' +'+(last.items.length-3):''} · ${fmt(last.kcal)} kcal · ${U.date(last.k)}</small></span><span class="rg">ONE TAP</span></button>`:'';
    let h=rep+(us.length?'<div class="rt pick">Your usuals</div>'+us.map(utile).join(''):'')+(cu.length?'<div class="rt">Your own foods</div>'+cu.map(f=>frow(f.name)).join(''):'');
    h+='<button class="addlab" data-a="customOpen"><span>+</span><b>Add a food from its label</b><small>Protein bar, powder, anything packed</small></button>';
    return{head:'',html:h};
  }
  const tr=Array.from(new Set(HS.OUTSIDE.concat(allFoods().filter(f=>f.sugar||f.out).map(f=>f.name))));
  return{head:'Treats and outside food. Sugar costs a little aura, on purpose.',html:tr.map(n=>frow(n)).join('')};
}
function drawRows(){
  const sh=U.sh;if(!sh||sh.type!=='plate')return;
  const tabs=TABS.filter(t=>!(sh.meal==='snack'&&t[0]==='menu'));
  if(!tabs.some(t=>t[0]===sh.tab))sh.tab=tabs[0][0];
  $('#ptabs').innerHTML=tabs.map(t=>`<button role="tab" data-a="ptab:${t[0]}" aria-selected="${!sh.q&&sh.tab===t[0]}">${t[1]}</button>`).join('');
  const q=(sh.q||'').split(/,|\+|\band\b/i).pop(),r=sh.q?E.parsePart(q):null,name=r&&r.name;
  if(name){
    const list=E.scoreFoods(name,sh.meal).slice(0,10);
    $('#rows').innerHTML=`<div class="rhd">Results for “${esc(name)}”</div>`+list.map(f=>frow(f.name,'res')).join('')+`<button class="addlab" data-a="customOpen"><span>+</span><b>${list.length?'Not the one? Add it from a label':'Not found. Add it from a label'}</b><small>Or type a number: "${esc(name)} 350 kcal"</small></button>`;
    return;
  }
  const r2=rowsFor(sh);
  $('#rows').innerHTML=(r2.head?`<div class="rhd">${r2.head}</div>`:'')+r2.html;
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
A.finfo=function(v){U.foodSheet(v)};
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
  inp.value=parts.join('').replace(/[,+]\s*$/,'').trim();sh.q=inp.value;drawRows();inp.focus();
};
A.mAdd=function(){
  const sh=U.sh,inp=$('#mIn'),txt=inp.value.trim();if(!sh||!txt)return;
  const miss=[];let unnamed=false,zero=false,openFor=null;
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
  inp.value='';sh.q='';drawRows();
  if(miss.length===1&&!unnamed&&!zero){U.customSheet({name:cap(miss[0])});return}
  if(miss.length)U.sys('Not found: '+miss.join(', ')+'. Add a number, like "momos 350 kcal".','bad');
  else if(unnamed)U.sys('Add a name too, like "rice 200g" or "momos 350 kcal".','bad');
  else if(zero)U.sys('An amount of zero adds nothing.','bad');
};
A.customOpen=function(){const q=(U.sh&&U.sh.q||'').split(/,|\+|\band\b/i).pop(),r=E.parsePart(q);U.customSheet({name:r&&r.name?cap(r.name):''})};
A.ptab=function(v){const sh=U.sh;if(!sh||sh.type!=='plate')return;sh.tab=v;sh.q='';$('#mIn').value='';F.play('tick',140);drawRows()};
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
  const filled='<i class="on" style="--i:0">★</i><i class="'+(r.stars>=2?'on':'')+'" style="--i:1">★</i><i class="'+(r.stars>=3?'on':'')+'" style="--i:2">★</i>';
  U.cele({kind:'stars',ms:2800,
    fx:()=>{for(let i=0;i<r.stars;i++)setTimeout(()=>F.play('star',i),380+i*300);if(r.stars===3)setTimeout(()=>F.burstCenter(60),1000)},
    html:'<div class="kicker">PLATE RATING</div><div class="stars">'+filled+'</div><p>'+esc(r.stars===3?'Three stars. Protein and a balanced plate.':r.stars===2?'Solid plate. '+(r.notes[0]||''):'Logged. '+(r.notes[0]||''))+'</p><p class="sub">'+r.k+' kcal · '+r.p+' g protein · +'+(r.stars*4)+' aura</p>'});
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
  sh.q=e.target.value;drawRows();
});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.id==='mIn'){e.preventDefault();A.mAdd()}});

/* =====================================================================
   WORKOUT: one tap logs an exercise at the weight shown. Tap a set to log it alone, the kg pill to change the weight.
   The session follows a rotation (Push, Pull, Legs, Rest) that moves on when you finish, not with the calendar.
   ===================================================================== */
let restTimer=null;
function stopRest(){clearInterval(restTimer);restTimer=null;if(U.sh)U.sh.rest=null}
U.gymSheet=function(){
  const d=E.day();
  U.sh={type:'gym',step:d.workout==='done'?'pain':'choose',tmp:null,exEdit:-1,rest:null};
  const m=d.mins||E.lastMins();
  const det=d.cardioDet||{};
  U.sh.tmp=cardioFresh({lift:m.lift,walk:m.walk,run:m.run,free:d.runFree!=null?d.runFree:E.lastMins().free,wKm:det.wKm||0,rKm:det.rKm||0,wInc:det.wInc,rInc:det.rInc,wSpd:det.wSpd,rSpd:det.rSpd});
  U.sh.tmp.nopain=U.sh.tmp.run>0&&U.sh.tmp.free>=U.sh.tmp.run&&d.runFree!=null;
  renderGym();
};
const STEP={free:1,wInc:1,rInc:1,wSpd:.5,rSpd:.5};
const stp=(k,label,sub,v)=>{const n=STEP[k]||5;return `<div class="stp"><span>${label}<small>${sub}</small></span><div class="c"><button data-a="st:${k}:-${n}" aria-label="Less ${label}">−</button><i>${Math.round(v*10)/10}</i><button data-a="st:${k}:${n}" aria-label="More ${label}">+</button></div></div>`};
/* typed numbers (distance), kept in the sheet's own state; the page is not redrawn while you type */
const fld=(f,label,sub,ph,v)=>`<label class="cfld"><span>${label}<small>${sub}</small></span><input data-f="${f}" type="number" inputmode="decimal" step="0.1" min="0" placeholder="${ph}" value="${v>0?v:''}" aria-label="${label}"></label>`;
/* the speeds and inclines a walk and a run work out to: typed distance wins, then the stepper values, then the treadmill defaults */
function cardioDetOf(t){
  const D=E.CARDIO_DEF,wi=t.wInc!=null?t.wInc:D.wInc,ri=t.rInc!=null?t.rInc:D.rInc;
  return{wKm:t.wKm>0?t.wKm:0,rKm:t.rKm>0?t.rKm:0,wSpd:E.speedOf(t.wKm,t.walk,t.wSpd||D.wSpd),rSpd:E.speedOf(t.rKm,t.run,t.rSpd||D.rSpd),wInc:wi,rInc:ri,src:(t.wKm>0||t.rKm>0)?'manual':'est'};
}
function cardioProblem(t){
  const L=E.CARDIO_LIM,det=cardioDetOf(t);
  if(t.walk>0&&(det.wSpd<L.walk[0]||det.wSpd>L.walk[1]))return'The walk works out to '+(Math.round(det.wSpd*10)/10)+' km/h. Check the walking distance and minutes.';
  if(t.run>0&&(det.rSpd<L.run[0]||det.rSpd>L.run[1]))return'The run works out to '+(Math.round(det.rSpd*10)/10)+' km/h. Check the running distance and minutes.';
  return'';
}
/* the live line under the distance boxes, and the calorie estimate; redrawn on every keystroke without touching the inputs */
function cardioLive(sh){
  const t=sh.tmp,det=cardioDetOf(t),bad=cardioProblem(t),fmt1=x=>Math.round(x*10)/10;
  const bits=[];
  if(t.walk>0)bits.push('Walk '+fmt1(det.wSpd)+' km/h'+(t.wKm>0?'':' (assumed)')+', '+(det.wInc>0?det.wInc+'% incline':'flat'));
  if(t.run>0)bits.push('Run '+fmt1(det.rSpd)+' km/h, '+E.paceTxt(det.rSpd)+' per km'+(t.rKm>0?'':' (assumed)')+(det.rInc>0?', '+det.rInc+'% incline':''));
  const kcal=sh.type==='gym'&&sh.step==='details'&&t.useH&&E.day().hWork?E.day().hWork.kcal:sh.step==='cardio'&&t.useH&&cardioHW(t)?cardioHW(t).kcal:bad?0:E.burnEst(kg(),t.lift||0,t.walk,t.run,det);
  return{sum:(bits.length?'<div class="csum">'+bits.join(' · ')+'</div>':'')+(bad?'<div class="warn" style="margin-top:8px">'+bad+'</div>':''),
    est:'~'+fmt(kcal)+' kcal burned<small>Net of resting energy (ACSM treadmill equations), can be off by 30%. Info only: your calorie target already includes training, so do not eat it back.</small>'};
}
function cardioDayKey(t){return t&&t.day==='yest'?E.keyOffset(-1):E.dkey()}
function cardioHW(t){const d=E.S().days[cardioDayKey(t)];return d&&d.hWalk?d.hWalk:null}
/* walking, running, optional distances, optional speed and incline: shared by the rest-day cardio and the lifting-day report */
function cardioBlock(sh){
  const t=sh.tmp,lv=cardioLive(sh);
  return stp('walk','Walking','minutes',t.walk)+fld('wKm','Walk distance','km, if you know it','2.5',t.wKm)+(t.walk>0?seg('wsurf',[['inc','Treadmill incline '+(t.keepInc||E.CARDIO_DEF.wInc)+'%'],['flat','Flat or outdoors']],t.wInc>0?'inc':'flat'):'')+
    stp('run','Running','minutes',t.run)+fld('rKm','Run distance','km, if you know it','1.6',t.rKm)+
    `<div id="cSum">${lv.sum}</div>`+
    (t.run>0?`<button class="chipbtn${t.nopain?' on':''}" data-a="noPain" aria-pressed="${!!t.nopain}"><b>No knee pain while running</b><span>${t.nopain?'Yes':'Tap if so'}</span></button>`+(t.nopain?'':stp('free','Run minutes before knee pain','when it started',Math.min(t.free,t.run))):'')+
    `<button class="cmore" data-a="cmore" aria-expanded="${!!t.more}">Speed and incline <i>${t.more?'−':'+'}</i></button>`+
    (t.more?`<div class="cmoreb">`+stp('wSpd','Walking speed','km/h, used when no distance',t.wSpd)+stp('wInc','Walking incline','%, 0 for flat or outdoors',t.wInc)+stp('rSpd','Running speed','km/h, used when no distance',t.rSpd)+stp('rInc','Running incline','%, 0 for flat or outdoors',t.rInc)+`</div>`:'');
}
function cardioFresh(t){
  const D=E.CARDIO_DEF;
  const o={wKm:0,rKm:0,wSpd:D.wSpd,rSpd:D.rSpd,wInc:D.wInc,rInc:D.rInc,more:false,nopain:false,keepInc:D.wInc};
  Object.keys(t).forEach(k=>{if(t[k]!==undefined&&t[k]!==null&&!(typeof t[k]==='number'&&isNaN(t[k])))o[k]=t[k]});
  if(o.wInc>0)o.keepInc=o.wInc;
  return o;
}
const kg=()=>E.trend()||E.S().startW;
function penaltyLine(){
  const s=E.cfg().strict;
  return s==='chill'?'Skipping costs 30 aura.':s==='hard'?'Skipping costs 100 aura, 1 STR and fatigue. A second miss in a row hits twice.':'Skipping costs 60 aura and fatigue: aura gains halved and your level locked until you train.';
}
/* Push, Pull, Legs, Rest as a ring you move around: what you did last, what is due now */
function rotStrip(plan){
  const ls=E.lastSession(),due=E.ROT[E.S().rot.i];
  const ago=ls?E.daysBetween(ls.k,E.dkey()):null;
  return `<div class="rot">${E.ROT.map((t,i)=>`<span class="${t===plan?'now':''}${ls&&t===ls.type?' last':''}"><b>${t}</b><small>${t===plan?(plan!==due?'today':'due'):ls&&t===ls.type?(ago===0?'today':ago===1?'yesterday':ago+' days ago'):''}</small></span>${i<3?'<i>›</i>':''}`).join('')}</div>`;
}
/* a run done yesterday without the phone: offered only when yesterday was a rest day with nothing logged */
function yestCardioBtn(){
  const yk=E.keyOffset(-1),y=E.S().days[yk];
  return E.cardioDayOk(yk)&&!(y&&y.cardio)?'<button class="cyest" data-a="cardioYest">Forgot yesterday’s walk or run? Add it</button>':'';
}
/* a stepper or toggle inside the sheet redraws it where you are, instead of jumping back to the top */
const reGym=()=>U.keepScroll(renderGym);
/* lifts done one side at a time: the reps are counted for each side */
const oneSided=n=>/split squat|lunge|step[- ]?up|single[- ]?(leg|arm)|one[- ]?(leg|arm)|unilateral/i.test(n||'');
function renderGym(){
  const sh=U.sh,d=E.day(),plan=E.planFor();stopRest();
  if(sh.step==='cardio'){
    const t=sh.tmp,yk=E.keyOffset(-1),canY=E.cardioDayOk(yk)&&(plan==='Rest'&&!d.sess)&&!t.yestOnly,hw=cardioHW(t),lv=cardioLive(sh);
    const dn=t.day==='yest'?'Yesterday, '+U.date(yk):'Today';
    U.openSheet('Cardio day',
      '<div class="hint">Walking and running count. Left the phone behind? Type in the minutes and distance after, it works out your speed and calories.</div>'+
      (canY?seg('cday',[['today','Today'],['yest','Yesterday']],t.day||'today')+'<div class="small" style="margin:6px 0 0">Logging for: '+esc(dn)+'</div>':t.day==='yest'?'<div class="small" style="margin:6px 0 0">Logging for: '+esc(dn)+'</div>':'')+
      cardioBlock(sh)+
      `<div class="est" id="cEst">${lv.est}</div>`+(hw?`<button class="chipbtn${t.useH?' on':''}" data-a="useHW" aria-pressed="${!!t.useH}"><b>Samsung Health recorded ${hw.min} min of walking or running, ${fmt(hw.kcal)} kcal</b><span>${t.useH?'Using it':'Use that'}</span></button>`:'')+
      '<div class="note">Cardio is optional on a rest day. It lights your streak and earns +60 aura once. Note how the knee felt, the way you do for lifting days.</div>',
      '<button class="btn good" data-a="cardioSave">Save cardio</button>');
    return;
  }
  if(plan==='Rest'&&!d.sess&&sh.step==='choose'&&d.workout!=='done'){
    const m=d.mins||{};
    U.openSheet('Rest day','<div class="hint">Rest from lifting. Your rest day is cardio: walking and running, plus the rehab list.</div>'+rotStrip(plan)+(d.cardio?`<div class="note">Cardio logged: ${m.walk||0} min walking, ${m.run||0} min running.</div>`:'')+'<div class="sec">Feeling strong and want to lift anyway?</div>'+seg('sess',[['Push','Push'],['Pull','Pull'],['Legs','Legs']],plan)+'<div class="small">The rotation follows what you finish, not the calendar. Rest comes after Legs, and it moves on to Push when the day passes. A session you miss stays due.</div>','<button class="btn good" data-a="cardioStart">'+(d.cardio?'Change my cardio':'Log my walk or run')+'</button><button class="btn ghost" data-a="close">Close</button>');return}
  if(sh.step==='lift')return renderLift();
  if(sh.step==='details'){
    const lv=cardioLive(sh),en=E.energyDay(d);
    U.openSheet(plan+' report',
      '<div class="hint">Last time’s numbers are filled in. Change only what was different today.</div>'+stp('lift','Lifting','minutes',sh.tmp.lift)+cardioBlock(sh)+
      `<div class="est" id="cEst">${lv.est}</div>`+(d.hWork?`<button class="chipbtn${sh.tmp.useH?' on':''}" data-a="useHB" aria-pressed="${!!sh.tmp.useH}"><b>Samsung Health recorded ${d.hWork.min} min, ${fmt(d.hWork.kcal)} kcal</b><span>${sh.tmp.useH?'Using it':'Use that number'}</span></button>`:'')+(en.act!=null?`<div class="note">Samsung Health counts ${fmt(en.act)} active kcal so far today, walking included.</div>`:''),
      '<button class="btn" data-a="gymNext">Next</button>');
    return;
  }
  if(sh.step==='pain'){
    const p=d.pain||{knee:'none',back:'none'};
    U.openSheet(plan+' done','<div class="hint">How did it feel? This goes in your pain log for the physio.</div><div class="sec">Right knee</div>'+seg('pk',[['none','None'],['mild','Mild'],['sharp','Sharp']],p.knee)+'<div class="sec">Lower back</div>'+seg('pb',[['none','None'],['mild','Mild'],['sharp','Sharp']],p.back)+
      (p.knee==='sharp'||p.back==='sharp'?'<div class="warn">Sharp pain is a stop signal for that movement. Note which exercise caused it and tell your physio.</div>':'')+
      `<div class="note">Next in your rotation: <b>${E.ROT[E.S().rot.i]}</b>. Rehab for it: ${HS.REHAB_FOR[E.ROT[E.S().rot.i]]}.</div>`,
      '<button class="btn good" data-a="gymFinish">Finish</button>');
    return;
  }
  if(d.workout==='pain'||d.workout==='lazy'||d.workout==='pass'){
    const t=d.workout==='pain'?': pain day':d.workout==='pass'?': rest pass':': skipped';
    U.openSheet(plan+t,'<div class="hint">'+(d.workout==='pain'?'No penalty. Tell your physio what hurt. '+plan+' is still due next.':d.workout==='pass'?'Covered by your weekly rest pass. '+plan+' is still due next.':'Logged. '+plan+' is still due. Tomorrow you show up.')+'</div>','<button class="btn ghost" data-a="close">Close</button>');return;
  }
  const capn=plan==='Legs'?'<div class="note">Your own cap: 30 to 40 kg on squats and deadlifts until your physio says otherwise.</div>':'';
  const fat=E.fatigued()?'<div class="warn" style="margin-top:0">You are fatigued. Finishing this workout is your comeback quest: it lifts the level lock and the aura penalty.</div>':'';
  const list=E.routine(plan);
  U.openSheet(plan+' day',fat+rotStrip(plan)+'<div class="hint" style="margin-top:12px">'+list.length+' exercises, '+list.reduce((a,x)=>a+x.sets,0)+' sets. Rehab today: '+(HS.REHAB_FOR[plan]||'')+'.</div>'+'<div class="sec">Doing a different session today?</div>'+seg('sess',[['Push','Push'],['Pull','Pull'],['Legs','Legs']],plan)+capn+'<div class="sec">Not training today?</div><div class="notrain"><button class="btn vio" data-a="gym:pain">Pain day, could not train</button>'+(E.passLeft()?'<button class="btn ghost" data-a="gym:pass">Use my weekly rest pass</button>':'')+'<button class="btn bad" data-a="gym:lazy">Skip with no excuse</button></div><div class="small pen">'+penaltyLine()+'</div>'+yestCardioBtn(),
    '<button class="btn" data-a="liftStart">Start workout</button>');
}
A.cardioStart=function(){
  const d=E.day(),c=E.lastCardio(),hw=d.hWalk,m=d.mins||null,det=d.cardioDet||{};
  U.sh.step='cardio';
  U.sh.tmp=cardioFresh({day:'today',walk:d.cardio&&m?m.walk:(hw?Math.max(5,Math.round(hw.min/5)*5):c.walk),run:d.cardio&&m?m.run:c.run,free:d.runFree!=null?d.runFree:c.free,wInc:d.cardio&&det.wInc!=null?det.wInc:c.wInc,rInc:d.cardio&&det.rInc!=null?det.rInc:c.rInc,
    wKm:d.cardio?det.wKm||0:0,rKm:d.cardio?det.rKm||0:0,wSpd:det.wSpd,rSpd:det.rSpd,useH:!!hw&&!d.cardio});
  U.sh.tmp.nopain=d.cardio&&d.runFree!=null&&d.runFree>=U.sh.tmp.run&&U.sh.tmp.run>0;
  F.play('pick');renderGym();
};
/* yesterday's walk or run, typed in the next day */
A.cardioYest=function(){A.cardioStart();U.sh.tmp.yestOnly=true;A.cday('yest')};
A.cday=function(v){
  const t=U.sh.tmp,yk=E.keyOffset(-1);
  if(v==='yest'&&!E.cardioDayOk(yk))return;
  const d=v==='yest'?E.S().days[yk]:E.day(),m=d&&d.cardio&&d.mins?d.mins:null,det=d&&d.cardioDet||{};
  t.day=v;
  /* a day that already has a walk or run shows it; otherwise what you have typed stays as it is */
  if(m){t.walk=m.walk||0;t.run=m.run||0;t.free=d.runFree!=null?d.runFree:t.free;t.wKm=det.wKm||0;t.rKm=det.rKm||0;t.nopain=t.run>0&&d.runFree!=null&&d.runFree>=t.run}
  t.useH=!!(cardioHW(t))&&!(d&&d.cardio);
  F.play('pick');reGym();
};
A.useHW=function(){U.sh.tmp.useH=!U.sh.tmp.useH;F.play('pick');reGym()};
A.wsurf=function(v){const t=U.sh.tmp;t.wInc=v==='flat'?0:(t.keepInc||E.CARDIO_DEF.wInc);F.play('pick');reGym()};
A.noPain=function(){const t=U.sh.tmp;t.nopain=!t.nopain;F.play('pick');reGym()};
A.cmore=function(){const t=U.sh.tmp;t.more=!t.more;F.play('tick',60);reGym()};
A.cardioSave=function(){
  const sh=U.sh,t=sh.tmp,yk=E.keyOffset(-1),yest=t.day==='yest';
  if(!(t.walk>0||t.run>0)){U.sys('Add some walking or running minutes first.','bad');return}
  const bad=cardioProblem(t);if(bad){U.sys(bad,'bad');return}
  if(yest&&!E.cardioDayOk(yk)){U.sys('Yesterday was not a rest day, so there is nothing to log there.','bad');return}
  if(!yest&&!(E.planFor()==='Rest'&&!E.day().sess)){U.sys('Today is a training day. Finish your session, or log a walk for yesterday.','bad');return}
  const hw=cardioHW(t),det=cardioDetOf(t);
  if(t.useH&&hw)det.src='samsung';
  const free=t.run>0?(t.nopain?t.run:Math.min(t.free,t.run)):null;
  const r=E.completeCardio({walk:t.walk,run:t.run,free:free,kcal:t.useH&&hw?hw.kcal:0,det:det},yest?yk:undefined);
  U.justRow='gym';F.play('quest');F.vib([20,30,30]);U.closeSheet();
  const km=(t.wKm>0?t.wKm:0)+(t.rKm>0?t.rKm:0);
  U.sys((r.first?'Cardio logged. +60 aura. ':'Cardio updated. ')+(yest?'For yesterday. ':'')+t.walk+' min walking, '+t.run+' min running'+(km>0?', '+(Math.round(km*10)/10)+' km':'')+'.','good',true);F.burstCenter(30);
};
A.sess=function(v){if(v==='Rest'&&E.planFor()!=='Rest')return;   /* a rest day on demand is the rest pass or a pain day, not a relabel */
  E.setSession(v);E.save();U.sh.step='choose';renderGym()};
A.liftStart=function(){U.sh.step='lift';F.play('pick');renderGym()};
A.gym=function(v){
  if(v==='pain'){E.painDay();U.justRow='gym';U.closeSheet();U.sys('Smart call. Pain day, no penalty. Log what hurt and tell your physio.','')}
  else if(v==='pass'){E.restPass();U.closeSheet();U.sys('Rest pass used. No penalty, no reward. Never miss twice.','')}
  else if(v==='lazy'){E.skipWorkout();U.closeSheet()}
};
function lastTxt(ex){
  const l=E.S().last[ex.n],sg=E.suggestW(ex);
  if(!l)return'First time. Tap the kg pill to set a weight';
  return 'Last: '+(l.w?l.w+' kg':'no weight')+' × '+l.r+(sg?' · try '+sg+' kg':'');
}
function renderLift(){
  const sh=U.sh,plan=E.planFor(),list=E.routine(plan),p=E.liftProgress(plan),vol=E.volumeToday(plan);
  const exDone=list.filter(ex=>E.exState(ex).sets.slice(0,ex.sets).every(s=>s.done)).length;
  let body=`<div class="lh2"><div class="lhr"><svg viewBox="0 0 44 44" aria-hidden="true"><circle class="trk" cx="22" cy="22" r="18"/><circle class="arc g" cx="22" cy="22" r="18" pathLength="100" style="stroke-dashoffset:${100-(p.total?p.done/p.total*100:0)}"/></svg><b>${exDone}/${list.length}</b></div><div class="lht"><b>${exDone===list.length?'All exercises done':exDone+' of '+list.length+' exercises'}</b><small>${p.done} of ${p.total} sets${vol?' · '+fmt(vol)+' kg moved':''}</small></div></div><div class="small" style="margin-top:0">Tap the circle to log a whole exercise. Tap a set to log it alone.</div>`;
  list.forEach((ex,xi)=>{
    const st=E.exState(ex),open=sh.exEdit===xi,w0=st.sets[0]?st.sets[0].w:0,over=ex.cap&&st.sets.some(s=>s.w>HS.CAP_KG),fin=st.sets.slice(0,ex.sets).every(s=>s.done),sg=E.suggestW(ex);
    body+=`<div class="ex2${fin?' fin':''}"><div class="ex2h"><button class="ex2c" data-a="exall:${xi}" aria-pressed="${fin}" aria-label="${fin?'Undo all sets of ':'Log all sets of '}${esc(ex.n)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.500l4.500 4.500L19 7.500"/></svg></button>
      <div class="exn"><b>${esc(ex.n)}</b><small>${esc(ex.g)} · ${ex.sets} × ${ex.reps}${oneSided(ex.n)?' each side':''}</small></div>
      <button class="exw" data-a="exedit:${xi}" aria-pressed="${open}" aria-label="Weight ${w0?w0+' kilograms':'not set'}, tap to change"><b>${w0||'set'}</b><small>kg</small></button></div>
      <div class="sets">${st.sets.slice(0,ex.sets).map((s,si)=>`<button class="sb${s.done?' done':''}" data-a="set:${xi}:${si}" aria-pressed="${s.done}" aria-label="Set ${si+1}, ${s.r} reps"><b>${s.r}</b><small>${s.w?s.w+' kg':'reps'}</small></button>`).join('')}</div>
      <div class="exl">${esc(lastTxt(ex))}</div>
      ${over?'<div class="warn capw">Above your own '+HS.CAP_KG+' kg cap for this lift.</div>':''}
      ${open?`<div class="exe2"><div class="stp"><span>Weight<small>every set of this exercise</small></span><div class="c"><button data-a="exw:${xi}:-2.5" aria-label="Less weight">−</button><i>${w0}</i><button data-a="exw:${xi}:2.5" aria-label="More weight">+</button></div></div>
        ${sg&&sg!==w0?`<button class="chipbtn" data-a="exset:${xi}:${sg}"><b>Try ${sg} kg</b><span>a small step up from last time</span></button>`:''}
        <div class="stp"><span>Reps<small>sets not done yet</small></span><div class="c"><button data-a="exr:${xi}:-1" aria-label="Fewer reps">−</button><i>${st.sets[0].r}</i><button data-a="exr:${xi}:1" aria-label="More reps">+</button></div></div></div>`:''}</div>`;
  });
  U.openSheet(plan+' day',body,'<div class="rest" id="rest" hidden><svg viewBox="0 0 40 40" aria-hidden="true"><circle class="trk" cx="20" cy="20" r="16"/><circle id="restR" class="arc k" cx="20" cy="20" r="16" pathLength="100"/></svg><b id="restT">1:15</b><span>Rest</span><button data-a="restSkip">Skip</button></div><button class="btn good" data-a="liftFinish">Finish workout</button>',{full:true});
}
A.exedit=function(v){const sh=U.sh;sh.exEdit=sh.exEdit===+v?-1:+v;U.keepScroll(renderLift)};
function liftEx(xi){return E.routine(E.planFor())[xi]}
A.exall=function(v){
  const ex=liftEx(+v),st=E.exState(ex),fin=st.sets.slice(0,ex.sets).every(s=>s.done);
  const r=E.setAll(ex,!fin);
  if(!fin)startRest();
  U.keepScroll(renderLift);
  if(!fin){const el=document.querySelector('[data-a="exall:'+v+'"]');if(el){el.classList.add('pop');F.burstAt(el,12)}}
};
A.exw=function(v){const p=v.split(':'),ex=liftEx(+p[0]),st=E.exState(ex);E.setWeight(ex,st.sets[0].w+ +p[1]);F.play('tick',st.sets[0].w*5);F.vib(5);U.keepScroll(renderLift)};
A.exset=function(v){const p=v.split(':'),ex=liftEx(+p[0]);E.setWeight(ex,+p[1]);F.play('pick');U.keepScroll(renderLift)};
A.exr=function(v){const p=v.split(':'),ex=liftEx(+p[0]),st=E.exState(ex);st.sets.forEach(s=>{if(!s.done)s.r=Math.max(1,s.r+ +p[1])});E.save();F.play('tick',200);F.vib(5);U.keepScroll(renderLift)};
A.set=function(v,b){
  const p=v.split(':'),ex=liftEx(+p[0]),st=E.exState(ex),s=st.sets[+p[1]];
  const on=!s.done;
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
E.on('sets',e=>{
  if(!e.on){F.play('tap');return}
  if(e.pr){F.play('pr');F.vib([30,40,30,40,160]);F.burstCenter(70);U.overlay('','NEW PR','',e.ex.n+'. +25 aura.',2600)}
  else{F.play('set');F.vib([18,30,18])}
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
  if(!p.done){U.sys('Log at least one exercise first.','bad');return}
  stopRest();U.sh.step='details';F.play('pick');renderGym();
};
const STEP_MAX={free:60,wInc:15,rInc:15,wSpd:8,rSpd:22,walk:300,run:300,lift:240};
const STEP_MIN={wSpd:1.5,rSpd:4};
A.st=function(v){
  const p=v.split(':'),t=U.sh.tmp,k=p[0];
  let x=(+t[k]||0)+ +p[1];
  x=Math.min(STEP_MAX[k]!=null?STEP_MAX[k]:300,Math.max(STEP_MIN[k]||0,x));
  t[k]=Math.round(x*10)/10;
  if(k==='run'&&t.free>t.run)t.free=t.run;
  if(k==='wInc'&&t.wInc>0)t.keepInc=t.wInc;
  F.play('tick',t[k]*4);F.vib(5);reGym();
};
/* a typed distance: update the numbers under it, not the whole sheet, so the keyboard stays up */
document.addEventListener('input',e=>{
  const sh=U.sh,f=e.target&&e.target.dataset&&e.target.dataset.f;
  if(!sh||sh.type!=='gym'||!f||!sh.tmp)return;
  const v=parseFloat(String(e.target.value).replace(',','.'));
  sh.tmp[f]=v>0&&v<1000?v:0;
  const lv=cardioLive(sh),a=$('#cSum'),b=$('#cEst');
  if(a)a.innerHTML=lv.sum;if(b)b.innerHTML=lv.est;
});
function victory(plan,r,p){
  const d=E.day(),S=E.S(),prs=Object.keys(d.lift||{}).filter(n=>d.lift[n].pr).length,line=U.hype(prs?'pr':'workout'),str=E.streak('workout'),vol=E.volumeToday(plan);
  const stats=[['+'+r.award,'AURA'],[p.done,'SETS'],[vol?fmt(vol):'—','KG MOVED'],[prs||str||1,prs?'PRS':'IN A ROW']];
  U.cele({kind:'victory',ms:5600,sound:'hype',vib:[40,40,40,40,200],
    fx:()=>{F.confetti(140)},
    html:'<div class="rays"></div><div class="kicker">TRAINING COMPLETE</div><div class="vav">'+HS.avatar.svg(S.equip,{mood:'proud'})+'</div><h1>'+plan.toUpperCase()+' DAY</h1><div class="vstats">'+stats.map(x=>'<div><b>'+x[0]+'</b><span>'+x[1]+'</span></div>').join('')+'</div><p>'+esc(line)+'</p>'+(r.comeback?'<p class="sub">Comeback bonus +40. Fatigue broken, your level can rise again.</p>':'')+'<p class="sub">Next up: '+E.ROT[E.S().rot.i]+'.</p>'});
}
A.useHB=function(){const sh=U.sh;sh.tmp.useH=!sh.tmp.useH;F.play('pick');reGym()};
A.gymNext=function(){
  const sh=U.sh,d=E.day(),t=sh.tmp,plan=E.planFor();
  if(d.workout==='done')return;   /* a double tap on Next must not pay twice */
  const bad=cardioProblem(t);if(bad){U.sys(bad,'bad');return}
  const det=cardioDetOf(t);if(t.useH&&d.hWork)det.src='samsung';
  d.mins={lift:t.lift,walk:t.walk,run:t.run};d.cardioDet=(t.walk>0||t.run>0)?det:null;
  d.burn=t.useH&&d.hWork?d.hWork.kcal:E.burnEst(kg(),t.lift,t.walk,t.run,det);d.runFree=t.run>0?(t.nopain?t.run:Math.min(t.free,t.run)):null;
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
   REHAB: today's schedule follows the gym session (Push gets Day 1, Pull Day 2, Legs Day 3), a guided session with a moving outline
   for every move, left and right sides done separately, the pain check-in, and the roadmap.
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
function rehRec(){const d=E.day();if(!d.reh)d.reh={items:{},day:0,knee:0,back:0,sharp:false,done:false,n:0,checked:false};if(!d.reh.sd)d.reh.sd={};return d.reh}
const sideOf=(r,key,sd)=>!!(r.items[key]||(r.sd[key]&&r.sd[key][sd]));
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
  const chips=it=>it.sides==='each'?`<div class="sidechips"><button data-a="rside:${esc(it.key)}:L" aria-pressed="${sideOf(r,it.key,'L')}">Left</button><button data-a="rside:${esc(it.key)}:R" aria-pressed="${sideOf(r,it.key,'R')}">Right</button></div>`:'';
  const row=it=>`<div class="rx"><button class="chk" data-a="rt:${esc(it.key)}" aria-pressed="${!!r.items[it.key]}"><i>✓</i><span>${esc(it.name)}<small>${esc(it.rx)}${it.sides==='alt'?' · swap sides each set':''}</small></span>${it.fig?'<div class="rxm">'+HS.figSvg(it.fig,'mini')+'</div>':''}</button>${chips(it)}</div>`;
  const cov=it=>`<div class="rx cov"><div class="chk" aria-disabled="true"><i style="${d.workout==='done'?'background:var(--glow);border-color:var(--glow);color:#02101f':''}">✓</i><span>${esc(it.name)}<small>${esc(it.rx)}</small></span></div></div>`;
  const mins=Math.max(4,Math.round(E.rehabKeys().filter(x=>x!=='aero').length*1.4));
  const left=pr.total-pr.done;
  U.openSheet('Rehab',
    tabs+`<div class="rhead"><div class="rring"><svg viewBox="0 0 44 44" aria-hidden="true"><circle class="trk" cx="22" cy="22" r="18"/><circle class="arc k" cx="22" cy="22" r="18" pathLength="100" style="stroke-dashoffset:${100-(pr.total?pr.done/pr.total*100:0)}"/></svg><b>${pr.done}/${pr.total}</b></div>
      <div class="rtxt"><b>${t.plan} day · ${esc(HS.REHAB_FOR[t.plan]||'')}</b><small>${pr.total} moves · about ${mins} min${t.aerobic?' + 30 min easy cardio':''}</small></div></div>
    ${holdBanner(t)}
    ${r.done?'<div class="note" style="margin-top:12px">Rehab quest cleared today. Extra moves still help. Log how it felt below.</div>':''}
    <button class="btn vio gstart" data-a="rguide">${pr.done?'Continue the guided session':'Start the guided session'}<small>${left} move${left===1?'':'s'} left · one at a time, left and right sides separately</small></button>
    ${rg.groups.map(g=>`<div class="sec">${esc(g.title)}${g.bonus?' <em>optional</em>':''}<small>${esc(g.sub)}</small></div>${g.items.map(g.cover?cov:row).join('')}`).join('')}
    ${t.finisher!=null&&HS.RDAYS[t.finisher].x.some(e=>e[3])?'<div class="small">Jefferson curl is left out, as you chose.</div>':''}
    <div class="note">The moves come from your external physio’s written plan (the sheet shows age 19, so confirm it is still current at your next visit). Knee-to-chest is held for 30 seconds on each leg, as your physio confirmed (the printed sheet says 10 seconds). Figures are simplified outlines of the movement, not technique advice: ask your physio to show you the exact form. "S/B" is drawn as a Swiss ball.</div>
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
  const r=rehRec(),on=!r.items[v];
  r.items[v]=on;
  if(on){if(r.sd[v]!==undefined||isSided(v))r.sd[v]={L:true,R:true}}else delete r.sd[v];
  E.save();F.play(on?'set':'tap');F.vib(8);
  U.keepScroll(renderRehab);
};
function isSided(key){const it=E.rehabGroups().groups.reduce((a,g)=>a.concat(g.items),[]).find(x=>x.key===key);return !!(it&&it.sides==='each')}
/* one side of a move */
A.rside=function(v){
  const i=v.lastIndexOf(':'),key=v.slice(0,i),sd=v.slice(i+1),r=rehRec();
  const o=r.sd[key]=r.sd[key]||{L:!!r.items[key],R:!!r.items[key]};
  o[sd]=!o[sd];r.items[key]=!!(o.L&&o.R);
  E.save();F.play(o[sd]?'set':'tap');F.vib(8);
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

/* ---- the guided session: one move at a time, a one-sided move once on each side ---- */
function stopHold(){const g=U.sh&&U.sh.g;if(g&&g.t){clearInterval(g.t.iv);g.t=null}}
function guideList(){
  const out=[];
  E.rehabGroups().groups.filter(g=>!g.bonus&&!g.cover).forEach(g=>g.items.forEach(it=>{
    if(it.sides==='each'){out.push(Object.assign({group:g.title,side:'L'},it));out.push(Object.assign({group:g.title,side:'R'},it))}
    else out.push(Object.assign({group:g.title},it));
  }));
  return out;
}
const entryDone=(r,it)=>it.side?sideOf(r,it.key,it.side):!!r.items[it.key];
function markEntry(it){
  const r=rehRec();
  if(it.side){const o=r.sd[it.key]=r.sd[it.key]||{L:!!r.items[it.key],R:!!r.items[it.key]};o[it.side]=true;if(o.L&&o.R)r.items[it.key]=true}
  else r.items[it.key]=true;
}
A.rguide=function(){
  const list=guideList(),r=rehRec(),first=list.findIndex(it=>!entryDone(r,it));
  U.sh.tab='guide';U.sh.g={list:list,i:first<0?0:first,set:0,t:null};F.play('pick');F.vib(10);renderRehab();
};
const SIDEW={L:'LEFT',R:'RIGHT'};
function renderGuide(){
  const sh=U.sh,g=sh.g,it=g.list[g.i],px=parseRx(it.rx),total=px.sets||1;
  stopHold();g.busy=false;
  const sideNow=it.side?SIDEW[it.side]:it.sides==='alt'?(g.set%2===0?'LEFT':'RIGHT'):null;
  const sideTxt=sideNow?(it.fig==='farmer'?'Heavier weight in your '+sideNow+' hand':sideNow+' side'):'';
  const label=px.secs?'Start hold · '+px.secs+' s'+(total>1?' (set '+(g.set+1)+' of '+total+')':''):total>1?'Set '+(g.set+1)+' of '+total+' done':'Done';
  const nextSide=it.side==='L'?'Next: the RIGHT side.':'';
  U.openSheet('Guided rehab',
    `<div class="gd"><div class="gtop"><div class="xp"><i style="width:${g.i/g.list.length*100}%"></i></div><span>${g.i+1} / ${g.list.length}</span></div>
      <div class="ggrp">${esc(it.group)}</div>
      <div class="gfig${sideNow==='RIGHT'?' flip':''}">${it.fig?HS.figSvg(it.fig,'big'):''}<div class="holdr" id="holdr" hidden><svg viewBox="0 0 120 120" aria-hidden="true"><circle class="trk" cx="60" cy="60" r="52"/><circle class="arc k" id="holdArc" cx="60" cy="60" r="52" pathLength="100" style="stroke-dashoffset:0"/></svg><b id="holdT">${px.secs||0}</b></div></div>
      <h3>${esc(it.name)}</h3>${sideTxt?'<div class="gside '+(sideNow==='RIGHT'?'r':'l')+'">'+esc(sideTxt)+'</div>':''}<div class="grx">${esc(it.rx)}${px.note?' · '+esc(px.note):''}</div>
      ${HS.CUES&&HS.CUES[it.fig]?'<div class="gcue">'+esc(HS.CUES[it.fig])+'</div>':''}
      ${nextSide&&g.set===total-1?'<div class="gcue">'+nextSide+'</div>':''}
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
      markEntry(it);E.save();F.play('quest');F.burstAt($('.gfig'),16);
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
  return '<div class="rweek">'+w.map(x=>`<div class="${x.k===td?'today':''}"><b>${x.d}</b><span>${x.plan}</span><small>${x.fin||'block'}${x.aero?' + walk':''}${x.bonus?' + bonus':''}</small><i>${x.n}</i></div>`).join('')+'</div><div class="small">The daily block every day. Day 1 core with Push, Day 2 Swiss-ball work with Pull, Day 3 with Legs (your leg workout is Day 3, so only the balance work is extra), and a longer session on the rest day. Days follow the rotation: they are today\u2019s plan and a forecast, and they shift when you train a different session. The number is how many moves count that day.</div>';
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
  if(d.closed){U.openSheet('Day cleared','<div class="hint">'+d.score+' of 6 pillars. Aura today: '+(d.delta>=0?'+':'−')+Math.abs(d.delta)+'.</div>'+(d.chest?'':'<div class="stack2"><button class="btn vio" data-a="chestOpen">Open today’s chest</button></div>'),'<button class="btn ghost" data-a="close">Close</button>');return}
  const open=U.quests().filter(q=>q.st==='todo'&&!q.opt&&['close','weigh','rehab'].indexOf(q.id)<0).map(q=>q.id==='gym'?'Log your workout':'Log or skip '+q.id);
  if(open.length){U.openSheet('Not yet','<div class="hint">Finish these first, so the tally is honest.</div>'+open.map(o=>'<div class="q"><span>'+esc(o)+'</span><span class="no">OPEN</span></div>').join(''),'<button class="btn ghost" data-a="close">Back</button>');return}
  const st=E.dayStatus(),T=st.T,tot=st.tot;
  /* the same six pillars as the streak, one list */
  const rows=st.pillars.map(p=>'<div class="q"><span>'+esc(p.t)+'</span><span class="'+(p.met?'ok':'no')+'">'+(p.met?'✓ ':'')+esc(p.s)+'</span></div>').join('');
  const cal='<div class="q"><span>Calories '+fmt(T.lo)+' to '+fmt(T.hi)+' <small class="sb2">bonus +80 aura</small></span><span class="'+(st.calOk?'ok':'no')+'">'+(st.calOk?'✓ ':'')+fmt(tot.k)+'</span></div>';
  U.openSheet('Clear the day','<div class="hint">Last look: '+st.score+' of 6 pillars lit. Clearing opens your chest, and the calorie window pays a bonus on top.</div>'+rows+'<div class="sec">Bonus</div>'+cal+(tot.k<T.lo?'<div class="note">Under '+fmt(T.lo)+' kcal does not count. Eating too little costs muscle. If you forgot to log something, go back and add it.</div>':''),'<button class="btn" data-a="lock">Clear it</button>');
};
A.lock=function(){
  if(E.day().closed)return;
  U.justRow='close';F.vib([30,40,60]);U.closeSheet();
  E.closeDay();
};
})();
