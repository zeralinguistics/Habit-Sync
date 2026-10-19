/* ui-path.js: the Journey. Where you are on the way down: the weight chart, the gates, the week, and one-tap doors to the rest
   (stats, recovery, discipline, Samsung Health, the whole campaign). */
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

/* ---------------- the descent: your weight as a line you can read ---------------- */
let jr='all',jpt=null;
const MS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const dshort=k=>{const p=k.split('-');return +p[2]+' '+MS[+p[1]-1]};
/* a smooth curve through the points (Catmull-Rom turned into Bezier pieces) */
function smooth(pts){
  if(pts.length<2)return pts.length?'M'+pts[0][0].toFixed(1)+' '+pts[0][1].toFixed(1):'';
  let d='M'+pts[0][0].toFixed(1)+' '+pts[0][1].toFixed(1);
  for(let i=0;i<pts.length-1;i++){
    const p0=pts[i-1]||pts[i],p1=pts[i],p2=pts[i+1],p3=pts[i+2]||p2,t=.18;
    d+='C'+(p1[0]+(p2[0]-p0[0])*t).toFixed(1)+' '+(p1[1]+(p2[1]-p0[1])*t).toFixed(1)+' '+(p2[0]-(p3[0]-p1[0])*t).toFixed(1)+' '+(p2[1]-(p3[1]-p1[1])*t).toFixed(1)+' '+p2[0].toFixed(1)+' '+p2[1].toFixed(1);
  }
  return d;
}
function chartData(){
  const S=E.S(),today=E.dkey(),ks=Object.keys(S.weights).sort();
  const tmap={};let t=S.startW;ks.forEach(k=>{t=t+.25*(S.weights[k]-t);tmap[k]=Math.round(t*100)/100});
  const days=Math.max(1,E.daysBetween(S.start,today));
  const from=jr==='2w'?E.addDays(today,-13):jr==='1m'?E.addDays(today,-29):S.start;
  const lo=from<S.start?S.start:from,span=Math.max(6,E.daysBetween(lo,today));
  return{S:S,today:today,ks:ks.filter(k=>k>=lo),tmap:tmap,lo:lo,span:span};
}
function chartSvg(){
  const D=chartData(),S=D.S,W=340,H=214,pl=38,pr=14,pt=16,pb=26,pw=W-pl-pr,ph=H-pt-pb;
  const fut=jr==='all'?Math.max(3,Math.round(D.span*.18)):2,totalDays=D.span+fut;
  const X=d=>pl+d/totalDays*pw,dayOf=k=>E.daysBetween(D.lo,k);
  const wts=D.ks.map(k=>S.weights[k]),trs=D.ks.map(k=>D.tmap[k]),ng=E.nextGates(),lad=E.ladder();
  const hasData=D.ks.length>0;
  let vmin=hasData?Math.min.apply(null,wts.concat(trs)):S.startW-1,vmax=hasData?Math.max.apply(null,wts.concat(trs)):S.startW+.3;
  if(ng.next)vmin=Math.min(vmin,ng.next.kg-.15);
  const plan=E.plan();const pAt=d=>{const wk=(E.daysBetween(S.start,D.lo)+d)/7,nodes=[{w:0,kg:S.startW}];plan.gates.forEach(g=>{nodes.push({w:g.week,kg:g.kg});if(g.camp)nodes.push({w:g.camp,kg:g.kg})});for(let i=1;i<nodes.length;i++){if(wk<=nodes[i].w){const a=nodes[i-1],b=nodes[i],f=b.w===a.w?1:(wk-a.w)/(b.w-a.w);return a.kg+(b.kg-a.kg)*f}}return S.cfg.goalW};
  const planPts=[];for(let d=0;d<=totalDays;d+=Math.max(1,Math.round(totalDays/24)))planPts.push([d,pAt(d)]);
  planPts.forEach(p=>{vmin=Math.min(vmin,p[1]);vmax=Math.max(vmax,p[1])});
  vmin=Math.floor((vmin-.25)*2)/2;vmax=Math.ceil((vmax+.25)*2)/2;
  if(vmax-vmin<1.5)vmax=vmin+1.5;
  const Y=kg=>pt+(vmax-kg)/(vmax-vmin)*ph;
  /* gate lines inside the window */
  let g='';
  /* far apart enough to read: over a long campaign only every few gates are named, the boss gates and the next gate always are */
  const vis=lad.filter(gt=>gt.kg>=vmin&&gt.kg<=vmax),every=Math.max(1,Math.ceil(vis.length/Math.max(4,Math.floor(ph/13))));
  vis.forEach((gt,ix)=>{
    const got=S.gates.indexOf(gt.kg)>=0,nx=ng.next&&ng.next.kg===gt.kg,y=Y(gt.kg).toFixed(1);
    if(!(gt.boss||nx||ix%every===0))return;
    g+=`<line class="jg${got?' got':''}${nx?' nx':''}${gt.boss?' boss':''}" x1="${pl}" y1="${y}" x2="${W-pr}" y2="${y}"/><text class="jl${got?' got':''}${nx?' nx':''}${gt.boss?' boss':''}" x="${pl-5}" y="${(+y+3.5).toFixed(1)}" text-anchor="end">${gt.kg%1?gt.kg.toFixed(1):gt.kg}</text>`;
    if(got)g+=`<text class="jck" x="${W-pr-2}" y="${(+y-3).toFixed(1)}" text-anchor="end">${gt.boss?'★':'✓'}</text>`;
    if(nx)g+=`<text class="jnx" x="${W-pr-2}" y="${(+y-4).toFixed(1)}" text-anchor="end">NEXT GATE</text>`;
  });
  if(!g){for(let kg=Math.ceil(vmin);kg<=vmax;kg++)g+=`<line class="jg" x1="${pl}" y1="${Y(kg).toFixed(1)}" x2="${W-pr}" y2="${Y(kg).toFixed(1)}"/><text class="jl" x="${pl-5}" y="${(Y(kg)+3.5).toFixed(1)}" text-anchor="end">${kg}</text>`}
  /* time axis */
  let ax='';const maxX=Math.max(2,Math.floor(pw/44)),step=[1,2,3,7,14,28,56,112,224].find(x=>totalDays/x<=maxX)||224;   /* a label about every 44 units, whatever the length of the campaign */
  for(let d=0;d<=totalDays;d+=step){const k=E.addDays(D.lo,d);ax+=`<text class="jx" x="${X(d).toFixed(1)}" y="${H-8}" text-anchor="middle">${dshort(k)}</text>`}
  const tp=D.ks.map(k=>[X(dayOf(k)),Y(D.tmap[k])]);
  const line=smooth(tp);
  const last=tp[tp.length-1],first=tp[0];
  const area=hasData?line+`L${last[0].toFixed(1)} ${(pt+ph)}L${first[0].toFixed(1)} ${(pt+ph)}Z`:'';
  const planPath=smooth(planPts.map(p=>[X(p[0]),Y(p[1])]));
  let dots='',pk=null;
  D.ks.forEach((k,i)=>{
    const w=S.weights[k],x=X(dayOf(k)),y=Y(w),pw2=i?S.weights[D.ks[i-1]]:w,dir=w<pw2?'dn':w>pw2?'up':'';
    dots+=`<circle class="jd ${dir}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" style="animation-delay:${(.5+i*.04).toFixed(2)}s"/>`;
  });
  /* gate-cleared flags where the trend crossed them */
  let flags='';
  Object.keys(S.gateDates).forEach(kg=>{const dk=S.gateDates[kg];if(dk<D.lo)return;const x=X(dayOf(dk)),y=Y(+kg);flags+=`<g class="jf" transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"><circle r="6"/><path d="M-3 0l2 2 4-4"/></g>`});
  const me=hasData?`<g class="jme" transform="translate(${last[0].toFixed(1)} ${last[1].toFixed(1)})"><circle class="jpulse" r="9"/><circle class="jdot" r="5.5"/></g>`:'';
  return `<svg id="jchart" class="jchart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Weight chart: trend ${E.trend().toFixed(1)} kilograms" data-pl="${pl}" data-pw="${pw}" data-total="${totalDays}">
    <defs><linearGradient id="jgl" x1="0" x2="1"><stop offset="0" stop-color="var(--glow-d)"/><stop offset="1" stop-color="var(--glow)"/></linearGradient><linearGradient id="jga" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--glow)" stop-opacity=".34"/><stop offset="1" stop-color="var(--glow)" stop-opacity="0"/></linearGradient></defs>
    ${g}${ax}
    <path class="jplan" d="${planPath}"/>
    ${hasData?`<path class="jarea" d="${area}"/><path class="jline jdraw" d="${line}" pathLength="1"/>`:''}
    ${flags}${dots}${me}
    <g id="jtip" class="jtip" hidden><line class="jtl" y1="${pt}" y2="${pt+ph}"/><g id="jtb"><rect rx="7" width="116" height="34"/><text class="jt1" x="8" y="14"></text><text class="jt2" x="8" y="27"></text></g></g>
    <rect id="jhit" x="${pl}" y="${pt}" width="${pw}" height="${ph}" fill="transparent"/>
  </svg>`;
}
function onChartPoint(ev){
  const svg=$('#jchart');if(!svg)return;
  const r=svg.getBoundingClientRect(),pl=+svg.dataset.pl,pw=+svg.dataset.pw,total=+svg.dataset.total,vbw=340;
  const x=(ev.clientX-r.left)/r.width*vbw,d=Math.round((x-pl)/pw*total),D=chartData();
  let best=null,bd=1e9;D.ks.forEach(k=>{const dd=Math.abs(E.daysBetween(D.lo,k)-d);if(dd<bd){bd=dd;best=k}});
  if(!best)return;
  const S=D.S,w=S.weights[best],tr=D.tmap[best],px=pl+E.daysBetween(D.lo,best)/total*pw;
  const tip=$('#jtip');tip.removeAttribute('hidden');   /* an SVG element has no hidden property, only the attribute */
  const bx=Math.max(pl,Math.min(340-14-116,px-58));
  $('#jtb').setAttribute('transform','translate('+bx.toFixed(1)+' 6)');
  tip.querySelector('.jtl').setAttribute('x1',px);tip.querySelector('.jtl').setAttribute('x2',px);
  tip.querySelector('.jt1').textContent=dshort(best)+' · '+w.toFixed(1)+' kg';
  const df=w-tr;tip.querySelector('.jt2').textContent='trend '+tr.toFixed(1)+(Math.abs(df)>=.05?' ('+(df>0?'+':'−')+Math.abs(df).toFixed(1)+')':'');
  if(jpt!==best){jpt=best;F.play('tick',120+w*2)}
}
document.addEventListener('pointerdown',e=>{if(e.target&&e.target.id==='jhit')onChartPoint(e)});
document.addEventListener('pointermove',e=>{if(e.target&&e.target.id==='jhit'&&(e.pressure>0||e.pointerType==='mouse'))onChartPoint(e)});
A.jrange=function(v){jr=v;jpt=null;F.play('tick',140);U.render()};

