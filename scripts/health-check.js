#!/usr/bin/env node

import http from 'node:http';

const HOST = process.env.HOST || 'localhost';
const PORT = process.env.PORT || 8080;
const TIMEOUT = 5000; // 5 seconds

console.log(`Checking health at http://${HOST}:${PORT}/api/health/simple`);

const options = {
  hostname: HOST,
  port: PORT,
  path: '/api/health/simple',
  method: 'GET',
  timeout: TIMEOUT
};

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    if (res.statusCode === 200) {
      console.log('✅ Health check passed');
      console.log('Response:', data);
      process.exit(0);
    } else {
      console.log(`❌ Health check failed with status: ${res.statusCode}`);
      console.log('Response:', data);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.log(`❌ Health check failed with error: ${error.message}`);
  process.exit(1);
});

req.on('timeout', () => {
  console.log(`❌ Health check timed out after ${TIMEOUT}ms`);
  req.destroy();
  process.exit(1);
});

req.setTimeout(TIMEOUT);
req.end(); 