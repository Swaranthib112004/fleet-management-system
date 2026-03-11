console.log('test_sync.js starting');
let axios;
const path = require('path');
let dotenv;

// Load packages from backend/node_modules if not installed at repo root.
try {
  dotenv = require('dotenv');
} catch (e) {
  dotenv = require(path.join(__dirname, 'backend', 'node_modules', 'dotenv'));
}

try {
  axios = require('axios');
} catch (e) {
  axios = require(path.join(__dirname, 'backend', 'node_modules', 'axios'));
}

// Try to use axios from this repo's backend dependencies (the server package).
try {
  axios = require('axios');
} catch (e) {
  // If running from repo root and axios is only installed in backend/, load it directly.
  axios = require(path.join(__dirname, 'backend', 'node_modules', 'axios'));
}


// Load environment variables exactly like the server
dotenv.config({ path: path.join(__dirname, 'backend', '.env') });

const apiKey = process.env.GEMINI_API_KEY;
console.log('--- API KEY SYNC CHECK ---');
console.log('Key in use:', apiKey ? (apiKey.substring(0, 10) + '...' + apiKey.substring(apiKey.length - 4)) : 'NOT FOUND');

if (!apiKey) {
    console.error('ERROR: GEMINI_API_KEY not found in .env');
    process.exit(1);
}

const testAi = async () => {
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        const response = await axios.post(url, {
            contents: [{ parts: [{ text: 'Say: SYNC SUCCESSFUL' }] }]
        });

        const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
            console.log('✅ AI RESPONSE:', text.trim());
        } else {
            console.log('❌ AI ERROR:', JSON.stringify(response.data));
        }
    } catch (error) {
        const status = error.response?.status;
        const msg = error.response?.data?.error?.message || error.message;
        console.error(`❌ FAILED (HTTP ${status}):`, msg);
    }
};

testAi();
