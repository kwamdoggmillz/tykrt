async function init() {
    try {
setProfileData();
    } catch (error) {
        console.error('Error during initialization:', error);
    }
}

window.onload = function () {
    init()
}

function setProfileData() {
    const username = localStorage.getItem('username');
    document.getElementById("dynamicName").textContent = "";
document.getElementById("dynamicUsername").textContent = '@' + username;
}