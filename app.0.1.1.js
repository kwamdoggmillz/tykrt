import { clientId, apiKey, redirectUri, apiBaseUrl, scope } from './config.js';

let accessToken = null;
let userId = null;
let initialized = false;
let isFirstRun = true;
let leftNavData = []; // add this line to keep all streams data together before they are available
const selectedStreams = new Set();
const checkboxStates = {};
const chatIframes = {};
const tooltipsMap = new Map();
const tooltips = [];
const maxStreamsSelected = 4; // Set the maximum number of streams that can be selected
let tabCount = 0;
let sidebarOpen = 1;
let leftNavOpen = 1;
let previousWindowWidth = window.innerWidth;
let previousLeftNavWidth = 0;
let globalPreviousWindowWidth = window.innerWidth;
let leftNavContainerPercentWidth = 0.14 * window.innerWidth;

async function init() {
  try {
    accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
      const loginButton = document.getElementById('loginButton');
      loginButton.addEventListener('click', login);
      return;
    }

    userId = await getUserInformation(accessToken);

    const loginContainer = document.getElementById('loginContainer');
    const leftNavContainer = document.getElementById('leftNavContainer');
    const topNav = document.getElementById('topNav');

    if (loginContainer.style.display !== 'none') {
      loginContainer.style.display = 'none';
      leftNavContainer.style.display = 'block';
      topNav.style.display = 'flex';
      updateMargins();
    }

    if (!initialized) {
      updateLeftNav();
      initialized = true;
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
        handles: 'all'
      }
    };

    const grid = GridStack.init(options);

    grid.on('resizestart', function (event, elem) {
      elem.style.pointerEvents = "none";
    });

    grid.on('resizestop', function (event, elem) {
      elem.style.pointerEvents = "auto";
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
  const leftNavToggleArrow = leftNavToggle.querySelector('.leftNavToggleArrow');
  const leftNavContainer = document.getElementById('leftNavContainer');

  leftNavToggle.addEventListener('mouseenter', () => {
    if (leftNavContainer.classList.contains('collapsed')) {
      leftNavToggleArrow.style.animation = 'bounceRight 2s infinite';
    } else {
      leftNavToggleArrow.style.animation = 'bounce 2s infinite';
    }
  });

  leftNavToggle.addEventListener('mouseleave', () => {
    leftNavToggleArrow.style.animation = 'none';
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


// Function to handle Twitch login button click
function login() {
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
  previousWindowWidth = currentWindowWidth;
  previousLeftNavWidth = currentLeftNavWidth;
}



function updateMargins() {
  try {

    let [isLeftNavOpen, isSidebarOpen] = [leftNavOpen, sidebarOpen];

    const topNav = document.getElementById('topNav');
    const leftNavContainer = document.getElementById('leftNavContainer');
    const leftNav = document.getElementById('leftNav');
    const rightNav = document.getElementById('rightNav');
    const streamPlayerContainer = document.getElementById('streamPlayerContainer');
    const bottomTwitchContainer = document.getElementById('bottomTwitchContainer');
    const bottomContainer = document.getElementById('bottomContainer');
    const loginContainer = document.getElementById('loginContainer');

    if (loginContainer && loginContainer.style.display !== 'none') {
      const marginTop = window.innerHeight / 2 - loginContainer.offsetHeight / 2 + 'px';
      const marginLeft = window.innerWidth / 2 - loginContainer.offsetWidth / 2 + 'px';
      loginContainer.style.marginTop = marginTop;
      loginContainer.style.marginLeft = marginLeft;

      return;
    }

    if (topNav && leftNavContainer && rightNav && streamPlayerContainer) {
      const topNavEndPosition = topNav.getBoundingClientRect().bottom;
      const leftNavContainerExpandedWidth = 24 * parseFloat(getComputedStyle(leftNavContainer).fontSize); // 24rem
      const leftNavContainerAutoCollapseWidth = 170;
      const leftNavContainerCollapsedWidth = '54px';

      if (isLeftNavOpen === 0) {
        leftNavContainer.style.width = leftNavContainerCollapsedWidth;
        showHideStreamViewers('hidden');
        setCheckboxOpacity(0.5);
      } else if (leftNavContainerPercentWidth <= leftNavContainerAutoCollapseWidth) {
        leftNavOpen = 0;
        setCheckboxOpacity(0.5);
        leftNavContainer.style.width = leftNavContainerCollapsedWidth;

        if (leftNavContainerPercentWidth <= leftNavContainerAutoCollapseWidth) {
          const leftNavExpandCollapse = document.querySelector(".leftNavToggle");
          leftNavExpandCollapse.style.display = 'none';
          leftNav.style.height = leftNavContainer.getBoundingClientRect().height - 11 + 'px';
          leftNav.style.borderTopLeftRadius = '12px';
          leftNav.style.borderTopRightRadius = '12px';
          rightNav.style.display = 'none';
          bottomContainer.style.width = window.innerWidth - 54 - 10 - 10 - 10 - 10;

          updateChatSize();

          const chatIframe = document.querySelector('.chatIframe');

          if (chatIframe) {
            bottomContainer.style.width = chatIframe.style.width;
          }

          showHideStreamViewers('hidden');
        }
      } else {
        leftNavOpen = 1;
        leftNav.style.height = '';
        leftNav.style.borderTopLeftRadius = '0px';
        leftNav.style.borderTopRightRadius = '0px';
        bottomContainer.style.display = 'none';
        setCheckboxOpacity(1);
        showHideStreamViewers('visible');
        leftNavContainer.style.width = '24rem';

        if (leftNavContainerPercentWidth > leftNavContainerAutoCollapseWidth) {
          const leftNavExpandCollapse = document.querySelector(".leftNavToggle");
          leftNavExpandCollapse.style.display = 'flex';
        }
      }

      if (!isFirstRun) {
        if (isSidebarOpen === 0 || leftNavContainerPercentWidth <= leftNavContainerAutoCollapseWidth) {
          sidebarOpen = 0;
        } else {
          sidebarOpen = 1;

          try {
            if (rightNav) {
              const wasAutoCollapsed = globalPreviousWindowWidth > leftNavContainerAutoCollapseWidth;
              const isAutoCollapsed = window.innerWidth <= leftNavContainerAutoCollapseWidth;
              if (globalPreviousWindowWidth !== window.innerWidth && (wasAutoCollapsed !== isAutoCollapsed)) {
                rightNav.style.display = 'block';
              }
            }
          } catch (error) {
            console.error('Error:', error);
          }
        }
      }

      bottomTwitchContainer.style.display = leftNavContainerPercentWidth <= leftNavContainerAutoCollapseWidth ? 'block' : 'none';
    }

    isFirstRun = false;

  } catch (error) {
    console.error('Error:', error);
  }

}

async function updateLeftNav() {
  try {
    await getFollowedLiveStreams(accessToken, userId);
    await getYouTubeLiveBroadcasts(apiKey);

    sortStreamsByViewers();

    updateLeftNavUi();

  } catch (error) {
    console.error('Error updating leftNav data:', error);
  }
}

function calculateStreamHeightAndWidth() {

  const leftNavContainer = document.getElementById('leftNavContainer');

  // Calculate the maximum width for a single stream based on the percentage of window.innerWidth
  const sidebarPercentageWidth = 0.18; // 18%
  const leftNavPxWidth = 24 * parseFloat(getComputedStyle(leftNavContainer).fontSize); // 24rem
  const maxSidebarPxWidth = 321;

  const navContainer = document.querySelector('.navContainer');

  let maxSingleStreamWidth = window.innerWidth - leftNavPxWidth - 10 - maxSidebarPxWidth - 10 - 20;

  if (leftNavOpen === 0 && sidebarOpen === 0) {
    maxSingleStreamWidth = window.innerWidth - 54 - 10 - 10 - 20;
  } else if (leftNavOpen === 1 && sidebarOpen === 0) {
    maxSingleStreamWidth = window.innerWidth - navContainer.getBoundingClientRect().width - 20;
  } else if (leftNavOpen === 0 && sidebarOpen === 1) {
    const availableWidth = window.innerWidth * (1 - sidebarPercentageWidth);
    maxSingleStreamWidth = Math.min(availableWidth - 54 - 10 - 10 - 20, window.innerWidth - maxSidebarPxWidth - 54 - 10 - 10 - 20);
  }

  // Calculate the height based on the aspect ratio
  const aspectRatioWidth = 1320;
  const aspectRatioHeight = 742.5;
  const height = (maxSingleStreamWidth / aspectRatioWidth) * aspectRatioHeight;

  return [maxSingleStreamWidth, height];

}

function updateStreamLayout() {
  const streamers = Array.from(selectedStreams);
  streamers.forEach(streamer => {
    positionStreamPlayer(streamer);
  });
}

function positionStreamPlayer(username) {
  const gridContainer = document.querySelector('.grid-stack');
  const playerDiv = document.querySelector(`#twitch-player-${username}`);
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

// Function to fetch the list of followed live streams using Twitch API
async function getFollowedLiveStreams(accessToken, userId) {
  if (userId === undefined) {
    // Handle the undefined case if needed
    return;
  }

  const updatedStreams = [];

  try {
    const response = await fetchData(`${apiBaseUrl}/streams/followed?user_id=${userId}`); // Use backticks here
    const liveStreams = response.data;

    const { usersMap, gamesMap } = await fetchUserAndGameData(liveStreams);

    const leftNav = document.getElementById('leftNav');

    for (let i = 0; i < liveStreams.length; i++) {

      const stream = liveStreams[i];
      const user = usersMap.get(stream.user_id);
      const game = gamesMap.get(stream.game_id);

      let gameName = 'Just Chatting';

      try {
        gameName = game.name;
      } catch (error) {
        console.error('Error fetching game name:', error);
      }

      const existingStream = leftNavData.find(item => item.streamerLogin === stream.user_login);

      if (!existingStream) {
        const streamDOMElement = addStreamToNav(stream, user, gameName);
        leftNavData.push({
          element: streamDOMElement,
          streamerLogin: stream.user_login,
          streamTitle: stream.title,
          streamerName: user.display_name,
          gameName: gameName,
          viewerCount: stream.viewer_count,
          streamerId: stream.user_id,
          gameId: stream.game_id,
          streamType: 'twitch'
        });
      } else {
        updateStreamInNav(existingStream, stream, user, gameName);
      }

      updatedStreams.push(stream.user_login);
    }

    removeStreamsFromNav(updatedStreams);

  } catch (error) {
    console.error('Error: ', error);
  }
}

function addStreamToNav(stream, user, gameName) {
  const leftNav = document.getElementById('leftNav');
  const streamElements = createStreamerCards(stream.user_login, user.display_name, user.profile_image_url, gameName, stream.viewer_count, 'twitch');
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

  addTooltip(streamItem, tooltip, stream.title, leftNav);
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
  streamerCardLink.appendChild(streamItem);
  leftNav.appendChild(streamerCardLink);

  return streamerCardLink;
}

function updateStreamInNav(existingStream, stream, user, gameName) {
  // Logic to update existing stream details
  // For now, let's assume you want to update the viewer count and game name

  const streamElement = existingStream.element; // This assumes that each item in `leftNavData` has an associated DOM element
  const viewerElement = streamElement.querySelector('.stream-viewers');
  const gameElement = streamElement.querySelector('.game-name');

  if (viewerElement) viewerElement.textContent = `${getFormattedNumber(stream.viewer_count)}`;
  if (gameElement) gameElement.textContent = gameName;
}

function removeStreamsFromNav(updatedStreams) {
  // First, get an array of the streamerLogin values from leftNavData
  const existingStreamLogins = leftNavData
    .filter(item => item.streamerLogin) // Only get items that have a streamerLogin
    .map(item => item.streamerLogin);   // Convert to an array of streamerLogin values

  // Now, determine which streams need to be removed
  const streamsToRemoveLogins = existingStreamLogins.filter(login => !updatedStreams.includes(login));

  // Remove the related DOM elements and data for these streams
  for (let login of streamsToRemoveLogins) {
    const index = leftNavData.findIndex(item => item.streamerLogin === login);

    // Remove the data for this stream
    if (index !== -1) {
      const streamElement = leftNavData[index - 1].element;
      if (streamElement) streamElement.parentNode.removeChild(streamElement);
      leftNavData.splice(index - 1, 2); // Remove the element and its associated data
    }
  }
}

// Function to fetch top 20 live broadcasts from YouTube sorted by view count
async function getYouTubeLiveBroadcasts(apiKey) {
  try {

    fetch('/fetch_quota.php')
    .then(response => response.json())
    .then(data => {
      if (data.percentageUsed > 90) {
       return
      }
    });

    const youtubeLiveStreamsUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&order=viewCount&type=video&eventType=live&maxResults=20&relevanceLanguage=en&key=${apiKey}`;

    const liveStreamsResponse = await fetch(youtubeLiveStreamsUrl);
    const data = await liveStreamsResponse.json();
    const liveStreams = data.items;

    // Gather all video IDs and create a single comma-separated string
    const videoIds = liveStreams.map(stream => stream.id.videoId).join(',');

    // Fetch details for all videos in a single request
    const detailsResponse = await fetch(`https://www.googleapis.com/youtube/v3/videos?id=${videoIds}&part=liveStreamingDetails,snippet,statistics&key=${apiKey}`);
    const detailsData = await detailsResponse.json();

    const leftNav = document.getElementById('leftNav');

    // Iterate over details for each video and process
    for (let video of detailsData.items) {
      const matchingStream = liveStreams.find(s => s.id.videoId === video.id);
      if (!matchingStream) continue;

      const streamElements = createStreamerCards(
        matchingStream.snippet.channelTitle,
        matchingStream.snippet.channelTitle,
        matchingStream.snippet.thumbnails.medium.url,
        '',
        video.liveStreamingDetails.concurrentViewers,
        'youtube'
      );

      const streamerCardLink = streamElements.streamerCardLink;
      const tooltip = streamElements.tooltip;
      const streamerCardLeftDetails = streamElements.streamerCardLeftDetails;
      const profilePicContainerYT = createElementWithClass('div', 'profilePicContainerYT');
      const profilePic = streamElements.profilePic;
      const checkboxContainer = streamElements.checkboxContainer;
      const checkbox = streamElements.checkbox;
      const label = streamElements.label;
      const streamerName = streamElements.streamerName;
      const gameDiv = streamElements.gameDiv;
      const textView = streamElements.textView;
      const viewerCount = streamElements.viewerCount;
      const streamItem = streamElements.streamItem;

      addTooltip(streamItem, tooltip, matchingStream.snippet.title, leftNav);
      profilePicContainerYT.appendChild(checkboxContainer);
      profilePicContainerYT.appendChild(profilePic);
      streamerCardLeftDetails.appendChild(profilePicContainerYT);
      checkboxContainer.appendChild(checkbox);
      checkboxContainer.appendChild(label);
      textView.appendChild(streamerName);
      streamerCardLeftDetails.appendChild(textView);
      streamItem.appendChild(streamerCardLeftDetails);
      streamItem.appendChild(viewerCount);

      leftNavData.push({
        element: streamItem,
        viewCount: parseInt(streamItem.streamViewCount)
      });

      streamerCardLink.appendChild(streamItem);
      leftNav.appendChild(streamerCardLink);
    }

  } catch (error) {
    console.error('Error fetching YouTube live broadcasts:', error);
  }
}

function createStreamerCards(streamerUserLogin, streamerDisplayName, profilePicture, gameName, viewCount, platform) {

  const streamElements = {};

  const streamerCardLink = createElementWithClass('a', 'streamerCardLink', {
    href: `javascript:void(0);`,
    'data-streamer': streamerUserLogin
  });

  streamElements.streamerCardLink = streamerCardLink;

  // Create a single tooltip element
  const tooltip = createElementWithClass('div', 'tooltip');

  streamElements.tooltip = tooltip;


  const streamItem = createElementWithClass('div', 'streamerCard', {
    'dataset.userLogin': streamerUserLogin,
    'data-streamer': streamerUserLogin
  });

  // Store the tooltip in the tooltipsMap with the streamItem as the key
  tooltipsMap.set(streamItem, tooltip);

  const streamerCardLeftDetails = createElementWithClass('div', 'streamerCardLeftDetails', {
    'data-streamer': streamerUserLogin
  });

  streamElements.streamerCardLeftDetails = streamerCardLeftDetails;

  const profilePicContainer = createElementWithClass('div', 'profilePicContainer');

  streamElements.profilePicContainer = profilePicContainer;

  const profilePic = createElementWithClass('img', 'video-thumbnail', {
    src: profilePicture,
    'data-streamer': streamerUserLogin
  });

  streamElements.profilePic = profilePic;

  const checkboxContainer = createElementWithClass('div', 'round');

  streamElements.checkboxContainer = checkboxContainer;

  const checkbox = createElementWithClass('input', 'checkbox', {
    type: 'checkbox',
    id: `checkbox-${streamerUserLogin}`,
    'data-streamer': streamerUserLogin
  });

  streamElements.checkbox = checkbox;

  const label = createElementWithClass('label', 'checkbox-label', {
    'for': `checkbox-${streamerUserLogin}`,
    'data-streamer': streamerUserLogin
  });

  streamElements.label = label;

  const streamerName = createElementWithClass('div', 'stream-link', {
    'data-streamer': streamerUserLogin
  });
  streamerName.textContent = streamerDisplayName;

  streamElements.streamerName = streamerName;

  const gameDiv = createElementWithClass('div', 'game-name', {
    'data-streamer': streamerUserLogin
  });

  gameDiv.textContent = gameName;

  streamElements.gameDiv = gameDiv;

  const textView = createElementWithClass('div', 'text');

  streamElements.textView = textView;

  const viewerCount = createElementWithClass('span', 'stream-viewers', {
    'data-streamer': streamerUserLogin
  });

  if (platform === 'twitch') {
    viewerCount.textContent = `${getFormattedNumber(viewCount)}`;

    // Add the following line to set the streamViewCount property
    streamItem.streamViewCount = viewCount;
  }

  streamElements.viewerCount = viewerCount;

  streamElements.streamItem = streamItem;

  return streamElements;

}

// Function to handle checkbox change
function handleCheckboxChange(event, checked) {

  if (checked === undefined) {
    return;
  }

  const selectedStreamer = event.target.dataset.streamer;
  let radioButtons = document.querySelectorAll('.tab-radio');

  if (checked) {
    selectedStreams.add(selectedStreamer);
    checkboxStates[selectedStreamer] = true; // Checkbox is checked
    createOrUpdateChatTab(selectedStreamer);
    createStreamPlayer(null, selectedStreamer);
  } else {
    selectedStreams.delete(selectedStreamer);
    const playerDiv = document.querySelector(`#twitch-player-${selectedStreamer}`);
    gridStackInitialized.then(grid => {
      grid.removeWidget(playerDiv);
    });
    checkboxStates[selectedStreamer] = false; // Checkbox is not checked
    removeChatTab(selectedStreamer);
  }

  // Remove the "selected-tab" class from all labels
  document.querySelectorAll('.tab').forEach(label => {
    label.classList.remove('selected-tab');
  });

  const leftNavContainerAutoCollapseWidth = 170;

  if (leftNavContainerPercentWidth <= leftNavContainerAutoCollapseWidth) {

    updateChatSize();

  }

  // Get the selectedIndex of the clicked button
  const selectedIndex = Array.from(radioButtons).findIndex(radio => radio.id === `radio-${selectedStreamer}`);
  // Update the glider position
  updateGliderPosition(selectedIndex);

  Promise.resolve().then(() => {
    updateMargins();
    updateStreamLayout();
  });
}

function createStreamPlayer(container, username) {
  const existingStream = document.querySelector(`#twitch-player-${username}`);
  if (existingStream) {
    // If stream already exists, just reposition it
    positionStreamPlayer(username);
    return;
  }
  // Otherwise, create the stream player as before...
  const options = {
    width: '100%',
    height: '100%',
    channel: username,
    parent: ["tykrt.com"],
  };

  const playerDiv = createElementWithClass('div', 'stream-player grid-stack-item', {
    id: `twitch-player-${username}`
  });

  const handle = createElementWithClass('div', 'handle');
  handle.textContent = 'Drag/Resize Me';
  playerDiv.appendChild(handle);

  createOrUpdateChatTab(username);

  gridStackInitialized.then(grid => {
    grid.addWidget(playerDiv);
    new Twitch.Player(`twitch-player-${username}`, options);
  }).catch(error => {
    console.error(error);
  });

  // After creating the player, position it correctly
  positionStreamPlayer(username);
}

function createOrUpdateChatTab(channelName) {

  const rightNav = document.getElementById('rightNav');
  const bottomContainer = document.getElementById('bottomContainer');
  const leftNavContainerAutoCollapseWidth = 170;

  const wasAutoCollapsed = globalPreviousWindowWidth > leftNavContainerAutoCollapseWidth;
  const isAutoCollapsed = window.innerWidth <= leftNavContainerAutoCollapseWidth;

  if (globalPreviousWindowWidth !== window.innerWidth && (wasAutoCollapsed !== isAutoCollapsed)) {
    removeAllChats();
  }

  globalPreviousWindowWidth = window.innerWidth;

  if (leftNavContainerPercentWidth <= leftNavContainerAutoCollapseWidth) {
    rightNav.style.display = 'none';
    bottomContainer.style.display = 'block';
  } else {

    if (sidebarOpen == 1) {
      rightNav.style.display = 'block';
    }
    bottomContainer.style.display = 'none';
  }

  if (!chatIframes[channelName]) {
    createChatTab(channelName);
  }

  showChatTab(channelName);

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
  tabCount = tabMenu.children.length;
  const leftNavContainerAutoCollapseWidth = 170;

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

  document.getElementById('sidebarContent').style.display = 'block';

  // Create a label for the radio button
  const label = createElementWithClass('label', 'tab', {
    id: `label-${channelName}`,
    for: `radio-${channelName}`
  });
  label.textContent = channelName;

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

  const mainContent = document.getElementById('mainContent');

  // Create the chat iframe
  const chatIframe = createChatEmbed(channelName);
  chatIframe.width = '100%'; // Set the width

  // Get the height of the leftNavContainer div
  const rightNav = document.getElementById('rightNav');
  const sidebarHeight = rightNav.offsetHeight;

  // Get the height of the leftNavContainer div
  const sidebarContent = document.getElementById('sidebarContent');
  const sidebarContentHeight = sidebarContent.offsetHeight;

  const tabContainer = document.querySelector('.tabContainer');
  const tabContainerHeight = tabContainer.offsetHeight;

  const topNav = document.querySelector('.topNav');
  const topNavHeight = topNav.offsetHeight;

  const leftNavContainer = document.getElementById('leftNavContainer');

  const streamPlayerContainer = document.getElementById('streamPlayerContainer');
  const streamPlayerContainerHeight = streamPlayerContainer.offsetHeight;

  // Set the chatIframe height to match the leftNavContainer height
  chatIframe.height = (sidebarHeight - tabContainerHeight - sidebarContentHeight - 30) + 'px';

  if (leftNavContainerPercentWidth <= leftNavContainerAutoCollapseWidth) {

    const streamHeight = updateChatSize();

    chatIframe.height = (leftNavContainer.offsetHeight - streamHeight - (window.innerHeight * 0.032) - 10) - 30 + 'px';
    chatIframe.width = (window.innerWidth - 54 - 10 - 10 - 10 - 10) + 'px';
  }

  tabContent.appendChild(chatIframe);

  // Append the chat content to the twitchChats container
  twitchChats.appendChild(tabContent);

  if (leftNavContainerPercentWidth <= leftNavContainerAutoCollapseWidth) {
    bottomTwitchContainer.appendChild(twitchChats);
    bottomTwitchContainer.style.display = 'block';

  } else {
    bottomTwitchContainer.style.display = 'none';
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

function createChatEmbed(channelName) {
  // Create and configure the chat iframe
  const chatIframe = createElementWithClass('iframe', 'chat-iframe', {
    id: `chat-iframe-${channelName}`,
    src: `https://www.twitch.tv/embed/${channelName}/chat?darkpopout&parent=tykrt.com`,
    frameborder: '0',
    scrolling: 'no',
    allowfullscreen: 'true'
  });

  return chatIframe;
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

function updateChatSize() {

  const [maxSingleStreamWidth, height] = calculateStreamHeightAndWidth();

  const radioButtons = document.querySelectorAll('.tab-radio');
  const radioLength = Array.from(radioButtons).length

  let streamHeight = height

  if (radioLength === 2) {
    streamHeight = height / 2
  } else if (radioLength === 3) {
    streamHeight = (height / 2 + height)
  } else if (radioLength === 4) {
    streamHeight = height
  }

  const elements = document.querySelectorAll('.chat-iframe');

  elements.forEach(element => {

    element.style.height = (leftNavContainer.offsetHeight - streamHeight - (window.innerHeight * 0.032) - 10) - 30 + 'px';

  });

  return streamHeight

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

  tabCount = 0; // Reset tab count
}

// Function to remove a chat tab
function removeChatTab(channelName) {
  // Get the radio button, label, glider span and chat tab content
  const radioInput = document.getElementById(`radio-${channelName}`);
  const label = document.getElementById(`label-${channelName}`);
  const tabContent = chatIframes[channelName];

  // Remove them from the DOM
  if (radioInput && label && tabContent) {
    radioInput.parentNode.removeChild(radioInput);
    label.parentNode.removeChild(label);
    tabContent.parentNode.removeChild(tabContent);

    // Remove the chat iframe from the chatIframes object
    delete chatIframes[channelName];

    // Decrement the tab count when a tab is removed
    tabCount--;

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
      document.getElementById('sidebarContent').style.display = 'none';
      const rightNav = document.getElementById('rightNav');
      rightNav.style.display = 'none';
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
  const tabWidth = document.querySelector('.tabs').offsetWidth / tabs;
  const bottomTabWidth = document.querySelector('.bottomTabs').offsetWidth / tabs;

  const glider = document.querySelector('.glider');
  const bottomGlider = document.querySelector('.bottomGlider');

  let selectedLabel; // Declare the variable outside the if block
  let count = 0;

  const leftNavContainerAutoCollapseWidth = 170;

  const tabMenu = document.querySelector('.tabContainer');
  const bottomTabMenu = document.querySelector('.bottomTabContainer');

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
      const gliderWidth = leftNavContainerPercentWidth <= leftNavContainerAutoCollapseWidth ? bottomTabWidth : tabWidth;

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
        gliderElement.style.width = `${gliderWidth}px`;
      }
    }
  });
}

// Function to add and configure a tooltip for a stream item
function addTooltip(streamItem, tooltip, streamTitle, leftNav) {
  // Append the tooltip to the body
  document.body.appendChild(tooltip);

  // Attach event listeners to show/hide tooltips
  streamItem.addEventListener('mouseover', function (event) {
    const streamItemRect = streamItem.getBoundingClientRect();

    const x = streamItemRect.right + 15; // Place the tooltip 15px to the right of the streamer card
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
}

function clearTooltips() {
  // Remove existing tooltips from the DOM
  for (const tooltip of tooltips) {
    tooltip.remove();
  }

  // Clear the tooltips array
  tooltips.length = 0;
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

function sortStreamsByViewers() {
  // Sort the leftNavData in place
  leftNavData.sort((a, b) => {
    return b.viewCount - a.viewCount;
  });

  // Render the sorted result to DOM
  renderToDOM();
}

function updateLeftNavUi() {
  const visibility = leftNavOpen === 0 ? 'hidden' : 'visible';
  const opacity = leftNavOpen === 0 ? 0.5 : 1;

  showHideStreamViewers(visibility);
  setCheckboxOpacity(opacity);
}

function showHideStreamViewers(visibility) {
  const spans = document.querySelectorAll('.stream-viewers');

  for (const span of spans) {
    span.style.visibility = visibility;
  }
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

async function fetchData(url) {
  try {
    const headers = {
      'Authorization': 'Bearer ' + accessToken,
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

const avatar = document.getElementById('avatarProfPic');
const dropdownMenu = document.querySelector('.avatarDropdownMenu');

// Add a click event listener to the avatar
avatar.addEventListener('click', function () {
  // Toggle the "show" class on the dropdown menu
  dropdownMenu.classList.toggle('show');
});
// Close the dropdown if the user clicks outside of it
window.addEventListener('click', function (event) {
  if (!event.target.matches('.avatarDropdown')) {
    const dropdowns = document.querySelectorAll(' .avatarDropdownMenu');
    dropdowns.forEach(function (dropdown) {
      if (dropdown.classList.contains('show')) {
        dropdown.classList.remove('show');
      }
    });
  }
});

jQuery(function ($) {

  $('.leftNavToggle').click(function (e) {

    const leftNavContainer = document.getElementById('leftNavContainer');

    if ($('#leftNavContainer').hasClass('collapsed')) {
      $('#leftNavContainer').removeClass('collapsed');
      leftNavContainer.style.width = leftNavContainerPercentWidth + 'rem';
      // Rotate the leftNavToggleArrow to face left
      $('.leftNavToggleArrow').css('transform', 'rotate(90deg)');

      const btnElement = document.querySelector('.leftNavToggle');
      const arrowElement = btnElement.querySelector('.leftNavToggleArrow');

      arrowElement.style.animation = 'bounce 2s infinite';

      leftNavOpen = 1;

      Promise.resolve().then(() => {
        updateMargins();
        updateStreamLayout();
      });

    } else {
      $('#leftNavContainer').toggleClass('collapsed');
      leftNavContainer.style.width = 54 + 'px';
      // Rotate the leftNavToggleArrow to face right
      $('.leftNavToggleArrow').css('transform', 'rotate(-90deg)');

      const btnElement = document.querySelector('.leftNavToggle');
      const arrowElement = btnElement.querySelector('.leftNavToggleArrow');

      arrowElement.style.animation = 'bounceRight 2s infinite';

      leftNavOpen = 0;

      Promise.resolve().then(() => {
        updateMargins();
        updateStreamLayout();
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

  $("#closeRightNav").click(function () {
    $("#rightNav").addClass("slideOut");
    $("#showRightNav").addClass("slideIn");
    $("#avatarProfPic").addClass("moveLeft")

    const rightNav = document.getElementById('rightNav');

    setTimeout(() => {
      rightNav.style.right = '-330px';
      rightNav.style.position = 'absolute';
    }, 302); // Adjust the duration to match your animation duration



    sidebarOpen = 0;

    Promise.resolve().then(() => {
      updateMargins();
      updateStreamLayout();
    });

  });
  $("#showRightNav").click(function () {
    $("#rightNav").removeClass("slideOut");
    $("#showRightNav").removeClass("slideIn");
    $("#avatarProfPic").removeClass("moveLeft")

    const rightNav = document.getElementById('rightNav');
    rightNav.style.right = '';
    rightNav.style.position = '';

    sidebarOpen = 1;

    Promise.resolve().then(() => {
      updateMargins();
      updateStreamLayout();
    });

  });
});