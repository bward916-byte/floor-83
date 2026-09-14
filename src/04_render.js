// ===== rendering: sky, parallax, ground, buildings, props =====
const SKY_KEYS = [[0,'#0b1026','#1b2140'],[5,'#1b2140','#5a4a6a'],[6.5,'#7a5a7a','#f0a070'],[8,'#7fb2e0','#d9e6f2'],[13,'#5fa0e0','#cfe2f5'],[17,'#6a9ad0','#f0c090'],[19,'#3a3a70','#e07050'],[20.5,'#141a3a','#3a2a50'],[24,'#0b1026','#1b2140']];
function hourNow(){ return (G.clock/3600)%24; }
function skyColors(){
  const h=hourNow(); let i=0; while(i<SKY_KEYS.length-2 && SKY_KEYS[i+1][0]<=h) i++;
  const a=SKY_KEYS[i], b=SKY_KEYS[i+1], t=(h-a[0])/(b[0]-a[0]);
  return [hexLerp(a[1],b[1],t), hexLerp(a[2],b[2],t)];
}
function darkness(){ const h=hourNow(); if(h>=7&&h<=18) return 0; if(h>18&&h<21) return (h-18)/3*0.55; if(h>=21||h<5) return 0.55; return (1-(h-5)/2)*0.55; }
function isNight(){ return darkness()>0.25; }

let lw=1.4; // stroke width in world units (recomputed each frame)
function ink(ctx){ ctx.strokeStyle='#1a1a1a'; ctx.lineWidth=lw; ctx.lineJoin='round'; }
function box(ctx,x,y,w,h,fill,stroke){ ctx.fillStyle=fill; ctx.fillRect(x,y,w,h); if(stroke!==false){ ink(ctx); ctx.strokeRect(x,y,w,h);} }
function hatch(ctx,x,y,w,h,step,alpha){
  if(CAM.z<0.25) return; ctx.save(); ctx.beginPath(); ctx.rect(x,y,w,h); ctx.clip();
  ctx.strokeStyle=`rgba(20,20,20,${alpha||0.25})`; ctx.lineWidth=lw*0.6; ctx.beginPath();
  for(let i=-h;i<w;i+=step){ ctx.moveTo(x+i,y+h); ctx.lineTo(x+i+h,y); } ctx.stroke(); ctx.restore();
}
function label(ctx,txt,x,y,size,color,align){ ctx.fillStyle=color||'#1a1a1a'; ctx.font=`bold ${size}px Georgia, serif`; ctx.textAlign=align||'center'; ctx.textBaseline='middle'; ctx.fillText(txt,x,y); }

