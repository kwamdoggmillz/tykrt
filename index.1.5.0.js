import { clientId, apiKey, redirectUri, apiBaseUrl, scope, clientSecret } from './config.js';

let accessToken = null;
let appAccessToken = null;
let userId = null;
let initialized = false;
let leftNavData = []; // add this line to keep all streams data together before they are available
let updatedStreams = [];
const selectedStreams = new Set();
const checkboxStates = {};
const chatIframes = {};
const tooltipsMap = new Map();
const tooltips = [];
let currentCheckedCheckbox = null;
let currentCheckedStreamer = null;
const removalThreshold = 15;
let sidebarOpen = 1;
let leftNavOpen = 1;
let previousLeftNavWidth = 0;
let globalPreviousWindowWidth = window.innerWidth;
let leftNavContainerPercentWidth = 0.14 * window.innerWidth;

async function init() {
  try {
    accessToken = localStorage.getItem('accessToken');
    const username = localStorage.getItem('username');
    const email = localStorage.getItem('email');
    const unwantedCategories = localStorage.getItem('unwantedCategories');

    /*if (!accessToken && !unwantedCategories && !username) {
      window.location.href = 'https://tykrt.com/signin.html';
      return;
    }*/

    setInitialPageState();

    const topNavUsername = document.getElementById('topNavUsername');
    topNavUsername.innerText = username;

    const menuUsername = document.getElementById('menuUsername');
    menuUsername.innerText = username;

    const menuEmail = document.getElementById('menuEmail');
    menuEmail.innerText = email;

    if (accessToken) {
      userId = await getUserInformation(accessToken);
    }

    if (!initialized) {
      updateLeftNav();
      initialized = true;

      attachEventListeners();

    }
  } catch (error) {
    console.error('Error during initialization:', error);
  }
}

window.onload = function () {
  init().then(() => {
    if (accessToken && userId) {
      setTimeout(() => {
        updateLeftNav();
        setInterval(updateLeftNav, 30000);
      }, 30000);
    }
  });
}

function setInitialPageState() {
  if (localStorage.getItem('username')) {
    document.getElementById('signinButtonDiv').style.display = 'none';
    document.querySelector('.drop-box').style.display = 'block';
    document.getElementById('dropNav').style.display = 'flex';
    document.querySelector('.container').style.width = '';
    document.querySelector('.container').style.flexDirection = '';
  } else {
    document.getElementById('signinButtonDiv').style.display = 'block';
    document.querySelector('.drop-box').style.display = 'none';
    document.getElementById('dropNav').style.display = 'none';
    document.querySelector('.container').style.width = 'auto';
    document.querySelector('.container').style.flexDirection = 'unset';
  }
}

// New function to render the sorted streams into the DOM
function renderToDOM() {
  const leftNav = document.getElementById('leftNav');

  // Clear all child elements first
  while (leftNav.firstChild) {
    leftNav.firstChild.remove();
  }

  // Append sorted stream elements to the list
  leftNavData.forEach(streamData => {
    leftNav.appendChild(streamData.element);
  });
}

let gridStackInitialized = new Promise((resolve, reject) => {
  document.addEventListener('DOMContentLoaded', function () {

    // GridStack Initialization
    const options = {
      staticGrid: false,
      cellHeight: 201,
      width: 12,
      resizable: {
        handles: 'e, se, s, sw, w'
      }
    };

    const grid = GridStack.init(options);

    grid.on('resizestart', function (event, elem) {
      const gridItems = document.querySelectorAll('.grid-stack-item');
      gridItems.forEach(item => item.style.pointerEvents = "none");
    });

    grid.on('resizestop', function (event, elem) {
      const gridItems = document.querySelectorAll('.grid-stack-item');
      gridItems.forEach(item => item.style.pointerEvents = "auto");
    });

    grid.on('dragstart', function (event, elem) {
      const gridItems = document.querySelectorAll('.grid-stack-item');
      gridItems.forEach(item => item.style.pointerEvents = "none");
    });

    grid.on('dragstop', function (event, elem) {
      const gridItems = document.querySelectorAll('.grid-stack-item');
      gridItems.forEach(item => item.style.pointerEvents = "auto");
    });


    // Resolve the promise if GridStack is initialized successfully
    if (grid) {
      resolve(grid);
    } else {
      reject('Failed to initialize GridStack.');
    }
  });
});

gridStackInitialized.then(grid => {

  // Other Initializations & Event Listeners
  const leftNavToggle = document.getElementById('leftNavToggle');
  const leftNavToggleArrow = leftNavToggle.querySelector('.topNavToggleArrow');
  const leftNavContainer = document.getElementById('leftNavContainer');

  leftNavToggle.addEventListener('mouseenter', () => {
    if (leftNavContainer.classList.contains('collapsed')) {
      /*leftNavToggleArrow.style.animation = 'bounceRight 2s infinite';*/
    } else {
      /*leftNavToggleArrow.style.animation = 'bounce 2s infinite';*/
    }
  });

  leftNavToggle.addEventListener('mouseleave', () => {
    /*leftNavToggleArrow.style.animation = 'none';*/
  });

  window.addEventListener('resize', handleResize);
  window.addEventListener('load', updateMargins);

}).catch(error => {
  console.error(error);
});

Promise.resolve().then(() => {
  updateMargins();
  updateStreamLayout();
});

document.addEventListener("DOMContentLoaded", function () {
  const welcomeOverlay = document.getElementById("welcomeOverlay");

  // Check if 'visitedBefore' key exists in localStorage
  if (!localStorage.getItem("visitedBefore")) {
    // If it doesn't exist, show the welcomeOverlay
    welcomeOverlay.style.display = "block";
    // Set the 'visitedBefore' key in localStorage to 'true'
    localStorage.setItem("visitedBefore", "true");
  }

});



