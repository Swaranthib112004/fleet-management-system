const dotenv = require('dotenv');
const path = require('path');
const axios = require('axios');
const mongoose = require('mongoose');

// Load env from backend folder
dotenv.config({ path: path.join(__dirname, '..', 'backend', '.env') });

const apiKey = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash-latest';
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/fleet-management';

console.log('--- DEBUG INFO ---');
console.log('Model:', model);
console.log('API Key length:', apiKey ? apiKey.length : 0);
console.log('Mongo URI:', mongoUri);

async function test() {
    try {
        // 1. Test Mongo
        await mongoose.connect(mongoUri);
        const Vehicle = require('../backend/models/vehicleModel');
        const vCount = await Vehicle.countDocuments();
        console.log('Vehicle Count:', vCount);

        // 2. Test Gemini API
        if (!apiKey) {
            console.log('ERROR: GEMINI_API_KEY is missing');
            process.exit(1);
        }

        const prompt = "What is 2+2? Answer with only the number.";
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        console.log('Testing Gemini API at:', url.split('?')[0]);

        const response = await axios.post(
            url,
            {
                contents: [{ parts: [{ text: prompt }] }],
            },
            { timeout: 10000 }
        );

        const content = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        console.log('Gemini Response:', content);

        process.exit(0);
    } catch (error) {
        console.error('ERROR during debug:', error.message);
        if (error.response) {
            console.error('API Response Error:', JSON.stringify(error.response.data));
        }
        process.exit(1);
    }
}

test();
