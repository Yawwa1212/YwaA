
import { AudioEngine } from "./audio.js";
import { RouletteWheel } from "./roulette.js";
import { loadState, saveState } from "./storage.js";

function clamp01(x){return Math.max(0, Math.min(1, x));}
function money(n){ return `${Math.max(0, Math.floor(n))}pen`; }
function nowTag(){
  const d=new Date();
  const hh=String(d.getHours()).padStart(2,"0");
  const mm=String(d.getMinutes()).padStart(2,"0");
  const ss=String(d.getSeconds()).padStart(2,"0");
  return `[${hh}:${mm}:${ss}]`;
}

const POOL = [
  { key:"20", label:"20", kind:"pos", mult:20, count:1, fill:"rgba(255,210,63,0.22)", text:"#ffd23f" },
  { key:"10", label:"10", kind:"pos", mult:10, count:3, fill:"rgba(255,75,216,0.20)", text:"#ff4bd8" },
  { key:"3",  label:"3",  kind:"pos", mult:3,  count:5, fill:"rgba(58,246,255,0.18)", text:"#3af6ff" },
  { key:"1",  label:"1",  kind:"pos1",mult:2,  count:10,fill:"rgba(255,255,255,0.10)", text:"#ffffff" },
  { key:"-2", label:"-2", kind:"neg", mult:-2, count:5, fill:"rgba(255,53,107,0.18)", text:"#ff356b" },
  { key:"-10",label:"-10",kind:"neg", mult:-10,count:1, fill:"rgba(255,0,0,0.16)", text:"#ff0000" },
  { key:"BOOST", label:"★", kind:"boost", mult:0, count:1, fill:"rgba(124,255,107,0.16)", text:"#7CFF6B" }
];

function buildWheel(){
  const wedges=[];
  for(const s of POOL){
    for(let i=0;i<s.count;i++) wedges.push({ ...s });
  }
  for(let i=wedges.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [wedges[i],wedges[j]]=[wedges[j],wedges[i]];
  }
  return wedges;
}

const DEFAULT_STATE = {
  cash: 30,
  debt: 0,
  boost: 1,
  streak: 0,
  soundOn: true,
  motionOn: true
};

const el = (id)=>document.getElementById(id);

let state = loadState() || { ...DEFAULT_STATE };

const audio = new AudioEngine();
await audio.init();

audio.setEnabled(state.soundOn);
audio.setVolume(clamp01(parseFloat(el("volume").value)));

const wheel = new RouletteWheel(el("roulette"), audio);
wheel.setSegments(buildWheel());

function setStatus(msg){ el("statusLine").textContent = msg; }
function pushLog(text, cls=""){
  const line=document.createElement("p");
  line.className="log-line " + cls;
  line.textContent = `${nowTag()} ${text}`;
  const log=el("log");
  log.appendChild(line);
  log.scrollTop = log.scrollHeight;
}
function toast(msg){
  const t=el("toast");
  t.textContent=msg;
  t.hidden=false;
  clearTimeout(toast._t);
  toast._t=setTimeout(()=>{t.hidden=true}, 1200);
}

function updateUI(){
  el("cash").textContent = money(state.cash);
  el("debt").textContent = money(state.debt);
  el("boost").textContent = `x${state.boost}`;
  el("streak").textContent = String(state.streak);
  el("netWorth").textContent = money(state.cash - state.debt);

  el("toggleSound").textContent = `SOUND: ${state.soundOn ? "ON":"OFF"}`;
  el("toggleMotion").textContent = `MOTION: ${state.motionOn ? "ON":"OFF"}`;

  const totalBet = readBets().total;
  el("betTotal").textContent = money(totalBet);

  el("loanHint").textContent = loanHint();

  el("rulesText").textContent =
`룰렛(25칸)
20x 1 / 10x 3 / 3x 5 / 1 10(당첨=2배) / -2 5 / -10 1 / ★ 1(BOOST)

베팅
20/10/3/1에 각각 금액 입력.
SPIN 누르면 총 베팅액 먼저 차감.
당첨 숫자에 건 금액만 배수로 지급(BOOST 적용).
-2/-10은 총 베팅액 기준 추가 차감.
★는 돈 변동 없이 BOOST만 x2 (연속= x4, x8...)

대출
현금 0pen일 때만 가능.
최대 빚 100pen.
33pen씩, 마지막 34pen.`;
}

function readBets(){
  const b20 = Math.max(0, parseInt(el("bet20").value || "0",10) || 0);
  const b10 = Math.max(0, parseInt(el("bet10").value || "0",10) || 0);
  const b3  = Math.max(0, parseInt(el("bet3").value  || "0",10) || 0);
  const b1  = Math.max(0, parseInt(el("bet1").value  || "0",10) || 0);
  const total = b20+b10+b3+b1;
  return { b20,b10,b3,b1,total };
}

function loanHint(){
  const maxDebt=100;
  const can = state.cash===0 && state.debt < maxDebt;
  if(!can) return "현금이 0pen일 때만 대출 가능. (빚 100pen 한도)";
  const remaining = maxDebt - state.debt;
  const next = remaining<=34 ? remaining : 33;
  return `지금 대출 가능: ${next}pen (남은 한도 ${remaining}pen)`;
}

