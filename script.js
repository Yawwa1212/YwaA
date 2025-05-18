let entries = [];
let page = 1;

fetch('./entries.json')
  .then(res => res.json())
  .then(data => {
    entries = data;
    renderPage();
  });

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