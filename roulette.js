export const SEGMENTS = (() => {
  // Counts requested:
  // 20:1, 10:3, 3:5, 1:10, -2:5, -10:1, ★:1
  const seg = [];
  const pushN = (type, label, n, props) => { for (let i=0;i<n;i++) seg.push({type,label,...props}); };

  pushN("mul","20",1,{mult:20, colorKey:"Y"});
  pushN("mul","10",3,{mult:10, colorKey:"M"});
  pushN("mul","3",5,{mult:3, colorKey:"C"});
  // "1 is actually 2x" rule:
  pushN("mul","1",10,{mult:2, colorKey:"G"});

  pushN("pen","-2",5,{penalty:2, colorKey:"R"});
  pushN("pen","-10",1,{penalty:10, colorKey:"R2"});

  pushN("boost","★",1,{boost:2, colorKey:"C2"});

  return seg;
})();

export function colorForKey(key){
  const map = {
    C: "#33f6ff",
    C2:"#55b7ff",
    M: "#ff47d6",
    Y: "#ffd45a",
    G: "#33ff88",
    R: "#ff356b",
    R2:"#ff0f3f",
  };
  return map[key] || "#ffffff";
}

export function buildBetOptions(){
  const uniq = [];
  const seen = new Set();
  for (const s of SEGMENTS){
    const key = s.type+":"+s.label;
    if (seen.has(key)) continue;
    seen.add(key);
    let hint = "";
    if (s.type === "mul") hint = `x${s.mult}`;
    if (s.type === "pen") hint = `-${s.penalty}x`;
    if (s.type === "boost") hint = `BOOST`;
    uniq.push({
      type: s.type,
      label: s.label,
      colorKey: s.colorKey,
      hint,
    });
  }
  const order = ["20","10","3","1","★","-2","-10"];
  uniq.sort((a,b)=> order.indexOf(a.label) - order.indexOf(b.label));
  return uniq;
}

export function spinPlan(){
  const idx = Math.floor(Math.random() * SEGMENTS.length);
  const N = SEGMENTS.length;
  const baseTurns = 5 + Math.floor(Math.random()*3); // 5~7 turns
  const segAngle = (Math.PI*2)/N;

  // index 0 starts at -PI/2
  const targetCenter = (-Math.PI/2) + (idx + 0.5) * segAngle;
  const needed = (-Math.PI/2) - targetCenter;
  const finalRot = baseTurns * Math.PI*2 + needed;

  const durationMs = 1600 + Math.floor(Math.random()*500);
  return { idx, finalRot, durationMs };
}

export function drawWheel(ctx, w, h, rot){
  const N = SEGMENTS.length;
  const r = Math.min(w,h) * 0.48;
  const cx = w/2, cy = h/2;
  ctx.clearRect(0,0,w,h);

  ctx.save();
  ctx.translate(cx,cy);
  ctx.rotate(rot);

  const segAngle = (Math.PI*2)/N;

  for (let i=0;i<N;i++){
    const s = SEGMENTS[i];
    const a0 = (-Math.PI/2) + i*segAngle;
    const a1 = a0 + segAngle;

    ctx.beginPath();
    ctx.moveTo(0,0);
    ctx.arc(0,0,r,a0,a1,false);
    ctx.closePath();
    ctx.fillStyle = "rgba(0,0,0,0.82)";
    ctx.fill();

    const col = colorForKey(s.colorKey);
    ctx.strokeStyle = col;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.strokeStyle = "rgba(255,255,255,0.16)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0,0,r*0.92,a0,a1,false);
    ctx.stroke();

    const mid = (a0+a1)/2;
    ctx.save();
    ctx.rotate(mid);
    ctx.translate(0, -r*0.68);
    ctx.rotate(-mid);

    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.font = "900 20px ui-monospace, Menlo, Monaco, Consolas";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(s.label, 0, 0);

    ctx.fillStyle = "rgba(255,255,255,0.68)";
    ctx.font = "700 11px ui-monospace, Menlo, Monaco, Consolas";
    let hint = "";
    if (s.type==="mul") hint = "x"+s.mult;
    else if (s.type==="pen") hint = "-"+s.penalty+"x";
    else if (s.type==="boost") hint = "BOOST";
    ctx.fillText(hint, 0, 18);

    ctx.restore();

    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0,0);
    ctx.lineTo(Math.cos(a0)*r, Math.sin(a0)*r);
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.arc(0,0,r+2,0,Math.PI*2);
  ctx.strokeStyle = "rgba(255,255,255,0.22)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.restore();

  ctx.beginPath();
  ctx.arc(cx,cy,r*0.12,0,Math.PI*2);
  ctx.fillStyle = "rgba(0,0,0,0.8)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.22)";
  ctx.lineWidth = 2;
  ctx.stroke();
}
