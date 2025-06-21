const { WebcastPushConnection } = require('./dist/index');
const axios = require('axios');
const express = require('express');

const app = express();

// Configuration
const tiktokUsername = 'ayannaquizon'; // Replace with your TikTok username
const sheetWebAppUrl = 'https://script.google.com/macros/s/AKfycbzoN1pku4vRujwZ95y_V4M_oUrTZ6CycIrSbUV8JaJ8MLqnT-qQGW5D3PGcTnkivac/exec'; 
const BATCH_INTERVAL_MS = 5000; // Send data every 5 seconds

// Initialize connection
const tiktokLive = new WebcastPushConnection(tiktokUsername);

// Double buffering: two viewer stats stores
let viewerStatsA = {};
let viewerStatsB = {};
let activeBuffer = 'A'; // Start with buffer A

// Utility to generate profile link
const getProfileLink = (uniqueId) => `https://tiktok.com/@${uniqueId}`; 

// Retry logic
let retryCount = 0;
const MAX_RETRIES = 3;

// Function to determine current and sending buffer
function getCurrentBuffers() {
    return activeBuffer === 'A'
        ? { sendingBuffer: viewerStatsA, receivingBuffer: viewerStatsB }
        : { sendingBuffer: viewerStatsB, receivingBuffer: viewerStatsA };
}

// Function to send data to Google Sheet
async function sendDataToSheet() {
    const { sendingBuffer, receivingBuffer } = getCurrentBuffers();

    try {
        const output = {};
        for (const [userId, data] of Object.entries(sendingBuffer)) {
            output[userId] = {
                userID: userId,
                username: data.username,
                profileLink: data.profileLink,
                profilePictureUrl: data.profilePictureUrl || '',
                totalLikesCountInPast5Seconds: data.likes,
                totalCoinOrGiftCountInPast5Seconds: data.coins
            };
        }

        if (Object.keys(output).length === 0) {
            console.log('No data to send in current buffer.');
            return;
        }

        console.log('Sending viewer stats:', JSON.stringify(output, null, 2));

        const response = await axios.post(sheetWebAppUrl, output);
        console.log('Data successfully sent to Google Sheet:', response.data.result);

        // Clear only the sending buffer
        if (activeBuffer === 'A') {
            viewerStatsA = {};
        } else {
            viewerStatsB = {};
        }

        retryCount = 0;

        // Switch active buffer
        activeBuffer = activeBuffer === 'A' ? 'B' : 'A';

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
            setTimeout(sendDataToSheet, 5000);
        } else {
            console.error('Max retries reached. Data may be lost.');

            // Clear anyway to avoid duplicate sends on next success
            if (activeBuffer === 'A') {
                viewerStatsA = {};
            } else {
                viewerStatsB = {};
            }

            retryCount = 0;
            activeBuffer = activeBuffer === 'A' ? 'B' : 'A';
        }
    }
}

// Start batch interval (every 5 seconds)
setInterval(() => {
    console.log(`${new Date().toLocaleTimeString()} - Batch interval complete. Sending data from buffer ${activeBuffer === 'A' ? 'B' : 'A'}...`);
    sendDataToSheet();
}, BATCH_INTERVAL_MS);

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

    const buffer = activeBuffer === 'A' ? viewerStatsA : viewerStatsB;

    if (!buffer[userId]) {
        buffer[userId] = {
            userID: userId,
            username: uniqueId,
            profileLink: getProfileLink(uniqueId),
            profilePictureUrl: data.profilePictureUrl || '',
            likes: 0,
            coins: 0
        };
    }

    buffer[userId].likes += data.likeCount;
    console.log(`Received likes: ${data.uniqueId} - ${data.likeCount} likes`);
});

// Handle Gift events
tiktokLive.on('gift', (data) => {
    const userId = data.userId.toString();
    const uniqueId = data.uniqueId;

    const buffer = activeBuffer === 'A' ? viewerStatsA : viewerStatsB;

    if (!buffer[userId]) {
        buffer[userId] = {
            userID: userId,
            username: uniqueId,
            profileLink: getProfileLink(uniqueId),
            profilePictureUrl: data.profilePictureUrl || '',
            likes: 0,
            coins: 0
        };
    }

    const giftCoins = data.diamondCount * (data.repeatCount || 1);
    buffer[userId].coins += giftCoins;

    console.log(`Received gift: ${data.giftName} - ${giftCoins} coins`);
});

// Optional disconnect/reconnect listeners
tiktokLive.on('disconnected', () => {
    console.log('Disconnected from TikTok live room.');
});
tiktokLive.on('reconnecting', () => {
    console.log('Reconnecting to TikTok live room...');
});
tiktokLive.on('roomUser', (user) => {
    console.log(`Viewer joined: ${user.uniqueId}`);
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
