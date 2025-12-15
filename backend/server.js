const express = require("express");
const cors = require("cors");
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
const QRCode = require("qrcode");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Import QR join flow routes
const qrJoinRouter = require('./qrJoinFlow');

// Import ERC-4337 Account Abstraction routes
const aaRouter = require('./aaRoutes');

// Load contract ABI and address
let contractABI, contractAddress, provider, contract;

function initializeContract() {
  try {
    // Load ABI
    const abiPath = path.join(__dirname, "..", "deployments", "VoidTx-ABI.json");
    if (!fs.existsSync(abiPath)) {
      console.warn("⚠️  ABI file not found. Some endpoints may not work.");
      return false;
    }
    contractABI = JSON.parse(fs.readFileSync(abiPath, "utf8"));

    // Get contract address from environment or deployment file
    contractAddress = process.env.CONTRACT_ADDRESS;
    
    if (!contractAddress) {
      // Try to load from deployment file
      const network = process.env.NETWORK || "monadTestnet";
      const deploymentPath = path.join(
        __dirname,
        "..",
        "deployments",
        `${network}-deployment.json`
      );
      
      if (fs.existsSync(deploymentPath)) {
        const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
        contractAddress = deployment.contractAddress;
      }
    }

    if (!contractAddress) {
      console.warn("⚠️  Contract address not found in .env or deployment files.");
      return false;
    }

    // Initialize provider - Monad Testnet
    const rpcUrl = "https://testnet-rpc.monad.xyz";
    provider = new ethers.JsonRpcProvider(rpcUrl);

    // Initialize contract
    contract = new ethers.Contract(contractAddress, contractABI, provider);

    console.log("✅ Contract initialized:", contractAddress);
    return true;
  } catch (error) {
    console.error("❌ Error initializing contract:", error.message);
    return false;
  }
}

// ============ API Endpoints ============

/**
 * Health check endpoint
 */
app.get("/", (req, res) => {
  res.json({
    status: "online",
    service: "VoidTx Backend API",
    version: "1.0.0",
    endpoints: {
      health: "GET /health",
      stats: "GET /api/stats",
      events: "GET /api/events/:type",
      estimate: "POST /api/estimate",
      qr: "POST /api/qr",
      txStatus: "GET /api/transaction/:hash",
      joinCreate: "POST /api/join/create",
      joinAdd: "POST /api/join/:id/add",
      joinRecipients: "GET /api/join/:id/recipients",
      // ERC-4337 Account Abstraction endpoints (Gasless)
      aaHealth: "GET /api/aa/health",
      aaCreateAccount: "POST /api/aa/account/create",
      aaGetAccount: "GET /api/aa/account/:userId",
      aaGetBalance: "GET /api/aa/account/:userId/balance",
      aaGaslessBatch: "POST /api/aa/transaction/gasless-batch",
      aaDemo: "POST /api/aa/demo/gasless-payment"
    }
  });
});

// Mount QR join flow routes
app.use('/api/join', qrJoinRouter);

// Mount ERC-4337 Account Abstraction routes
app.use('/api/aa', aaRouter);

/**
 * Health check
 */
app.get("/health", (req, res) => {
  res.json({ 
    status: "healthy",
    contract: contractAddress || "not configured",
    timestamp: new Date().toISOString()
  });
});

/**
 * Get contract statistics
 */
