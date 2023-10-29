window.onload = function () {
    init()
}

async function init() {
    try {
        attachEventListeners();
    } catch (error) {
        console.error('Error during initialization:', error);
    }
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

async function attachEventListeners() {

    document.getElementById('signOutLink').addEventListener('click', async (e) => {
      e.preventDefault(); // Prevent the default action of the link
      await signOut();
    });
  
  }

async function signOut() {
    // Remove data from local storage
    localStorage.removeItem('username');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('unwantedCategories');
  
    window.location.href = 'https://tykrt.com/signin.html';
  
  }