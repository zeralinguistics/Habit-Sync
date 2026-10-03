/* ui-armory.js: the Armory. Gear is never bought. It unlocks when you do the work, and the closest unlock is always on show.
   Wear whatever you have earned, and pick which realm the app looks like. */
(function(){
'use strict';
const HS=window.HS=window.HS||{};
const E=HS.E,F=HS.fx,U=HS.ui;
const esc=U.esc,IC=U.IC,$=U.$,A=U.act;
let slot='hood';

function itemCard(it,S,c,fresh){
  const own=!!S.owned[it.id],worn=S.equip[it.slot]===it.id,p=E.reqProgress(it,c);
  const prev=it.slot==='title'?'<div class="ttl sm">« '+esc(it.name)+' »</div>':HS.avatar.thumb(it,S.equip);
  const state=worn?'WEARING':own?'TAP TO WEAR':p.text;
  return `<button class="ic ${worn?'eq':own?'own':'lock'}${fresh?' new':''}" data-a="item:${it.id}" aria-label="${esc(it.name)}, ${worn?'worn':own?'owned':'locked. '+esc(p.text)}">
    <div class="ip">${prev}${own?'':'<span class="lk">'+IC.lock+'</span>'}${fresh?'<span class="nw">NEW</span>':''}${worn?'<span class="wr">'+IC.check+'</span>':''}</div>
    <b>${esc(it.name)}</b><small>${esc(state)}</small>
    ${own?'':'<div class="xp"><i style="width:'+Math.round(p.pct*100)+'%"></i></div><span class="pp">'+p.have+' / '+p.need+'</span>'}</button>`;
}
function realmChip(r,i,S){
  const open=i+1<=E.realmsOpen(),cur=S.realm===r.id,bk=E.bossKgs()[i-1],th=F.THEMES[r.theme];
  return `<button class="rchip${cur?' cur':''}${open?'':' lock'}" data-a="realm:${r.id}" style="--c:${th.glow};--c2:${th.acc}" aria-label="${esc(r.name)}, ${open?(cur?'current':'unlocked'):'locked'}">
    <i></i><b>${esc(r.name)}</b><small>${cur?'CURRENT':open?'TAP TO ENTER':(bk?'Clear '+bk+' kg':'Locked')}</small></button>`;
}
U.views.armory=function(){
  const S=E.S(),c=E.counters(),L=E.lv(),eq=S.equip,fresh=S.newItems.slice();
  const title=(HS.ITEM_BY_ID[eq.title]||{}).name||'Rookie Hunter';
  const nu=E.nextUnlock();
  const items=HS.ITEMS.filter(i=>i.slot===slot);
  const owned=HS.ITEMS.filter(i=>S.owned[i.id]).length;
  let h=`<section class="scene short" style="--rc:var(--glow)">
      ${HS.avatar.scene(S.realm)}<div class="aglow"></div>
      <div class="ground"><svg viewBox="0 0 300 300" aria-hidden="true"><circle cx="150" cy="150" r="140" class="r1"/><circle cx="150" cy="150" r="108" class="r2"/><circle cx="150" cy="150" r="76" class="r3"/></svg></div>
      <div class="hero-av sm">${HS.avatar.svg(eq,{mood:E.mood()})}</div>
      <div class="s-top solo"><div class="who"><b>${esc(E.cfg().name||'PLAYER')}</b><span>LEVEL ${L.L} · RANK ${L.rank}</span><small>« ${esc(title)} »</small></div>
        <div class="aur"><b>${owned}<i> / ${HS.ITEMS.length}</i></b><span>GEAR</span></div></div>
    </section>`;
  if(nu)h+=`<div class="win rise nextu" style="--i:0"><div class="wt">[ Closest unlock ]</div><div class="wb nu"><div class="nup">${nu.it.slot==='title'?'<div class="ttl sm">« '+esc(nu.it.name)+' »</div>':HS.avatar.thumb(nu.it,eq)}</div>
      <div class="nux"><b>${esc(nu.it.name)}</b><small>${esc(nu.it.desc)}</small><div class="xp"><i style="width:${Math.round(nu.p.pct*100)}%"></i></div><span>${esc(nu.p.text)} · ${nu.p.have} / ${nu.p.need}</span></div></div></div>`;
  h+=`<div class="slots rise" style="--i:1" role="tablist" aria-label="Gear slots">${HS.SLOTS.map(s=>{
      const n=HS.ITEMS.filter(i=>i.slot===s[0]),o=n.filter(i=>S.owned[i.id]).length,nf=n.some(i=>fresh.indexOf(i.id)>=0);
      return `<button role="tab" data-a="slot:${s[0]}" aria-selected="${slot===s[0]}">${s[1]}<small>${o}/${n.length}</small>${nf?'<i class="sdot"></i>':''}</button>`}).join('')}</div>
    <div class="items rise" style="--i:2">${items.map(it=>itemCard(it,S,c,fresh.indexOf(it.id)>=0)).join('')}</div>
    <div class="win rise" style="--i:3"><div class="wt">[ Realms ]</div><div class="wb">
      <div class="small" style="margin-top:0">Each boss gate opens a new realm and changes the whole look of the app. Pick where you want to stand.</div>
      <div class="realms">${HS.REALMS.map((r,i)=>realmChip(r,i,S)).join('')}</div></div></div>
    <div class="foot">Nothing here is for sale. You earn it by showing up.</div>`;
  $('#screen').innerHTML=h;
  if(fresh.length){S.newItems=[];E.persist()}
};
A.slot=function(v){slot=v;F.play('pick');F.vib(6);U.views.armory()};
A.item=function(v){
  const it=HS.ITEM_BY_ID[v],S=E.S();if(!it)return;
  if(S.owned[v]){
    if(S.equip[it.slot]===v){F.play('tap');return}
    E.equip(v);U.views.armory();
    const hero=$('.hero-av');if(hero){hero.classList.remove('hop');void hero.offsetWidth;hero.classList.add('hop')}
    F.burstAt(hero||document.body,24);
  }else{
    const p=E.reqProgress(it,E.counters());
    F.play('shake');F.vib([20,40,20]);
    U.sys(p.text+' ('+p.have+' / '+p.need+') to unlock '+it.name+'.','');
  }
};
A.realm=function(v){
  const i=HS.REALMS.findIndex(r=>r.id===v);
  if(i+1>E.realmsOpen()){const bk=E.bossKgs()[i-1];F.play('shake');U.sys('Clear the '+bk+' kg boss gate to open '+HS.REALMS[i].name+'.','');return}
  if(E.S().realm===v){F.play('tap');return}
  E.setRealm(v);
};
})();
