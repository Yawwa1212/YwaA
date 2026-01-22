import { Roulette, DEFAULT_SEGMENTS } from "./roulette.js";
import { AudioEngine } from "./audio.js";
import { AnatomyOverlay, ORGANS } from "./anatomy.js";
import { Storage } from "./storage.js";

const KEY = "gwl_v3_minimal_bw_rules_v1";
const MAX_DEBT = 1000;
const LOAN_CHUNK = 333;
const LAST_LOAN_CHUNK = 334;
const ORGAN_LOAN = 200;

const clamp01 = (x) => Math.max(0, Math.min(1, x));

function fmtPen(n) {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(Math.trunc(n));
  return `${sign}${abs.toLocaleString("en-US")}pen`;
}

function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

const el = {
  statusLine: document.getElementById("statusLine"),
  netWorth: document.getElementById("netWorth"),
  cash: document.getElementById("cash"),
  debt: document.getElementById("debt"),
  streak: document.getElementById("streak"),

  log: document.getElementById("log"),
  toast: document.getElementById("toast"),

  organChips: document.getElementById("organChips"),
  anatomySvg: document.getElementById("anatomySvg"),

  toggleSound: document.getElementById("toggleSound"),
  toggleMotion: document.getElementById("toggleMotion"),
  volume: document.getElementById("volume"),

  spinBtn: document.getElementById("spinBtn"),
  lever: document.getElementById("lever"),
  pullLabel: document.getElementById("pullLabel"),

  betTotal: document.getElementById("betTotal"),
  bet20: document.getElementById("bet20"),
  bet10: document.getElementById("bet10"),
  bet5: document.getElementById("bet5"),
  bet3: document.getElementById("bet3"),
  bet1: document.getElementById("bet1"),

  borrowBtn: document.getElementById("borrowBtn"),
  repayBtn: document.getElementById("repayBtn"),

  loanModal: document.getElementById("loanModal"),
  loanTitle: document.getElementById("loanTitle"),
  loanHint: document.getElementById("loanHint"),
  loanAmountLabel: document.getElementById("loanAmountLabel"),
  loanAmount: document.getElementById("loanAmount"),
  loanConfirm: document.getElementById("loanConfirm"),
  loanClose: document.getElementById("loanClose"),

  organModal: document.getElementById("organModal"),
  organTitle: document.getElementById("organTitle"),
  organText: document.getElementById("organText"),
  organGrid: document.getElementById("organGrid"),
  organClose: document.getElementById("organClose"),
};

const DEFAULT_STATE = {
  cash: 300,
  debt: 0,
  streak: 0,
  soundOn: true,
  motionOn: true,
  volume: 0.8,
  organs: Object.fromEntries(ORGANS.map(o => [o.key, true])),
  logs: [],
};

let state = loadState();
let busy = false;

const audio = new AudioEngine();
const roulette = new Roulette(document.getElementById("roulette"), { segments: DEFAULT_SEGMENTS, audio });
const anatomy = new AnatomyOverlay(el.anatomySvg);

function loadState() {
  const saved = Storage.load(KEY, null) || {};
  const s = { ...DEFAULT_STATE, ...saved };

  // sanitize
  s.cash = Math.max(0, Math.floor(Number(s.cash) || DEFAULT_STATE.cash));
  s.debt = Math.max(0, Math.floor(Number(s.debt) || 0));
  s.streak = Math.max(0, Math.floor(Number(s.streak) || 0));
  s.soundOn = !!s.soundOn;
  s.motionOn = !!s.motionOn;
  s.volume = clamp01(Number(s.volume) ?? 0.8);

  // organs
  const organs = {};
  for (const o of ORGANS) organs[o.key] = (saved.organs && typeof saved.organs[o.key] === "boolean") ? saved.organs[o.key] : true;
  s.organs = organs;

  s.logs = Array.isArray(saved.logs) ? saved.logs.slice(-120) : [];
  return s;
}

function save() {
  Storage.save(KEY, state);
}

function toast(msg) {
  if (!el.toast) return;
  el.toast.textContent = msg;
  el.toast.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { el.toast.hidden = true; }, 1400);
}