/* ---------------- the Journey screen ---------------- */
function paceCopy(ex){
  if(!Object.keys(E.S().weights).length)return{c:'info',t:'Weigh in to see your pace'};
  if(ex.ahead>=.2)return{c:'good',t:'AHEAD OF PLAN · '+ex.ahead.toFixed(1)+' kg'};
  if(ex.ahead<=-.2)return{c:'warn',t:'BEHIND PLAN · '+Math.abs(ex.ahead).toFixed(1)+' kg. Normal. Adjust, don’t panic.'};
  return{c:'good',t:'ON PLAN'};
}
function bossHp(ng,tr,S){
  if(!ng.boss)return 0;
  const bosses=E.bossKgs(),i=bosses.indexOf(ng.boss.kg),from=i>0?bosses[i-1]:S.startW,span=from-ng.boss.kg;
  return span>0?Math.max(0,Math.min(100,(tr-ng.boss.kg)/span*100)):100;
}
U.views.path=function(){
  const S=E.S(),cfg=E.cfg(),tr=E.trend(),pr=E.progress(),pl=E.plan(),ex=E.expected(),eta=E.eta(),ng=E.nextGates();
  const lad=E.ladder(),pace=paceCopy(ex),wkNo=Math.min(pl.weeks,E.weekNo()),rep=E.report();
  const ks=Object.keys(S.weights).sort(),best=ks.length?Math.min.apply(null,ks.map(k=>S.weights[k])):null;
  const lost=S.startW-tr,rate=rep.rate;
  const hp=bossHp(ng,tr,S);
  const row=(a,ic,t,s)=>`<button class="mrow" data-a="${a}"><span class="mri">${IC[ic]}</span><span class="mrm"><b>${esc(t)}</b><small>${esc(s)}</small></span><i class="chev">${IC.chev}</i></button>`;
  const pd=E.painDays(7),greens=pd.filter(x=>E.light(x.r)==='green').length,hs=S.health,d=E.day();
  let h=`<div class="card jhero rise" style="--i:0"><div class="jh1">${ghost()}<div class="jh2">
      <span class="jk">TREND WEIGHT</span><div class="jbig"><b id="trendNum">${tr.toFixed(1)}</b><span>kg</span></div>
      <div class="jsub"><b class="${lost>=.05?'dn':lost<=-.05?'up':''}">${Math.abs(lost)<.05?'':lost>=0?'−':'+'}${Math.abs(lost).toFixed(1)} kg</b> since the start · <b>${Math.max(0,tr-cfg.goalW).toFixed(1)} kg</b> to ${cfg.goalW} kg</div>
      <div class="pace ${pace.c}">${esc(pace.t)}</div></div></div>
    <div class="camp"><div class="campl"><span>CAMPAIGN</span><b>${pl.weeks?'WEEK '+wkNo+' / '+pl.weeks:'NO GATES LEFT'}</b></div><div class="xp"><i style="width:${pl.weeks?wkNo/pl.weeks*100:100}%"></i></div>
      <div class="gsmall"><b id="syncNum">0</b>% sync · at plan pace you finish around <b>${U.dateY(pl.finish)}</b>${eta.real?'. At your recent pace: '+U.dateY(eta.date)+'.':'.'}</div></div></div>
  <div class="card jchartc rise" style="--i:1"><div class="jct"><span class="jk">THE DESCENT</span><div class="jtabs" role="tablist">${[['2w','2 wk'],['1m','1 mo'],['all','All']].map(t=>`<button role="tab" data-a="jrange:${t[0]}" aria-selected="${jr===t[0]}">${t[1]}</button>`).join('')}</div></div>
    ${chartSvg()}
    <div class="jleg"><span><b class="l1"></b>Trend</span><span><b class="l2"></b>Weigh-ins</span><span><b class="l3"></b>The plan</span><span><b class="l4"></b>Gate cleared</span></div>
    <div class="jstats"><div><b>${best!=null?best.toFixed(1):'—'}</b><span>LOWEST KG</span></div><div><b>${ks.length}</b><span>WEIGH-INS</span></div><div><b>${rate!=null?(Math.abs(rate)<.005?'':rate>=0?'−':'+')+Math.abs(rate).toFixed(2):'—'}</b><span>KG THIS WEEK</span></div></div></div>
  <div class="card jgates rise" style="--i:2"><div class="jct"><span class="jk">GATES · ${S.gates.length} OF ${lad.length} CLEARED</span></div>
    <div class="duo"><div class="tile2"><span>NEXT GATE</span><b>${ng.next?ng.next.kg+' kg':'Done'}</b><small>${ng.next?ng.toNext.toFixed(1)+' kg to go':'Every gate cleared'}</small></div>
    <div class="tile2 gold"><span>BOSS GATE</span><b>${ng.boss?ng.boss.kg+' kg':'Done'}</b><small>${ng.boss?ng.toBoss.toFixed(1)+' kg to go':'You did it'}</small></div></div>
    ${ng.boss?`<div class="bosshp"><div class="hp"><i style="width:${hp}%"></i></div><small>Boss HP ${Math.round(hp)}%</small></div>`:''}
    <div class="road" id="road"><div class="rin2"><div class="rnode start"><i></i><span>START<br>${S.startW}</span></div>
    ${lad.map(g=>{const got=S.gates.includes(g.kg),nx=ng.next&&ng.next.kg===g.kg;return `<div class="rnode${got?' got':''}${nx?' nx':''}${g.boss?' boss':''}" ${nx?'id="rnext"':''}>${nx?'<em>YOU</em>':''}<i>${got?'✓':g.boss?'★':''}</i><span>${g.kg}</span></div>`}).join('')}</div></div></div>
  <button class="card report rise ${E.reviewDue()?'due':''}" style="--i:3;display:block;width:100%;text-align:left" data-a="report"><div class="jct"><span class="jk">WEEKLY REPORT${E.reviewDue()?' <em class="nw">NEW</em>':''}</span><i class="chev">${IC.chev}</i></div><div class="wb rp" style="padding-top:2px">
    <div class="rpg"><div><b>${rep.workouts}</b><span>WORKOUTS</span></div><div><b>${rep.rehab}</b><span>REHAB</span></div><div><b>${rep.protein}</b><span>PROTEIN</span></div><div><b>${rep.water}</b><span>WATER</span></div></div>
    <div class="adv ${rep.advice.tone}"><b>${esc(rep.advice.title)}</b><span>${esc(rep.advice.text)}</span></div></div></button>
  <div class="card more rise" style="--i:4">
    ${row('streaks','flame','Daily streak',E.streak('spark')+' days · best '+Math.max(S.bestStreak||0,E.streak('spark')))}
    ${row('healthOpen','heartbeat','Samsung Health & steps',hs.on&&d.hSteps?fmt(d.hSteps)+' steps today':'Steps, sleep, calories burned')}
    ${row('statsOpen','user','Hunter stats','STR '+S.stats.STR+' · VIT '+S.stats.VIT+' · AGI '+S.stats.AGI+' · SNS '+S.stats.SNS)}
    ${row('recoveryOpen','rehab','Recovery and physio',greens+' green day'+(greens===1?'':'s')+' this week · rehab streak '+E.streak('rehab'))}
    ${row('disciplineOpen','shield','Discipline',(E.fatigued()?'FATIGUED':'READY')+' · rest pass '+(E.passLeft()?'1 left':'used')+' · '+cap(cfg.strict))}
    ${row('campaign','path','The whole campaign',pl.gates.length+' gates · '+pl.weeks+' weeks · '+pl.camps+' camp weeks')}
  </div>`;
  $('#screen').innerHTML=h;
  requestAnimationFrame(()=>{
    const r=$('#gclipR');if(r){const gh=220*pr.pct;r.style.y=(220-gh)+'px';r.style.height=gh+'px';prev.gy=220-gh;prev.gh=gh}
    const road=$('#road'),nx=$('#rnext');if(road&&nx)road.scrollLeft=Math.max(0,nx.offsetLeft-road.clientWidth/2+30);
  });
  cnt('syncNum',Math.round(pr.pct*100),null,900);
};

