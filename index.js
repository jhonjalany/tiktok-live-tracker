const { WebcastPushConnection } = require('./dist/index');
const axios = require('axios');
const express = require('express');

const app = express();

// Configuration
const tiktokUsername = 'respawnandride'; // Replace with your TikTok username
const n8nWebhookUrl = 'https://n8n-app-gn6h.onrender.com/webhook/livetracker'; 

// In-memory storage for recent interactions
let viewerStats = {};
let currentViewers = 0;

// Utility to construct TikTok profile URL
const getProfileLink = (uniqueId) => `https://www.tiktok.com/@${uniqueId}`; 

// Interval to print + clear every 5 seconds
const outputInterval = setInterval(async () => {
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

    const summary = {
        viewerCount: currentViewers,
        participants: output
    };

    console.log(JSON.stringify(summary, null, 2));

    // Send to n8n webhook
    try {
        const response = await axios.post(n8nWebhookUrl, summary);
        console.log(`Data sent to n8n webhook: Status ${response.status}`);
    } catch (error) {
        console.error('Failed to send data to n8n webhook:', error.message);
    }

    // Clear stats after sending
    viewerStats = {};
}, 5000);

// Connection handler
let tiktokLive = null;

function connectToLiveRoom() {
    if (tiktokLive) {
        tiktokLive.removeAllListeners(); // Prevent duplicate listeners
        tiktokLive = null;
    }

    tiktokLive = new WebcastPushConnection(tiktokUsername);

    tiktokLive.connect()
        .then(() => {
            console.log('✅ Connected to TikTok live room!');
        })
        .catch(err => {
            console.error('🔴 Initial connection failed:', err.message);
            scheduleReconnect();
        });

    // Like event
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

    // Gift event
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

    // Room user update (e.g., viewer count)
    tiktokLive.on('roomUser', (data) => {
        currentViewers = data.viewerCount;
        console.log(`👥 Current viewers: ${currentViewers}`);
    });

    // Disconnected / stream ended
    tiktokLive.on('disconnected', () => {
        console.log('🟡 Disconnected from live room. Stream may have ended.');
        scheduleReconnect();
    });

    // WebSocket errors
    tiktokLive.on('error', (err) => {
        console.error('❌ WebSocket Error:', err.message);
        scheduleReconnect();
    });
}

// Reconnect every 10 seconds
function scheduleReconnect() {
    setTimeout(() => {
        console.log('🔄 Attempting to reconnect...');
        connectToLiveRoom();
    }, 10000);
}

// Start initial connection
connectToLiveRoom();

// Express server (for Render or similar hosting)
const PORT = process.env.PORT || 10000;
app.get('/', (req, res) => {
    res.send('TikTok Live Tracker Running...');
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`📡 Server is listening on port ${PORT}`);
});
