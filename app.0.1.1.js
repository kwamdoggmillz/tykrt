// Twitch API configuration
const clientId = 'clzeuervlptjtp304d1ulqxbdb633z';
const redirectUri = 'https://tykrt.com/callback.html';
const API_BASE_URL = 'https://api.twitch.tv/helix';
const apiKey = 'AIzaSyCxRdb7Bhr0z9-iSTf_OpRTTAMk2ChMqsc';
const scope = 'user:read:follows';
let accessToken = null;
let userId = null;
let initialized = false;
let isFirstRun = true;
let leftNavData = []; // add this line to keep all streams data together before they are available
const selectedStreams = new Set();
const checkboxStates = {};
const chatIframes = {};
const tooltipsMap = new Map();
const maxStreamsSelected = 4; // Set the maximum number of streams that can be selected
let tabCount = 0;
let sidebarOpen = 1;
let leftNavOpen = 1;
let previousWindowWidth = window.innerWidth;

// Function to handle Twitch login button click
function login() {
  const authUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=token&scope=${scope}`;
  window.location.href = authUrl;
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
  const url = `${API_BASE_URL}/users?id=${userId}`;
  return await fetchData(url);
}

async function fetchGameData(gameId) {
  const url = `${API_BASE_URL}/games?id=${gameId}`;
  return await fetchData(url);
}

// Function to fetch user and game data for live streams
async function fetchUserAndGameDataPromises(liveStreams) {
  const usersMap = new Map();
  const gamesMap = new Map();

  const fetchUserAndGameDataPromises = liveStreams.map(async (stream) => {
    const [userData, gameData] = await Promise.all([
      fetchStreamData(stream.user_id),
      fetchGameData(stream.game_id)
    ]);

    usersMap.set(stream.user_id, userData.data[0]);
    gamesMap.set(stream.game_id, gameData.data[0]);
  });

  await Promise.all(fetchUserAndGameDataPromises);

  return { usersMap, gamesMap };
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

// Function to add and configure a tooltip for a stream item
function addTooltip(streamItem, tooltip, streamTitle, leftNav) {
  const streamPlayerContainer = document.getElementById('streamPlayerContainer');
  streamPlayerContainer.appendChild(tooltip);

  // Attach event listeners to show/hide tooltips
  streamItem.addEventListener('mouseover', function (event) {
    const streamItemRect = streamItem.getBoundingClientRect();
    const leftNavRect = leftNav.getBoundingClientRect();

    const x = leftNavRect.right + 15; // Adjust the X position as needed
    const y = streamItemRect.top; // Adjust the Y position as needed

    // Set the tooltip's position
    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;
    tooltip.style.height = `${streamItemRect.height - 15}px`;

    // Set the tooltip content
    tooltip.textContent = streamTitle;

    tooltip.style.display = 'block'; // Show the tooltip on mouseover
  });

  streamItem.addEventListener('mouseout', function () {
    tooltip.style.display = 'none'; // Hide the tooltip on mouseout
  });
}

// Function to fetch the list of followed live streams using Twitch API
async function getFollowedLiveStreams(accessToken, userId) {
  if (userId === undefined) {
    // Handle the undefined case if needed
    return;
  }

  leftNavData = []; // Reset the array before fetching new data

  try {
    const response = await fetchData(`${API_BASE_URL}/streams/followed?user_id=${userId}`); // Use backticks here
    const liveStreams = response.data;

    const { usersMap, gamesMap } = await fetchUserAndGameDataPromises(liveStreams);

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

      removeTooltip();
      addTooltip(streamItem, tooltip, stream.title, leftNav);

      profilePicContainer.appendChild(checkboxContainer);
      profilePicContainer.appendChild(profilePic);
      streamerCardLeftDetails.appendChild(profilePicContainer);

      checkboxContainer.appendChild(checkbox);
      checkboxContainer.appendChild(label);

      streamItem.addEventListener('click', function (event) {
        if (event.target.tagName !== 'LABEL') {

          if (event.target.tagName !== 'INPUT') {
            // If the clicked element is not the checkbox itself, toggle the checkbox's checked state
            checkbox.checked = !checkbox.checked;
          }

          // Trigger the change event manually to ensure other logic related to checkbox change is executed
          handleCheckboxChange(event, checkbox.checked);
          updateLeftNav();
        }
      });

      textView.appendChild(streamerName);
      textView.appendChild(gameDiv);

      streamerCardLeftDetails.appendChild(textView);
      streamItem.appendChild(streamerCardLeftDetails);

      streamItem.appendChild(viewerCount);

      // Push the stream item to the global array with viewer count
      leftNavData.push({
        element: streamItem,
        viewCount: parseInt(stream.viewer_count) // Push stream to array
      });

      streamerCardLink.appendChild(streamItem);

      leftNav.appendChild(streamerCardLink);

    }

    try {
      getYouTubeLiveBroadcasts(apiKey);
      sortStreamsByViewers();
    } catch (error) {
      console.error('YouTube API error:', error);
    }
  } catch (error) {
    console.error('Error: ', error);
  }
}

// Function to fetch top 20 live broadcasts from YouTube sorted by view count
function getYouTubeLiveBroadcasts(apiKey) {

  const youtubeLiveStreamsUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&order=viewCount&type=video&eventType=live&maxResults=20&key=${apiKey}`;

  fetch(youtubeLiveStreamsUrl)
    .then(response => {
      if (!response.ok) throw new Error(response.status);
      return response.json();
    })
    .then(data => {
      const liveStreams = data.items;

      liveStreams.forEach((stream) => {
        fetch(`https://www.googleapis.com/youtube/v3/videos?id=${stream.id.videoId}&part=liveStreamingDetails,snippet,statistics&key=${apiKey}`)
          .then(response => response.json())
          .then(videoData => {
            const video = videoData.items[0];

            const streamElements = createStreamerCards(stream.snippet.channelTitle, stream.snippet.channelTitle, stream.snippet.thumbnails.medium.url, '', video.liveStreamingDetails.concurrentViewers, 'youtube');
            const streamerCardLink = createElementWithClass('a', 'video-link', {
              href: `https://www.youtube.com/watch?v=${stream.id.videoId}`,
              'data-streamer': stream.snippet.channelTitle
            });
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

            const leftNav = document.getElementById('leftNav');
            removeTooltip();
            addTooltip(streamItem, tooltip, stream.snippet.title, leftNav);

            profilePicContainerYT.appendChild(checkboxContainer);
            profilePicContainerYT.appendChild(profilePic);
            streamerCardLeftDetails.appendChild(profilePicContainerYT);

            try {
              if (video.liveStreamingDetails && video.liveStreamingDetails.concurrentViewers) {
                viewerCount.textContent = `${getFormattedNumber(video.liveStreamingDetails.concurrentViewers)}`;
                streamItem.streamViewCount = video.liveStreamingDetails.concurrentViewers;
              }
              else {
                viewerCount.textContent = ' - Viewer count unavailable';
                streamItem.streamViewCount = 0;
              }
            } catch (error) {
              console.error('Error fetching YouTube live broadcasts:', error);
            }

            textView.appendChild(streamerName);
            /*textView.appendChild(gameDiv);*/

            streamerCardLeftDetails.appendChild(textView);
            streamItem.appendChild(streamerCardLeftDetails);

            streamItem.appendChild(viewerCount);

            leftNavData.push({
              element: streamItem,
              viewCount: parseInt(streamItem.streamViewCount) // Push stream to array
            });

            streamerCardLink.appendChild(streamItem);

            leftNav.appendChild(streamerCardLink);

          })
          .catch(error => {
            // Catch error and display message to user
            console.error('Error fetching YouTube live broadcasts:', error);
          })
      });
    })
    .catch(error => {
      console.error('Youtube API error:', error);
    });
}

