const state = {
  cash: 10000000,
  debt: 0,
  modules: 5,
  corruption: 0,
  streak: 0,
  bestCash: 10000000,
  bestStreak: 0,
  spins: 0,
  bet: 1000000,
  pendingEvent: null,
  effects: true,
  reduceMotion: false,
  volume: 0.6,
};

const MAX_DEBT = 30000000;
const BET_MIN = 100000;
const BET_MAX = 5000000;
const BET_STEP = 100000;
const LOAN_UNIT = 5000000;
const MAX_CORRUPTION = 5;

const odds = [
  { label: "0x", multiplier: 0, weight: 20 },
  { label: "0.5x", multiplier: 0.5, weight: 25 },
  { label: "1x", multiplier: 1, weight: 28 },
  { label: "2x", multiplier: 2, weight: 16 },
  { label: "5x", multiplier: 5, weight: 9 },
  { label: "10x", multiplier: 10, weight: 2 },
];

const collectorEvents = [
  {
    title: "사채업자 등장",
    text: "연장 조건을 제시했다. 연장하면 타락이 쌓인다.",
    choices: [
      {
        label: "연장",
        effect: () => {
          state.corruption = clamp(state.corruption + 1, 0, MAX_CORRUPTION);
          addLog("연장 계약 체결. 타락 +1");
        },
      },
      {
        label: "딜",
        effect: () => {
          const pay = Math.min(3000000, state.cash);
          state.cash -= pay;
          state.corruption = clamp(state.corruption - 1, 0, MAX_CORRUPTION);
          addLog("딜 성사. 현금 일부를 바치고 타락 -1");
        },
      },
      {
        label: "거절",
        effect: () => {
          if (Math.random() < 0.45) {
            triggerSeizure("거절의 대가로 회수가 발생했다.");
          } else {
            addLog("거절했지만 이번엔 넘어갔다.");
          }
        },
      },
    ],
  },
  {
    title: "연체 압박",
    text: "이자가 붙었다. 지금 상환하면 타락이 줄어든다.",
    choices: [
      {
        label: "지불",
        effect: () => {
          const pay = Math.min(2000000, state.cash);
          state.cash -= pay;
          state.debt = Math.max(state.debt - 2000000, 0);
          state.corruption = clamp(state.corruption - 1, 0, MAX_CORRUPTION);
          addLog("연체 정리 완료. 타락 -1");
        },
      },
      {
        label: "연체",
        effect: () => {
          state.debt = Math.min(state.debt + 2000000, MAX_DEBT);
          addLog("연체 발생. 대출 잔액 증가");
        },
      },
      {
        label: "협상",
        effect: () => {
          if (Math.random() < 0.5) {
            state.debt = Math.min(state.debt + 1000000, MAX_DEBT);
            addLog("협상 실패. 이자 추가");
          } else {
            state.debt = Math.max(state.debt - 1000000, 0);
            addLog("협상 성공. 이자 일부 감면");
          }
        },
      },
    ],
  },
];

const elements = {
  cash: document.getElementById("cash"),
  debt: document.getElementById("debt"),
  modules: document.getElementById("modules"),
  corruption: document.getElementById("corruption"),
  streak: document.getElementById("streak"),
  wheel: document.getElementById("wheel"),
  result: document.getElementById("result"),
  odds: document.getElementById("odds"),
  eventText: document.getElementById("eventText"),
  eventChoices: document.getElementById("eventChoices"),
  log: document.getElementById("log"),
  heroLine: document.getElementById("heroLine"),
  betAmount: document.getElementById("betAmount"),
  betSlider: document.getElementById("betSlider"),
  betUp: document.getElementById("betUp"),
  betDown: document.getElementById("betDown"),
  spin: document.getElementById("spin"),
  borrow: document.getElementById("borrow"),
  repay: document.getElementById("repay"),
  nickname: document.getElementById("nickname"),
  saveScore: document.getElementById("saveScore"),
  leaderboardList: document.getElementById("leaderboardList"),
  effectsToggle: document.getElementById("effectsToggle"),
  motionToggle: document.getElementById("motionToggle"),
  volume: document.getElementById("volume"),
  reset: document.getElementById("reset"),
  hardReset: document.getElementById("hardReset"),
};