function pushLog(text, type = "") {
  const line = { t: Date.now(), text, type };
  state.logs.push(line);
  state.logs = state.logs.slice(-140);
  renderLog();
}

function renderLog() {
  if (!el.log) return;
  el.log.innerHTML = "";
  for (const item of state.logs.slice(-60)) {
    const p = document.createElement("p");
    p.className = "log-line" + (item.type ? " " + item.type : "");
    const time = new Date(item.t);
    const hh = String(time.getHours()).padStart(2, "0");
    const mm = String(time.getMinutes()).padStart(2, "0");
    p.innerHTML = `<span class="dim">[${hh}:${mm}]</span> ${item.text}`;
    el.log.appendChild(p);
  }
  el.log.scrollTop = el.log.scrollHeight;
}

function renderOrgans() {
  if (!el.organChips) return;
  el.organChips.innerHTML = "";
  for (const o of ORGANS) {
    const chip = document.createElement("div");
    chip.className = "organ-chip" + (state.organs[o.key] ? "" : " taken");
    chip.textContent = o.label;
    el.organChips.appendChild(chip);
  }
}

function renderStats() {
  const net = state.cash - state.debt;
  if (el.cash) el.cash.textContent = fmtPen(state.cash);
  if (el.debt) el.debt.textContent = fmtPen(state.debt);
  if (el.netWorth) el.netWorth.textContent = fmtPen(net);
  if (el.streak) el.streak.textContent = String(state.streak);

  if (el.toggleSound) el.toggleSound.textContent = state.soundOn ? "SOUND: ON" : "SOUND: OFF";
  if (el.toggleMotion) el.toggleMotion.textContent = state.motionOn ? "MOTION: ON" : "MOTION: OFF";
  if (el.volume) el.volume.value = String(state.volume);

  document.body.classList.toggle("reduce-motion", !state.motionOn);
  document.body.dataset.corruption = "0";
}

function getBets() {
  const readNum = (x) => Math.max(0, Math.floor(Number(x) || 0));
  return {
    "20": readNum(el.bet20?.value),
    "10": readNum(el.bet10?.value),
    "5": readNum(el.bet5?.value),
    "3": readNum(el.bet3?.value),
    "1": readNum(el.bet1?.value),
  };
}

function setBets(bets) {
  if (el.bet20) el.bet20.value = String(bets["20"] || 0);
  if (el.bet10) el.bet10.value = String(bets["10"] || 0);
  if (el.bet5) el.bet5.value = String(bets["5"] || 0);
  if (el.bet3) el.bet3.value = String(bets["3"] || 0);
  if (el.bet1) el.bet1.value = String(bets["1"] || 0);
}

function totalBet(bets) {
  return Object.values(bets).reduce((a, b) => a + (Number(b) || 0), 0);
}

function renderBetTotal() {
  const bets = getBets();
  const tot = totalBet(bets);
  if (el.betTotal) el.betTotal.textContent = `TOTAL: ${fmtPen(tot)}`;
}

async function ensureAudio() {
  if (!state.soundOn) return;
  await audio.init();
  audio.setEnabled(true);
  audio.setVolume(state.volume);
  await audio.resume();
}

function setBusy(on) {
  busy = !!on;
  el.spinBtn.disabled = on;
  el.lever.disabled = on;
  el.borrowBtn.disabled = on;
  el.repayBtn.disabled = on;
}

function computeNextLoanAmount() {
  const remaining = MAX_DEBT - state.debt;
  if (remaining <= 0) return 0;
  if (remaining === LAST_LOAN_CHUNK) return LAST_LOAN_CHUNK;
  return Math.min(LOAN_CHUNK, remaining);
}

function openLoanModal(mode) {
  el.loanModal.hidden = false;

  if (mode === "repay") {
    el.loanTitle.textContent = "상환";
    el.loanHint.textContent = "갚을 금액을 입력해. (현금/빚 범위 내에서 처리)";
    el.loanAmountLabel.textContent = "상환 금액";
    el.loanAmount.min = "0";
    el.loanAmount.step = "1";
    el.loanAmount.disabled = false;
    el.loanAmount.value = String(Math.min(state.cash, state.debt));
    el.loanConfirm.dataset.mode = "repay";
    el.loanConfirm.textContent = "상환";
  }
}

