/* pwa.js: install prompt, persistent storage, service worker. Everything here is optional; the app works without it. */
(function(){
'use strict';
const HS=window.HS=window.HS||{};
const P=HS.pwa={deferred:null,standalone:false,sw:false,persisted:null,updated:false,native:false};
P.native=!!(window.Capacitor&&window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform());
P.standalone=P.native||(window.matchMedia&&matchMedia('(display-mode: standalone)').matches)||navigator.standalone===true;
const ping=n=>{try{HS.E&&HS.E.emit(n)}catch(e){}};
addEventListener('beforeinstallprompt',e=>{e.preventDefault();P.deferred=e;ping('pwa')});
addEventListener('appinstalled',()=>{P.deferred=null;P.standalone=true;ping('pwa')});
P.install=async function(){
  if(!P.deferred)return false;
  P.deferred.prompt();const r=await P.deferred.userChoice;P.deferred=null;ping('pwa');return r.outcome==='accepted';
};
/* ask the browser not to evict our data when space runs low */
P.persist=async function(){
  try{if(navigator.storage&&navigator.storage.persist)P.persisted=(await navigator.storage.persisted())||(await navigator.storage.persist())}catch(e){}
  return P.persisted;
};
P.estimate=async function(){try{return await navigator.storage.estimate()}catch(e){return null}};
if('serviceWorker' in navigator&&/^https?:$/.test(location.protocol)&&!P.native){
  navigator.serviceWorker.register('sw.js').then(reg=>{
    P.sw=true;ping('pwa');
    reg.addEventListener('updatefound',()=>{
      const w=reg.installing;
      if(w)w.addEventListener('statechange',()=>{if(w.state==='installed'&&navigator.serviceWorker.controller){P.updated=true;ping('pwa-update')}});
    });
  }).catch(()=>{});
}
})();