function drawSky(ctx){
  const [top,bot]=skyColors(); const g=ctx.createLinearGradient(0,0,0,G.canvasH);
  g.addColorStop(0,top); g.addColorStop(1,bot); ctx.fillStyle=g; ctx.fillRect(0,0,G.canvasW,G.canvasH);
  // sun / moon arc
  const h=hourNow(); const day = h>5.5&&h<19.5; const t = day? (h-5.5)/14 : ((h+24-19.5)%24)/10;
  const sx = G.canvasW*(0.1+0.8*t), sy = G.canvasH*(0.55 - Math.sin(t*Math.PI)*0.45);
  ctx.fillStyle = day?'#ffe9a8':'#f4f1e6'; ctx.beginPath(); ctx.arc(sx,sy,day?28:18,0,7); ctx.fill();
  if(!day){ ctx.fillStyle=skyColors()[0]; ctx.beginPath(); ctx.arc(sx+7,sy-5,15,0,7); ctx.fill(); }
  // stars at night
  const d=darkness(); if(d>0.3){ ctx.fillStyle=`rgba(255,255,255,${(d-0.3)*2})`; const rs=srand(3); for(let i=0;i<60;i++){ ctx.fillRect(rs()*G.canvasW, rs()*G.canvasH*0.6, 1.5,1.5);} }
}
// parallax silhouettes in screen space
function drawParallax(ctx){
  const horizonY = w2s(0,GROUND)[1];
  const reg=regionAt(CAM.x);
  for(const r of REGIONS){
    const pad=500; if(CAM.x<r.x0-pad||CAM.x>r.x1+pad) continue;
    let a=1; if(CAM.x<r.x0+pad) a=(CAM.x-(r.x0-pad))/(2*pad); if(CAM.x>r.x1-pad) a=Math.min(a,((r.x1+pad)-CAM.x)/(2*pad));
    a=clamp(a,0,1); if(a<=0) continue;
    ctx.save(); ctx.globalAlpha=a;
    const rs=srand(r.id.length*31+r.x0);
    const dk=darkness();
    for(let layer=0; layer<2; layer++){
      const par = layer?0.35:0.15, scale = layer?1:0.6;
      const col = hexLerp(layer?'#8a9bb0':'#b3c1d1', layer?'#141a30':'#1c2340', dk*1.6);
      ctx.fillStyle=col;
      const off = -CAM.x*par*CAM.z*0.4;
      const step = 90*scale;
      for(let i=-4;i<40;i++){
        const bx = ((i*step + off) % (G.canvasW+300) + (G.canvasW+300)) % (G.canvasW+300) - 150;
        let hgt, w=step*0.8;
        if(r.id==='city') hgt = (60+rs()*260)*scale;
        else if(r.id==='casino') hgt=(40+rs()*180)*scale;
        else if(r.id==='suburbs') hgt=(20+rs()*40)*scale;
        else if(r.id==='country'){ hgt=(30+rs()*60)*scale; w=step*1.6; }
        else { hgt=(20+rs()*90)*scale; w=step*1.3; }
        const y=horizonY-hgt*0.9;
        if(r.id==='country'||r.id==='desert'){ ctx.beginPath(); ctx.moveTo(bx-w*0.5,horizonY); if(r.id==='desert'){ ctx.lineTo(bx-w*0.3,y); ctx.lineTo(bx+w*0.3,y); } else { ctx.quadraticCurveTo(bx,y-20,bx+w*0.5,horizonY);} ctx.lineTo(bx+w*0.5,horizonY); ctx.closePath(); ctx.fill(); }
        else { ctx.fillRect(bx,y,w,hgt*0.9+400); if(r.id==='casino'&&dk>0.2){ ctx.fillStyle=['#ff4fa3','#4fd8ff','#ffe14f'][i%3]; ctx.globalAlpha=a*dk; ctx.fillRect(bx+4,y+6,w-8,3); ctx.globalAlpha=a; ctx.fillStyle=col; } }
      }
    }
    ctx.restore();
  }
}
function drawGround(ctx, v){
  const reg=regionAt(CAM.x);
  const x0=v.x0-100, x1=v.x1+100;
  const earth = {city:'#4a4a48',suburbs:'#6a8a4a',country:'#7a9a4a',desert:'#d8b06a',casino:'#5a4a48'};
  // blend earth colour across region borders
  let ec=earth[reg.id]; const nb = CAM.x-reg.x0<400 ? REGIONS[REGIONS.indexOf(reg)-1] : (reg.x1-CAM.x<400? REGIONS[REGIONS.indexOf(reg)+1]:null);
  if(nb){ const t = CAM.x-reg.x0<400 ? 0.5-(CAM.x-reg.x0)/800 : 0.5-(reg.x1-CAM.x)/800; ec=hexLerp(ec, earth[nb.id], clamp(t,0,0.5)); }
  ctx.fillStyle=ec; ctx.fillRect(x0, GROUND, x1-x0, v.y1-GROUND+200);
  // sidewalk (city & casino only) and road
  const isCity = reg.id==='city'||reg.id==='casino';
  if(isCity){ box(ctx,x0,GROUND,x1-x0,16,'#b9b6ae',false); ink(ctx); ctx.beginPath(); ctx.moveTo(x0,GROUND); ctx.lineTo(x1,GROUND); ctx.moveTo(x0,GROUND+16); ctx.lineTo(x1,GROUND+16); ctx.stroke();
    if(CAM.z>0.3){ ctx.strokeStyle='rgba(20,20,20,0.35)'; ctx.beginPath(); for(let x=Math.floor(x0/60)*60;x<x1;x+=60){ ctx.moveTo(x,GROUND); ctx.lineTo(x,GROUND+16);} ctx.stroke(); }
    box(ctx,x0,GROUND+16,x1-x0,70,'#3a3a3c',false);
  } else {
    box(ctx,x0,GROUND+8,x1-x0,60,'#4a4a4c',false); ink(ctx); ctx.beginPath(); ctx.moveTo(x0,GROUND+8); ctx.lineTo(x1,GROUND+8); ctx.stroke();
    if(reg.id==='desert'){ ctx.fillStyle='rgba(20,20,20,0.15)'; for(let x=Math.floor(x0/37)*37;x<x1;x+=37){ ctx.fillRect(x,GROUND+2,9,2);} }
  }
  // lane dashes
  const ry = isCity? GROUND+50 : GROUND+38;
  ctx.fillStyle='#e6d36a'; for(let x=Math.floor(x0/80)*80;x<x1;x+=80){ ctx.fillRect(x,ry,40,3); }
  // ground-line ink
  ink(ctx); ctx.beginPath(); ctx.moveTo(x0,GROUND+(isCity?86:68)); ctx.lineTo(x1,GROUND+(isCity?86:68)); ctx.stroke();
}