function closeLoanModal() {
  el.loanModal.hidden = true;
}

function openOrganModal({ title = "몸으로 갚기", text = "장기를 선택해.", onPick }) {
  const available = ORGANS.filter(o => state.organs[o.key]);
  if (available.length === 0) {
    toast("남은 장기 없음");
    pushLog("GAME OVER: 장기 재고 0", "lose");
    return;
  }

  el.organTitle.textContent = title;
  el.organText.textContent = text;
  el.organGrid.innerHTML = "";

  for (const o of available) {
    const card = document.createElement("div");
    card.className = "organ-card";

    const name = document.createElement("div");
    name.className = "name";
    name.textContent = o.label;

    const desc = document.createElement("div");
    desc.className = "desc";
    desc.textContent = `+${fmtPen(ORGAN_LOAN)} / 장기 -1`;

    card.appendChild(name);
    card.appendChild(desc);

    card.addEventListener("click", async () => {
      await ensureAudio();
      audio.play("organ");

      el.organModal.hidden = true;
      await onPick(o);
    }, { passive: true });

    el.organGrid.appendChild(card);
  }

  el.organModal.hidden = false;
}

function closeOrganModal() {
  el.organModal.hidden = true;
}

async function doBorrow() {
  if (busy) return;

  if (state.cash > 0) {
    toast("PEN 다 쓰고 와");
    el.statusLine.textContent = "대출은 현금 0일 때만 가능.";
    return;
  }

  // Normal loans up to 1000
  if (state.debt < MAX_DEBT) {
    const amount = computeNextLoanAmount();
    if (amount <= 0) {
      toast("대출 불가");
      return;
    }

    await ensureAudio();
    audio.play("shark");

    state.cash += amount;
    state.debt += amount;

    if (state.debt >= MAX_DEBT) {
      toast(`마지막 대출 +${fmtPen(amount)}`);
      pushLog(`마지막 대출 +${fmtPen(amount)} (빚 ${fmtPen(state.debt)})`, "event");
      pushLog(`경고: 못 갚으면 몸으로 갚아야 할거다.`, "event");
      el.statusLine.textContent = "마지막 대출 완료. 다음은 몸으로.";
    } else {
      toast(`대출 +${fmtPen(amount)}`);
      pushLog(`대출 +${fmtPen(amount)} (빚 ${fmtPen(state.debt)})`, "event");
      el.statusLine.textContent = "대출 완료. 돈을 다 쓰고 다시 와.";
    }

    renderAll();
    save();
    return;
  }

  // After max debt: organs for 200pen each
  openOrganModal({
    title: "몸으로 빌리기",
    text: `빚 ${fmtPen(state.debt)} / 현금 0. 장기 하나당 ${fmtPen(ORGAN_LOAN)}. 못 갚으면 몸으로 갚아야 할거다.`,
    onPick: async (o) => {
      state.organs[o.key] = false;
      state.cash += ORGAN_LOAN;
      pushLog(`장기 대출: ${o.label} +${fmtPen(ORGAN_LOAN)}`, "event");
      toast(`+${fmtPen(ORGAN_LOAN)}`);
      await syncAnatomy();
      renderAll();
      save();
    }
  });
}

function doRepay(amount) {
  amount = Math.floor(Number(amount) || 0);
  if (amount <= 0) { toast("금액 입력"); return; }
  if (state.debt <= 0) { toast("빚 없음"); return; }
  if (state.cash <= 0) { toast("현금 없음"); return; }

  const pay = Math.min(amount, state.cash, state.debt);
  state.cash -= pay;
  state.debt -= pay;
  pushLog(`상환 -${fmtPen(pay)} (빚 ${fmtPen(state.debt)})`, "event");
  toast(`-${fmtPen(pay)}`);

  renderAll();
  save();
}

