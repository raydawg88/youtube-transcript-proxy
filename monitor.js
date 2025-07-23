#!/usr/bin/env node

/**
 * YouTube Transcript Proxy - Railway Deployment Monitor
 * 
 * Usage: node monitor.js <railway-url>
 * Example: node monitor.js https://youtube-transcript-proxy.up.railway.app
 */

const https = require('https');
const http = require('http');

// Get Railway URL from command line or environment
const RAILWAY_URL = process.argv[2] || process.env.RAILWAY_URL;

if (!RAILWAY_URL) {
  console.error('❌ Error: Please provide Railway URL as argument');
  console.error('Usage: node monitor.js <railway-url>');
  console.error('Example: node monitor.js https://youtube-transcript-proxy.up.railway.app');
  process.exit(1);
}

// Parse URL
const url = new URL(RAILWAY_URL);
const protocol = url.protocol === 'https:' ? https : http;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Test configuration
const tests = [
  {
    name: 'Root Endpoint',
    method: 'GET',
    path: '/',
    expectedStatus: 200,
    validateResponse: (data) => {
      return data.status === 'ok' && data.endpoints;
    }
  },
  {
    name: 'Health Check',
    method: 'GET',
    path: '/health',
    expectedStatus: 200,
    validateResponse: (data) => {
      return data === 'OK';
    }
  },
  {
    name: 'Channel Endpoint (Invalid Request)',
    method: 'POST',
    path: '/channel',
    expectedStatus: 400,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
    validateResponse: (data) => {
      return data.error === 'Missing channelUrl';
    }
  },
  {
    name: 'CORS Preflight',
    method: 'OPTIONS',
    path: '/channel',
    expectedStatus: 204,
    headers: {
      'Origin': 'https://example.com',
      'Access-Control-Request-Method': 'POST'
    }
  }
];

// Function to make HTTP request
function makeRequest(test) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: test.path,
      method: test.method,
      headers: test.headers || {},
      timeout: 10000
    };

    console.log(`${colors.cyan}Testing: ${test.name}${colors.reset}`);
    console.log(`  ${test.method} ${test.path}`);

    const startTime = Date.now();
    const req = protocol.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        const responseTime = Date.now() - startTime;
        const success = res.statusCode === test.expectedStatus;
        
        console.log(`  Status: ${success ? colors.green : colors.red}${res.statusCode}${colors.reset} (expected ${test.expectedStatus})`);
        console.log(`  Response Time: ${responseTime}ms`);
        
        // Check CORS headers
        if (res.headers['access-control-allow-origin']) {
          console.log(`  CORS: ${colors.green}✓ Enabled${colors.reset}`);
        }

        // Parse and validate response
        if (test.validateResponse && data) {
          try {
            const parsed = test.method === 'OPTIONS' ? data : 
                          data.startsWith('{') ? JSON.parse(data) : data;
            const valid = test.validateResponse(parsed);
            console.log(`  Validation: ${valid ? colors.green + '✓ Passed' : colors.red + '✗ Failed'}${colors.reset}`);
            
            if (!valid && parsed) {
              console.log(`  Response: ${JSON.stringify(parsed, null, 2)}`);
            }
          } catch (e) {
            console.log(`  Validation: ${colors.red}✗ Failed to parse response${colors.reset}`);
            console.log(`  Raw response: ${data.substring(0, 100)}...`);
          }
        }

        console.log('');
        resolve({ test: test.name, success, responseTime });
      });
    });

    req.on('error', (err) => {
      console.log(`  ${colors.red}✗ Request failed: ${err.message}${colors.reset}\n`);
      reject({ test: test.name, error: err.message });
    });

    req.on('timeout', () => {
      req.destroy();
      console.log(`  ${colors.red}✗ Request timeout (10s)${colors.reset}\n`);
      reject({ test: test.name, error: 'Timeout' });
    });

    if (test.body) {
      req.write(test.body);
    }

    req.end();
  });
}

