import { SEGMENTS, drawWheel, spinPlan, buildBetOptions, colorForKey } from "./roulette.js";
import { loadState, saveState } from "./storage.js";
import { AudioEngine } from "./audio.js";

const $ = (id) => document.getElementById(id);
const clamp = (v,min,max)=> Math.max(min, Math.min(max, v));
const now = ()=> performance.now();

const state = (() => {
  const s = loadState();
  if (s && typeof s.cash === "number") return s;
  return { cash: 30, debt: 0, boost: 1, loanCount: 0, bets: {}, lastPick: null };
})();

function save(){ saveState(state); }

const audio = new AudioEngine();

let canvas, ctx;
let rot = 0;
let spinning = false;

function toast(msg){
  const t = $("toast");
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast._tm);
  toast._tm = setTimeout(()=>{ t.hidden = true; }, 1400);
}

function log(msg, cls=""){
  const box = $("logBox");
  const p = document.createElement("div");
  p.className = "logLine " + cls;
  p.textContent = msg;
  box.prepend(p);
}

function updateBorrowButtons(){
  $("borrowBtn").disabled = !(state.cash === 0 && state.debt < 100);
  $("repayBtn").disabled  = !(state.debt > 0 && state.cash > 0);
}

function renderPlaced(){
  const list = $("placedList");
  list.innerHTML = "";
  const entries = Object.entries(state.bets).filter(([,amt]) => amt > 0);
  if (entries.length === 0){
    const t = document.createElement("div");
    t.style.color = "rgba(240,245,255,0.62)";
    t.style.fontSize = "12px";
    t.textContent = "비어 있음";
    list.appendChild(t);
    return;
  }
  for (const [key, amt] of entries){
    const [, label] = key.split(":");
    const tag = document.createElement("div");
    tag.className = "tag";
    tag.innerHTML = `<b>${label}</b><span>${amt}pen</span><button title="제거" aria-label="제거">×</button>`;
    tag.querySelector("button").addEventListener("click", ()=>{
      delete state.bets[key];
      save(); updateHUD();
    });
    list.appendChild(tag);
  }
}

function updateHUD(){
  $("cash").textContent = String(state.cash);
  $("debt").textContent = String(state.debt);
  $("boost").textContent = "x" + String(state.boost);
  renderPlaced();
  updateBorrowButtons();
}

function renderBetOptions(){
  const opts = buildBetOptions();
  const grid = $("betGrid");
  grid.innerHTML = "";
  for (const o of opts){
    const key = `${o.type}:${o.label}`;
    const el = document.createElement("div");
    el.className = "betItem";
    el.dataset.key = key;

    const col = colorForKey(o.colorKey);

    el.innerHTML = `<div>
        <div class="label">${o.label}</div>
        <div class="hint">${o.hint}</div>
      </div>
      <div class="dot" aria-hidden="true"></div>`;
    const dot = el.querySelector(".dot");
    dot.style.width="10px"; dot.style.height="10px";
    dot.style.borderRadius="999px";
    dot.style.background=col;
    dot.style.boxShadow=`0 0 14px ${col}`;

    el.addEventListener("click", ()=>{
      for (const n of grid.querySelectorAll(".betItem")) n.classList.remove("active");
      el.classList.add("active");
      state.lastPick = key;
      save();
      audio.playTick();
    });

    grid.appendChild(el);
  }
  const restore = state.lastPick || "mul:3";
  const el = grid.querySelector(`[data-key="${restore}"]`);
  if (el){
    el.classList.add("active");
    state.lastPick = restore;
  }
}

function totalBet(){
  return Object.values(state.bets).reduce((a,b)=>a+(b||0),0);
}

function placeBet(){
  const key = state.lastPick;
  if (!key){ toast("대상"); return; }
  const amt = Number($("betAmount").value || 0);
  if (!Number.isFinite(amt) || amt <= 0){ toast("금액"); return; }
  if (amt > state.cash){ toast("현금 부족"); return; }
  state.cash -= amt;
  state.bets[key] = (state.bets[key]||0) + amt;
  save(); updateHUD();
  audio.playTick();
}

function clearBets(){
  const refund = totalBet();
  state.cash += refund;
  state.bets = {};
  save(); updateHUD();
  toast("리셋");
}

