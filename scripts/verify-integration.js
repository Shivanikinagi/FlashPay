#!/usr/bin/env node

/**
 * VoidTx Integration Verification Script
 * Tests backend-frontend integration
 */

const http = require('http');
const path = require('path');
const fs = require('fs');

const BACKEND_URL = 'http://localhost:3001';
const TIMEOUT = 5000;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function checkBackendHealth() {
  return new Promise((resolve) => {
    const request = http.get(BACKEND_URL + '/health', { timeout: TIMEOUT }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ success: true, data: json });
        } catch {
          resolve({ success: false, error: 'Invalid JSON response' });
        }
      });
    }).on('error', (err) => {
      resolve({ success: false, error: err.message });
    });
    
    request.on('timeout', () => {
      request.destroy();
      resolve({ success: false, error: 'Request timeout' });
    });
  });
}

async function checkContractStats() {
  return new Promise((resolve) => {
    const request = http.get(BACKEND_URL + '/api/stats', { timeout: TIMEOUT }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ success: true, data: json });
        } catch {
          resolve({ success: false, error: 'Invalid JSON response' });
        }
      });
    }).on('error', (err) => {
      resolve({ success: false, error: err.message });
    });
    
    request.on('timeout', () => {
      request.destroy();
      resolve({ success: false, error: 'Request timeout' });
    });
  });
}

function checkFiles() {
  const filesToCheck = [
    'frontend-utils/apiClient.js',
    'frontend-utils/VoidTxApp.jsx',
    'frontend-utils/BatchPaymentForm.jsx',
    'frontend-utils/TransactionStatus.jsx',
    '.env.local',
    '.env.example',
    'BACKEND_FRONTEND_INTEGRATION.md',
    'INTEGRATION_QUICK_START.md',
  ];

  const results = {};
  for (const file of filesToCheck) {
    const fullPath = path.join(__dirname, '..', file);
    results[file] = fs.existsSync(fullPath);
  }
  return results;
}

async function main() {
  log('\n╔════════════════════════════════════════════════════════════╗', 'blue');
  log('║  VoidTx Backend-Frontend Integration Verification         ║', 'blue');
  log('╚════════════════════════════════════════════════════════════╝\n', 'blue');

  // Check files
  log('📁 Checking Integration Files...', 'blue');
  const files = checkFiles();
  let allFilesPresent = true;
  for (const [file, exists] of Object.entries(files)) {
    if (exists) {
      log(`  ✓ ${file}`, 'green');
    } else {
      log(`  ✗ ${file} (missing)`, 'red');
      allFilesPresent = false;
    }
  }

  // Check backend
  log('\n🔌 Checking Backend Connectivity...', 'blue');
  const health = await checkBackendHealth();
  if (health.success) {
    log('  ✓ Backend is running', 'green');
    log(`    Service: ${health.data.service}`, 'green');
    log(`    Version: ${health.data.version}`, 'green');
  } else {
    log(`  ✗ Backend not responding: ${health.error}`, 'red');
    log(`    Make sure to run: npm run backend`, 'yellow');
  }

  // Check contract stats
  if (health.success) {
    log('\n📊 Checking Contract Connection...', 'blue');
    const stats = await checkContractStats();
    if (stats.success) {
      log('  ✓ Contract is initialized', 'green');
      log(`    Address: ${stats.data.contractAddress}`, 'green');
      log(`    Total Payments: ${stats.data.totalPaymentsProcessed}`, 'green');
      log(`    Volume: ${stats.data.totalVolumeProcessed} ETH`, 'green');
    } else {
      log(`  ✗ Contract error: ${stats.error}`, 'red');
      log(`    Check CONTRACT_ADDRESS in backend .env`, 'yellow');
    }
  }

  // Check environment
  log('\n⚙️  Checking Environment Variables...', 'blue');
  const envLocalPath = path.join(__dirname, '..', '.env.local');
  try {
    const envLocal = fs.readFileSync(envLocalPath, 'utf8');
    const hasApiUrl = envLocal.includes('VITE_API_URL');
    
    if (hasApiUrl) {
      log('  ✓ .env.local is configured', 'green');
    } else {
      log('  ✗ .env.local missing VITE_API_URL', 'red');
    }
  } catch (err) {
    log(`  ✗ .env.local not found: ${err.message}`, 'red');
  }

  // Summary
  log('\n╔════════════════════════════════════════════════════════════╗', 'blue');
  if (allFilesPresent && health.success) {
    log('║  ✓ Integration Ready! Start with:                         ║', 'green');
    log('║    Terminal 1: npm run backend                            ║', 'green');
    log('║    Terminal 2: npm run dev                                ║', 'green');
  } else {
    log('║  ✗ Integration Issues Found - See Above                  ║', 'red');
  }
  log('╚════════════════════════════════════════════════════════════╝\n', 'blue');
}

main().catch(console.error);
