# ⚡ FlashPay - Batch Payment System

Send crypto to multiple recipients in ONE transaction. Save 70% on gas fees.

## What It Does

FlashPay lets you pay up to 100 people in a single transaction instead of sending 100 separate transactions. If any payment fails, it continues with the rest and refunds you automatically.

**Use Cases:** Payroll, airdrops, prize distributions, DAO payments

## Key Features

- ⚡ **70% Gas Savings** - Batch 100 payments for the cost of ~3 individual transfers
- 🛡️ **Fault Tolerant** - Failed payments don't stop the batch
- 💰 **Auto Refunds** - Failed amounts returned automatically
- 📊 **Production Ready** - 20+ tests passing, REST API included
- 🔗 **Multi-chain Support** - Monad Testnet, Sepolia, Ethereum, Polygon, Arbitrum, etc.
- 🆕 **Gasless Transactions** - ERC-4337 Account Abstraction for zero gas fees

---

## 📁 Project Structure

```
flashpay/
├── contracts/
│   ├── FlashPay.sol              # Main batch payment contract
│   └── test/
│       └── RejectPayment.sol     # Test helper contract
├── scripts/
│   ├── deploy.js                 # Deployment script for Monad Testnet
│   └── testTransaction.js        # Test batch payments with sample data
├── backend/
│   ├── server.js                 # Express API server
│   ├── aaRoutes.js               # ERC-4337 Account Abstraction endpoints
│   ├── accountAbstractionService.js # Gasless transaction service
│   └── eventReader.js            # Event monitoring utility
├── frontend-utils/
│   ├── FlashPayApp.jsx           # Main React application
│   ├── BatchPaymentForm.jsx      # Payment form component
│   ├── WalletConnector.jsx       # Wallet connection utilities
│   ├── csvParser.js              # CSV upload processor
│   ├── templates.js              # Payment templates
│   └── dashboard.js              # Analytics dashboard
├── deployments/                  # Deployment artifacts (auto-generated)
├── hardhat.config.js             # Hardhat configuration
├── package.json                  # Dependencies
└── .env.example                  # Environment variables template
```

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your private key and RPC URL

# Deploy to Monad Testnet
npm run deploy-monad

# Test with sample transactions
npm run test-transaction-monad

# Start API server
npm run backend

# Start frontend (in a new terminal)
npm run dev
```

---

## 📊 Smart Contract

**Main Function:**
```solidity
batchPay(Payment[] payments) 
// Send to multiple recipients in one transaction
```

**Features:**
- Validates inputs (max 100 recipients, min 0.0001 ETH per payment)
- Continues processing even if individual payments fail
- Auto-refunds failed amounts
- Emits detailed events for tracking

**Events:**
- `BatchPaymentInitiated` - Batch started
- `PaymentSuccess` - Individual payment succeeded
- `PaymentFailed` - Individual payment failed
- `BatchPaymentCompleted` - Batch finished

---

## 🔌 API Endpoints

Start server: `npm run backend` (runs on port 3001)

### Core Endpoints
- `GET /health` - Health check
- `GET /api/stats` - Contract statistics
- `GET /api/events/:type` - Query payment events
- `POST /api/estimate` - Estimate batch cost
- `GET /api/transaction/:hash` - Transaction status
- `POST /api/qr` - Generate QR code

### Account Abstraction (Gasless Transactions)
- `GET /api/aa/health` - AA service health check
- `POST /api/aa/account/create` - Create Smart Account
- `GET /api/aa/account/:userId` - Get Smart Account address
- `GET /api/aa/account/:userId/balance` - Check balance
- `POST /api/aa/transaction/gasless-batch` - Execute gasless payment
- `POST /api/aa/demo/gasless-payment` - Demo full flow

**Example:**
```bash
curl http://localhost:3001/api/stats
```

---

## 🧪 Testing

```bash
npm test  # Run all tests
```

Tests cover:
- Batch payments (5-10 recipients)
- Error handling
- Event emission
- Gas estimation
- Edge cases

---

## 🔐 Environment Setup

Create `.env` file:
```env
# Monad Testnet Configuration
MONAD_RPC_URL=https://testnet.monadvision.com/rpc
PRIVATE_KEY=your_wallet_private_key

# ERC-4337 Account Abstraction (for gasless transactions)
PIMLICO_API_KEY=your_pimlico_api_key
BUNDLER_OWNER_PRIVATE_KEY=private_key_for_bundler

# Backend Server Configuration
PORT=3001
CONTRACT_ADDRESS=deployed_contract_address
NETWORK=monadTestnet
```

**Get free Monad Testnet setup:**
1. RPC URL: https://testnet.monad.xyz/rpc
2. Test ETH: Request from Monad Discord

**For Gasless Transactions:**
1. Get Pimlico API key: https://dashboard.pimlico.io/
2. Generate a new private key for BUNDLER_OWNER_PRIVATE_KEY

---

## 🛠️ Commands

```bash
npm install              # Install dependencies
npm run compile         # Compile contract
npm run deploy-monad    # Deploy to Monad Testnet
npm run deploy          # Deploy to Sepolia
npm test                # Run tests
npm run backend         # Start API server
npm run dev             # Start frontend
npm run check-balance   # Check wallet balance
npm run test-transaction # Send test batch
```

## 🆕 Gasless Transactions (ERC-4337)

FlashPay supports gasless transactions using Account Abstraction:

1. Users create Smart Accounts (ERC-4337 compatible)
2. Transactions are sponsored by a Paymaster (Pimlico)
3. No gas fees for end users
4. Fully decentralized and secure

**Benefits:**
- Zero gas fees for users
- Improved UX for onboarding
- Enterprise-grade security
- Compatible with all EVM chains

---
## 📱 Advanced Features

### CSV Upload
Import recipient lists from CSV files for easy bulk payments.

### Payment Templates
Predefined templates for common scenarios:
- Split Equally
- Fixed Amount

---

## 🌐 Supported Networks

| Network | Chain ID | RPC URL | Explorer |
|---------|----------|---------|----------|
| Monad Testnet | 10143 | https://testnet.monad.xyz/rpc | https://testnet.monadvision.com |
| Sepolia | 11155111 | https://rpc.sepolia.org | https://sepolia.etherscan.io |

---

## 📄 License

MIT

---

