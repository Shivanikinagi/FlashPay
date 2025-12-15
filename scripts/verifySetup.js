#!/usr/bin/env node

/**
 * Project Setup Verification Script
 * Checks if everything is properly configured
 */

const fs = require('fs');
const path = require('path');

console.log('\n🔍 VoidTx - Setup Verification\n');
console.log('═══════════════════════════════════════════════════════════\n');

let errors = 0;
let warnings = 0;
let success = 0;

function check(description, condition, isWarning = false) {
  if (condition) {
    console.log(`✅ ${description}`);
    success++;
  } else {
    if (isWarning) {
      console.log(`⚠️  ${description}`);
      warnings++;
    } else {
      console.log(`❌ ${description}`);
      errors++;
    }
  }
}

// Check Node.js version
const nodeVersion = process.versions.node;
const majorVersion = parseInt(nodeVersion.split('.')[0]);
check(`Node.js v${nodeVersion} (requires v16+)`, majorVersion >= 16);

// Check if package.json exists
check('package.json exists', fs.existsSync('package.json'));

// Check if node_modules exists
check('Dependencies installed (node_modules)', fs.existsSync('node_modules'), true);

// Check core files
check('Smart Contract exists (contracts/VoidTx.sol)', 
  fs.existsSync('contracts/VoidTx.sol'));

check('Deployment script exists (scripts/deploy.js)', 
  fs.existsSync('scripts/deploy.js'));

check('Test script exists (scripts/testTransaction.js)', 
  fs.existsSync('scripts/testTransaction.js'));

check('Test file exists (test/VoidTx.test.js)', 
  fs.existsSync('test/VoidTx.test.js'));

check('Backend server exists (backend/server.js)', 
  fs.existsSync('backend/server.js'));

check('Event reader exists (backend/eventReader.js)', 
  fs.existsSync('backend/eventReader.js'));

check('Hardhat config exists (hardhat.config.js)', 
  fs.existsSync('hardhat.config.js'));

// Check documentation
check('README.md exists', fs.existsSync('README.md'));
check('DEPLOYMENT.md exists', fs.existsSync('DEPLOYMENT.md'));
check('API_DOCS.md exists', fs.existsSync('API_DOCS.md'));
check('QUICKSTART.md exists', fs.existsSync('QUICKSTART.md'));

// Check .env
const envExists = fs.existsSync('.env');
check('.env file exists', envExists, true);

if (envExists) {
  const envContent = fs.readFileSync('.env', 'utf8');
  check('.env contains PRIVATE_KEY', envContent.includes('PRIVATE_KEY'), true);
  check('.env contains MONAD_RPC_URL', envContent.includes('MONAD_RPC_URL'), true);
  check('.env contains CONTRACT_ADDRESS', envContent.includes('CONTRACT_ADDRESS'), true);
} else {
  console.log('   ℹ️  Create .env from .env.example and configure it');
}

// Check .env.example
check('.env.example exists', fs.existsSync('.env.example'));

// Check .gitignore
const gitignoreExists = fs.existsSync('.gitignore');
check('.gitignore exists', gitignoreExists);

if (gitignoreExists) {
  const gitignoreContent = fs.readFileSync('.gitignore', 'utf8');
  check('.gitignore includes node_modules', gitignoreContent.includes('node_modules'));
  check('.gitignore includes .env', gitignoreContent.includes('.env'));
}

console.log('\n═══════════════════════════════════════════════════════════\n');
console.log('📊 Summary:\n');
console.log(`   ✅ Passed:   ${success}`);
console.log(`   ⚠️  Warnings: ${warnings}`);
console.log(`   ❌ Errors:   ${errors}`);
console.log('');

if (errors === 0 && warnings === 0) {
  console.log('🎉 Perfect! All checks passed.\n');
  console.log('Next steps:');
  console.log('   1. npm install (if not done)');
  console.log('   2. Configure .env file');
  console.log('   3. npm run compile');
  console.log('   4. npm test');
  console.log('   5. npm run deploy');
  console.log('');
} else if (errors === 0) {
  console.log('✅ Setup looks good! Address warnings if needed.\n');
  console.log('Warnings are typically:');
  console.log('   - Missing .env file (create from .env.example)');
  console.log('   - Missing node_modules (run npm install)');
  console.log('');
} else {
  console.log('❌ Please fix the errors above before proceeding.\n');
  process.exit(1);
}

console.log('═══════════════════════════════════════════════════════════\n');
console.log('📚 Documentation:\n');
console.log('   README.md          - Complete guide');
console.log('   DEPLOYMENT.md      - Deployment instructions');
console.log('   API_DOCS.md        - API reference');
console.log('   QUICKSTART.md      - Quick commands');
console.log('   MEMBER1_DELIVERY.md - Delivery summary');
console.log('');
console.log('═══════════════════════════════════════════════════════════\n');
