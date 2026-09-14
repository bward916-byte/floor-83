// ===== player, interactions, quests, elevator, bus, talk =====
const P = makeRig({x:230, y:floorBottom(TOWER.homeFloor), dir:1, h:PLAYER_H, shirt:'#d9534f', pants:'#2c3e60', hair:'#3a2414', hairStyle:'short', skin:'#f1c6a0'});
P.floor = TOWER.homeFloor; P.inside=null; P.speed=125; P.sitting=false;
G.cans=[]; G.cacti=[]; G.coins=[]; G.lastElevFloor=1;

function dailyReset(){
  G.flags.day=(G.flags.day||0)+1; G.flags.snackToday=false; G.flags.crates=false; G.flags.windshield=false; G.flags.courier=false; G.flags.cactiToday=0;
  G.cans=[]; for(let i=0;i<6;i++) G.cans.push({x:-180+i*26+rnd(-6,6), taken:false});
  G.cacti=[]; for(let i=0;i<3;i++) G.cacti.push({x:8560+i*40, h:24+i*6, taken:false});
  genCoins();
}
function genCoins(){ G.coins=[]; for(let i=0;i<8;i++) G.coins.push({x:irnd(-400,1550), v:irnd(1,3), taken:false}); for(let i=0;i<4;i++) G.coins.push({x:irnd(9900,12300), v:irnd(1,3), taken:false}); }
function bounds(){
  if(P.floor===TOWER.homeFloor) return [96,396];
  if(P.floor===1) return [16,404];
  if(P.inside){ const b=BUILDINGS.find(b=>b.id===P.inside); return [b.interior.x0+8,b.interior.x1-8]; }
  return [-540, 12380];
}
function setLoc(){
  if(P.floor===TOWER.homeFloor) G.locName='Apartment 8307'; else if(P.floor===1) G.locName='Lobby';
  else if(P.inside) G.locName={store:'Corner Market',diner:'Diner',office:'Brandt & Co lobby',gas:'Last Gas',casino:'The Grand Spade'}[P.inside];
  else G.locName=regionAt(P.x).name;
}
function playerUpdate(dt){
  if(G.ride||G.cine&&G.cine.lock||G.fade){ P.moving=false; rigUpdate(P,dt); return; }
  const mv = (IN.right?1:0)-(IN.left?1:0);
  if(mv!==0 && !G.talk.open && !G.invOpen){
    if(P.sitting){ P.sitting=false; P.pose='idle'; }
    if(P.emoteT>0 && P.pose!=='idle'){ P.emoteT=0; P.pose='idle'; }
    P.dir=mv; P.x+=mv*P.speed*dt; P.moving=true;
    const [a,b]=bounds(); if(P.x<a){ P.x=a; } if(P.x>b){ P.x=b; }
    // desert heat gate
    if(P.x>8200 && P.floor===0 && !P.inside && !hasItem('water') && !G.flags.deserted){ P.x=8200; if(!G.flags.heatWarn||G.t-G.flags.heatWarn>4){ G.flags.heatWarn=G.t; say('Too hot to go on without water. Last Gas is right back there.'); rigSetPose(P,'facepalm',1.5);} }
  } else P.moving=false;
  // stray region tracking + cinematic on first entry
  if(!P.floor && !P.inside){ const r=regionAt(P.x); if(r.id!==G.region){ G.region=r.id; if(!G.flags['seen_'+r.id]){ G.flags['seen_'+r.id]=true; cinematic('city', r.name); } else say(r.name,2000); } }
  // coins
  if(!P.floor&&!P.inside){ for(const c of G.coins){ if(!c.taken&&Math.abs(c.x-P.x)<10){ c.taken=true; addCash(c.v); } } for(const c of G.cans){ if(!c.taken&&Math.abs(c.x-P.x)<8){ c.taken=true; giveItem('can'); } } }
  rigUpdate(P,dt); setLoc();
}

