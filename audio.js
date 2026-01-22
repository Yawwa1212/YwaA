
function clamp01(x){return Math.max(0, Math.min(1, x));}

export class AudioEngine{
  constructor(){
    this.ctx=null; this.master=null;
    this.enabled=true; this.volume=0.65;
  }
  async init(){
    if(this.ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioCtx();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(this.ctx.destination);
  }
  setEnabled(on){this.enabled=!!on}
  setVolume(v){this.volume=clamp01(v); if(this.master) this.master.gain.value=this.volume}
  async resume(){
    if(!this.ctx) return;
    if(this.ctx.state==="suspended"){ try{await this.ctx.resume()}catch{} }
  }

  play(name){
    if(!this.enabled) return;
    if(!this.ctx) return;
    this.resume();
    const t=this.ctx.currentTime;
    const out=this.master;

    if(name==="tick"){
      const o=this.ctx.createOscillator();
      const g=this.ctx.createGain();
      o.type="triangle";
      o.frequency.setValueAtTime(540, t);
      o.frequency.exponentialRampToValueAtTime(320, t+0.02);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.10, t+0.004);
      g.gain.exponentialRampToValueAtTime(0.001, t+0.05);
      o.connect(g); g.connect(out);
      o.start(t); o.stop(t+0.06);
      return;
    }

    if(name==="land"){
      const o=this.ctx.createOscillator();
      const g=this.ctx.createGain();
      o.type="sine";
      o.frequency.setValueAtTime(120, t);
      o.frequency.exponentialRampToValueAtTime(70, t+0.12);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.22, t+0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t+0.16);
      o.connect(g); g.connect(out);
      o.start(t); o.stop(t+0.18);
      return;
    }

    if(name==="win"){
      const o=this.ctx.createOscillator();
      const g=this.ctx.createGain();
      o.type="sine";
      o.frequency.setValueAtTime(660, t);
      o.frequency.exponentialRampToValueAtTime(990, t+0.10);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.14, t+0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t+0.18);
      o.connect(g); g.connect(out);
      o.start(t); o.stop(t+0.20);
      return;
    }

    if(name==="lose"){
      const o=this.ctx.createOscillator();
      const g=this.ctx.createGain();
      o.type="sine";
      o.frequency.setValueAtTime(240, t);
      o.frequency.exponentialRampToValueAtTime(90, t+0.14);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.16, t+0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t+0.22);
      o.connect(g); g.connect(out);
      o.start(t); o.stop(t+0.24);
      return;
    }

    if(name==="boost"){
      const notes=[440, 660, 880];
      for(let i=0;i<notes.length;i++){
        const o=this.ctx.createOscillator();
        const g=this.ctx.createGain();
        const start=t+i*0.05;
        o.type="triangle";
        o.frequency.setValueAtTime(notes[i], start);
        g.gain.setValueAtTime(0.0001, start);
        g.gain.exponentialRampToValueAtTime(0.10, start+0.01);
        g.gain.exponentialRampToValueAtTime(0.001, start+0.18);
        o.connect(g); g.connect(out);
        o.start(start); o.stop(start+0.20);
      }
      return;
    }
  }
}
