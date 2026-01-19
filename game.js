// 🔥 Firebase 설정 여기에 넣으세요
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, get, query, orderByChild, limitToFirst } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "여기에_넣기",
  authDomain: "여기에_넣기",
  databaseURL: "여기에_넣기",
  projectId: "여기에_넣기",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const timeEl = document.getElementById("time");
const tapBtn = document.getElementById("tap");
const resultEl = document.getElementById("result");

const rankBox = document.getElementById("rankBox");
const rankMsg = document.getElementById("rankMsg");
const nicknameInput = document.getElementById("nickname");
const submitRank = document.getElementById("submitRank");
const rankList = document.getElementById("rankList");

let start = 0;
let running = false;
const TARGET = 1.0;

tapBtn.onclick = () => {
  if(!running){
    running = true;
    start = performance.now();
    tapBtn.textContent = "멈추기";
  } else {
    running = false;
    const t = (performance.now() - start)/1000;
    const diff = Math.abs(Math.round((t - TARGET)*1000));
    resultEl.textContent = `오차 ${diff}ms`;
    tapBtn.textContent = "다시 시작";
    checkRank(diff);
  }
};

async function checkRank(score){
  const q = query(ref(db,"scores"), orderByChild("score"), limitToFirst(100));
  const snap = await get(q);
  let rank = 1;
  snap.forEach(s=>{ if(s.val().score < score) rank++; });

  if(rank<=100){
    rankBox.hidden = false;
    rankMsg.textContent = `🎉 현재 ${rank}위 입니다!`;

    submitRank.onclick = async ()=>{
      const name = nicknameInput.value || "익명";
      await push(ref(db,"scores"),{name,score});
      rankBox.hidden = true;
      loadRank();
    };
  }
}

async function loadRank(){
  rankList.innerHTML = "";
  const q = query(ref(db,"scores"), orderByChild("score"), limitToFirst(10));
  const snap = await get(q);
  let i=1;
  snap.forEach(s=>{
    const li = document.createElement("li");
    li.textContent = `${i}. ${s.val().name} - ${s.val().score}ms`;
    rankList.appendChild(li);
    i++;
  });
}

loadRank();
