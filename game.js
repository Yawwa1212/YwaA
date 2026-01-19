const state = {
  cash: 10000000,
  loan: 0,
  organs: 3,
  spins: 0,
  mode: "party",
};

const MAX_LOAN = 30000000;
const SPIN_COST = 1000000;
const LOAN_UNIT = 5000000;

const cashEl = document.getElementById("cash");
const loanEl = document.getElementById("loan");
const organsEl = document.getElementById("organs");
const wheelEl = document.getElementById("wheel");
const resultEl = document.getElementById("result");
const eventEl = document.getElementById("event");
const logList = document.getElementById("log");
const heroLine = document.getElementById("heroLine");
const screen = document.getElementById("screen");

const spinBtn = document.getElementById("spin");
const borrowBtn = document.getElementById("borrow");
const repayBtn = document.getElementById("repay");

const organSound = document.getElementById("organSound");
const partySound = document.getElementById("partySound");

const logEntries = [];

const wheelOutcomes = [
  { label: "대승", min: 6000000, max: 12000000 },
  { label: "승리", min: 2000000, max: 7000000 },
  { label: "무난", min: -1000000, max: 2000000 },
  { label: "패배", min: -7000000, max: -2000000 },
  { label: "대패", min: -12000000, max: -6000000 },
];

const collectorEvents = [
  "사채업자가 문을 걷어차고 들어왔다. " +
    "이자 폭탄으로 대출이 늘어났다.",
  "사채업자가 웃으며 말했다. " +
    "당분간 숨 좀 쉬게 해주겠다며 빚을 동결했다.",
  "사채업자가 룰렛을 쳐다본다. " +
    "오늘 밤은 운이 보인다고 속삭였다.",
];

function formatMoney(value) {
  return `₩${value.toLocaleString("ko-KR")}`;
}

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
  cashEl.textContent = formatMoney(state.cash);
  loanEl.textContent = formatMoney(state.loan);
  organsEl.textContent = state.organs;

  borrowBtn.disabled = state.loan >= MAX_LOAN;
  repayBtn.disabled = state.loan === 0 || state.cash < LOAN_UNIT;
  spinBtn.disabled = state.cash < SPIN_COST && state.loan >= MAX_LOAN;

  screen.classList.remove(
    "screen--dim",
    "screen--dark",
    "screen--horror",
    "screen--trip"
  );

  if (state.mode === "dim") screen.classList.add("screen--dim");
  if (state.mode === "dark") screen.classList.add("screen--dark");
  if (state.mode === "horror") screen.classList.add("screen--horror");
  if (state.mode === "trip") screen.classList.add("screen--trip");
}

function updateMood() {
  if (state.cash >= 40000000) {
    state.mode = "trip";
    heroLine.textContent = "도파민이 폭주한다. 모든 빛이 춤추며 환각 파티가 열린다.";
    glitchText(true);
    partySound.currentTime = 0;
    partySound.play();
    return;
  }

  if (state.organs === 2) {
    state.mode = "dim";
    heroLine.textContent = "빛이 줄어든다. 룰렛이 흐릿해진다.";
    glitchText(false);
    return;
  }

  if (state.organs === 1) {
    state.mode = "dark";
    heroLine.textContent = "어둠이 내려앉는다. 룰렛이 잘 보이지 않는다.";
    glitchText(false);
    return;
  }

  if (state.organs === 0) {
    state.mode = "horror";
    heroLine.textContent = "모든 소리가 끊긴다. 글씨가 부서진다.";
    glitchText(true);
    organSound.currentTime = 0;
    organSound.play();
    return;
  }

  state.mode = "party";
  heroLine.textContent = "빛나는 룰렛 테이블 위, 한 판만 더는 끝이 없다.";
  glitchText(false);
}

function glitchText(active) {
  [heroLine, resultEl, eventEl].forEach((el) => {
    el.classList.toggle("glitch", active);
  });
}

function spinWheel() {
  if (state.cash < SPIN_COST) {
    if (state.loan < MAX_LOAN) {
      borrowLoan();
    } else {
      resultEl.textContent = "더 이상 빌릴 수 없다. 돈이 없다.";
      addLog("스핀 비용이 없다. 룰렛은 멈췄다.");
      return;
    }
  }

  state.cash -= SPIN_COST;
  const outcome = wheelOutcomes[Math.floor(Math.random() * wheelOutcomes.length)];
  const change = Math.floor(
    outcome.min + Math.random() * (outcome.max - outcome.min)
  );
  state.cash += change;
  state.spins += 1;

  wheelEl.style.transform = `rotate(${Math.random() * 720}deg)`;
  resultEl.textContent = `${outcome.label}! ${formatMoney(change)}`;
  addLog(`룰렛 ${outcome.label}: ${formatMoney(change)} 변화.`);

  if (state.cash < 0) {
    triggerOrganLoss();
  }

  if (state.spins % 4 === 0) {
    triggerCollectorEvent();
  }

  updateMood();
  updateUI();
}

function borrowLoan() {
  if (state.loan >= MAX_LOAN) {
    eventEl.textContent = "더 이상 대출이 되지 않는다.";
    return;
  }
  state.loan = Math.min(state.loan + LOAN_UNIT, MAX_LOAN);
  state.cash += LOAN_UNIT;
  eventEl.textContent = "대출금이 들어왔다. 숨이 조금 트인다.";
  addLog("대출 실행: ₩5,000,000");
  updateMood();
  updateUI();
}

function repayLoan() {
  if (state.loan === 0 || state.cash < LOAN_UNIT) return;
  state.loan -= LOAN_UNIT;
  state.cash -= LOAN_UNIT;
  eventEl.textContent = "빚을 조금 정리했다. 하지만 룰렛의 소리가 남아 있다.";
  addLog("대출 상환: ₩5,000,000");
  updateMood();
  updateUI();
}

function triggerOrganLoss() {
  if (state.loan < MAX_LOAN) {
    borrowLoan();
    return;
  }

  if (state.organs > 0) {
    state.organs -= 1;
    state.cash = 0;
    eventEl.textContent = "대출 한도도 끝났다. 장기 하나를 떼었다.";
    addLog("장기 하나가 사라졌다. 룰렛이 흐릿해진다.");
    organSound.currentTime = 0;
    organSound.play();
  }

  if (state.organs === 0) {
    resultEl.textContent = "끝.끝.끝.";
  }
}

function triggerCollectorEvent() {
  const eventIndex = Math.floor(Math.random() * collectorEvents.length);
  const message = collectorEvents[eventIndex];
  eventEl.textContent = message;
  addLog(message);

  if (eventIndex === 0) {
    const penalty = 2000000;
    state.loan = Math.min(state.loan + penalty, MAX_LOAN);
  }

  if (eventIndex === 1) {
    const relief = Math.min(2000000, state.loan);
    state.loan -= relief;
  }

  if (eventIndex === 2) {
    state.cash += 1000000;
  }
}

function start() {
  eventEl.textContent = "화려한 네온이 당신을 부른다. 룰렛을 돌려보자.";
  addLog("게임 시작: GANG WON LAND");
  updateUI();
}

spinBtn.addEventListener("click", spinWheel);
borrowBtn.addEventListener("click", borrowLoan);
repayBtn.addEventListener("click", repayLoan);

start();
