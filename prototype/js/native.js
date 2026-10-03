/* native.js: the thin line between the web app and the Android shell. Everything here is optional.
   In a browser these functions report "not available" and the app carries on without them. */
(function(){
'use strict';
const HS=window.HS=window.HS||{};
const N=HS.native={};
N.native=()=>!!(window.Capacitor&&window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform());
N.plugin=name=>(window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins[name])||null;
/* write a file to the cache and open the Android share sheet, so the backup can go to Drive, WhatsApp or Files */
N.saveFile=async function(name,text){
  const fs=N.plugin('Filesystem'),sh=N.plugin('Share');
  if(!fs||!sh)return false;
  const r=await fs.writeFile({path:name,data:text,directory:'CACHE',encoding:'utf8'});
  await sh.share({title:name,text:'Habit Sync backup',files:[r.uri],dialogTitle:'Keep your Habit Sync backup'});
  return true;
};
/* Once a day the Android app asks GitHub whether a newer build was published. Only the public release name is read; nothing about you is sent. */
N.checkUpdate=async function(){
  const E=HS.E;if(!E||!N.native()||!HS.BUILD)return null;
  const S=E.S(),u=S.update||(S.update={at:0,latest:0,url:''});
  if(Date.now()-u.at<12*36e5)return u.latest>HS.BUILD?u:null;
  try{
    const r=await fetch('https://api.github.com/repos/'+HS.REPO+'/releases/tags/android-latest',{headers:{Accept:'application/vnd.github+json'}});
    if(!r.ok)throw new Error('http '+r.status);
    const j=await r.json(),m=/build\s+(\d+)/i.exec(j.name||'');
    u.at=Date.now();u.latest=m?+m[1]:0;
    const a=(j.assets||[]).find(x=>/\.apk$/.test(x.name));u.url=a?a.browser_download_url:j.html_url;
    E.persist();
  }catch(e){u.at=Date.now()-6*36e5;E.persist()}   /* offline or blocked: try again in about six hours */
  return u.latest>HS.BUILD?u:null;
};
})();
