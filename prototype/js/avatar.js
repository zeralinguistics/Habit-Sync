/* avatar.js: draws the hunter. One SVG built from layers: aura behind, companion, cape, body, hood, eyes, weapon, mood.
   Every piece is a small function, so a new item is one entry. Also draws the five realm backdrops and the armory thumbnails. */
(function(){
'use strict';
const HS=window.HS=window.HS||{};
const A=HS.avatar={};

const BODY='M80 44 C62 44 50 54 46 72 L34 122 L52 126 L56 206 L74 206 L80 152 L86 206 L104 206 L108 126 L126 122 L114 72 C110 54 98 44 80 44 Z';
const HEAD='M80 6 C64 6 58 20 58 32 C58 44 68 52 80 52 C92 52 102 44 102 32 C102 20 96 6 80 6 Z';
A.BODY=BODY;A.HEAD=HEAD;

/* shared gradients: referenced by id from every avatar on the page, so they follow the theme */
A.defs=function(){
  return '<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>'+
   '<linearGradient id="hsBody" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--b1)"/><stop offset="1" style="stop-color:var(--b2)"/></linearGradient>'+
   '<linearGradient id="hsGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff1b8"/><stop offset=".5" stop-color="#f5c451"/><stop offset="1" stop-color="#a8761a"/></linearGradient>'+
   '<linearGradient id="hsSteel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e8f1ff"/><stop offset=".5" stop-color="#8aa5c2"/><stop offset="1" stop-color="#34445c"/></linearGradient>'+
   '<linearGradient id="hsFlame" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ff4d2e"/><stop offset=".5" stop-color="#ff8a3d"/><stop offset="1" stop-color="#ffe27a"/></linearGradient>'+
   '<linearGradient id="hsVFlame" x1="0" y1="1" x2="0" y2="0"><stop offset="0" style="stop-color:var(--violet)"/><stop offset=".6" style="stop-color:var(--glow)"/><stop offset="1" stop-color="#ffffff"/></linearGradient>'+
   '<radialGradient id="hsPortal" cx=".5" cy=".6" r=".6"><stop offset="0" style="stop-color:var(--glow)" stop-opacity=".75"/><stop offset=".6" style="stop-color:var(--glow)" stop-opacity=".18"/><stop offset="1" style="stop-color:var(--glow)" stop-opacity="0"/></radialGradient>'+
   '<radialGradient id="hsSun" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff6cf"/><stop offset=".45" stop-color="#f5c451" stop-opacity=".9"/><stop offset="1" stop-color="#f5c451" stop-opacity="0"/></radialGradient>'+
   '<linearGradient id="hsSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--bg)"/><stop offset="1" style="stop-color:var(--b1)"/></linearGradient>'+
   '<linearGradient id="hsAurora" x1="0" y1="0" x2="1" y2="0"><stop offset="0" style="stop-color:var(--glow)" stop-opacity="0"/><stop offset=".35" style="stop-color:var(--glow)" stop-opacity=".55"/><stop offset=".7" style="stop-color:var(--violet)" stop-opacity=".45"/><stop offset="1" style="stop-color:var(--violet)" stop-opacity="0"/></linearGradient>'+
   '</defs></svg>';
};

/* ---------------- reusable shapes ---------------- */
const FLAME='M0 0 C-10 -4 -12 -16 -4 -24 C-3 -18 0 -16 1 -20 C2 -28 -2 -32 2 -40 C10 -30 14 -14 8 -4 C6 -1 3 0 0 0 Z';
const BOLT='M0 0 L-9 17 L0 14 L-11 38 L11 12 L2 15 Z';
const flames=(cls,fill,list)=>list.map((f,i)=>'<g transform="translate('+f[0]+' '+f[1]+') scale('+f[2]+')"><path class="'+cls+'" style="animation-delay:'+(i*.17).toFixed(2)+'s" fill="'+fill+'" d="'+FLAME+'"/></g>').join('');

/* ---------------- aura (behind the hunter) ---------------- */
const AURA={
  aura_none:()=>'',
  aura_mist:()=>'<g class="a-mist"><ellipse cx="46" cy="196" rx="38" ry="13"/><ellipse cx="114" cy="188" rx="36" ry="12"/><ellipse cx="80" cy="206" rx="46" ry="11"/><ellipse cx="80" cy="150" rx="52" ry="40" class="halo2"/></g>',
  aura_flame:()=>'<g class="a-flame">'+flames('flm','url(#hsFlame)',[[40,206,.9],[58,210,1.15],[80,212,1.3],[102,210,1.15],[120,206,.9],[26,196,.6],[134,196,.6],[68,214,.8],[92,214,.8]])+'</g>',
  aura_bolt:()=>'<g class="a-bolt">'+[[22,80,1,0],[138,92,1,.7],[14,150,.8,1.4],[148,60,.8,2.1],[30,20,.7,.35],[132,14,.7,1.05]].map(b=>'<g transform="translate('+b[0]+' '+b[1]+') scale('+b[2]+')"><path class="bolt" style="animation-delay:'+b[3]+'s" d="'+BOLT+'"/></g>').join('')+'<ellipse class="arcs" cx="80" cy="130" rx="64" ry="86"/></g>',
  aura_fire:()=>'<g class="a-fire">'+flames('flm2','url(#hsVFlame)',[[30,210,1.7],[130,210,1.7],[52,214,2.1],[108,214,2.1],[80,216,2.5],[16,190,1.2],[144,190,1.2],[22,150,.9],[138,150,.9],[40,120,.7],[120,120,.7]])+'</g>'
};

/* ---------------- companions ---------------- */
const PET={
  pet_none:()=>'',
  pet_raven:()=>'<g transform="translate(36 64) scale(1.35)"><g class="p-raven"><path class="pk" d="M-8 1 L-22 8 L-7 5Z"/><ellipse class="pk" cx="0" cy="0" rx="9.5" ry="6.2"/><circle class="pk" cx="8.5" cy="-6" r="4.3"/><path class="pk beak" d="M11.8 -6.8 L18 -5.2 L11.8 -4Z"/><path class="pk rwing" d="M-5 -3 C-3 -14 8 -16 13 -10 C6 -9 1 -5 -5 -3Z"/><circle class="pe" cx="9.6" cy="-7" r="1.1"/></g></g>',
  pet_wolf:()=>'<g class="p-wolf" transform="translate(22 214) scale(1.3)"><path class="pk tail" d="M-12 -6 C-24 -8 -30 -20 -25 -29 C-22 -20 -17 -15 -10 -12Z"/><path class="pk" d="M-14 0 C-17 -13 -11 -25 -1 -31 L1 -42 L7 -34 L13 -34 L23 -28 L22 -25.5 L14 -24 L9 -18 C11 -10 11 -4 10 0 L4 0 L2 -8 C-2 -6 -6 -2 -6 0 Z"/><circle class="pe" cx="11" cy="-30" r="1.4"/></g>',
  pet_drake:()=>'<g transform="translate(128 26) scale(1.25)"><g class="p-drake"><path class="pk dw far" d="M-2 -2 L-24 -24 L-13 -5 L-27 -10 L-9 4Z"/><path class="pk" d="M-16 7 L-34 14 L-17 11Z"/><path class="pk" d="M-15 6 C-9 -5 4 -7 12 -5 L21 -14 L27 -10 L24 -5 L30 -3 L23 1 C14 8 1 11 -15 6Z"/><path class="pk dw near" d="M2 -3 L22 -29 L13 -7 L29 -14 L9 4Z"/><path class="pk" d="M22 -14 L25 -22 L27 -13Z"/><circle class="pe" cx="22.5" cy="-8" r="1.3"/></g></g>'
};

/* ---------------- cape and wings (behind the body) ---------------- */
const CAPE={
  body_cape:()=>'<path class="cape sway" d="M52 56 C26 112 14 172 22 216 L138 216 C146 172 134 112 108 56 Z"/><path class="capeln" d="M80 96 C80 140 80 180 80 214"/>',
  body_regalia:()=>'<path class="cape gold sway" d="M50 54 C20 112 8 176 16 218 L144 218 C152 176 140 112 110 54 Z"/><path class="trim" d="M16 218 L144 218"/><path class="capeln" d="M80 96 C80 140 80 180 80 214"/>'
};

/* ---------------- bodies ---------------- */
const BDY={
  body_robe:()=>'<path class="hem" d="M56 200 L74 200 M86 200 L104 200"/><path class="belt" d="M52 126 L108 126"/>',
  body_coat:()=>'<path class="line2" d="M64 56 L80 86 L96 56"/><path class="line2" d="M52 126 L47 192 L74 198 L80 152 L86 198 L113 192 L108 126"/><path class="belt" d="M50 128 L110 128"/><circle class="btn" cx="80" cy="102" r="1.8"/><circle class="btn" cx="80" cy="114" r="1.8"/><circle class="btn" cx="80" cy="126" r="1.8"/>',
  body_cape:()=>'<path class="line2" d="M60 58 L80 74 L100 58"/><circle class="clasp" cx="80" cy="73" r="4"/><path class="belt" d="M52 126 L108 126"/>',
  body_armor:()=>'<ellipse class="plate" cx="45" cy="75" rx="14" ry="9" transform="rotate(-14 45 75)"/><ellipse class="plate" cx="115" cy="75" rx="14" ry="9" transform="rotate(14 115 75)"/><path class="plate2" d="M62 68 L98 68 L94 118 L80 128 L66 118 Z"/><path class="line2" d="M80 70 L80 126"/><path class="belt" d="M52 130 L108 130"/><path class="line2" d="M56 172 L74 172 M86 172 L104 172"/>',
  body_regalia:()=>'<ellipse class="plate gold" cx="45" cy="75" rx="15" ry="10" transform="rotate(-14 45 75)"/><ellipse class="plate gold" cx="115" cy="75" rx="15" ry="10" transform="rotate(14 115 75)"/><path class="spike" d="M36 70 L30 52 L44 64Z"/><path class="spike" d="M124 70 L130 52 L116 64Z"/><path class="plate2 gold" d="M60 68 L100 68 L95 120 L80 132 L65 120 Z"/><circle class="gem" cx="80" cy="92" r="6"/><path class="trim" d="M52 130 L108 130"/><path class="trim" d="M56 172 L74 172 M86 172 L104 172"/>'
};

/* ---------------- hoods ---------------- */
const HOOD={
  hood_plain:()=>'',
  hood_mask:()=>'<path class="mask" d="M61 38 Q80 46 99 38 L97 50 Q80 57 63 50 Z"/><path class="line2" d="M70 47 L90 47"/>',
  hood_horn:()=>'<path class="horn" d="M62 14 L53 -6 L69 8 Z"/><path class="horn" d="M98 14 L107 -6 L91 8 Z"/>',
  hood_crown:()=>'<path class="crown" d="M61 17 L64 2 L71 11 L80 -2 L89 11 L96 2 L99 17 Z"/><circle class="gem" cx="80" cy="9" r="2.2"/><path class="trim" d="M61 17 L99 17"/>',
  hood_halo:()=>'<ellipse class="halo" cx="80" cy="-6" rx="25" ry="7"/><ellipse class="halo thin" cx="80" cy="-6" rx="31" ry="9"/><path class="horn gold" d="M62 14 L55 -2 L68 8 Z"/><path class="horn gold" d="M98 14 L105 -2 L92 8 Z"/>'
};

/* ---------------- weapons (right hand, plus left for the twin fangs) ---------------- */
const WPN={
  wpn_none:()=>'',
  wpn_dagger:()=>'<g transform="translate(126 122) rotate(-8)"><path class="blade" d="M-2 0 L2 0 L3 34 L0 40 L-3 34Z"/><path class="guard" d="M-8 -1 L8 -1"/><rect class="grip" x="-1.6" y="-9" width="3.2" height="8" rx="1.5"/></g>',
  wpn_twin:()=>'<g transform="translate(126 122) rotate(-8)"><path class="blade" d="M-2 0 L2 0 L3 32 L0 38 L-3 32Z"/><path class="guard" d="M-8 -1 L8 -1"/><rect class="grip" x="-1.6" y="-9" width="3.2" height="8" rx="1.5"/></g><g transform="translate(34 122) rotate(8) scale(-1 1)"><path class="blade" d="M-2 0 L2 0 L3 32 L0 38 L-3 32Z"/><path class="guard" d="M-8 -1 L8 -1"/><rect class="grip" x="-1.6" y="-9" width="3.2" height="8" rx="1.5"/></g>',
  wpn_blade:()=>'<g transform="translate(128 124) rotate(14)"><path class="blade long" d="M-3.5 0 L3.5 0 L4 -96 L0 -106 L-4 -96Z"/><path class="rune" d="M0 -14 V-28 M0 -38 V-50 M0 -60 V-72 M0 -80 V-90"/><path class="guard" d="M-11 1 L11 1"/><rect class="grip" x="-2" y="2" width="4" height="13" rx="2"/><circle class="gem" cx="0" cy="17" r="2.6"/></g>',
  wpn_scythe:()=>'<g transform="translate(140 214) rotate(4)"><path class="staff" d="M0 0 L0 -200"/><path class="blade scy" d="M0 -198 C-24 -212 -50 -202 -60 -178 C-42 -192 -22 -192 0 -184Z"/><circle class="gem" cx="0" cy="-196" r="3"/></g>'
};

/* ---------------- the assembled hunter ---------------- */
const EYE=()=>HS.EYE_COLOR||{};
A.svg=function(equip,o){
  o=o||{};
  const eq=Object.assign({},HS.EQUIP_DEFAULT,equip||{});
  const mood=o.mood||'idle',eye=EYE()[eq.eyes]||'#fff';
  const hasCape=!!CAPE[eq.body],mist=eq.aura==='aura_mist';
  let s='<svg class="av m-'+mood+(o.cls?' '+o.cls:'')+(o.zoom==='head'?' zh':'')+'" viewBox="'+(o.zoom==='head'?'22 -22 116 100':o.wide?'-34 -24 228 272':'0 0 160 220')+'" aria-hidden="true" style="--eye:'+eye+'">';
  s+=(AURA[eq.aura]||AURA.aura_none)();
  s+=(PET[eq.pet]||PET.pet_none)();
  if(hasCape)s+=CAPE[eq.body]();
  s+='<path class="abody" d="'+BODY+'" fill="url(#hsBody)"/>';
  s+=(BDY[eq.body]||BDY.body_robe)();
  s+='<path class="ahead" d="'+HEAD+'" fill="url(#hsBody)"/>';
  s+=(HOOD[eq.hood]||HOOD.hood_plain)();
  s+='<g class="eyes"><rect x="67" y="29" width="10" height="3.4" rx="1.7"/><rect x="83" y="29" width="10" height="3.4" rx="1.7"/></g>';
  s+=(WPN[eq.weapon]||WPN.wpn_none)();
  if(mood==='tired')s+='<g class="zzz"><text x="104" y="22">z</text><text x="114" y="10">Z</text></g>';
  if(mood==='proud'||mood==='pumped')s+='<g class="sparks">'+[[22,40],[140,50],[30,150],[132,160],[80,-8]].map((p,i)=>'<path style="animation-delay:'+(i*.4)+'s" d="M'+p[0]+' '+(p[1]-5)+' L'+(p[0]+1.6)+' '+(p[1]-1.6)+' L'+(p[0]+5)+' '+p[1]+' L'+(p[0]+1.6)+' '+(p[1]+1.6)+' L'+p[0]+' '+(p[1]+5)+' L'+(p[0]-1.6)+' '+(p[1]+1.6)+' L'+(p[0]-5)+' '+p[1]+' L'+(p[0]-1.6)+' '+(p[1]-1.6)+'Z"/>').join('')+'</g>';
  return s+'</svg>';
};
/* an armory card: the hunter with one item swapped in, drawn wide so auras and companions fit */
A.thumb=function(item,equip){
  const eq=Object.assign({},HS.EQUIP_DEFAULT,equip||{});
  if(item&&item.slot!=='title')eq[item.slot]=item.id;
  return A.svg(eq,{wide:true,cls:'thumb',zoom:item&&(item.slot==='eyes'||item.slot==='hood')?'head':''});
};

/* ---------------- the shadow army: silhouettes that stand behind the hunter ---------------- */
const SPOS=[[-78,8,.62],[78,8,.62],[-118,20,.5],[118,20,.5],[-46,30,.44],[46,30,.44],[-152,6,.44],[152,6,.44],[-98,44,.38],[98,44,.38]];
A.army=function(n){
  let h='';
  for(let i=0;i<Math.min(n,SPOS.length);i++){const p=SPOS[i];
    h+='<svg class="sold" style="--x:'+p[0]+'px;--b:'+p[1]+'px;--s:'+p[2]+';--d:'+(i*.25)+'s" viewBox="0 0 160 220" aria-hidden="true"><path d="'+BODY+'"/><path d="'+HEAD+'"/><rect class="se" x="67" y="29" width="10" height="4" rx="2"/><rect class="se" x="83" y="29" width="10" height="4" rx="2"/></svg>';}
  return h;
};

/* ---------------- realm backdrops: each boss gate changes the world ---------------- */
const WIN=(x,y,d)=>'<rect class="win2" style="animation-delay:'+d+'s" x="'+x+'" y="'+y+'" width="4" height="7"/>';
const merlons=(y,x0,x1,w,h,gap)=>{let s='';for(let x=x0;x<x1;x+=w+gap)s+='<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'"/>';return s};
const SCENE={
  gate:()=>'<rect width="400" height="310" fill="url(#hsSky)"/><circle class="sc-moon" cx="320" cy="62" r="22"/>'+
    '<g class="sc-far"><path d="M0 250 L40 200 L70 236 L120 190 L160 240 L200 210 L240 244 L290 196 L340 238 L400 204 L400 310 L0 310Z"/></g>'+
    '<g class="sc-pillars"><rect x="22" y="176" width="22" height="134"/><path d="M18 176 H48 L44 166 H22Z"/><rect x="356" y="196" width="20" height="114"/><path d="M352 196 H380 L376 186 H356Z"/></g>'+
    '<ellipse class="sc-pulse" cx="200" cy="170" rx="150" ry="150" fill="url(#hsPortal)"/>'+
    '<path class="sc-arch" d="M112 310 V150 Q112 58 200 58 Q288 58 288 150 V310"/><path class="sc-arch in" d="M130 310 V152 Q130 76 200 76 Q270 76 270 152 V310"/>'+
    '<g class="sc-runes">'+[[96,120],[304,130],[88,190],[312,200],[200,40],[150,52],[250,52]].map((r,i)=>'<path style="animation-delay:'+(i*.5)+'s" d="M'+r[0]+' '+r[1]+' l5 -8 l5 8 l-5 8z M'+(r[0]+5)+' '+(r[1]-12)+' v-4"/>').join('')+'</g>'+
    '<ellipse cx="200" cy="304" rx="190" ry="26" class="sc-haze"/>',
  fortress:()=>'<rect width="400" height="310" fill="url(#hsSky)"/><circle class="sc-moon" cx="64" cy="64" r="26"/>'+
    '<g class="sc-far"><path d="M0 236 L60 196 L110 232 L170 188 L230 230 L290 192 L350 228 L400 200 L400 310 L0 310Z"/></g>'+
    '<g class="sc-castle"><rect x="0" y="206" width="400" height="104"/>'+merlons(194,0,400,16,14,10)+
    '<rect x="14" y="120" width="56" height="190"/><path d="M8 120 L42 78 L76 120Z"/><rect x="330" y="132" width="56" height="178"/><path d="M324 132 L358 92 L392 132Z"/>'+
    '<rect x="150" y="150" width="100" height="160"/>'+merlons(138,150,250,14,14,8)+
    '<path class="sc-door" d="M174 310 V230 Q200 196 226 230 V310Z"/></g>'+
    '<g class="sc-wins">'+WIN(34,150,0)+WIN(48,176,.6)+WIN(348,160,1.2)+WIN(364,188,.3)+WIN(166,176,.9)+WIN(228,176,1.5)+'</g>'+
    '<path class="sc-flag sway" d="M42 78 V50 L66 58 L42 66"/><path class="sc-flag sway" style="animation-delay:.6s" d="M358 92 V64 L382 72 L358 80"/>'+
    '<ellipse cx="200" cy="306" rx="200" ry="22" class="sc-haze"/>',
  citadel:()=>'<rect width="400" height="310" fill="url(#hsSky)"/><circle class="sc-sun" cx="200" cy="150" r="90"/>'+
    '<g class="sc-far"><path d="M0 230 L34 150 L58 214 L96 120 L132 220 L170 170 L200 226 L238 160 L270 222 L316 126 L350 214 L376 160 L400 220 L400 310 L0 310Z"/></g>'+
    '<g class="sc-castle"><path d="M30 310 V180 L44 160 L58 180 V310Z"/><path d="M80 310 V150 L96 118 L112 150 V310Z"/><path d="M288 310 V158 L304 124 L320 158 V310Z"/><path d="M344 310 V190 L358 168 L372 190 V310Z"/><path d="M150 310 V196 H250 V310Z"/><path d="M164 196 V170 L176 150 L188 170 V196Z"/><path d="M212 196 V170 L224 150 L236 170 V196Z"/></g>'+
    '<g class="sc-wins">'+WIN(92,168,0)+WIN(98,190,.5)+WIN(300,176,1)+WIN(306,200,.2)+WIN(172,210,.8)+WIN(224,210,1.4)+WIN(52,200,.3)+WIN(364,206,1.1)+'</g>'+
    '<path class="sc-lava" d="M0 292 Q40 284 80 292 T160 292 T240 292 T320 292 T400 292 V310 H0Z"/><path class="sc-lava b" d="M0 300 Q50 294 100 300 T200 300 T300 300 T400 300 V310 H0Z"/>',
  spires:()=>'<rect width="400" height="310" fill="url(#hsSky)"/><circle class="sc-moon" cx="300" cy="70" r="30"/>'+
    '<path class="sc-aurora" d="M-20 90 C60 40 120 120 200 70 S340 30 420 80 V130 C340 90 280 150 200 110 S60 160 -20 130Z"/><path class="sc-aurora b" d="M-20 60 C80 20 140 90 220 50 S340 20 420 56 V84 C340 52 280 110 220 84 S80 110 -20 90Z"/>'+
    '<g class="sc-far"><path d="M0 240 L30 180 L56 236 L90 150 L124 240 L170 196 L210 244 L260 170 L300 240 L340 188 L372 238 L400 200 L400 310 L0 310Z"/></g>'+
    '<g class="sc-castle"><path d="M44 310 L70 120 L96 310Z"/><path d="M300 310 L328 90 L356 310Z"/><path d="M118 310 L140 180 L162 310Z"/><path d="M246 310 L268 170 L290 310Z"/></g>'+
    '<g class="sc-facet"><path d="M70 120 L96 310 L74 310Z"/><path d="M328 90 L356 310 L332 310Z"/><path d="M140 180 L162 310 L144 310Z"/><path d="M268 170 L290 310 L272 310Z"/></g>'+
    '<ellipse cx="200" cy="304" rx="210" ry="22" class="sc-haze"/>',
  palace:()=>'<rect width="400" height="310" fill="url(#hsSky)"/><circle class="sc-sunbig" cx="200" cy="120" r="150" fill="url(#hsSun)"/>'+
    '<g class="sc-rays">'+[0,30,60,90,120,150].map(a=>'<path transform="rotate('+a+' 200 120)" d="M196 -40 L204 -40 L216 120 L184 120Z"/>').join('')+'</g>'+
    '<g class="sc-castle"><rect x="0" y="262" width="400" height="48"/>'+[34,98,302,366].map((x,i)=>'<g><rect x="'+(x-13)+'" y="'+(i%2?90:70)+'" width="26" height="'+(262-(i%2?90:70))+'"/><rect x="'+(x-19)+'" y="'+(i%2?84:64)+'" width="38" height="10"/><rect x="'+(x-19)+'" y="254" width="38" height="12"/></g>').join('')+
    '<path d="M140 262 V196 Q200 150 260 196 V262Z"/></g>'+
    '<g class="sc-floor">'+[0,1,2,3,4,5,6].map(i=>'<path d="M'+(200+(i-3)*20)+' 262 L'+(200+(i-3)*90)+' 310"/>').join('')+'<path d="M0 280 H400 M0 296 H400"/></g>'+
    '<g class="sc-gold">'+[[60,150],[340,170],[130,70],[270,60],[200,30]].map((p,i)=>'<path style="animation-delay:'+(i*.4)+'s" d="M'+p[0]+' '+(p[1]-6)+' L'+(p[0]+2)+' '+(p[1]-2)+' L'+(p[0]+6)+' '+p[1]+' L'+(p[0]+2)+' '+(p[1]+2)+' L'+p[0]+' '+(p[1]+6)+' L'+(p[0]-2)+' '+(p[1]+2)+' L'+(p[0]-6)+' '+p[1]+' L'+(p[0]-2)+' '+(p[1]-2)+'Z"/>').join('')+'</g>'
};
A.scene=function(id){
  const r=HS.REALMS.find(x=>x.id===id)||HS.REALMS[0];
  return '<svg class="scn s-'+r.scene+'" viewBox="0 0 400 310" preserveAspectRatio="xMidYMax slice" aria-hidden="true">'+(SCENE[r.scene]||SCENE.gate)()+'</svg>';
};
A.mount=function(){
  if(document.getElementById('hsDefs'))return;
  const d=document.createElement('div');d.id='hsDefs';d.innerHTML=A.defs();document.body.insertBefore(d,document.body.firstChild);
};
})();
