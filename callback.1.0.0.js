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

  // Fetch Twitch user information
  const twitchData = await fetchTwitchUser(params.access_token);
  const twitchUser = twitchData.data[0];

  // Send user information to your backend
  const backendResponse = await checkOrCreateUser(twitchUser);
  localStorage.setItem('username', twitchUser.login);

  // Redirect back to the homepage
  window.location.href = 'home.html';
}

async function fetchTwitchUser(accessToken) {
  const response = await fetch('https://api.twitch.tv/helix/users', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Client-Id': clientId // replace with your Twitch client ID
    }
  });
  return await response.json();
}

async function checkOrCreateUser(twitchUser) {
  const userData = {
    ...twitchUser,
    accessToken: localStorage.getItem('accessToken')
  };

  const response = await fetch('https://vps.tykrt.com/app/checkOrCreateUser', { // replace with your server endpoint
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