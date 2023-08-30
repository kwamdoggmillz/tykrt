// Twitch API configuration
const clientId = 'clzeuervlptjtp304d1ulqxbdb633z';
const redirectUri = 'https://tykrt.com/callback.html';
const apiKey = 'AIzaSyCxRdb7Bhr0z9-iSTf_OpRTTAMk2ChMqsc';
const scope = 'user:read:follows';
let userDataCount = 0;
let allStreamsData = []; // add this line to keep all streams data together before they are available
let streamItems = [];
let accessToken = null;
let userId = null;
let playerContainer = '';

// Function to handle Twitch login button click
function login() {
  const authUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=token&scope=${scope}`;
  window.location.href = authUrl;
}

// Function to handle Twitch logout button click
function logout() {
  localStorage.removeItem('accessToken');
  document.getElementById('loginContainer').style.display = 'block';
  document.getElementById('allStreams').innerHTML = '';
}

/*
function embedTwitchPlayer(username) {
  // clear the playerContainer
  const playerContainer = document.getElementById('playerContainer');
  while (playerContainer.firstChild) {
    playerContainer.removeChild(playerContainer.firstChild);
  }

  // Add the parent div for the Twitch player to the stream element.
  const playerDiv = document.createElement('div');
  playerDiv.id = `twitch-player-${username}`;
  playerContainer.appendChild(playerDiv);

  // Options for the Twitch embed
  var options = {
    width: 620, // put your needed width value here
    height: 378, // put your needed height value here
    channel: username,
    parent: ["tykrt.com"],
  };

  // Create and embed the Twitch player
  new Twitch.Player(`twitch-player-${username}`, options);

}
*/

// Function to fetch the list of followed live streams using Twitch API
function getFollowedLiveStreams(accessToken, userId) {
  if (userId === undefined) {
    // Handle the undefined case if needed
    return;
  }

  fetch(`https://api.twitch.tv/helix/streams/followed?user_id=${userId}`, {
    headers: {
      'Authorization': 'Bearer ' + accessToken,
      'Client-Id': clientId,
    }
  })
    .then(response => response.json())
    .then(data => {
      const liveStreams = data.data;
      const usersMap = new Map(); // Map to store user data
      const gamesMap = new Map(); // Map to store game data

      const fetchUserAndGameDataPromises = liveStreams.map((stream) => {
        // Fetch user data
        const fetchUserData = fetch(`https://api.twitch.tv/helix/users?id=${stream.user_id}`, {
          headers: {
            'Authorization': 'Bearer ' + accessToken,
            'Client-Id': clientId,
          }
        })
          .then(response => response.json())
          .then(userData => {
            const user = userData.data[0];
            usersMap.set(stream.user_id, user); // Store user data with stream ID as the key
          });

        // Fetch game data
        const fetchGameData = fetch(`https://api.twitch.tv/helix/games?id=${stream.game_id}`, {
          headers: {
            'Authorization': 'Bearer ' + accessToken,
            'Client-Id': clientId,
          }
        })
          .then(response => response.json())
          .then(gameData => {
            const game = gameData.data[0];
            gamesMap.set(stream.game_id, game); // Store game data with game ID as the key 
          });

        return Promise.all([fetchUserData, fetchGameData]);
      });

      // Wait for all fetch calls to complete
      Promise.all(fetchUserAndGameDataPromises)
        .then(() => {
          const allStreams = document.getElementById('allStreams');
          for (let i = 0; i < liveStreams.length; i++) {
            const stream = liveStreams[i];
            const user = usersMap.get(stream.user_id);
            const game = gamesMap.get(stream.game_id);

            const streamLink = document.createElement('a');
            streamLink.href = `javascript:void(0);`;  //this makes link inactive
            streamLink.dataset.streamer = `${stream.user_login}`;
            const userLogin = stream.user_login; // Store the user_login value
            streamLink.dataset.streamer = userLogin;

            const streamItem = document.createElement('div');
            const left = document.createElement('div');
            left.className = 'left';

            streamItem.className = 'stream-item';
            streamItem.dataset.userLogin = stream.user_login;
            const profilePic = document.createElement('img'); // New Line
            profilePic.src = user.profile_image_url; // New Line
            profilePic.className = 'video-thumbnail';
            left.appendChild(profilePic); // New Line
            const imageUrl = user.profile_image_url;
            const streamerName = document.createElement('div');
            //streamLink.href = `https://www.twitch.tv/${stream.user_login}`;
            streamerName.textContent = user.display_name
            //streamLink.title = stream.title;
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

            left.appendChild(textView);
            streamItem.appendChild(left);
            streamItem.appendChild(viewerCount);

            // Push the stream item to the global array with viewer count
            allStreamsData.push({
              element: streamItem,
              viewCount: parseInt(stream.viewer_count) // Push stream to array
            });

            streamLink.appendChild(streamItem);
            allStreams.appendChild(streamLink);

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

              // Clear the playerContainer
              const playerContainer = document.getElementById('playerContainer');
              while (playerContainer.firstChild) {
                playerContainer.removeChild(playerContainer.firstChild);
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
                playerContainer.appendChild(playerDiv);

                new Twitch.Player(`twitch-player-${username}`, options);
              });
            }

            // Inside your loop for creating stream items
            streamLink.addEventListener('click', function () {
              // Toggle the checkbox's checked state
              const checkbox = document.getElementById(`checkbox-${stream.user_login}`);
              checkbox.checked = !checkbox.checked;

              // Call the handleCheckboxChange function with the username
              handleCheckboxChange({ target: checkbox }, stream.user_login);
            });
            */

            document.getElementById('allStreams').addEventListener('click', function (event) {

              const target = event.target;
              const streamItem = target.closest('.stream-item'); // Find the closest ancestor with class 'stream-item'

              if (streamItem) {
                const userLogin = streamItem.dataset.userLogin;
                if (userLogin) {
                  const playerContainer = document.getElementById('playerContainer');
                  const currentPlayerUserLogin = playerContainer.dataset.userLogin;

                  if (currentPlayerUserLogin === userLogin) {
                    // Player for the same streamer is already embedded, do nothing
                    return;
                  }

                  // Remove existing player
                  while (playerContainer.firstChild) {
                    playerContainer.removeChild(playerContainer.firstChild);
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
                  playerContainer.appendChild(playerDiv);

                  new Twitch.Player(`twitch-player-${userLogin}`, options);

                  // Update the playerContainer's userLogin attribute
                  playerContainer.dataset.userLogin = userLogin;
                }
              }
            });

            // Add the following line to set the streamViewCount property
            streamItem.streamViewCount = stream.viewer_count;
            //streamsContainer.appendChild(streamItem);
          }
          try {
            getYouTubeLiveBroadcasts(apiKey);
          } catch (error) {
            console.error('YouTube API error:', error);
            sortStreamsByViewers();
          }
        })
        .catch(error => {
          console.error('Error:', error);
        });
    })
    .catch(error => {
      console.error('Error:', error);
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
      // const streamsContainer = document.getElementById('allStreams'); // no need of this line

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
            const streamLink = document.createElement('a');
            streamLink.href = `https://www.youtube.com/watch?v=${stream.id.videoId}`;
            streamLink.textContent = stream.snippet.channelTitle; // This will set the text content as the channel/streamer's name
            streamLink.title = stream.snippet.title;
            streamLink.className = 'video-link';

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


            streamItem.appendChild(streamLink);

            streamItem.appendChild(viewerCount);
            //streamsContainer.appendChild(streamItem);
            allStreamsData.push({
              element: streamItem,
              viewCount: parseInt(streamItem.streamViewCount) // Push stream to array
            });
          })
          .catch(error => {
            // Catch error and display message to user
            console.error('Error fetching YouTube live broadcasts:', error);
            sortStreamsByViewers(); // Sort the streams after adding YouTube streams
          })
          .finally(() => {
            sortStreamsByViewers(); // Sort the streams here
          });
      });
    })
    .catch(error => {
      console.error('Youtube API error:', error);
    });
}

