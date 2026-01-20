function clamp01(x){return Math.max(0, Math.min(1, x));}

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.enabled = true;
    this.volume = 0.8;
    this.buffers = new Map(); // key: url -> AudioBuffer
    this.groups = {};
    this.basePath = "";
    this._lastTickAt = 0;
  }

  async init() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioCtx();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(this.ctx.destination);

    try {
      const res = await fetch("audio_manifest.json", { cache: "no-store" });
      if (res.ok) {
        const manifest = await res.json();
        this.basePath = manifest.basePath || "";
        this.groups = manifest.groups || {};
        await this._loadAllGroups();
      }
    } catch {
      // ignore
    }
  }

  setEnabled(on) {
    this.enabled = !!on;
  }

  setVolume(v) {
    this.volume = clamp01(v);
    if (this.master) this.master.gain.value = this.volume;
  }

  async resume() {
    if (!this.ctx) return;
    if (this.ctx.state === "suspended") {
      try { await this.ctx.resume(); } catch { /* ignore */ }
    }
  }

  async _loadAllGroups() {
    const seen = new Set();
    for (const key of Object.keys(this.groups)) {
      const arr = this.groups[key] || [];
      for (const file of arr) {
        const url = this.basePath + file;
        if (seen.has(url)) continue;
        seen.add(url);
        this._loadBuffer(url);
      }
    }
  }

  async _loadBuffer(url) {
    if (this.buffers.has(url)) return;
    try {
      const res = await fetch(url);
      if (!res.ok) return;
      const arrayBuffer = await res.arrayBuffer();
      const buffer = await this.ctx.decodeAudioData(arrayBuffer);
      this.buffers.set(url, buffer);
    } catch {
      // ignore
    }
  }

  play(name) {
    if (!this.enabled) return;
    this.resume();

    const t = this.ctx.currentTime;
    const out = this.master;

    // Group random
    const arr = this.groups[name] || [];
    if (arr.length > 0) {
      const file = arr[Math.floor(Math.random() * arr.length)];
      const url = this.basePath + file;
      const buf = this.buffers.get(url);
      if (buf) {
        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        src.connect(out);
        src.start(t);
        return;
      }
    }

    // Fallback synthesized
    if (name === "tick") {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = "square";
      o.frequency.setValueAtTime(880, t);
      o.frequency.exponentialRampToValueAtTime(660, t + 0.03);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.12, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
      o.connect(g); g.connect(out);
      o.start(t); o.stop(t + 0.06);
      return;
    }

    if (name === "lever") {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = "triangle";
      o.frequency.setValueAtTime(220, t);
      o.frequency.exponentialRampToValueAtTime(110, t + 0.12);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.18, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
      o.connect(g); g.connect(out);
      o.start(t); o.stop(t + 0.16);
      return;
    }

    if (name === "win") {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(440, t);
      o.frequency.exponentialRampToValueAtTime(880, t + 0.1);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.15, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      o.connect(g); g.connect(out);
      o.start(t); o.stop(t + 0.14);
      return;
    }

    if (name === "lose") {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(440, t);
      o.frequency.exponentialRampToValueAtTime(220, t + 0.1);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.15, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      o.connect(g); g.connect(out);
      o.start(t); o.stop(t + 0.14);
      return;
    }

    if (name === "organ") {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(220, t);
      o.frequency.exponentialRampToValueAtTime(60, t + 0.18);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.35, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      o.connect(g); g.connect(out);
      o.start(t); o.stop(t + 0.24);
      return;
    }

    if (name === "shark") {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = "triangle";
      o.frequency.setValueAtTime(110, t);
      o.frequency.exponentialRampToValueAtTime(70, t + 0.45);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.26, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.52);
      o.connect(g); g.connect(out);
      o.start(t); o.stop(t + 0.54);
      return;
    }

    if (name === "party") {
      for (let i = 0; i < 6; i++) {
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = "square";
        const start = t + i * 0.03;
        o.frequency.setValueAtTime(800 + Math.random()*900, start);
        g.gain.setValueAtTime(0.0001, start);
        g.gain.exponentialRampToValueAtTime(0.12, start + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, start + 0.15);
        o.connect(g); g.connect(out);
        o.start(start); o.stop(start + 0.17);
      }
    }
  }
}
