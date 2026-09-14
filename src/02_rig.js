// ===== character rig (inked comic style) =====
// A pose is a set of joint angles in radians. 0 = hanging straight down.
// arms: [upper, lower(relative)], legs: [upper, lower], torso lean, head tilt.
const POSES = {
  idle:    {lean:0,    head:0,    la:[0.15,0.1],  ra:[-0.15,-0.1], ll:[0,0],     rl:[0,0],     mouth:'flat', brow:0},
  armsUp:  {lean:-0.08,head:-0.15,la:[2.6,0.6],   ra:[-2.6,-0.6],  ll:[0.15,0],  rl:[-0.15,0], mouth:'o',    brow:1},
  giveUp:  {lean:0.45, head:0.6,  la:[-0.9,0.3],  ra:[-0.8,0.2],   ll:[0.35,-0.5],rl:[0.35,-0.5],mouth:'frown',brow:-1},
  headDown:{lean:0.22, head:0.7,  la:[0.2,0.15],  ra:[-0.2,-0.15], ll:[0,0],     rl:[0,0],     mouth:'frown',brow:-1},
  shrug:   {lean:0,    head:0.1,  la:[1.4,-1.7],  ra:[-1.4,1.7],   ll:[0,0],     rl:[0,0],     mouth:'flat', brow:1},
  wave:    {lean:0,    head:-0.05,la:[0.2,0.1],   ra:[-2.9,0.5],   ll:[0,0],     rl:[0,0],     mouth:'smile',brow:0},
  think:   {lean:-0.02,head:0.15, la:[0.3,0.1],   ra:[-1.2,-1.8],  ll:[0,0],     rl:[0,0],     mouth:'flat', brow:0},
  cheer:   {lean:-0.15,head:-0.3, la:[2.9,0.2],   ra:[-2.9,-0.2],  ll:[0.2,0],   rl:[-0.2,0],  mouth:'smile',brow:1},
  sit:     {lean:0.05, head:0,    la:[1.2,0.3],   ra:[-1.2,-0.3],  ll:[1.5,-1.5],rl:[1.5,-1.5],mouth:'flat', brow:0},
  sleep:   {lean:1.5,  head:0.2,  la:[0.3,0.3],   ra:[0.2,0.2],    ll:[0.1,0],   rl:[0.1,0],   mouth:'flat', brow:-1},
  push:    {lean:0.3,  head:0.1,  la:[-1.2,0.3],  ra:[-1.2,0.3],   ll:[0,0],     rl:[0,0],     mouth:'flat', brow:0},
  facepalm:{lean:0.15, head:0.5,  la:[0.2,0.1],   ra:[-2.4,-1.2],  ll:[0,0],     rl:[0,0],     mouth:'frown',brow:-1}
};
function makeRig(opts){
  const r = Object.assign({
    x:0, y:0, dir:1, h:PLAYER_H, skin:'#f1c6a0', shirt:'#d9534f', pants:'#2c3e60', hair:'#3a2414', shoes:'#1a1a1a',
    hairStyle:'short', beard:false, hat:false, mood:'flat',
    pose:'idle', cur:JSON.parse(JSON.stringify(POSES.idle)), walkT:0, moving:false, emoteT:0, blink:0
  }, opts||{});
  return r;
}
function rigSetPose(r, name, secs){ r.pose=name; r.emoteT=secs||0; }
function rigUpdate(r, dt){
  if(r.emoteT>0){ r.emoteT-=dt; if(r.emoteT<=0){ r.pose = r.sitting?'sit':'idle'; } }
  const tgt = POSES[r.pose]||POSES.idle;
  const k = 1-Math.pow(0.0005, dt);
  const c=r.cur;
  c.lean=lerp(c.lean,tgt.lean,k); c.head=lerp(c.head,tgt.head,k);
  for(const j of ['la','ra','ll','rl']){ c[j][0]=lerp(c[j][0],tgt[j][0],k); c[j][1]=lerp(c[j][1],tgt[j][1],k); }
  c.mouth=tgt.mouth; c.brow=tgt.brow;
  if(r.moving && r.pose==='idle'){ r.walkT += dt*9; } else { r.walkT = lerp(r.walkT, Math.round(r.walkT/Math.PI)*Math.PI, k); }
  r.blink -= dt; if(r.blink<-0.12) r.blink = rnd(1.5,4.5);
}
// draws the rig with feet at (x,y). Everything scaled so total height = h.
function drawRig(ctx, r){
  const s = r.h/40, c=r.cur;
  const walk = (r.moving && r.pose==='idle') ? 1 : 0;
  const sw = Math.sin(r.walkT), sw2=Math.sin(r.walkT+Math.PI);
  const bob = walk*Math.abs(Math.cos(r.walkT))*1.2*s;
  ctx.save(); ctx.translate(r.x, r.y - bob); ctx.scale(r.dir*s, s);
  ctx.lineJoin='round'; ctx.lineCap='round'; ctx.strokeStyle='#1a1a1a'; ctx.lineWidth=1.5;
  const hipY=-19, torsoLen=15, shY=hipY-torsoLen;
  // legs
  function limb(x0,y0,a1,a2,len1,len2,col1,col2,w1,w2,foot){
    const x1=x0+Math.sin(a1)*len1, y1=y0+Math.cos(a1)*len1;
    const x2=x1+Math.sin(a1+a2)*len2, y2=y1+Math.cos(a1+a2)*len2;
    ctx.strokeStyle='#1a1a1a'; ctx.lineWidth=w1+2.4; ctx.beginPath(); ctx.moveTo(x0,y0); ctx.lineTo(x1,y1); ctx.stroke();
    ctx.lineWidth=w2+2.4; ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
    ctx.strokeStyle=col1; ctx.lineWidth=w1; ctx.beginPath(); ctx.moveTo(x0,y0); ctx.lineTo(x1,y1); ctx.stroke();
    ctx.strokeStyle=col2; ctx.lineWidth=w2; ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
    if(foot){ ctx.fillStyle=r.shoes; ctx.strokeStyle='#1a1a1a'; ctx.lineWidth=1.2; ctx.beginPath(); ctx.moveTo(x2-3,y2-1); ctx.lineTo(x2+6,y2-1); ctx.lineTo(x2+7,y2+2); ctx.lineTo(x2-3,y2+2); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    else { ctx.fillStyle=col2; ctx.strokeStyle='#1a1a1a'; ctx.lineWidth=1; ctx.beginPath(); ctx.arc(x2,y2,2.2,0,7); ctx.fill(); ctx.stroke(); }
    return [x2,y2];
  }
  const llA = c.ll[0] + walk*sw*0.7, rlA = c.rl[0] + walk*sw2*0.7;
  const llB = c.ll[1] + walk*Math.max(0,-sw)*0.9, rlB = c.rl[1] + walk*Math.max(0,-sw2)*0.9;
  // back leg first (right), then torso, then front leg (left) for depth
  limb(1,hipY, rlA, -rlB, 10,9, r.pants, r.pants, 5,4.5, true);
  // torso
  ctx.save(); ctx.translate(0,hipY); ctx.rotate(c.lean);
  ctx.fillStyle=r.shirt; ctx.strokeStyle='#1a1a1a'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.moveTo(-6,0); ctx.lineTo(6,0); ctx.lineTo(7,-torsoLen); ctx.lineTo(-7,-torsoLen); ctx.closePath(); ctx.fill(); ctx.stroke();
  // hatching on shaded side
  ctx.strokeStyle='rgba(20,20,20,0.35)'; ctx.lineWidth=0.7;
  for(let i=0;i<5;i++){ ctx.beginPath(); ctx.moveTo(-6, -2-i*2.6); ctx.lineTo(-2.5, -4-i*2.6); ctx.stroke(); }
  // right arm (back) drawn behind head? keep simple: draw both after torso
  const raA = c.ra[0] + walk*sw*0.5, laA = c.la[0] + walk*sw2*0.5;
  ctx.strokeStyle='#1a1a1a'; ctx.lineWidth=1.5;
  limb(-4,-torsoLen+1, raA, c.ra[1], 9,9, r.shirt, r.skin, 4,2.8, false);
  // neck + head
  ctx.save(); ctx.translate(0,-torsoLen); ctx.rotate(c.head);
  ctx.fillStyle=r.skin; ctx.fillRect(-2,-3,4,4); ctx.strokeRect(-2,-3,4,4);
  ctx.beginPath(); ctx.arc(0,-9.5,7,0,7); ctx.fill(); ctx.stroke();
  // hair
  ctx.fillStyle=r.hair;
  if(r.hairStyle==='short'){ ctx.beginPath(); ctx.moveTo(-7,-10); ctx.quadraticCurveTo(-5,-18,1,-17); ctx.quadraticCurveTo(6,-18,7,-11); ctx.quadraticCurveTo(3,-14,-1,-13); ctx.quadraticCurveTo(-4,-13,-7,-10); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  else if(r.hairStyle==='messy'){ ctx.beginPath(); ctx.moveTo(-8,-9); ctx.lineTo(-6,-17); ctx.lineTo(-2,-14); ctx.lineTo(0,-19); ctx.lineTo(3,-15); ctx.lineTo(7,-18); ctx.lineTo(7,-10); ctx.quadraticCurveTo(0,-13,-8,-9); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  else if(r.hairStyle==='bun'){ ctx.beginPath(); ctx.arc(-4,-16,3.2,0,7); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-7,-10); ctx.quadraticCurveTo(0,-19,7,-10); ctx.quadraticCurveTo(0,-13,-7,-10); ctx.fill(); ctx.stroke(); }
  if(r.hat){ ctx.fillStyle=r.hat; ctx.beginPath(); ctx.moveTo(-8,-13); ctx.lineTo(8,-13); ctx.lineTo(7,-19); ctx.lineTo(-7,-19); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-8,-13); ctx.lineTo(12,-13); ctx.stroke(); }
  if(r.beard){ ctx.fillStyle=r.beard; ctx.beginPath(); ctx.moveTo(-6,-8); ctx.quadraticCurveTo(0,4,6,-8); ctx.quadraticCurveTo(0,-6,-6,-8); ctx.fill(); ctx.stroke(); }
  // face (facing +x)
  ctx.fillStyle='#1a1a1a';
  if(r.blink>0){ ctx.fillRect(2,-11,1.6,1.8); ctx.fillRect(5.2,-11,1.6,1.8); } else { ctx.fillRect(2,-10.4,1.6,0.6); ctx.fillRect(5.2,-10.4,1.6,0.6); }
  ctx.strokeStyle='#1a1a1a'; ctx.lineWidth=1;
  const b=c.brow; ctx.beginPath(); ctx.moveTo(1.5,-13+b*0.8); ctx.lineTo(3.8,-13-b*0.6); ctx.moveTo(5,-13-b*0.6); ctx.lineTo(7.2,-13+b*0.8); ctx.stroke();
  ctx.beginPath();
  if(c.mouth==='smile'){ ctx.moveTo(2.5,-5.5); ctx.quadraticCurveTo(4.5,-3.5,6.5,-5.5); }
  else if(c.mouth==='frown'){ ctx.moveTo(2.5,-4.5); ctx.quadraticCurveTo(4.5,-6.5,6.5,-4.5); }
  else if(c.mouth==='o'){ ctx.arc(4.5,-5,1.5,0,7); }
  else { ctx.moveTo(2.5,-5); ctx.lineTo(6.5,-5); }
  ctx.stroke();
  ctx.restore(); // head
  // left arm (front)
  limb(4,-torsoLen+1, laA, c.la[1], 9,9, r.shirt, r.skin, 4,2.8, false);
  ctx.restore(); // torso
  limb(-1,hipY, llA, -llB, 10,9, r.pants, r.pants, 5,4.5, true);
  ctx.restore();
}