function createStreamPlayer(container, username, width, height) {
  const options = {
    width: width,
    height: height,
    channel: username, // Embed for the clicked streamer
    parent: ["tykrt.com"],
  };

  // Create and embed the Twitch player
  const playerDiv = createElementWithClass('div', 'stream-player', {
    id: `twitch-player-${username}`
  });
  container.appendChild(playerDiv);

  createOrUpdateChatTab(username); // Use the updated function to create or update the chat tab

  new Twitch.Player(`twitch-player-${username}`, options);
}

// Function to create or update a chat tab
function createOrUpdateChatTab(channelName) {

  const leftNavContainerPercentWidth = 0.14 * window.innerWidth;
  const sidebar = document.getElementById('sidebar');

  if (leftNavContainerPercentWidth <= 170) {
    sidebar.style.display = 'none';
  }
  else {
    sidebar.style.display = 'block';
  }

  // Check if the chat tab already exists
  if (!chatIframes[channelName]) {
    // Create a new tab and chat iframe if it doesn't exist
    createChatTab(channelName);
  }

  // Show the chat tab and hide others
  showChatTab(channelName);

  // Find the radio button with id="channelname"
  const radioInput = document.querySelector(`input#radio-${channelName}`);

  if (radioInput && chatIframes[channelName]) {
    // Get all the radio buttons
    const radioButtons = document.querySelectorAll('.tab-radio');

    // Find the index of the radio button with id="channelname" among the radio buttons
    const selectedIndex = Array.from(radioButtons).indexOf(radioInput);

    updateGliderPosition(selectedIndex);

  }
}

