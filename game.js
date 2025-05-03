let bgAudio = new Audio("audio/main.mp3");

function startAudioLoop() {
  bgAudio.loop = true;
  bgAudio.volume = 0.5;
  bgAudio.play();
}

document.body.addEventListener("click", () => {
  startAudioLoop();
}, { once: true });

function startGame() {
  document.getElementById("background-image").src = "images/church_bg.jpg";
  const screen = document.getElementById("title-screen");
  screen.innerHTML = `
    <img src="images/church_bg.jpg" alt="배경" id="background-image">
    <div class="overlay">
      <p class="intro-text">...</p>
      <button class="start-scene-btn" onclick="enterScene1()">일어난다.</button>
    </div>
  `;
}

function enterScene1() {
  document.getElementById("title-screen").innerHTML = `
    <img src="images/church_bg.jpg" alt="배경" id="background-image">
    <div class="overlay">
      <p>벽 틈으로 찬 공기가 들어온다. 오늘도 하루는 시작된다.</p>
    </div>
  `;
  document.getElementById("status-bars").classList.remove("hidden");
}
