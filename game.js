const MAX_DEBT = 30000000;
const START_CASH = 5000000;
const START_ORGANS = 5;
const HISTORY_LIMIT = 10;
const LOCAL_STORAGE_KEY = "gang-won-land";

const multipliers = [
  { label: "0x", value: 0, weight: 22 },
  { label: "0.5x", value: 0.5, weight: 22 },
  { label: "1x", value: 1, weight: 24 },
  { label: "2x", value: 2, weight: 16 },
  { label: "5x", value: 5, weight: 10 },
  { label: "10x", value: 10, weight: 6 }
];

const state = {
  cash: START_CASH,
  debt: 0,
  organs: START_ORGANS,
  corruption: 0,
  streak: 0,
  spinCount: 0,
  history: [],
  lastMultiplier: null,
  partyTurns: 0,
  playerName: "",
  leaderboard: []
};

let audioEnabled = true;
let reduceMotion = false;
let fxLow = false;
let eventActive = false;

const elements = {
  cash: document.getElementById("cash"),
  debt: document.getElementById("debt"),
  organs: document.getElementById("organs"),
  corruption: document.getElementById("corruption"),
  streak: document.getElementById("streak"),
  status: document.getElementById("status"),
  history: document.getElementById("history"),
  betInput: document.getElementById("bet-input"),
  betSlider: document.getElementById("bet-slider"),
  spin: document.getElementById("spin"),
  loanInput: document.getElementById("loan-input"),
  takeLoan: document.getElementById("take-loan"),
  repayLoan: document.getElementById("repay-loan"),
  reset: document.getElementById("reset"),
  hardReset: document.getElementById("hard-reset"),
  rouletteWheel: document.getElementById("roulette-wheel"),
  toggleAudio: document.getElementById("toggle-audio"),
  toggleMotion: document.getElementById("toggle-motion"),
  toggleEffects: document.getElementById("toggle-effects"),
  eventModal: document.getElementById("event-modal"),
  eventTitle: document.getElementById("event-title"),
  eventBody: document.getElementById("event-body"),
  eventActions: document.getElementById("event-actions"),
  ending: document.getElementById("ending"),
  endingText: document.getElementById("ending-text"),
  restart: document.getElementById("restart"),
  leaderboard: document.getElementById("leaderboard"),
  playerName: document.getElementById("player-name"),
  saveName: document.getElementById("save-name")
};

function formatCurrency(value) {
  return `₩${value.toLocaleString("ko-KR")}`;
}

function loadStorage() {
  const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!stored) return;
  const parsed = JSON.parse(stored);
  state.playerName = parsed.playerName || "";
  state.leaderboard = parsed.leaderboard || [];
}

function saveStorage() {
  const payload = {
    playerName: state.playerName,
    leaderboard: state.leaderboard
  };
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload));
}

function updateLeaderboard() {
  const existing = state.leaderboard.find((entry) => entry.name === state.playerName);
  const bestCash = state.cash;
  const bestStreak = state.streak;
  if (state.playerName.trim()) {
    if (existing) {
      existing.bestCash = Math.max(existing.bestCash, bestCash);
      existing.bestStreak = Math.max(existing.bestStreak, bestStreak);
    } else {
      state.leaderboard.push({
        name: state.playerName,
        bestCash,
        bestStreak,
        runs: 1
      });
    }
  }

  state.leaderboard = state.leaderboard
    .map((entry) => ({
      ...entry,
      runs: entry.runs + (entry.name === state.playerName ? 1 : 0)
    }))
    .sort((a, b) => b.bestCash - a.bestCash)
    .slice(0, 8);

  renderLeaderboard();
  saveStorage();
}

function renderLeaderboard() {
  if (!state.leaderboard.length) {
    elements.leaderboard.innerHTML = "<p>첫 기록을 만들어보세요.</p>";
    return;
  }
  elements.leaderboard.innerHTML = state.leaderboard
    .map((entry, index) =>
      `
      <div class="leaderboard-row">
        <span>#${index + 1}</span>
        <span>${entry.name}</span>
        <span>${formatCurrency(entry.bestCash)}</span>
        <span>Best Streak: ${entry.bestStreak}</span>
      </div>
    `.trim()
    )
    .join("");
}