const logEntries = [];

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function formatMoney(value) {
  return `₩${Math.max(value, 0).toLocaleString("ko-KR")}`;
}

function addLog(text) {
  const stamp = new Date().toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  logEntries.unshift(`[${stamp}] ${text}`);
  if (logEntries.length > 10) logEntries.pop();
  elements.log.innerHTML = logEntries.map((entry) => `<li>${entry}</li>`).join("");
}

function renderOdds() {
  elements.odds.textContent = odds
    .map((item) => `${item.label}`)
    .join(" · ");
}

function updateMood() {
  document.body.classList.remove("party");
  for (let i = 0; i <= MAX_CORRUPTION; i += 1) {
    document.body.classList.remove(`corruption-${i}`);
  }
  document.body.classList.add(`corruption-${state.corruption}`);

  if (state.cash >= 50000000 || state.streak >= 5) {
    document.body.classList.add("party");
    elements.heroLine.textContent =
      "도파민 팡팡! 네온이 폭주하며 환각 파티가 시작된다.";
    toggleGlitch(true);
    if (state.effects) playPartySound();
  } else if (state.corruption >= 4) {
    elements.heroLine.textContent =
      "빛이 거의 사라졌다. 룰렛과 숫자가 흐릿하게 뒤틀린다.";
    toggleGlitch(state.effects);
  } else if (state.corruption >= 2) {
    elements.heroLine.textContent =
      "불길한 그림자가 늘어난다. 시야가 흔들린다.";
    toggleGlitch(false);
  } else {
    elements.heroLine.textContent =
      "네온 축제가 당신을 부른다. 원클릭 룰렛을 돌려보자.";
    toggleGlitch(false);
  }
}

function toggleGlitch(active) {
  [elements.heroLine, elements.result, elements.eventText].forEach((el) => {
    el.classList.toggle("glitch", active && state.effects);
  });
}

function updateUI() {
  elements.cash.textContent = formatMoney(state.cash);
  elements.debt.textContent = formatMoney(state.debt);
  elements.modules.textContent = state.modules;
  elements.corruption.textContent = state.corruption;
  elements.streak.textContent = state.streak;
  elements.betAmount.textContent = formatMoney(state.bet);

  elements.betSlider.value = state.bet;

  elements.borrow.disabled = state.debt >= MAX_DEBT;
  elements.repay.disabled = state.debt === 0 || state.cash < LOAN_UNIT;
  elements.spin.disabled =
    state.modules === 0 || (state.cash < state.bet && state.debt >= MAX_DEBT);

  document.body.classList.toggle("effects-off", !state.effects);
  document.body.classList.toggle("reduce-motion", state.reduceMotion);

  updateMood();
}

function weightedPick() {
  const total = odds.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * total;
  for (const item of odds) {
    roll -= item.weight;
    if (roll <= 0) return item;
  }
  return odds[0];
}

function applySpinOutcome(outcome) {
  const win = Math.floor(state.bet * outcome.multiplier);
  const net = win - state.bet;
  state.cash += net;

  elements.wheel.style.transform = `rotate(${Math.random() * 720}deg)`;
  elements.result.textContent = `${outcome.label} (${formatMoney(net)})`;
  addLog(`룰렛 결과 ${outcome.label} / ${formatMoney(net)}`);

  if (outcome.multiplier >= 2) {
    state.streak += 1;
  } else if (outcome.multiplier === 0) {
    state.streak = 0;
  }

  state.bestCash = Math.max(state.bestCash, state.cash);
  state.bestStreak = Math.max(state.bestStreak, state.streak);
}

