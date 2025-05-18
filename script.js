import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getFirestore, collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

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

let entries = [];
let page = 1;

async function fetchEntries() {
  const q = query(collection(db, "entries"), orderBy("date", "desc"));
  const snapshot = await getDocs(q);
  entries = snapshot.docs.map(doc => doc.data());
  renderPage();
}

function renderPage() {
  const entry = entries[page - 1];
  const entryDiv = document.getElementById('entry');
  if (!entry) {
    entryDiv.textContent = "페이지가 없습니다.";
    return;
  }
  entryDiv.innerHTML = `<div><small>${entry.date}</small></div><div>${entry.content}</div>`;
}

function nextPage() {
  if (page < entries.length) {
    page++;
    renderPage();
  }
}
function prevPage() {
  if (page > 1) {
    page--;
    renderPage();
  }
}
function goToPage() {
  const input = document.getElementById("pageInput");
  const value = parseInt(input.value);
  if (!isNaN(value) && value >= 1 && value <= entries.length) {
    page = value;
    renderPage();
  }
}

window.fetchEntries = fetchEntries;
window.nextPage = nextPage;
window.prevPage = prevPage;
window.goToPage = goToPage;

window.onload = fetchEntries;