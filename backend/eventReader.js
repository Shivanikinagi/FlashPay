const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

/**
 * Helper script to read and parse VoidTx contract events
 * Useful for tracking payment history and debugging
 */

class EventReader {
  constructor() {
    this.loadContract();
  }

  loadContract() {
    try {
      // Load ABI
      const abiPath = path.join(__dirname, "..", "deployments", "VoidTx-ABI.json");
      this.contractABI = JSON.parse(fs.readFileSync(abiPath, "utf8"));

      // Get contract address
      this.contractAddress = process.env.CONTRACT_ADDRESS;
      
      if (!this.contractAddress) {
        const deploymentPath = path.join(
          __dirname,
          "..",
          "deployments",
          "monadTestnet-deployment.json"
        );
        
        if (fs.existsSync(deploymentPath)) {
          const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
          this.contractAddress = deployment.contractAddress;
        }
      }

      // Initialize provider
      const rpcUrl = process.env.MONAD_RPC_URL || "https://testnet.monadvision.com/rpc";
      this.provider = new ethers.JsonRpcProvider(rpcUrl);

      // Initialize contract
      this.contract = new ethers.Contract(
        this.contractAddress,
        this.contractABI,
        this.provider
      );

      console.log("✅ Contract loaded:", this.contractAddress);
    } catch (error) {
      console.error("❌ Error loading contract:", error.message);
      process.exit(1);
    }
  }

  async getBatchPayments(fromBlock = 0, toBlock = "latest") {
    console.log("\n📦 Fetching Batch Payment Events...\n");

    const events = await this.contract.queryFilter(
      this.contract.filters.BatchPaymentInitiated(),
      fromBlock,
      toBlock
    );

    console.log(`Found ${events.length} batch payment(s)\n`);

    events.forEach((event, index) => {
      console.log(`Batch #${index + 1}`);
      console.log(`  Sender: ${event.args.sender}`);
      console.log(`  Recipients: ${event.args.totalRecipients}`);
      console.log(`  Total Amount: ${ethers.formatEther(event.args.totalAmount)} ETH`);
      console.log(`  Block: ${event.blockNumber}`);
      console.log(`  Tx Hash: ${event.transactionHash}`);
      console.log(`  Timestamp: ${new Date(Number(event.args.timestamp) * 1000).toISOString()}`);
      console.log("");
    });

    return events;
  }

  async getSuccessfulPayments(fromBlock = 0, toBlock = "latest") {
    console.log("\n✅ Fetching Successful Payments...\n");

    const events = await this.contract.queryFilter(
      this.contract.filters.PaymentSuccess(),
      fromBlock,
      toBlock
    );

    console.log(`Found ${events.length} successful payment(s)\n`);

    events.forEach((event, index) => {
      console.log(`Payment #${index + 1}`);
      console.log(`  From: ${event.args.sender}`);
      console.log(`  To: ${event.args.recipient}`);
      console.log(`  Amount: ${ethers.formatEther(event.args.amount)} ETH`);
      console.log(`  Index: ${event.args.index}`);
      console.log(`  Block: ${event.blockNumber}`);
      console.log(`  Tx Hash: ${event.transactionHash}`);
      console.log("");
    });

    return events;
  }

  async getFailedPayments(fromBlock = 0, toBlock = "latest") {
    console.log("\n❌ Fetching Failed Payments...\n");

    const events = await this.contract.queryFilter(
      this.contract.filters.PaymentFailed(),
      fromBlock,
      toBlock
    );

    if (events.length === 0) {
      console.log("No failed payments found.\n");
      return events;
    }

    console.log(`Found ${events.length} failed payment(s)\n`);

    events.forEach((event, index) => {
      console.log(`Failed Payment #${index + 1}`);
      console.log(`  From: ${event.args.sender}`);
      console.log(`  To: ${event.args.recipient}`);
      console.log(`  Amount: ${ethers.formatEther(event.args.amount)} ETH`);
      console.log(`  Reason: ${event.args.reason}`);
      console.log(`  Index: ${event.args.index}`);
      console.log(`  Block: ${event.blockNumber}`);
      console.log(`  Tx Hash: ${event.transactionHash}`);
      console.log("");
    });

    return events;
  }

