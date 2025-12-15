#!/usr/bin/env node

/**
 * Backend Integration Verification Script
 * Tests all API endpoints and features
 */

const http = require('http');

const API_URL = process.env.API_URL || 'http://localhost:3001';
const TIMEOUT = 5000;

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testEndpoint(method, path, body = null) {
  return new Promise((resolve) => {
    const url = new URL(API_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: TIMEOUT
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({
            success: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            data: parsed
          });
        } catch (e) {
          resolve({
            success: false,
            status: res.statusCode,
            error: 'Invalid JSON response'
          });
        }
      });
    });

    req.on('error', (error) => {
      resolve({
        success: false,
        error: error.message
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        success: false,
        error: 'Request timeout'
      });
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  log('\n🧪 VoidTx Backend Integration Verification\n', 'bold');
  log(`Testing API at: ${API_URL}\n`, 'blue');

  let passed = 0;
  let failed = 0;

  // Test 1: Health Check
  log('Test 1: Health Check', 'yellow');
  const healthResult = await testEndpoint('GET', '/health');
  if (healthResult.success) {
    log('✅ PASS: Backend is running\n', 'green');
    passed++;
  } else {
    log(`❌ FAIL: ${healthResult.error || 'Health check failed'}\n`, 'red');
    failed++;
  }

  // Test 2: Stats Endpoint
  log('Test 2: Contract Statistics', 'yellow');
  const statsResult = await testEndpoint('GET', '/api/stats');
  if (statsResult.success) {
    log(`✅ PASS: Stats retrieved (${statsResult.data.totalPaymentsProcessed} payments processed)\n`, 'green');
    passed++;
  } else {
    log(`❌ FAIL: ${statsResult.error || 'Stats endpoint failed'}\n`, 'red');
    failed++;
  }

  // Test 3: Events Endpoint
  log('Test 3: Events API', 'yellow');
  const eventsResult = await testEndpoint('GET', '/api/events/all?limit=5');
  if (eventsResult.success) {
    log(`✅ PASS: Events retrieved (${eventsResult.data.total} total events)\n`, 'green');
    passed++;
  } else {
    log(`❌ FAIL: ${eventsResult.error || 'Events endpoint failed'}\n`, 'red');
    failed++;
  }

  // Test 4: Cost Estimation
  log('Test 4: Cost Estimation', 'yellow');
  const estimateResult = await testEndpoint('POST', '/api/estimate', {
    payments: [
      { recipient: '0x742d35Cc6634C0532925a3b844Bc390e61f5A3ac', amount: '0.1' }
    ]
  });
  if (estimateResult.success) {
    log(`✅ PASS: Cost estimated (${estimateResult.data.totalCost} ETH)\n`, 'green');
    passed++;
  } else {
    log(`❌ FAIL: ${estimateResult.error || 'Estimation failed'}\n`, 'red');
    failed++;
  }

  // Test 5: Join Session Creation
  log('Test 5: Join Session Creation', 'yellow');
  const createSessionResult = await testEndpoint('POST', '/api/join/create', {
    creatorAddress: '0x742d35Cc6634C0532925a3b844Bc390e61f5A3ac'
  });
  if (createSessionResult.success) {
    const sessionId = createSessionResult.data.sessionId;
    log(`✅ PASS: Session created (ID: ${sessionId.substring(0, 8)}...)\n`, 'green');
    passed++;

    // Test 5b: Get Session Details
    log('Test 5b: Get Session Details', 'yellow');
    const sessionDetailsResult = await testEndpoint('GET', `/api/join/${sessionId}`);
    if (sessionDetailsResult.success) {
      log(`✅ PASS: Session details retrieved\n`, 'green');
      passed++;

      // Test 5c: Add Recipient
      log('Test 5c: Add Recipient to Session', 'yellow');
      const addRecipientResult = await testEndpoint('POST', `/api/join/${sessionId}/add`, {
        address: '0x70997970C51812e339d9B73b0245ad59e1ffe47e',
        name: 'Test Recipient',
        joinMethod: 'qr'
      });
      if (addRecipientResult.success) {
        log(`✅ PASS: Recipient added\n`, 'green');
        passed++;

        // Test 5d: Get Recipients
        log('Test 5d: Get Session Recipients', 'yellow');
        const recipientsResult = await testEndpoint('GET', `/api/join/${sessionId}/recipients`);
        if (recipientsResult.success) {
          log(`✅ PASS: Recipients retrieved (${recipientsResult.data.total} recipient(s))\n`, 'green');
          passed++;

          // Test 5e: Close Session
          log('Test 5e: Close Session', 'yellow');
          const closeSessionResult = await testEndpoint('POST', `/api/join/${sessionId}/close`, {
            creatorAddress: '0x742d35Cc6634C0532925a3b844Bc390e61f5A3ac'
          });
          if (closeSessionResult.success) {
            log(`✅ PASS: Session closed\n`, 'green');
            passed++;
          } else {
            log(`❌ FAIL: ${closeSessionResult.error || 'Session close failed'}\n`, 'red');
            failed++;
          }
        } else {
          log(`❌ FAIL: ${recipientsResult.error || 'Get recipients failed'}\n`, 'red');
          failed++;
        }
      } else {
        log(`❌ FAIL: ${addRecipientResult.error || 'Add recipient failed'}\n`, 'red');
        failed++;
      }
    } else {
      log(`❌ FAIL: ${sessionDetailsResult.error || 'Get session failed'}\n`, 'red');
      failed++;
    }
  } else {
    log(`❌ FAIL: ${createSessionResult.error || 'Session creation failed'}\n`, 'red');
    failed++;
  }

  // Test 6: QR Code Generation
  log('Test 6: QR Code Generation', 'yellow');
  const qrResult = await testEndpoint('POST', '/api/qr', {
    data: 'https://flashpay.app/test'
  });
  if (qrResult.success) {
    log(`✅ PASS: QR code generated\n`, 'green');
    passed++;
  } else {
    log(`❌ FAIL: ${qrResult.error || 'QR generation failed'}\n`, 'red');
    failed++;
  }

  // Summary
  log('\n' + '='.repeat(50), 'bold');
  log(`Test Summary: ${colors.green}${passed} passed${colors.reset}, ${colors.red}${failed} failed${colors.reset}`, 'bold');
  log('='.repeat(50) + '\n', 'bold');

  if (failed === 0) {
    log('✅ All tests passed! Backend is fully integrated.\n', 'green');
    process.exit(0);
  } else {
    log(`⚠️  ${failed} test(s) failed. Check backend configuration.\n`, 'red');
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  log(`\n❌ Fatal error: ${error.message}\n`, 'red');
  process.exit(1);
});
