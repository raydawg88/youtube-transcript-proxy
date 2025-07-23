// Test script to check single video transcript
const https = require('https');

const testVideoId = 'dQw4w9WgXcQ'; // Rick Astley - known to have transcripts

const data = JSON.stringify({
  channelUrl: `https://www.youtube.com/watch?v=${testVideoId}`
});

const options = {
  hostname: 'youtube-transcript-proxy-production.up.railway.app',
  path: '/channel',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

console.log('Testing single video transcript extraction...');

const req = https.request(options, (res) => {
  let responseData = '';
  
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    try {
      const result = JSON.parse(responseData);
      console.log('Response:', JSON.stringify(result, null, 2));
    } catch (e) {
      console.error('Failed to parse response:', e);
      console.log('Raw response:', responseData);
    }
  });
});

req.on('error', (error) => {
  console.error('Request error:', error);
});

req.write(data);
req.end();