// ----- elevator -----
function startElevator(toFloor){
  const from=P.floor; if(from===toFloor) return;
  G.ride={from,to:toFloor,t:0,dur:Math.min(6,1.2+Math.abs(from-toFloor)*0.06),y:floorBottom(from)};
  P.floor=null; P.rideFloor=from; CAM.target=Math.min(CAM.target,0.7);
  say(toFloor===1?'Going down.':'Going up.',1500);
}
function elevatorUpdate(dt){
  const r=G.ride; if(!r) return; r.t+=dt; const t=ease(clamp(r.t/r.dur,0,1));
  r.y=lerp(floorBottom(r.from),floorBottom(r.to),t); P.y=r.y; P.x=TOWER.shaftX+TOWER.shaftW/2;
  if(r.t>=r.dur+0.4){ P.floor=r.to; P.y=floorBottom(r.to); P.x=TOWER.shaftX+TOWER.shaftW/2+40; P.dir=1; G.lastElevFloor=r.to; G.ride=null; CAM.target=ZOOM_STOPS[0].z; say(r.to===1?'Lobby.':'Floor 83.',1500); }
}

// ----- bus -----
function busRide(stop){
  const others=BUS_STOPS.filter(s=>s!==stop && (G.flags['seen_'+s.region]||s.region==='country'||s.region==='city'));
  if(!others.length){ say('Nowhere to go yet.'); return; }
  const fare = hasItem('ticket')?0:10;
  if(fare && G.cash<fare){ say(`Fare is $${fare}. You have $${G.cash}.`); rigSetPose(P,'shrug',1.5); return; }
  openMenu('Bus to…', others.map(s=>({label:`${s.name}${fare?` ($${fare})`:''}`, fn:()=>{ addCash(-fare); fadeTo(()=>{ P.x=s.x+60; G.region=regionAt(P.x).id; setLoc(); CAM.x=P.x; if(!G.flags['seen_'+s.region]){ G.flags['seen_'+s.region]=true; cinematic('city', s.name);} else say(s.name,2000); G.clock+=1800; }); }})));
}
function fadeTo(fn){ G.fade={t:0,fn}; }
function fadeUpdate(dt){ const f=G.fade; if(!f) return; f.t+=dt; if(f.t>0.6&&!f.done){ f.done=true; f.fn(); } if(f.t>1.2) G.fade=null; }

// ----- menus -----
function openMenu(title, items){ G.menu={title, items:items.concat([{label:'Never mind', fn:()=>{}}])}; }
function menuPick(i){ const m=G.menu; if(!m) return; G.menu=null; if(m.items[i]) m.items[i].fn(); }

