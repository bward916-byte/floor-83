'use strict';
// ===== FLOOR 83 — core: constants, state, utils, input =====
const FH = 44;               // floor height (world units)
const TOWER = {x:0, w:420, floors:84, shaftX:44, shaftW:40, homeFloor:83};
const GROUND = 0;            // street level y (world y grows downward)
const PLAYER_H = 40;
const DAY_SECONDS = 720;     // one full in-game day in real seconds
const ZOOM_STOPS = [{n:'Me',z:1.6},{n:'Floor',z:0.7},{n:'Tower',z:0.13},{n:'City',z:0.045}];

const G = {
  t:0, dt:0, clock:8*3600, // seconds of day, start 8am
  cash:0, inv:[null,null,null,null,null,null],
  flags:{}, msgs:[], talk:{open:false,text:'',log:[]},
  cine:null, paused:false, invOpen:false, elevator:null, ride:null,
  region:'apartment', locName:'Apartment 8307',
  ped:[], coins:[], canvasW:800, canvasH:600, touch:false, saveT:0
};

function floorTop(f){ return GROUND - f*FH; }           // y of ceiling of floor f
function floorBottom(f){ return GROUND - (f-1)*FH; }    // y of floor slab of floor f
function clamp(v,a,b){ return v<a?a:v>b?b:v; }
function lerp(a,b,t){ return a+(b-a)*t; }
function ease(t){ return t<0.5?2*t*t:-1+(4-2*t)*t; }
function rnd(a,b){ return a+Math.random()*(b-a); }
function irnd(a,b){ return Math.floor(rnd(a,b+1)); }
function srand(seed){ let s=seed|0||1; return ()=>{ s=(s*1103515245+12345)&0x7fffffff; return s/0x7fffffff; }; }
function hexLerp(a,b,t){
  const pa=parseInt(a.slice(1),16), pb=parseInt(b.slice(1),16);
  const r=lerp(pa>>16,pb>>16,t), g=lerp((pa>>8)&255,(pb>>8)&255,t), bl=lerp(pa&255,pb&255,t);
  return `rgb(${r|0},${g|0},${bl|0})`;
}
function fmtClock(){ const h=Math.floor(G.clock/3600)%24, m=Math.floor(G.clock/60)%60; const ap=h>=12?'pm':'am'; return `${((h+11)%12)+1}:${m<10?'0':''}${m} ${ap}`; }
function say(txt, ms){ G.msgs.push({txt, t:0, life:(ms||3200)/1000}); if(G.msgs.length>4) G.msgs.shift(); }
function addCash(n){ G.cash=Math.max(0,G.cash+n); if(n>0) say(`+$${n}`,1600); }
function hasItem(id){ return G.inv.some(s=>s&&s.id===id); }
function countItem(id){ const s=G.inv.find(s=>s&&s.id===id); return s?s.n:0; }
function giveItem(id, n){
  n=n||1; const def=ITEMS[id];
  let s=G.inv.find(s=>s&&s.id===id);
  if(s && def.stack){ s.n+=n; say(`${def.name} x${s.n}`,1800); return true; }
  const i=G.inv.indexOf(null); if(i<0){ say('Pockets are full.'); return false; }
  G.inv[i]={id,n}; say(`Got ${def.name}`,1800); return true;
}
function takeItem(id, n){
  n=n||1; const i=G.inv.findIndex(s=>s&&s.id===id); if(i<0) return false;
  const s=G.inv[i]; if(s.n<n) return false; s.n-=n; if(s.n<=0) G.inv[i]=null; return true;
}
const ITEMS = {
  keys:{name:'Keys', glyph:'key', stack:false, desc:'Apartment keys. Do not lose.'},
  phone:{name:'Phone', glyph:'phone', stack:false, desc:'12% battery. Classic.'},
  snack:{name:'Granola bar', glyph:'bar', stack:true, desc:'Eat it, or hand it to someone hungrier.'},
  can:{name:'Cans', glyph:'can', stack:true, desc:'Redeem at the corner store.'},
  coffee:{name:'Coffee', glyph:'cup', stack:true, desc:'Hot. Drinkable.'},
  water:{name:'Water', glyph:'bottle', stack:true, desc:'For the desert. Trust me.'},
  envelope:{name:'Envelope', glyph:'env', stack:false, desc:'Courier job for the diner.'},
  peach:{name:'Peaches', glyph:'peach', stack:true, desc:'From the farm stand.'},
  cactus:{name:'Cactus', glyph:'cactus', stack:true, desc:'Potted. Sells well in the city.'},
  chip:{name:'Casino chips', glyph:'chip', stack:true, desc:'Worth $5 each at the cage.'},
  ticket:{name:'Bus pass', glyph:'ticket', stack:false, desc:'Ride anywhere the bus goes.'}
};

// ---- input ----
const K = {};
const IN = {left:false,right:false,up:false,down:false,act:false,actEdge:false,zoomDelta:0};
function keyDown(e){
  if(G.talk.open){ return; }
  K[e.code]=true;
  if(e.code==='KeyE'||e.code==='Space'||e.code==='Enter'){ IN.actEdge=true; e.preventDefault(); }
  if(e.code==='KeyI') G.invOpen=!G.invOpen;
  if(e.code==='KeyT') openTalk();
  if(e.code==='KeyZ') cycleZoom();
  if(e.code==='Equal'||e.code==='NumpadAdd') CAM.target*=1.4;
  if(e.code==='Minus'||e.code==='NumpadSubtract') CAM.target/=1.4;
  if(e.code==='ArrowUp'||e.code==='ArrowDown'||e.code==='ArrowLeft'||e.code==='ArrowRight') e.preventDefault();
}
function keyUp(e){ K[e.code]=false; }
function pollInput(){
  IN.left = !!(K.KeyA||K.ArrowLeft||IN.tLeft);
  IN.right= !!(K.KeyD||K.ArrowRight||IN.tRight);
  IN.up   = !!(K.KeyW||K.ArrowUp);
  IN.down = !!(K.KeyS||K.ArrowDown);
}
