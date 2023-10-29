import { clientId } from './config.js';

// Function to extract the access token from the URL and store it in localStorage
async function handleToken() {
  const hashParams = window.location.hash.substr(1).split('&');
  const params = {};

  for (let i = 0; i < hashParams.length; i++) {
    const [key, value] = hashParams[i].split('=');
    params[key] = decodeURIComponent(value);
  }

  localStorage.setItem('accessToken', params.access_token);
  const username = localStorage.getItem('username');

  const backendResponse = await updateAccessToken(username);

  // Redirect back to the homepage
  window.location.href = 'index.html';
}

async function updateAccessToken(username) {
  const userData = {
    username: username,
    twitchAccessToken: localStorage.getItem('accessToken')
  };

  const response = await fetch('https://vps.tykrt.com/app/updateAccessToken', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(userData)
  });
  return await response.json();
}

// Call the token handling function on page load
window.addEventListener('load', handleToken);