// ----- hotspots -----
function buildHotspots(){
  const H=TOWER.homeFloor;
  hot({x:98,floor:H,r:16,name:'Door',fn:()=>{ if(!hasItem('keys')){ say('Keys. Grab your keys first.'); rigSetPose(P,'facepalm',1.4); return;} G.flags.lightsOn=false; openMenu('Elevator', [{label:'Lobby (1)',fn:()=>startElevator(1)}]); }});
  hot({x:124,floor:H,r:14,name:'Key hook',when:()=>!hasItem('keys'),fn:()=>{ giveItem('keys'); }});
  hot({x:150,floor:H,name:'Bed',prompt:'Sleep',fn:()=>{ fadeTo(()=>{ G.clock=7*3600; dailyReset(); say('Morning. Day '+G.flags.day+'.'); }); rigSetPose(P,'sleep',1.2); saveGame(); }});
  hot({x:193,floor:H,name:'Nightstand',when:()=>!hasItem('phone'),fn:()=>{ giveItem('phone'); }});
  hot({x:223,floor:H,name:'Dresser',fn:()=>{ if(!G.flags.dresser){ G.flags.dresser=true; addCash(20); say('Twenty bucks in a sock. Not nothing.'); rigSetPose(P,'cheer',1.4);} else { say('Socks. Only socks.'); rigSetPose(P,'shrug',1.2);} }});
  hot({x:280,floor:H,name:'Couch',prompt:'Sit',fn:()=>{ P.sitting=!P.sitting; P.pose=P.sitting?'sit':'idle'; if(P.sitting) say('It sinks in the middle. Home.'); }});
  hot({x:335,floor:H,name:'TV',fn:()=>{ G.flags.tvOn=!G.flags.tvOn; say(G.flags.tvOn?['"...and that was the weather. Back to you."','"Tonight: is your city too tall? Experts weigh in."','"...eighty-third floor. Can you imagine?"'][irnd(0,2)]:'Click.'); }});
  hot({x:389,floor:H,name:'Fridge',fn:()=>{ if(!G.flags.snackToday){ G.flags.snackToday=true; giveItem('snack'); } else { say('Mustard and one granola bar you already took.'); rigSetPose(P,'shrug',1.2);} }});
  hot({x:315,floor:H,name:'Window',prompt:'Look out',fn:()=>{ cinematic('tower','Eighty-three floors up. You live here.'); rigSetPose(P,'think',3); }});
  hot({x:142,floor:H,name:'Light switch',r:10,fn:()=>{ G.flags.lightsOn=!G.flags.lightsOn; }});
  // lobby
  hot({x:20,floor:1,name:'Elevator',fn:()=>openMenu('Elevator',[{label:'Home (83)',fn:()=>startElevator(83)}])});
  hot({x:210,floor:1,name:'Mailbox',fn:()=>{ if(!G.flags.mail){ G.flags.mail=true; say('A flyer: "LUCKY FLATS — where the road ends and luck begins." Somebody keeps sending these.'); rigSetPose(P,'think',2);} else { say('Empty.'); } }});
  hot({x:380,floor:1,name:'Doorman',fn:()=>{ const l=['"Morning. Eighty-three, right? Long way up."','"Rain later. Or not. I only see the lobby."','"Guy in the alley — Earl. He is alright. Say hi."']; say(l[irnd(0,2)]); rigSetPose(npcAt('doorman'),'wave',1.5); }});
  hot({x:397,floor:1,name:'Exit',prompt:'Go outside',fn:()=>{ P.floor=0; P.y=GROUND; P.x=440; G.lastElevFloor=1; G.region='city'; if(!G.flags.seen_city){ G.flags.seen_city=true; cinematic('tower','The building. You are the red dot.'); } }});
  // street
  hot({x:412,floor:0,name:'Tower entrance',prompt:'Go in',fn:()=>{ P.floor=1; P.y=floorBottom(1); P.x=380; P.dir=-1; }});
  hot({x:-100,floor:0,r:40,name:'Earl',fn:()=>talkEarl()});
  for(const b of BUILDINGS) if(b.door&&b.interior) hot({x:b.door,floor:0,name:b.sign,prompt:P.inside?'Leave':'Enter',fn:()=>{ P.inside=b.id; P.x=b.door; }});
  for(const b of BUILDINGS) if(b.door&&b.interior) hot({x:b.door,floor:0,inside:b.id,name:'Door',prompt:'Leave',fn:()=>{ P.inside=null; P.x=b.door; }});
  hot({x:700,floor:0,inside:'store',r:36,name:'Mina',fn:()=>shopStore()});
  hot({x:1020,floor:0,inside:'diner',r:36,name:'Sal',fn:()=>shopDiner()});
  hot({x:1460,floor:0,inside:'office',r:36,name:'Dana',fn:()=>office()});
  for(const s of BUS_STOPS) hot({x:s.x,floor:0,r:30,name:'Bus stop',prompt:'Wait for bus',fn:()=>busRide(s)});
  hot({x:5300,floor:0,r:40,name:'June',fn:()=>farm()});
  hot({x:8100,floor:0,inside:'gas',r:36,name:'Rudy',fn:()=>gas()});
  hot({x:8580,floor:0,r:50,name:'Cactus patch',prompt:'Dig one up',fn:()=>{ const c=G.cacti.find(c=>!c.taken); if(!c){ say('Leave some for the desert.'); return;} if(G.flags.cactiToday>=3){ say('Enough for today.'); return;} c.taken=true; G.flags.cactiToday++; giveItem('cactus'); rigSetPose(P,'cheer',1); }});
  hot({x:10450,floor:0,inside:'casino',r:36,name:'Cage',fn:()=>cage()});
  hot({x:10680,floor:0,inside:'casino',r:60,name:'Slot machine',prompt:'Play (1 chip)',fn:()=>slots()});
  hot({x:10860,floor:0,inside:'casino',r:36,name:'Vera',fn:()=>{ say(['"Blackjack table opens later. Try the slots, hon."','"Earl sent you? He owes me twenty."','"Nobody leaves here even. That is the whole trick."'][irnd(0,2)]); }});
}
function interact(){
  const h=nearHot(); if(!h) return; if(P.sitting && h.name!=='Couch'){ P.sitting=false; P.pose='idle'; }
  h.fn();
}
// ----- shops & quests -----
function talkEarl(){
  const e=npcAt('earl'); e.dir=P.x<e.x?-1:1;
  const opts=[];
  const grat=G.flags.earl||0;
  opts.push({label:'Talk', fn:()=>{ const l=grat<2?['"Eighty-three floors. You ever wonder what is holding you up?"','"Cans are a dollar at the market. That is the economy."','"This cart has seen more of this city than you have."']:['"Slots at the Grand Spade run loose before noon. Do not ask how I know."','"Take the bus. Walking to Lucky Flats is a bad idea. I did it."','"You are alright, kid."']; say(l[irnd(0,2)]); rigSetPose(e,'shrug',1.5); }});
  if(hasItem('snack')) opts.push({label:'Give granola bar', fn:()=>{ takeItem('snack'); G.flags.earl=grat+1; say('"Huh. Thanks."'); rigSetPose(e,'cheer',1.5); earlReward(); }});
  if(G.cash>=5) opts.push({label:'Give $5', fn:()=>{ addCash(-5); G.flags.earl=grat+1; say('"I will not forget it."'); rigSetPose(e,'wave',1.5); earlReward(); }});
  opts.push({label:'Help push the cart', fn:()=>{ rigSetPose(P,'push',2.5); rigSetPose(e,'push',2.5); setTimeout(()=>{ giveItem('can',4); say('"Found these behind the dumpster. Yours."'); },2200); }});
  openMenu('Earl', opts);
}
function earlReward(){ if((G.flags.earl||0)===2 && !G.flags.earlChip){ G.flags.earlChip=true; setTimeout(()=>{ say('"Here. A lucky chip. And listen — the slots at the Grand Spade run loose before noon."',4500); giveItem('chip'); rigSetPose(P,'cheer',1.5); },1800); } }
function shopStore(){
  const n=countItem('can'); const opts=[];
  if(n) opts.push({label:`Redeem ${n} cans (+$${n})`, fn:()=>{ takeItem('can',n); addCash(n); rigSetPose(P,'cheer',1.2); }});
  if(countItem('cactus')) opts.push({label:`Sell cactus (+$20)`, fn:()=>{ takeItem('cactus'); addCash(20); say('"A real desert one? People pay for this."'); }});
  opts.push({label:'Water ($2)', fn:()=>buy('water',2)}); opts.push({label:'Granola bar ($2)', fn:()=>buy('snack',2)});
  if(!hasItem('ticket')) opts.push({label:'Bus pass ($40)', fn:()=>buy('ticket',40)});
  openMenu('Corner Market', opts);
}
function buy(id,price){ if(G.cash<price){ say(`You have $${G.cash}. It costs $${price}.`); rigSetPose(P,'shrug',1.4); return;} if(giveItem(id)) addCash(-price); }
function shopDiner(){
  const opts=[{label:'Coffee ($3)', fn:()=>buy('coffee',3)}, {label:'Pie ($4)', fn:()=>{ if(G.cash<4){ say('Four bucks.'); return;} addCash(-4); say('Cherry. Worth it.'); rigSetPose(P,'cheer',1.2); }}];
  if(hasItem('envelope')) opts.unshift({label:'Deliver envelope (+$40)', fn:()=>{ takeItem('envelope'); addCash(40); G.flags.courier=true; say('"Finally. Tell Dana thanks." He hands you two twenties.'); rigSetPose(P,'cheer',1.5); }});
  openMenu('Sal', opts);
}
function office(){
  const opts=[];
  if(!hasItem('envelope')&&!G.flags.courier) opts.push({label:'Take courier job', fn:()=>{ giveItem('envelope'); say('"Take this to Sal at the diner. Forty on delivery."'); }});
  else opts.push({label:'Talk', fn:()=>{ say(G.flags.courier?'"Come back tomorrow, there is always another envelope."':'"The diner. Down the block. Go."'); }});
  openMenu('Dana', opts);
}
function farm(){
  const opts=[{label:'Peaches ($2)', fn:()=>buy('peach',2)}];
  if(!G.flags.crates) opts.push({label:'Help stack crates (+$15)', fn:()=>{ G.flags.crates=true; rigSetPose(P,'push',3); rigSetPose(npcAt('farmer'),'cheer',3); setTimeout(()=>{ addCash(15); say('"Good back on you. Fifteen."'); },2800); }});
  if(countItem('cactus')) opts.push({label:'Talk about cactus', fn:()=>{ say('"Do not sell those here. City folks pay twenty. Casino gift shop pays more."'); }});
  opts.push({label:'Talk', fn:()=>{ say(['"Road goes on through the desert to Lucky Flats. Take water."','"City boy, huh? You can tell. It is the shoes."'][irnd(0,1)]); rigSetPose(npcAt('farmer'),'wave',1.5); }});
  openMenu('June', opts);
}
function gas(){
  const opts=[{label:'Water ($4)', fn:()=>buy('water',4)}];
  if(!G.flags.windshield) opts.push({label:'Wash windshields (+$10)', fn:()=>{ G.flags.windshield=true; rigSetPose(P,'push',2.5); setTimeout(()=>{ addCash(10); say('"Not bad. Ten."'); },2200); }});
  opts.push({label:'Talk', fn:()=>{ say(['"Cactus patch past the motel. Do not take more than you carry."','"Lucky Flats? Twenty miles. The bus stops here at the edge."'][irnd(0,1)]); }});
  openMenu('Rudy', opts);
}
function cage(){
  const opts=[{label:'Buy 1 chip ($5)', fn:()=>buy('chip',5)},{label:'Buy 5 chips ($25)', fn:()=>{ if(G.cash<25){ say('Twenty-five.'); return;} addCash(-25); giveItem('chip',5); }}];
  const n=countItem('chip'); if(n) opts.unshift({label:`Cash out ${n} chips (+$${n*5})`, fn:()=>{ takeItem('chip',n); addCash(n*5); rigSetPose(P,'cheer',1.5); }});
  if(countItem('cactus')) opts.push({label:'Sell cactus at gift shop (+$30)', fn:()=>{ takeItem('cactus'); addCash(30); }});
  openMenu('Cage', opts);
}
function slots(){
  if(!countItem('chip')){ say('No chips. The cage sells them.'); rigSetPose(P,'shrug',1.4); return; }
  takeItem('chip'); const loose = hourNow()<12 && (G.flags.earl||0)>=2;
  const r=Math.random()*(loose?0.75:1);
  G.slot={t:0, reels:[irnd(0,4),irnd(0,4),irnd(0,4)], win:0};
  if(r<0.05){ G.slot.reels=[3,3,3]; G.slot.win=10; } else if(r<0.18){ const k=irnd(0,4); G.slot.reels=[k,k,k]; G.slot.win=4; } else if(r<0.42){ const k=irnd(0,4); G.slot.reels=[k,k,irnd(0,4)]; if(G.slot.reels[2]===k) G.slot.reels[2]=(k+1)%5; G.slot.win=1; } else { if(G.slot.reels[0]===G.slot.reels[1]) G.slot.reels[1]=(G.slot.reels[1]+1)%5; }
}
function slotUpdate(dt){ const s=G.slot; if(!s) return; s.t+=dt; if(s.t>2.2&&!s.done){ s.done=true; if(s.win>=10){ giveItem('chip',10); say('JACKPOT. Ten chips.'); rigSetPose(P,'cheer',2.5);} else if(s.win>=4){ giveItem('chip',4); say('Three of a kind. Four chips.'); rigSetPose(P,'cheer',1.5);} else if(s.win){ giveItem('chip'); say('Chip back. Even.'); } else { say(['Nothing.','House wins.','Almost.'][irnd(0,2)]); rigSetPose(P,'headDown',1.6);} } if(s.t>3.2) G.slot=null; }

