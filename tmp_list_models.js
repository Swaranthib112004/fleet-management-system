const axios = require('./backend/node_modules/axios');
const fs = require('fs');

const env = fs.readFileSync('backend/.env', 'utf8');
const match = env.match(/GEMINI_API_KEY=(.+)/);
if (!match) {
  console.error('No API key found');
  process.exit(1);
}
const key = match[1].trim();
console.log('using key prefix', key.slice(0, 10));

(async () => {
  try {
    const res = await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    console.log('status', res.status);
    console.log('models count', res.data?.models?.length);
    console.log('first 10:', res.data?.models?.slice(0, 10).map(m=>m.name));
  } catch (e) {
    console.error('error message', e.message);
    if (e.response) {
      console.error('status', e.response.status);
      console.error('data', JSON.stringify(e.response.data, null, 2).slice(0, 1000));
    }
  }
})();
