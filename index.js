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

// In-memory storage for viewer stats
let viewerStats = {};

// Utility to generate profile link
const getProfileLink = (uniqueId) => `https://tiktok.com/@${uniqueId}`; 

// Retry logic
let retryCount = 0;
const MAX_RETRIES = 3;

// Function to send data to Google Sheet
async function sendDataToSheet() {
    const output = {};
    for (const [userId, data] of Object.entries(viewerStats)) {
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
        console.log('No data to send.');
        return;
    }

    console.log('Sending viewer stats:', JSON.stringify(output, null, 2));

    try {
        const response = await axios.post(sheetWebAppUrl, output);
        console.log('Data successfully sent to Google Sheet:', response.data.result);

        // ✅ Clear storage only after successful send
        viewerStats = {}; // <-- This clears all stored viewer data
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
            setTimeout(sendDataToSheet, 5000);
        } else {
            console.error('Max retries reached. Data may be lost.');

            // ✅ Clear anyway to avoid duplicate sends on next success
            viewerStats = {};
            retryCount = 0;
        }
    }
}

// Start batch interval (every 5 seconds)
setInterval(() => {
    console.log('5-second interval complete. Sending batch...');
    sendDataToSheet();
}, BATCH_INTERVAL_MS);

// Optional global fallback (in case sendDataToSheet fails)
setInterval(() => {
    if (Object.keys(viewerStats).length > 0) {
        console.log('Global fallback: Forcing send of pending data...');
        sendDataToSheet();
    }
}, 10000); // Every 10 seconds

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
            coins: 0
        };
    }

    viewerStats[userId].likes += data.likeCount;
    console.log(`Received likes: ${data.uniqueId} - ${data.likeCount} likes`);
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
            coins: 0
        };
    }

    const giftCoins = data.diamondCount * (data.repeatCount || 1);
    viewerStats[userId].coins += giftCoins;

    console.log(`Received gift: ${data.giftName} - ${giftCoins} coins`);
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
