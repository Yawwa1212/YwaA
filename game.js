const state = {
  glow: 0,
  warmth: 0,
  signal: 0,
  scrap: 0,
  food: 0,
  relic: 0,
  phase: 0,
  tick: 0,
};

const story = document.getElementById("story");
const actions = document.getElementById("actions");
const logList = document.getElementById("log");
const glowEl = document.getElementById("glow");
const warmthEl = document.getElementById("warmth");
const signalEl = document.getElementById("signal");

const logEntries = [];

const phaseText = [
  "관측소는 여전히 잠들어 있다. 작은 코일을 점화해 빛을 확보해야 한다.",
  "빛이 돌기 시작했다. 폐허를 뒤져 부품과 식량을 모아야 한다.",
  "모은 부품으로 열교환기를 조립하면 내부 온도를 유지할 수 있다.",
  "온기가 안정되면 외부로 신호를 송출할 수 있다.",
  "응답이 오기 시작했다. 남은 자원을 정리하며 신호의 의미를 해독하자.",
];

function addLog(text) {
  const stamp = new Date().toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  logEntries.unshift(`[${stamp}] ${text}`);
  if (logEntries.length > 18) logEntries.pop();
  logList.innerHTML = logEntries.map((entry) => `<li>${entry}</li>`).join("");
}

function updateUI() {
  glowEl.textContent = state.glow;
  warmthEl.textContent = state.warmth;
  signalEl.textContent = state.signal;
  story.textContent = phaseText[state.phase];
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function createButton({ id, label, onClick, disabled }) {
  const button = document.createElement("button");
  button.id = id;
  button.textContent = label;
  button.disabled = disabled;
  button.addEventListener("click", onClick);
  return button;
}

function renderActions() {
  actions.innerHTML = "";

  actions.appendChild(
    createButton({
      id: "ignite",
      label: "코일 점화",
      onClick: ignite,
      disabled: state.glow >= 6,
    })
  );

  actions.appendChild(
    createButton({
      id: "scavenge",
      label: "안개 골목 수색",
      onClick: scavenge,
      disabled: state.glow < 2,
    })
  );

  actions.appendChild(
    createButton({
      id: "heater",
      label: "열교환기 조립",
      onClick: buildHeater,
      disabled: state.scrap < 6,
    })
  );

  actions.appendChild(
    createButton({
      id: "signal",
      label: "신호 송출",
      onClick: sendSignal,
      disabled: state.warmth < 4,
    })
  );

  actions.appendChild(
    createButton({
      id: "decode",
      label: "응답 해독",
      onClick: decodeSignal,
      disabled: state.signal < 3,
    })
  );
}

function ignite() {
  state.glow = clamp(state.glow + 2, 0, 8);
  addLog("코일이 깨어나 푸른 빛이 관측소를 채웠다.");
  if (state.phase === 0 && state.glow >= 2) {
    state.phase = 1;
  }
  updateUI();
  renderActions();
}

function scavenge() {
  const scrapGain = 2 + Math.floor(Math.random() * 2);
  const foodGain = 1 + Math.floor(Math.random() * 2);
  state.scrap += scrapGain;
  state.food += foodGain;
  addLog(`금속 부품 ${scrapGain}, 건조식량 ${foodGain}을 확보했다.`);
  if (state.phase === 1 && state.scrap >= 6) {
    state.phase = 2;
  }
  updateUI();
  renderActions();
}

function buildHeater() {
  if (state.scrap < 6) return;
  state.scrap -= 6;
  state.warmth = clamp(state.warmth + 3, 0, 8);
  addLog("열교환기가 돌아가며 내부에 잔열이 유지된다.");
  if (state.phase === 2 && state.warmth >= 4) {
    state.phase = 3;
  }
  updateUI();
  renderActions();
}

function sendSignal() {
  if (state.warmth < 4) return;
  const success = Math.random() > 0.4;
  state.signal = clamp(state.signal + 1, 0, 6);
  if (success) {
    state.relic += 1;
    addLog("안개 속에서 짧은 응답이 도착했다. 패턴이 남아 있다.");
  } else {
    addLog("신호가 흩어졌다. 주파수를 다시 맞춘다.");
  }
  if (state.phase === 3 && state.signal >= 3) {
    state.phase = 4;
  }
  updateUI();
  renderActions();
}

function decodeSignal() {
  if (state.signal < 3) return;
  const outcome = Math.random();
  if (outcome > 0.5) {
    addLog("도시의 생존자가 남긴 좌표를 해독했다. 희망이 보인다.");
  } else {
    addLog("응답은 잔향에 불과했다. 다른 채널을 탐색해야 한다.");
  }
  state.signal = clamp(state.signal - 1, 0, 6);
  updateUI();
  renderActions();
}

function tick() {
  state.tick += 1;
  if (state.tick % 4 === 0) {
    state.glow = clamp(state.glow - 1, 0, 8);
  }
  if (state.glow === 0 && state.tick % 3 === 0) {
    state.warmth = clamp(state.warmth - 1, 0, 8);
  }
  if (state.warmth === 0 && state.tick % 6 === 0) {
    addLog("기온이 빠르게 내려간다. 코일을 재점화해야 한다.");
  }
  updateUI();
  renderActions();
}

function start() {
  addLog("무전기가 희미하게 깜빡인다. 코일을 점화하라.");
  updateUI();
  renderActions();
  setInterval(tick, 1000);
}

start();