  async getCompletedBatches(fromBlock = 0, toBlock = "latest") {
    console.log("\n🎉 Fetching Completed Batches...\n");

    const events = await this.contract.queryFilter(
      this.contract.filters.BatchPaymentCompleted(),
      fromBlock,
      toBlock
    );

    console.log(`Found ${events.length} completed batch(es)\n`);

    events.forEach((event, index) => {
      console.log(`Completed Batch #${index + 1}`);
      console.log(`  Sender: ${event.args.sender}`);
      console.log(`  Successful: ${event.args.successCount}`);
      console.log(`  Failed: ${event.args.failureCount}`);
      console.log(`  Total Processed: ${ethers.formatEther(event.args.totalProcessed)} ETH`);
      console.log(`  Block: ${event.blockNumber}`);
      console.log(`  Tx Hash: ${event.transactionHash}`);
      console.log("");
    });

    return events;
  }

  async getAllEvents(fromBlock = 0, toBlock = "latest") {
    console.log("\n📊 Fetching All Events...\n");

    const [batch, success, failed, completed] = await Promise.all([
      this.getBatchPayments(fromBlock, toBlock),
      this.getSuccessfulPayments(fromBlock, toBlock),
      this.getFailedPayments(fromBlock, toBlock),
      this.getCompletedBatches(fromBlock, toBlock)
    ]);

    console.log("\n📈 Summary:");
    console.log(`  Batch Initiations: ${batch.length}`);
    console.log(`  Successful Payments: ${success.length}`);
    console.log(`  Failed Payments: ${failed.length}`);
    console.log(`  Completed Batches: ${completed.length}`);
    console.log("");

    return { batch, success, failed, completed };
  }

  async getStats() {
    console.log("\n📊 Contract Statistics...\n");

    const stats = await this.contract.getStats();
    
    console.log(`Total Payments Processed: ${stats[0]}`);
    console.log(`Total Volume: ${ethers.formatEther(stats[1])} ETH`);
    console.log("");
  }

  async monitorEvents() {
    console.log("\n👀 Monitoring events in real-time...");
    console.log("Press Ctrl+C to stop\n");

    // Listen to all events
    this.contract.on("BatchPaymentInitiated", (sender, totalRecipients, totalAmount, timestamp, event) => {
      console.log("\n🆕 New Batch Payment Initiated:");
      console.log(`  Sender: ${sender}`);
      console.log(`  Recipients: ${totalRecipients}`);
      console.log(`  Total: ${ethers.formatEther(totalAmount)} ETH`);
      console.log(`  Tx: ${event.log.transactionHash}`);
    });

    this.contract.on("PaymentSuccess", (sender, recipient, amount, index, event) => {
      console.log("\n✅ Payment Success:");
      console.log(`  To: ${recipient}`);
      console.log(`  Amount: ${ethers.formatEther(amount)} ETH`);
    });

    this.contract.on("PaymentFailed", (sender, recipient, amount, index, reason, event) => {
      console.log("\n❌ Payment Failed:");
      console.log(`  To: ${recipient}`);
      console.log(`  Amount: ${ethers.formatEther(amount)} ETH`);
      console.log(`  Reason: ${reason}`);
    });

    this.contract.on("BatchPaymentCompleted", (sender, successCount, failureCount, totalProcessed, event) => {
      console.log("\n🎉 Batch Completed:");
      console.log(`  Success: ${successCount}`);
      console.log(`  Failed: ${failureCount}`);
      console.log(`  Processed: ${ethers.formatEther(totalProcessed)} ETH`);
    });
  }
}

// CLI Interface
async function main() {
  const reader = new EventReader();
  
  const args = process.argv.slice(2);
  const command = args[0] || "all";

  switch (command) {
    case "batch":
      await reader.getBatchPayments();
      break;
    
    case "success":
      await reader.getSuccessfulPayments();
      break;
    
    case "failed":
      await reader.getFailedPayments();
      break;
    
    case "completed":
      await reader.getCompletedBatches();
      break;
    
    case "stats":
      await reader.getStats();
      break;
    
    case "monitor":
      await reader.monitorEvents();
      break;
    
    case "all":
    default:
      await reader.getAllEvents();
      await reader.getStats();
      break;
  }
}

// Run if called directly
if (require.main === module) {
  main()
    .then(() => {
      if (process.argv[2] !== "monitor") {
        process.exit(0);
      }
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = EventReader;
