// Twitch API configuration
const clientId = 'clzeuervlptjtp304d1ulqxbdb633z';
const redirectUri = 'https://tykrt.com/callback.html';
const API_BASE_URL = 'https://api.twitch.tv/helix';
const apiKey = 'AIzaSyCxRdb7Bhr0z9-iSTf_OpRTTAMk2ChMqsc';
const scope = 'user:read:follows';
let accessToken = null;
let userId = null;
let initialized = false;
let leftNavData = []; // add this line to keep all streams data together before they are available
const selectedStreams = new Set();
const checkboxStates = {};
const maxStreamsPerRow = 2;
const chatIframes = {};
let tabCount = 0;

// Function to handle Twitch login button click
function login() {
  const authUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=token&scope=${scope}`;
  window.location.href = authUrl;
}

// Function to handle Twitch logout button click
function logout() {
  localStorage.removeItem('accessToken');
  document.getElementById('loginContainer').style.display = 'block';
  document.getElementById('leftNav').innerHTML = '';
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

// Function to attach event listeners to checkboxes and stream-item divs
function attachEventListeners(streamItem, checkbox) {

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

      const streamerCardLink = createElementWithClass('a', 'streamerCardLink', {
        href: `javascript:void(0);`,
        'data-streamer': stream.user_login
      });

      const streamItem = createElementWithClass('div', 'streamerCard', {
        'dataset.userLogin': stream.user_login
      });

      const streamerCardLeftDetails = createElementWithClass('div', 'streamerCardLeftDetails');

      const profilePicContainer = createElementWithClass('div', 'profilePicContainer');

      const profilePic = createElementWithClass('img', 'video-thumbnail', {
        src: user.profile_image_url
      })

      const checkboxContainer = createElementWithClass('div', 'round');

      const checkbox = createElementWithClass('input', 'checkbox', {
        type: 'checkbox',
        id: `checkbox-${stream.user_login}`,
        'data-streamer': stream.user_login
      })

      const label = createElementWithClass('label', 'checkbox-label', {
        'for': `checkbox-${stream.user_login}`
      })

      profilePicContainer.appendChild(checkboxContainer);
      profilePicContainer.appendChild(profilePic);
      streamerCardLeftDetails.appendChild(profilePicContainer);

      checkboxContainer.appendChild(checkbox);
      checkboxContainer.appendChild(label);

      checkbox.addEventListener('change', function () {
        handleCheckboxChange(event, checkbox);
      });

      streamItem.addEventListener('click', function (event) {
        if (event.target.tagName !== 'INPUT') {
          // If the clicked element is not the checkbox itself, toggle the checkbox's checked state
          checkbox.checked = !checkbox.checked;

          // Trigger the change event manually to ensure other logic related to checkbox change is executed
          const changeEvent = new Event('change');
          checkbox.dispatchEvent(changeEvent);

          event.stopPropagation(); // Prevent the click from propagating to the parent elements
        }
      });

      //attachEventListeners(checkbox, streamItem);

      const streamerName = createElementWithClass('div', 'stream-link')
      streamerName.textContent = user.display_name;

      const gameDiv = createElementWithClass('div', 'game-name')
      gameDiv.textContent = game.name;

      const textView = createElementWithClass('div', 'text');

      const viewerCount = createElementWithClass('span', 'stream-viewers')
      viewerCount.textContent = `${getFormattedNumber(stream.viewer_count)}`;

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

      getStreamPlayer(streamItem);

      // Add the following line to set the streamViewCount property
      streamItem.streamViewCount = stream.viewer_count;
    }

    try {
      getYouTubeLiveBroadcasts(apiKey);
    } catch (error) {
      console.error('YouTube API error:', error);
    }
  } catch (error) {
    console.error('Error: ', error);
  }
}

const radioButtons = document.querySelectorAll('input[type="radio"]');
const glider = document.querySelector('.glider');

radioButtons.forEach((radio, index) => {
  radio.addEventListener('change', (event) => {
    const selectedTab = event.target.id; // Get the ID of the selected tab
    // Update styles or perform other actions based on the selectedTab
    // You can use CSS classes to apply styles.
    updateGliderPosition(index);
  });
});

function updateGliderPosition(index) {
  const tabWidth = 200; // Width of each tab
  glider.style.transform = `translateX(${index * tabWidth}px)`;
}

// Initially, set the glider's position based on the checked radio button
const checkedRadio = document.querySelector('input[type="radio"]:checked');
if (checkedRadio) {
  const selectedIndex = Array.from(radioButtons).indexOf(checkedRadio);
  updateGliderPosition(selectedIndex);
}

function createChatEmbed(channelName) {
  // Create and configure the chat iframe
  const chatIframe = document.createElement('iframe');
  chatIframe.id = `chat-iframe-${channelName}`;
  chatIframe.src = `https://www.twitch.tv/embed/${channelName}/chat?darkpopout&parent=tykrt.com`;
  chatIframe.frameborder = '0';
  chatIframe.scrolling = 'no';
  chatIframe.allowfullscreen = 'true';

  return chatIframe;
}