// Function to create a chat tab
function createChatTab(channelName) {
  const tabMenu = document.getElementById('tabMenu');
  const twitchChats = document.getElementById('twitchChats');
  tabCount = tabMenu.children.length;

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

  // Append the radio button and label to the tab menu
  tabMenu.appendChild(radioInput);
  tabMenu.appendChild(label);

  // Create the chat content container
  const tabContent = createElementWithClass('div', 'tab-content');
  tabContent.id = `content-${channelName}`;

  // Create the chat iframe
  const chatIframe = createChatEmbed(channelName);
  chatIframe.width = '100%'; // Set the width

  // Get the height of the leftNavContainer div
  const sidebar = document.getElementById('sidebar');
  const sidebarHeight = sidebar.offsetHeight;

  // Get the height of the leftNavContainer div
  const sidebarContent = document.getElementById('sidebarContent');
  const sidebarContentHeight = sidebarContent.offsetHeight;

  const tabContainer = document.querySelector('.tabContainer');
  const tabContainerHeight = tabContainer.offsetHeight;

  const topNav = document.querySelector('.topNav');
  const topNavHeight = topNav.offsetHeight;

  const leftNavContainer = document.getElementById('leftNavContainer');

  const streamPlayerContainer = document.getElementById('streamPlayerContainer');

  // Set the chatIframe height to match the leftNavContainer height
  chatIframe.height = (sidebarHeight - tabContainerHeight - sidebarContentHeight - 10) + 'px';

  tabContent.appendChild(chatIframe);

  // Append the chat content to the twitchChats container
  twitchChats.appendChild(tabContent);

  const leftNavContainerPercentWidth = 0.14 * window.innerWidth;
  const bottomTwitchContainer = document.getElementById('bottomTwitchContainer');

  if (leftNavContainerPercentWidth <= 170) {
    bottomTwitchContainer.appendChild(twitchChats);

    bottomTwitchContainer.style.marginTop = streamPlayerContainer.offsetHeight + topNav.offsetHeight + 'px';
    bottomTwitchContainer.style.marginLeft = leftNavContainer.offsetWidth + 'px';
    bottomTwitchContainer.style.marginRight = '0px';

  } else {
    bottomTwitchContainer.style.display = 'none';
  }

  // Store the chat iframe in the chatIframes object
  chatIframes[channelName] = tabContent;

  // Attach an event listener to the radio button to show the chat tab
  radioInput.addEventListener('change', () => showChatTab(channelName));

  // Initially show the chat tab
  showChatTab(channelName);

  radioInput.addEventListener('change', () => {
    radioButtons = document.querySelectorAll('.tab-radio');
    const selectedIndex = Array.from(radioButtons).indexOf(radioInput);
    updateGliderPosition(selectedIndex);
  });

  // You can now access the updated tab count using the `tabCount` variable
  console.log(`Number of tabs: ${tabCount + 1}`);
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

    if (count === 0) {
      document.getElementById('sidebarContent').style.display = 'none';
      const sidebar = document.getElementById('sidebar');
      sidebar.style.display = 'none';
    }

    // You can now access the updated tab count using the `tabCount` variable
    console.log(`Number of tabs: ${tabCount}`);
  }
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

