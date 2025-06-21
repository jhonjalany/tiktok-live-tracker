const { WebcastPushConnection } = require('./dist/index');
const axios = require('axios');
const express = require('express');

const app = express();

// TikTok streamer username (without @)
const tiktokUsername = 'daniellepau'; // Replace with your TikTok username

// Google Apps Script Web App URL
const sheetWebAppUrl = 'https://script.google.com/macros/s/AKfycbzoN1pku4vRujwZ95y_V4M_oUrTZ6CycIrSbUV8JaJ8MLqnT-qQGW5D3PGcTnkivac/exec'; 

// Connect to TikTok Live
const tiktokLive = new WebcastPushConnection(tiktokUsername);

// In-memory storage for current viewer stats
let viewerStats = {};

// Utility to generate profile link
const getProfileLink = (uniqueId) => `https://tiktok.com/@${uniqueId}`; 

// Debounce delay: wait 2000ms (2 seconds) after last event before sending
const DEBOUNCE_DELAY_MS = 2000;
let sendTimeout = null;

// Function to send data to Google Sheet
async function sendDataToSheet() {
    // Create a copy to send and clear viewerStats immediately
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

    // Clear viewer stats before sending to avoid missing new events
    viewerStats = {};

    if (Object.keys(output).length === 0) {
        console.log('No data to send.');
        return;
    }

    console.log('Sending viewer stats:', JSON.stringify(output, null, 2));

    try {
        const response = await axios.post(sheetWebAppUrl, output);
        console.log('Data successfully sent to Google Sheet:', response.data.result);
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
    }
}

// Schedule sending data with debounce
function scheduleSend() {
    if (sendTimeout) clearTimeout(sendTimeout);
    sendTimeout = setTimeout(sendDataToSheet, DEBOUNCE_DELAY_MS);
}

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

    // Schedule send (will reset timer if called again within 2 sec)
    scheduleSend();
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

    // Schedule send
    scheduleSend();
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
