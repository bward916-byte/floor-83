// ===== camera & zoom =====
const CAM = { x:0, y:0, z:1.6, target:1.6, min:0.03, max:3, focus:null, lookY:0 };
function cycleZoom(){
  // pick the next stop below current zoom (wrap)
  let i = ZOOM_STOPS.findIndex(s=>Math.abs(s.z-CAM.target)<1e-3);
  i = (i<0) ? 0 : (i+1)%ZOOM_STOPS.length;
  CAM.target = ZOOM_STOPS[i].z; say(`Zoom: ${ZOOM_STOPS[i].n}`,1200);
}
function setZoomStop(i){ CAM.target=ZOOM_STOPS[i].z; }
function camUpdate(dt){
  CAM.target = clamp(CAM.target, CAM.min, CAM.max);
  if(G.cine){ cineUpdate(dt); }
  const k = 1-Math.pow(0.001, dt);            // smooth
  CAM.z = lerp(CAM.z, CAM.target, k*0.9);
  let fx = P.x, fy = P.y - PLAYER_H*0.55;
  if(CAM.focus){ fx=CAM.focus.x; fy=CAM.focus.y; }
  // when zoomed far out, bias toward showing the whole tower
  if(CAM.z<0.2){ const tw = 1-clamp((CAM.z-0.05)/0.15,0,1); fy = lerp(fy, floorTop(TOWER.floors)+ (GROUND-floorTop(TOWER.floors))*0.5, tw*0.85); }
  CAM.x = lerp(CAM.x, fx, k); CAM.y = lerp(CAM.y, fy, k);
}
function w2s(x,y){ return [ (x-CAM.x)*CAM.z + G.canvasW/2, (y-CAM.y)*CAM.z + G.canvasH/2 ]; }
function s2w(sx,sy){ return [ (sx-G.canvasW/2)/CAM.z + CAM.x, (sy-G.canvasH/2)/CAM.z + CAM.y ]; }
function visible(){ const [x0,y0]=s2w(0,0), [x1,y1]=s2w(G.canvasW,G.canvasH); return {x0,y0,x1,y1}; }
// cinematic: zoom out to show where the player is, hold, then snap back in
function cinematic(kind, msg){
  G.cine = {kind, t:0, from:CAM.target, out: kind==='tower'?0.11: kind==='city'?0.04:0.35, msg};
}
function cineUpdate(dt){
  const c=G.cine; c.t+=dt;
  if(c.t<0.2){ }
  else if(c.t<2.4){ CAM.target=c.out; if(c.msg&&!c.said){ c.said=true; say(c.msg,2400);} }
  else if(c.t<4.2){ CAM.target=ZOOM_STOPS[0].z; }
  else G.cine=null;
}