function renderRoulette() {
  elements.rouletteWheel.innerHTML = "";
  multipliers.forEach((slot) => {
    const div = document.createElement("div");
    div.className = "roulette-slot";
    div.textContent = slot.label;
    if (slot.value >= 5) {
      div.classList.add("hot");
    }
    elements.rouletteWheel.appendChild(div);
  });
}

function updateStatus(message, type = "normal") {
  elements.status.textContent = message;
  elements.status.classList.toggle("glitch", type === "glitch");
  elements.status.classList.toggle("party", type === "party");
}

function updateCorruptionClass() {
  const body = document.body;
  for (let i = 0; i <= 5; i += 1) {
    body.classList.remove(`corruption-${i}`);
  }
  const level = Math.min(state.corruption, 5);
  body.classList.add(`corruption-${level}`);
}

function updateStateClasses() {
  const body = document.body;
  body.classList.remove("state-normal", "state-dark", "state-repo", "state-party");

  if (state.partyTurns > 0) {
    body.classList.add("state-party");
    return;
  }

  if (state.corruption >= 4 || state.debt >= MAX_DEBT * 0.9) {
    body.classList.add("state-repo");
  } else if (state.corruption >= 2 || state.debt >= MAX_DEBT * 0.6) {
    body.classList.add("state-dark");
  } else {
    body.classList.add("state-normal");
  }
}

function updateUI() {
  elements.cash.textContent = formatCurrency(state.cash);
  elements.debt.textContent = formatCurrency(state.debt);
  elements.organs.textContent = state.organs;
  elements.corruption.textContent = state.corruption;
  elements.streak.textContent = state.streak;

  const maxBet = Math.max(100000, Math.min(5000000, state.cash + (MAX_DEBT - state.debt)));
  elements.betSlider.max = maxBet;
  elements.betInput.max = maxBet;

  updateCorruptionClass();
  updateStateClasses();
}

function addHistory(entry) {
  state.history.unshift(entry);
  if (state.history.length > HISTORY_LIMIT) {
    state.history.pop();
  }
  renderHistory();
}

function renderHistory() {
  elements.history.innerHTML = state.history
    .map((entry) => `<li>${entry}</li>`)
    .join("");
}

function pickMultiplier() {
  const totalWeight = multipliers.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const item of multipliers) {
    roll -= item.weight;
    if (roll <= 0) {
      return item;
    }
  }
  return multipliers[multipliers.length - 1];
}

function playTone(type) {
  if (!audioEnabled) return;
  const context = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";

  if (type === "party") {
    oscillator.frequency.value = 660;
    gain.gain.value = 0.08;
  } else if (type === "impact") {
    oscillator.frequency.value = 180;
    gain.gain.value = 0.15;
  } else {
    oscillator.frequency.value = 440;
    gain.gain.value = 0.06;
  }

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.25);
}

function handleRepossession(reason) {
  state.organs -= 1;
  state.corruption += 1;
  updateStatus(`회수 발생: ${reason}. ORGAN TOKEN -1`, "glitch");
  playTone("impact");
  addHistory(`⚠️ 회수: ${reason}`);

  if (state.organs <= 0) {
    endGame();
  }
}