// windows lit pattern
function litWindow(bid, fi, wi){ const s=(bid*7919 + fi*131 + wi*17)%97; return s<45; }
function drawWindows(ctx, b, fx, fy, fw, fh, count, bid, fi){
  const night=isNight(); const gap=fw/count, ww=gap*0.55, wh=fh*0.5;
  const tiny = ww*CAM.z<1.5;
  for(let wi=0;wi<count;wi++){
    const x=fx+wi*gap+gap*0.22, y=fy+fh*0.25;
    const lit = night && litWindow(bid,fi,wi);
    ctx.fillStyle = lit? '#ffd977' : (b.kind==='glass'? '#5f7f9f':'#2e3a48');
    ctx.fillRect(x,y,ww,wh);
    if(!tiny && CAM.z>0.25){ ink(ctx); ctx.lineWidth=lw*0.8; ctx.strokeRect(x,y,ww,wh); if(!lit){ ctx.fillStyle='rgba(255,255,255,0.18)'; ctx.fillRect(x+1,y+1,ww*0.35,wh-2);} }
  }
}
function drawBuilding(ctx, b, bi){
  const top = floorTop(b.floors), h = GROUND-top;
  const dk=darkness();
  const col = hexLerp(b.color, '#20243a', dk*0.9);
  if(b.kind==='silo'){ box(ctx,b.x,top,b.w,h,col); ctx.fillStyle=col; ctx.beginPath(); ctx.arc(b.x+b.w/2,top,b.w/2,Math.PI,0); ctx.fill(); ink(ctx); ctx.stroke(); hatch(ctx,b.x+b.w*0.6,top,b.w*0.4,h,7,0.2); return; }
  if(b.kind==='house'){ const roofH=b.w*0.35; box(ctx,b.x,top,b.w,h,col); ctx.fillStyle=hexLerp('#6a4a3a','#1a1a2a',dk); ctx.beginPath(); ctx.moveTo(b.x-10,top); ctx.lineTo(b.x+b.w/2,top-roofH); ctx.lineTo(b.x+b.w+10,top); ctx.closePath(); ctx.fill(); ink(ctx); ctx.stroke();
    for(let f=1;f<=b.floors;f++) drawWindows(ctx,b,b.x+10,floorTop(f),b.w-20,FH,2,bi,f);
    box(ctx,b.x+b.w*0.45,GROUND-30,16,30,'#5a3a22'); return; }
  if(b.kind==='barn'){ box(ctx,b.x,top,b.w,h,col); ctx.fillStyle=hexLerp('#4a3a30','#1a1a2a',dk); ctx.beginPath(); ctx.moveTo(b.x-6,top); ctx.lineTo(b.x+b.w*0.2,top-30); ctx.lineTo(b.x+b.w*0.5,top-46); ctx.lineTo(b.x+b.w*0.8,top-30); ctx.lineTo(b.x+b.w+6,top); ctx.closePath(); ctx.fill(); ink(ctx); ctx.stroke();
    box(ctx,b.x+b.w*0.35,GROUND-60,b.w*0.3,60,'#3a2a20'); ink(ctx); ctx.beginPath(); ctx.moveTo(b.x+b.w*0.35,GROUND-60); ctx.lineTo(b.x+b.w*0.65,GROUND); ctx.moveTo(b.x+b.w*0.65,GROUND-60); ctx.lineTo(b.x+b.w*0.35,GROUND); ctx.stroke(); hatch(ctx,b.x,top,b.w*0.25,h,8,0.18); return; }
  if(b.kind==='stand'){ box(ctx,b.x,GROUND-30,b.w,30,'#8a5a3a'); box(ctx,b.x-6,top-4,b.w+12,10,'#c8443a'); ctx.fillStyle='#f4e6c8'; for(let i=0;i<6;i++){ ctx.fillRect(b.x-6+i*(b.w+12)/6,top-4,(b.w+12)/12,10);} ink(ctx); ctx.beginPath(); ctx.moveTo(b.x,top+6); ctx.lineTo(b.x,GROUND-30); ctx.moveTo(b.x+b.w,top+6); ctx.lineTo(b.x+b.w,GROUND-30); ctx.stroke();
    ctx.fillStyle='#f0a050'; for(let i=0;i<9;i++){ ctx.beginPath(); ctx.arc(b.x+14+i*14,GROUND-36,5,0,7); ctx.fill(); ink(ctx); ctx.stroke(); }
    label(ctx,b.sign,b.x+b.w/2,top-14,12,'#1a1a1a'); return; }
  if(b.kind==='gas'){ box(ctx,b.x,top,b.w*0.55,h,col); box(ctx,b.x+b.w*0.5,top-10,b.w*0.5,12,'#c8443a'); ink(ctx); ctx.beginPath(); ctx.moveTo(b.x+b.w*0.6,top+2); ctx.lineTo(b.x+b.w*0.6,GROUND); ctx.moveTo(b.x+b.w*0.92,top+2); ctx.lineTo(b.x+b.w*0.92,GROUND); ctx.stroke();
    box(ctx,b.x+b.w*0.7,GROUND-26,14,26,'#d8d0c0'); box(ctx,b.x+b.w*0.8,GROUND-26,14,26,'#d8d0c0'); label(ctx,b.sign,b.x+b.w*0.75,top-4,10,'#fff');
    drawWindows(ctx,b,b.x+8,top+4,b.w*0.5,FH,2,bi,1); return; }
  // generic multi-floor block
  box(ctx,b.x,top,b.w,h,col);
  hatch(ctx,b.x+b.w*0.82,top,b.w*0.18,h,9,0.16);
  const cols = b.kind==='glass'?6: b.kind==='brick'?4: b.kind==='neon'?3: 3;
  const f0 = Math.max(1, Math.floor((GROUND-visible().y1)/FH)), f1 = Math.min(b.floors, Math.ceil((GROUND-visible().y0)/FH)+1);
  for(let f=Math.max(2,f0); f<=f1; f++) drawWindows(ctx,b,b.x+8,floorTop(f),b.w-16,FH,cols,bi,f);
  if(b.kind==='brick' && CAM.z>0.5){ ctx.strokeStyle='rgba(60,30,20,0.35)'; ctx.lineWidth=lw*0.5; ctx.beginPath(); for(let y=top+6;y<GROUND;y+=8){ ctx.moveTo(b.x,y); ctx.lineTo(b.x+b.w,y);} ctx.stroke(); }
  // ground floor: storefront or lobby
  if(b.sign){
    const sy = floorTop(1)-14;
    const neon = (b.kind==='neon'||b.kind==='casino'||b.kind==='motel') && isNight();
    box(ctx,b.x+6,sy-16,b.w-12,20, neon?'#111':'#d8c8a0');
    label(ctx,b.sign,b.x+b.w/2,sy-6,Math.min(14,b.w/ (b.sign.length*0.75)), neon?['#ff4fa3','#4fd8ff','#ffe14f'][bi%3]:'#1a1a1a');
    box(ctx,b.x+8,floorTop(1)+6,b.w-16,FH-6,'#3a4a5a'); ctx.fillStyle='rgba(255,255,255,0.15)'; ctx.fillRect(b.x+10,floorTop(1)+8,b.w*0.3,FH-10);
    if(b.door){ box(ctx,b.door-14,GROUND-34,28,34,'#6a5a3a'); ink(ctx); ctx.beginPath(); ctx.moveTo(b.door,GROUND-34); ctx.lineTo(b.door,GROUND); ctx.stroke(); }
    if(b.kind==='shop'){ ctx.fillStyle='#c8443a'; for(let i=0;i<Math.floor(b.w/24);i++){ ctx.fillStyle=i%2?'#c8443a':'#f4e6c8'; ctx.fillRect(b.x+6+i*24, sy+2, 24, 8);} ink(ctx); ctx.strokeRect(b.x+6,sy+2,Math.floor(b.w/24)*24,8); }
  }
  if(b.kind==='casino'){ // marquee lights & spade
    ctx.fillStyle=isNight()?'#ffe14f':'#8a7a3a'; for(let i=0;i<14;i++){ ctx.beginPath(); ctx.arc(b.x+20+i*(b.w-40)/13, floorTop(1)-36, 3,0,7); ctx.fill(); }
    ctx.fillStyle=isNight()?'#ff4fa3':'#5a2a3a'; const cx=b.x+b.w/2, cy=top+40; ctx.beginPath(); ctx.moveTo(cx,cy+20); ctx.quadraticCurveTo(cx-40,cy-10,cx,cy-30); ctx.quadraticCurveTo(cx+40,cy-10,cx,cy+20); ctx.fill(); ink(ctx); ctx.stroke(); ctx.fillRect(cx-4,cy+12,8,18);
  }
  // roof details
  if(b.floors>8){ box(ctx,b.x+b.w*0.7,top-22,20,22,'#7a7a72'); box(ctx,b.x+b.w*0.15,top-10,40,10,'#6a6a62'); }
}

