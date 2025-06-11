const { WebcastPushConnection } = require('tiktok-webcast-push-connection');
const axios = require('axios');
const express = require('express');

const app = express();

// Configuration
const tiktokUsername = 'jhonjalany'; // Replace with your TikTok username
const n8nWebhookUrl = 'https://n8n-app-gn6h.onrender.com/webhook/livetracker'; 

let tiktokLive = new WebcastPushConnection(tiktokUsername);

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

// ----------------------
// Live Status Polling Logic
// ----------------------

let currentRoomId = null;
let reconnectAttempts = 0;
const maxReconnectAttempts = 10;

async function checkIfUserIsLive(username) {
    try {
        const response = await axios.get(`https://www.tiktok.com/@${username}`); 
        const match = response.data.match(/roomId%22%3A%22(\d+)%22/);
        return match ? match[1] : null;
    } catch (err) {
        console.error("Error fetching live status:", err.message);
        return null;
    }
}

async function pollForLiveStatus() {
    const roomId = await checkIfUserIsLive(tiktokUsername);

    if (roomId && roomId !== currentRoomId) {
        console.log(`Detected new live room: ${roomId}`);
        currentRoomId = roomId;

        try {
            if (tiktokLive['_liveClient']?.connected) {
                tiktokLive.disconnect(); // Disconnect old connection
            }

            tiktokLive = new WebcastPushConnection(tiktokUsername); // Fresh instance
            setupEventListeners(); // Rebind event listeners

            await tiktokLive.connect();
            console.log("Successfully connected to new live room!");
            reconnectAttempts = 0;
        } catch (err) {
            console.error("Failed to connect to new live room:", err.message);
        }
    } else if (!roomId) {
        console.log("User is not live yet.");
    }
}

// Run every 30 seconds
setInterval(pollForLiveStatus, 30000); // Every 30 seconds

// ----------------------
// Event Listeners Setup
// ----------------------

function setupEventListeners() {

    function attemptReconnect() {
        if (reconnectAttempts >= maxReconnectAttempts) {
            console.log("Max reconnection attempts reached. Stopping.");
            return;
        }

        reconnectAttempts++;
        console.log(`Reconnection attempt #${reconnectAttempts}...`);

        setTimeout(async () => {
            try {
                await tiktokLive.connect();
                console.log("Successfully reconnected to TikTok live room!");
                reconnectAttempts = 0;
            } catch (err) {
                console.error("Reconnection failed:", err.message);
                attemptReconnect();
            }
        }, 30000); // Try again in 30 seconds
    }

    // Listen for disconnection events
    tiktokLive.on('disconnected', () => {
        console.log('Disconnected from TikTok live room. Attempting to reconnect...');
        attemptReconnect();
    });

    tiktokLive.on('roomClose', () => {
        console.log('TikTok live room was closed. Resetting live status...');
        currentRoomId = null; // Reset so polling can detect new live
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
}

// Start polling on startup
console.log("Starting live status poll...");
pollForLiveStatus();

// Express server to satisfy Render's requirement
const PORT = process.env.PORT || 10000;
app.get('/', (req, res) => {
    res.send('TikTok Live Tracker Running...');
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is listening on port ${PORT}`);
});