// Function to handle Twitch signin button click
function signin() {
  const authUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=token&scope=${scope}`;
  window.location.href = authUrl;
}

// Function to test the access token by retrieving user information
async function getUserInformation(accessToken) {
  try {
    const response = await fetch("https://api.twitch.tv/helix/users", {
      headers: {
        Authorization: "Bearer " + accessToken,
        "Client-Id": clientId, // Replace with your Twitch API client Id
      },
    });
    const data = await response.json();
    if (data.data.length > 0) {
      const user = data.data[0];
      return user.id; // Return the user id
    } else {
      console.log("No user data received");
      return null; // Add return null for clearness
    }
  } catch (error) {
    console.log("Error:", error);
  }
}

function handleResize() {

  leftNavContainerPercentWidth = 0.14 * window.innerWidth;

  handleWindowSizeChange();
  Promise.resolve().then(() => {
    updateMargins();
    updateStreamLayout();
  });
}


// Function to update the UI based on window size
function handleWindowSizeChange() {
  const currentWindowWidth = window.innerWidth;
  const currentLeftNavWidth = 0.14 * currentWindowWidth;

  // Check if the leftNav width has just gone below or just exceeded the threshold
  if ((previousLeftNavWidth > 170 && currentLeftNavWidth <= 170) ||
    (previousLeftNavWidth <= 170 && currentLeftNavWidth > 170)) {

    // Toggle the leftNav state
    leftNavOpen = leftNavOpen === 0 ? 1 : 0;

    // If you need to toggle the sidebar state in tandem, add here
    sidebarOpen = sidebarOpen === 0 ? 1 : 0;
  }

  // Update the previous widths
  previousLeftNavWidth = currentLeftNavWidth;
}

function updateMargins() {
  try {

    const topNav = document.getElementById('topNav');
    const leftNavContainer = document.getElementById('leftNavContainer');
    const rightNav = document.getElementById('rightNav');
    const streamPlayerContainer = document.getElementById('streamPlayerContainer');

    const mainContent = document.querySelector('.mainContent');

    // Check if the current screen width is less than or equal to 50rem
    if (window.matchMedia('(max-width: 50rem)').matches) {
      mainContent.classList.add('block');
    } else {
      mainContent.classList.remove('block');
    }

    const tabMenu = document.getElementById('tabMenu');
    let count = 0;

    for (let i = 0; i < tabMenu.children.length; i++) {
      const child = tabMenu.children[i];
      if (child.tagName === 'LABEL') {
        count++;
      }
    }

    if (topNav && leftNavContainer && rightNav && streamPlayerContainer) {
      const leftNavContainerAutoCollapseWidth = 170;

      if (leftNavContainerPercentWidth <= leftNavContainerAutoCollapseWidth) {
        leftNavOpen = 0;

        if (leftNavContainerPercentWidth <= leftNavContainerAutoCollapseWidth) {
        }
      } else {
        leftNavOpen = 1;
      }
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

document.querySelector('.youtubeBtnToggle').addEventListener('click', function () {
  if (this.classList.contains('active')) {
    this.classList.remove('active');
    // The toggle is now in the "off" state
    removeYouTubeStreamsFromNav();
  } else {
    this.classList.add('active');
    // The toggle is now in the "on" state
    // If you wish, you can refresh the leftNav here to re-fetch YouTube streams.
    updateLeftNav();

  }
});

async function attachEventListeners() {
  document.getElementById('addStreamBtn').addEventListener('click', async function () {
    const streamerName = document.getElementById('streamerName').value;

    document.getElementById('streamerName').value = '';

    if (streamerName) {
      if (await isStreamerLiveOnTwitch(streamerName)) {
        createStreamPlayer(null, streamerName, 'twitch');
      } else {
        addYoutubeStream(streamerName, apiKey);
      }
    } else {
      alert("Please provide a streamer name.");
    }
  });

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
  localStorage.removeItem('email');

  window.location.href = 'https://tykrt.com/signin.html';

}


async function isStreamerLiveOnTwitch(streamerName) {
  const twitchApiUrl = `https://api.twitch.tv/helix/streams?user_login=${streamerName}`;

  const response = await fetch(twitchApiUrl, {
    headers: {
      'Client-ID': clientId,
      'Authorization': 'Bearer ' + accessToken  // Replace with your OAuth token
    }
  });

  const data = await response.json();

  return data.data && data.data.length > 0;
}

async function addYoutubeStream(streamerName, apiKey) {
  try {
    const channelId = await getChannelId(streamerName, apiKey);
    const videoId = await getLiveVideoId(channelId, apiKey, streamerName);
    createStreamPlayer(videoId, streamerName, 'youtube');
  } catch (error) {
    console.error(error);
    alert(error.message); // Notify the user if there's an issue
  }
}

async function getChannelId(streamerName, apiKey) {
  const url = `https://www.googleapis.com/youtube/v3/search?part=id&type=channel&q=${encodeURIComponent(streamerName)}&key=${apiKey}`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.items && data.items.length > 0) {
    return data.items[0].id.channelId; // Return the first channel ID found
  }

  throw new Error(`No channel found for streamer name: ${streamerName}`);
}

async function getLiveVideoId(channelId, apiKey, streamerName) {
  const url = `https://www.googleapis.com/youtube/v3/search?part=id&eventType=live&type=video&channelId=${channelId}&key=${apiKey}`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.items && data.items.length > 0) {
    return data.items[0].id.videoId; // Return the video ID of the first live stream found
  }

  throw new Error(`No live stream found for streamer name: ${streamerName}`);
}

function removeYouTubeStreamsFromNav() {
  leftNavData = leftNavData.filter(stream => {
    if (stream.streamType === 'youtube') {
      const streamElement = stream.element;
      if (streamElement) streamElement.parentNode.removeChild(streamElement);
      return false; // Filter out this stream from leftNavData
    }
    return true;
  });
}


async function updateLeftNav() {
  try {

    if (accessToken && userId) {
      await getFollowedLiveStreams(accessToken, userId);
    } else {
      await getTopLiveStreams();
    }


    if (document.querySelector('.youtubeBtnToggle').classList.contains('active')) {
      await getYouTubeLiveBroadcasts(apiKey);
    } else {
      removeStreamsFromNav(updatedStreams)
    }

    sortStreamsByViewers();

    removeOrphanedTooltips();

  } catch (error) {
    console.error('Error updating leftNav data:', error);
  }
}

function removeOrphanedTooltips() {
  // Get all the tooltip elements
  const tooltips = document.querySelectorAll('.tooltip');

  for (let tooltip of tooltips) {
    // Get the associated streamer signin from the tooltip
    const streamerLogin = tooltip.getAttribute('data-streamer');

    // Check if a stream with this streamer signin exists in the left nav using the ^= selector
    const streamElement = document.querySelector(`.streamerCardLink[data-streamer^="${streamerLogin.split(' ')[0]}"]`); // We're assuming that streamer names don't contain spaces for simplicity. Adjust if needed.

    // If the stream element does not exist in the left nav, remove the tooltip
    if (!streamElement) {
      tooltip.remove();
    }
  }
}

function updateStreamLayout() {
  const streamers = Array.from(selectedStreams);
  streamers.forEach(streamer => {
    positionStreamPlayer(streamer);
  });
}

function positionStreamPlayer(username) {
  const gridContainer = document.querySelector('.grid-stack');
  const playerDiv = document.querySelector(`#player-${username}`);
  const existingStreams = Array.from(gridContainer.querySelectorAll('.stream-player'));
  const i = existingStreams.indexOf(playerDiv); // Index of the current stream

  let x = 0, y = 0, width = 12, height = 4;

  switch (existingStreams.length) {
    case 1:
      width = 12;
      height = 4;
      break;
    case 2:
      width = 6;
      height = 4;
      x = (i % 2) * 6; // 0 for the 1st stream and 6 for the 2nd stream
      y = Math.floor(i / 2) * 4; // Remains 0 for both 1st and 2nd streams
      break;
    case 3:
    case 4:
      width = 6;
      height = 2; // Half the original height
      x = (i % 2) * 6;
      y = Math.floor(i / 2) * 2; // This will adjust the Y positioning to accommodate the reduced height
      break;
    // You can continue the pattern for more streams if needed...
  }

  gridStackInitialized.then(grid => {
    grid.update(playerDiv, { x, y, w: width, h: height });
  }).catch(error => {
    console.error(error);
  });
}