function spinWheel() {
  if (state.modules === 0) {
    elements.result.textContent = \"모든 모듈이 회수되어 더 이상 진행할 수 없다.\";
    return;
  }
  if (state.pendingEvent) {
    elements.result.textContent = "이벤트 선택을 먼저 완료하세요.";
    return;
  }

  if (state.cash < state.bet) {
    if (state.debt < MAX_DEBT) {
      borrowLoan();
    } else {
      elements.result.textContent = "현금이 부족하고 더 이상 빌릴 수 없다.";
      addLog("스핀 실패: 자금 부족");
      triggerSeizure("스핀을 시도했지만 한도가 끝났다.");
      updateUI();
      return;
    }
  }

  state.spins += 1;
  const outcome = weightedPick();
  applySpinOutcome(outcome);

  if (state.cash <= 0 && state.debt >= MAX_DEBT) {
    triggerSeizure("파산과 동시에 회수가 시작된다.");
  }

  if (state.spins % 5 === 0 || state.debt / MAX_DEBT > 0.6) {
    maybeTriggerCollector();
  }

  updateUI();
}

function borrowLoan() {
  if (state.debt >= MAX_DEBT) {
    elements.eventText.textContent = "더 이상 대출이 되지 않는다.";
    return;
  }
  state.debt = Math.min(state.debt + LOAN_UNIT, MAX_DEBT);
  state.cash += LOAN_UNIT;
  elements.eventText.textContent = "대출이 실행됐다. 네온이 다시 밝아졌다.";
  addLog("대출 실행: ₩5,000,000");
  updateUI();
}

function repayLoan() {
  if (state.debt === 0 || state.cash < LOAN_UNIT) return;
  state.debt -= LOAN_UNIT;
  state.cash -= LOAN_UNIT;
  elements.eventText.textContent = "대출을 상환했다. 숨이 조금 트인다.";
  addLog("대출 상환: ₩5,000,000");
  updateUI();
}

function triggerSeizure(message) {
  if (state.modules <= 0) return;
  state.modules -= 1;
  state.corruption = clamp(state.corruption + 1, 0, MAX_CORRUPTION);
  state.cash = 0;
  state.streak = 0;
  elements.eventText.textContent = message;
  addLog("부품 토큰 회수. 심연이 내려앉는다.");
  toggleGlitch(true);
  if (state.effects) playSeizureSound();

  if (state.modules === 0) {
    elements.result.textContent = "END // SYSTEM BLACKOUT";
    elements.eventText.textContent = "모든 모듈이 회수되었다. 다시 시작할 수 있다.";
  }
}

function maybeTriggerCollector() {
  if (state.pendingEvent || Math.random() < 0.4) {
    const event = collectorEvents[Math.floor(Math.random() * collectorEvents.length)];
    state.pendingEvent = event;
    renderEvent(event);
  }
}