function sortStreamsByViewers() {
  // Sort the allStreamsData in place
  allStreamsData.sort((a, b) => {
    return b.viewCount - a.viewCount;
  });

  // Render the sorted result to DOM
  renderToDOM();
}

// New function to render the sorted streams into the DOM
function renderToDOM() {
  const streamsContainer = document.getElementById('allStreams');

  // Clear all child elements first
  while (streamsContainer.firstChild) {
    streamsContainer.firstChild.remove();
  }

  // Append sorted stream elements to the list
  allStreamsData.forEach(streamData => {
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

  if (accessToken) {
    document.getElementById('loginContainer').style.display = 'none';
    document.getElementById('logoutBtn').style.display = 'block';
  }
  else {
    try {
      accessToken = localStorage.getItem('accessToken');
    } catch (error) {

    }
  }

  if (accessToken) {

    userId = await testAccessToken(accessToken); // Test the access token
    document.getElementById('loginContainer').style.display = 'none';
    document.getElementById('logoutBtn').style.display = 'block';

  } else {
    const loginBtn = document.getElementById('loginBtn');
    loginBtn.addEventListener('click', login);
  }

  const logoutBtn = document.getElementById('logoutBtn');
  logoutBtn.addEventListener('click', logout);
}


window.onload = function () {
  // First, Initialize your app by calling init
  init().then(() => {
    // Then, make sure accessToken and userId are set before using them
    if (accessToken && userId) {
      setTimeout(function () {
        getFollowedLiveStreams(accessToken, userId);
      }, 1000); // give a delay of 1 second (adjust as needed)
    }
  });
}


// Call the init function on page load
window.addEventListener('load', init);

// Call the init function when the DOM content is loaded
//document.addEventListener('DOMContentLoaded', init);
