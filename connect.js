import { clientId, redirectUri, scope } from './config.js';

let accessToken = null;

async function init() {
    try {
        accessToken = localStorage.getItem('accessToken');
        const twitchButton = document.querySelector('.btn-twitch');
        twitchButton.addEventListener('click', twitchSignin);


    } catch (error) {
        console.error('Error during initialization:', error);
    }
}

// Function to handle Twitch signin button click
function twitchSignin() {
    const authUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=token&scope=${scope}`;
    window.location.href = authUrl;
}

window.onload = function () {
    init()
}