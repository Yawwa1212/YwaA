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
    this._noiseBuf = null;
    this._comp = null;
  }

  async init() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioCtx();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.volume;

    // A light compressor makes tiny synth sfx feel heavier.
    this._comp = this.ctx.createDynamicsCompressor();
    this._comp.threshold.value = -18;
    this._comp.knee.value = 24;
    this._comp.ratio.value = 4;
    this._comp.attack.value = 0.003;
    this._comp.release.value = 0.16;

    this.master.connect(this._comp);
    this._comp.connect(this.ctx.destination);

    // Prebuild a short noise buffer for clicks/impacts.
    this._noiseBuf = this._noiseBuf || this._makeNoise(0.25);

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

  _makeNoise(seconds) {
    const sr = this.ctx.sampleRate;
    const len = Math.max(1, Math.floor(sr * seconds));
    const buf = this.ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      // Slightly "colored" noise for less harshness
      const t = i / len;
      d[i] = (Math.random() * 2 - 1) * (1 - t * 0.15);
    }
    return buf;
  }

  _noiseShot(t, dur, gain, hp = 400) {
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuf || this._makeNoise(0.25);
    const g = this.ctx.createGain();
    const f = this.ctx.createBiquadFilter();
    f.type = "highpass";
    f.frequency.setValueAtTime(hp, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain), t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.01, dur));
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t);
    src.stop(t + dur + 0.02);
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
      // Click + short ping
      this._noiseShot(t, 0.05, 0.16, 1200);
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = "square";
      o.frequency.setValueAtTime(980, t);
      o.frequency.exponentialRampToValueAtTime(640, t + 0.025);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.10, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
      o.connect(g); g.connect(out);
      o.start(t); o.stop(t + 0.06);
      return;
    }

    if (name === "lever") {
      // Mechanical thump
      this._noiseShot(t, 0.11, 0.22, 700);
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = "triangle";
      o.frequency.setValueAtTime(200, t);
      o.frequency.exponentialRampToValueAtTime(90, t + 0.16);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.22, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      o.connect(g); g.connect(out);
      o.start(t); o.stop(t + 0.20);
      return;
    }

    if (name === "land") {
      // Heavy landing thud
      this._noiseShot(t, 0.10, 0.25, 420);
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(78, t);
      o.frequency.exponentialRampToValueAtTime(52, t + 0.13);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.32, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      o.connect(g); g.connect(out);
      o.start(t); o.stop(t + 0.22);
      return;
    }

    if (name === "win") {
      this._noiseShot(t, 0.08, 0.12, 900);
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(520, t);
      o.frequency.exponentialRampToValueAtTime(1040, t + 0.10);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.20, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
      o.connect(g); g.connect(out);
      o.start(t); o.stop(t + 0.18);
      return;
    }

    if (name === "lose") {
      this._noiseShot(t, 0.09, 0.18, 650);
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(320, t);
      o.frequency.exponentialRampToValueAtTime(110, t + 0.16);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.24, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.20);
      o.connect(g); g.connect(out);
      o.start(t); o.stop(t + 0.22);
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
      this._noiseShot(t, 0.22, 0.18, 520);
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

    if (name === "jackpot") {
      // Bright neon jackpot sting: chord stabs + noisy splash
      this._noiseShot(t, 0.35, 0.22, 380);

      const freqs = [392, 523.25, 659.25, 1046.5]; // G4 C5 E5 C6
      for (let i = 0; i < freqs.length; i++) {
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = i % 2 === 0 ? "square" : "sawtooth";
        const st = t + i * 0.02;
        o.frequency.setValueAtTime(freqs[i], st);
        o.frequency.exponentialRampToValueAtTime(freqs[i] * 1.18, st + 0.12);
        g.gain.setValueAtTime(0.0001, st);
        g.gain.exponentialRampToValueAtTime(0.18, st + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, st + 0.22);
        o.connect(g); g.connect(out);
        o.start(st);
        o.stop(st + 0.28);
      }
      // Trailing sparkle
      for (let k = 0; k < 8; k++) {
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        const st = t + 0.18 + k * 0.03;
        o.type = "triangle";
        o.frequency.setValueAtTime(900 + Math.random() * 1500, st);
        g.gain.setValueAtTime(0.0001, st);
        g.gain.exponentialRampToValueAtTime(0.12, st + 0.008);
        g.gain.exponentialRampToValueAtTime(0.0001, st + 0.12);
        o.connect(g); g.connect(out);
        o.start(st);
        o.stop(st + 0.14);
      }
    }
  }
}
