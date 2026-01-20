import { AudioEngine } from "./audio.js";
import { Roulette, DEFAULT_SEGMENTS } from "./roulette.js";
import { AnatomyOverlay, ORGANS } from "./anatomy.js";
import { Storage } from "./storage.js";

function clamp(min, x, max){
  return Math.max(min, Math.min(max, x));
}

function money(n){
  const v = Math.max(0, Math.floor(Number(n) || 0));
  return "₩" + v.toLocaleString("ko-KR");
}

function pct(x){
  return (x * 100).toFixed(1) + "%";
}

const KEY = "gwl_v3_state";

const DEFAULT_STATE = {
  cash: 1000000,
  debt: 0,
  streak: 0,
  spins: 0,
  corruptionBonus: 0,
  cleanse: 0,
  rateMod: 1.0,
  mood: "neutral", // neutral | pleasure | industrial
  soundOn: true,
  motionOn: true,
  volume: 0.8,
  organs: Object.fromEntries(ORGANS.map(o => [o.key, true]))
};

function mergeState(raw){
  const s = {...DEFAULT_STATE, ...(raw || {})};
  s.organs = {...DEFAULT_STATE.organs, ...(raw?.organs || {})};
  s.cash = Math.floor(Number(s.cash) || DEFAULT_STATE.cash);
  s.debt = Math.floor(Number(s.debt) || 0);
  s.streak = Math.floor(Number(s.streak) || 0);
  s.spins = Math.floor(Number(s.spins) || 0);
  s.corruptionBonus = Math.floor(Number(s.corruptionBonus) || 0);
  s.cleanse = clamp(0, Math.floor(Number(s.cleanse) || 0), 2);
  s.rateMod = clamp(0.6, Number(s.rateMod) || 1.0, 1.8);
  s.volume = clamp(0, Number(s.volume) || 0.8, 1);
  s.mood = (s.mood === "pleasure" || s.mood === "industrial") ? s.mood : "neutral";
  s.soundOn = !!s.soundOn;
  s.motionOn = !!s.motionOn;
  return s;
}

let state = mergeState(Storage.load(KEY, null));

const el = {
  body: document.body,
  shell: document.getElementById("shell"),
  statusLine: document.getElementById("statusLine"),
  roulette: document.getElementById("roulette"),
  lever: document.getElementById("lever"),
  pullLabel: document.getElementById("pullLabel"),
  spinBtn: document.getElementById("spinBtn"),
  bet: document.getElementById("bet"),
  borrowBtn: document.getElementById("borrowBtn"),
  repayBtn: document.getElementById("repayBtn"),
  volume: document.getElementById("volume"),
  moodPill: document.getElementById("moodPill"),
  toggleSound: document.getElementById("toggleSound"),
  toggleMotion: document.getElementById("toggleMotion"),

  cash: document.getElementById("cash"),
  debt: document.getElementById("debt"),
  interest: document.getElementById("interest"),
  streak: document.getElementById("streak"),
  corruption: document.getElementById("corruption"),
  netWorth: document.getElementById("netWorth"),

  log: document.getElementById("log"),
  organChips: document.getElementById("organChips"),
  anatomySvg: document.getElementById("anatomySvg"),

  spinHud: document.getElementById("spinHud"),
  hudText: document.getElementById("hudText"),

  loanModal: document.getElementById("loanModal"),
  loanTitle: document.getElementById("loanTitle"),
  loanHint: document.getElementById("loanHint"),
  loanAmount: document.getElementById("loanAmount"),
  loanAmountLabel: document.getElementById("loanAmountLabel"),
  loanConfirm: document.getElementById("loanConfirm"),
  loanClose: document.getElementById("loanClose"),
  loanShark: document.getElementById("loanShark"),
  sharkText: document.getElementById("sharkText"),
  sharkDeal: document.getElementById("sharkDeal"),
  sharkSqueeze: document.getElementById("sharkSqueeze"),
  sharkRefuse: document.getElementById("sharkRefuse"),

  organModal: document.getElementById("organModal"),
  organClose: document.getElementById("organClose"),
  organText: document.getElementById("organText"),
  organGrid: document.getElementById("organGrid"),

  toast: document.getElementById("toast")
};