app.get("/api/stats", async (req, res) => {
  try {
    if (!contract) {
      return res.status(503).json({ error: "Contract not initialized" });
    }

    const stats = await contract.getStats();
    
    res.json({
      totalPaymentsProcessed: stats[0].toString(),
      totalVolumeProcessed: ethers.formatEther(stats[1]),
      totalVolumeProcessedWei: stats[1].toString(),
      contractAddress: contractAddress
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get contract events
 * Types: batch, success, failed, all
 */
app.get("/api/events/:type?", async (req, res) => {
  try {
    if (!contract) {
      return res.status(503).json({ error: "Contract not initialized" });
    }

    const eventType = req.params.type || "all";
    const fromBlock = req.query.fromBlock || 0;
    const toBlock = req.query.toBlock || "latest";
    const limit = parseInt(req.query.limit) || 100;

    let events = [];

    // Fetch events based on type
    switch (eventType.toLowerCase()) {
      case "batch":
        events = await contract.queryFilter(
          contract.filters.BatchPaymentInitiated(),
          fromBlock,
          toBlock
        );
        break;
      
      case "success":
        events = await contract.queryFilter(
          contract.filters.PaymentSuccess(),
          fromBlock,
          toBlock
        );
        break;
      
      case "failed":
        events = await contract.queryFilter(
          contract.filters.PaymentFailed(),
          fromBlock,
          toBlock
        );
        break;
      
      case "completed":
        events = await contract.queryFilter(
          contract.filters.BatchPaymentCompleted(),
          fromBlock,
          toBlock
        );
        break;
      
      case "all":
      default:
        const [batch, success, failed, completed] = await Promise.all([
          contract.queryFilter(contract.filters.BatchPaymentInitiated(), fromBlock, toBlock),
          contract.queryFilter(contract.filters.PaymentSuccess(), fromBlock, toBlock),
          contract.queryFilter(contract.filters.PaymentFailed(), fromBlock, toBlock),
          contract.queryFilter(contract.filters.BatchPaymentCompleted(), fromBlock, toBlock)
        ]);
        events = [...batch, ...success, ...failed, ...completed];
        break;
    }

    // Sort by block number (newest first)
    events.sort((a, b) => b.blockNumber - a.blockNumber);

    // Limit results
    events = events.slice(0, limit);

    // Format events
    const formattedEvents = events.map(event => ({
      eventName: event.fragment.name,
      blockNumber: event.blockNumber,
      transactionHash: event.transactionHash,
      args: formatEventArgs(event.args),
      timestamp: event.args.timestamp ? new Date(Number(event.args.timestamp) * 1000).toISOString() : null
    }));

    res.json({
      total: formattedEvents.length,
      events: formattedEvents
    });
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Estimate batch payment cost
 */
app.post("/api/estimate", async (req, res) => {
  try {
    if (!contract) {
      return res.status(503).json({ error: "Contract not initialized" });
    }

    const { payments } = req.body;

    if (!payments || !Array.isArray(payments)) {
      return res.status(400).json({ error: "Invalid payments array" });
    }

    // Validate payments
    for (const payment of payments) {
      if (!payment.recipient || !payment.amount) {
        return res.status(400).json({ 
          error: "Each payment must have recipient and amount" 
        });
      }
    }

    // Format payments for contract
    const formattedPayments = payments.map(p => ({
      recipient: p.recipient,
      amount: ethers.parseEther(p.amount.toString())
    }));

    // Get estimate
    const totalCost = await contract.estimateBatchCost(formattedPayments);

    // Estimate gas
    let gasEstimate = "N/A";
    try {
      const gas = await contract.batchPay.estimateGas(formattedPayments, {
        value: totalCost
      });
      gasEstimate = gas.toString();
    } catch (e) {
      console.warn("Could not estimate gas:", e.message);
    }

    res.json({
      totalCost: ethers.formatEther(totalCost),
      totalCostWei: totalCost.toString(),
      gasEstimate: gasEstimate,
      recipientCount: payments.length
    });
  } catch (error) {
    console.error("Error estimating cost:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get transaction status and details
 */
app.get("/api/transaction/:hash", async (req, res) => {
  try {
    if (!provider) {
      return res.status(503).json({ error: "Provider not initialized" });
    }

    const txHash = req.params.hash;
    const receipt = await provider.getTransactionReceipt(txHash);

    if (!receipt) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    const transaction = await provider.getTransaction(txHash);

    res.json({
      hash: txHash,
      status: receipt.status === 1 ? "success" : "failed",
      blockNumber: receipt.blockNumber,
      from: receipt.from,
      to: receipt.to,
      gasUsed: receipt.gasUsed.toString(),
      value: ethers.formatEther(transaction.value),
      confirmations: receipt.confirmations
    });
  } catch (error) {
    console.error("Error fetching transaction:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Generate QR code for joining VoidTx
 */
app.post("/api/qr", async (req, res) => {
  try {
    const { data, type = "text" } = req.body;

    if (!data) {
      return res.status(400).json({ error: "Data is required" });
    }

    let qrData = data;

    // If type is 'join', create a join link
    if (type === "join") {
      const baseUrl = req.body.baseUrl || "https://voidtx.app";
      qrData = `${baseUrl}/join?contract=${contractAddress}&network=monad-testnet`;
    }

    // Generate QR code as data URL
    const qrCode = await QRCode.toDataURL(qrData, {
      width: 300,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF"
      }
    });

    res.json({
      qrCode: qrCode,
      data: qrData
    });
  } catch (error) {
    console.error("Error generating QR code:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============ Helper Functions ============

function formatEventArgs(args) {
  const formatted = {};
  for (const key in args) {
    if (isNaN(key)) {
      const value = args[key];
      if (typeof value === "bigint") {
        formatted[key] = value.toString();
      } else {
        formatted[key] = value;
      }
    }
  }
  return formatted;
}

// ============ Start Server ============

const contractInitialized = initializeContract();

// Global error handlers
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  console.error('Stack:', error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
});

app.listen(PORT, () => {
  console.log("\n🚀 VoidTx Backend Server");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📝 Contract: ${contractAddress || "not configured"}`);
  console.log(`🔗 Status: ${contractInitialized ? "✅ Ready" : "⚠️  Limited functionality"}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  
  if (!contractInitialized) {
    console.log("⚠️  To enable full functionality:");
    console.log("   1. Deploy the contract: npm run deploy");
    console.log("   2. Update CONTRACT_ADDRESS in .env file\n");
  }
});

module.exports = app;
