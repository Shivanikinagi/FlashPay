const hre = require("hardhat");
const { ethers } = require("ethers");

/**
 * Test transaction with 3 recipients and equal split
 */
async function main() {
  try {
    console.log("\n🧪 FlashPay Test - 3 Recipients Equal Split");
    console.log("═══════════════════════════════════════════════════\n");

    // Your wallet address
    const walletAddress = "0x47206534a491157a972f664Fb99d14Dc96F19749";

    // Test recipient addresses (using different test addresses)
    const recipients = [
      {
        address: "0x1111111111111111111111111111111111111111",
        name: "Test Recipient 1"
      },
      {
        address: "0x2222222222222222222222222222222222222222",
        name: "Test Recipient 2"
      },
      {
        address: "0x3333333333333333333333333333333333333333",
        name: "Test Recipient 3"
      }
    ];

    // Contract details (Sepolia address)
    const CONTRACT_ADDRESS = "0xA7ccfE1D291D0f7d12FE9cc2Fc88581D918FD62d";
    const CONTRACT_ABI = require("../deployments/FlashPay-ABI.json");

    // Get signer from private key - use Sepolia (Monad RPC is currently down)
    const rpcUrl = process.env.SEPOLIA_RPC_URL || "https://eth-sepolia.g.alchemy.com/v2/demo";
    const provider = new hre.ethers.JsonRpcProvider(rpcUrl);
    const signer = new hre.ethers.Wallet(process.env.PRIVATE_KEY, provider);

    console.log(`📍 Wallet Address: ${signer.address}`);
    console.log(`📍 Expected Address: ${walletAddress}`);

    // Get wallet balance
    const balance = await provider.getBalance(signer.address);
    console.log(`\n💰 Wallet Balance: ${ethers.formatEther(balance)} MON\n`);

    if (balance === 0n) {
      console.error("❌ Wallet has no balance! Please fund it first.\n");
      return;
    }

    // Create contract instance
    const contract = new ethers.Contract(
      CONTRACT_ADDRESS,
      CONTRACT_ABI,
      signer
    );

    // Test amounts - 0.1 MON total, split 3 ways = 0.0333... per recipient
    const amountPerRecipient = ethers.parseEther("0.1");
    const totalAmount = amountPerRecipient * 3n;

    console.log("📋 Recipients:");
    recipients.forEach((r, idx) => {
      console.log(`   ${idx + 1}. ${r.name}`);
      console.log(`      Address: ${r.address}`);
    });

    console.log(`\n💸 Payment Details:`);
    console.log(`   Amount per recipient: ${ethers.formatEther(amountPerRecipient)} MON`);
    console.log(`   Total amount: ${ethers.formatEther(totalAmount)} MON`);
    console.log(`   Number of recipients: ${recipients.length}\n`);

    // Prepare payment data
    const payments = recipients.map((r) => ({
      recipient: r.address,
      amount: amountPerRecipient,
    }));

    console.log("🔄 Executing transaction...\n");

    // Send transaction
    const tx = await contract.batchPay(payments, { value: totalAmount });

    console.log(`✅ Transaction sent!`);
    console.log(`   Hash: ${tx.hash}\n`);

    // Wait for confirmation
    console.log("⏳ Waiting for confirmation...\n");
    const receipt = await tx.wait();

    if (receipt.status === 1) {
      console.log("✅ Transaction confirmed successfully!");
      console.log(`   Block: ${receipt.blockNumber}`);
      console.log(`   Gas used: ${receipt.gasUsed.toString()}`);
      console.log(`   Status: SUCCESS\n`);
    } else {
      console.log("❌ Transaction failed!\n");
    }

  } catch (error) {
    console.error("\n❌ Error:", error.message);
    if (error.data) {
      console.error("Error data:", error.data);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