const audio = new AudioEngine();
audio.setVolume(state.volume);
audio.setEnabled(state.soundOn);

const roulette = new Roulette(el.roulette, { segments: DEFAULT_SEGMENTS, audio });
const anatomy = new AnatomyOverlay(el.anatomySvg);

let toastTimer = null;
let busy = false;
let loanMode = "borrow"; // borrow | repay

function save(){
  Storage.save(KEY, state);
}

function setMood(m){
  state.mood = m;
  el.body.classList.remove("mood-neutral", "mood-pleasure", "mood-industrial");
  el.body.classList.add("mood-" + m);
  el.moodPill.textContent = m === "pleasure" ? "MOOD: PLEASURE" : m === "industrial" ? "MOOD: INDUSTRIAL" : "MOOD: NEUTRAL";
}

function setMotion(on){
  state.motionOn = !!on;
  el.body.classList.toggle("reduce-motion", !state.motionOn);
  el.toggleMotion.textContent = state.motionOn ? "MOTION: ON" : "MOTION: OFF";
}

function setSound(on){
  state.soundOn = !!on;
  audio.setEnabled(state.soundOn);
  el.toggleSound.textContent = state.soundOn ? "SOUND: ON" : "SOUND: OFF";
}

function takenCount(){
  return ORGANS.reduce((n, o) => n + (state.organs[o.key] ? 0 : 1), 0);
}

function debtTier(){
  const d = state.debt;
  if (d <= 0) return 0;
  if (d < 3000000) return 1;
  if (d < 9000000) return 2;
  if (d < 16000000) return 3;
  return 4;
}

function computeCorruption(){
  const base = takenCount() + debtTier() + (state.corruptionBonus || 0);
  const cleaned = base - (state.cleanse || 0);
  return clamp(0, cleaned, 5);
}

function computeInterestRate(){
  // Per spin rate (decimal). Keeps it punchy but not instantly lethal.
  const c = computeCorruption();
  const tier = debtTier();
  const base = 0.004 + (tier * 0.0015) + (c * 0.0015);
  return clamp(0.003, base * (state.rateMod || 1.0), 0.03);
}

function pushLog(text, cls = ""){ 
  const p = document.createElement("p");
  p.className = "log-line" + (cls ? " " + cls : "");
  p.textContent = text;
  el.log.appendChild(p);
  el.log.scrollTop = el.log.scrollHeight;
}

function toast(msg){
  clearTimeout(toastTimer);
  el.toast.textContent = msg;
  el.toast.hidden = false;
  toastTimer = setTimeout(() => { el.toast.hidden = true; }, 1600);
}

function setStatus(msg){
  el.statusLine.textContent = msg;
}

function renderOrgans(){
  el.organChips.innerHTML = "";
  for (const o of ORGANS) {
    const chip = document.createElement("div");
    chip.className = "organ-chip" + (state.organs[o.key] ? "" : " taken");
    chip.textContent = o.label;
    el.organChips.appendChild(chip);
  }
}

function renderStats(){
  const c = computeCorruption();
  const rate = computeInterestRate();

  el.cash.textContent = money(state.cash);
  el.debt.textContent = money(state.debt);
  el.interest.textContent = pct(rate);
  el.streak.textContent = String(state.streak);
  el.corruption.textContent = String(c);
  el.netWorth.textContent = money(state.cash - state.debt);

  el.body.dataset.corruption = String(c);
  el.body.classList.remove("corruption-0","corruption-1","corruption-2","corruption-3","corruption-4","corruption-5");
  el.body.classList.add("corruption-" + c);
}

async function syncAnatomy(){
  try{
    await anatomy.whenReady();
    anatomy.sync(state.organs);
  }catch{
    // ignore
  }
}

function setHud(text, on){
  el.hudText.textContent = text;
  el.spinHud.hidden = !on;
}

function sleep(ms){
  return new Promise((r) => setTimeout(r, ms));
}

