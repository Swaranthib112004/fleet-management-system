const https = require('https');

console.log('start');

const req = https.get('https://fleet-management-backend-p8kw.onrender.com/api', (res) => {
  console.log('status', res.statusCode);
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log('body', data);
    process.exit(0);
  });
});

req.on('error', (e) => {
  console.error('ERR', e.message);
  process.exit(1);
});

setTimeout(() => {
  console.log('timed out');
  process.exit(2);
}, 15000);
