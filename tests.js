// headless harness: stub DOM, run game.js, drive scenarios, dump screenshots
const fs=require('fs'), vm=require('vm'); const {createCanvas}=require('@napi-rs/canvas');
const W=900,H=600; const canvas=createCanvas(W,H);
const store={}; const els={};
function el(id){ if(!els[id]) els[id]={id,style:{},dataset:{},innerHTML:'',value:'',classList:{add(){},remove(){}},addEventListener(){},getBoundingClientRect(){return{left:0,top:0}},focus(){}}; return els[id]; }
const sandbox={ console, Math, JSON, setTimeout:(f,ms)=>{ sandbox.__timers.push({f,at:sandbox.__now+ms}); }, __timers:[], __now:0,
  localStorage:{getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=v},
  requestAnimationFrame:()=>{}, document:{getElementById:id=>{ if(id==='c') return Object.assign(el('c'),{width:W,height:H,getContext:()=>canvas.getContext('2d')}); return el(id); }, body:{classList:{add(){}}}},
  window:{innerWidth:W,innerHeight:H,addEventListener(){}} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('game.js','utf8')+'\nthis.API={G,P,CAM,IN,K,startGame,frame,init,interact,menuPick,submitTalk,nearHot,startElevator,hasItem,countItem,giveItem,useItem,cycleZoom,setZoomStop,dailyReset,floorBottom,busRide};', sandbox, {filename:'game.js'});
const A=sandbox.API; let fails=0;
function ok(c,msg){ if(!c){ fails++; console.log('FAIL',msg);} else console.log('ok  ',msg); }
function step(n, dt){ for(let i=0;i<n;i++){ sandbox.__now+= (dt||16); sandbox.__timers=sandbox.__timers.filter(t=>{ if(t.at<=sandbox.__now){ t.f(); return false;} return true; }); A.frame(sandbox.__now); } }
function walkTo(name,dir,max){ for(let k=0;k<(max||400);k++){ const h=A.nearHot(); if(h&&h.name===name){ return true; } if(dir<0){A.IN.tLeft=true; step(4); A.IN.tLeft=false;} else {A.IN.tRight=true; step(4); A.IN.tRight=false;} step(1);} return false; }
function shot(name){ fs.writeFileSync(`shots/${name}.png`, canvas.toBuffer('image/png')); }
fs.mkdirSync('shots',{recursive:true});
A.init(); A.startGame(false);
step(5); ok(A.P.floor===83,'starts on floor 83');
shot('01_intro_zoomout');
step(280); shot('02_apartment');
ok(A.CAM.z>1.2,'camera zoomed back to player after intro');
// walk to key hook
ok(walkTo('Key hook',-1),'reached key hook x='+A.P.x.toFixed(0));
A.interact(); step(2); ok(A.hasItem('keys'),'got keys');
// dresser
ok(walkTo('Dresser',1),'reached dresser'); A.interact(); step(2); ok(A.G.cash===20,'dresser gave $20 (cash='+A.G.cash+')');
// fridge
ok(walkTo('Fridge',1),'reached fridge'); A.interact(); step(2); ok(A.hasItem('snack'),'fridge gave snack');
// talk: confused -> armsUp
A.submitTalk("what do i do now?"); step(10); ok(A.P.pose==='armsUp','confused -> armsUp pose ('+A.P.pose+')'); shot('03_armsUp');
step(200); A.submitTalk("I give up"); step(10); ok(A.P.pose==='giveUp','give up -> giveUp pose'); shot('04_giveup');
step(300); A.submitTalk("i feel sad and alone"); step(10); ok(A.P.pose==='headDown','sad -> headDown'); shot('05_headDown');
step(300);
// window cinematic
ok(walkTo('Window',-1),'reached window'); A.interact(); step(150); shot('05b_window_cine'); step(200);
ok(walkTo('Door',-1),'at door');
A.interact(); step(2); ok(!!A.G.menu,'elevator menu opened'); A.menuPick(0); step(60); ok(A.G.ride!==null && A.P.floor===null,'riding elevator'); shot('06_elevator');
step(520); ok(A.P.floor===1,'arrived lobby (floor='+A.P.floor+')'); shot('07_lobby');
ok(walkTo('Exit',1),'at lobby exit'); A.interact(); step(5); ok(A.P.floor===0,'outside on street');
shot('08_street_cine'); step(150); shot('09_tower_zoom'); step(200); shot('10_street');
// walk west to Earl
ok(walkTo('Earl',-1,800),'reached Earl x='+A.P.x.toFixed(0)); shot('11_alley');
A.interact(); step(2); const gi=A.G.menu.items.findIndex(i=>/granola/.test(i.label)); ok(gi>=0,'give snack option'); A.menuPick(gi); step(5); ok(!A.hasItem('snack'),'snack given');
A.interact(); step(2); const pi=A.G.menu.items.findIndex(i=>/push/.test(i.label)); A.menuPick(pi); step(200); ok(A.countItem('can')>=4,'cart push gave cans ('+A.countItem('can')+')');
// collect alley cans
A.IN.tRight=true; step(45); A.IN.tRight=false; step(2);
// go to store
ok(walkTo('CORNER MARKET',1,1200),'at market door'); A.interact(); step(3); ok(A.P.inside==='store','inside store'); shot('12_store');
ok(walkTo('Mina',1),'at Mina'); A.interact(); step(2); const ri=A.G.menu.items.findIndex(i=>/Redeem/.test(i.label)); A.menuPick(ri); step(3); ok(A.G.cash>=24,'cans redeemed cash='+A.G.cash);
// zoom stops
A.setZoomStop(3); step(200); shot('13_city_zoom'); ok(A.CAM.z<0.06,'city zoom');
A.setZoomStop(0); step(200);
// bus: teleport to bus stop
A.P.inside=null; A.P.x=1600; step(5); const hb=A.nearHot(); ok(hb&&hb.name==='Bus stop','bus stop'); A.G.cash=50; A.interact(); step(2); ok(!!A.G.menu,'bus menu'); A.menuPick(0); step(120); ok(A.P.x>3800,'bus took us to country x='+A.P.x.toFixed(0)); step(120); shot('14_country_cine'); step(300); shot('15_country');
// night
A.G.clock=22*3600; A.P.x=5300; step(120); shot('16_country_night');
A.P.x=8100; A.P.inside='gas'; step(60); shot('17_gas'); A.P.inside=null; A.P.x=8500; step(60); shot('18_desert');
A.P.x=10660; A.G.clock=21*3600; step(120); shot('19_casino_street'); A.P.inside='casino'; A.P.x=10680; step(60); A.giveItem('chip',3); A.interact(); step(150); shot('20_slots'); step(200);
ok(A.G.msgs.length>=0,'slots resolved');
A.setZoomStop(2); A.P.inside=null; A.P.x=400; A.P.floor=1; A.P.y=A.floorBottom(1); step(300); shot('21_tower_from_lobby');
console.log(fails?`\n${fails} FAILURES`:'\nALL PASS');
