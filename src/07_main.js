// ===== main loop =====
let ctx, last=0, started=false;
function startGame(cont){
  document.getElementById('title').style.display='none';
  buildHotspots(); initNPCs();
  if(!(cont && loadGame())){ dailyReset(); G.clock=8*3600; }
  CAM.x=P.x; CAM.y=P.y-20; CAM.z=0.06; CAM.target=0.06;
  G.cine={kind:'intro',t:0,out:0.11,msg:'Floor 83. That is you.'};
  started=true; setLoc();
  if(!cont) say('Talk to me any time — press T or tap TALK.',5000);
}
function frame(ts){
  requestAnimationFrame(frame);
  const dt=Math.min(0.05,(ts-last)/1000||0.016); last=ts; G.t+=dt; G.dt=dt;
  if(!started){ return; }
  pollInput();
  G.clock=(G.clock + dt*(86400/DAY_SECONDS))%86400;
  if(IN.actEdge){ IN.actEdge=false; if(G.menu){} else if(!G.talk.open&&!G.ride&&!G.fade) interact(); }
  playerUpdate(dt); elevatorUpdate(dt); fadeUpdate(dt); slotUpdate(dt); updateNPCs(dt); camUpdate(dt);
  for(const m of G.msgs) m.t+=dt; G.msgs=G.msgs.filter(m=>m.t<m.life);
  G.saveT+=dt; if(G.saveT>15){ G.saveT=0; saveGame(); }
  drawWorld(ctx); drawHUD(ctx); syncDOM();
}
function init(){ ctx=document.getElementById('c').getContext('2d'); setupDOM(); requestAnimationFrame(frame); }
if(typeof window!=='undefined' && typeof document!=='undefined') window.addEventListener('load',init);