function updateGliderPosition(index) {
  const tabs = document.querySelectorAll('.tab-radio').length;
  const tabWidth = document.querySelector('.tabs').offsetWidth / tabs;
  const glider = document.querySelector('.glider');
  glider.style.transform = `translateX(${tabWidth * index}px)`;

  let selectedLabel; // Declare the variable outside the if block
  let count = 0;

  const tabMenu = document.querySelector('.tabContainer');
  let labelPosition = 0
  let gliderPosition = {
    left: 0,
    width: 0
  }

  const tabMenuChildren = Array.from(document.querySelectorAll('.tab-radio'));
  tabMenuChildren.forEach((tabRadio, tabIndex) => {
    count++;
    // Perform actions on each tab here
    const tab = document.querySelectorAll('.tab')[count - 1];
    if (tab && tab.tagName === 'LABEL') {
      const label = tab;
      let fontSize = 90 // Initial font size percentage
      let minFontSize = 50 // Minimum font size percentage

      // Check if the tab's content overflows
      while ((tab.scrollWidth > tab.clientWidth) && (fontSize > minFontSize)) {
        fontSize -= 5; // Reduce the font size by 5%
        tab.style.fontSize = `${fontSize}%`;
      }

      // Check if the tab's content overflows
      if (tab.scrollWidth < tab.clientWidth) {
        tab.style.fontSize = "80%"; // Set the original font size
      }

      if (tabIndex === index) {
        // Add the "selected-tab" class to the label of the selected radio button
        label.style.color = '#A0ADCD';
        selectedLabel = label; // Store the selected label
        labelPosition = selectedLabel.getBoundingClientRect();

        gliderPosition = {
          left: labelPosition.width * index,
          width: labelPosition.width
        }
      } else {
        label.style.color = 'white';
      }
    }
    glider.style.transform = `translateX(${gliderPosition.left}px)`;

    if (tabs === 1) {
      glider.style.width = 0;
    } else {
      glider.style.width = `${gliderPosition.width}px`;
    }

  });
}


// Initially, set the glider's position based on the checked radio button
const checkedRadio = document.querySelector('input[type="radio"]:checked');
if (checkedRadio) {
  const selectedIndex = Array.from(radioButtons).indexOf(checkedRadio);
  updateGliderPosition(selectedIndex);
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
  } else {
    selectedStreams.delete(selectedStreamer);
    checkboxStates[selectedStreamer] = false; // Checkbox is not checked
    removeChatTab(selectedStreamer);
  }

  // Remove the "selected-tab" class from all labels
  document.querySelectorAll('.tab').forEach(label => {
    label.classList.remove('selected-tab');
  });

  updateStreamLayout();

  // Get the selectedIndex of the clicked button
  const selectedIndex = Array.from(radioButtons).findIndex(radio => radio.id === `radio-${selectedStreamer}`);
  // Update the glider position
  updateGliderPosition(selectedIndex);

  updateMargins()
}

function calculateNavOpenState() {

  const leftNavContainerPercentWidth = 0.14 * window.innerWidth;

  if (leftNavContainerPercentWidth <= 170) {
    return [0, 0];
  } else {
    return [leftNavOpen, sidebarOpen];
  }
}