// Function to handle checkbox change
function handleCheckboxChange(event) {
  const selectedStreamer = event.target.dataset.streamer;

  if (event.target.checked) {
    selectedStreams.add(selectedStreamer);
    checkboxStates[selectedStreamer] = true; // Checkbox is checked
    createOrUpdateChatTab(selectedStreamer);
  } else {
    selectedStreams.delete(selectedStreamer);
    checkboxStates[selectedStreamer] = false; // Checkbox is not checked
    removeChatTab(selectedStreamer);
  }

  updateStreamLayout();
}

// Function to create or update a chat tab
function createOrUpdateChatTab(channelName) {
  // Check if the chat tab already exists
  if (!chatIframes[channelName]) {
    // Create a new tab and chat iframe if it doesn't exist
    createChatTab(channelName);
  }

  // Show the chat tab and hide others
  showChatTab(channelName);
}

// Function to remove a chat tab
function removeChatTab(channelName) {
// Get the radio button, label, glider span and chat tab content
const radioInput = document.getElementById(`radio-${channelName}`);
const label = document.getElementById(`label-${channelName}`);
const gliderSpan = document.getElementById(`glider-${channelName}`);
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

    // You can now access the updated tab count using the `tabCount` variable
    console.log(`Number of tabs: ${tabCount}`);
  }

  if (gliderSpan) {
    gliderSpan.parentNode.removeChild(gliderSpan);
  } 

}


