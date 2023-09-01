// Twitch API configuration
const clientId = 'clzeuervlptjtp304d1ulqxbdb633z';
const redirectUri = 'https://tykrt.com/callback.html';
const apiKey = 'AIzaSyCxRdb7Bhr0z9-iSTf_OpRTTAMk2ChMqsc';
const scope = 'user:read:follows';
let initialized = false;
let leftNavData = []; // add this line to keep all streams data together before they are available
let accessToken = null;
let userId = null;
let streamPlayerContainer = '';
const API_BASE_URL = 'https://api.twitch.tv/helix';

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

    const usersMap = new Map(); // Map to store user data
    const gamesMap = new Map(); // Map to store game data

    const fetchUserAndGameDataPromises = liveStreams.map(async (stream) => {
      const [userData, gameData] = await Promise.all([
        fetchStreamData(stream.user_id),
        fetchGameData(stream.game_id)
      ]);

      usersMap.set(stream.user_id, userData.data[0]); // Store user data with stream ID as the key
      gamesMap.set(stream.game_id, gameData.data[0]); // Store game data with game ID as the key
    });

    await Promise.all(fetchUserAndGameDataPromises);

    const leftNav = document.getElementById('leftNav');

    for (let i = 0; i < liveStreams.length; i++) {

      const stream = liveStreams[i];
      const user = usersMap.get(stream.user_id);
      const game = gamesMap.get(stream.game_id);

      const streamerCardLink = document.createElement('a');
      streamerCardLink.href = `javascript:void(0);`;  //this makes link inactive
      streamerCardLink.dataset.streamer = `${stream.user_login}`;

      const userLogin = stream.user_login; // Store the user_login value

      streamerCardLink.dataset.streamer = userLogin;

      const streamItem = document.createElement('div');

      const streamerCardLeftDetails = document.createElement('div');
      streamerCardLeftDetails.className = 'streamerCardLeftDetails';

      streamItem.className = 'streamerCard';
      streamItem.dataset.userLogin = stream.user_login;

      const profilePicContainer = document.createElement('div');
      profilePicContainer.className = 'profilePicContainer';

      const profilePic = document.createElement('img');
      profilePic.src = user.profile_image_url;
      profilePic.className = 'video-thumbnail';

      profilePicContainer.appendChild(profilePic);
      streamerCardLeftDetails.appendChild(profilePicContainer);

      const imageUrl = user.profile_image_url;

      const streamerName = document.createElement('div');
      streamerName.textContent = user.display_name

      const gameDiv = document.createElement('div');
      gameDiv.textContent = game.name;
      gameDiv.className = 'game-name';

      streamerName.className = 'stream-link';

      const textView = document.createElement('div');
      textView.className = 'text';

      const viewerCount = document.createElement('span');
      viewerCount.textContent = `${getFormattedNumber(stream.viewer_count)}`;
      viewerCount.className = 'stream-viewers';

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

      /* for checkbox
      // Track selected streams
      const selectedStreams = new Set();
  
      // Function to handle checkbox change
      function handleCheckboxChange(event, streamUsername) {
        if (event.target.checked) {
          selectedStreams.add(streamUsername);
        } else {
          selectedStreams.delete(streamUsername);
        }
  
        // Clear the streamPlayerContainer
        const streamPlayerContainer = document.getElementById('streamPlayerContainer');
        while (streamPlayerContainer.firstChild) {
          streamPlayerContainer.removeChild(streamPlayerContainer.firstChild);
        }
  
        // Embed players for selected streams
        selectedStreams.forEach(username => {
          const options = {
            width: 620,
            height: 378,
            channel: username,
            parent: ["tykrt.com"],
          };
  
          const playerDiv = document.createElement('div');
          playerDiv.id = `twitch-player-${username}`;
          streamPlayerContainer.appendChild(playerDiv);
  
          new Twitch.Player(`twitch-player-${username}`, options);
        });
      }
  
      // Inside your loop for creating stream items
      streamerCardLink.addEventListener('click', function () {
        // Toggle the checkbox's checked state
        const checkbox = document.getElementById(`checkbox-${stream.user_login}`);
        checkbox.checked = !checkbox.checked;
  
        // Call the handleCheckboxChange function with the username
        handleCheckboxChange({ target: checkbox }, stream.user_login);
      });
      */

      getStreamPlayer(streamItem);

      // Add the following line to set the streamViewCount property
      streamItem.streamViewCount = stream.viewer_count;
      //streamsContainer.appendChild(streamItem);
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
        const playerDiv = document.createElement('div');
        playerDiv.id = `twitch-player-${userLogin}`;
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
            const streamItem = document.createElement('div');
            streamItem.className = 'video-item';
            const thumbnailUrl = stream.snippet.thumbnails.medium.url;
            const thumbnailElement = document.createElement('img');
            thumbnailElement.src = thumbnailUrl;
            thumbnailElement.className = 'video-thumbnail';
            streamItem.appendChild(thumbnailElement);
            const streamerCardLink = document.createElement('a');
            streamerCardLink.href = `https://www.youtube.com/watch?v=${stream.id.videoId}`;
            streamerCardLink.textContent = stream.snippet.channelTitle; // This will set the text content as the channel/streamer's name
            streamerCardLink.title = stream.snippet.title;
            streamerCardLink.className = 'video-link';

            const viewerCount = document.createElement('span');
            viewerCount.className = 'video-viewers';
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
            //streamsContainer.appendChild(streamItem);
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

  } catch (error) {
    console.error('Error updating sidebar data:', error);
  }
}

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