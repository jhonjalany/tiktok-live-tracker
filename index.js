const { WebcastPushConnection } = require('./dist/index'); // Adjust this path if needed
const axios = require('axios');
const express = require('express');

const app = express();

// Configuration
const tiktokUsername = 'jhonjalany'; // Replace with your TikTok username
const n8nWebhookUrl = 'https://n8n-app-gn6h.onrender.com/webhook/livetracker'; 

const tiktokLive = new WebcastPushConnection(tiktokUsername);

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

// Reconnection logic
let reconnectAttempts = 0;
const maxReconnectAttempts = 10000;

async function attemptReconnect() {
    if (reconnectAttempts >= maxReconnectAttempts) {
        console.log("Max reconnection attempts reached. Stopping.");
        return;
    }

    reconnectAttempts++;
    console.log(`Reconnection attempt #${reconnectAttempts}...`);

    try {
        await tiktokLive.connect();
        console.log("Successfully reconnected to TikTok live room!");
        reconnectAttempts = 0; // Reset on success
    } catch (err) {
        console.error("Reconnection failed:", err.message);
        setTimeout(attemptReconnect, 60000); // Try again in 5 minutes
    }
}

// Initial connection
tiktokLive.connect()
    .then(() => {
        console.log('Connected to TikTok live room!');
    })
    .catch(() => {
        console.log("User is not live yet or connection failed. Starting reconnection attempts...");
        attemptReconnect();
    });

// Listen for disconnection events
tiktokLive.on('disconnected', () => {
    console.log('Disconnected from TikTok live room. Attempting to reconnect...');
    attemptReconnect();
});

tiktokLive.on('roomClose', () => {
    console.log('TikTok live room was closed. Attempting to reconnect...');
    attemptReconnect();
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

// Express server to satisfy Render's requirement
const PORT = process.env.PORT || 10000;
app.get('/', (req, res) => {
    res.send('TikTok Live Tracker Running...');
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is listening on port ${PORT}`);
});
