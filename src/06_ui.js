// ===== HUD, messages, menus (DOM), touch, inventory =====
const GLYPH = {
  key:(c,x,y)=>{ c.fillStyle='#e6c25a'; c.beginPath(); c.arc(x-6,y,5,0,7); c.fill(); c.fillRect(x-2,y-1.5,12,3); c.fillRect(x+6,y,2,4); c.fillRect(x+2,y,2,3); },
  phone:(c,x,y)=>{ c.fillStyle='#222'; c.fillRect(x-5,y-9,10,18); c.fillStyle='#4fd8ff'; c.fillRect(x-4,y-7,8,12); },
  bar:(c,x,y)=>{ c.fillStyle='#c8a070'; c.fillRect(x-9,y-4,18,8); c.fillStyle='#8a5a3a'; c.fillRect(x-9,y-4,18,2); },
  can:(c,x,y)=>{ c.fillStyle='#c8c8c8'; c.fillRect(x-4,y-8,8,16); c.fillStyle='#c8443a'; c.fillRect(x-4,y-3,8,6); },
  cup:(c,x,y)=>{ c.fillStyle='#f4f4f0'; c.fillRect(x-6,y-6,12,13); c.fillStyle='#6a3a1a'; c.fillRect(x-5,y-5,10,3); c.strokeStyle='#f4f4f0'; c.lineWidth=2; c.beginPath(); c.arc(x+7,y,3,-1.5,1.5); c.stroke(); },
  bottle:(c,x,y)=>{ c.fillStyle='#8fd0ff'; c.fillRect(x-4,y-5,8,14); c.fillStyle='#4a86c8'; c.fillRect(x-2,y-9,4,4); },
  env:(c,x,y)=>{ c.fillStyle='#f4e6c8'; c.fillRect(x-9,y-6,18,12); c.strokeStyle='#8a6a4a'; c.lineWidth=1; c.beginPath(); c.moveTo(x-9,y-6); c.lineTo(x,y+1); c.lineTo(x+9,y-6); c.stroke(); },
  peach:(c,x,y)=>{ c.fillStyle='#f0a050'; c.beginPath(); c.arc(x,y+1,7,0,7); c.fill(); c.fillStyle='#3a8a4a'; c.fillRect(x,y-8,5,3); },
  cactus:(c,x,y)=>{ c.fillStyle='#4a8a4a'; c.fillRect(x-3,y-8,6,14); c.fillRect(x-9,y-4,6,3); c.fillRect(x-9,y-6,3,6); c.fillRect(x+3,y-2,6,3); c.fillStyle='#b8623a'; c.fillRect(x-6,y+6,12,4); },
  chip:(c,x,y)=>{ c.fillStyle='#c8443a'; c.beginPath(); c.arc(x,y,8,0,7); c.fill(); c.fillStyle='#fff'; c.beginPath(); c.arc(x,y,4,0,7); c.fill(); },
  ticket:(c,x,y)=>{ c.fillStyle='#3a6ad0'; c.fillRect(x-9,y-5,18,10); c.fillStyle='#fff'; c.fillRect(x-6,y-1,12,2); }
};
function drawHUD(ctx){
  const W=G.canvasW, H=G.canvasH;
  ctx.textBaseline='middle';
  if(G.cine&&G.cine.t>0.2&&G.cine.t<4.2){ ctx.fillStyle='#1a1a1a'; ctx.fillRect(0,0,W,34); ctx.fillRect(0,H-34,W,34); }
  // top-left card
  ctx.fillStyle='rgba(20,20,26,0.72)'; ctx.fillRect(10,10,190,58); ctx.strokeStyle='#1a1a1a'; ctx.lineWidth=2; ctx.strokeRect(10,10,190,58);
  ctx.fillStyle='#ffe14f'; ctx.font='bold 20px Georgia, serif'; ctx.textAlign='left'; ctx.fillText('$'+G.cash, 20, 30);
  ctx.fillStyle='#e8e4d8'; ctx.font='13px Georgia, serif'; ctx.fillText(fmtClock()+'  ·  '+G.locName, 20, 52);
  // messages
  let y=H-118; for(let i=G.msgs.length-1;i>=0;i--){ const m=G.msgs[i]; const a=clamp(Math.min(m.t*4, (m.life-m.t)*2),0,1); ctx.globalAlpha=a; ctx.font='15px Georgia, serif'; const lines=wrap(ctx,m.txt,W-60); for(let j=lines.length-1;j>=0;j--){ const tw=ctx.measureText(lines[j]).width; ctx.fillStyle='rgba(20,20,26,0.8)'; ctx.fillRect(W/2-tw/2-10,y-12,tw+20,24); ctx.fillStyle='#f4f1e6'; ctx.textAlign='center'; ctx.fillText(lines[j],W/2,y); y-=26; } y-=6; }
  ctx.globalAlpha=1;
  // hotspot prompt
  const h=nearHot(); if(h && !G.menu && !G.ride && !G.fade){ const [sx,sy]=w2s(P.x,P.y-PLAYER_H-18); const t=(h.prompt||h.name); ctx.font='bold 13px Georgia, serif'; const tw=ctx.measureText(t).width; ctx.fillStyle='#ffe14f'; ctx.fillRect(sx-tw/2-8,sy-12,tw+16,24); ctx.strokeStyle='#1a1a1a'; ctx.lineWidth=1.5; ctx.strokeRect(sx-tw/2-8,sy-12,tw+16,24); ctx.fillStyle='#1a1a1a'; ctx.textAlign='center'; ctx.fillText(t,sx,sy); ctx.font='11px Georgia, serif'; ctx.fillStyle='#f4f1e6'; ctx.fillText(G.touch?'tap ACT':'press E',sx,sy+20); }
  // slot reels
  if(G.slot){ const s=G.slot; const sym=['7','BAR','♠','★','$']; const bx=W/2-90, by=H/2-60; ctx.fillStyle='#111'; ctx.fillRect(bx,by,180,90); ctx.strokeStyle='#ffe14f'; ctx.lineWidth=3; ctx.strokeRect(bx,by,180,90); for(let i=0;i<3;i++){ const settled = s.t>0.6+i*0.5; const v = settled? s.reels[i] : Math.floor(G.t*20+i)%5; ctx.fillStyle=settled?'#fff':'#999'; ctx.font='bold 28px Georgia, serif'; ctx.textAlign='center'; ctx.fillText(sym[v], bx+30+i*60, by+45); } }
  // inventory bar
  const iw=44, gap=6, x0=W/2-(iw*6+gap*5)/2, iy=H-64;
  for(let i=0;i<6;i++){ const x=x0+i*(iw+gap); ctx.fillStyle='rgba(20,20,26,0.75)'; ctx.fillRect(x,iy,iw,iw); ctx.strokeStyle=G.invSel===i?'#ffe14f':'#1a1a1a'; ctx.lineWidth=2; ctx.strokeRect(x,iy,iw,iw); const s=G.inv[i]; if(s){ (GLYPH[ITEMS[s.id].glyph]||(()=>{}))(ctx,x+iw/2,iy+iw/2); if(s.n>1){ ctx.fillStyle='#fff'; ctx.font='bold 11px Georgia, serif'; ctx.textAlign='right'; ctx.fillText(s.n, x+iw-3, iy+iw-8); } } }
  if(G.invSel!=null && G.inv[G.invSel]){ const s=G.inv[G.invSel]; ctx.fillStyle='rgba(20,20,26,0.85)'; ctx.font='13px Georgia, serif'; const t=ITEMS[s.id].name+' — '+ITEMS[s.id].desc; const tw=ctx.measureText(t).width; ctx.fillRect(W/2-tw/2-8,iy-30,tw+16,22); ctx.fillStyle='#f4f1e6'; ctx.textAlign='center'; ctx.fillText(t,W/2,iy-19); }
  // zoom stops (top-right)
  ctx.font='bold 12px Georgia, serif'; for(let i=0;i<ZOOM_STOPS.length;i++){ const z=ZOOM_STOPS[i]; const bx=W-10-(ZOOM_STOPS.length-i)*58, by=12; const on=Math.abs(CAM.target-z.z)<1e-3; ctx.fillStyle=on?'#ffe14f':'rgba(20,20,26,0.72)'; ctx.fillRect(bx,by,54,26); ctx.strokeStyle='#1a1a1a'; ctx.lineWidth=2; ctx.strokeRect(bx,by,54,26); ctx.fillStyle=on?'#1a1a1a':'#f4f1e6'; ctx.textAlign='center'; ctx.fillText(z.n,bx+27,by+13); }
  // fade
  if(G.fade){ const f=G.fade; const a=f.t<0.6? f.t/0.6 : 1-(f.t-0.6)/0.6; ctx.fillStyle=`rgba(0,0,0,${clamp(a,0,1)})`; ctx.fillRect(0,0,W,H); }
}
function wrap(ctx,text,maxW){ const words=text.split(' '); const lines=[]; let cur=''; for(const w of words){ const t=cur?cur+' '+w:w; if(ctx.measureText(t).width>maxW&&cur){ lines.push(cur); cur=w; } else cur=t; } if(cur) lines.push(cur); return lines; }

