
export function pickWeighted(segments){
  const total = segments.reduce((a,s)=>a+(s.weight||1),0);
  let r = Math.random()*total;
  for(let i=0;i<segments.length;i++){
    r -= (segments[i].weight||1);
    if(r<=0) return i;
  }
  return segments.length-1;
}

export class RouletteWheel{
  constructor(canvas, audio){
    this.canvas=canvas;
    this.ctx=canvas.getContext("2d");
    this.audio=audio;
    this.rot=0;
    this.segments=[];
    this._raf=0;
  }

  setSegments(arr){
    this.segments = arr.slice();
    this.draw();
  }

  draw(){
    const ctx=this.ctx;
    const w=this.canvas.width, h=this.canvas.height;
    const cx=w/2, cy=h/2;
    const R=Math.min(w,h)/2 - 14;
    const inner=R*0.20;

    ctx.clearRect(0,0,w,h);

    ctx.save();
    ctx.translate(cx,cy);
    ctx.strokeStyle="rgba(255,255,255,0.22)";
    ctx.lineWidth=8;
    ctx.beginPath(); ctx.arc(0,0,R+4,0,Math.PI*2); ctx.stroke();
    ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(0,0,R-6,0,Math.PI*2); ctx.stroke();
    ctx.restore();

    const n=this.segments.length;
    const step = (Math.PI*2)/n;

    ctx.save();
    ctx.translate(cx,cy);
    ctx.rotate(this.rot);

    for(let i=0;i<n;i++){
      const seg=this.segments[i];
      const a0 = -Math.PI/2 + i*step;
      const a1 = a0 + step;

      ctx.beginPath();
      ctx.moveTo(0,0);
      ctx.arc(0,0,R,a0,a1);
      ctx.closePath();
      ctx.fillStyle = seg.fill || "#111";
      ctx.fill();

      ctx.strokeStyle="rgba(255,255,255,0.28)";
      ctx.lineWidth=2;
      ctx.stroke();

      const mid=(a0+a1)/2;
      const rLabel=R*0.70;
      ctx.save();
      ctx.rotate(mid);
      ctx.translate(rLabel,0);
      ctx.rotate(Math.PI/2);
      ctx.textAlign="center";
      ctx.textBaseline="middle";
      ctx.font="900 22px ui-monospace, Menlo, Consolas, monospace";

      const label = seg.label;
      ctx.lineWidth=4;
      ctx.strokeStyle="rgba(0,0,0,0.9)";
      ctx.strokeText(label,0,0);
      ctx.fillStyle= seg.text || "#fff";
      ctx.fillText(label,0,0);

      ctx.restore();
    }

    ctx.beginPath();
    ctx.arc(0,0,inner,0,Math.PI*2);
    ctx.fillStyle="rgba(0,0,0,0.75)";
    ctx.fill();
    ctx.strokeStyle="rgba(255,255,255,0.30)";
    ctx.lineWidth=2;
    ctx.stroke();

    ctx.restore();
  }

  async spin({duration=3600, minSpins=8, maxSpins=11}={}){
    const n=this.segments.length;
    if(n===0) return null;

    const targetIndex = pickWeighted(this.segments);
    const step = (Math.PI*2)/n;

    const targetAngle = -Math.PI/2 + (targetIndex+0.5)*step;
    const desired = (-Math.PI/2) - targetAngle;

    const spins = (minSpins + Math.random()*(maxSpins-minSpins));
    const start = this.rot;
    let end = desired + spins*(Math.PI*2);
    while(end < start + Math.PI*2) end += Math.PI*2;

    const t0 = performance.now();
    const ease = (p)=>1-Math.pow(1-p,3);

    return await new Promise((resolve)=>{
      const tickEvery = 80;
      let lastTick=0;

      const frame = (now)=>{
        const p = Math.min(1, (now-t0)/duration);
        const e = ease(p);
        this.rot = start + (end-start)*e;
        this.draw();

        if(this.audio && (now-lastTick>tickEvery) && p<0.98){
          this.audio.play("tick");
          lastTick=now;
        }

        if(p<1){
          this._raf=requestAnimationFrame(frame);
        }else{
          if(this.audio) this.audio.play("land");
          const angleWheel = (-Math.PI/2) - this.rot;
          let idx = Math.floor(((angleWheel - (-Math.PI/2)) / step)) % n;
          if(idx<0) idx += n;
          resolve({ index: idx, segment: this.segments[idx] });
        }
      };
      this._raf=requestAnimationFrame(frame);
    });
  }
}
