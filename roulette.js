const TAU = Math.PI * 2;

function norm(a) {
  a = a % TAU;
  if (a < 0) a += TAU;
  return a;
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

// Slots (more lines): 36 wedges
// 20: 1 slot (very rare)
// 10/5/3/1: distributed for readable probability
// Note: "1" pays 2x total return (user rule)
function makeSegments() {
  const segs = [];
  const pushN = (key, label, payout, n) => {
    for (let i = 0; i < n; i++) segs.push({ key, label, kind: "payout", payout });
  };

  pushN("20", "20", 20, 1);
  pushN("10", "10", 10, 3);
  pushN("5",  "5",   5, 5);
  pushN("3",  "3",   3, 9);
  pushN("1",  "1",   2, 18); // 1 => 2x
  return segs;
}

export const DEFAULT_SEGMENTS = makeSegments();

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
    ctx.translate(cx, cy);

    ctx.beginPath();
    ctx.arc(0, 0, r * 1.03, 0, TAU);
    ctx.fillStyle = "#000";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.save();
    ctx.rotate(this.rot);

    const n = this.segments.length;
    const seg = TAU / n;
    const start = -Math.PI / 2;

    for (let i = 0; i < n; i++) {
      const s = this.segments[i];
      const a0 = start + i * seg;
      const a1 = a0 + seg;
      const isJackpot = s.key === "20";

      // Wedge
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r, a0, a1);
      ctx.closePath();

      let fill = (i % 2 === 0) ? "#070707" : "#0c0c0c";
      if (isJackpot) fill = "#fff";
      ctx.fillStyle = fill;
      ctx.fill();

      // Lines (lots)
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Label (small, minimal)
      const mid = (a0 + a1) / 2;
      ctx.save();
      ctx.rotate(mid);
      ctx.translate(0, -r * 0.74);
      ctx.rotate(-mid);

      const fs = (n >= 30) ? 10 : 12;
      ctx.font = `900 ${fs}px ui-monospace, Menlo, Consolas, Courier New, monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = isJackpot ? "#000" : "rgba(255,255,255,0.92)";
      const text = String(s.label ?? s.key ?? "");
      ctx.lineWidth = 3;
      ctx.strokeStyle = isJackpot ? "rgba(255,255,255,0.92)" : "rgba(0,0,0,0.92)";
      ctx.strokeText(text, 0, 0);
      ctx.fillText(text, 0, 0);
      ctx.restore();
    }

    ctx.restore();

    // Hub
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.22, 0, TAU);
    ctx.fillStyle = "#000";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.65)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Hub ticks
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.14, 0, TAU);
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
  }

  async spin({ duration = 2400, minSpins = 6, maxSpins = 9 } = {}) {
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

        // subtle wobble
        const wobble = this.spinning ? Math.sin(now / 130) * 0.0010 : 0;

        this.rot = startRot + (endRot - startRot) * e + wobble;
        this.draw();

        // Tick on wedge boundaries
        const idx = this.getIndexAtPointer(this.rot);
        if (idx !== this._lastIndex) {
          this._lastIndex = idx;
          if (this.audio && typeof this.audio.play === "function") {
            const since = now - (this._lastTickAt || 0);
            if (since > 28) { // limit tick spam
              this.audio.play("tick");
              this._lastTickAt = now;
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
