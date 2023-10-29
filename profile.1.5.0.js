async function init() {
    try {
        if (localStorage.getItem('username')) {
            document.getElementById('intialBackground').style.display = 'none';
            document.querySelector('.mainContainer').style.display = 'block';
            setProfileData();
        } else {
            window.location.href = 'https://tykrt.com';
        }
    } catch (error) {
        console.error('Error during initialization:', error);
    }
}

window.onload = function () {
    init()
}

const drop = document.querySelector(".drop");
const dropBox = document.querySelector(".drop-box");
var state = false;
drop.addEventListener('click', show);

function show() {
  if (!state) {
    document.querySelector(".drop i").classList.add("active");
    dropBox.classList.add("active");
    state = true;
  } else {
    document.querySelector(".drop i").classList.remove("active");
    dropBox.classList.remove("active");
    state = false;
  }
}

function setProfileData() {
    const username = localStorage.getItem('username');
    document.getElementById("dynamicName").textContent = "";
document.getElementById("dynamicUsername").textContent = '@' + username;
}

