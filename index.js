const { WebcastPushConnection } = require('./dist/index');
const axios = require('axios');
const express = require('express');

const app = express();

// Configuration
const tiktokUsername = 'kiranathis'; // Replace with your TikTok username
const sheetWebAppUrl = 'https://script.google.com/macros/s/AKfycbzoN1pku4vRujwZ95y_V4M_oUrTZ6CycIrSbUV8JaJ8MLqnT-qQGW5D3PGcTnkivac/exec'; 

// Listening intervals
const SHORT_INTERVAL_MS = 5000;     // For 5s interval
const MEDIUM_INTERVAL_MS = 10000;   // For 10s interval

let bufferA = {};
let bufferB = {};

// Track roles
let bufferARole = 'short'; // Starts as short listener (5s)
let bufferBRole = 'long';  // Starts as long listener (10s)

// Utility to generate profile link
const getProfileLink = (uniqueId) => `https://tiktok.com/@${uniqueId}`; 

// Retry logic
let retryCount = 0;
const MAX_RETRIES = 3;

// Function to map and subtract overlapping data from other buffer
function subtractFromOther(bufferToSend, bufferToModify) {
    const result = { ...bufferToModify };

    for (const [userId, sentData] of Object.entries(bufferToSend)) {
        if (result[userId]) {
            result[userId].likes = Math.max(0, result[userId].likes - sentData.likes);
            result[userId].coins = Math.max(0, result[userId].coins - sentData.coins);

            console.log(`🧹 Deduplicated user: ${userId} | Likes removed: ${sentData.likes}, Coins removed: ${sentData.coins}`);
        }
    }

    return result;
}

// Function to send data to Google Sheet
async function sendDataToSheet(bufferToSend, bufferName, otherBuffer, setOtherBuffer, nextInterval) {
    try {
        const output = {};

        console.log(`\n📊 Displaying ${bufferName} Data:`);
        for (const [userId, data] of Object.entries(bufferToSend)) {
            console.log(`User: ${data.username} | Likes: ${data.likes}, Coins: ${data.coins}`);
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
            console.log(`No data to send from ${bufferName}.`);
            return {};
        }

        console.log(`${new Date().toLocaleTimeString()} Sending viewer stats from ${bufferName}:`, JSON.stringify(output, null, 2));

        const response = await axios.post(sheetWebAppUrl, output);
        console.log(`✅ Data successfully sent to Google Sheet from ${bufferName}:`, response.data.result);

        retryCount = 0;

        // Subtract sent data from the other buffer
        setOtherBuffer(subtractFromOther(bufferToSend, otherBuffer));

        // Clear current buffer after successful send
        return {};
    } catch (error) {
        console.error(`❌ Error sending data from ${bufferName}:`, error.message);
        if (retryCount < MAX_RETRIES) {
            retryCount++;
            console.log(`🔁 Retrying... (${retryCount}/${MAX_RETRIES})`);
            setTimeout(() => sendDataToSheet(bufferToSend, bufferName, otherBuffer, setOtherBuffer, nextInterval), 5000);
        } else {
            console.error(`🛑 Max retries reached for ${bufferName}. Clearing buffer.`);
            retryCount = 0;
        }
        return bufferToSend; // Keep data if failed
    }
}

// Start interval for bufferA
function startBufferATimer() {
    let intervalTime = bufferARole === 'short' ? SHORT_INTERVAL_MS : MEDIUM_INTERVAL_MS;

    setTimeout(async () => {
        console.log(`${new Date().toLocaleTimeString()} 🟡 Buffer A is sending data as "${bufferARole}"`);

        // Send and deduct from bufferB
        bufferA = await sendDataToSheet(bufferA, 'Buffer A', bufferB, (data) => bufferB = data, bufferARole);

        // Swap role
        bufferARole = bufferARole === 'short' ? 'long' : 'short';

        // Restart timer
        startBufferATimer();
    }, intervalTime);
}

// Start interval for bufferB
function startBufferBTimer() {
    let intervalTime = bufferBRole === 'long' ? MEDIUM_INTERVAL_MS : SHORT_INTERVAL_MS;

    setTimeout(async () => {
        console.log(`${new Date().toLocaleTimeString()} 🟢 Buffer B is sending data as "${bufferBRole}"`);

        // Send and deduct from bufferA
        bufferB = await sendDataToSheet(bufferB, 'Buffer B', bufferA, (data) => bufferA = data, bufferBRole);

        // Swap role
        bufferBRole = bufferBRole === 'long' ? 'short' : 'long';

        // Restart timer
        startBufferBTimer();
    }, intervalTime);
}

// Connect to TikTok Live room
const tiktokLive = new WebcastPushConnection(tiktokUsername);

tiktokLive.connect().then(() => {
    console.log('🟢 Connected to TikTok live room!');

    // Start timers
    startBufferATimer();
    startBufferBTimer();
}).catch(err => {
    console.error('🔴 Connection failed:', err);
});

// Handle Like events
tiktokLive.on('like', (data) => {
    const userId = data.userId.toString();
    const uniqueId = data.uniqueId;

    // Add to both buffers
    [bufferA, bufferB].forEach(buffer => {
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
    });

    console.log(`👍 [Like] ${uniqueId} gave ${data.likeCount} likes`);
});

// Handle Gift events
tiktokLive.on('gift', (data) => {
    const userId = data.userId.toString();
    const uniqueId = data.uniqueId;

    const giftCoins = data.diamondCount * (data.repeatCount || 1);

    // Add to both buffers
    [bufferA, bufferB].forEach(buffer => {
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
        buffer[userId].coins += giftCoins;
    });

    console.log(`🎁 [Gift] ${data.giftName} worth ${giftCoins} coins from ${uniqueId}`);
});

// Optional disconnect/reconnect listeners
tiktokLive.on('disconnected', () => {
    console.log('🔴 Disconnected from TikTok live room.');
});
tiktokLive.on('reconnecting', () => {
    console.log('🔄 Reconnecting to TikTok live room...');
});
tiktokLive.on('roomUser', (user) => {
    console.log(`👤 Viewer joined: ${user.uniqueId}`);
});

// Express route to satisfy hosting platforms like Render
app.get('/', (req, res) => {
    res.send('TikTok Live Tracker Running...');
});

// Start Express server
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`📡 Server is listening on port ${PORT}`);
});
