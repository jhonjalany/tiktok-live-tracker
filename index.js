const express = require('express');
const { WebcastPushConnection } = require('./dist/index'); // or 'tiktok-live-connector'
const axios = require('axios');

// Set up Express App
const app = express();
const PORT = process.env.PORT || 3000;

// Health check route
app.get('/', (req, res) => {
  res.send('TikTok Live Tracker is running!');
});

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Start HTTP server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
});

// ====== YOUR TIKTOK LOGIC BELOW ======
const tiktokUsername = 'respawnandride'; // Replace with your TikTok username
const n8nWebhookUrl = 'https://n8n-app-gn6h.onrender.com/webhook/livetracker';     // Replace with your actual webhook URL

const tiktokLive = new WebcastPushConnection(tiktokUsername);

// In-memory storage for recent interactions
let viewerStats = {};

// Utility to construct TikTok profile URL
const getProfileLink = (uniqueId) => `https://www.tiktok.com/@${uniqueId}`; 

// Function to send data with retries
async function sendDataToN8n(dataToSend) {
  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const response = await axios.post(n8nWebhookUrl, dataToSend, {
        timeout: 10000, // 10 seconds timeout
      });

      if (response.status >= 200 && response.status < 300) {
        console.log('Successfully sent data to n8n:', response.status);
        return true;
      }
    } catch (error) {
      console.error(`Attempt ${attempt + 1} failed to send data to n8n:`, error.message);
      attempt++;
      if (attempt < maxRetries) {
        console.log(`Retrying in 3 seconds...`);
        await new Promise(res => setTimeout(res, 3000));
      }
    }
  }

  console.error('Failed to send data to n8n after multiple attempts.');
  return false;
}

// Interval to print + clear every 5 seconds
setInterval(async () => {
  const output = {};

  for (const [userId, data] of Object.entries(viewerStats)) {
    output[userId] = {
      userID: userId,
      username: data.username,
      profileLink: data.profileLink,
      profilePictureUrl: data.profilePictureUrl,
      totalLikesCountInPast5Seconds: data.likes,
      totalCoinOrGiftCountInPast5Seconds: data.coins
    };
  }

  // Don't send if there's no data
  if (Object.keys(output).length === 0) {
    console.log("No data to send this interval.");
    return;
  }

  console.log("Sending data:", JSON.stringify(output, null, 2));

  await sendDataToN8n(output);

  // Clear stats only after successful send
  viewerStats = {};
}, 5000);

// Connect to the live stream
tiktokLive.connect().then(() => {
  console.log('Connected to TikTok live room!');
}).catch(err => {
  console.error('Connection failed:', err);
});

// Handle like events
tiktokLive.on('like', (data) => {
  const userId = data.userId.toString();
  const uniqueId = data.uniqueId;

  if (!viewerStats[userId]) {
    viewerStats[userId] = {
      userID: userId,
      username: uniqueId,
      profileLink: getProfileLink(uniqueId),
      profilePictureUrl: data.profilePictureUrl || '',
      likes: 0,
      coins: 0
    };
  }

  viewerStats[userId].likes += data.likeCount;
});

// Handle gift events
tiktokLive.on('gift', (data) => {
  const userId = data.userId.toString();
  const uniqueId = data.uniqueId;

  if (!viewerStats[userId]) {
    viewerStats[userId] = {
      userID: userId,
      username: uniqueId,
      profileLink: getProfileLink(uniqueId),
      profilePictureUrl: data.profilePictureUrl || '',
      likes: 0,
      coins: 0
    };
  }

  const giftCoins = data.diamondCount * (data.repeatCount || 1);
  viewerStats[userId].coins += giftCoins;
});