// Function to test transcript extraction
async function testTranscriptExtraction() {
  console.log(`${colors.blue}═══ Testing Transcript Extraction ═══${colors.reset}\n`);
  
  const testChannel = 'https://www.youtube.com/@mkbhd';
  const options = {
    hostname: url.hostname,
    port: url.port,
    path: '/channel',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    timeout: 30000 // 30 seconds for transcript extraction
  };

  return new Promise((resolve) => {
    console.log(`Testing with channel: ${testChannel}`);
    const startTime = Date.now();
    
    const req = protocol.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        const responseTime = Date.now() - startTime;
        
        try {
          const result = JSON.parse(data);
          
          if (result.success) {
            console.log(`${colors.green}✓ Success!${colors.reset}`);
            console.log(`  Channel: ${result.channel.name}`);
            console.log(`  Videos Found: ${result.stats.videosFound}`);
            console.log(`  Videos Processed: ${result.stats.videosProcessed}`);
            console.log(`  Transcripts Extracted: ${result.stats.transcriptsExtracted}`);
            console.log(`  Response Time: ${responseTime}ms`);
            
            // Show first video with transcript
            const videoWithTranscript = result.videos.find(v => v.hasTranscript);
            if (videoWithTranscript) {
              console.log(`\n  Sample Video with Transcript:`);
              console.log(`    Title: ${videoWithTranscript.title}`);
              console.log(`    Transcript Preview: ${videoWithTranscript.transcript.substring(0, 100)}...`);
            }
          } else {
            console.log(`${colors.red}✗ Failed${colors.reset}`);
            console.log(`  Error: ${result.error || 'Unknown error'}`);
          }
        } catch (e) {
          console.log(`${colors.red}✗ Failed to parse response${colors.reset}`);
          console.log(`  Status: ${res.statusCode}`);
          console.log(`  Response: ${data.substring(0, 200)}...`);
        }
        
        console.log('');
        resolve();
      });
    });

    req.on('error', (err) => {
      console.log(`${colors.red}✗ Request failed: ${err.message}${colors.reset}\n`);
      resolve();
    });

    req.on('timeout', () => {
      req.destroy();
      console.log(`${colors.red}✗ Request timeout (30s)${colors.reset}\n`);
      resolve();
    });

    req.write(JSON.stringify({ channelUrl: testChannel }));
    req.end();
  });
}

// Main monitoring function
async function runMonitor() {
  console.log(`${colors.blue}═══ YouTube Transcript Proxy Monitor ═══${colors.reset}`);
  console.log(`Target: ${RAILWAY_URL}`);
  console.log(`Time: ${new Date().toISOString()}\n`);

  const results = [];

  // Run basic tests
  for (const test of tests) {
    try {
      const result = await makeRequest(test);
      results.push(result);
    } catch (err) {
      results.push(err);
    }
  }

  // Run transcript extraction test
  await testTranscriptExtraction();

  // Summary
  console.log(`${colors.blue}═══ Summary ═══${colors.reset}`);
  
  const successful = results.filter(r => r.success).length;
  const failed = results.length - successful;
  
  console.log(`Total Tests: ${results.length}`);
  console.log(`${colors.green}Passed: ${successful}${colors.reset}`);
  if (failed > 0) {
    console.log(`${colors.red}Failed: ${failed}${colors.reset}`);
  }

  // Calculate average response time
  const responseTimes = results.filter(r => r.responseTime).map(r => r.responseTime);
  if (responseTimes.length > 0) {
    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    console.log(`Average Response Time: ${Math.round(avgResponseTime)}ms`);
  }

  // Exit code based on results
  const exitCode = failed > 0 ? 1 : 0;
  console.log(`\n${exitCode === 0 ? colors.green + '✓ All tests passed!' : colors.red + '✗ Some tests failed!'}${colors.reset}`);
  
  process.exit(exitCode);
}

// Run the monitor
runMonitor().catch(err => {
  console.error(`${colors.red}Monitor failed: ${err.message}${colors.reset}`);
  process.exit(1);
});