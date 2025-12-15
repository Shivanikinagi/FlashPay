# ERC-4337 Account Abstraction Setup Guide

## ✅ What You're Getting

- **Standard**: ERC-4337 Account Abstraction
- **Paymaster**: Pimlico (sponsors gas fees)
- **Bundler**: Pimlico (submits UserOperations)
- **Network**: Sepolia Testnet
- **100% Decentralized**: No custodial services

---

## 🚀 Quick Setup (3 Steps)

### Step 1: Get Pimlico API Key

1. Go to https://dashboard.pimlico.io/
2. Sign up (free for testnet)
3. Create a new API key
4. Copy the key

### Step 2: Install Dependencies

```powershell
npm install permissionless viem
```

### Step 3: Configure Environment

Create/update `.env` file:

```env
# Pimlico API Key (get from https://dashboard.pimlico.io/)
PIMLICO_API_KEY=your_pimlico_api_key_here

# Generate a random private key (DO NOT use one with real funds!)
BUNDLER_OWNER_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# Optional: Infura for RPC (or use public)
INFURA_API_KEY=your_infura_key_here
```

**Generate a random private key:**
```powershell
node -e "console.log('0x' + require('crypto').randomBytes(32).toString('hex'))"
```

---

## 🧪 Test the Integration

```powershell
npm run dev:backend
```

Then test:

```powershell
# Health check
curl http://localhost:3001/api/aa/health

# Create Smart Account
curl -X POST http://localhost:3001/api/aa/account/create `
  -H "Content-Type: application/json" `
  -d '{"userId": "test-user-1"}'

# Execute gasless payment
curl -X POST http://localhost:3001/api/aa/transaction/gasless-batch `
  -H "Content-Type: application/json" `
  -d '{
    "userId": "test-user-1",
    "payments": [
      {
        "recipient": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
        "amount": "0.001"
      }
    ]
  }'
```

---

## 📡 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/aa/health` | GET | Service health check |
| `/api/aa/account/create` | POST | Create Smart Account |
| `/api/aa/account/:userId` | GET | Get Smart Account address |
| `/api/aa/account/:userId/balance` | GET | Get account balance |
| `/api/aa/transaction/gasless-batch` | POST | Execute gasless payment |
| `/api/aa/demo/gasless-payment` | POST | Full demo flow |

---

## 🎯 How It Works

### Traditional Transaction:
```
User signs TX → Pays gas → Blockchain
```

### ERC-4337 with Paymaster:
```
User signs UserOperation → Bundler → Paymaster pays gas → Blockchain
                                      ↑
                                Zero cost to user!
```

### Architecture:
```
User Request
    ↓
Express API (/api/aa/*)
    ↓
Account Abstraction Service
    ↓
Permissionless SDK
    ├── Smart Account (ERC-4337)
    ├── Pimlico Bundler
    └── Pimlico Paymaster ⛽
        ↓
    Sepolia Testnet
        ↓
    VoidTx Contract
```

---

## ✅ Advantages Over Circle

1. **Open Standard**: ERC-4337 is an Ethereum standard
2. **Decentralized**: No single point of failure
3. **Portable**: Works with any ERC-4337 infrastructure
4. **Future-Proof**: Ethereum's official account abstraction
5. **No Vendor Lock-In**: Switch providers easily
6. **Lower Complexity**: No entity secrets or registration

---

## 🔑 Key Features

### For Users:
- ✅ Zero gas fees (Paymaster sponsored)
- ✅ Smart Account (programmable)
- ✅ Standard Ethereum addresses
- ✅ Works with any dApp

### For Builders:
- ✅ No custodial concerns
- ✅ Industry standard
- ✅ Multiple provider options
- ✅ Better for hackathons/demos
- ✅ Open source ecosystem

---

## 💡 Important Notes

### Smart Account Creation:
- Uses deterministic addresses based on userId
- No manual wallet funding needed for gas
- User needs ETH only for payment amounts

### Pimlico Limits:
- Free tier: Limited operations per month
- Testnet: Usually generous limits
- Production: Paid plans available

### Security:
- ⚠️ `BUNDLER_OWNER_PRIVATE_KEY` is for signing only
- ⚠️ Never use keys with real funds
- ✅ Each user gets their own Smart Account
- ✅ User signatures required for operations

---

## 🐛 Troubleshooting

### "Missing PIMLICO_API_KEY"
→ Add to `.env` from https://dashboard.pimlico.io/

### "Invalid private key"
→ Generate new one: `node -e "console.log('0x' + require('crypto').randomBytes(32).toString('hex'))"`

### "Paymaster rejected"
→ Check Pimlico dashboard for limits/quotas

### "Insufficient funds"
→ Smart Account needs ETH for payment amounts (not gas!)

---

## 📚 Resources

- **Pimlico Dashboard**: https://dashboard.pimlico.io/
- **ERC-4337 Docs**: https://eips.ethereum.org/EIPS/eip-4337
- **Permissionless.js**: https://docs.pimlico.io/permissionless
- **Viem Docs**: https://viem.sh/
- **Sepolia Faucet**: https://sepoliafaucet.com/

---

## 🎉 Success Criteria

You've successfully integrated ERC-4337 when:

✅ Users create Smart Accounts with one API call  
✅ Batch payments execute without users paying gas  
✅ Paymaster sponsors all transaction costs  
✅ UserOperations are signed by users  
✅ Transactions confirmed on Sepolia  
✅ Standard ERC-4337 compliance

**Result**: Fully decentralized gasless VoidTx using open standards! 🚀