function updateStreamLayout() {

  let [isLeftNavOpen, isSidebarOpen] = [leftNavOpen, sidebarOpen];

  // Get all the child elements of the streamPlayerContainer
  const children = Array.from(streamPlayerContainer.children);

  // Loop through the child elements
  for (const child of children) {
    // Check if the child element is a tooltip
    if (!child.classList.contains('tooltip')) {
      // If it's not a tooltip, remove it
      streamPlayerContainer.removeChild(child);
    }
  }

  const selectedStreamersArray = Array.from(selectedStreams);

  if (selectedStreamersArray.length === 0) {
    return;
  }

  // Filter out undefined items from the array
  const filteredStreamersArray = selectedStreamersArray.filter(item => item !== undefined);

  const numSelectedStreams = filteredStreamersArray.length;

  // Calculate the maximum width for a single stream based on the percentage of window.innerWidth
  const sidebarPercentageWidth = 0.18; // 18%
  const leftNavPxWidth = 24 * parseFloat(getComputedStyle(leftNavContainer).fontSize); // 24rem
  const maxSidebarPxWidth = 321;

  let maxSingleStreamWidth = window.innerWidth - leftNavPxWidth - 10 - maxSidebarPxWidth - 10 - 20;

  if (isLeftNavOpen === 0 && isSidebarOpen === 0) {
    maxSingleStreamWidth = window.innerWidth - 54 - 10 - 10 - 20;
  } else if (isLeftNavOpen === 1 && isSidebarOpen === 0) {
    maxSingleStreamWidth = window.innerWidth - leftNavPxWidth - 10 - 10 - 20;

  } else if (isLeftNavOpen === 0 && isSidebarOpen === 1) {
    maxSingleStreamWidth = (window.innerWidth * (1 - sidebarPercentageWidth)) - 54 - 10 - 10 - 20;

    if (sidebarPercentageWidth * window.innerWidth > maxSidebarPxWidth) {
      maxSingleStreamWidth = window.innerWidth - maxSidebarPxWidth - 54 - 10 - 10 - 20;
    }
  }

  // Calculate the height based on the aspect ratio
  const aspectRatioWidth = 1320;
  const aspectRatioHeight = 742.5;
  const height = (maxSingleStreamWidth / aspectRatioWidth) * aspectRatioHeight;

  for (let i = 0; i < numSelectedStreams; i++) {
    const username = selectedStreamersArray[i];

    if (numSelectedStreams === 1) {
      // Create stream player with maxSingleStreamWidth and calculated height
      createStreamPlayer(streamPlayerContainer, username, maxSingleStreamWidth + 'px', height + 'px');
    } else if (i === filteredStreamersArray.length - 1 && numSelectedStreams % 2 === 1) {
      createStreamPlayer(streamPlayerContainer, username, maxSingleStreamWidth + 'px', height + 'px');
    } else {
      createStreamPlayer(streamPlayerContainer, username, (maxSingleStreamWidth / 2) + 'px', (height / 2) + 'px');
    }
  }

  const streamPlayers = document.getElementsByClassName("stream-player");

  for (let i = 0; i < streamPlayers.length; i++) {
    const streamPlayer = streamPlayers[i];

    if (numSelectedStreams === 1) {

      streamPlayer.style.height = height + 'px';
    } else if (i === filteredStreamersArray.length - 1 && numSelectedStreams % 2 === 1) {
      streamPlayer.style.height = height + 'px';
    } else {
      streamPlayer.style.height = (height / 2) + 'px';
    }
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

// New function to render the sorted streams into the DOM
function renderToDOM() {
  const streamsContainer = document.getElementById('leftNav');

  // Clear all child elements first
  while (streamsContainer.firstChild) {
    streamsContainer.firstChild.remove();
  }

  // Append sorted stream elements to the list
  leftNavData.forEach(streamData => {
    streamsContainer.appendChild(streamData.element);
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
      return (cleanedNumber / 1e6).toFixed(1) + 'M';
    }
    if (cleanedNumber >= 1e3) {
      return (cleanedNumber / 1e3).toFixed(1) + 'K';
    }
    return cleanedNumber;
  } catch (error) {
    console.error('Error occurred during number formatting:', error);
    // Handle the error appropriately, e.g., show an error message or return a default value.
    return '0';
  }
}

// Function to initialize the application
async function init() {
  try {

    if (tabCount === 0) {
      document.getElementById('sidebarContent').style.display = 'none';
    } else {
      document.getElementById('sidebarContent').style.display = 'block';
    }

    accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
      // Redirect the user to login if accessToken is not available
      const loginBtn = document.getElementById('loginBtn');
      loginBtn.addEventListener('click', login);
      return;
    }

    userId = await testAccessToken(accessToken); // Test the access token

    if (document.getElementById('sign-in-container').style.display == ! 'none') {

      document.getElementById('sign-in-container').style.display = 'none';

      const leftNavContainer = document.getElementById('leftNavContainer');
      leftNavContainer.style.display = 'block';

      const topNav = document.getElementById('topNav');
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

// Function to test the access token by retrieving user information
async function testAccessToken(accessToken) {
  try {
    const response = await fetch("https://api.twitch.tv/helix/users", {
      headers: {
        Authorization: "Bearer " + accessToken,
        "Client-ID": clientId, // Replace with your Twitch API client ID
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

function removeTooltip() {
  try {

    // Iterate through the tooltipsMap and hide each tooltip
    for (const tooltip of tooltipsMap.values()) {
      tooltip.style.display = 'none'; // or remove it from the DOM: tooltip.remove();
    }

  } catch (error) { }
}

async function updateLeftNav() {
  try {

    leftNavData = []; // Reset the array before fetching new data

    await getFollowedLiveStreams(accessToken, userId);

    sortStreamsByViewers();

    renderToDOM();

    restoreCheckboxStates();

  } catch (error) {
    console.error('Error updating sidebar data:', error);
  }
}

// Function to update the UI based on window size
function updateWindowSize() {
  const currentWindowWidth = window.innerWidth;

  // Check if the window size has increased and leftNav is closed
  if (currentWindowWidth > previousWindowWidth && leftNavOpen === 0) {
    leftNavOpen = 1;
  }

  if (currentWindowWidth > previousWindowWidth && sidebarOpen === 0) {
    sidebarOpen = 1;
  }

  // Update the previous window width
  previousWindowWidth = currentWindowWidth;
}

function updateMargins() {

  let [isLeftNavOpen, isSidebarOpen] = [leftNavOpen, sidebarOpen];

  try {
    const topNav = document.querySelector('.topNav');
    const leftNavContainer = document.getElementById('leftNavContainer');
    const sidebar = document.getElementById('sidebar');
    const content = document.getElementById('streamPlayerContainer');

    if (topNav) {

      const topNavEndPosition = topNav.getBoundingClientRect().bottom;
      const sidebarEndPosition = sidebar.getBoundingClientRect().left;
      const leftNavContainerPercentWidth = 0.14 * window.innerWidth;
      const leftNavContainerWidth = 24 * parseFloat(getComputedStyle(leftNavContainer).fontSize); // 24rem

      if (leftNavContainer) {

        const spans = document.querySelectorAll('.stream-viewers');

        leftNavContainer.style.top = `${topNavEndPosition + 13}px`;

        if (isLeftNavOpen === 0) {

          leftNavContainer.style.width = '54px';

          for (const span of spans) {
            span.style.visibility = 'hidden';
          }

        } else if (leftNavContainerPercentWidth <= 170) {

          leftNavOpen = 0;

          leftNavContainer.style.width = '54px';

          if (leftNavContainerPercentWidth <= 170) {
            const leftNavExpandCollapse = document.querySelector(".btn-expand-collapse");
            leftNavExpandCollapse.style.display = 'none';

            sidebar.style.display = 'none';

            for (const span of spans) {
              span.style.visibility = 'hidden';
            }

          }

        } else {
          leftNavOpen = 1;

          const spans = document.querySelectorAll('.stream-viewers');
          for (const span of spans) {
            span.style.visibility = 'visible';
          }

          leftNavContainer.style.width = '24rem';

          if (leftNavContainerPercentWidth > 170) {
            const leftNavExpandCollapse = document.querySelector(".btn-expand-collapse");
            leftNavExpandCollapse.style.display = 'flex';
          }
        }

      }
      if (sidebar) {
        sidebar.style.top = `${topNavEndPosition + 13}px`;
      }
      if (content) {
        content.style.marginTop = `${topNavEndPosition + 13}px`;

        if (leftNavContainerPercentWidth <= 170 || isLeftNavOpen === 0) {
          content.style.marginLeft = '54px';
        } else {
          content.style.marginLeft = `${leftNavContainerWidth}px`;
        }

        if (!isFirstRun) {

          updateStreamLayout();

          if (isSidebarOpen === 0 || leftNavContainerPercentWidth <= 170) {
            sidebarOpen = 0;
            content.style.marginRight = 0;
          } else {
            sidebarOpen = 1;

            try{
            if (sidebar) {
              if (sidebar.style.display == ! 'none') {
                content.style.marginRight = `${sidebar.clientWidth}px`;
              }
            }
          } catch (error) {
            console.error('Error:', error);
          }
          }
        }

        const topNav = document.querySelector('.topNav');

        const leftNavContainer = document.getElementById('leftNavContainer');

        const streamPlayerContainer = document.getElementById('streamPlayerContainer');

        const bottomTwitchContainer = document.getElementById('bottomTwitchContainer');

        if (leftNavContainerPercentWidth <= 170) {
          bottomTwitchContainer.style.marginTop = streamPlayerContainer.offsetHeight + topNav.offsetHeight + 'px';
          bottomTwitchContainer.style.marginLeft = leftNavContainer.offsetWidth + 'px';
          bottomTwitchContainer.style.marginRight = '0px';

        } else {
          bottomTwitchContainer.style.display = 'none';
        }
      }
    }

    isFirstRun = false;

  } catch (error) {
    console.error('Error:', error);
  }

}

document.addEventListener('DOMContentLoaded', function () {
  const btnElement = document.querySelector('.btn-expand-collapse');
  const arrowElement = btnElement.querySelector('.arrow');
  const leftNavContainer = document.getElementById('leftNavContainer');
  const leftNavContainerPercentWidth = 0.14 * window.innerWidth;

  btnElement.addEventListener('mouseenter', () => {
    if (leftNavContainer.classList.contains('collapsed')) {
      arrowElement.style.animation = 'bounceRight 2s infinite';
    } else {
      arrowElement.style.animation = 'bounce 2s infinite';
    }
  });

  btnElement.addEventListener('mouseleave', () => {
    // Reset the animation when the mouse leaves the element if needed
    arrowElement.style.animation = 'none';
  });

  window.addEventListener('resize', handleResize);
  window.addEventListener('load', updateMargins);
});

function handleResize() {
  updateWindowSize();
  updateMargins();
}

function restoreCheckboxStates() {
  const checkboxes = document.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach(checkbox => {
    const streamer = checkbox.dataset.streamer;
    checkbox.checked = checkboxStates[streamer] || false;
  });
}

// Add event listeners to menu items to toggle active class
const menuItems = document.querySelectorAll('.menu__item');
menuItems.forEach((menuItem) => {
  menuItem.addEventListener('click', () => {
    // Remove active class from all menu items
    menuItems.forEach((item) => item.classList.remove('active'));

    // Add active class to the clicked menu item
    menuItem.classList.add('active');
  });
});

window.onload = function () {
  // First, Initialize your app by calling init
  init().then(() => {
    // Then, make sure accessToken and userId are set before using them
    if (accessToken && userId) {
      // Delay the first execution of the function by the interval time
      setTimeout(() => {
        updateLeftNav(); // Initial execution
        // Set up the interval for updating sidebar data
        setInterval(updateLeftNav, 30000); // Regular interval
      }, 30000); // Initial delay, same as interval time
    }
  });
}

// Call the init function on page load
window.addEventListener('load', init);

jQuery(function ($) {

  $('.btn-expand-collapse').click(function (e) {
    console.log('Button clicked');

    const leftNavContainer = document.getElementById('leftNavContainer');
    const leftNavContainerPercentWidth = 24;

    if ($('#leftNavContainer').hasClass('collapsed')) {
      $('#leftNavContainer').removeClass('collapsed');
      leftNavContainer.style.width = leftNavContainerPercentWidth + 'rem';
      // Rotate the arrow to face left
      $('.arrow').css('transform', 'rotate(90deg)');

      const btnElement = document.querySelector('.btn-expand-collapse');
      const arrowElement = btnElement.querySelector('.arrow');

      arrowElement.style.animation = 'bounce 2s infinite';

      leftNavOpen = 1;

      updateMargins();
      updateStreamLayout();

    } else {
      $('#leftNavContainer').toggleClass('collapsed');
      leftNavContainer.style.width = 54 + 'px';
      // Rotate the arrow to face right
      $('.arrow').css('transform', 'rotate(-90deg)');

      const btnElement = document.querySelector('.btn-expand-collapse');
      const arrowElement = btnElement.querySelector('.arrow');

      arrowElement.style.animation = 'bounceRight 2s infinite';

      leftNavOpen = 0;

      updateMargins();
      updateStreamLayout();

    }
  });

  $(".sidebar-dropdown > a").click(function () {
    $(".sidebar-submenu").slideUp(200);
    if (
      $(this)
        .parent()
        .hasClass("active")
    ) {
      $(".sidebar-dropdown").removeClass("active");
      $(this)
        .parent()
        .removeClass("active");
    } else {
      $(".sidebar-dropdown").removeClass("active");
      $(this)
        .next(".sidebar-submenu")
        .slideDown(200);
      $(this)
        .parent()
        .addClass("active");
    }
  });

  $("#close-sidebar").click(function () {
    $(".page-wrapper").removeClass("toggled");

    sidebarOpen = 0;

    updateMargins();
    updateStreamLayout();

  });
  $("#show-sidebar").click(function () {
    $(".page-wrapper").addClass("toggled");

    sidebarOpen = 1;

    updateMargins();
    updateStreamLayout();

  });
});