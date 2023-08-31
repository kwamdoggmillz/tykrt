// Function to extract the access token from the URL and store it in localStorage
function handleToken() {
  const hashParams = window.location.hash.substr(1).split('&');
  const params = {};

  for (let i = 0; i < hashParams.length; i++) {
    const [key, value] = hashParams[i].split('=');
    params[key] = decodeURIComponent(value);
  }

  localStorage.setItem('accessToken', params.access_token);

  // Redirect back to the homepage
  window.location.href = 'index.html';
}

// Call the token handling function on page load
window.addEventListener('load', handleToken);