function updateStreamLayout() {
  const streamPlayerContainer = document.getElementById('streamPlayerContainer');
  streamPlayerContainer.innerHTML = ''; // Clear the container

  const selectedStreamersArray = Array.from(selectedStreams);
  const numSelectedStreams = selectedStreamersArray.length;

  // Calculate the width based on the number of selected streams
  let width = '100%'; // Default to full width
  let height = 751.5; // Default to full height

  if (numSelectedStreams > 1) {
    // If more than 1 stream is selected, use smaller height
    height = 375.75;
  }

  for (let i = 0; i < numSelectedStreams; i++) {
    const username = selectedStreamersArray[i];
    createStreamPlayer(streamPlayerContainer, username, width, height);
    // Call the function to create and embed Twitch chat

  }

  // Attach the event listener to checkboxes after the layout is updated
  attachCheckboxListeners();
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

// Function to create a chat tab
function createChatTab(channelName) {
  const tabMenu = document.getElementById('tabMenu');
  const twitchChats = document.getElementById('twitchChats');
  const tabCount = tabMenu.children.length;

  // Create an input radio button
  const radioInput = document.createElement('input');
  radioInput.type = 'radio';
  radioInput.id = `radio-${channelName}`;
  radioInput.name = 'tabs';
  if (tabCount === 0) {
    radioInput.checked = true;
  }

  // Create a label for the radio button
  const label = document.createElement('label');
  label.className = 'tab';
  label.id = `label-${channelName}`;
  label.htmlFor = `radio-${channelName}`;
  label.textContent = channelName;

  // Create a span for notification (you can add your notification logic here)
  const gliderSpan = createElementWithClass('span', 'glider');
  gliderSpan.id = `glider-${channelName}`;

  // Append the radio button and label to the tab menu
  tabMenu.appendChild(radioInput);
  tabMenu.appendChild(label);

  // Create the chat content container
  const tabContent = createElementWithClass('div', 'tab-content');
  tabContent.id = `content-${channelName}`;

  // Create the chat iframe
  const chatIframe = createChatEmbed(channelName);
  chatIframe.width = '300'; // Set the width
  chatIframe.height = '730'; // Set the height
  tabContent.appendChild(chatIframe);

  // Append the chat content to the twitchChats container
  twitchChats.appendChild(tabContent);

  // Store the chat iframe in the chatIframes object
  chatIframes[channelName] = tabContent;

  // Attach an event listener to the radio button to show the chat tab
  radioInput.addEventListener('change', () => showChatTab(channelName));

  // Initially show the chat tab
  showChatTab(channelName);

  // You can now access the updated tab count using the `tabCount` variable
  console.log(`Number of tabs: ${tabCount + 1}`);
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


// After loading the page, attach the event listener to checkboxes
function attachCheckboxListeners() {
  const checkboxes = document.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach(checkbox => {
    checkbox.addEventListener('change', handleCheckboxChange);
  });
}

// Call the attachCheckboxListeners() function after your page has loaded
document.addEventListener('DOMContentLoaded', attachCheckboxListeners);

function getStreamPlayer(streamItem) {

  document.getElementById('leftNav').addEventListener('click', function (event) {

    const target = event.target;
    const streamItem = target.closest('.streamerCard'); // Find the closest ancestor with class 'streamerCard'

    if (streamItem) {
      const userLogin = streamItem.dataset.userLogin;
      if (userLogin) {
        const streamPlayerContainer = document.getElementById('streamPlayerContainer');
        const currentPlayerUserLogin = streamPlayerContainer.dataset.userLogin;

        if (currentPlayerUserLogin === userLogin) {
          // Player for the same streamer is already embedded, do nothing
          return;
        }

        // Remove existing player
        while (streamPlayerContainer.firstChild) {
          streamPlayerContainer.removeChild(streamPlayerContainer.firstChild);
        }
        // Options for the Twitch embed
        const options = {
          width: 1336,
          height: 751.5,
          channel: userLogin, // Embed for the clicked streamer
          parent: ["tykrt.com"],
        };

        // Create and embed the Twitch player
        const playerDiv = createElementWithClass('div', 'stream-player', {
          id: `twitch-player-${userLogin}`
        });
        streamPlayerContainer.appendChild(playerDiv);

        new Twitch.Player(`twitch-player-${userLogin}`, options);

        // Update the streamPlayerContainer's userLogin attribute
        streamPlayerContainer.dataset.userLogin = userLogin;
      }
    }
  });
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

// Function to fetch top 20 live broadcasts from YouTube sorted by view count
function getYouTubeLiveBroadcasts(apiKey) {

  const youtubeLiveStreamsUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&order=viewCount&type=video&eventType=live&maxResults=20&key=${apiKey}`;

  fetch(youtubeLiveStreamsUrl)
  then(response => {
    if (!response.ok) throw new Error(response.status);
    return response.json();
  })
    .then(data => {
      const liveStreams = data.items;
      // const streamsContainer = document.getElementById('leftNav'); // no need of this line

      liveStreams.forEach((stream) => {
        fetch(`https://www.googleapis.com/youtube/v3/videos?id=${stream.id.videoId}&part=liveStreamingDetails,snippet,statistics&key=${apiKey}`)
          .then(response => response.json())
          .then(videoData => {
            const video = videoData.items[0];

            const streamItem = createElementWithClass('div', 'video-item');

            const thumbnailUrl = stream.snippet.thumbnails.medium.url;
            const thumbnailElement = document.createElement('img');
            thumbnailElement.src = thumbnailUrl;
            thumbnailElement.className = 'video-thumbnail';

            streamItem.appendChild(thumbnailElement);

            const streamerCardLink = createElementWithClass('a', 'video-link', {
              href: `https://www.youtube.com/watch?v=${stream.id.videoId}`,
              title: stream.snippet.title
            });
            streamerCardLink.textContent = stream.snippet.channelTitle;

            const viewerCount = createElementWithClass('span', 'video-viewers');

            if (video.liveStreamingDetails && video.liveStreamingDetails.concurrentViewers) {
              viewerCount.textContent = `${getFormattedNumber(video.liveStreamingDetails.concurrentViewers)}`;
              streamItem.streamViewCount = video.liveStreamingDetails.concurrentViewers;
            }
            else {
              viewerCount.textContent = ' - Viewer count unavailable';
              streamItem.streamViewCount = 0;
            }

            streamItem.appendChild(streamerCardLink);
            streamItem.appendChild(viewerCount);

            leftNavData.push({
              element: streamItem,
              viewCount: parseInt(streamItem.streamViewCount) // Push stream to array
            });
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
    accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
      // Redirect the user to login if accessToken is not available
      const loginBtn = document.getElementById('loginBtn');
      loginBtn.addEventListener('click', login);
      return;
    }

    userId = await testAccessToken(accessToken); // Test the access token
    document.getElementById('loginContainer').style.display = 'none';
    document.getElementById('logoutBtn').style.display = 'block';

    if (!initialized) {
      updateLeftNav();
      initialized = true;
    }

  } catch (error) {
    console.error('Error during initialization:', error);
  }
}

async function updateLeftNav() {
  try {

    leftNavData = []; // Reset the array before fetching new data

    await getFollowedLiveStreams(accessToken, userId);

    sortStreamsByViewers();

    restoreCheckboxStates();

  } catch (error) {
    console.error('Error updating sidebar data:', error);
  }
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
