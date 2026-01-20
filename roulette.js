const TAU = Math.PI * 2;

function norm(a) {
  a = a % TAU;
  if (a < 0) a += TAU;
  return a;
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

export const DEFAULT_SEGMENTS = [
  { key: "VOID",     label: "VOID",  kind: "mult",  mult: 0.0, tint: "#0b0b12" },
  { key: "HALF",     label: "0.5X",  kind: "mult",  mult: 0.5, tint: "#1b2435" },
  { key: "ONE_A",    label: "1.0X",  kind: "mult",  mult: 1.0, tint: "#0b1d14" },
  { key: "ONE_B",    label: "1.0X",  kind: "mult",  mult: 1.0, tint: "#101625" },
  { key: "DOUBLE_A", label: "2.0X",  kind: "mult",  mult: 2.0, tint: "#061f2a" },
  { key: "DOUBLE_B", label: "2.0X",  kind: "mult",  mult: 2.0, tint: "#2a061f" },
  { key: "TRIPLE_A", label: "3.0X",  kind: "mult",  mult: 3.0, tint: "#2a1b06" },
  { key: "TRIPLE_B", label: "3.0X",  kind: "mult",  mult: 3.0, tint: "#061b2a" },
  { key: "JACKPOT",  label: "5.0X",  kind: "mult",  mult: 5.0, tint: "#3a0b1b" },
  { key: "SHARK",    label: "SHARK", kind: "event", event: "shark", tint: "#1a0b12" },
  { key: "CLEAN",    label: "CLEAN", kind: "event", event: "clean", tint: "#0b1a19" },
  { key: "BLEED",    label: "BLEED", kind: "event", event: "bleed", tint: "#1a0b0b" }
];

export class Roulette {
  constructor(canvas, { segments = DEFAULT_SEGMENTS, audio = null } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.audio = audio;
    this.segments = segments.slice();
    this.rot = 0;
    this.spinning = false;
    this._lastIndex = 0;
    this._pattern = this._makePattern();
    this.draw();
  }

  setSegments(segments) {
    this.segments = (segments || []).slice();
    this._lastIndex = this.getIndexAtPointer();
    this.draw();
  }

  _makePattern() {
    const p = document.createElement("canvas");
    p.width = 4;
    p.height = 4;
    const c = p.getContext("2d");
    c.clearRect(0, 0, 4, 4);
    c.fillStyle = "rgba(255,255,255,0.65)";
    c.fillRect(0, 0, 1, 1);
    c.fillRect(2, 2, 1, 1);
    c.fillStyle = "rgba(0,0,0,0.55)";
    c.fillRect(3, 1, 1, 1);
    return this.ctx.createPattern(p, "repeat");
  }

  getIndexAtPointer(rot = this.rot) {
    const seg = TAU / this.segments.length;
    const offset = norm(-rot);
    return Math.floor(offset / seg) % this.segments.length;
  }

  draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const r = Math.min(w, h) * 0.46;

    ctx.clearRect(0, 0, w, h);

    // Outer glow
    ctx.save();
    ctx.translate(cx, cy);
    ctx.shadowColor = "rgba(58,246,255,0.25)";
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(0, 0, r + 6, 0, TAU);
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 10;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.rot);

    const seg = TAU / this.segments.length;
    const start = -Math.PI / 2;

    for (let i = 0; i < this.segments.length; i++) {
      const s = this.segments[i];
      const a0 = start + i * seg;
      const a1 = a0 + seg;

      // Wedge fill
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r, a0, a1);
      ctx.closePath();
      ctx.fillStyle = s.tint;
      ctx.fill();

      // Dither overlay
      ctx.save();
      ctx.globalAlpha = 0.09;
      ctx.globalCompositeOperation = "overlay";
      ctx.fillStyle = this._pattern;
      ctx.fill();
      ctx.restore();

      // Edge line
      ctx.strokeStyle = "rgba(255,255,255,0.14)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label
      const mid = (a0 + a1) / 2;
      ctx.save();
      ctx.rotate(mid);
      ctx.translate(0, -r * 0.72);
      ctx.rotate(-mid);
      ctx.font = "900 14px ui-monospace, Menlo, Consolas, 'Courier New', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "rgba(255,255,255,0.88)";
      ctx.shadowColor = "rgba(255,75,216,0.22)";
      ctx.shadowBlur = 10;
      ctx.fillText(s.label, cx * 0, cy * 0);
      ctx.restore();
    }

    // Inner ring
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.58, 0, TAU);
    ctx.fillStyle = "rgba(0,0,0,0.42)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.14)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Hub
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.23, 0, TAU);
    ctx.fillStyle = "rgba(10,12,20,0.88)";
    ctx.fill();
    ctx.strokeStyle = "rgba(58,246,255,0.22)";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.font = "900 16px ui-monospace, Menlo, Consolas, 'Courier New', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(255,255,255,0.88)";
    ctx.shadowColor = "rgba(58,246,255,0.28)";
    ctx.shadowBlur = 12;
    ctx.fillText("GWL", 0, 1);

    ctx.restore();

    // Vignette
    ctx.save();
    ctx.globalAlpha = 0.25;
    const grd = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 1.2);
    grd.addColorStop(0, "rgba(0,0,0,0)");
    grd.addColorStop(1, "rgba(0,0,0,0.85)");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  async spin({ duration = 2800, minSpins = 6, maxSpins = 9 } = {}) {
    if (this.spinning) return null;
    this.spinning = true;

    const n = this.segments.length;
    const seg = TAU / n;

    const targetIndex = Math.floor(Math.random() * n);
    const desiredOffset = (targetIndex + 0.5) * seg; // where norm(-rot) should land
    const desiredMod = norm(TAU - desiredOffset);    // rot modulo TAU

    const currentMod = norm(this.rot);
    const delta = norm(desiredMod - currentMod);

    const spins = minSpins + Math.floor(Math.random() * (maxSpins - minSpins + 1));
    const startRot = this.rot;
    const endRot = startRot + spins * TAU + delta;

    const t0 = performance.now();

    return await new Promise((resolve) => {
      const step = (now) => {
        const t = Math.min(1, (now - t0) / duration);
        const e = easeOutCubic(t);

        // A tiny analog wobble (kept subtle so it won't make users nauseous)
        const wobble = this.spinning ? Math.sin(now / 90) * 0.002 : 0;

        this.rot = startRot + (endRot - startRot) * e + wobble;
        this.draw();

        const idx = this.getIndexAtPointer(this.rot);
        if (idx !== this._lastIndex) {
          this._lastIndex = idx;
          if (this.audio && typeof this.audio.play === "function") {
            this.audio.play("tick");
          }
        }

        if (t < 1) {
          requestAnimationFrame(step);
        } else {
          this.spinning = false;
          const finalIndex = this.getIndexAtPointer(this.rot);
          resolve({ index: finalIndex, segment: this.segments[finalIndex] });
        }
      };
      requestAnimationFrame(step);
    });
  }
}