function fxPulse(type){
  if (!state.motionOn) return;
  const b = el.body;
  b.classList.add("fx-hit");
  b.classList.add("fx-" + type);
  b.classList.add("hitstop");

  const stopMs = type === "jackpot" ? 100 : 70;
  setTimeout(() => b.classList.remove("hitstop"), stopMs);

  const totalMs = type === "jackpot" ? 1400 : 520;
  setTimeout(() => {
    b.classList.remove("fx-hit");
    b.classList.remove("fx-win","fx-lose","fx-jackpot");
  }, totalMs);
}

async function ensureAudio(){
  if (!state.soundOn) return;
  try{ await audio.init(); }catch{ /* ignore */ }
}

function setBusy(on){
  busy = !!on;
  el.spinBtn.disabled = busy;
  el.lever.disabled = busy;
  el.borrowBtn.disabled = busy;
  el.repayBtn.disabled = busy;
}

function applyInterest(){
  if (state.debt <= 0) return 0;
  const rate = computeInterestRate();
  const add = Math.max(0, Math.floor(state.debt * rate));
  if (add > 0){
    state.debt += add;
    pushLog(`이자 +${money(add).replace("₩","₩")}`, "event");
  }
  return add;
}

function maybeSeize(){
  const available = ORGANS.filter(o => state.organs[o.key]);
  if (available.length === 0) return;
  if (state.debt <= 0) return;

  const c = computeCorruption();
  const p = clamp(0.05, 0.08 + c * 0.06 + debtTier() * 0.05, 0.75);
  if (Math.random() < p){
    openOrganModal("장기 압류. 하나를 선택해.");
  }
}

function openLoanModal(mode){
  loanMode = mode;
  el.loanShark.hidden = true;

  if (mode === "borrow"){
    el.loanTitle.textContent = "대출";
    el.loanHint.textContent = "최대 3천만원까지. 대출할 때만 사채업자가 나타난다.";
    el.loanAmountLabel.textContent = "대출 금액";
    el.loanConfirm.textContent = "확인";
    el.loanAmount.min = "0";
    el.loanAmount.step = "100000";
    el.loanAmount.value = "1000000";
  } else {
    el.loanTitle.textContent = "상환";
    el.loanHint.textContent = "현금으로 빚을 갚아. (팁: 상환하면 부패가 느리게 오른다.)";
    el.loanAmountLabel.textContent = "상환 금액";
    el.loanConfirm.textContent = "상환";
    el.loanAmount.min = "0";
    el.loanAmount.step = "100000";
    el.loanAmount.value = String(Math.min(state.cash, state.debt));
  }

  el.loanModal.hidden = false;
}

function closeLoanModal(){
  el.loanModal.hidden = true;
}

function showSharkEvent(){
  el.loanShark.hidden = false;
  const lines = [
    "\"규칙을 바꿔. 지금.\"",
    "\"니 신용은 내 장난감이야.\"",
    "\"도망치면 금리가 따라간다.\""
  ];
  el.sharkText.textContent = lines[Math.floor(Math.random() * lines.length)];
}

function openOrganModal(text){
  const available = ORGANS.filter(o => state.organs[o.key]);
  if (available.length === 0){
    toast("남은 장기 없음");
    pushLog("GAME OVER: 장기 재고 0", "lose");
    return;
  }

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

    // Flavor + mechanical hint
    const relief = 2000000 + Math.floor(Math.random() * 800000);
    desc.textContent = `빚 -${money(relief)} / 부패 +1`;

    card.appendChild(name);
    card.appendChild(desc);

    card.addEventListener("click", async () => {
      await ensureAudio();
      audio.play("organ");

      state.organs[o.key] = false;
      state.debt = Math.max(0, state.debt - relief);
      state.corruptionBonus = clamp(0, (state.corruptionBonus || 0) + 1, 5);

      pushLog(`압류: ${o.label} (-${money(relief)})`, "event");
      el.organModal.hidden = true;
      await syncAnatomy();
      renderAll();
      save();
    }, { passive: true });

    el.organGrid.appendChild(card);
  }

  el.organModal.hidden = false;
}

function closeOrganModal(){
  el.organModal.hidden = true;
}