function borrow(){
  if (!(state.cash === 0 && state.debt < 100)) return;
  const remaining = 100 - state.debt;
  let amt = (state.loanCount === 0) ? 33 : (state.loanCount === 1) ? 33 : 34;
  amt = Math.min(amt, remaining);
  if (amt <= 0) return;

  if (state.debt + amt >= 100){
    toast("마지막 대출. 못 갚으면 몸으로 갚아야 한다.");
    log("마지막 대출. 못 갚으면 몸으로 갚아야 한다.", "note");
  }

  state.cash += amt;
  state.debt += amt;
  state.loanCount = clamp(state.loanCount + 1, 0, 3);
  save(); updateHUD();
  log(`대출 +${amt}pen (DEBT ${state.debt})`, "note");
  audio.playBoost();
}

function repay(){
  if (!(state.debt > 0 && state.cash > 0)) return;
  const amt = Math.min(state.cash, state.debt);
  state.cash -= amt;
  state.debt -= amt;
  save(); updateHUD();
  log(`상환 -${amt}pen (DEBT ${state.debt})`, "note");
  audio.playTick();
}

function ensureCanvas(){
  canvas = $("wheel");
  ctx = canvas.getContext("2d");

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    drawWheel(ctx, rect.width, rect.height, rot);
  };

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  window.addEventListener("orientationchange", ()=> setTimeout(resize, 150));
  resize();
}

function animateTo(targetRot, durationMs){
  const start = now();
  const from = rot;
  const delta = targetRot - from;
  const ease = (t)=> 1 - Math.pow(1-t, 3);

  spinning = true;
  $("spinBtn").disabled = true;
  $("status").textContent = "돌아간다.";
  audio.playSpin();

  const tickEvery = 70;
  let nextTick = start;

  return new Promise((resolve)=>{
    const step = () => {
      const t = (now()-start)/durationMs;
      const k = ease(clamp(t,0,1));
      rot = from + delta * k;

      const rect = canvas.getBoundingClientRect();
      drawWheel(ctx, rect.width, rect.height, rot);

      const ts = now();
      if (ts >= nextTick){
        audio.playTick();
        nextTick = ts + tickEvery * (0.5 + 0.9*(1-k));
      }

      if (t < 1) requestAnimationFrame(step);
      else{
        spinning = false;
        $("spinBtn").disabled = false;
        resolve();
      }
    };
    requestAnimationFrame(step);
  });
}

function settle(outcomeIdx){
  const seg = SEGMENTS[outcomeIdx];
  $("status").textContent = `${seg.label} 당첨`;

  const key = `${seg.type}:${seg.label}`;
  const bet = state.bets[key] || 0;

  let delta = 0;

  if (seg.type === "mul"){
    delta += bet * seg.mult * state.boost;
    if (bet > 0) log(`${seg.label} x${seg.mult} | +${bet*seg.mult*state.boost}pen`, "win");
    else log(`${seg.label} x${seg.mult}`, "note");
    state.boost = 1;
  } else if (seg.type === "pen"){
    if (bet > 0){
      delta -= bet * seg.penalty;
      log(`${seg.label} | -${bet*seg.penalty}pen`, "lose");
    } else log(`${seg.label}`, "note");
    state.boost = 1;
  } else if (seg.type === "boost"){
    state.boost *= seg.boost;
    log(`BOOST x${state.boost}`, "note");
    audio.playBoost();
    if (bet > 0){
      delta += bet * 2;
      log(`★ 베팅 | +${bet*2}pen`, "win");
    }
  }

  state.cash += delta;
  if (state.cash < 0) state.cash = 0;

  state.bets = {}; // clear bets each spin
  save(); updateHUD();

  if (delta > 0) audio.playWin();
  else if (delta < 0) audio.playLose();
  else audio.playTick();
}

async function spin(){
  if (spinning) return;
  if (Object.keys(state.bets).length === 0){
    toast("베팅 먼저");
    return;
  }
  const plan = spinPlan();
  await animateTo(rot + plan.finalRot, plan.durationMs);
  settle(plan.idx);
}

function hook(){
  $("placeBtn").addEventListener("click", placeBet);
  $("clearBtn").addEventListener("click", clearBets);
  $("spinBtn").addEventListener("click", spin);
  $("borrowBtn").addEventListener("click", borrow);
  $("repayBtn").addEventListener("click", repay);

  $("soundBtn").addEventListener("click", async ()=>{
    await audio.init();
    await audio.resume();
    audio.enabled = !audio.enabled;
    $("soundBtn").textContent = audio.enabled ? "SOUND: ON" : "SOUND: OFF";
    audio.playTick();
  });

  $("betAmount").addEventListener("keydown", (e)=>{
    if (e.key === "Enter") placeBet();
  });

  for (const b of document.querySelectorAll("button")){
    b.addEventListener("touchend", ()=>{}, {passive:true});
  }
}

(async function main(){
  ensureCanvas();
  renderBetOptions();
  updateHUD();
  hook();
  await audio.init();
  log("READY", "note");
})();
