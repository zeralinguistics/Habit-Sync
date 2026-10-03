/* ui-path.js: the Path. Final form, pace against plan, the whole campaign to 70 kg, streaks, weekly report, recovery, steps. */
(function(){
'use strict';
const HS=window.HS=window.HS||{};
const E=HS.E,F=HS.fx,U=HS.ui;
const esc=U.esc,fmt=U.fmt,cap=U.cap,IC=U.IC,$=U.$,A=U.act;
const prev={};
function cnt(id,val,f,ms){const el=$('#'+id);if(!el)return;if(prev[id]!=null)el.dataset.v=prev[id];F.countTo(el,val,f,ms);prev[id]=val}

/* ---------------- final form ---------------- */
const BODY=HS.avatar.BODY,HEAD=HS.avatar.HEAD;
function ghost(){
  return `<svg class="gsil" viewBox="0 0 160 220" aria-hidden="true"><defs><clipPath id="gclip"><rect id="gclipR" x="0" y="220" width="160" height="0" style="y:${prev.gy!=null?prev.gy:220}px;height:${prev.gh!=null?prev.gh:0}px"/></clipPath></defs>
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

/* ---------------- plan versus you: the line you are supposed to follow and the line you are actually on ---------------- */
function planChart(){
  const S=E.S(),p=E.plan(),today=Math.max(0,E.daysBetween(S.start,E.dkey()));
  const span=Math.max(56,Math.ceil((today+42)/7)*7);
  const W=320,H=170,pl=36,pr=8,pt=10,pb=24,pw=W-pl-pr,ph=H-pt-pb;
  const nodes=[{d:0,kg:S.startW}];p.gates.forEach(g=>{nodes.push({d:g.week*7,kg:g.kg});if(g.camp)nodes.push({d:g.camp*7,kg:g.kg})});
  const wAt=d=>{for(let i=1;i<nodes.length;i++){if(d<=nodes[i].d){const a=nodes[i-1],b=nodes[i],f=b.d===a.d?1:(d-a.d)/(b.d-a.d);return a.kg+(b.kg-a.kg)*f}}return S.cfg.goalW};
  const wk=Object.keys(S.weights).sort();
  const yMax=Math.ceil(Math.max(S.startW,wk.length?Math.max.apply(null,wk.map(k=>S.weights[k])):0)+.3),yMin=Math.floor(Math.min(wAt(span),E.trend(),wk.length?Math.min.apply(null,wk.map(k=>S.weights[k])):99)-.3);
  const X=d=>pl+d/span*pw,Y=kg=>pt+(yMax-kg)/(yMax-yMin)*ph;
  let g='';
  for(let kg=yMax;kg>=yMin;kg--)g+='<line class="cg" x1="'+pl+'" y1="'+Y(kg).toFixed(1)+'" x2="'+(W-pr)+'" y2="'+Y(kg).toFixed(1)+'"/><text class="cx" x="'+(pl-6)+'" y="'+(Y(kg)+3).toFixed(1)+'" text-anchor="end">'+kg+'</text>';
  for(let w=0;w*7<=span;w+=Math.max(1,Math.round(span/7/5)))g+='<text class="cx" x="'+X(w*7).toFixed(1)+'" y="'+(H-6)+'" text-anchor="middle">W'+w+'</text>';
  let plan='';for(let d=0;d<=span;d+=2)plan+=(d?'L':'M')+X(d).toFixed(1)+' '+Y(wAt(d)).toFixed(1);
  let tp='',dots='';
  const tmap={};{let t=S.startW;wk.forEach(k=>{t=t+.25*(S.weights[k]-t);tmap[k]=Math.round(t*100)/100})}   /* the running trend, computed once instead of once per point */
  wk.forEach((k,i)=>{const d=E.daysBetween(S.start,k);if(d<0||d>span)return;tp+=(tp?'L':'M')+X(d).toFixed(1)+' '+Y(tmap[k]).toFixed(1);dots+='<circle class="cd" cx="'+X(d).toFixed(1)+'" cy="'+Y(S.weights[k]).toFixed(1)+'" r="2.4"/>'});
  const tx=X(today).toFixed(1);
  return `<svg class="pchart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Weight against the plan">${g}
    <path class="cplan" d="${plan}"/>${tp?'<path class="ctrend" d="'+tp+'" pathLength="100"/>':''}${dots}
    <line class="ctoday" x1="${tx}" y1="${pt}" x2="${tx}" y2="${pt+ph}"/><text class="cx" x="${tx}" y="${pt+8}" text-anchor="${today>span*.75?'end':'start'}" dx="${today>span*.75?-4:4}">today</text></svg>
    <div class="legend"><span><b style="background:var(--gold)"></b>The plan</span><span><b style="background:var(--glow)"></b>Your trend</span><span><b style="background:#fff;border-radius:50%"></b>Weigh-ins</span></div>`;
}

/* ---------------- the Path screen ---------------- */
function paceCopy(ex){
  if(!Object.keys(E.S().weights).length)return{c:'info',t:'Weigh in to see your pace'};
  if(ex.ahead>=.2)return{c:'good',t:'AHEAD OF PLAN · '+ex.ahead.toFixed(1)+' kg'};
  if(ex.ahead<=-.2)return{c:'warn',t:'BEHIND PLAN · '+Math.abs(ex.ahead).toFixed(1)+' kg. Normal. Adjust, don’t panic.'};
  return{c:'good',t:'ON PLAN'};
}
U.views.path=function(){
  const S=E.S(),cfg=E.cfg(),tr=E.trend(),pr=E.progress(),pl=E.plan(),ex=E.expected(),eta=E.eta(),ng=E.nextGates();
  const lad=E.ladder(),pace=paceCopy(ex),wkNo=Math.min(pl.weeks,E.weekNo());
  const pd=E.painDays(7),greens=pd.filter(x=>E.light(x.r)==='green').length;
  const fat=E.fatigued(),msg=E.contractMessage('missed a session'),rep=E.report();
  const streaks=Object.keys(HS.STREAK_NAMES).map(k=>({k:k,n:E.streak(k)}));
  const d=E.day(),hs=S.health;
  let h=`<div class="win rise" style="--i:0"><div class="wt">[ Final form ]</div><div class="goal">
    ${ghost()}
    <div class="gtxt"><div class="gname">SHADOW MONARCH</div><div class="gbig"><b id="syncNum">0</b><span>% SYNC</span></div>
      <div class="gline2">${S.startW.toFixed(1)} → <b>${tr.toFixed(1)}</b> → ${cfg.goalW.toFixed(1)} kg</div>
      <div class="pace ${pace.c}">${esc(pace.t)}</div></div></div>
    <div class="camp"><div class="campl"><span>CAMPAIGN</span><b>${pl.weeks?'WEEK '+wkNo+' / '+pl.weeks:'NO GATES LEFT'}</b></div><div class="xp"><i style="width:${pl.weeks?wkNo/pl.weeks*100:100}%"></i></div>
      <div class="gsmall">At plan pace you finish around <b>${U.dateY(pl.finish)}</b>${eta.real?'. At your recent pace: '+U.dateY(eta.date)+'.':'.'} Plans bend. The habit is what counts.</div></div></div>
  <div class="win rise" style="--i:1"><div class="wt">[ Next up ]</div><div class="wb"><div class="duo">
    <div class="tile2"><span>NEXT GATE</span><b>${ng.next?ng.next.kg+' kg':'Done'}</b><small>${ng.next?ng.toNext.toFixed(1)+' kg to go':'Every gate cleared'}</small></div>
    <div class="tile2 gold"><span>BOSS GATE</span><b>${ng.boss?ng.boss.kg+' kg':'Done'}</b><small>${ng.boss?ng.toBoss.toFixed(1)+' kg to go':'You did it'}</small></div></div>
    <div class="stack2"><button class="btn" data-a="campaign">See the whole campaign</button></div></div></div>
  <div class="win rise" style="--i:2"><div class="wt">[ The plan and you ]</div><div class="wb">${planChart()}</div></div>
  <div class="win rise" style="--i:3"><div class="wt">[ The road: ${S.gates.length} of ${lad.length} gates ]</div><div class="road" id="road"><div class="rin2">
    <div class="rnode start"><i></i><span>START<br>${S.startW}</span></div>
    ${lad.map(g=>{const got=S.gates.includes(g.kg),nx=ng.next&&ng.next.kg===g.kg;return `<div class="rnode${got?' got':''}${nx?' nx':''}${g.boss?' boss':''}" ${nx?'id="rnext"':''}>${nx?'<em>YOU</em>':''}<i>${got?'✓':g.boss?'★':''}</i><span>${g.kg}</span></div>`}).join('')}
  </div></div><div class="wb" style="padding-top:6px"><div class="small">${S.gates.length} shadow${S.gates.length===1?'':'s'} in your army. Each gate is ${cfg.gateStep} kg of trend. Stars are boss gates: each one opens a new realm and a camp week.</div></div></div>
  <button class="win report rise ${E.reviewDue()?'due':''}" style="--i:4" data-a="report"><div class="wt">[ Weekly report ]${E.reviewDue()?' <em class="nw">NEW</em>':''}</div><div class="wb rp">
    <div class="rpg"><div><b>${rep.workouts}</b><span>WORKOUTS</span></div><div><b>${rep.rehab}</b><span>REHAB</span></div><div><b>${rep.protein}</b><span>PROTEIN</span></div><div><b>${rep.water}</b><span>WATER</span></div></div>
    <div class="adv ${rep.advice.tone}"><b>${esc(rep.advice.title)}</b><span>${esc(rep.advice.text)}</span></div></div></button>
  <div class="win rise" style="--i:5"><div class="wt">[ Streaks ]</div><div class="wb"><div class="sgrid">${streaks.map(s=>`<button class="sg" data-a="streaks"><span>${U.flame(s.n)}</span><b>${s.n}</b><small>${esc(HS.STREAK_NAMES[s.k].replace(' streak',''))}</small></button>`).join('')}</div>
    <div class="stack2"><button class="btn ghost" data-a="streaks">Goals and streak rewards</button></div></div></div>
  <div class="win rise" style="--i:6"><div class="wt">[ Stats ]</div><div class="wb">${radar(S.stats)}
    <div class="small" style="text-align:center">STR gym · VIT food and water · AGI steps and cardio · SNS rehab, sleep and honesty</div></div></div>
  <div class="win rise" style="--i:7"><div class="wt">[ Recovery ]</div><div class="wb">
    <div class="pbarch" role="img" aria-label="Seven day pain chart">${pd.map(x=>`<div title="${x.k}"><i class="kn" style="height:${x.r?Math.max(3,x.r.knee*10):3}%;opacity:${x.r?1:.25}"></i><i class="bk" style="height:${x.r?Math.max(3,x.r.back*10):3}%;opacity:${x.r?1:.25}"></i></div>`).join('')}</div>
    <div class="legend"><span><b style="background:var(--glow)"></b>Right knee</span><span><b style="background:var(--violet)"></b>Lower back</span><span>${greens} green day${greens===1?'':'s'}</span><span>Rehab streak ${E.streak('rehab')}</span></div>
    <div class="stack2"><button class="btn" data-a="rehabopen">Today’s rehab</button><button class="btn ghost" data-a="roadmap">Recovery roadmap</button><button class="btn vio" data-a="physio">Prepare physio sheet</button></div></div></div>
  <div class="win rise" style="--i:8"><div class="wt">[ Discipline ]</div><div class="wb">
    <div class="dis"><div><span>STATUS</span><b class="${fat?'bad':'ok'}">${fat?'FATIGUED':'READY'}</b></div><div><span>REST PASS</span><b>${E.passLeft()?'1 LEFT':'USED'}</b></div><div><span>RULES</span><b>${cap(cfg.strict).toUpperCase()}</b></div></div>
    <div class="small">${cfg.contract?'Contract: '+esc(cfg.contract):'No habit contract yet. Add a real-world cost in the Forge. A penalty you feel works better than one you ignore.'}</div>
    <a class="btn ghost lnk" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(msg)}">Tell my accountability partner</a></div></div>
  <div class="win rise" style="--i:9"><div class="wt">[ Steps and Samsung Health ]</div><div class="wb">
    <div class="field"><input id="stepsIn" type="number" inputmode="numeric" min="0" placeholder="e.g. 7400" value="${esc(d.steps||'')}" aria-label="Steps today"><button data-a="saveSteps">Save</button></div>
    ${healthBlock(hs,d)}</div></div>`;
  $('#screen').innerHTML=h;
  requestAnimationFrame(()=>{
    const r=$('#gclipR');if(r){const gh=220*pr.pct;r.style.y=(220-gh)+'px';r.style.height=gh+'px';prev.gy=220-gh;prev.gh=gh}
    const road=$('#road'),nx=$('#rnext');if(road&&nx)road.scrollLeft=Math.max(0,nx.offsetLeft-road.clientWidth/2+30);
  });
  cnt('syncNum',Math.round(pr.pct*100),null,900);
};
function healthBlock(hs,d){
  const H=HS.health;
  if(H&&H.native()){
    if(hs.on)return `<div class="hrow"><div><b>Samsung Health is connected</b><small>${hs.last?'Last sync '+new Date(hs.last).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})+(d.hSteps?' · '+fmt(d.hSteps)+' steps':'')+(d.hAct?' · '+fmt(d.hAct)+' active kcal':''):'Not synced yet'}</small></div><button class="btn ghost sm" data-a="hsync">Sync now</button></div>`;
    return `<div class="small">Read steps, active calories, sleep and weight from Samsung Health through Health Connect. Read-only: nothing is written back and nothing leaves your phone.</div><div class="stack2"><button class="btn good" data-a="hconnect">Connect Samsung Health</button></div>`;
  }
  return `<div class="small">Samsung Health sync works in the Android app (it reads through Health Connect). In the browser version, type your steps. Log them for two weeks and your step goal comes from your real median.</div>`;
}
A.saveSteps=function(){
  const d=E.day(),v=$('#stepsIn').value;d.steps=v;
  if(+v>0&&!d.stepsAward){d.stepsAward=true;E.stat('AGI',1)}
  E.save();U.sys(v?'Steps saved: '+fmt(+v)+'.':'Cleared.','good');
};
A.hconnect=async function(){
  if(!HS.health)return;
  U.sys('Asking Android for permission...','',true);
  const r=await HS.health.connect();
  U.sys(r.ok?'Connected. Pulling today’s data...':r.msg,r.ok?'good':'bad');
  if(r.ok)await A.hsync();
  U.render();
};
A.hsync=async function(){
  if(!HS.health)return;
  const r=await HS.health.sync();
  U.sys(r.ok?'Synced: '+(r.steps!=null?fmt(r.steps)+' steps':'')+(r.act!=null?', '+fmt(r.act)+' active kcal':'')+(r.sleep!=null?', slept '+r.sleep+' h':'')+'.':r.msg,r.ok?'good':'bad');
  U.render();
};
A.rehabopen=function(){U.rehabSheet()};

/* ---------------- the whole campaign ---------------- */
U.campaignSheet=function(){
  U.sh={type:'campaign',open:{}};renderCampaign();
};
function renderCampaign(){
  const S=E.S(),pl=E.plan(),bosses=E.bossKgs(),ex=E.expected(),sh=U.sh;
  const curIdx=bosses.findIndex(kg=>S.gates.indexOf(kg)<0);
  const camps=pl.camps;
  const realmCard=(r,i)=>{
    const bossKg=bosses[i],cleared=bossKg!=null&&S.gates.indexOf(bossKg)>=0,cur=i===curIdx||(curIdx<0&&false);
    const rewards=HS.ITEMS.filter(it=>it.req.t==='boss'&&it.req.v===i+1).map(it=>it.name);
    const th=F.THEMES[(HS.REALMS[i]||{}).theme]||F.THEMES.shadow;
    const gates=pl.gates.filter(g=>g.kg<=r.from-.01&&g.kg>=r.to-.01);
    const open=!!sh.open[i];
    return `<div class="rc2${cleared?' cleared':cur?' cur':''}" style="--c:${th.glow}">
      <div class="rch"><b>REALM ${i+1}</b><span>${cleared?'CLEARED':cur?'YOU ARE HERE':'AHEAD'}</span></div>
      <div class="rcn">${esc(r.name||'Realm '+(i+1))}</div>
      <div class="rcw">${r.from} → ${r.to} kg · weeks ${r.w0} to ${r.w1} · ${r.gates} gates</div>
      <div class="rcw">Eat about <b>${r.kcal0}→${r.kcal1} kcal</b> a day · protein ${S.cfg.protein} g</div>
      <div class="rcr">Boss gate at ${r.to} kg unlocks: ${rewards.length?esc(rewards.join(', ')):'new gear'}${i<pl.realms.length-1?' · then a camp week at maintenance':''}</div>
      <button class="rcb" data-a="rcopen:${i}" aria-expanded="${open}">${open?'Hide':'Show'} the ${gates.length} gates</button>
      ${open?'<div class="gl">'+gates.map(g=>`<div class="${S.gates.indexOf(g.kg)>=0?'got':''}"><b>${g.kg} kg</b><span>week ${g.week} · ${U.date(g.date)}</span><i>${S.gates.indexOf(g.kg)>=0?'✓':g.boss?'★':''}</i></div>`).join('')+'</div>':''}
    </div>`;
  };
  const palace=HS.REALMS[HS.REALMS.length-1];
  U.openSheet('The campaign',
    `<div class="hint">Your whole route from ${S.startW} kg to ${S.cfg.goalW} kg, one realm at a time.</div>
    <div class="dis"><div><span>GATES</span><b>${pl.gates.length}</b></div><div><span>WEEKS</span><b>${pl.weeks}</b></div><div><span>CAMP WEEKS</span><b>${camps}</b></div></div>
    <div class="note">At plan pace you cross the finish line around <b>${U.dateY(pl.finish)}</b>. Right now you are ${ex.ahead>=.2?ex.ahead.toFixed(1)+' kg ahead of plan':ex.ahead<=-.2?Math.abs(ex.ahead).toFixed(1)+' kg behind plan':'on plan'}.</div>
    <div class="sec">The realms</div>
    ${pl.realms.map(realmCard).join('')}
    <div class="rc2 final"><div class="rch"><b>FINAL FORM</b><span>${S.gates.indexOf(S.cfg.goalW)>=0?'REACHED':'THE END'}</span></div><div class="rcn">${esc(palace.name)}</div><div class="rcw">Reach ${S.cfg.goalW} kg and the palace opens: gold light, the Halo, the Regalia and the title Shadow Monarch.</div></div>
    <div class="sec">How the plan adapts</div>
    <ul class="stop"><li><b>Boss gates</b> lower your daily calories a little (about 60 kcal), so the pace holds as you get lighter.</li>
    <li><b>Camp weeks</b>: after each boss you eat at maintenance for seven days and train as normal. It protects muscle, mood and your next push.</li>
    <li><b>Weekly report</b> looks at your real trend and tells you to hold, trim or add food. If you drop faster than about 0.9 kg a week it adds calories, because fast loss costs muscle.</li>
    <li>Every gate is 0.5 kg of <i>trend</i>, not one scale reading. One heavy day moves it a quarter of the way at most.</li></ul>
    <div class="small">Dates assume you hold about 0.5 kg a week. Real life varies. If you fall behind, the plan stretches. It never punishes you with a worse target.</div>`,
    '<button class="btn ghost" data-a="close">Close</button>');
}
A.rcopen=function(v){U.sh.open[v]=!U.sh.open[v];U.keepScroll(renderCampaign)};
A.campaign=function(){F.play('nav');U.campaignSheet()};

/* ---------------- weekly report ---------------- */
U.reportSheet=function(){
  U.sh={type:'report'};
  const r=E.report(),tgt=E.T(),S=E.S();
  const row=(l,v,sub)=>`<div class="q"><span>${l}${sub?'<small class="sb2">'+sub+'</small>':''}</span><span>${v}</span></div>`;
  U.openSheet('Weekly report',
    `<div class="hint">The last seven days, read by the System.</div>
    <div class="adv ${r.advice.tone}"><b>${esc(r.advice.title)}</b><span>${esc(r.advice.text)}</span></div>
    <div class="sec">The week</div>
    ${row('Days cleared',r.closed+' / 7')}
    ${row('Inside the calorie window',r.cal+' / '+r.closed,'Target '+fmt(tgt.lo)+' to '+fmt(tgt.hi)+' kcal')}
    ${row('Protein target days',r.protein+' / 7','Target '+tgt.protein+' g')}
    ${row('Workouts finished',String(r.workouts),r.skipped?r.skipped+' skipped':'')}
    ${row('Rehab days',r.rehab+' / 7')}
    ${row('Water target days',r.water+' / 7','Target '+(S.cfg.water/1000).toFixed(1)+' L')}
    ${row('Weigh-ins',r.weighIns+' / 7')}
    ${row('Sleep, average',r.sleepAvg!=null?r.sleepAvg+' h':'not logged')}
    ${row('Eaten on average',r.kcalAvg!=null?fmt(r.kcalAvg)+' kcal':'no data')}
    ${row('Trend change',r.rate!=null?(r.rate>=0?'−':'+')+Math.abs(r.rate).toFixed(2)+' kg':'needs 4 weigh-ins')}
    <div class="note">Trend is the smoothed line, not one reading. Honest logging matters more than a perfect week.</div>`,
    '<button class="btn good" data-a="shareWeek">Share this week</button><button class="btn ghost" data-a="close">Got it</button>');
  E.reviewSeen();
};
A.report=function(){F.play('nav');U.reportSheet()};
A.shareWeek=function(){
  const S=E.S(),r=E.report(),L=E.lv(),tr=E.trend(),n=S.cfg.name||'Hunter';
  const t=n+' \u00B7 Level '+L.L+' (rank '+L.rank+') \u00B7 '+tr.toFixed(1)+' kg ('+(tr<=S.startW?'\u2212':'+')+Math.abs(S.startW-tr).toFixed(1)+' since the start)\nThis week: '+r.workouts+' workouts, '+r.rehab+' rehab days, protein hit '+r.protein+' days, water '+r.water+' days.\nClear streak: '+E.streak('clear')+' days. Gates cleared: '+S.gates.length+' of '+E.ladder().length+'.';
  if(navigator.share){navigator.share({title:'My week on Habit Sync',text:t}).catch(()=>{});return}
  window.open('https://wa.me/?text='+encodeURIComponent(t),'_blank','noopener');
};

/* ---------------- goals and streaks ---------------- */
U.goalsSheet=function(){
  U.sh={type:'goals'};
  const goals=E.goalsActive(),daysLeft=7-E.di();
  const card=g=>`<div class="gl2${g.done?' done':''}"><div><b>${esc(g.t)}</b><small>${esc(g.d)}</small><div class="xp"><i style="width:${Math.min(100,g.have/g.need*100)}%"></i></div></div><span>${g.done?'✓':g.have+'/'+g.need}<em>+${g.aura}</em></span></div>`;
  const strk=Object.keys(HS.STREAK_NAMES).map(k=>{
    const n=E.streak(k),next=HS.STREAK_STEPS.find(x=>x>n);
    return `<div class="gl2"><div><b>${esc(HS.STREAK_NAMES[k])}</b><small>${next?next-n+' more day'+(next-n===1?'':'s')+' to the '+next+'-day reward (+'+HS.STREAK_AURA[next]+')':'Every milestone cleared. Legend.'}</small><div class="xp"><i style="width:${next?Math.min(100,n/next*100):100}%"></i></div></div><span class="fl">${U.flame(n)}<b>${n}</b></span></div>`}).join('');
  U.openSheet('Goals and streaks',
    `<div class="hint">Five goals each week, picked fresh every Monday. They reset in ${daysLeft} day${daysLeft===1?'':'s'}.</div>
    ${goals.map(card).join('')}
    <div class="sec">Streaks</div>
    <div class="small" style="margin-top:0">Milestones at ${HS.STREAK_STEPS.join(', ')} days pay ${HS.STREAK_STEPS.map(s=>'+'+HS.STREAK_AURA[s]).join(', ')} aura. Training streaks ignore rest days and pain days. The clear streak forgives one off day, because never missing <i>twice</i> is the rule that works.</div>
    ${strk}`,
    '<button class="btn ghost" data-a="close">Close</button>');
};
A.streaks=function(){F.play('nav');U.goalsSheet()};
})();
