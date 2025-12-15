const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Script to interact with deployed FlashPay contract
 * Performs test transactions with sample data
 */
async function main() {
  console.log("🧪 Starting FlashPay Test Transaction...\n");

  // Load deployment info
  const deploymentFile = path.join(
    __dirname,
    "..",
    "deployments",
    `${hre.network.name}-deployment.json`
  );

  if (!fs.existsSync(deploymentFile)) {
    console.error("❌ Deployment file not found!");
    console.error("Please deploy the contract first using: npm run deploy");
    process.exit(1);
  }

  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
  const contractAddress = deploymentInfo.contractAddress;

  console.log("📋 Test Details:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`Network: ${hre.network.name}`);
  console.log(`Contract: ${contractAddress}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Get contract instance
  const FlashPay = await hre.ethers.getContractFactory("FlashPay");
  const flashPay = FlashPay.attach(contractAddress);

  // Get signer
  const [sender] = await hre.ethers.getSigners();
  const senderAddress = await sender.getAddress();
  console.log(`Sender: ${senderAddress}\n`);

  // Generate 5-10 test recipient addresses
  const numRecipients = 7; // You can change this between 5-10
  const recipients = [];
  const baseAmount = hre.ethers.parseEther("0.001"); // 0.001 ETH per recipient

  console.log(`📝 Generating ${numRecipients} test recipients...\n`);

  for (let i = 0; i < numRecipients; i++) {
    // Create random wallet for testing
    const wallet = hre.ethers.Wallet.createRandom();
    const amount = baseAmount * BigInt(i + 1); // Varying amounts
    
    recipients.push({
      recipient: wallet.address,
      amount: amount
    });

    console.log(`${i + 1}. ${wallet.address}`);
    console.log(`   Amount: ${hre.ethers.formatEther(amount)} ETH`);
  }

  // Calculate total
  const totalAmount = recipients.reduce(
    (sum, r) => sum + r.amount,
    0n
  );

  console.log("\n💰 Total Amount:", hre.ethers.formatEther(totalAmount), "ETH");

  // Estimate gas
  console.log("\n⛽ Estimating gas...");
  try {
    const gasEstimate = await flashPay.batchPay.estimateGas(recipients, {
      value: totalAmount
    });
    console.log(`Estimated gas: ${gasEstimate.toString()}`);
  } catch (error) {
    console.log("⚠️  Gas estimation failed:", error.message);
  }

  // Check balance
  const balance = await hre.ethers.provider.getBalance(senderAddress);
  console.log(`\n💵 Sender balance: ${hre.ethers.formatEther(balance)} ETH`);

  if (balance < totalAmount) {
    console.error("\n❌ Insufficient balance for test transaction!");
    console.error(`Required: ${hre.ethers.formatEther(totalAmount)} ETH`);
    console.error(`Available: ${hre.ethers.formatEther(balance)} ETH`);
    process.exit(1);
  }

  // Send batch payment
  console.log("\n🚀 Sending batch payment...");
  try {
    const tx = await flashPay.batchPay(recipients, {
      value: totalAmount
    });

    console.log(`📨 Transaction sent: ${tx.hash}`);
    console.log("⏳ Waiting for confirmation...");

    const receipt = await tx.wait();
    console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);

    // Parse events
    console.log("\n📊 Transaction Results:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    let successCount = 0;
    let failureCount = 0;

    receipt.logs.forEach((log) => {
      try {
        const parsedLog = flashPay.interface.parseLog({
          topics: log.topics,
          data: log.data
        });

        if (parsedLog) {
          if (parsedLog.name === "PaymentSuccess") {
            successCount++;
            console.log(`✅ Success: ${parsedLog.args.recipient}`);
            console.log(`   Amount: ${hre.ethers.formatEther(parsedLog.args.amount)} ETH`);
          } else if (parsedLog.name === "PaymentFailed") {
            failureCount++;
            console.log(`❌ Failed: ${parsedLog.args.recipient}`);
            console.log(`   Amount: ${hre.ethers.formatEther(parsedLog.args.amount)} ETH`);
            console.log(`   Reason: ${parsedLog.args.reason}`);
          } else if (parsedLog.name === "BatchPaymentCompleted") {
            console.log("\n📈 Batch Summary:");
            console.log(`   Successful: ${parsedLog.args.successCount}`);
            console.log(`   Failed: ${parsedLog.args.failureCount}`);
            console.log(`   Total Processed: ${hre.ethers.formatEther(parsedLog.args.totalProcessed)} ETH`);
          }
        }
      } catch (e) {
        // Skip logs that aren't from our contract
      }
    });

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // Get updated stats
    const stats = await flashPay.getStats();
    console.log("\n📊 Contract Statistics:");
    console.log(`   Total Payments: ${stats[0]}`);
    console.log(`   Total Volume: ${hre.ethers.formatEther(stats[1])} ETH`);

    console.log("\n✅ Test transaction completed successfully!");

  } catch (error) {
    console.error("\n❌ Transaction failed:", error.message);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
