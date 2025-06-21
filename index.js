const { WebcastPushConnection } = require('./dist/index');
const axios = require('axios');
const express = require('express');

const app = express();

// Configuration
const tiktokUsername = 'daniellepau'; // Replace with your TikTok username
const sheetWebAppUrl = 'https://script.google.com/macros/s/AKfycbzoN1pku4vRujwZ95y_V4M_oUrTZ6CycIrSbUV8JaJ8MLqnT-qQGW5D3PGcTnkivac/exec'; 
const TIP_THRESHOLD = 50;           // Define what's considered a "tip"
const DEBOUNCE_DELAY_MS = 1500;      // Normal delay before sending batched data
const RAPID_GIFT_INTERVAL = 2000;   // Time window to detect rapid gifts from same user

// Initialize connection
const tiktokLive = new WebcastPushConnection(tiktokUsername);

// In-memory storage for viewer stats
let viewerStats = {};

// Utility to generate profile link
const getProfileLink = (uniqueId) => `https://tiktok.com/@${uniqueId}`; 

// Track recent gift timestamps per user
const recentGifts = {}; // { userId: timestamp }

// Retry logic
let retryCount = 0;
const MAX_RETRIES = 3;

// Debounce timer
let sendTimeout = null;

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

    viewerStats = {}; // Clear immediately after copying

    if (Object.keys(output).length === 0) {
        console.log('No data to send.');
        return;
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
            setTimeout(sendDataToSheet, 5000);
        } else {
            console.error('Max retries reached. Data may be lost.');
            retryCount = 0;
        }
    }
}

// Schedule sending data with debounce
function scheduleSend() {
    if (sendTimeout) clearTimeout(sendTimeout);
    sendTimeout = setTimeout(sendDataToSheet, DEBOUNCE_DELAY_MS);
}

// Detect rapid repeated gifts from same user
function isRapidGift(userId) {
    const now = Date.now();
    if (!recentGifts[userId]) {
        recentGifts[userId] = now;
        return false;
    }

    const rapid = now - recentGifts[userId] < RAPID_GIFT_INTERVAL;
    recentGifts[userId] = now;
    return rapid;
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
    console.log(`Received likes: ${data.uniqueId} - ${data.likeCount} likes`);

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

    console.log(`Received gift: ${data.giftName} - ${giftCoins} coins`);

    // Schedule normal debounced send
    scheduleSend();

    // Send immediately if it's a tip or rapid gift
    if (giftCoins >= TIP_THRESHOLD || isRapidGift(userId)) {
        console.log(`Immediate send triggered for gift from ${uniqueId}`);
        clearTimeout(sendTimeout);
        sendDataToSheet();
    }
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
