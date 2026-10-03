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
})();