function maybeTriggerLoanShark() {
  if (eventActive) return;
  if (state.spinCount < 3) return;
  const debtRatio = state.debt / MAX_DEBT;
  const chance = 0.15 + debtRatio * 0.2;
  if (Math.random() > chance) return;

  eventActive = true;
  elements.eventModal.classList.add("active");
  elements.eventModal.setAttribute("aria-hidden", "false");
  elements.eventTitle.textContent = "사채업자 이벤트";
  elements.eventBody.textContent = "압박 신호. 선택하지 않으면 더 깊은 빚으로 추락합니다.";
  elements.eventActions.innerHTML = "";

  const options = [
    {
      label: "A. 연장 (이자 +, Corruption +1)",
      action: () => {
        const interest = Math.floor(state.debt * 0.08);
        state.debt = Math.min(MAX_DEBT, state.debt + interest);
        state.corruption += 1;
        updateStatus("연장을 선택했습니다. 이자가 붙고 타락이 깊어집니다.", "glitch");
      }
    },
    {
      label: "B. 딜 (현금 일부 희생, Corruption -1)",
      action: () => {
        const cost = Math.min(state.cash, 800000);
        state.cash -= cost;
        state.corruption = Math.max(0, state.corruption - 1);
        updateStatus("딜 체결. 현금을 바치고 잠시 숨을 돌립니다.");
      }
    },
    {
      label: "C. 거절 (50% 확률 회수)",
      action: () => {
        if (Math.random() < 0.5) {
          handleRepossession("사채업자 분노");
        } else {
          updateStatus("거절 성공. 다음 2스핀 불리한 기운이 감돌았다.", "glitch");
          state.corruption += 1;
        }
      }
    }
  ];

  options.forEach((option) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = option.label;
    button.addEventListener("click", () => {
      option.action();
      closeEvent();
    });
    elements.eventActions.appendChild(button);
  });
}

function closeEvent() {
  eventActive = false;
  elements.eventModal.classList.remove("active");
  elements.eventModal.setAttribute("aria-hidden", "true");
  updateUI();
}

function checkPartyMode(multiplier) {
  if (state.cash >= 50000000 || (multiplier === 10 && state.lastMultiplier === 10)) {
    state.partyTurns = 3;
    updateStatus("도파민 환각 파티 발동!", "party");
    playTone("party");
  }
}

function endGame() {
  elements.ending.classList.add("active");
  elements.ending.setAttribute("aria-hidden", "false");
  elements.endingText.textContent = "모든 토큰이 소거되었습니다. 화면은 암흑 속에서 조용히 붕괴합니다.";
  updateLeaderboard();
}

function resetGame(hard = false) {
  state.cash = START_CASH;
  state.debt = 0;
  state.organs = START_ORGANS;
  state.corruption = 0;
  state.streak = 0;
  state.spinCount = 0;
  state.history = [];
  state.lastMultiplier = null;
  state.partyTurns = 0;

  if (hard) {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    state.leaderboard = [];
    state.playerName = "";
  }

  elements.ending.classList.remove("active");
  elements.ending.setAttribute("aria-hidden", "true");
  updateStatus("새 게임 시작. 다시 한번 네온을 믿어보세요.");
  renderHistory();
  updateUI();
  renderLeaderboard();
}

function spinRoulette() {
  if (eventActive) return;

  const bet = Number(elements.betInput.value);
  if (!bet || bet < 100000) {
    updateStatus("베팅 금액을 입력하세요.");
    return;
  }

  if (state.cash < bet) {
    updateStatus("현금이 부족합니다. 대출을 먼저 사용하세요.", "glitch");
    if (state.cash === 0 && state.debt >= MAX_DEBT) {
      handleRepossession("현금/대출 모두 소진");
    }
    updateUI();
    return;
  }

  const outcome = pickMultiplier();
  const winnings = Math.floor(bet * outcome.value);
  const net = winnings - bet;

  state.cash = state.cash - bet + winnings;
  state.spinCount += 1;

  if (net > 0) {
    state.streak += 1;
    updateStatus(`승리! ${outcome.label} → +${formatCurrency(net)} 획득.`);
  } else if (net === 0) {
    state.streak = 0;
    updateStatus(`본전. ${outcome.label} 결과는 무미건조.`);
  } else {
    state.streak = 0;
    updateStatus(`패배. ${outcome.label}로 ${formatCurrency(Math.abs(net))} 손실.`, "glitch");
  }

  if (net < 0 && state.cash === 0 && state.debt >= MAX_DEBT) {
    handleRepossession("파산과 동시에 추락");
  }

  addHistory(`Spin ${state.spinCount}: ${outcome.label} (${net >= 0 ? "+" : "-"}${formatCurrency(Math.abs(net))})`);

  checkPartyMode(outcome.value);
  state.lastMultiplier = outcome.value;
  if (state.partyTurns > 0) {
    state.partyTurns -= 1;
  }

  maybeTriggerLoanShark();
  updateUI();
  updateLeaderboard();
}

