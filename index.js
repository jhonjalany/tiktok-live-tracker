const { WebcastPushConnection } = require('./dist/index');
const axios = require('axios');
const express = require('express');

const app = express();

// Configuration
const tiktokUsername = 'daniellepau'; // Replace with your TikTok username
const sheetWebAppUrl = 'https://script.google.com/macros/s/AKfycbzoN1pku4vRujwZ95y_V4M_oUrTZ6CycIrSbUV8JaJ8MLqnT-qQGW5D3PGcTnkivac/exec'; 
const USER_DEBOUNCE_MS = 3000;      // Wait time per user after last event
const GLOBAL_SEND_INTERVAL = 10000; // Fallback send all pending users every X ms

// Initialize connection
const tiktokLive = new WebcastPushConnection(tiktokUsername);

// In-memory storage for viewer stats + timers
let viewerStats = {}; // { userId: { ...stats, timer } }

// Utility to generate profile link
const getProfileLink = (uniqueId) => `https://tiktok.com/@${uniqueId}`; 

// Retry logic
let retryCount = 0;
const MAX_RETRIES = 3;

// Function to send data to Google Sheet
async function sendDataToSheet(dataToSend) {
    const output = {};
    for (const [userId, data] of Object.entries(dataToSend)) {
        output[userId] = {
            userID: userId,
            username: data.username,
            profileLink: data.profileLink,
            profilePictureUrl: data.profilePictureUrl || '',
            totalLikesCountInPast5Seconds: data.likes,
            totalCoinOrGiftCountInPast5Seconds: data.coins
        };
    }

    console.log('Sending viewer stats:', JSON.stringify(output, null, 2));

    try {
        const response = await axios.post(sheetWebAppUrl, output);
        console.log('Data successfully sent to Google Sheet:', response.data.result);
        retryCount = 0;
    } catch (error) {
        console.error('Error sending data to Google Sheet:');
        if (error.response) {
            console.error('Status Code:', error.response.status);
            console.error('Response:', error.response.data);
        } else if (error.request) {
            console.error('No response received:', error.message);
        } else {
            console.error('Unexpected error:', error.message);
        }

        if (retryCount < MAX_RETRIES) {
            retryCount++;
            console.log(`Retrying... (${retryCount}/${MAX_RETRIES})`);
            setTimeout(() => sendDataToSheet(dataToSend), 5000);
        } else {
            console.error('Max retries reached. Data may be lost.');
            retryCount = 0;
        }
    }
}

// Clear user from stats and cancel timer
function clearUser(userId) {
    if (viewerStats[userId]?.timer) {
        clearTimeout(viewerStats[userId].timer);
    }
    delete viewerStats[userId];
}

// Schedule sending for a specific user
function scheduleUserSend(userId) {
    if (viewerStats[userId]?.timer) {
        clearTimeout(viewerStats[userId].timer);
    }

    viewerStats[userId].timer = setTimeout(() => {
        const userData = { [userId]: viewerStats[userId] };
        sendDataToSheet(userData);
        clearUser(userId);
    }, USER_DEBOUNCE_MS);
}

// Fallback interval to send any remaining data
setInterval(() => {
    const pendingUsers = {};

    for (const userId of Object.keys(viewerStats)) {
        pendingUsers[userId] = viewerStats[userId];
        clearUser(userId);
    }

    if (Object.keys(pendingUsers).length > 0) {
        console.log('Global fallback: Sending batch of pending users...');
        sendDataToSheet(pendingUsers);
    }
}, GLOBAL_SEND_INTERVAL);

// Connect to TikTok Live room
tiktokLive.connect().then(() => {
    console.log('Connected to TikTok live room!');
}).catch(err => {
    console.error('Connection failed:', err);
});

// Handle Like events
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
            coins: 0,
            timer: null
        };
    }

    viewerStats[userId].likes += data.likeCount;
    console.log(`Received likes: ${data.uniqueId} - ${data.likeCount} likes`);

    scheduleUserSend(userId);
});

// Handle Gift events
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
            coins: 0,
            timer: null
        };
    }

    const giftCoins = data.diamondCount * (data.repeatCount || 1);
    viewerStats[userId].coins += giftCoins;

    console.log(`Received gift: ${data.giftName} - ${giftCoins} coins`);

    scheduleUserSend(userId);
});

// Express route to satisfy hosting platforms like Render
app.get('/', (req, res) => {
    res.send('TikTok Live Tracker Running...');
});

// Start Express server
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is listening on port ${PORT}`);
});