/* ---------------- the doors ---------------- */
A.statsOpen=function(){
  const S=E.S();U.sh={type:'stats'};F.play('nav');
  U.openSheet('Hunter stats',radar(S.stats),'<button class="btn ghost" data-a="close">Close</button>');
};
A.recoveryOpen=function(){
  const pd=E.painDays(7),greens=pd.filter(x=>E.light(x.r)==='green').length;U.sh={type:'recovery'};F.play('nav');
  U.openSheet('Recovery',`<div class="pbarch" role="img" aria-label="Seven day pain chart">${pd.map(x=>`<div title="${x.k}"><i class="kn" style="height:${x.r?Math.max(3,x.r.knee*10):3}%;opacity:${x.r?1:.25}"></i><i class="bk" style="height:${x.r?Math.max(3,x.r.back*10):3}%;opacity:${x.r?1:.25}"></i></div>`).join('')}</div>
    <div class="legend"><span><b style="background:var(--glow)"></b>Right knee</span><span><b style="background:var(--violet)"></b>Lower back</span><span>${greens} green day${greens===1?'':'s'}</span><span>Rehab streak ${E.streak('rehab')}</span></div>
    <div class="stack2"><button class="btn" data-a="rehabopen">Today’s rehab</button><button class="btn ghost" data-a="roadmap">Recovery roadmap</button><button class="btn vio" data-a="physio">Prepare physio sheet</button></div>`,'<button class="btn ghost" data-a="close">Close</button>');
};
A.disciplineOpen=function(){
  const cfg=E.cfg(),fat=E.fatigued(),msg=E.contractMessage('missed a session');U.sh={type:'discipline'};F.play('nav');
  U.openSheet('Discipline',`<div class="dis"><div><span>STATUS</span><b class="${fat?'bad':'ok'}">${fat?'FATIGUED':'READY'}</b></div><div><span>REST PASS</span><b>${E.passLeft()?'1 LEFT':'USED'}</b></div><div><span>RULES</span><b>${cap(cfg.strict).toUpperCase()}</b></div></div>
    ${cfg.contract?'<div class="small">Contract: '+esc(cfg.contract)+'</div>':''}
    <a class="btn ghost lnk" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(msg)}">Tell my accountability partner</a>`,'<button class="btn ghost" data-a="close">Close</button>');
};
A.saveSteps=function(){
  const d=E.day(),v=($('#stepsIn')||{}).value;d.steps=v;
  if(+v>0&&!d.stepsAward){d.stepsAward=true;E.stat('AGI',1)}
  E.save();U.sys(v?'Steps saved: '+fmt(+v)+'.':'Cleared.','good');
  if(U.sh&&U.sh.type==='health')U.keepScroll(U.healthSheet);   /* the ring and the bars show the new number now */
};
A.rehabopen=function(){U.rehabSheet()};
A.hconnect=async function(){
  if(!HS.health)return;
  U.sys('Asking Android for permission...','',true);
  const r=await HS.health.connect();
  U.sys(r.ok?'Connected. Pulling today’s data...':r.msg,r.ok?'good':'bad');
  if(r.ok)await A.hsync();
  if(U.sh&&U.sh.type==='health')U.healthSheet();else U.render();
};
A.hsync=async function(){
  if(!HS.health)return;
  const r=await HS.health.sync();
  U.sys(r.ok?'Synced: '+(r.steps!=null?fmt(r.steps)+' steps':'')+(r.act!=null?', '+fmt(r.act)+' active kcal':'')+(r.sleep!=null?', slept '+r.sleep+' h':'')+'.':r.msg,r.ok?'good':'bad');
  if(U.sh&&U.sh.type==='health')U.healthSheet();else U.render();
};

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
      <button class="rcb" data-a="rcopen:${i}" aria-expanded="${open}">${open?'Hide':'Show'} the ${gates.length} gate${gates.length===1?'':'s'}</button>
      ${open?'<div class="gl">'+gates.map(g=>`<div class="${S.gates.indexOf(g.kg)>=0?'got':''}"><b>${g.kg} kg</b><span>week ${g.week} · ${U.date(g.date)}</span><i>${S.gates.indexOf(g.kg)>=0?'✓':g.boss?'★':''}</i></div>`).join('')+'</div>':''}
    </div>`;
  };
  const palace=HS.REALMS[HS.REALMS.length-1];
  U.openSheet('The campaign',
    `<div class="dis"><div><span>GATES</span><b>${pl.gates.length}</b></div><div><span>WEEKS</span><b>${pl.weeks}</b></div><div><span>CAMP WEEKS</span><b>${camps}</b></div></div>
    <div class="note">At plan pace you cross the finish line around <b>${U.dateY(pl.finish)}</b>. Right now you are ${ex.ahead>=.2?ex.ahead.toFixed(1)+' kg ahead of plan':ex.ahead<=-.2?Math.abs(ex.ahead).toFixed(1)+' kg behind plan':'on plan'}.</div>
    <div class="sec">The realms</div>
    ${pl.realms.map(realmCard).join('')}
    <div class="rc2 final"><div class="rch"><b>FINAL FORM</b><span>${S.gates.indexOf(S.cfg.goalW)>=0?'REACHED':'THE END'}</span></div><div class="rcn">${esc(palace.name)}</div><div class="rcw">Reach ${S.cfg.goalW} kg and the palace opens: gold light, the Halo, the Regalia and the title Shadow Monarch.</div></div>
