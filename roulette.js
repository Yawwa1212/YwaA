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
  // Profit multipliers:
  // totalReturn = bet + bet*mult
  { key: "BUST",    label: "BUST",    kind: "mult", mult: -1, weight: 26 },
  { key: "PUSH",    label: "PUSH",    kind: "mult", mult:  0, weight: 18 },
  { key: "ONE",     label: "1X",      kind: "mult", mult:  1, weight: 24 },
  { key: "TWO",     label: "2X",      kind: "mult", mult:  2, weight: 12 },
  { key: "THREE",   label: "3X",      kind: "mult", mult:  3, weight:  6 },
  { key: "JACKPOT", label: "JACKPOT", kind: "mult", mult: 12, weight:  2 }
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
    this.draw();
  }

  setSegments(segments) {
    this.segments = (segments || []).slice();
    this._lastIndex = this.getIndexAtPointer();
    this.draw();
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

    // Outer ring
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r + 6, 0, TAU);
    ctx.strokeStyle = "rgba(255,255,255,0.22)";
    ctx.lineWidth = 2;
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
      const isJackpot = s.key === "JACKPOT";
      const isBust = s.key === "BUST";

      // Wedge
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r, a0, a1);
      ctx.closePath();

      let fill = (i % 2 === 0) ? "#0a0a0a" : "#111";
      if (isBust) fill = "#050505";
      if (isJackpot) fill = "#fff";

      ctx.fillStyle = fill;
      ctx.fill();

      ctx.strokeStyle = "rgba(255,255,255,0.22)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label
      const mid = (a0 + a1) / 2;
      ctx.save();
      ctx.rotate(mid);
      ctx.translate(0, -r * 0.72);
      ctx.rotate(-mid);
      ctx.font = isJackpot
        ? "900 15px ui-monospace, Menlo, Consolas, Courier New, monospace"
        : "900 14px ui-monospace, Menlo, Consolas, Courier New, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = isJackpot ? "#000" : "rgba(255,255,255,0.92)";
      ctx.fillText(s.label, 0, 0);
      ctx.restore();
    }

    // Hub
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.22, 0, TAU);
    ctx.fillStyle = "#000";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.42)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = "900 15px ui-monospace, Menlo, Consolas, Courier New, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.fillText("GWL", 0, 1);

    ctx.restore();

    // Soft vignette (very subtle)
    ctx.save();
    ctx.globalAlpha = 0.10;
    const grd = ctx.createRadialGradient(cx, cy, r * 0.25, cx, cy, r * 1.15);
    grd.addColorStop(0, "rgba(0,0,0,0)");
    grd.addColorStop(1, "rgba(0,0,0,1)");
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

        // tiny wobble (kept minimal)
        const wobble = this.spinning ? Math.sin(now / 110) * 0.0012 : 0;

        this.rot = startRot + (endRot - startRot) * e + wobble;
        this.draw();

        const idx = this.getIndexAtPointer(this.rot);
        if (idx !== this._lastIndex) {
          this._lastIndex = idx;
          const canTick = now - (this._lastTickAt || 0) > 38;
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