// ----- talking to the game -----
function openTalk(){ G.talk.open=true; setTimeout(()=>{ const el=document.getElementById('talkIn'); if(el){ el.value=''; el.focus(); } },0); }
function submitTalk(text){
  text=(text||'').trim(); G.talk.open=false; if(!text) return;
  const t=text.toLowerCase(); G.talk.log.push({who:'you',text});
  let reply, pose;
  const hint = hintFor();
  if(/give up|quit|forget it|i.?m done|whatever/.test(t)){ pose='giveUp'; reply='Nope. Sit down for a second if you want, but you are not quitting on floor eighty-three. '+hint; }
  else if(/(sad|lonely|tired|depress|broke|miss|hopeless|alone)/.test(t)){ pose='headDown'; reply='Yeah. It is a big city and a small apartment. Go outside — Earl in the alley is decent company, and the diner has pie. '+hint; }
  else if(/(confus|lost|what do i|what now|how do i|\?$|huh|what)/.test(t)){ pose='armsUp'; reply=hint; }
  else if(/(hi|hello|hey|yo)\b/.test(t)){ pose='wave'; reply='Hey. You are the guy on 83. I am the voice. Ask me anything, or just walk.'; }
  else if(/(thank|thanks|nice|cool|great|love)/.test(t)){ pose='cheer'; reply='Anytime. Go make some money.'; }
  else if(/(money|cash|rich|dollar|broke)/.test(t)){ pose='think'; reply=`You have $${G.cash}. Cans redeem at the market, Dana at the office has courier work, June pays for crate stacking, and desert cacti sell for $20–30. Or the slots, if you like losing.`; }
  else if(/(zoom|where am i|map|building)/.test(t)){ pose='think'; reply='Use the zoom buttons or Z to pull back — Tower shows the whole building, City shows the block. You are the red dot.'; setZoomStop(2); }
  else if(/(who are you|what are you)/.test(t)){ pose='shrug'; reply='Narrator. Conscience. The thing that says "you forgot your keys." Pick one.'; }
  else if(/(bus|casino|desert|country|road|trip|leave|travel)/.test(t)){ pose='think'; reply='East end of downtown has a bus stop. Ten bucks a hop, or forty for a pass at the market. The road goes suburbs, country, desert, then Lucky Flats.'; }
  else if(/(earl|homeless|cart)/.test(t)){ pose='think'; reply='Earl lives in the alley west of the tower with his cart. Be decent to him. He knows things.'; }
  else { pose='think'; reply=['Noted.','I hear you.','Sure. Keep moving.','Fair enough.'][irnd(0,3)]+' '+hint; }
  rigSetPose(P,pose, pose==='headDown'||pose==='giveUp'?3.5:2.2);
  say(reply, 5200); G.talk.log.push({who:'game',text:reply});
}
function hintFor(){
  if(P.floor===TOWER.homeFloor){ if(!hasItem('keys')) return 'Grab the keys off the hook by the door.'; if(!G.flags.dresser) return 'Check the dresser. Then the door.'; return 'Keys, phone, snack from the fridge, then the door to the elevator.'; }
  if(P.floor===1) return 'Mailbox on your right, exit at the far end.';
  if(P.inside==='store') return 'Mina buys cans and sells water. A bus pass is $40.';
  if(P.inside==='casino') return 'Buy chips at the cage, feed the slots, cash out before you lose it all.';
  const r=regionAt(P.x).id;
  if(r==='city') return 'West is the alley with Earl. East is the market, the diner, the office, and the bus stop.';
  if(r==='suburbs') return 'Nothing but houses. Keep east to the county line.';
  if(r==='country') return 'June at the peach stand pays for help. Bus stop at the county line.';
  if(r==='desert') return 'Last Gas sells water. Cactus patch past the motel. Bus stop at the edge.';
  return 'The Grand Spade is the big one with the spade on top.';
}

// ----- save / load -----
function saveGame(){ try{ localStorage.setItem('floor83', JSON.stringify({cash:G.cash, inv:G.inv, flags:G.flags, clock:G.clock, x:P.x, floor:P.floor, inside:P.inside, cans:G.cans, cacti:G.cacti})); }catch(e){} }
function loadGame(){ try{ const d=JSON.parse(localStorage.getItem('floor83')); if(!d) return false; G.cash=d.cash; G.inv=d.inv; G.flags=d.flags; G.clock=d.clock; P.x=d.x; P.floor=d.floor; P.inside=d.inside; if(d.cans) G.cans=d.cans; if(d.cacti) G.cacti=d.cacti; P.y=P.floor?floorBottom(P.floor):GROUND; G.region=regionAt(P.x).id; genCoins(); if(!G.cans.length&&!G.cacti.length){ dailyReset(); } return true; }catch(e){ return false; } }
