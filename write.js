import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAWJpsr_zqn6VUM2XPeC7uHgdqgs_maJ4",
  authDomain: "fuc333-928d9.firebaseapp.com",
  projectId: "fuc333-928d9",
  storageBucket: "fuc333-928d9.appspot.com",
  messagingSenderId: "337756181444",
  appId: "1:337756181444:web:6f4846f5dc09808ed30a91",
  measurementId: "G-YZQJVG4CWL"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function checkPassword() {
  const pw = document.getElementById("password").value;
  console.log("입력된 비밀번호:", pw); // ✅ 콘솔 출력
  if (pw === "855331!") {
    document.getElementById("pwCheck").style.display = "none";
    document.getElementById("formSection").style.display = "block";
  } else {
    alert("비밀번호가 틀렸습니다.");
  }
}

async function submitEntry() {
  const date = document.getElementById("date").value;
  const content = document.getElementById("content").value;

  if (!date || !content) {
    alert("날짜와 내용을 모두 입력해주세요.");
    return;
  }

  await addDoc(collection(db, "entries"), {
    date,
    content,
    createdAt: serverTimestamp()
  });

  alert("작성 완료! 글이 저장되었습니다.");
  document.getElementById("date").value = "";
  document.getElementById("content").value = "";
}

window.checkPassword = checkPassword;
window.submitEntry = submitEntry;