// zoom-stop hit test + inventory hit test on canvas click/tap
function hudClick(sx,sy){
  const W=G.canvasW,H=G.canvasH;
  for(let i=0;i<ZOOM_STOPS.length;i++){ const bx=W-10-(ZOOM_STOPS.length-i)*58, by=12; if(sx>=bx&&sx<=bx+54&&sy>=by&&sy<=by+26){ setZoomStop(i); return true; } }
  const iw=44,gap=6,x0=W/2-(iw*6+gap*5)/2, iy=H-64;
  for(let i=0;i<6;i++){ const x=x0+i*(iw+gap); if(sx>=x&&sx<=x+iw&&sy>=iy&&sy<=iy+iw){ if(G.invSel===i){ useItem(i); G.invSel=null; } else G.invSel=G.inv[i]?i:null; return true; } }
  return false;
}
function useItem(i){
  const s=G.inv[i]; if(!s) return; const id=s.id;
  if(id==='snack'){ takeItem('snack'); say('Crunchy. Fine.'); rigSetPose(P,'cheer',1); }
  else if(id==='coffee'){ takeItem('coffee'); say('Awake now.'); P.speed=160; setTimeout(()=>P.speed=125,20000); rigSetPose(P,'cheer',1); }
  else if(id==='water'){ if(regionAt(P.x).id==='desert'&&!P.floor){ takeItem('water'); G.flags.deserted=true; say('Better. Keep moving.'); } else say('Save it for the desert.'); }
  else if(id==='peach'){ takeItem('peach'); say('Ripe. Juice on your shirt now.'); rigSetPose(P,'cheer',1); }
  else if(id==='phone'){ say(`12% battery. ${fmtClock()}. No messages.`); rigSetPose(P,'think',1.5); }
  else if(id==='keys'){ say('Apartment 8307. Do not lose them.'); }
  else say(ITEMS[id].desc);
}
// DOM: menu, talk, touch controls
function syncDOM(){
  const m=document.getElementById('menu');
  if(G.menu){ if(m.dataset.title!==G.menu.title||m.style.display!=='block'){ m.dataset.title=G.menu.title; m.style.display='block'; m.innerHTML=`<div class="mt">${G.menu.title}</div>`+G.menu.items.map((it,i)=>`<button onclick="menuPick(${i})">${it.label}</button>`).join(''); } }
  else { if(m.style.display!=='none'){ m.style.display='none'; m.dataset.title=''; } }
  const t=document.getElementById('talk'); t.style.display=G.talk.open?'block':'none';
}
function setupDOM(){
  const c=document.getElementById('c');
  window.addEventListener('keydown',keyDown); window.addEventListener('keyup',keyUp);
  window.addEventListener('resize',resize); resize();
  c.addEventListener('wheel',e=>{ e.preventDefault(); CAM.target*= e.deltaY<0?1.12:1/1.12; },{passive:false});
  c.addEventListener('mousedown',e=>{ const r=c.getBoundingClientRect(); if(hudClick(e.clientX-r.left,e.clientY-r.top)) return; });
  let pinch=null;
  c.addEventListener('touchstart',e=>{ G.touch=true; document.body.classList.add('touch'); if(e.touches.length===2){ pinch=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY); } else if(e.touches.length===1){ const r=c.getBoundingClientRect(); hudClick(e.touches[0].clientX-r.left,e.touches[0].clientY-r.top); } },{passive:true});
  c.addEventListener('touchmove',e=>{ if(e.touches.length===2&&pinch){ const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY); CAM.target*=d/pinch; pinch=d; e.preventDefault(); } },{passive:false});
  c.addEventListener('touchend',e=>{ if(e.touches.length<2) pinch=null; });
  const hold=(id,on,off)=>{ const el=document.getElementById(id); const s=e=>{ e.preventDefault(); on(); }, u=e=>{ e.preventDefault(); off(); }; el.addEventListener('touchstart',s,{passive:false}); el.addEventListener('touchend',u); el.addEventListener('touchcancel',u); el.addEventListener('mousedown',s); el.addEventListener('mouseup',u); el.addEventListener('mouseleave',off); };
  hold('bl',()=>IN.tLeft=true,()=>IN.tLeft=false); hold('br',()=>IN.tRight=true,()=>IN.tRight=false);
  hold('ba',()=>{IN.actEdge=true;},()=>{});
  document.getElementById('bt').addEventListener('click',()=>openTalk());
  document.getElementById('bz').addEventListener('click',()=>cycleZoom());
  const ti=document.getElementById('talkIn');
  ti.addEventListener('keydown',e=>{ if(e.key==='Enter'){ submitTalk(ti.value); } if(e.key==='Escape'){ G.talk.open=false; } e.stopPropagation(); });
  document.getElementById('talkGo').addEventListener('click',()=>submitTalk(ti.value));
  document.getElementById('talkX').addEventListener('click',()=>{ G.talk.open=false; });
  document.getElementById('start').addEventListener('click',()=>startGame(false));
  const cont=document.getElementById('continue'); if(localStorage.getItem('floor83')) cont.style.display='inline-block'; cont.addEventListener('click',()=>startGame(true));
}
function resize(){ const c=document.getElementById('c'); G.canvasW=c.width=window.innerWidth; G.canvasH=c.height=window.innerHeight; }
