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
  // The wheel is intentionally simple and readable.
  // Multipliers are PROFIT multipliers:
  // totalReturn = bet + bet*mult
  { key: "BUST",    label: "BUST",    kind: "mult", mult: -1,  weight: 26, tint: "#0b0712" },
  { key: "PUSH",    label: "PUSH",    kind: "mult", mult:  0,  weight: 18, tint: "#061428" },
  { key: "ONE",     label: "1X",      kind: "mult", mult:  1,  weight: 24, tint: "#002a3a" },
  { key: "TWO",     label: "2X",      kind: "mult", mult:  2,  weight: 12, tint: "#2a003a" },
  { key: "THREE",   label: "3X",      kind: "mult", mult:  3,  weight:  6, tint: "#1b3a00" },
  { key: "JACKPOT", label: "JACKPOT", kind: "mult", mult: 12,  weight:  2, tint: "#3a0014" }
];

function pickWeighted(segments) {
  const items = segments || [];
  let total = 0;
  for (const s of items) total += Math.max(0, Number(s.weight ?? 1) || 0);
  if (total <= 0) return Math.floor(Math.random() * Math.max(1, items.length));
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= Math.max(0, Number(items[i].weight ?? 1) || 0);
    if (r <= 0) return i;
  }
  return items.length - 1;
}

export class Roulette {
  constructor(canvas, { segments = DEFAULT_SEGMENTS, audio = null } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.audio = audio;
    this.segments = segments.slice();
    this.rot = 0;
    this.spinning = false;
    this._lastIndex = 0;
    this._lastTickAt = 0;
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
    ctx.shadowBlur = 12;
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

      // Wedge fill (neon glass feel)
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r, a0, a1);
      ctx.closePath();

      const g = ctx.createRadialGradient(0, 0, r * 0.06, 0, 0, r);
      g.addColorStop(0, "rgba(0,0,0,0.55)");
      g.addColorStop(0.42, s.tint);
      g.addColorStop(1, "rgba(255,255,255,0.10)");
      ctx.fillStyle = g;
      ctx.fill();

      // Jackpot hazard stripes
      if (s.key === "JACKPOT") {
        ctx.save();
        ctx.globalAlpha = 0.22;
        ctx.globalCompositeOperation = "screen";
        ctx.fillStyle = "rgba(255,212,0,0.7)";
        for (let k = 0; k < 16; k++) {
          const rr0 = r * (0.25 + k * 0.04);
          const rr1 = rr0 + r * 0.018;
          ctx.beginPath();
          ctx.arc(0, 0, rr1, a0, a1);
          ctx.arc(0, 0, rr0, a1, a0, true);
          ctx.closePath();
          if (k % 2 === 0) ctx.fill();
        }
        ctx.restore();
      }

      // Dither overlay
      ctx.save();
      ctx.globalAlpha = 0.09;
      ctx.globalCompositeOperation = "overlay";
      ctx.fillStyle = this._pattern;
      ctx.fill();
      ctx.restore();

      // Edge line (bright neon)
      ctx.save();
      ctx.shadowColor = s.key === "JACKPOT" ? "rgba(255,212,0,0.55)" : "rgba(58,246,255,0.35)";
      ctx.shadowBlur = s.key === "JACKPOT" ? 12 : 7;
      ctx.strokeStyle = s.key === "BUST" ? "rgba(255,53,107,0.35)" : "rgba(255,255,255,0.18)";
      ctx.lineWidth = 2.25;
      ctx.stroke();
      ctx.restore();

      // Label
      const mid = (a0 + a1) / 2;
      ctx.save();
      ctx.rotate(mid);
      ctx.translate(0, -r * 0.72);
      ctx.rotate(-mid);
      ctx.font = s.key === "JACKPOT" ? "900 15px ui-monospace, Menlo, Consolas, 'Courier New', monospace" : "900 14px ui-monospace, Menlo, Consolas, 'Courier New', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      // Stroke + glow to survive scanlines
      ctx.lineWidth = 5;
      ctx.strokeStyle = "rgba(0,0,0,0.55)";
      ctx.strokeText(s.label, 0, 0);

      ctx.fillStyle = s.key === "JACKPOT" ? "rgba(255,212,0,0.95)" : "rgba(255,255,255,0.92)";
      ctx.shadowColor = s.key === "BUST" ? "rgba(255,53,107,0.35)" : s.key === "JACKPOT" ? "rgba(255,212,0,0.55)" : "rgba(255,75,216,0.28)";
      ctx.shadowBlur = s.key === "JACKPOT" ? 12 : 8;
      ctx.fillText(s.label, 0, 0);
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
    ctx.shadowBlur = 8;
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

    const targetIndex = pickWeighted(this.segments);
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
          const canTick = now - (this._lastTickAt || 0) > 34;
          if (canTick) {
            this._lastTickAt = now;
            if (this.audio && typeof this.audio.play === "function") {
              this.audio.play("tick");
            }
          }
        }

        if (t < 1) {
          requestAnimationFrame(step);
        } else {
          this.spinning = false;
          const finalIndex = this.getIndexAtPointer(this.rot);
          if (this.audio && typeof this.audio.play === "function") {
            this.audio.play("land");
          }
          resolve({ index: finalIndex, segment: this.segments[finalIndex] });
        }
      };
      requestAnimationFrame(step);
    });
  }
}
