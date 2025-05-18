function checkPassword() {
  const pw = document.getElementById("password").value;
  if (pw === "855331!") {
    document.getElementById("pwCheck").style.display = "none";
    document.getElementById("formSection").style.display = "block";
  } else {
    alert("비밀번호가 틀렸습니다.");
  }
}

function submitEntry() {
  const date = document.getElementById("date").value;
  const content = document.getElementById("content").value;

  if (!date || !content) {
    alert("날짜와 내용을 모두 입력해주세요.");
    return;
  }

  alert("작성 완료! (주의: 현재는 실제 저장되지 않습니다)");
  document.getElementById("date").value = "";
  document.getElementById("content").value = "";
}