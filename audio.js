function clamp01(x){ return Math.max(0, Math.min(1, x)); }

export class AudioEngine{
  constructor(){
    this.ctx = null;
    this.master = null;
    this.enabled = true;
    this.volume = 0.75;
  }

  async init(){
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioCtx();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(this.ctx.destination);
  }

  async resume(){
    if (!this.ctx) return;
    if (this.ctx.state === "suspended"){
      try{ await this.ctx.resume(); }catch{}
    }
  }

  setEnabled(on){ this.enabled = !!on; }
  setVolume(v){
    this.volume = clamp01(v);
    if (this.master) this.master.gain.value = this.volume;
  }

  _env(g, t, a=0.12, d=0.08){
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(a, t+0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t+d);
  }

  playTick(){
    if (!this.enabled) return;
    this.resume();
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = "triangle";
    o.frequency.setValueAtTime(520, t);
    o.frequency.exponentialRampToValueAtTime(360, t+0.03);
    this._env(g,t,0.09,0.05);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t+0.06);
  }

  playSpin(){
    if (!this.enabled) return;
    this.resume();
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(220, t+0.35);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.06, t+0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t+0.45);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t+0.5);
  }

  playWin(){
    if (!this.enabled) return;
    this.resume();
    const t = this.ctx.currentTime;
    for (const [f,dt] of [[660,0],[990,0.02],[1320,0.04]]){
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(f, t+dt);
      g.gain.setValueAtTime(0.0001, t+dt);
      g.gain.exponentialRampToValueAtTime(0.10, t+dt+0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t+dt+0.20);
      o.connect(g); g.connect(this.master);
      o.start(t+dt); o.stop(t+dt+0.22);
    }
  }

  playLose(){
    if (!this.enabled) return;
    this.resume();
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(220, t);
    o.frequency.exponentialRampToValueAtTime(70, t+0.22);
    this._env(g,t,0.12,0.28);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t+0.30);
  }

  playBoost(){
    if (!this.enabled) return;
    this.resume();
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = "square";
    o.frequency.setValueAtTime(880, t);
    o.frequency.exponentialRampToValueAtTime(1760, t+0.10);
    this._env(g,t,0.08,0.14);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t+0.16);
  }
}