async function doBorrow(amount){
  amount = Math.floor(Number(amount) || 0);
  if (amount <= 0){ toast("금액 입력"); return; }
  if (amount > 30000000) amount = 30000000;

  state.cash += amount;
  state.debt += amount;
  pushLog(`대출 +${money(amount)} (빚 +${money(amount)})`, "event");

  // Shark chance grows with corruption
  const c = computeCorruption();
  const p = clamp(0.12, 0.18 + c * 0.12, 0.85);
  if (Math.random() < p){
    showSharkEvent();
    await ensureAudio();
    audio.play("shark");
  } else {
    closeLoanModal();
    toast("대출 완료");
  }

  renderAll();
  save();
}

function doRepay(amount){
  amount = Math.floor(Number(amount) || 0);
  if (state.debt <= 0){ toast("빚 없음"); closeLoanModal(); return; }
  if (amount <= 0){ toast("금액 입력"); return; }
  amount = Math.min(amount, state.cash, state.debt);
  if (amount <= 0){ toast("현금 부족"); return; }

  state.cash -= amount;
  state.debt -= amount;

  // Paying down debt slightly "cleanses" the system
  if (state.cleanse < 2 && amount >= 500000){
    state.cleanse = clamp(0, state.cleanse + 1, 2);
  }

  pushLog(`상환 -${money(amount)} (빚 -${money(amount)})`, "event");
  closeLoanModal();
  toast("상환 완료");

  renderAll();
  save();
}

async function doSpin(){
  if (busy) return;

  const bet = Math.floor(Number(el.bet.value) || 0);
  if (bet <= 0){ toast("BET 입력"); return; }
  if (bet > state.cash){ toast("현금 부족"); return; }

  setBusy(true);
  await ensureAudio();

  // Lever feel
  el.lever.classList.remove("pull");
  void el.lever.offsetWidth;
  el.lever.classList.add("pull");

  setHud("SPIN", true);
  setStatus("돌아간다...");

  if (state.soundOn) {
    audio.play("lever");
    audio.play("thump");
  }
  if (state.motionOn) await sleep(90);

  // Interest first, then bet
  applyInterest();
  state.cash -= bet;

  state.spins += 1;

  // Heavier spin: longer and chunkier.
  const outcome = await roulette.spin({
    duration: state.motionOn ? 4600 : 2100,
    minSpins: 11,
    maxSpins: 15
  });
  const seg = outcome.segment;

  let won = false;

  if (seg.kind === "mult"){
    // Profit multiplier wheel (more intuitive):
    // totalReturn = bet + bet*mult
    const totalReturn = Math.max(0, bet + Math.floor(bet * (Number(seg.mult) || 0)));
    const profit = totalReturn - bet;

    // Tiny pause before payout to make it feel weighty.
    await sleep(state.motionOn ? 140 : 0);
    state.cash += totalReturn;

    if (profit > 0){
      won = true;
      state.streak += 1;

      if (seg.key === "JACKPOT"){
        setStatus(`JACKPOT (+${money(profit)})`);
        pushLog(`JACKPOT (+${money(profit)})`, "win");
        toast("JACKPOT");
        fxPulse("jackpot");
        if (state.soundOn) audio.play("jackpot");
      } else {
        setStatus(`승리: ${seg.label} (+${money(profit)})`);
        pushLog(`WIN ${seg.label} (+${money(profit)})`, "win");
        fxPulse("win");
        if (state.soundOn) audio.play("win");
      }

      if (state.streak >= 3 && state.soundOn) audio.play("party");
    } else if (profit === 0){
      state.streak = 0;
      setStatus(`무: ${seg.label}`);
      pushLog(`PUSH ${seg.label} (0)`, "event");
      if (state.soundOn) audio.play("tick");
    } else {
      state.streak = 0;
      setStatus(`패배: ${seg.label} (-${money(-profit)})`);
      pushLog(`LOSE ${seg.label} (-${money(-profit)})`, "lose");
      fxPulse("lose");
      if (state.soundOn) audio.play("lose");
    }
  }

  // Corruption decay: if debt is 0 and you keep winning, bonus slowly fades
  if (state.debt <= 0 && state.corruptionBonus > 0 && won){
    state.corruptionBonus = Math.max(0, state.corruptionBonus - 1);
  }

  setHud("SPIN", false);

  // Safety clamp: prevent negative cash from weird events
  state.cash = Math.max(0, state.cash);

  renderAll();
  save();

  setBusy(false);

  // Post-spin pressure
  maybeSeize();
}

