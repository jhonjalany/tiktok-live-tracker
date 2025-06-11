const { WebcastPushConnection } = require('./dist/index'); // From tiktok-live-connector
const axios = require('axios');
const express = require('express'); // ✅ Correct import
const app = express();              // ✅ Create Express app

// Configuration
const tiktokUsername = 'jhonjalany'; // Replace with your username
const n8nWebhookUrl = 'https://n8n-app-gn6h.onrender.com/webhook/livetracker'; 

// In-memory storage for recent interactions
let viewerStats = {};

// Utility to construct TikTok profile URL
const getProfileLink = (uniqueId) => `https://www.tiktok.com/@${uniqueId}`; 

// Interval to print + clear every 5 seconds
setInterval(async () => {
    console.clear();

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

    console.log(JSON.stringify(output, null, 2));

    // Send to n8n webhook
    try {
        const response = await axios.post(n8nWebhookUrl, output);
        console.log('Data sent to n8n webhook:', response.status);
    } catch (error) {
        console.error('Failed to send data to n8n webhook:', error.message);
    }

    // Clear all user data after output
    viewerStats = {};
}, 5000);

// Check if user is live via HTTP request
async function isUserLive(username) {
    try {
        const url = `https://www.tiktok.com/@${username}`; 
        const response = await axios.get(url);
        return response.data.includes('"isLive":true');
    } catch (err) {
        return false;
    }
}

let currentTiktokLive = null;

// Function to setup event listeners
function setupEventListeners(connection) {
    connection.removeAllListeners(); // Prevent duplicates

    // Handle like events
    connection.on('like', (data) => {
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
    connection.on('gift', (data) => {
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

    // Handle disconnects
    connection.on('disconnected', () => {
        console.log('Disconnected from live room.');
        currentTiktokLive = null; // Reset so we can reconnect
    });

    connection.on('roomClose', () => {
        console.log('Live room closed.');
        currentTiktokLive = null;
    });
}

// Attempt to connect only if user is live
async function attemptReconnect() {
    console.log("🔍 Checking if user is live...");

    const live = await isUserLive(tiktokUsername);

    if (!live) {
        console.log("🔴 User is NOT live. Retrying in 60 seconds...");
        return;
    }

    console.log("🟢 User is live. Creating new connection...");

    // Clean up previous connection
    if (currentTiktokLive) {
        currentTiktokLive.removeAllListeners();
        try {
            await currentTiktokLive.disconnect();
        } catch (e) {}
    }

    // Create fresh connection
    currentTiktokLive = new WebcastPushConnection(tiktokUsername);
    setupEventListeners(currentTiktokLive);

    try {
        await currentTiktokLive.connect();
        console.log("✅ Successfully connected to TikTok live room!");
    } catch (err) {
        console.error("❌ Connection failed:", err.message);
        currentTiktokLive = null;
    }
}

// Polling interval to check for live status
async function startPolling() {
    console.log("🔄 Starting live status polling every 60 seconds...");

    setInterval(async () => {
        await attemptReconnect();
    }, 60000); // Every 60 seconds
}

// Express server to satisfy Render's requirement
const PORT = process.env.PORT || 10000;
app.get('/', (req, res) => {
    res.send(`🎥 TikTok Live Tracker Running... Monitoring @${tiktokUsername}`);
});

app.listen(PORT, '0.0.0.0', async () => {
    console.log(`📡 Server is listening on port ${PORT}`);
    await startPolling(); // Start polling immediately
});
