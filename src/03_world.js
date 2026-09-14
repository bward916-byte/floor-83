// ===== world data: regions, buildings, hotspots, NPCs =====
const REGIONS = [
  {id:'city',    x0:-2000, x1:1650,  name:'Downtown'},
  {id:'suburbs', x0:1650,  x1:3800,  name:'The suburbs'},
  {id:'country', x0:3800,  x1:6800,  name:'Open country'},
  {id:'desert',  x0:6800,  x1:9800,  name:'The desert'},
  {id:'casino',  x0:9800,  x1:12400, name:'Lucky Flats'}
];
function regionAt(x){ return REGIONS.find(r=>x>=r.x0&&x<r.x1)||REGIONS[0]; }

// street-level buildings (facades). floors = count; kind drives the look.
const BUILDINGS = [
  {id:'alleyBldg', x:-560, w:360, floors:12, kind:'brick', color:'#9a6a52'},
  {id:'tower',     x:TOWER.x, w:TOWER.w, floors:TOWER.floors, kind:'tower', color:'#c9c4b8'},
  {id:'store',     x:480,  w:280, floors:3,  kind:'shop', color:'#e0c98f', sign:'CORNER MARKET', door:600, interior:{x0:500,x1:740}},
  {id:'diner',     x:800,  w:280, floors:2,  kind:'diner', color:'#d8dee6', sign:'DINER', door:920, interior:{x0:820,x1:1060}},
  {id:'office',    x:1140, w:380, floors:22, kind:'glass', color:'#8fb3d9', sign:'BRANDT & CO', door:1330, interior:{x0:1160,x1:1500}},
  // suburbs
  {id:'h1', x:1900, w:160, floors:2, kind:'house', color:'#e8dcc4'},
  {id:'h2', x:2150, w:180, floors:1, kind:'house', color:'#cfd9c8'},
  {id:'h3', x:2450, w:160, floors:2, kind:'house', color:'#e6cfc8'},
  {id:'h4', x:2800, w:200, floors:2, kind:'house', color:'#d9d3e6'},
  {id:'h5', x:3150, w:170, floors:1, kind:'house', color:'#e8dcc4'},
  {id:'strip', x:3400, w:300, floors:1, kind:'shop', color:'#cfc2a8', sign:'LAUNDRY  •  PIZZA'},
  // country
  {id:'barn', x:4400, w:260, floors:2, kind:'barn', color:'#a8332a'},
  {id:'silo', x:4700, w:60, floors:5, kind:'silo', color:'#c8c8c0'},
  {id:'farmstand', x:5200, w:140, floors:1, kind:'stand', color:'#d9b36a', sign:'PEACHES'},
  {id:'farmhouse', x:5700, w:200, floors:2, kind:'house', color:'#f0ece0'},
  // desert
  {id:'gas', x:7900, w:260, floors:1, kind:'gas', color:'#e8e2d0', sign:'LAST GAS', door:8020, interior:{x0:7920,x1:8140}},
  {id:'motel', x:8900, w:320, floors:2, kind:'motel', color:'#d6a26a', sign:'SANDS MOTEL'},
  // casino city
  {id:'c1', x:9950, w:200, floors:6, kind:'neon', color:'#3b2a5a', sign:'PAWN'},
  {id:'c2', x:10200, w:160, floors:4, kind:'neon', color:'#5a2a3b', sign:'CHAPEL'},
  {id:'casino', x:10400, w:520, floors:10, kind:'casino', color:'#2a2a4a', sign:'THE GRAND SPADE', door:10660, interior:{x0:10420,x1:10900}},
  {id:'c3', x:11000, w:220, floors:8, kind:'neon', color:'#2a4a5a', sign:'MOTOR LODGE'},
  {id:'c4', x:11300, w:180, floors:5, kind:'neon', color:'#5a3a2a', sign:'BUFFET'}
];
const BUS_STOPS = [
  {x:1600, name:'Downtown', region:'city'},
  {x:3820, name:'County line', region:'country'},
  {x:6840, name:'Desert edge', region:'desert'},
  {x:9840, name:'Lucky Flats', region:'casino'}
];

// hotspots: {x, floor (1|83|0 for street), inside (interior id or null), name, prompt, fn}
const HOT = [];
function hot(o){ HOT.push(o); return o; }
function nearHot(){
  let best=null, bd=1e9;
  for(const h of HOT){
    if(h.floor!==P.floor) continue;
    if((h.inside||null)!==(P.inside||null)) continue;
    if(h.when && !h.when()) continue;
    const d=Math.abs(h.x-P.x); const r=h.r||28;
    if(d<r && d<bd){ bd=d; best=h; }
  }
  return best;
}