function renderAll(){
  renderOrgans();
  renderStats();
}

function bind(){
  // Prevent the anatomy panel from ever blocking taps/clicks
  el.anatomySvg.style.pointerEvents = "none";

  const syncBet = () => {
    let v = Math.floor(Number(el.bet.value) || 0);
    if (!Number.isFinite(v) || v < 0) v = 0;
    // Keep it chunky (money feel)
    v = Math.round(v / 1000) * 1000;
    el.bet.value = String(v);
    if (!busy) {
      setStatus(`BET: ${money(v)}  |  레버를 당겨.`);
    }
  };
  el.bet.addEventListener("input", syncBet);
  el.bet.addEventListener("change", syncBet);
  syncBet();

  el.spinBtn.addEventListener("click", doSpin);
  el.lever.addEventListener("click", doSpin);

  el.borrowBtn.addEventListener("click", () => {
    if (busy) return;
    openLoanModal("borrow");
  });

  el.repayBtn.addEventListener("click", () => {
    if (busy) return;
    if (state.debt <= 0){ toast("빚 없음"); return; }
    openLoanModal("repay");
  });

  el.loanClose.addEventListener("click", closeLoanModal);
  el.loanModal.addEventListener("click", (e) => {
    if (e.target === el.loanModal) closeLoanModal();
  });

  el.loanConfirm.addEventListener("click", () => {
    if (loanMode === "borrow") doBorrow(el.loanAmount.value);
    else doRepay(el.loanAmount.value);
  });

  el.sharkDeal.addEventListener("click", () => {
    state.rateMod = clamp(0.6, state.rateMod - 0.18, 1.8);
    state.corruptionBonus = clamp(0, state.corruptionBonus + 1, 5);
    pushLog("사채업자: 딜 (금리↓, 부패+1)", "event");
    closeLoanModal();
    renderAll();
    save();
  });

  el.sharkSqueeze.addEventListener("click", () => {
    pushLog("사채업자: 갈아넣기 (장기 선택)", "event");
    closeLoanModal();
    openOrganModal("사채업자가 웃는다. 하나를 골라.");
    renderAll();
    save();
  });

  el.sharkRefuse.addEventListener("click", () => {
    state.rateMod = clamp(0.6, state.rateMod + 0.22, 1.8);
    state.corruptionBonus = clamp(0, state.corruptionBonus + 1, 5);
    pushLog("사채업자: 거절 (금리↑, 부패+1)", "lose");
    closeLoanModal();
    renderAll();
    save();
  });

  el.organClose.addEventListener("click", closeOrganModal);
  el.organModal.addEventListener("click", (e) => {
    if (e.target === el.organModal) closeOrganModal();
  });

  el.toggleSound.addEventListener("click", async () => {
    setSound(!state.soundOn);
    if (state.soundOn){ await ensureAudio(); audio.play("tick"); }
    save();
  });

  el.toggleMotion.addEventListener("click", () => {
    setMotion(!state.motionOn);
    save();
  });

  el.volume.addEventListener("input", (e) => {
    const v = Number(e.target.value || 0);
    state.volume = clamp(0, v, 1);
    audio.setVolume(state.volume);
    save();
  });

  el.moodPill.addEventListener("click", () => {
    const next = state.mood === "neutral" ? "industrial" : state.mood === "industrial" ? "pleasure" : "neutral";
    setMood(next);
    save();
  });

  // Keyboard convenience
  window.addEventListener("keydown", (e) => {
    if (e.key === " " || e.key === "Enter"){
      if (el.loanModal.hidden && el.organModal.hidden) {
        e.preventDefault();
        doSpin();
      }
    }
    if (e.key === "Escape"){
      closeLoanModal();
      closeOrganModal();
    }
  });
}

function boot(){
  // PWA
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js", { scope: "./" }).catch(() => {});
  }

  // Initial UI
  el.volume.value = String(state.volume);
  setSound(state.soundOn);
  setMotion(state.motionOn);
  setMood(state.mood);

  renderAll();
  syncAnatomy();

  pushLog("부팅 완료. 레버를 당겨.", "event");
  setStatus("레버를 당겨라.");
}

bind();
boot();
