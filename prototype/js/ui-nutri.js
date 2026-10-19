/* ui-nutri.js: nutrition screens. Today's calories, macros and micronutrients against daily targets, the facts of one food (with where the number
   comes from), and adding a food from a pack label. Food values come from IFCT 2017; see tools/nutrition/REPORT.md. */
(function(){
'use strict';
const HS=window.HS=window.HS||{};
const E=HS.E,F=HS.fx,U=HS.ui;
const esc=U.esc,fmt=U.fmt,IC=U.IC,$=U.$,A=U.act;

const fmtAmt=(x,u)=>{
  if(u==='g')return (x>=100?Math.round(x):x>=10?x.toFixed(0):x.toFixed(1))+' g';
  if(u==='mg')return (x>=100?fmt(x):x>=10?x.toFixed(0):x.toFixed(1))+' mg';
  return (x>=100?fmt(x):x>=10?x.toFixed(0):x.toFixed(1))+' mcg';
};
const unitAmt=(r,x)=>fmtAmt(x,r.u);
const SRC='Food values: Indian Food Composition Tables 2017 (NIN Hyderabad, ICMR), with recipes built from them. Mess dishes are estimates: oil and portions vary from day to day, and cooking loses some vitamins (allowed for). Vitamin B12 is not measured in those tables, so it is not shown. Targets: ICMR-NIN 2020 allowances for men aged 19 to 39, rounded. A guide, not a diagnosis.';

/* ---------------- today's nutrition ---------------- */
let open={};
U.nutriSheet=function(){
  U.sh={type:'nutri'};open={};renderNutri();
};
A.nutri=function(){F.play('nav');U.nutriSheet()};
function bar(r,x){
  const st=E.rdaState(r,x),w=st.pct==null?0:Math.min(100,st.pct*100);
  return `<div class="nbar ${st.cls}"><i style="width:${w}%"></i>${r.kind==='max'?'<u></u>':''}</div>`;
}
function nrow(r,n){
  const x=n.v[r.k]||0,st=E.rdaState(r,x),srcs=n.top[r.k]||[],isOpen=!!open[r.k];
  const tgt=r.v?(r.kind==='max'?'max ':'')+(r.v>=100?fmt(r.v):r.v)+' '+r.u:'';
  const fromSupp=n.supp[r.k]||0;
  return `<div class="nr${isOpen?' open':''}"><button class="nrb" data-a="nsrc:${r.k}" aria-expanded="${isOpen}">
      <span class="nl"><b>${esc(r.t)}</b>${st.pct!=null?'<em class="'+st.cls+'">'+Math.round(st.pct*100)+'%</em>':''}</span>
      <span class="nv">${unitAmt(r,x)}${tgt?' <small>of '+tgt+'</small>':''}</span>${bar(r,x)}</button>
    ${isOpen?`<div class="nsrc">${srcs.length?'<b>Biggest sources today</b>'+srcs.map(s=>'<span>'+esc(s[0])+' <i>'+unitAmt(r,s[1])+'</i></span>').join(''):'<span>Nothing logged with this yet.</span>'}${fromSupp?'<span class="ns2">Includes '+unitAmt(r,fromSupp)+' from supplements</span>':''}${r.note?'<small>'+esc(r.note)+'</small>':''}</div>`:''}</div>`;
}
function macroBar(tot,T){
  const kP=tot.p*4,kC=(tot.c||0)*4,kF=(tot.f||0)*9,sum=kP+kC+kF||1;
  const pc=x=>Math.round(x/sum*100);
  return `<div class="mbar" role="img" aria-label="Protein ${pc(kP)} percent, carbohydrate ${pc(kC)} percent, fat ${pc(kF)} percent of calories"><i class="mp" style="width:${kP/sum*100}%"></i><i class="mc2" style="width:${kC/sum*100}%"></i><i class="mf" style="width:${kF/sum*100}%"></i></div>
    <div class="mleg"><span><b class="mp"></b>Protein <strong>${Math.round(tot.p)} g</strong> <em>${pc(kP)}%</em></span><span><b class="mc2"></b>Carbs <strong>${Math.round(tot.c||0)} g</strong> <em>${pc(kC)}%</em></span><span><b class="mf"></b>Fat <strong>${Math.round(tot.f||0)} g</strong> <em>${pc(kF)}%</em></span></div>`;
}
function renderNutri(){
  const d=E.day(),T=E.T(),tot=E.totals(d),n=E.nutrients(d),left=T.kcal-tot.k,wk=E.nutrientWeek(7);
  const grp=g=>HS.RDA.filter(r=>r.g===g);
  const gaps=wk.days>=3?HS.RDA.filter(r=>r.kind==='min'&&r.v&&r.g!=='macro').map(r=>({r:r,p:wk.avg[r.k]/r.v})).filter(x=>x.p<.6).sort((a,b)=>a.p-b.p).slice(0,3):[];
  const supps=E.supps();
  U.openSheet('Nutrition today',
    `<div class="nh"><div><b>${fmt(tot.k)}</b><span>of ${fmt(T.kcal)} kcal</span></div><div class="nhr ${left>=0?'':'over'}">${left>=0?fmt(left)+' left':fmt(-left)+' over'}</div></div>
     <div class="nh2"><div><b>${Math.round(tot.p)}</b><span>of ${T.protein} g protein</span></div></div>
     ${macroBar(tot,T)}
     <div class="sec">Fibre, sugar and fats</div>${grp('macro').map(r=>nrow(r,n)).join('')}
     <div class="sec">Minerals</div>${grp('min').map(r=>nrow(r,n)).join('')}
     <div class="sec">Vitamins</div>${grp('vit').map(r=>nrow(r,n)).join('')}
     <div class="sec">Omega-3</div>${grp('fat').map(r=>nrow(r,n)).join('')}
     <div class="sec">Supplements</div>
     ${supps.map(sp=>`<button class="chk" data-a="supp:${sp.id}" aria-pressed="${E.suppTaken(sp.id)}"><i>✓</i><span>${esc(sp.t)}<small>${esc(sp.when)}</small></span></button>`).join('')}
     <div class="small">Ticked supplements count towards the totals above, so vitamin D and calcium are honest. Ask your doctor about doses.</div>
     ${gaps.length?`<div class="sec">Low this week<small class="sub">Average of ${wk.days} logged days</small></div>`+gaps.map(g=>`<div class="gap"><b>${esc(g.r.t)} <em>${Math.round(g.p*100)}%</em></b><small>${E.richIn(g.r.k,null,4).map(esc).join(', ')} are good picks from the mess and your staples.</small></div>`).join(''):''}
     <div class="note">${esc(SRC)}</div>`,
    '<button class="btn" data-a="close">Done</button>',{full:true});
}
A.nsrc=function(v){open[v]=!open[v];U.keepScroll(renderNutri)};
A.supp=function(id){const on=E.toggleSupp(id);F.play(on?'quest':'tick',80);F.vib(on?[10,20,10]:5);U.keepScroll(renderNutri)};

/* ---------------- one food: facts and source ---------------- */
U.foodSheet=function(name,g){
  const f=E.food(name);if(!f)return;
  const back=U.sh&&U.sh.type==='plate'?{meal:U.sh.meal,edit:U.sh.edit}:null;
  U.sh={type:'food',name:name,back:back};
  g=g>0?g:f.ug;
  const k=x=>f.n[HS.NUT_IX[x]]||0,per=(x,gg)=>k(x)*gg/100;
  const big=[['kcal',per('k',g),''],['protein',per('p',g),'g'],['carbs',per('c',g),'g'],['fat',per('f',g),'g']];
  const tier=HS.TIERS[f.tier]||(f.tier==='L'?'Your own entry':'');
  const rows=HS.RDA.filter(r=>r.k!=='n3'||k('n3')>0).map(r=>({r:r,x:per(r.k,g)}));
  const rich=rows.filter(o=>o.r.v&&o.r.kind==='min'&&o.x/o.r.v>=.1).sort((a,b)=>b.x/b.r.v-a.x/a.r.v);
  const hasMicro=f.n.slice(5).some(x=>x>0);
  U.openSheet(f.name,
    `<div class="fh"><span class="fe">${HS.emoji(f.name)}</span><div><b>${Math.round(g)} g</b><small>${E.units(f,g)} × ${esc(f.unit)} (1 = ${f.ug} g)</small></div><em class="tier t-${f.tier}">${f.tier==='A'?'IFCT':f.tier==='B'?'RECIPE':f.tier==='C'?'TYPICAL':'MINE'}</em></div>
     <div class="fbig">${big.map(b=>`<div><b>${b[1]>=100?Math.round(b[1]):b[1].toFixed(1).replace(/\.0$/,'')}</b><span>${b[0]}${b[2]?' ('+b[2]+')':''}</span></div>`).join('')}</div>
     <div class="sec">Per 100 g</div>
     <div class="ftab">${[['Calories',k('k'),'kcal'],['Protein',k('p'),'g'],['Carbs',k('c'),'g'],['Fat',k('f'),'g'],['Fibre',k('fi'),'g'],['Sugar',k('su'),'g'],['Saturated fat',k('sf'),'g'],['Sodium',k('na'),'mg']].map(r=>`<div><span>${r[0]}</span><b>${r[1]>=100?Math.round(r[1]):r[1].toFixed(1).replace(/\.0$/,'')} ${r[2]}</b></div>`).join('')}</div>
     ${hasMicro?`<div class="sec">Vitamins and minerals in this portion</div>${rich.length?rich.slice(0,8).map(o=>`<div class="fr2"><span>${esc(o.r.t)}</span><b>${unitAmt(o.r,o.x)} <em>${Math.round(o.x/o.r.v*100)}%</em></b></div>`).join(''):'<div class="small" style="margin-top:0">Nothing here gives more than 10% of a daily target.</div>'}
        <div class="small">Percent of the daily target for the amount shown. Cooking losses are already allowed for.</div>`:'<div class="small">This entry only has the numbers you gave it: calories and the macros.</div>'}
     <div class="sec">Where this number comes from</div>
     <div class="note" style="margin-top:0"><b>${esc(tier)}.</b> ${esc(f.note||'')}${f.custom?'':' See tools/nutrition/REPORT.md in the project for the recipe and the old estimate this replaced.'}</div>`,
    back?'<button class="btn" data-a="foodBack">Back to the plate</button>':'<button class="btn" data-a="close">Close</button>',{full:true});
};
A.foodInfo=function(){const sh=U.sh;if(!sh||sh.type!=='plate'||sh.edit<0)return;const it=E.day().items[sh.edit];if(it)U.foodSheet(it.name,it.g)};
A.foodBack=function(){const b=U.sh&&U.sh.back;if(!b){U.closeSheet();return}U.plateSheet(b.meal);if(b.edit>=0){U.sh.edit=b.edit;U.plateRedraw&&U.plateRedraw()}};

/* ---------------- add a food from its label ---------------- */
U.customSheet=function(prefill){
  const back=U.sh&&U.sh.type==='plate'?{meal:U.sh.meal}:null;
  const p=prefill||{};
  U.sh={type:'custom',back:back,asBackup:!!p.asBackup};
  const fld=(id,lbl,ph,unit,val,step)=>`<label class="fr"><span>${lbl}</span><input id="cf_${id}" type="number" inputmode="decimal" step="${step||'any'}" min="0" placeholder="${ph||''}" value="${val!=null?esc(val):''}"><i class="fu">${unit}</i></label>`;
  U.openSheet('Add food from a label',
    `<div class="hint">Read the nutrition table on the pack. Use the amounts for ONE serving and tell the System how heavy that serving is.</div>
     <label class="fr"><span>Name</span><input id="cf_name" type="text" maxlength="40" placeholder="e.g. MuscleBlaze protein bar" value="${esc(p.name||'')}"></label>
     ${fld('g','Serving size','60','g',p.g!=null?p.g:'')}
     ${fld('kcal','Calories','230','kcal',p.kcal)}
     ${fld('p','Protein','20','g',p.p)}
     ${fld('c','Carbohydrate','22','g',p.c)}
     ${fld('f','Fat','8','g',p.f)}
     <div class="sec">Optional</div>
     ${fld('fi','Fibre','','g')}${fld('su','Sugar','','g')}${fld('na','Sodium','','mg')}
     <button class="chk" id="cf_treat" data-a="cftreat" aria-pressed="false"><i>✓</i><span>This is a sugary treat<small>Sugar costs a little aura, on purpose</small></span></button>
     <div class="small">Packs often list "per 100 g" and "per serving" side by side: use the per serving column, or type 100 as the size and the per 100 g numbers.</div>`,
    '<button class="btn" data-a="cfsave">Save and add</button>',{full:true});
};
A.cftreat=function(v,b){b.setAttribute('aria-pressed',b.getAttribute('aria-pressed')==='true'?'false':'true');F.play('tick',100)};
A.cfsave=function(){
  const v=id=>parseFloat(($('#cf_'+id)||{}).value),name=(($('#cf_name')||{}).value||'').trim();
  const g=v('g'),kcal=v('kcal'),p=v('p')||0,c=v('c')||0,f=v('f')||0;
  if(!name){U.sys('Give the food a name.','bad');return}
  if(!(g>0)){U.sys('Add the serving size in grams.','bad');return}
  if(!(kcal>=0)||isNaN(kcal)){U.sys('Add the calories for one serving.','bad');return}
  const chk=(p*4+c*4+f*9),warn=kcal>30&&Math.abs(chk-kcal)/kcal>.35;
  const sh=U.sh;
  if(warn&&sh.confirmed!==name){sh.confirmed=name;F.play('shake');U.sys('The macros add up to about '+Math.round(chk)+' kcal, not '+Math.round(kcal)+'. Check the numbers, or tap Save again if the pack really says so.','bad');return}
  const meal=sh.back&&sh.back.meal,asBackup=sh.asBackup;
  const food=E.saveCustom({name:name,g:g,kcal:kcal,p:p,c:c,f:f,fi:v('fi')||0,su:v('su')||0,na:v('na')||0,sugarPen:($('#cf_treat').getAttribute('aria-pressed')==='true')});
  F.play('add',{cat:'protein',combo:0});
  if(asBackup){E.cfg().backup=food.name;E.save();U.settingSheet('protein');U.sys(food.name+' is now your protein backup.','good');return}
  if(meal){U.plateSheet(meal);E.addFood(food.name,food.ug,meal);U.plateRedraw&&U.plateRedraw();U.sys(food.name+' saved and added.','good',true)}
  else{U.closeSheet();U.sys(food.name+' saved. Search for it any time.','good')}
};
})();