`,
    '<button class="btn ghost" data-a="close">Close</button>');
}
A.rcopen=function(v){U.sh.open[v]=!U.sh.open[v];U.keepScroll(renderCampaign)};
A.campaign=function(){F.play('nav');U.campaignSheet()};

/* ---------------- weekly report ---------------- */
/* the log against the scale, once there are two weeks of both */
function scaleCheck(){
  const v=E.energyVerdict();
  if(!v)return'';
  return `<div class="sec">Log against the scale</div><div class="adv ${v.tone}"><b>${esc(v.title)}</b><span>${esc(v.text)}</span></div>`;
}
U.reportSheet=function(){
  U.sh={type:'report'};
  const r=E.report(),tgt=E.T(),S=E.S();
  const row=(l,v,sub)=>`<div class="q"><span>${l}${sub?'<small class="sb2">'+sub+'</small>':''}</span><span>${v}</span></div>`;
  U.openSheet('Weekly report',
    `
    <div class="adv ${r.advice.tone}"><b>${esc(r.advice.title)}</b><span>${esc(r.advice.text)}</span></div>
    <div class="sec">The week</div>
    ${row('Days cleared',r.closed+' / 7')}
    ${row('Inside the calorie window',r.cal+' / '+r.closed,'Target '+fmt(tgt.lo)+' to '+fmt(tgt.hi)+' kcal')}
    ${row('Protein target days',r.protein+' / 7','Target '+tgt.protein+' g')}
    ${row('Workouts finished',String(r.workouts),r.skipped?r.skipped+' skipped':'')}
    ${row('Cardio days',String(r.cardio||0),'Walking and running on rest days')}
    ${row('Rehab days',r.rehab+' / 7')}
    ${row('Water target days',r.water+' / 7','Target '+(S.cfg.water/1000).toFixed(1)+' L')}
    ${row('Weigh-ins',r.weighIns+' / 7')}
    ${row('Sleep, average',r.sleepAvg!=null?r.sleepAvg+' h':'not logged')}
    ${row('Eaten on average',r.kcalAvg!=null?fmt(r.kcalAvg)+' kcal':'no data')}
    ${row('Trend change',r.rate!=null?(r.rate>=0?'−':'+')+Math.abs(r.rate).toFixed(2)+' kg':'needs 4 weigh-ins')}
    ${scaleCheck()}`,
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
    `<div class="hint">Resets in ${daysLeft} day${daysLeft===1?'':'s'}</div>
    ${goals.map(card).join('')}
    <div class="sec">Streaks</div>
    ${strk}`,
    '<button class="btn ghost" data-a="close">Close</button>');
};
})();