async function getAppAccessToken() {
  const grantType = 'client_credentials';

  const response = await fetch(`https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=${grantType}`, {
    method: 'POST'
  });

  if (!response.ok) {
    throw new Error(`Failed to get app access token. Status: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function getTopLiveStreams() {
  try {

    if (!accessToken) {
      appAccessToken = await getAppAccessToken();
    }

    const response = await fetchData(`${apiBaseUrl}/streams?first=20&sort=desc&language=en`);
    const liveStreams = response.data;

    const { usersMap, gamesMap } = await fetchUserAndGameData(liveStreams);

    for (let i = 0; i < liveStreams.length; i++) {
      const stream = liveStreams[i];
      const user = usersMap.get(stream.user_id);
      const game = gamesMap.get(stream.game_id);

      let gameName = 'Just Chatting';
      if (game) gameName = game.name;

      const existingStream = leftNavData.find(item => item.streamerLogin === stream.user_login);
      if (!existingStream) {
        const streamDOMElement = addStreamToNav(stream.user_login, user.display_name, user.profile_image_url, gameName, stream.title, '', stream.viewer_count, 'twitch');
        leftNavData.push({
          element: streamDOMElement,
          streamerLogin: stream.user_login,
          streamTitle: stream.title,
          streamerName: user.display_name,
          gameName: gameName,
          videoId: '',
          viewerCount: stream.viewer_count,
          streamerId: stream.user_id,
          gameId: stream.game_id,
          streamType: 'twitch'
        });
      } else {
        updateStreamInNav(existingStream, stream, gameName, 'twitch');
      }

      updatedStreams.push(stream.user_login);
    }
  } catch (error) {
    console.error('Error fetching top Twitch streams:', error);
  }
}


// Function to fetch the list of followed live streams using Twitch API
async function getFollowedLiveStreams(accessToken, userId) {
  if (userId === undefined) {
    // Handle the undefined case if needed
    return;
  }

  updatedStreams = [];

  try {
    const response = await fetchData(`${apiBaseUrl}/streams/followed?user_id=${userId}`); // Use backticks here
    const liveStreams = response.data;

    const { usersMap, gamesMap } = await fetchUserAndGameData(liveStreams);

    for (let i = 0; i < liveStreams.length; i++) {

      const stream = liveStreams[i];
      const user = usersMap.get(stream.user_id);
      const game = gamesMap.get(stream.game_id);

      let gameName = 'Just Chatting';

      try {
        if (game) {
          gameName = game.name;
        }
      } catch (error) {
        console.error('Error fetching game name:', error);
      }

      const existingStream = leftNavData.find(item => item.streamerLogin === stream.user_login);

      if (!existingStream) {
        const streamDOMElement = addStreamToNav(stream.user_login, user.display_name, user.profile_image_url, gameName, stream.title, '', stream.viewer_count, 'twitch');
        leftNavData.push({
          element: streamDOMElement,
          streamerLogin: stream.user_login,
          streamTitle: stream.title,
          streamerName: user.display_name,
          gameName: gameName,
          videoId: '',
          viewerCount: stream.viewer_count,
          streamerId: stream.user_id,
          gameId: stream.game_id,
          streamType: 'twitch'
        });
      } else {
        updateStreamInNav(existingStream, stream, gameName, 'twitch');
      }

      updatedStreams.push(stream.user_login);
    }

  } catch (error) {
    console.error('Error: ', error);
  }
}

function addStreamToNav(streamerUserLogin, streamerDisplayName, profilePicture, gameName, streamTitle, videoId, viewCount, platform) {
  const leftNav = document.getElementById('leftNav');
  const streamElements = createStreamerCards(streamerUserLogin, streamerDisplayName, profilePicture, gameName, videoId, viewCount, platform);
  const streamerCardLink = streamElements.streamerCardLink;
  const tooltip = streamElements.tooltip;
  const streamerCardLeftDetails = streamElements.streamerCardLeftDetails;
  const profilePicContainer = streamElements.profilePicContainer;
  const profilePic = streamElements.profilePic;
  const checkboxContainer = streamElements.checkboxContainer;
  const checkbox = streamElements.checkbox;
  const label = streamElements.label;
  const streamerName = streamElements.streamerName;
  const gameDiv = streamElements.gameDiv;
  const textView = streamElements.textView;
  const viewerCount = streamElements.viewerCount;
  const streamItem = streamElements.streamItem;

  addTooltip(streamItem, tooltip, streamTitle, leftNav);
  profilePicContainer.appendChild(checkboxContainer);
  profilePicContainer.appendChild(profilePic);
  streamerCardLeftDetails.appendChild(profilePicContainer);
  checkboxContainer.appendChild(checkbox);
  checkboxContainer.appendChild(label);

  streamItem.addEventListener('click', function (event) {
    if (event.target.tagName !== 'LABEL') {
      if (event.target.tagName !== 'INPUT') {
        checkbox.checked = !checkbox.checked;
      }
      handleCheckboxChange(event, checkbox.checked);
    }
  });

  textView.appendChild(streamerName);
  textView.appendChild(gameDiv);
  streamerCardLeftDetails.appendChild(textView);
  streamItem.appendChild(streamerCardLeftDetails);
  streamItem.appendChild(viewerCount);

  if (document.getElementById('leftNavContainer').classList.contains('collapsed')) {
    viewerCount.style.display = 'none';
  } else {
    viewerCount.style.display = '';
  }

  streamerCardLink.appendChild(streamItem);
  leftNav.appendChild(streamerCardLink);

  return streamerCardLink;
}

function updateStreamInNav(existingStream, stream, gameName, platform, youtubeViewers) {
  // Logic to update existing stream details
  // For now, let's assume you want to update the viewer count and game name

  const streamElement = existingStream.element; // This assumes that each item in `leftNavData` has an associated DOM element
  const viewerElement = streamElement.querySelector('.stream-viewers');
  const gameElement = streamElement.querySelector('.game-name');

  let updatedViewerCount;
  if (platform === 'twitch') {
    updatedViewerCount = stream.viewer_count;
    if (viewerElement) viewerElement.textContent = `${getFormattedNumber(stream.viewer_count)}`;
  } else if (platform === 'youtube') {
    updatedViewerCount = youtubeViewers;
    if (isNaN(updatedViewerCount)) {
      updatedViewerCount = 0;
    }
    if (viewerElement) viewerElement.textContent = `${getFormattedNumber(youtubeViewers)}`;
  }

  if (platform === 'twitch') {
    if (gameElement) gameElement.textContent = gameName;
  }

  existingStream.viewerCount = updatedViewerCount;
}

function removeStreamsFromNav(updatedStreams) {
  // First, get an array of the streamerLogin values from leftNavData
  const existingStreamLogins = leftNavData
    .filter(item => item.streamerLogin) // Only get items that have a streamerLogin
    .map(item => item.streamerLogin);   // Convert to an array of streamerLogin values

  const streamsToCheck = existingStreamLogins.filter(signin => !updatedStreams.includes(signin));

  // Now, determine which streams need to be removed
  const streamsToRemoveLogins = streamsToCheck.filter(signin => markStreamForPossibleRemoval(signin));

  // Remove the related DOM elements and data for these streams
  for (let signin of streamsToRemoveLogins) {
    const index = leftNavData.findIndex(item => item.streamerLogin === signin);

    // Remove the data for this stream
    if (index !== -1) {
      const streamElement = leftNavData[index].element;
      if (streamElement) streamElement.parentNode.removeChild(streamElement);
      leftNavData.splice(index, 1); // Remove only the element that matches the stream
      const streamerLogin = streamElement.dataset.streamer;
      clearTooltip(streamerLogin);
    }
  }
}

function markStreamForPossibleRemoval(signin) {
  const streamData = leftNavData.find(item => item.streamerLogin === signin);
  if (streamData) {
    if (streamData.streamType === 'youtube') {
      streamData.missingCycles = (streamData.missingCycles || 0) + 1;
      if (streamData.missingCycles >= removalThreshold) {
        return true;  // ready for removal
      }
      return false; // not yet ready for removal
    } else if (streamData.streamType === 'twitch') {
      return true;  // Twitch streams can be removed immediately
    }
  }
  return false;
}

async function fetchTopGamesFromTwitch(clientId, accessToken) {

  if (!clientId || !accessToken) {
    return null;
  }

  const url = 'https://api.twitch.tv/helix/games/top?first=100'; // Get top 100 games

  const response = await fetch(url, {
    headers: {
      'Client-ID': clientId,
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch top games from Twitch');
  }

  const data = await response.json();
  return data.data.map(game => game.name); // Return an array of game names
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escape special characters
}

function extractGameFromTitle(title, gamesList) {
  if (!title || !gamesList) {
    return null;
  }

  for (let game of gamesList) {
    const escapedGame = escapeRegExp(game);

    // Check for an exact match with word boundaries
    const regexExact = new RegExp(`\\b${escapedGame}\\b`, 'i');
    if (regexExact.test(title)) {
      return game;
    }

    const gameWords = game.split(/\s+/);
    let minWordsToMatch = Math.ceil(gameWords.length / 2);

    if (gameWords.length === 2 || gameWords.length === 3) {
      minWordsToMatch = 2;
    }

    let matchedWords = [];

    for (let word of gameWords) {
      const regexWord = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'i');
      if (regexWord.test(title)) {
        matchedWords.push(word);
      }
    }

    if (matchedWords.length >= minWordsToMatch) {
      const unmatchedWords = gameWords.filter(word => !matchedWords.includes(word));
      if (unmatchedWords.length === 1) {
        const regexUnmatched = new RegExp(`\\b${escapeRegExp(unmatchedWords[0])}\\b`, 'i');
        const titleMatch = title.match(regexUnmatched);
        if (titleMatch && titleMatch[0]) {
          game = game.replace(unmatchedWords[0], titleMatch[0]);
        }
      }
      return game;
    }
  }

  return null;  // If no game is found
}


async function getVideoCategories(apiKey) {
  const lastFetchedTimestamp = localStorage.getItem("videoCategoriesTimestamp");
  const currentTime = Date.now();
  const oneMonthInMillis = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

  // Check if we already have categories in local storage and if they are less than a month old
  if (lastFetchedTimestamp && (currentTime - lastFetchedTimestamp < oneMonthInMillis)) {
    return JSON.parse(localStorage.getItem("videoCategories"));
  }

  // Fetch categories from YouTube API
  const url = `https://www.googleapis.com/youtube/v3/videoCategories?part=snippet&regionCode=US&key=${apiKey}`;
  const response = await fetch(url);
  const data = await response.json();

  const categories = data.items.map(item => ({
    id: item.id,
    title: item.snippet.title
  }));

  // Store categories and current timestamp in local storage
  localStorage.setItem("videoCategories", JSON.stringify(categories));
  localStorage.setItem("videoCategoriesTimestamp", currentTime.toString());

  return categories;
}

function decodeHTMLEntities(text) {
  const textArea = document.createElement('textarea');
  textArea.innerHTML = text;
  return textArea.value;
}

// Function to fetch top 20 live broadcasts from YouTube sorted by view count// Function to fetch top 20 live broadcasts from YouTube sorted by view count
async function getYouTubeLiveBroadcasts(apiKey) {
  try {

    // Fetch the games list just once
    const gamesList = await fetchTopGamesFromTwitch(clientId, accessToken);

    const youtubeLiveStreamsUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&order=viewCount&type=video&eventType=live&maxResults=50&videoLanguage=en&relevanceLanguage=en&key=${apiKey}`;

    const liveStreamsResponse = await fetch(youtubeLiveStreamsUrl);

    if (!liveStreamsResponse.ok) {
      const errorData = await liveStreamsResponse.json();
      if (liveStreamsResponse.status === 403) {

        // Check if the message was shown in the last 24 hours
        const lastShown = localStorage.getItem("quotaExceededTimestamp");
        const currentTime = Date.now();
        const oneDayInMillis = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

        if (!lastShown || (currentTime - lastShown > oneDayInMillis)) {
          console.error("YouTube API quota exceeded.");
          localStorage.setItem("quotaExceededTimestamp", currentTime.toString()); // Store current timestamp
        }
        removeStreamsFromNav(updatedStreams);

        return;
      } else {
        throw new Error(`Error fetching YouTube live broadcasts: ${errorData.error.message}`);
      }
    }

    const data = await liveStreamsResponse.json();
    const liveStreams = data.items;

    // Gather all video IDs and create a single comma-separated string
    const videoIds = liveStreams.map(stream => stream.id.videoId).join(',');

    // Fetch details for all videos in a single request
    const detailsResponse = await fetch(`https://www.googleapis.com/youtube/v3/videos?id=${videoIds}&part=liveStreamingDetails,snippet,statistics&key=${apiKey}`);
    const detailsData = await detailsResponse.json();
    const categories = await getVideoCategories(apiKey);

    const unwantedCategories = await getUserUnwantedCategories();

    let filteredStreams;

    // If the user hasn't specified any unwanted categories, just use all streams
    if (unwantedCategories.length === 0) {
      filteredStreams = detailsData.items;
    } else {
      filteredStreams = detailsData.items.filter(video => {
        const categoryId = video.snippet.categoryId;
        return !unwantedCategories.includes(categoryId);
      });
    }

    // After filtering, slice the array to get the top 20
    const topStreams = filteredStreams.slice(0, 20);

    // Iterate over details for each video and process
    for (let video of detailsData.items) {
      const matchingStream = topStreams.find(s => s.id === video.id);
      if (!matchingStream) continue; // If there's no matching stream, skip to the next iteration
      // Clean up the streamerLogin by replacing special characters
      let streamerLogin = matchingStream.snippet.channelTitle
        .replace(/&/g, 'And')
        .replace(/@/g, 'At')
        .replace(/%/g, 'Pct')
        .replace(/\W+/g, '');
      if (streamerLogin === '' || streamerLogin === null) continue;
      if (!matchingStream) continue;

      let streamTitle = decodeHTMLEntities(matchingStream.snippet.title);

      let gameName = extractGameFromTitle(streamTitle, gamesList);

      // If gameName is not found, use the video's category name
      if (!gameName && video.snippet.categoryId) {
        const category = categories.find(cat => cat.id === video.snippet.categoryId);
        if (category) {
          gameName = category.title;
        }
      }

      const existingStream = leftNavData.find(item => item.streamerLogin === streamerLogin);

      if (!existingStream) {
        const streamDOMElement = addStreamToNav(streamerLogin,
          streamerLogin,
          matchingStream.snippet.thumbnails.medium.url,
          gameName,
          streamTitle,
          video.id,
          video.liveStreamingDetails.concurrentViewers,
          'youtube'
        );
        leftNavData.push({
          element: streamDOMElement,
          streamerLogin: streamerLogin,
          streamTitle: streamTitle,
          streamerName: streamerLogin,
          gameName: gameName,
          videoId: video.id,
          viewerCount: video.liveStreamingDetails.concurrentViewers,
          streamerId: matchingStream.snippet.channelId,
          gameId: '',
          streamType: 'youtube',
        });
      } else {
        updateStreamInNav(existingStream, matchingStream, '', 'youtube', video.liveStreamingDetails.concurrentViewers);
      }

      updatedStreams.push(streamerLogin);
    }

    removeStreamsFromNav(updatedStreams);

  } catch (error) {
    console.error('Error fetching YouTube live broadcasts:', error);
  }
}

async function getUserUnwantedCategories() {
  const username = localStorage.getItem('username');
  let unwantedCategories = []; // Initialize it outside the try block

  try {

    if (!username) {
      return [];
    }

    const response = await fetch(`https://vps.tykrt.com/app/getCategoryPreferences?username=${username}`);
    const data = await response.json();
    unwantedCategories = data.unwantedCategories || []; // Assign the value from the response or an empty array

  } catch (error) {
    console.error('Failed to load user preferences:', error);
  }

  return unwantedCategories; // Return the unwanted categories
}


function createStreamerCards(streamerUserLogin, streamerDisplayName, profilePicture, gameName, videoId, viewCount, platform) {

  const streamElements = {};

  const streamerCardLink = createElementWithClass('a', 'streamerCardLink', {
    href: `javascript:void(0);`,
    'data-streamer': streamerUserLogin,
    'data-platform': platform,
    'data-videoid': videoId,
  });

  streamElements.streamerCardLink = streamerCardLink;

  // Create a single tooltip element
  const tooltip = createElementWithClass('div', 'tooltip streamTooltip', {
    id: `streamTooltip-${streamerUserLogin}`,
    'data-streamer': streamerUserLogin,
    'data-platform': platform,
    'data-videoid': videoId,
  });

  streamElements.tooltip = tooltip;


  const streamItem = createElementWithClass('div', 'streamerCard', {
    'dataset.userLogin': streamerUserLogin,
    'data-streamer': streamerUserLogin,
    'data-platform': platform,
    'data-videoid': videoId,
  });

  // Store the tooltip in the tooltipsMap with the streamItem as the key
  tooltipsMap.set(streamItem, tooltip);

  const streamerCardLeftDetails = createElementWithClass('div', 'streamerCardLeftDetails', {
    'data-streamer': streamerUserLogin,
    'data-platform': platform,
    'data-videoid': videoId,
  });

  streamElements.streamerCardLeftDetails = streamerCardLeftDetails;

  const modifierClass = platform === 'youtube' ? 'profilePicContainer--youtube' : 'profilePicContainer--twitch';
  const profilePicContainer = createElementWithClass('div', `profilePicContainer ${modifierClass}`);
  streamElements.profilePicContainer = profilePicContainer;

  const profilePic = createElementWithClass('img', 'video-thumbnail', {
    src: profilePicture,
    id: `profilePic-${streamerUserLogin}`,
    'data-streamer': streamerUserLogin,
    'data-platform': platform,
    'data-videoid': videoId,
  });

  streamElements.profilePic = profilePic;

  const checkboxContainer = createElementWithClass('div', 'round');

  streamElements.checkboxContainer = checkboxContainer;

  const checkbox = createElementWithClass('input', 'checkbox', {
    type: 'checkbox',
    id: `checkbox-${streamerUserLogin}`,
    'data-streamer': streamerUserLogin,
    'data-platform': platform,
    'data-videoid': videoId,
  });

  streamElements.checkbox = checkbox;

  const label = createElementWithClass('label', 'checkbox-label', {
    'for': `checkbox-${streamerUserLogin}`,
    'data-streamer': streamerUserLogin,
    'data-platform': platform,
    'data-videoid': videoId,
  });

  streamElements.label = label;

  const streamerName = createElementWithClass('div', 'stream-link', {
    'data-streamer': streamerUserLogin,
    'data-platform': platform,
    'data-videoid': videoId,
  });
  streamerName.textContent = streamerDisplayName;

  streamElements.streamerName = streamerName;

  const gameDiv = createElementWithClass('div', 'game-name', {
    'data-streamer': streamerUserLogin,
    'data-platform': platform,
    'data-videoid': videoId,
  });

  gameDiv.textContent = gameName;

  streamElements.gameDiv = gameDiv;

  const textView = createElementWithClass('div', 'text');

  streamElements.textView = textView;

  const viewerCount = createElementWithClass('span', 'stream-viewers', {
    'data-streamer': streamerUserLogin,
    'data-platform': platform,
    'data-videoid': videoId,
  });

  if (viewCount) {
    viewerCount.textContent = `${getFormattedNumber(viewCount)}`;
    streamItem.streamViewCount = viewCount;
  } else {
    viewerCount.textContent = 0;
    streamItem.streamViewCount = 0;
  }

  streamElements.viewerCount = viewerCount;

  streamElements.streamItem = streamItem;

  return streamElements;

}

// Function to handle checkbox change
function handleCheckboxChange(event, checked) {
  const selectedStreamer = event.target.dataset.streamer;
  const platform = event.target.dataset.platform;
  const videoId = event.target.dataset.videoid;
  const checkbox = event.target;

  // Check the window width
  const isSmallScreen = window.matchMedia('(max-width: 50rem)').matches;

  if (isSmallScreen) {
    if (checked) {
      // If a different checkbox is checked, uncheck the previously checked checkbox (if any)
      if (currentCheckedCheckbox && currentCheckedCheckbox !== checkbox) {
        currentCheckedCheckbox.checked = false;
        // Also remove the previously checked streamer
        removeStreamPlayer(currentCheckedStreamer);
      }

      currentCheckedCheckbox = checkbox;
      currentCheckedStreamer = selectedStreamer;
    } else {
      // Prevent unchecking the checkbox on small screens
      checkbox.checked = true;
    }
  }

  if (checked) {
    selectedStreams.add(selectedStreamer);
    checkboxStates[selectedStreamer] = true; // Checkbox is checked
    createStreamPlayer(videoId, selectedStreamer, platform);
  } else {
    removeStreamPlayer(selectedStreamer);
  }

  Promise.resolve().then(() => {
    updateMargins();
    updateStreamLayout();
  });
}


function removeStreamPlayer(username) {
  selectedStreams.delete(username);
  const playerDiv = document.querySelector(`#player-${username}`);
  gridStackInitialized.then(grid => {
    grid.removeWidget(playerDiv);
  });

  if (checkboxStates[username]) {
    checkboxStates[username] = false; // Checkbox is not checked
    const checkbox = document.getElementById(`checkbox-${username}`);
    checkbox.checked = false;
  }

  removeChatTab(username);
  const selectedLabel = updateGliderPosition(0);

  if (selectedLabel) {
    const idParts = selectedLabel.id.split('-');
    if (idParts.length === 2 && idParts[0] === 'label') {
      const channelName = idParts[1];
      showChatTab(channelName);
    }

    updateGliderPosition(0);
  }

  Promise.resolve().then(() => {
    updateMargins();
    updateStreamLayout();
  });
}

function createStreamPlayer(videoId, username, platform) {

  const existingStream = document.querySelector(`#player-${username}`);
  if (existingStream) {
    // If stream already exists, just reposition it
    positionStreamPlayer(username);
    return;
  }

  const playerDiv = createElementWithClass('div', 'stream-player grid-stack-item', {
    id: `player-${username}`
  });
  const handle = createElementWithClass('div', 'handle');
  playerDiv.appendChild(handle);

  // Create close button and append it to handle
  const closeStreamPlayer = createElementWithClass('button', 'closeStreamPlayer');
  closeStreamPlayer.innerHTML = 'X'; // or you can use an SVG or icon font for a nicer visual
  handle.appendChild(closeStreamPlayer);

  // Event listener for close button
  closeStreamPlayer.addEventListener('click', () => {
    // Remove the stream player or hide it, whichever is appropriate
    removeStreamPlayer(username);
    // If you need to perform other actions upon closing, you can add those here.
  });

  if (platform === 'twitch') {
    createOrUpdateChatTab(username);
  }

  gridStackInitialized.then(grid => {
    grid.addWidget(playerDiv); // Adding the playerDiv to Gridstack

    if (platform === 'twitch') {
      const options = {
        width: '100%',
        height: '100%',
        channel: username,
        parent: ["tykrt.com"],
        muted: true,
      };
      new Twitch.Player(`player-${username}`, options);
    } else if (platform === 'youtube') {
      if (typeof YT !== "undefined" && YT && YT.Player) {
        // Adding a YouTube iframe to playerDiv
        const ytFrame = document.createElement('iframe');
        ytFrame.width = "100%";
        ytFrame.height = "100%";
        ytFrame.src = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=https://tykrt.com&autoplay=1&mute=1`;
        ytFrame.frameBorder = "0";
        ytFrame.allowFullscreen = true;

        // Add overlay for resize functionality
        const overlayDiv = document.createElement('div');
        overlayDiv.style.position = 'absolute';
        overlayDiv.style.top = '0';
        overlayDiv.style.left = '0';
        overlayDiv.style.width = '100%';
        overlayDiv.style.height = '100%';
        overlayDiv.style.zIndex = '10';
        overlayDiv.style.pointerEvents = 'none';
        overlayDiv.addEventListener('click', function () {
          // If needed, you can handle overlay interactions here.
        });

        playerDiv.appendChild(ytFrame);
        playerDiv.appendChild(overlayDiv);
      }
    }
  }).catch(error => {
    console.error(error);
  });

  // After creating the player, position it correctly
  positionStreamPlayer(username);
  setStreamPlayerColors(playerDiv, platform);
}


function setStreamPlayerColors(streamPlayer, platform) {
  setTimeout(() => {
    const twitchIframe = streamPlayer.querySelector('iframe');
    if (twitchIframe) {
      if (platform === 'twitch') {
        twitchIframe.classList.add('twitchIframe');
      } else if (platform === 'youtube') {
        twitchIframe.classList.add('youtubeIframe');
      }
    }
  }, 500);  // waiting for 500ms, but adjust as necessary
}

function createOrUpdateChatTab(channelName) {

  const bottomContainer = document.getElementById('bottomContainer');
  const leftNavContainerAutoCollapseWidth = 170;

  const wasAutoCollapsed = globalPreviousWindowWidth > leftNavContainerAutoCollapseWidth;
  const isAutoCollapsed = window.innerWidth <= leftNavContainerAutoCollapseWidth;

  if (globalPreviousWindowWidth !== window.innerWidth && (wasAutoCollapsed !== isAutoCollapsed)) {
    removeAllChats();
  }

  globalPreviousWindowWidth = window.innerWidth;

  if (!chatIframes[channelName]) {
    createChatTab(channelName);
  }

  showChatTab(channelName);

  const bottomTabMenu = document.getElementById('bottomTabMenu');
  let bottomCount = 0;

  for (let i = 0; i < bottomTabMenu.children.length; i++) {
    const child = bottomTabMenu.children[i];
    if (child.tagName === 'LABEL') {
      bottomCount++;
    }
  }

  if (bottomCount === 0) {
    bottomContainer.style.display = 'none';
  } else {
    bottomContainer.style.display = '';
  }

  const radioInput = document.querySelector(`input#radio-${channelName}`);
  if (radioInput && chatIframes[channelName]) {
    const radioButtons = document.querySelectorAll('.tab-radio');
    const selectedIndex = Array.from(radioButtons).indexOf(radioInput);
    updateGliderPosition(selectedIndex);
  }
}

// Function to create a chat tab
function createChatTab(channelName) {
  const tabMenu = document.getElementById('tabMenu');
  const bottomTabMenu = document.getElementById('bottomTabMenu');
  const twitchChats = document.getElementById('twitchChats');
  const bottomTwitchContainer = document.getElementById('bottomTwitchContainer');
  const twitchChatContainer = document.getElementById('twitchChatContainer');
  const tabCount = tabMenu.children.length;
  const leftNavContainerAutoCollapseWidth = 170;

  const rightNav = document.getElementById('rightNav');
  rightNav.style.display = 'block';

  // Create an input radio button
  const radioInput = createElementWithClass('input', 'tab-radio', {
    type: 'radio',
    name: 'tabs',
    id: `radio-${channelName}`, // Set the id to `radio-${channelName}`
    'data-translate': tabCount   // Set the data-translate attribute to tabCount
  });
  if (tabCount == 1) {
    radioInput.checked = true;
  }

  // Create a label for the radio button
  const label = createElementWithClass('label', 'tab', {
    id: `label-${channelName}`,
    for: `radio-${channelName}`
  });

  let tooltip = null

  label.addEventListener('mouseenter', function () {

    tooltip = createTooltipForChatTab(label, channelName);
    tooltip.style.display = 'block';

  });

  label.addEventListener('mouseleave', function () {
    tooltip.style.display = 'none';
    document.body.removeChild(tooltip);
  });

  const videoThumbnail = document.getElementById(`profilePic-${channelName}`);
  const labelImg = createElementWithClass('img', `labelImg`, {
    src: videoThumbnail.src,
    id: `labelImg-${channelName}`,
  });

  label.appendChild(labelImg);

  if (leftNavContainerPercentWidth <= leftNavContainerAutoCollapseWidth) {
    bottomTabMenu.appendChild(radioInput);
    bottomTabMenu.appendChild(label);
  } else {

    // Append the radio button and label to the tab menu
    tabMenu.appendChild(radioInput);
    tabMenu.appendChild(label);

  }

  // Create the chat content container
  const tabContent = createElementWithClass('div', 'tab-content');
  tabContent.id = `content-${channelName}`;

  // Create the chat iframe
  const chatIframe = createChatEmbed(channelName);
  chatIframe.width = '100%'; // Set the width

  // Set the chatIframe height to match the leftNavContainer height
  /*chatIframe.height = (sidebarHeight - tabContainerHeight - sidebarContentHeight - 30) + 'px';*/

  if (leftNavContainerPercentWidth <= leftNavContainerAutoCollapseWidth) {

    /*chatIframe.height = (leftNavContainer.offsetHeight - streamHeight - (window.innerHeight * 0.032) - 10) - 30 + 'px';*/
    chatIframe.width = (window.innerWidth - 54 - 10 - 10 - 10 - 10) + 'px';
  }

  tabContent.appendChild(chatIframe);

  // Append the chat content to the twitchChats container
  twitchChats.appendChild(tabContent);

  if (leftNavContainerPercentWidth <= leftNavContainerAutoCollapseWidth) {
    bottomTwitchContainer.appendChild(twitchChats);
  } else {
    twitchChatContainer.appendChild(twitchChats);
  }

  // Store the chat iframe in the chatIframes object
  chatIframes[channelName] = tabContent;

  // Attach an event listener to the radio button to show the chat tab
  radioInput.addEventListener('change', () => showChatTab(channelName));

  // Initially show the chat tab
  showChatTab(channelName);

  radioInput.addEventListener('change', () => {
    const radioButtons = document.querySelectorAll('.tab-radio');
    const selectedIndex = Array.from(radioButtons).indexOf(radioInput);
    updateGliderPosition(selectedIndex);
  });
}

function createTooltipForChatTab(element, streamerLogin) {
  // Create tooltip element
  const tooltip = createElementWithClass('div', 'tooltip', {
    'data-streamer': streamerLogin,
    id: `chatTooltip-${streamerLogin}`,
  });

  tooltip.innerText = streamerLogin;
  tooltip.style.display = 'block';

  // Append to the body and add an event listener to remove on hover out
  document.body.appendChild(tooltip);

  // Calculate position
  const rect = element.getBoundingClientRect();
  tooltip.style.top = (rect.top - 36 - 13.796875) + 'px';  // 10px for spacing and arrow
  tooltip.style.left = (rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2)) + 'px';

  tooltip.style.display = 'none';

  return tooltip;

}


function createChatEmbed(channelName) {
  // Create the chat-overlay div
  const chatOverlayDiv = document.createElement('div');
  chatOverlayDiv.className = 'chat-overlay';

  // Create and configure the chat iframe
  const chatIframe = createElementWithClass('iframe', 'chat-iframe', {
    id: `chat-iframe-${channelName}`,
    src: `https://www.twitch.tv/embed/${channelName}/chat?darkpopout&parent=tykrt.com`,
    frameborder: '0',
    scrolling: 'no',
    allowfullscreen: 'true'
  });

  // Append the iframe to the overlay div
  chatOverlayDiv.appendChild(chatIframe);

  return chatOverlayDiv; // Return the overlay div instead of just the iframe
}


// Function to show a chat tab and hide others
function showChatTab(channelName) {
  for (const tabName in chatIframes) {
    if (chatIframes.hasOwnProperty(tabName)) {
      const tabContent = chatIframes[tabName];
      const radioInput = document.getElementById(`radio-${channelName}`);

      if (tabName === channelName) {
        tabContent.style.display = 'block';
        radioInput.checked = true; // Check the corresponding radio button
      } else {
        tabContent.style.display = 'none';
      }
    }
  }
}

function removeAllChats() {
  // Get references to the gliders
  const glider = document.querySelector('.glider');
  const bottomGlider = document.querySelector('.bottomGlider');

  // Remove all chat tabs and iframes
  const tabMenu = document.getElementById('tabMenu');
  const bottomTabMenu = document.getElementById('bottomTabMenu');
  const twitchChats = document.getElementById('twitchChats');

  // Clear tab menus except for gliders
  tabMenu.innerHTML = '';
  bottomTabMenu.innerHTML = '';

  // Append the gliders back to their respective menus
  tabMenu.appendChild(glider);
  bottomTabMenu.appendChild(bottomGlider);

  twitchChats.innerHTML = '';

  // Clear chatIframes object
  for (const channelName in chatIframes) {
    if (chatIframes.hasOwnProperty(channelName)) {
      delete chatIframes[channelName];
    }
  }
}

// Function to remove a chat tab
function removeChatTab(channelName) {
  // Get the radio button, label, glider span and chat tab content
  const radioInput = document.getElementById(`radio-${channelName}`);
  const label = document.getElementById(`label-${channelName}`);
  const tabContent = document.getElementById(`content-${channelName}`);

  // Remove them from the DOM
  if (radioInput && label && tabContent) {
    radioInput.parentNode.removeChild(radioInput);
    label.parentNode.removeChild(label);
    tabContent.remove();

    // Remove the chat iframe from the chatIframes object
    delete chatIframes[channelName];

    const tabMenu = document.getElementById('tabMenu');
    let count = 0;

    for (let i = 0; i < tabMenu.children.length; i++) {
      const child = tabMenu.children[i];
      if (child.tagName === 'LABEL') {
        count++;
      }
    }

    const bottomTabMenu = document.getElementById('bottomTabMenu');
    let bottomCount = 0;

    for (let i = 0; i < bottomTabMenu.children.length; i++) {
      const child = bottomTabMenu.children[i];
      if (child.tagName === 'LABEL') {
        bottomCount++;
      }
    }

    if (bottomCount === 0) {
      const bottomContainer = document.getElementById('bottomContainer');
      bottomContainer.style.display = 'none';
    }

    if (count === 0) {
      const rightNav = document.getElementById('rightNav');
      rightNav.style.display = '';
    }
  }
}

// Initially, set the glider's position based on the checked radio button
const checkedRadio = document.querySelector('input[type="radio"]:checked');
if (checkedRadio) {
  const selectedIndex = Array.from(radioButtons).indexOf(checkedRadio);
  updateGliderPosition(selectedIndex);
}

function updateGliderPosition(index) {
  const tabs = document.querySelectorAll('.tab-radio').length;
  const tabWidth = (document.querySelector('.tabs').offsetWidth / tabs);
  const bottomTabWidth = (document.querySelector('.bottomTabs').offsetWidth / tabs);

  const calcTabWidth = `calc((${tabWidth}px) - 2%)`;
  const calcBottomTabWidth = `calc((${bottomTabWidth}px) - 2%)`;

  const glider = document.querySelector('.glider');
  const bottomGlider = document.querySelector('.bottomGlider');

  let selectedLabel; // Declare the variable outside the if block
  let count = 0;

  const leftNavContainerAutoCollapseWidth = 170;

  let labelPosition = 0;
  let gliderPosition = {
    left: 0,
    width: 0
  };

  const tabMenuChildren = Array.from(document.querySelectorAll('.tab-radio'));

  tabMenuChildren.forEach((tabRadio, tabIndex) => {
    count++;
    // Perform actions on each tab here
    const tab = document.querySelectorAll('.tab')[count - 1];
    if (tab && tab.tagName === 'LABEL') {
      const label = tab;
      let fontSize = 90; // Initial font size percentage
      let minFontSize = 50; // Minimum font size percentage

      // Check if the tab's content overflows
      while (tab.scrollWidth > tab.clientWidth && fontSize > minFontSize) {
        fontSize -= 5; // Reduce the font size by 5%
        tab.style.fontSize = `${fontSize}%`;
      }

      // Check if the tab's content overflows
      if (tab.scrollWidth < tab.clientWidth) {
        tab.style.fontSize = '80%'; // Set the original font size
      }

      const gliderElement = leftNavContainerPercentWidth <= leftNavContainerAutoCollapseWidth ? bottomGlider : glider;
      const gliderWidth = leftNavContainerPercentWidth <= leftNavContainerAutoCollapseWidth ? calcBottomTabWidth : calcTabWidth;

      if (tabIndex === index) {
        // Add the "selected-tab" class to the label of the selected radio button
        label.style.color = '#A0ADCD';
        selectedLabel = label; // Store the selected label
        labelPosition = selectedLabel.getBoundingClientRect();

        gliderPosition = {
          left: labelPosition.width * index,
          width: labelPosition.width
        };
      } else {
        label.style.color = 'white';
      }

      gliderElement.style.transform = `translateX(${gliderPosition.left}px)`;

      if (tabs === 1) {
        gliderElement.style.width = 0;
      } else {
        gliderElement.style.width = gliderWidth;
      }
    }
  });

  return selectedLabel;

}

// Function to add and configure a tooltip for a stream item
function addTooltip(streamItem, tooltip, streamTitle, leftNav) {
  // Append the tooltip to the body
  document.body.appendChild(tooltip);

  // Function to hide all tooltips
  function hideAllTooltips() {
    for (let tip of tooltips) {
      tip.style.display = 'none';
    }
  }

  // Attach event listeners to show/hide tooltips
  streamItem.addEventListener('mouseover', function (event) {
    // First, hide all other tooltips
    hideAllTooltips();

    const streamItemRect = streamItem.getBoundingClientRect();

    const x = streamItemRect.right + 28; // Place the tooltip 15px to the right of the streamer card
    const y = streamItemRect.top; // Align the tooltip's top edge with the streamer card's top edge

    // Set the tooltip's position
    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;
    tooltip.style.height = `${streamItemRect.height - 15}px`;

    // Set the tooltip content
    tooltip.textContent = streamTitle;

    tooltip.style.display = 'flex'; // Show the tooltip on mouseover
  });

  streamItem.addEventListener('mouseout', function () {
    tooltip.style.display = 'none'; // Hide the tooltip on mouseout
  });

  tooltips.push(tooltip); // Add the tooltip to the tooltips array
  tooltipsMap.set(streamItem, tooltip); // Map the streamItem to its tooltip
}

function clearTooltip(streamerLogin) {
  // Remove existing tooltips from the DOM
  for (const tooltip of tooltips) {
    if (tooltip.dataset.streamer === streamerLogin) {
      tooltip.remove();
    }
  }

  // Clear the tooltips array
  tooltips.length = tooltips.length - 1;
}

function restoreCheckboxStates() {
  const checkboxes = document.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach(checkbox => {
    const streamer = checkbox.dataset.streamer;
    checkbox.checked = checkboxStates[streamer] || false;
  });
}

function setCheckboxOpacity(opacity) {
  const checkboxes = document.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach(checkbox => {
    const label = checkbox.nextElementSibling;
    label.style.opacity = opacity;
  });
}

function getFormattedNumber(number) {
  try {
    if (typeof number !== 'string') {
      number = String(number);
    }

    if (!number || number === 'NaN') {
      return '0';
    }

    const cleanedNumber = number.replace(/\D/g, '');

    if (cleanedNumber >= 1e6) {
      return `${(cleanedNumber / 1e6).toFixed(1)}M`;
    }

    if (cleanedNumber >= 1e3) {
      return `${(cleanedNumber / 1e3).toFixed(1)}K`;
    }

    return cleanedNumber;
  } catch (error) {
    console.error('Error occurred during number formatting:', error);
    return '0';
  }
}

function revertFormattedNumber(formattedNumber) {

  if (typeof formattedNumber !== 'string') {
    return formattedNumber; // Return 0 or another default value when input is not a string
  }
  // Remove non-numeric characters from the formatted number
  const numericString = formattedNumber.replace(/[^\d.]/g, '');

  // Parse the numeric string to a float or integer, depending on the format
  if (formattedNumber.includes('M')) {
    return parseFloat(numericString) * 1e6;
  } else if (formattedNumber.includes('K')) {
    return parseFloat(numericString) * 1e3;
  } else {
    return parseFloat(numericString);
  }
}

function sortStreamsByViewers() {

  // Sort the leftNavData based on numeric viewCount values
  leftNavData.sort((a, b) => {
    const viewCountA = revertFormattedNumber(a.viewerCount);
    const viewCountB = revertFormattedNumber(b.viewerCount);
    return viewCountB - viewCountA;
  });

  // Render the sorted result to DOM
  renderToDOM();
}

function createElementWithClass(elementType, className, attributes = {}) {
  const element = document.createElement(elementType);
  element.className = className;

  // Set attributes if provided
  for (const key in attributes) {
    if (attributes.hasOwnProperty(key)) {
      element.setAttribute(key, attributes[key]);
    }
  }

  return element;
}

async function fetchData(url, token = appAccessToken) {
  try {
    const headers = {
      'Authorization': 'Bearer ' + (accessToken || token),
      'Client-Id': clientId
    };
    const options = { headers };
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching data:', error);
    throw error;
  }
}


async function fetchStreamData(userId) {
  const url = `${apiBaseUrl}/users?id=${userId}`;
  return await fetchData(url);
}

async function fetchGameData(gameId) {
  const url = `${apiBaseUrl}/games?id=${gameId}`;
  return await fetchData(url);
}

// Function to fetch user and game data for live streams
async function fetchUserAndGameData(liveStreams) {
  const usersMap = new Map();
  const gamesMap = new Map();

  const fetchUserAndGameData = liveStreams.map(async (stream) => {
    const [userData, gameData] = await Promise.all([
      fetchStreamData(stream.user_id),
      fetchGameData(stream.game_id)
    ]);

    usersMap.set(stream.user_id, userData.data[0]);
    gamesMap.set(stream.game_id, gameData.data[0]);
  });

  await Promise.all(fetchUserAndGameData);

  return { usersMap, gamesMap };
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

/*// Close the dropdown if the user clicks outside of it
window.addEventListener('click', function (event) {
  if (!event.target.matches('.drop')) {
    document.querySelector(".drop i").classList.remove("active");
    dropBox.classList.remove("active");
    state = false;
  }
});*/

const streamPlayerContainer = document.getElementById('streamPlayerContainer');
const dummyScrollbar = document.getElementById('dummyScrollbar');
let isProgrammaticScroll = false;

// When user scrolls the main content
streamPlayerContainer.addEventListener('scroll', function () {
  if (isProgrammaticScroll) {
    isProgrammaticScroll = false;
    return;
  }

  if (streamPlayerContainer.scrollHeight <= streamPlayerContainer.clientHeight) {
    dummyScrollbar.classList.add('no-scroll');
  } else {
    dummyScrollbar.classList.remove('no-scroll');
  }

  const percentageScrolled = streamPlayerContainer.scrollTop / (streamPlayerContainer.scrollHeight - streamPlayerContainer.clientHeight);
  isProgrammaticScroll = true;
  dummyScrollbar.scrollTop = percentageScrolled * (dummyScrollbar.scrollHeight - dummyScrollbar.clientHeight);
});

// When user scrolls the dummy scrollbar
dummyScrollbar.addEventListener('scroll', function () {
  if (isProgrammaticScroll) {
    isProgrammaticScroll = false;
    return;
  }
  const percentageScrolled = dummyScrollbar.scrollTop / (dummyScrollbar.scrollHeight - dummyScrollbar.clientHeight);
  isProgrammaticScroll = true;
  streamPlayerContainer.scrollTop = percentageScrolled * (streamPlayerContainer.scrollHeight - streamPlayerContainer.clientHeight);
});

jQuery(function ($) {

  $('.close-btn').click(function () {
    $('#welcomeOverlay').hide();
  });

  $('#leftNavToggle').click(function (e) {

    const leftNavContainer = document.getElementById('leftNavContainer');

    if ($('#leftNavContainer').hasClass('collapsed')) {
      $('#leftNavContainer').removeClass('collapsed');
      leftNavContainer.style.width = '';
      // Rotate the leftNavToggleArrow to face left
      $('#leftNavToggleArrow').css('transform', 'rotate(90deg)');

      const btnElement = document.getElementById('leftNavToggle');
      const arrowElement = btnElement.querySelector('.topNavToggleArrow');

      /*arrowElement.style.animation = 'bounce 2s infinite';*/

      const addStreamContainer = document.querySelector('.addStreamContainer');
      addStreamContainer.style.display = '';

      const youtubeBtnText = document.querySelector('.youtubeBtnText');
      youtubeBtnText.style.display = '';

      const leftNav = document.getElementById('leftNav');
      leftNav.style.height = '';

      const streamViewers = document.querySelectorAll('.stream-viewers');
      for (const streamViewer of streamViewers) {
        streamViewer.style.display = '';
      }

      setCheckboxOpacity('');

      leftNavOpen = 1;

      Promise.resolve().then(() => {
        updateMargins();
      });

    } else {
      $('#leftNavContainer').toggleClass('collapsed');
      leftNavContainer.style.width = 54 + 'px';
      // Rotate the leftNavToggleArrow to face right
      $('.topNavToggleArrow').css('transform', 'rotate(-90deg)');

      const btnElement = document.getElementById('leftNavToggle');
      const arrowElement = btnElement.querySelector('.topNavToggleArrow');

      /*arrowElement.style.animation = 'bounceRight 2s infinite';*/

      const addStreamContainer = document.querySelector('.addStreamContainer');
      addStreamContainer.style.display = 'none';

      const youtubeBtnText = document.querySelector('.youtubeBtnText');
      youtubeBtnText.style.display = 'none';

      const leftNav = document.getElementById('leftNav');
      leftNav.style.height = leftNavContainer.getBoundingClientRect().height - 30 - 9.08 + 'px';

      const streamViewers = document.querySelectorAll('.stream-viewers');
      for (const streamViewer of streamViewers) {
        streamViewer.style.display = 'none';
      }

      setCheckboxOpacity(0.5);

      leftNavOpen = 0;

      Promise.resolve().then(() => {
        updateMargins();
      });

    }
  });

  $(".rightNav-dropdown > a").click(function () {
    $(".rightNav-submenu").slideUp(200);
    if (
      $(this)
        .parent()
        .hasClass("active")
    ) {
      $(".rightNav-dropdown").removeClass("active");
      $(this)
        .parent()
        .removeClass("active");
    } else {
      $(".rightNav-dropdown").removeClass("active");
      $(this)
        .next(".rightNav-submenu")
        .slideDown(200);
      $(this)
        .parent()
        .addClass("active");
    }
  });

  $("#chatToggle").click(function () {
    const rightNav = $("#rightNav");
    const rightNavElement = rightNav.get(0);

    if (!rightNav.hasClass("slideOut")) {
      // If rightNav doesn't have the class "slideOut", then add it
      rightNav.addClass("slideOut");


      rightNavElement.style.right = '-330px';
      rightNavElement.style.position = 'absolute';


      sidebarOpen = 0;
    } else {
      // If rightNav already has the class "slideOut", then remove it
      rightNav.removeClass("slideOut");

      rightNavElement.style.right = '';
      rightNavElement.style.position = '';

      sidebarOpen = 1;
    }

    // Update margins, using Promise for asynchronous behavior (if required)
    Promise.resolve().then(() => {
      updateMargins();
    });
  });

});