function renderEvent(event) {
  elements.eventText.textContent = `${event.title} — ${event.text}`;
  elements.eventChoices.innerHTML = "";
  event.choices.forEach((choice) => {
    const button = document.createElement("button");
    button.textContent = choice.label;
    button.addEventListener("click", () => {
      choice.effect();
      state.pendingEvent = null;
      elements.eventChoices.innerHTML = "";
      elements.eventText.textContent = "결정이 내려졌다. 다시 룰렛으로.";
      updateUI();
    });
    elements.eventChoices.appendChild(button);
  });
function updateBet(value) {
  state.bet = clamp(value, BET_MIN, BET_MAX);
  updateUI();
}
function loadSettings() {
  const saved = JSON.parse(localStorage.getItem("gwl_settings") || "{}");
  state.effects = saved.effects ?? true;
  state.reduceMotion = saved.reduceMotion ?? false;
  state.volume = saved.volume ?? 0.6;

  elements.effectsToggle.checked = state.effects;
  elements.motionToggle.checked = state.reduceMotion;
  elements.volume.value = state.volume;
}

function saveSettings() {
  localStorage.setItem(
    "gwl_settings",
    JSON.stringify({
      effects: state.effects,
      reduceMotion: state.reduceMotion,
      volume: state.volume,
    })
  );
}

function saveLeaderboard(entry) {
  const data = JSON.parse(localStorage.getItem("gwl_leaderboard") || "[]");
  data.push(entry);
  data.sort((a, b) => b.bestCash - a.bestCash || b.bestStreak - a.bestStreak);
  localStorage.setItem("gwl_leaderboard", JSON.stringify(data.slice(0, 10)));
}

function renderLeaderboard() {
  const data = JSON.parse(localStorage.getItem("gwl_leaderboard") || "[]");
  elements.leaderboardList.innerHTML = data
    .map(
      (entry, index) =>
        `<li>${index + 1}. ${entry.name} — 최고 현금 ${formatMoney(
          entry.bestCash
        )} / 최고 연승 ${entry.bestStreak}</li>`
    )
    .join("");
}

function resetGame(clearStorage = false) {
  state.cash = 10000000;
  state.debt = 0;
  state.modules = 5;
  state.corruption = 0;
  state.streak = 0;
  state.bestCash = state.cash;
  state.bestStreak = 0;
  state.spins = 0;
  state.pendingEvent = null;
  elements.eventChoices.innerHTML = "";
  elements.eventText.textContent = "초기화 완료. 네온을 다시 점등한다.";
  elements.result.textContent = "SPIN 버튼을 눌러 룰렛을 시작하세요.";
  logEntries.length = 0;
  if (clearStorage) {
    localStorage.removeItem("gwl_leaderboard");
  }
  updateUI();
  renderLeaderboard();
}

function ensureAudioContext() {
  if (!window.AudioContext && !window.webkitAudioContext) return null;
  if (!window.__gwlAudio) {
    window.__gwlAudio = new (window.AudioContext || window.webkitAudioContext)();
  return window.__gwlAudio;
function playTone({ frequency, duration, type }) {
  const context = ensureAudioContext();
  if (!context) return;
  const osc = context.createOscillator();
  const gain = context.createGain();
  osc.type = type;
  osc.frequency.value = frequency;
  gain.gain.value = state.volume;
  osc.connect(gain);
  gain.connect(context.destination);
  osc.start();
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
  osc.stop(context.currentTime + duration);
}

function playSeizureSound() {
  playTone({ frequency: 80, duration: 1.2, type: "sawtooth" });
  playTone({ frequency: 150, duration: 0.8, type: "square" });
}

function playPartySound() {
  playTone({ frequency: 520, duration: 0.4, type: "triangle" });
  playTone({ frequency: 660, duration: 0.4, type: "sine" });
}

function init() {
  renderOdds();
  loadSettings();
  renderLeaderboard();
  addLog("게임 시작: GANG WON LAND");
elements.spin.addEventListener("click", spinWheel);
elements.borrow.addEventListener("click", borrowLoan);
elements.repay.addEventListener("click", repayLoan);

[elements.betDown, elements.betUp].forEach((button) => {
  button.addEventListener("click", () => {
    const delta = button === elements.betUp ? BET_STEP : -BET_STEP;
    updateBet(state.bet + delta);
  });
});

elements.betSlider.addEventListener("input", (event) => {
  updateBet(Number(event.target.value));
});

elements.effectsToggle.addEventListener("change", (event) => {
  state.effects = event.target.checked;
  saveSettings();
  updateUI();
});

elements.motionToggle.addEventListener("change", (event) => {
  state.reduceMotion = event.target.checked;
  saveSettings();
  updateUI();
});

elements.volume.addEventListener("input", (event) => {
  state.volume = Number(event.target.value);
  saveSettings();
});

elements.saveScore.addEventListener("click", () => {
  const name = elements.nickname.value.trim() || "NEON";
  saveLeaderboard({ name, bestCash: state.bestCash, bestStreak: state.bestStreak });
  renderLeaderboard();
  elements.nickname.value = "";
  addLog("리더보드에 기록이 저장되었다.");
});

elements.reset.addEventListener("click", () => resetGame(false));
elements.hardReset.addEventListener("click", () => resetGame(true));
init();

function start() {
  eventEl.textContent = "화려한 네온이 당신을 부른다. 룰렛을 돌려보자.";
  addLog("게임 시작: GANG WON LAND");
  updateUI();
}

spinBtn.addEventListener("click", spinWheel);
borrowBtn.addEventListener("click", borrowLoan);
repayBtn.addEventListener("click", repayLoan);

start();
