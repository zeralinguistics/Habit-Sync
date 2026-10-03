/* ui-home.js: the three main screens. Home (character and quests), Hunter (goal, stats, recovery), Settings (everything customisable). */
(function(){
'use strict';
const HS=window.HS=window.HS||{};
const E=HS.E,F=HS.fx,U=HS.ui;
const esc=U.esc,fmt=U.fmt,cap=U.cap,hhmm=U.hhmm,IC=U.IC,$=U.$;
const RCOL={E:'#8aa5c2',D:'#3ddc97',C:'#3aa8ff',B:'#8b5cff',A:'#f5c451',S:'#ff4d5e'};
const RIDX={E:0,D:1,C:2,B:3,A:4,S:5};
const prev={};
function cnt(id,val,f,ms){const el=$('#'+id);if(!el)return;if(prev[id]!=null)el.dataset.v=prev[id];F.countTo(el,val,f,ms);prev[id]=val}

/* ---------------- the character ---------------- */
const BODY='M80 44 C62 44 50 54 46 72 L34 122 L52 126 L56 206 L74 206 L80 152 L86 206 L104 206 L108 126 L126 122 L114 72 C110 54 98 44 80 44 Z';
const HEAD='M80 6 C64 6 58 20 58 32 C58 44 68 52 80 52 C92 52 102 44 102 32 C102 20 96 6 80 6 Z';
function avatar(ri){
  let s='<svg class="avsvg" viewBox="0 0 160 220" aria-hidden="true"><defs><linearGradient id="bodyg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a2f55"/><stop offset="1" stop-color="#060b18"/></linearGradient></defs>';
  if(ri>=4)s+='<path class="wing" d="M52 70 C20 40 0 60 4 120 C14 100 30 96 48 104 Z"/><path class="wing" d="M108 70 C140 40 160 60 156 120 C146 100 130 96 112 104 Z"/>';
  if(ri>=2)s+='<path class="cape" d="M52 56 C30 110 22 170 30 214 L130 214 C138 170 130 110 108 56 Z"/>';
  s+='<path class="abody" d="'+BODY+'" fill="url(#bodyg)"/>';
  if(ri>=1)s+='<circle class="sh" cx="48" cy="74" r="7"/><circle class="sh" cx="112" cy="74" r="7"/><path class="dag" d="M30 124 L24 160 L36 130 Z"/><path class="dag" d="M130 124 L136 160 L124 130 Z"/>';
  s+='<path class="ahead" d="'+HEAD+'" fill="#0a1426"/>';
  if(ri>=3)s+='<path class="horn" d="M62 14 L56 -2 L68 8 Z"/><path class="horn" d="M98 14 L104 -2 L92 8 Z"/>';
  if(ri>=4)s+='<ellipse class="halo" cx="80" cy="-4" rx="22" ry="6"/>';
  s+='<g class="eyes"><rect x="67" y="29" width="10" height="3.4" rx="1.7"/><rect x="83" y="29" width="10" height="3.4" rx="1.7"/></g></svg>';
  return s;
}
const SPOS=[[-78,8,.62],[78,8,.62],[-118,20,.5],[118,20,.5],[-46,30,.44],[46,30,.44],[-152,6,.44],[152,6,.44],[-98,44,.38],[98,44,.38]];
function soldiers(n){
  let h='';
  for(let i=0;i<Math.min(n,SPOS.length);i++){const p=SPOS[i];
    h+='<svg class="sold" style="--x:'+p[0]+'px;--b:'+p[1]+'px;--s:'+p[2]+';--d:'+(i*.25)+'s" viewBox="0 0 160 220" aria-hidden="true"><path d="'+BODY+'"/><path d="'+HEAD+'"/><rect class="se" x="67" y="29" width="10" height="4" rx="2"/><rect class="se" x="83" y="29" width="10" height="4" rx="2"/></svg>';}
  return h;
}

/* ---------------- quests ---------------- */
function gymQ(d,plan){
  if(plan==='Rest')return{id:'gym',ic:'moon',st:'done',t:'Rest day',s:'Recovery counts',r:''};
  if(d.workout==='done')return{id:'gym',ic:'check',st:'done',t:plan+' day',s:'Done'+(d.burn?' · ~'+fmt(d.burn)+' kcal burned':''),r:'+100'};
  if(d.workout==='pain')return{id:'gym',ic:'check',st:'done',t:plan+' day',s:'Pain day, no penalty',r:''};
  if(d.workout==='pass')return{id:'gym',ic:'pass',st:'skip',t:plan+' day',s:'Rest pass used',r:''};
  if(d.workout==='lazy')return{id:'gym',ic:'x',st:'miss',t:plan+' day',s:'Skipped',r:'PENALTY'};
  return{id:'gym',ic:'gym',st:'todo',t:'Train: '+plan,s:E.fatigued()?'Comeback quest: breaks fatigue':'Gym',r:'+100'};
}
function rehabQ(d){
  const r=d.reh;
  if(r&&r.done)return{id:'rehab',ic:'check',st:'done',t:'Rehab',s:r.n+' exercises logged',r:'+'+Math.min(80,r.n*10)};
  return{id:'rehab',ic:'rehab',st:'todo',t:'Rehab',s:'Physio plan · '+HS.RDAYS[E.S().rehab.next].t.split(':')[0],r:'+10 each'};
}
U.quests=function(){
  const d=E.day(),plan=E.planFor(),t=E.nowMin(),T=E.T(),tot=E.totals(d),out=[];
  out.push(d.weighed?{id:'weigh',ic:'scale',st:'done',t:'Weigh-in',s:E.S().weights[E.dkey()].toFixed(1)+' kg',r:'+15'}:{id:'weigh',ic:'scale',st:'todo',t:'Weigh-in',s:'Before food',r:'+15'});
  U.MEALS.forEach(m=>{
    const k=E.mealKcal(d,m),n=d.items.filter(i=>i.meal===m).length,w=U.WIN[m];
    const q={id:m,ic:'plate',t:cap(m),r:''};
    if(d.done[m])Object.assign(q,{st:'done',s:fmt(k)+' kcal'});
    else if(d.skip[m])Object.assign(q,{st:'skip',s:'Skipped',ic:'dash'});
    else if(!n&&t>w[1]+120)Object.assign(q,{st:'late',s:'Window missed',ic:'dash'});
    else Object.assign(q,{st:'todo',s:n?fmt(k)+' kcal so far':hhmm(w[0])+' to '+hhmm(w[1])});
    if(m==='dinner')out.push(gymQ(d,plan),rehabQ(d));
    out.push(q);
  });
  out.push(d.pAward?{id:'protein',ic:'prot',st:'done',t:'Protein '+T.protein+' g',s:Math.round(tot.p)+' g locked in',r:'+60'}:{id:'protein',ic:'prot',st:'prog',t:'Protein '+T.protein+' g',s:Math.round(tot.p)+' of '+T.protein+' g',r:'+60'});
  out.push(d.closed?{id:'close',ic:'moon',st:'done',t:'Clear the day',s:d.score+' of 4 quests',r:(d.delta>=0?'+':'−')+Math.abs(d.delta)}:{id:'close',ic:'moon',st:'todo',t:'Clear the day',s:'Final tally',r:'+80'});
  return out;
};
U.justRow=null;U.pulse=false;
U.act.node=function(v){
  F.play('tap');
  if(v==='weigh')return U.weighSheet();
  if(U.MEALS.indexOf(v)>=0)return U.plateSheet(v);
  if(v==='protein')return U.plateSheet(U.mealNow());
  if(v==='gym')return U.gymSheet();
  if(v==='rehab')return U.rehabSheet();
  return U.closeDaySheet();
};
U.act.snack=function(){F.play('tap');U.plateSheet('snack')};

U.views.home=function(){
  const S=E.S(),cfg=E.cfg(),d=E.day(),T=E.T(),tot=E.totals(d),L=E.lv(),fat=E.fatigued(),ri=RIDX[L.rank];
  const kp=Math.min(100,tot.k/T.kcal*100),pp=Math.min(100,tot.p/T.protein*100),left=T.kcal-tot.k;
  const qs=U.quests(),next=qs.find(q=>q.st==='todo');
  const lad=E.ladder(),boss=lad.find(g=>g.boss&&!S.gates.includes(g.kg)),tr=E.trend();
  const fatTxt=fat?'<div class="fatb"><b>FATIGUED</b><span>Aura ×½ · level locked'+(L.locked?' at LV '+L.L:'')+'. Train to break it.</span></div>':'';
  let h=`<section class="scene${fat?' fat':''}" style="--rc:${RCOL[L.rank]}">
    <div class="aglow"></div>
    <div class="ground"><svg viewBox="0 0 300 300" aria-hidden="true"><circle cx="150" cy="150" r="140" class="r1"/><circle cx="150" cy="150" r="108" class="r2"/><circle cx="150" cy="150" r="76" class="r3"/></svg></div>
    <div class="army">${soldiers(S.gates.length)}</div>
    <div class="hero-av">${avatar(ri)}</div>
    <div class="s-top"><div class="rbadge" style="color:${RCOL[L.rank]}"><svg viewBox="0 0 58 64" aria-hidden="true"><polygon points="29,2 55,17 55,47 29,62 3,47 3,17" fill="rgba(6,12,26,.85)" stroke="currentColor" stroke-width="2.5"/></svg><b>${L.rank}</b></div>
      <div class="who"><b>${esc(cfg.name||'PLAYER')}</b><span>LEVEL ${L.L}${L.locked?' · LOCKED':''}</span></div>
      <div class="aur"><b id="auraNum">${fmt(S.aura)}</b><span>AURA</span></div></div>
    ${fatTxt}
    <div class="s-bot"><div class="xp"><i id="xpFill" style="width:${prev.xp!=null?prev.xp:0}%"></i></div><div class="xpt">${L.locked?'LEVEL UP READY. LOCKED BY FATIGUE':'AURA '+fmt(L.have)+' / '+fmt(L.need)+' TO LEVEL '+(L.L+1)}</div></div>
  </section>
  <button class="goalchip rise" style="--i:0" data-a="tab:hunter"><span>${boss?'BOSS GATE '+boss.kg+' KG':'FINAL FORM'}</span><b>${boss?Math.max(0,tr-boss.kg).toFixed(1)+' kg to go':'Cleared'}</b><i>›</i></button>
  <div class="win ringrow rise" style="--i:1">
    <div class="rings${U.pulse?' pulse':''}" role="img" aria-label="${fmt(tot.k)} of ${fmt(T.kcal)} kilocalories, ${Math.round(tot.p)} of ${T.protein} grams protein"><svg viewBox="0 0 100 100" aria-hidden="true">
      <circle class="trk" cx="50" cy="50" r="43"/><circle id="ringK" class="arc k${tot.k>T.hi?' over':''}" cx="50" cy="50" r="43" pathLength="100" style="stroke-dashoffset:${prev.rk!=null?prev.rk:100}"/>
      <circle class="trk" cx="50" cy="50" r="31"/><circle id="ringP" class="arc p${tot.p>=T.protein?' full':''}" cx="50" cy="50" r="31" pathLength="100" style="stroke-dashoffset:${prev.rp!=null?prev.rp:100}"/></svg>
      <div class="rc"><b id="leftNum">${fmt(Math.abs(left))}</b><span>${left>=0?'KCAL LEFT':'KCAL OVER'}</span></div></div>
    <div class="rl"><div><b class="k">${fmt(tot.k)}</b> / ${fmt(T.kcal)} kcal</div><div><b class="p">${Math.round(tot.p)}</b> / ${T.protein} g protein</div>
      <small>${d.burn?'Burned about '+fmt(d.burn)+' kcal. Info only: your target already counts training.':'Finish a workout to see your burn estimate.'}</small></div></div>
  <div class="win rise" style="--i:2"><div class="wt">[ Daily quest ]</div>`;
  qs.forEach((q,i)=>{
    const isNext=next&&next.id===q.id;
    h+=`<button class="qrow ${isNext?'next':q.st}${U.justRow===q.id?' just':''}" style="--i:${i}" data-a="node:${q.id}" aria-label="${esc(q.t+', '+q.s)}">
      <span class="qic">${q.st==='done'&&q.ic!=='moon'?IC.check:IC[q.ic]}</span>
      <span class="qm"><span class="qt">${esc(q.t)}</span><span class="qs">${esc(q.s)}</span></span><span class="qr">${esc(q.r)}</span></button>`;
  });
  h+=`</div><button class="link" data-a="snack">Ate something else? Log a snack</button>`;
  $('#screen').innerHTML=h;
  requestAnimationFrame(()=>{
    const rk=100-kp,rp=100-pp;
    $('#ringK').style.strokeDashoffset=rk;$('#ringP').style.strokeDashoffset=rp;prev.rk=rk;prev.rp=rp;
    $('#xpFill').style.width=(L.pct*100)+'%';prev.xp=L.pct*100;
  });
  cnt('auraNum',S.aura);
  U.justRow=null;U.pulse=false;
};

/* ---------------- hunter: the long game ---------------- */
function ghost(pct){
  return `<svg class="ghost" viewBox="0 0 160 220" aria-hidden="true"><defs><clipPath id="gclip"><rect id="gclipR" x="0" y="220" width="160" height="0" style="y:${prev.gy!=null?prev.gy:220}px;height:${prev.gh!=null?prev.gh:0}px"/></clipPath></defs>
    <g class="gline"><path d="${BODY}"/><path d="${HEAD}"/></g>
    <g class="gfill" clip-path="url(#gclip)"><path d="${BODY}"/><path d="${HEAD}"/></g></svg>`;
}
function radar(st){
  const keys=['STR','VIT','AGI','SNS'],mx=Math.max.apply(null,keys.map(k=>st[k])),cap2=Math.max(10,Math.ceil(mx/10)*10),cx=110,cy=110,R=70;
  const ang=[-90,0,90,180];
  const pt=(i,f)=>[cx+Math.cos(ang[i]*Math.PI/180)*R*f,cy+Math.sin(ang[i]*Math.PI/180)*R*f];
  const ring=f=>keys.map((k,i)=>pt(i,f).map(n=>n.toFixed(1)).join(',')).join(' ');
  const poly=keys.map((k,i)=>pt(i,Math.max(.04,st[k]/cap2)).map(n=>n.toFixed(1)).join(',')).join(' ');
  let s='<svg class="radar" viewBox="-40 0 300 220" role="img" aria-label="Stat radar">';
  [.25,.5,.75,1].forEach(f=>{s+='<polygon class="rg" points="'+ring(f)+'"/>'});
  keys.forEach((k,i)=>{const p=pt(i,1);s+='<line class="rg" x1="'+cx+'" y1="'+cy+'" x2="'+p[0]+'" y2="'+p[1]+'"/>'});
  s+='<polygon class="rpoly" points="'+poly+'"/>';
  keys.forEach((k,i)=>{const p=pt(i,1.2);const a=i===3?'end':i===1?'start':'middle';s+='<text class="rtx" x="'+p[0].toFixed(1)+'" y="'+(p[1]+(i===0?-2:i===2?10:4)).toFixed(1)+'" text-anchor="'+a+'">'+k+' <tspan class="rv">'+st[k]+'</tspan></text>'});
  return s+'</svg>';
}
U.views.hunter=function(){
  const S=E.S(),cfg=E.cfg(),L=E.lv(),tr=E.trend(),pr=E.progress(),d=E.day(),lad=E.ladder();
  const nextG=lad.find(g=>!S.gates.includes(g.kg));
  const pd=E.painDays(7),greens=pd.filter(x=>E.light(x.r)==='green').length;
  const eta=pr.eta.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
  const camp=Math.min(66,pr.day);
  const fat=E.fatigued();
  const msg=E.contractMessage('missed a session');
  let h=`<div class="win rise" style="--i:0"><div class="wt">[ Final form ]</div><div class="goal">
    ${ghost(pr.pct)}
    <div class="gtxt"><div class="gname">MONARCH</div><div class="gbig"><b id="syncNum">0</b><span>% SYNC</span></div>
      <div class="gline2">${S.startW.toFixed(1)} → <b>${tr.toFixed(1)}</b> → ${cfg.goalW.toFixed(1)} kg</div>
      <div class="gsmall">At 0.5 kg a week: about ${Math.ceil(pr.weeks)} weeks, around ${eta}. Only if you stay on pace.</div></div></div>
    <div class="camp"><div class="campl"><span>66-DAY CAMPAIGN</span><b>DAY ${camp} / 66</b></div><div class="xp"><i style="width:${camp/66*100}%"></i></div></div></div>
  <div class="win rise" style="--i:1"><div class="wt">[ The road: ${S.gates.length} of ${lad.length} gates ]</div><div class="road" id="road"><div class="rin2">
    <div class="rnode start"><i></i><span>START<br>${S.startW}</span></div>
    ${lad.map(g=>{const got=S.gates.includes(g.kg),nx=nextG&&nextG.kg===g.kg;return `<div class="rnode${got?' got':''}${nx?' nx':''}${g.boss?' boss':''}" ${nx?'id="rnext"':''}>${nx?'<em>YOU</em>':''}<i>${got?'✓':g.boss?'★':''}</i><span>${g.kg}</span></div>`}).join('')}
  </div></div><div class="wb" style="padding-top:6px"><div class="small">${S.gates.length} shadow${S.gates.length===1?'':'s'} in your army. Each gate is ${cfg.gateStep} kg of trend. Stars are boss gates.</div></div></div>
  <div class="win rise" style="--i:2"><div class="wt">[ Stats ]</div><div class="wb">${radar(S.stats)}
    <div class="small" style="text-align:center">STR gym · VIT food · AGI steps and cardio · SNS rehab and honesty</div></div></div>
  <div class="win rise" style="--i:3"><div class="wt">[ Recovery ]</div><div class="wb">
    <div class="pbarch" role="img" aria-label="Seven day pain chart">${pd.map(x=>`<div title="${x.k}"><i class="kn" style="height:${x.r?Math.max(3,x.r.knee*10):3}%;opacity:${x.r?1:.25}"></i><i class="bk" style="height:${x.r?Math.max(3,x.r.back*10):3}%;opacity:${x.r?1:.25}"></i></div>`).join('')}</div>
    <div class="legend"><span><b style="background:var(--glow)"></b>Right knee</span><span><b style="background:var(--violet)"></b>Lower back</span><span>${greens} green day${greens===1?'':'s'}</span></div>
    <div class="stack2"><button class="btn" data-a="roadmap">Recovery roadmap</button><button class="btn vio" data-a="physio">Prepare physio sheet</button></div></div></div>
  <div class="win rise" style="--i:4"><div class="wt">[ Discipline ]</div><div class="wb">
    <div class="dis"><div><span>STATUS</span><b class="${fat?'bad':'ok'}">${fat?'FATIGUED':'READY'}</b></div><div><span>REST PASS</span><b>${E.passLeft()?'1 LEFT':'USED'}</b></div><div><span>RULES</span><b>${cap(cfg.strict).toUpperCase()}</b></div></div>
    <div class="small">${cfg.contract?'Contract: '+esc(cfg.contract):'No habit contract yet. Add a real-world cost in Settings. A penalty you feel works better than one you ignore.'}</div>
    <a class="btn ghost lnk" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(msg)}">Tell my accountability partner</a></div></div>
  <div class="win rise" style="--i:5"><div class="wt">[ Week ]</div><div class="wb"><div class="week">${weekDots()}</div></div></div>
  <div class="win rise" style="--i:6"><div class="wt">[ Steps today ]</div><div class="wb">
    <div class="field"><input id="stepsIn" type="number" inputmode="numeric" min="0" placeholder="e.g. 7400" value="${esc(d.steps||'')}" aria-label="Steps today"><button data-a="saveSteps">Save</button></div>
    <div class="small">Log it for two weeks. Your goal comes from your real median. Samsung Health sync needs the Android app version.</div></div></div>`;
  $('#screen').innerHTML=h;
  requestAnimationFrame(()=>{
    const r=$('#gclipR');if(r){const gh=220*pr.pct;r.style.y=(220-gh)+'px';r.style.height=gh+'px';prev.gy=220-gh;prev.gh=gh}
    const road=$('#road'),nx=$('#rnext');if(road&&nx)road.scrollLeft=Math.max(0,nx.offsetLeft-road.clientWidth/2+30);
  });
  cnt('syncNum',Math.round(pr.pct*100),null,900);
};
function weekDots(){
  const now=new Date(),mon=new Date(now);mon.setDate(now.getDate()-E.di());let out='';
  for(let i=0;i<7;i++){const x=new Date(mon);x.setDate(mon.getDate()+i);const k=E.dkey(x),dd=E.S().days[k];
    let c='';if(dd&&dd.closed)c=dd.score>=3?'on':'half';if(k===E.dkey())c+=' today';
    out+=`<div><i class="${c}"></i>${U.DAYS[i]}</div>`}
  return out;
}
U.act.saveSteps=function(){
  const d=E.day(),v=$('#stepsIn').value;d.steps=v;
  if(v&&!d.stepsAward){d.stepsAward=true;E.stat('AGI',1)}
  E.save();U.sys(v?'Steps saved: '+fmt(+v)+'.':'Cleared.','good');
};

/* ---------------- settings: customise everything ---------------- */
let rTab='Push';
const NUMF=[
  ['Profile and goals',[
    ['name','Name','text'],['startW','Starting weight (kg)','num',{step:.1,root:true}],['goalW','Goal weight (kg)','num',{step:.5}],['bossEvery','Boss gate every (kg)','num',{step:1}]]],
  ['Nutrition',[['kcal','Daily calories','num',{step:50}],['protein','Daily protein (g)','num',{step:5}],['stepGoal','Step goal (0 = none yet)','num',{step:500}]]]
];
function fieldRow(f){
  const c=E.cfg(),S=E.S(),val=f[3]&&f[3].root?S[f[0]]:c[f[0]];
  return `<label class="fr"><span>${f[1]}</span><input ${f[2]==='num'?'type="number" inputmode="decimal" step="'+((f[3]&&f[3].step)||1)+'"':'type="text" maxlength="14"'} data-cfg="${f[0]}" ${f[3]&&f[3].root?'data-root="1"':''} value="${esc(val)}"></label>`;
}
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
U.views.settings=function(){
  const c=E.cfg();
  let h='';let i=0;
  NUMF.forEach(sec=>{h+=`<div class="win rise" style="--i:${i++}"><div class="wt">[ ${sec[0]} ]</div><div class="wb">${sec[1].map(fieldRow).join('')}
    ${sec[0]==='Profile and goals'?`<div class="fr"><span>Gate size</span><div class="seg2">${[.5,1].map(g=>`<button data-a="gate:${g}" aria-pressed="${c.gateStep===g}">${g} kg</button>`).join('')}</div></div>`:''}
    ${sec[0]==='Nutrition'?'<div class="small">These are starting estimates. After two to three weeks, your weight trend should decide whether to move them.</div>':''}</div></div>`});
  h+=`<div class="win rise" style="--i:${i++}"><div class="wt">[ Rules and penalties ]</div><div class="wb">
    <div class="seg2 full">${[['chill','Chill'],['standard','Standard'],['hard','Hard']].map(s=>`<button data-a="strict:${s[0]}" aria-pressed="${c.strict===s[0]}">${s[1]}</button>`).join('')}</div>
    <div class="small" id="strictTxt">${strictTxt(c.strict)}</div>
    <div class="small">Pain days never count as a skip. You also get one rest pass a week.</div>
    <label class="fr col"><span>Habit contract: a real cost when you skip (you enforce it)</span><textarea data-cfg="contract" rows="2" placeholder="e.g. No Instagram or YouTube until I train. Rs 100 into the cheat jar.">${esc(c.contract)}</textarea></label></div></div>
   <div class="win rise" style="--i:${i++}"><div class="wt">[ Look and feel ]</div><div class="wb">
    <div class="themes">${Object.keys(F.THEMES).map(k=>`<button class="th" data-a="theme:${k}" aria-pressed="${c.theme===k}" style="--c:${F.THEMES[k].glow};--c2:${F.THEMES[k].acc}"><i></i>${F.THEMES[k].name}</button>`).join('')}</div>
    <label class="fr"><span>Sound</span><div class="seg2">${[[1,'On'],[0,'Off']].map(s=>`<button data-a="snd:${s[0]}" aria-pressed="${!!c.sound===!!s[0]}">${s[1]}</button>`).join('')}</div></label>
    <label class="fr col"><span>Volume</span><input type="range" min="0" max="1" step="0.05" value="${c.volume}" data-vol="1" aria-label="Volume"></label>
    <label class="fr"><span>Vibration</span><div class="seg2">${[[1,'On'],[0,'Off']].map(s=>`<button data-a="hap:${s[0]}" aria-pressed="${!!c.haptics===!!s[0]}">${s[1]}</button>`).join('')}</div></label></div></div>
   <div class="win rise" style="--i:${i++}"><div class="wt">[ Training routine ]</div><div class="wb" id="rxWrap">${routineEditor()}</div></div>
   <div class="win rise" style="--i:${i++}"><div class="wt">[ Your data ]</div><div class="wb">
    <div class="small" style="margin-top:0">Everything is stored on this device only. Nothing is sent anywhere.</div>
    <div class="stack2"><button class="btn ghost" data-a="export">Show data to copy</button><button class="btn bad" data-a="reset" id="resetBtn">Reset everything</button></div><div id="exWrap"></div></div></div>
   <div class="foot">Prototype. Calories and protein are rough estimates. Data stays on this device.</div>`;
  $('#screen').innerHTML=h;
};
function strictTxt(s){return s==='chill'?'Skipping a session costs 30 aura. No fatigue.':s==='hard'?'Skipping costs 100 aura, a strength point and fatigue. A second miss in a row hits twice.':'Skipping costs 60 aura and fatigue: aura gains are halved and your level is locked until you train. Absence is punished too.'}
const A=U.act;
A.gate=v=>{E.cfg().gateStep=parseFloat(v);E.save();U.render()};
A.strict=v=>{E.cfg().strict=v;E.save();U.render()};
A.theme=v=>{E.cfg().theme=v;E.save();F.applyTheme();F.play('pick');U.render()};
A.snd=v=>{E.cfg().sound=v==='1';E.save();if(E.cfg().sound){F.unlock();F.play('pick')}U.render()};
A.hap=v=>{E.cfg().haptics=v==='1';E.save();F.vib(30);U.render()};
A.rtab=v=>{rTab=v;$('#rxWrap').innerHTML=routineEditor()};
A.rxs=v=>{const p=v.split(':'),x=E.routine(rTab)[+p[0]];x.sets=Math.max(1,Math.min(8,x.sets+ +p[1]));E.save();$('#rxWrap').innerHTML=routineEditor()};
A.rxr=v=>{const p=v.split(':'),x=E.routine(rTab)[+p[0]];x.reps=Math.max(1,Math.min(30,x.reps+ +p[1]));E.save();$('#rxWrap').innerHTML=routineEditor()};
A.rxcap=v=>{const x=E.routine(rTab)[+v];x.cap=!x.cap;E.save();$('#rxWrap').innerHTML=routineEditor()};
A.rxdel=v=>{E.routine(rTab).splice(+v,1);E.save();$('#rxWrap').innerHTML=routineEditor()};
A.rxadd=()=>{const n=$('#rxNew').value.trim();if(!n){U.sys('Type an exercise name first.','bad');return}
  E.routine(rTab).push({n:n,g:$('#rxNewG').value.trim()||'Other',sets:3,reps:10});E.save();F.play('pick');$('#rxWrap').innerHTML=routineEditor()};
A.export=()=>{$('#exWrap').innerHTML='<textarea class="ta" readonly aria-label="Exported data">'+esc(E.exportJSON())+'</textarea>'};
A.reset=function(v,b){
  if(b.dataset.armed){E.reset();U.tab='home';F.applyTheme();U.render(true);U.sys('Everything cleared.','')}
  else{b.dataset.armed='1';b.textContent='Tap again to erase everything';setTimeout(()=>{if(b.isConnected){delete b.dataset.armed;b.textContent='Reset everything'}},3000)}
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
  }
});
document.addEventListener('change',e=>{if(e.target.dataset&&e.target.dataset.vol){F.play('pick')}});
})();