async function doSpin() {
  if (busy) return;

  const bets = getBets();
  const tot = totalBet(bets);

  if (tot <= 0) { toast("베팅 0"); return; }
  if (tot > state.cash) { toast("현금 부족"); return; }

  setBusy(true);
  el.statusLine.textContent = "SPINNING…";

  await ensureAudio();
  audio.play("lever");

  // Heavy-feel pause
  await sleep(120);

  // Deduct all bets up-front
  state.cash -= tot;

  const outcome = await roulette.spin({
    duration: state.motionOn ? 3600 : 1700,
    minSpins: 10,
    maxSpins: 14
  });

  const seg = outcome.segment;
  const key = seg.key;
  const betOn = bets[key] || 0;
  const payout = betOn > 0 ? Math.floor(betOn * (seg.payout || 0)) : 0;

  if (payout > 0) {
    state.cash += payout;
    state.streak += 1;

    const profit = payout - tot;
    const tag = key === "20" ? "JACKPOT" : "HIT";
    el.statusLine.textContent = `${tag} ${key} | +${fmtPen(payout)} (Δ ${fmtPen(profit)})`;
    pushLog(`${tag} ${key}: 베팅 ${fmtPen(betOn)} → 수령 ${fmtPen(payout)} (총베팅 ${fmtPen(tot)})`, "win");

    audio.play(key === "20" ? "jackpot" : "win");
    toast(tag);
  } else {
    state.streak = 0;
    el.statusLine.textContent = `MISS ${key} | -${fmtPen(tot)}`;
    pushLog(`MISS ${key}: 총베팅 -${fmtPen(tot)}`, "lose");
    audio.play("lose");
    toast("MISS");
  }

  // auto-clear bet inputs (minimal, avoids stale bets)
  setBets({ "20": 0, "10": 0, "5": 0, "3": 0, "1": 0 });
  renderBetTotal();

  renderAll();
  save();
  setBusy(false);
}

async function syncAnatomy() {
  try {
    await anatomy.whenReady();
    anatomy.sync(state.organs);
  } catch { /* ignore */ }
}

function renderAll() {
  renderStats();
  renderOrgans();
  renderLog();
  renderBetTotal();
}

// Wire
function wire() {
  // total bet live
  const onBetInput = () => renderBetTotal();
  [el.bet20, el.bet10, el.bet5, el.bet3, el.bet1].forEach(i => {
    if (!i) return;
    i.addEventListener("input", onBetInput, { passive: true });
  });

  // Spin
  el.spinBtn.addEventListener("click", doSpin, { passive: true });
  el.lever.addEventListener("click", doSpin, { passive: true });

  // Toggles
  el.toggleSound.addEventListener("click", async () => {
    state.soundOn = !state.soundOn;
    audio.setEnabled(state.soundOn);
    if (state.soundOn) {
      await ensureAudio();
      audio.play("tick");
      toast("SOUND ON");
    } else {
      toast("SOUND OFF");
    }
    renderStats();
    save();
  }, { passive: true });

  el.toggleMotion.addEventListener("click", () => {
    state.motionOn = !state.motionOn;
    renderStats();
    save();
  }, { passive: true });

  el.volume.addEventListener("input", () => {
    state.volume = clamp01(Number(el.volume.value) || 0);
    audio.setVolume(state.volume);
    save();
  }, { passive: true });

  // Loan
  el.borrowBtn.addEventListener("click", doBorrow, { passive: true });

  el.repayBtn.addEventListener("click", () => {
    if (state.debt <= 0) { toast("빚 없음"); return; }
    openLoanModal("repay");
  }, { passive: true });

  el.loanClose.addEventListener("click", closeLoanModal, { passive: true });

  el.loanConfirm.addEventListener("click", () => {
    const mode = el.loanConfirm.dataset.mode;
    if (mode === "repay") {
      doRepay(el.loanAmount.value);
      closeLoanModal();
    }
  }, { passive: true });

  el.organClose.addEventListener("click", closeOrganModal, { passive: true });

  // PWA audio unlock (first pointer)
  window.addEventListener("pointerdown", async () => {
    if (!state.soundOn) return;
    try {
      await ensureAudio();
    } catch { /* ignore */ }
  }, { once: true, passive: true });
}

wire();
renderAll();
syncAnatomy();
