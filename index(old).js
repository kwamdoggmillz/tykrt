import { clientId, apiKey, redirectUri, apiBaseUrl, scope } from './config.js';

let accessToken = null;
let unwantedCategories = null;
let userId = null;
let initialized = false;

async function init() {
  try {
    accessToken = localStorage.getItem('accessToken');

    if (accessToken) {
    // Redirect to the home page
    window.location.href = 'https://tykrt.com/index.html';
    }

  } catch (error) {
    console.error('Error during initialization:', error);
  }
}

window.onload = function () {
  init()
}