function drawTower(ctx){
  const b=BUILDINGS[1]; const top=floorTop(b.floors), h=GROUND-top; const dk=darkness();
  const col=hexLerp(b.color,'#20243a',dk*0.9), side=hexLerp('#a8a498','#181a2a',dk*0.9);
  box(ctx,b.x,top,b.w,h,col);
  // side depth strip + hatch
  box(ctx,b.x+b.w,top+10,26,h-10,side); hatch(ctx,b.x+b.w,top+10,26,h-10,6,0.3);
  // pilasters
  ctx.fillStyle='rgba(0,0,0,0.12)'; for(let i=1;i<7;i++) ctx.fillRect(b.x+100+i*46,top,3,h);
  // windows (culled)
  const v=visible();
  const f0=Math.max(2,Math.floor((GROUND-v.y1)/FH)), f1=Math.min(b.floors,Math.ceil((GROUND-v.y0)/FH)+1);
  for(let f=f0; f<=f1; f++){
    if(f===TOWER.homeFloor) continue;
    drawWindows(ctx,b,b.x+96,floorTop(f),b.w-104,FH,7,1,f);
    if(f%10===0){ ctx.fillStyle='rgba(0,0,0,0.25)'; ctx.fillRect(b.x,floorBottom(f),b.w,2); }
  }
  // glass elevator shaft on the facade
  const sx=TOWER.shaftX, sw=TOWER.shaftW;
  box(ctx,sx,top+8,sw,h-8,`rgba(120,170,210,${0.55})`);
  ink(ctx); ctx.beginPath(); ctx.moveTo(sx+sw/2,top+8); ctx.lineTo(sx+sw/2,GROUND); ctx.stroke();
  if(CAM.z>0.3){ ctx.strokeStyle='rgba(20,20,20,0.3)'; ctx.beginPath(); for(let f=f0;f<=f1;f++){ ctx.moveTo(sx,floorBottom(f)); ctx.lineTo(sx+sw,floorBottom(f)); } ctx.stroke(); }
  // elevator car
  const carY = G.ride ? G.ride.y : (P.floor? floorBottom(P.floor) : floorBottom(G.lastElevFloor||1));
  box(ctx,sx+3,carY-FH+6,sw-6,FH-6,'#e8e4d8'); box(ctx,sx+sw/2-1,carY-FH+8,2,FH-8,'#555',false);
  // roof: parapet, water tower, antenna
  box(ctx,b.x-6,top-8,b.w+38,8,side); box(ctx,b.x+300,top-60,50,42,'#7a5a4a'); ctx.fillStyle='#6a4a3a'; ctx.beginPath(); ctx.moveTo(b.x+296,top-60); ctx.lineTo(b.x+325,top-78); ctx.lineTo(b.x+354,top-60); ctx.closePath(); ctx.fill(); ink(ctx); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(b.x+308,top-18); ctx.lineTo(b.x+308,top-8); ctx.moveTo(b.x+342,top-18); ctx.lineTo(b.x+342,top-8); ctx.moveTo(b.x+120,top-8); ctx.lineTo(b.x+120,top-110); ctx.stroke(); ctx.fillStyle='#e03030'; ctx.beginPath(); ctx.arc(b.x+120,top-112,4,0,7); ctx.fill();
  // ground floor: entrance canopy
  box(ctx,b.x+340,GROUND-70,80,8,'#5a1f1f'); ink(ctx); ctx.beginPath(); ctx.moveTo(b.x+345,GROUND-62); ctx.lineTo(b.x+345,GROUND); ctx.moveTo(b.x+415,GROUND-62); ctx.lineTo(b.x+415,GROUND); ctx.stroke();
  // number plaque
  label(ctx,'83',b.x+b.w/2,top+FH*0.5,26,'rgba(0,0,0,0.35)');
  drawApartment(ctx); drawLobby(ctx);
}
function drawApartment(ctx){
  const f=TOWER.homeFloor, y0=floorTop(f), y1=floorBottom(f), x0=90, x1=400;
  if(CAM.z<0.09) return;
  const dk=darkness();
  box(ctx,x0,y0,x1-x0,y1-y0,hexLerp('#f1e9d6','#3a3a4a',dk)); // wall
  // window with the city behind
  const [t,bt]=skyColors(); ctx.fillStyle=bt; ctx.fillRect(270,y0+6,90,26); ctx.fillStyle=hexLerp('#8a9bb0','#141a30',dk*1.6);
  for(let i=0;i<7;i++) ctx.fillRect(272+i*13,y0+14+(i*7)%12,9,20); ink(ctx); ctx.strokeRect(270,y0+6,90,26); ctx.beginPath(); ctx.moveTo(315,y0+6); ctx.lineTo(315,y0+32); ctx.stroke();
  box(ctx,x0,y1-3,x1-x0,3,'#8a6a4a'); // floor strip
  // door to elevator
  box(ctx,x0+2,y1-36,16,36,'#6a5a3a'); ctx.fillStyle='#e6c25a'; ctx.fillRect(x0+13,y1-18,2,2);
  // key hook
  ctx.fillStyle='#e6c25a'; if(!hasItem('keys')) { ctx.fillRect(x0+24,y0+22,3,3); ctx.fillRect(x0+25,y0+25,1,4); }
  // bed
  box(ctx,120,y1-16,60,14,'#c8a070'); box(ctx,120,y1-22,60,8,'#8fb3d9'); box(ctx,164,y1-26,14,6,'#f4f4f0');
  if(P.sleeping){ }
  // nightstand + phone
  box(ctx,186,y1-16,14,14,'#8a6a4a'); if(!hasItem('phone')) box(ctx,190,y1-19,6,3,'#222');
  // dresser
  box(ctx,206,y1-24,34,22,'#a07a50'); ink(ctx); ctx.beginPath(); ctx.moveTo(206,y1-13); ctx.lineTo(240,y1-13); ctx.stroke(); ctx.fillStyle='#e6c25a'; ctx.fillRect(221,y1-20,4,2); ctx.fillRect(221,y1-9,4,2);
  // couch
  box(ctx,254,y1-18,52,16,'#5a6a8a'); box(ctx,254,y1-24,8,10,'#5a6a8a'); box(ctx,298,y1-24,8,10,'#5a6a8a');
  // TV on stand
  box(ctx,322,y1-12,26,10,'#4a4a4a'); box(ctx,324,y1-30,22,17,'#111'); if(G.flags.tvOn){ ctx.fillStyle=['#4fd8ff','#ff4fa3','#ffe14f'][Math.floor(G.t*3)%3]; ctx.fillRect(326,y1-28,18,13); }
  // kitchen: counter + fridge
  box(ctx,356,y1-18,20,16,'#d8d0c0'); box(ctx,380,y1-34,18,32,'#e8e8e8'); ink(ctx); ctx.beginPath(); ctx.moveTo(380,y1-20); ctx.lineTo(398,y1-20); ctx.stroke();
  // poster / clock
  box(ctx,130,y0+8,20,14,'#c8443a'); label(ctx,'83',140,y0+15,9,'#fff');
  if(dk>0.2 && G.flags.lightsOn){ ctx.fillStyle='rgba(255,220,140,0.25)'; ctx.fillRect(x0,y0,x1-x0,y1-y0); }
}
function drawLobby(ctx){
  const y0=floorTop(1), y1=floorBottom(1), x0=10, x1=410; if(CAM.z<0.09) return;
  const dk=darkness(); box(ctx,x0,y0,x1-x0,y1-y0,hexLerp('#e6dcc8','#2a2a3a',dk*0.6));
  ctx.fillStyle='rgba(0,0,0,0.08)'; for(let x=x0;x<x1;x+=30) ctx.fillRect(x,y1-6,15,6); box(ctx,x0,y1-6,x1-x0,6,'rgba(0,0,0,0)');
  box(ctx,x0+2,y1-36,16,36,'#6a5a3a'); // elevator door (lobby side)
  box(ctx,180,y1-30,60,28,'#8a6a4a'); ink(ctx); for(let i=0;i<4;i++) for(let j=0;j<3;j++) ctx.strokeRect(184+i*14,y1-27+j*8,12,6); // mailboxes
  box(ctx,280,y1-22,60,20,'#6a5a4a'); // desk
  ctx.fillStyle='#3a8a4a'; ctx.beginPath(); ctx.arc(150,y1-16,10,0,7); ctx.fill(); ink(ctx); ctx.stroke(); box(ctx,146,y1-8,8,8,'#b8623a');
  box(ctx,388,y1-40,18,40,'#8fb3d9'); ink(ctx); ctx.beginPath(); ctx.moveTo(397,y1-40); ctx.lineTo(397,y1); ctx.stroke(); // exit door
  label(ctx,'LOBBY',60,y0+10,8,'rgba(0,0,0,0.5)');
}
// interiors of street buildings (cutaway when inside)
function drawInterior(ctx, b){
  const y0=floorTop(1), y1=GROUND, i=b.interior; const dk=darkness();
  box(ctx,i.x0,y0,i.x1-i.x0,y1-y0,'#f4efe2');
  ctx.fillStyle='rgba(0,0,0,0.06)'; for(let x=i.x0;x<i.x1;x+=24) ctx.fillRect(x,y1-5,12,5);
  if(b.id==='store'){ for(let s=0;s<3;s++){ box(ctx,i.x0+10+s*60,y1-30,50,30,'#c8b890'); for(let k=0;k<4;k++){ ctx.fillStyle=['#c8443a','#4a86c8','#3a8a4a','#ffe14f'][(k+s)%4]; ctx.fillRect(i.x0+14+s*60+k*12,y1-22,8,8); ctx.fillRect(i.x0+14+s*60+k*12,y1-10,8,8);} } box(ctx,i.x1-70,y1-22,50,20,'#8a6a4a'); box(ctx,i.x1-50,y1-30,12,8,'#333'); label(ctx,'REDEEM CANS HERE',i.x0+90,y0+12,7,'#8a3a2a'); }
  if(b.id==='diner'){ box(ctx,i.x0+10,y1-22,i.x1-i.x0-60,20,'#c8443a'); ctx.fillStyle='#e8e8e8'; for(let k=0;k<5;k++){ ctx.fillRect(i.x0+30+k*36,y1-12,4,12); ctx.beginPath(); ctx.arc(i.x0+32+k*36,y1-13,6,0,7); ctx.fill(); ink(ctx); ctx.stroke(); } box(ctx,i.x1-50,y1-40,36,20,'#4a4a4a'); ctx.fillStyle='#fff'; ctx.fillRect(i.x1-46,y1-38,28,4); label(ctx,'PIE  •  COFFEE',i.x0+70,y0+12,7,'#8a3a2a'); }
  if(b.id==='office'){ box(ctx,i.x1-90,y1-22,70,20,'#4a4a6a'); box(ctx,i.x0+20,y1-26,4,26,'#333'); ctx.fillStyle='#3a8a4a'; ctx.beginPath(); ctx.arc(i.x0+22,y1-30,10,0,7); ctx.fill(); ink(ctx); ctx.stroke(); box(ctx,i.x0+80,y0+8,90,26,'#e8e8f0'); label(ctx,'COURIERS WANTED',i.x0+125,y0+21,7,'#4a4a6a'); }
  if(b.id==='gas'){ box(ctx,i.x0+10,y1-30,60,30,'#c8b890'); ctx.fillStyle='#4fd8ff'; for(let k=0;k<5;k++) ctx.fillRect(i.x0+14+k*11,y1-24,7,12); box(ctx,i.x1-70,y1-22,50,20,'#8a6a4a'); label(ctx,'ICE  •  WATER',i.x0+40,y0+12,7,'#8a3a2a'); }
  if(b.id==='casino'){ ctx.fillStyle='#7a1f3a'; ctx.fillRect(i.x0,y0,i.x1-i.x0,y1-y0); ctx.fillStyle='rgba(255,225,80,0.15)'; for(let x=i.x0;x<i.x1;x+=30) ctx.fillRect(x,y0,15,y1-y0);
    box(ctx,i.x0+10,y1-40,60,38,'#333'); ink(ctx); for(let k=0;k<3;k++) ctx.strokeRect(i.x0+16+k*16,y1-32,12,14); label(ctx,'CAGE',i.x0+40,y0+12,8,'#ffe14f');
    for(let s=0;s<5;s++){ const sx=i.x0+120+s*46; box(ctx,sx,y1-36,28,36,['#c8443a','#4a86c8','#ffe14f'][s%3]); box(ctx,sx+4,y1-30,20,10,'#fff'); ctx.fillStyle='#111'; for(let k=0;k<3;k++) ctx.fillRect(sx+6+k*6,y1-28,4,6); box(ctx,sx+28,y1-32,3,10,'#c8443a'); }
    box(ctx,i.x1-110,y1-22,80,20,'#1f5a3a'); label(ctx,'THE GRAND SPADE',i.x0+240,y0+12,9,'#ffe14f'); }
}
function drawProps(ctx, v){
  const dk=darkness();
  // street lamps
  const lampRegions = [[-1800,1650],[9800,12400]];
  for(const [a,b] of lampRegions) for(let x=Math.ceil(Math.max(a,v.x0-50)/220)*220; x<Math.min(b,v.x1+50); x+=220){
    if(x>-200&&x<0) continue; box(ctx,x-2,GROUND-70,4,70,'#4a4a48'); box(ctx,x-8,GROUND-76,16,6,'#3a3a38');
    if(dk>0.15){ ctx.fillStyle=`rgba(255,225,140,${dk*0.35})`; ctx.beginPath(); ctx.moveTo(x,GROUND-70); ctx.lineTo(x-40,GROUND); ctx.lineTo(x+40,GROUND); ctx.closePath(); ctx.fill(); ctx.fillStyle='#ffe9a8'; ctx.fillRect(x-6,GROUND-74,12,4); }
  }
  // alley details: dumpster, fire escape, cans
  if(v.x0<0&&v.x1>-220){ box(ctx,-190,GROUND-26,44,26,'#3a5a3a'); box(ctx,-192,GROUND-30,48,6,'#2a4a2a'); ink(ctx); ctx.beginPath(); for(let f=2;f<8;f++){ ctx.moveTo(-200,floorBottom(f)); ctx.lineTo(-240,floorBottom(f)); ctx.moveTo(-240,floorBottom(f)); ctx.lineTo(-220,floorBottom(f+1)); } ctx.stroke();
    for(const c of G.cans){ if(!c.taken){ box(ctx,c.x-2,GROUND-6,4,6,'#c8c8c8'); ctx.fillStyle='#c8443a'; ctx.fillRect(c.x-2,GROUND-4,4,2);} }
    // Earl's cart
    const e=npcAt('earl'); const cx=e.x+22; box(ctx,cx,GROUND-26,30,20,'#8a8a90'); ink(ctx); for(let k=1;k<4;k++){ ctx.beginPath(); ctx.moveTo(cx+k*7.5,GROUND-26); ctx.lineTo(cx+k*7.5,GROUND-6); ctx.stroke(); } ctx.beginPath(); ctx.moveTo(cx,GROUND-26); ctx.lineTo(cx-6,GROUND-34); ctx.stroke();
    ctx.fillStyle='#2a2a2a'; ctx.beginPath(); ctx.arc(cx+5,GROUND-3,3,0,7); ctx.arc(cx+25,GROUND-3,3,0,7); ctx.fill(); box(ctx,cx+2,GROUND-38,12,12,'#3a6a8a'); box(ctx,cx+15,GROUND-36,12,10,'#c8a070'); }
  // trees (suburbs/country) & fence
  for(let x=1700;x<6800;x+=170){ if(x<v.x0-60||x>v.x1+60) continue; if(BUILDINGS.some(b=>x>b.x-20&&x<b.x+b.w+20)) continue; const s=srand(x); const hgt=40+s()*40; box(ctx,x-3,GROUND-hgt*0.5,6,hgt*0.5,'#5a3a22'); ctx.fillStyle=hexLerp('#3a7a3a','#1a2a2a',dk); ctx.beginPath(); ctx.arc(x,GROUND-hgt*0.6,hgt*0.45,0,7); ctx.arc(x-12,GROUND-hgt*0.45,hgt*0.3,0,7); ctx.arc(x+12,GROUND-hgt*0.45,hgt*0.3,0,7); ctx.fill(); ink(ctx); ctx.beginPath(); ctx.arc(x,GROUND-hgt*0.6,hgt*0.45,0,7); ctx.stroke(); }
  if(v.x1>3800&&v.x0<6800){ ink(ctx); ctx.beginPath(); for(let x=Math.max(3800,v.x0);x<Math.min(6800,v.x1);x+=30){ if(BUILDINGS.some(b=>x>b.x-10&&x<b.x+b.w+10)) continue; ctx.moveTo(x,GROUND); ctx.lineTo(x,GROUND-12); ctx.moveTo(x,GROUND-9); ctx.lineTo(x+30,GROUND-9);} ctx.stroke();
    ctx.fillStyle=hexLerp('#c8b060','#3a3a2a',dk); for(let x=Math.max(3800,v.x0);x<Math.min(6800,v.x1);x+=14){ if(BUILDINGS.some(b=>x>b.x-10&&x<b.x+b.w+10)) continue; ctx.fillRect(x,GROUND-24,3,12);} }
  // cacti in the desert
  for(const c of G.cacti){ if(c.x<v.x0-30||c.x>v.x1+30||c.taken) continue; drawCactus(ctx,c.x,GROUND,c.h,dk); }
  for(let x=6900;x<9700;x+=230){ if(x<v.x0-30||x>v.x1+30) continue; const s=srand(x); drawCactus(ctx,x+s()*60,GROUND,20+s()*30,dk); }
  // road signs
  const signs=[[1640,'SUBURBS →'],[3780,'COUNTY LINE'],[6780,'DESERT: NO SERVICES 40 MI'],[9780,'LUCKY FLATS']];
  for(const [x,t] of signs){ if(x<v.x0-100||x>v.x1+100) continue; box(ctx,x-2,GROUND-44,4,44,'#4a4a48'); box(ctx,x-40,GROUND-60,80,18,'#2a7a3a'); label(ctx,t,x,GROUND-51,7,'#fff'); }
  // bus stops
  for(const s of BUS_STOPS){ if(s.x<v.x0-60||s.x>v.x1+60) continue; box(ctx,s.x-24,GROUND-50,48,6,'#3a4a5a'); box(ctx,s.x-24,GROUND-44,3,44,'#3a4a5a'); box(ctx,s.x+21,GROUND-44,3,44,'#3a4a5a'); box(ctx,s.x-20,GROUND-18,40,4,'#6a5a3a'); box(ctx,s.x+30,GROUND-60,4,60,'#4a4a48'); box(ctx,s.x+22,GROUND-72,20,12,'#3a6ad0'); label(ctx,'BUS',s.x+32,GROUND-66,7,'#fff'); }
  // coins
  for(const c of G.coins){ if(c.taken||c.x<v.x0||c.x>v.x1) continue; ctx.fillStyle='#e6c25a'; ctx.beginPath(); ctx.ellipse(c.x,GROUND-3,3,3*(0.4+0.6*Math.abs(Math.sin(G.t*3+c.x))),0,0,7); ctx.fill(); ink(ctx); ctx.stroke(); }
}
function drawCactus(ctx,x,y,h,dk){ const g=hexLerp('#4a8a4a','#1a3a2a',dk); box(ctx,x-4,y-h,8,h,g); box(ctx,x-14,y-h*0.7,5,h*0.35,g); box(ctx,x-14,y-h*0.7,14,5,g); box(ctx,x+9,y-h*0.55,5,h*0.3,g); box(ctx,x+4,y-h*0.55,10,5,g); if(CAM.z>0.5){ ctx.fillStyle='#e8e8d0'; for(let k=0;k<Math.floor(h/6);k++){ ctx.fillRect(x-5,y-h+4+k*6,1.5,1.5); ctx.fillRect(x+3,y-h+7+k*6,1.5,1.5);} } }

