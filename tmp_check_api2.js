const https = require('https');

console.log('start');

const options = {
  headers: {
    'Accept-Encoding': 'identity',
    'User-Agent': 'node.js',
  },
};

https.get('https://fleet-management-backend-p8kw.onrender.com/api', options, (res) => {
  console.log('status', res.statusCode);
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log('body (first 1000 chars):');
    console.log(data.slice(0, 1000));
    console.log('...');
    process.exit(0);
  });
}).on('error', (e) => {
  console.error('ERR', e.message);
  process.exit(1);
});