// NPCs
const NPC = [];
function npc(o){ const r=makeRig(o); Object.assign(r, o); NPC.push(r); return r; }
function initNPCs(){
  npc({id:'earl', name:'Earl', x:-100, y:GROUND, floor:0, dir:1, h:39, shirt:'#6b6b5a', pants:'#4a4030', hair:'#777', hairStyle:'messy', beard:'#8a8a80', skin:'#d9b08c', cart:true});
  npc({id:'clerk', name:'Mina', x:700, y:GROUND, floor:0, inside:'store', dir:-1, h:38, shirt:'#3a7d5a', pants:'#333', hair:'#111', hairStyle:'bun', skin:'#c68e6a'});
  npc({id:'cook', name:'Sal', x:1020, y:GROUND, floor:0, inside:'diner', dir:-1, h:41, shirt:'#f0f0f0', pants:'#555', hair:'#222', hairStyle:'short', hat:'#f0f0f0', skin:'#e8b48c'});
  npc({id:'recept', name:'Dana', x:1460, y:GROUND, floor:0, inside:'office', dir:-1, h:38, shirt:'#4a4a6a', pants:'#222', hair:'#5a3a22', hairStyle:'bun', skin:'#f1c6a0'});
  npc({id:'doorman', name:'Doorman', x:380, y:floorBottom(1), floor:1, dir:-1, h:41, shirt:'#5a1f1f', pants:'#222', hair:'#333', hairStyle:'short', hat:'#5a1f1f', skin:'#a9754f'});
  npc({id:'farmer', name:'June', x:5300, y:GROUND, floor:0, dir:-1, h:38, shirt:'#d9d2b0', pants:'#4a6a8a', hair:'#c9a26a', hairStyle:'bun', hat:'#d9b36a', skin:'#f0c19a'});
  npc({id:'gasguy', name:'Rudy', x:8100, y:GROUND, floor:0, inside:'gas', dir:-1, h:40, shirt:'#b8412e', pants:'#333', hair:'#222', hairStyle:'short', hat:'#b8412e', skin:'#c68e6a'});
  npc({id:'cage', name:'Cage', x:10450, y:GROUND, floor:0, inside:'casino', dir:1, h:38, shirt:'#222', pants:'#222', hair:'#111', hairStyle:'short', skin:'#e8b48c'});
  npc({id:'dealer', name:'Vera', x:10860, y:GROUND, floor:0, inside:'casino', dir:-1, h:39, shirt:'#7a1f3a', pants:'#111', hair:'#8a1a1a', hairStyle:'bun', skin:'#f1c6a0'});
  // wandering pedestrians (city + casino)
  const rs=srand(7);
  const shirts=['#4a86c8','#8a6a4a','#5a8a5a','#a04a4a','#6a4a8a','#c8a04a','#333','#d9d2b0'];
  for(let i=0;i<10;i++){
    const casino=i>=7;
    const x = casino? rnd(9900,12300) : rnd(-400,1600);
    G.ped.push(npc({id:'ped'+i, x, y:GROUND, floor:0, dir:rs()<0.5?-1:1, h:rnd(36,42), shirt:shirts[i%shirts.length], pants:rs()<0.5?'#2c3e60':'#444', hair:['#111','#5a3a22','#c9a26a','#777'][i%4], hairStyle:['short','messy','bun'][i%3], skin:['#f1c6a0','#c68e6a','#a9754f','#e8b48c'][i%4], walker:true, range:casino?[9900,12300]:[-450,1620], speed:rnd(30,55), pauseT:0}));
  }
}
function npcAt(id){ return NPC.find(n=>n.id===id); }
function updateNPCs(dt){
  for(const n of NPC){
    rigUpdate(n, dt);
    if(n.walker){
      if(n.pauseT>0){ n.pauseT-=dt; n.moving=false; continue; }
      n.moving=true; n.x += n.dir*n.speed*dt;
      if(n.x<n.range[0]){ n.dir=1; } if(n.x>n.range[1]){ n.dir=-1; }
      if(Math.random()<dt*0.05){ n.pauseT=rnd(1,4); if(Math.random()<0.5) n.dir*=-1; }
    }
  }
}