function applyLoan(){
  const maxDebt=100;
  if(state.cash!==0){ toast("현금 0pen일 때만"); return; }
  if(state.debt>=maxDebt){ toast("대출 한도 끝"); return; }
  const remaining = maxDebt - state.debt;
  const amt = remaining<=34 ? remaining : 33;
  state.debt += amt;
  state.cash += amt;
  pushLog(`대출 +${amt}pen (빚 ${state.debt}pen)`, "event");
  toast(`대출 +${amt}pen`);
}

function repayAll(){
  if(state.debt<=0){ toast("빚 없음"); return; }
  const pay = Math.min(state.cash, state.debt);
  if(pay<=0){ toast("현금 없음"); return; }
  state.cash -= pay;
  state.debt -= pay;
  pushLog(`상환 -${pay}pen (빚 ${state.debt}pen)`, "event");
  toast(`상환 -${pay}pen`);
}

function fxPulse(type){
  if(!state.motionOn) return;
  document.body.classList.add("hitstop", "fx-"+type);
  setTimeout(()=>document.body.classList.remove("hitstop"), 70);
  setTimeout(()=>document.body.classList.remove("fx-"+type), 220);
}

let spinning=false;

async function doSpin(){
  if(spinning) return;
  const bets = readBets();
  if(bets.total<=0){ toast("베팅 먼저"); return; }
  if(state.cash < bets.total){ toast("현금 부족"); return; }

  spinning=true;

  state.cash -= bets.total;
  setStatus(`SPIN... (BET ${money(bets.total)})`);
  pushLog(`BET ${money(bets.total)}`, "event");

  const result = await wheel.spin({ duration: state.motionOn ? 3600 : 1600, minSpins: 7, maxSpins: 10 });
  const seg = result.segment;

  if(seg.kind==="boost"){
    state.boost *= 2;
    pushLog(`★ BOOST! 다음 결과 x${state.boost}`, "boost");
    setStatus(`BOOST! 다음 결과 x${state.boost}`);
    audio.play("boost");
    fxPulse("boost");
    state.cash = Math.max(0, state.cash);
    saveState(state); updateUI();
    spinning=false;
    return;
  }

  const boost = state.boost;

  if(seg.kind==="pos" || seg.kind==="pos1"){
    let betOn=0, base=0;
    if(seg.key==="20"){ betOn=bets.b20; base=betOn*20; }
    if(seg.key==="10"){ betOn=bets.b10; base=betOn*10; }
    if(seg.key==="3"){ betOn=bets.b3; base=betOn*3; }
    if(seg.key==="1"){ betOn=bets.b1; base=betOn*2; }

    const boosted = Math.floor(base * boost);
    state.cash += boosted;

    if(boosted>0){
      state.streak += 1;
      pushLog(`HIT ${seg.label} | +${money(boosted)} (on ${seg.key}: ${money(betOn)})`, "win");
      setStatus(`HIT ${seg.label}! +${money(boosted)} (BOOST x${boost})`);
      audio.play("win");
      fxPulse("win");
    }else{
      state.streak = 0;
      pushLog(`MISS ${seg.label}`, "lose");
      setStatus(`MISS...`);
      audio.play("lose");
      fxPulse("lose");
    }
  }else if(seg.kind==="neg"){
    const pen = Math.floor(bets.total * Math.abs(seg.mult) * boost);
    state.cash = Math.max(0, state.cash - pen);
    state.streak = 0;
    pushLog(`${seg.label} TRAP | -${money(pen)} (BOOST x${boost})`, "lose");
    setStatus(`${seg.label} TRAP... -${money(pen)}`);
    audio.play("lose");
    fxPulse("lose");
  }

  state.boost = 1;

  saveState(state);
  updateUI();
  spinning=false;
}

function bind(){
  el("spinBtn").addEventListener("click", doSpin);

  el("toggleSound").addEventListener("click", ()=>{
    state.soundOn = !state.soundOn;
    audio.setEnabled(state.soundOn);
    saveState(state); updateUI();
  });
  el("toggleMotion").addEventListener("click", ()=>{
    state.motionOn = !state.motionOn;
    saveState(state); updateUI();
  });

  el("volume").addEventListener("input", (e)=>{
    audio.setVolume(clamp01(parseFloat(e.target.value)));
  });

  for(const id of ["bet20","bet10","bet3","bet1"]){
    el(id).addEventListener("input", ()=>{ updateUI(); });
  }

  el("borrowBtn").addEventListener("click", ()=>{
    el("loanModal").hidden=false;
    updateUI();
  });
  el("loanClose").addEventListener("click", ()=>{ el("loanModal").hidden=true; });
  el("loanConfirm").addEventListener("click", ()=>{
    applyLoan();
    el("loanModal").hidden=true;
    saveState(state); updateUI();
  });

  el("repayBtn").addEventListener("click", ()=>{
    repayAll();
    saveState(state); updateUI();
  });

  el("loanModal").addEventListener("click", (e)=>{
    if(e.target===el("loanModal")) el("loanModal").hidden=true;
  });
}

bind();
updateUI();