function adjustBet(amount) {
  const current = Number(elements.betInput.value) || 0;
  const next = Math.max(100000, current + amount);
  elements.betInput.value = next;
  elements.betSlider.value = next;
}

function syncBetInputs(value) {
  elements.betInput.value = value;
  elements.betSlider.value = value;
}

function takeLoan() {
  const amount = Number(elements.loanInput.value);
  if (!amount || amount <= 0) {
    updateStatus("대출 금액을 입력하세요.");
    return;
  }

  const available = MAX_DEBT - state.debt;
  if (available <= 0) {
    updateStatus("이미 대출 한도에 도달했습니다.", "glitch");
    return;
  }

  const loan = Math.min(amount, available);
  state.debt += loan;
  state.cash += loan;
  updateStatus(`대출 승인: ${formatCurrency(loan)} 수령.`);
  updateUI();
}

function repayLoan() {
  const amount = Number(elements.loanInput.value);
  if (!amount || amount <= 0) {
    updateStatus("상환 금액을 입력하세요.");
    return;
  }

  const repay = Math.min(amount, state.cash, state.debt);
  if (repay <= 0) {
    updateStatus("상환할 수 있는 금액이 없습니다.", "glitch");
    return;
  }

  state.cash -= repay;
  state.debt -= repay;
  updateStatus(`상환 완료: ${formatCurrency(repay)}.`);
  updateUI();
}

function toggleAudio() {
  audioEnabled = !audioEnabled;
  elements.toggleAudio.textContent = `Audio: ${audioEnabled ? "On" : "Off"}`;
}

function toggleMotion() {
  reduceMotion = !reduceMotion;
  document.body.classList.toggle("reduced-motion", reduceMotion);
  elements.toggleMotion.textContent = `Reduce Motion: ${reduceMotion ? "On" : "Off"}`;
}

function toggleEffects() {
  fxLow = !fxLow;
  document.body.classList.toggle("fx-low", fxLow);
  elements.toggleEffects.textContent = `FX Intensity: ${fxLow ? "Low" : "High"}`;
}

function bindEvents() {
  document.querySelectorAll("[data-bet-adjust]").forEach((button) => {
    button.addEventListener("click", () => {
      adjustBet(Number(button.dataset.betAdjust));
    });
  });

  elements.betInput.addEventListener("input", (event) => {
    syncBetInputs(event.target.value);
  });

  elements.betSlider.addEventListener("input", (event) => {
    syncBetInputs(event.target.value);
  });

  elements.spin.addEventListener("click", spinRoulette);
  elements.takeLoan.addEventListener("click", takeLoan);
  elements.repayLoan.addEventListener("click", repayLoan);
  elements.reset.addEventListener("click", () => resetGame(false));
  elements.hardReset.addEventListener("click", () => resetGame(true));
  elements.toggleAudio.addEventListener("click", toggleAudio);
  elements.toggleMotion.addEventListener("click", toggleMotion);
  elements.toggleEffects.addEventListener("click", toggleEffects);
  elements.restart.addEventListener("click", () => resetGame(false));

  elements.saveName.addEventListener("click", () => {
    state.playerName = elements.playerName.value.trim();
    updateLeaderboard();
  });
}

function init() {
  loadStorage();
  elements.playerName.value = state.playerName;
  renderRoulette();
  renderLeaderboard();
  syncBetInputs(500000);
  bindEvents();
  updateUI();
}

init();
