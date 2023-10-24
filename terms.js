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