function drawWorld(ctx){
  lw = clamp(1.4/CAM.z, 0.4, 6);
  drawSky(ctx); drawParallax(ctx);
  ctx.save(); ctx.translate(G.canvasW/2, G.canvasH/2); ctx.scale(CAM.z,CAM.z); ctx.translate(-CAM.x,-CAM.y);
  const v=visible();
  drawGround(ctx,v);
  for(let i=0;i<BUILDINGS.length;i++){ const b=BUILDINGS[i]; if(b.x>v.x1+60||b.x+b.w<v.x0-60) continue; if(b.kind==='tower') drawTower(ctx); else drawBuilding(ctx,b,i); }
  const inside = P.inside && BUILDINGS.find(b=>b.id===P.inside); if(inside) drawInterior(ctx, inside);
  drawProps(ctx,v);
  // NPCs then player
  for(const n of NPC){ if(n.x<v.x0-60||n.x>v.x1+60) continue; if((n.inside||null)&&n.inside!==P.inside) continue; if(n.floor===1&&!P.floor) continue; if(n.floor===0&&P.floor) continue; if(CAM.z<0.08&&n.walker) continue; drawRig(ctx,n); }
  drawRig(ctx,P);
  // player marker when tiny
  if(CAM.z<0.35){ const r=8/CAM.z; ctx.strokeStyle='#ff4040'; ctx.lineWidth=lw*1.6; ctx.beginPath(); ctx.arc(P.x,P.y-PLAYER_H/2,r+Math.sin(G.t*6)*r*0.2,0,7); ctx.stroke(); ctx.fillStyle='#ff4040'; ctx.beginPath(); ctx.moveTo(P.x,P.y-PLAYER_H/2-r*1.3); ctx.lineTo(P.x-r*0.6,P.y-PLAYER_H/2-r*2.2); ctx.lineTo(P.x+r*0.6,P.y-PLAYER_H/2-r*2.2); ctx.closePath(); ctx.fill(); }
  // night tint over the world (not the sky)
  const dk=darkness(); if(dk>0){ ctx.fillStyle=`rgba(10,15,45,${dk*0.42})`; ctx.fillRect(v.x0-50,GROUND-99999,v.x1-v.x0+100,199999); }
  ctx.restore();
}
