require("dotenv").config();
const { ethers } = require("ethers");

/**
 * Network and Configuration Diagnostics
 */
async function main() {
  console.log("\n📋 FlashPay Configuration Check");
  console.log("═══════════════════════════════════════════════════════\n");

  // Check environment variables
  console.log("🔑 Environment Variables:");
  const hasPrivateKey = !!process.env.PRIVATE_KEY;
  const hasMonadRpc = !!process.env.MONAD_RPC_URL;
  const hasSepoliaRpc = !!process.env.SEPOLIA_RPC_URL;

  console.log(`   ✅ PRIVATE_KEY: ${hasPrivateKey ? "SET" : "MISSING"}`);
  console.log(`   ✅ MONAD_RPC_URL: ${hasMonadRpc ? "SET" : "MISSING"}`);
  console.log(`   ✅ SEPOLIA_RPC_URL: ${hasSepoliaRpc ? "SET" : "MISSING"}\n`);

  if (!hasPrivateKey) {
    console.error("❌ Missing PRIVATE_KEY in .env");
    return;
  }

  // Try to connect to RPC endpoints
  console.log("🔗 RPC Endpoint Tests:\n");

  // Test Monad RPC
  if (hasMonadRpc) {
    console.log("   Testing Monad RPC...");
    try {
      const monadProvider = new ethers.JsonRpcProvider(process.env.MONAD_RPC_URL);
      const network = await monadProvider.getNetwork();
      console.log(`   ✅ Monad Connected`);
      console.log(`      Network: ${network.name} (Chain: ${network.chainId})\n`);
    } catch (err) {
      console.log(`   ❌ Monad Connection Failed`);
      console.log(`      Error: ${err.message}\n`);
    }
  }

  // Test Sepolia RPC
  if (hasSepoliaRpc) {
    console.log("   Testing Sepolia RPC...");
    try {
      const sepoliaProvider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
      const network = await sepoliaProvider.getNetwork();
      console.log(`   ✅ Sepolia Connected`);
      console.log(`      Network: ${network.name} (Chain: ${network.chainId})\n`);
    } catch (err) {
      console.log(`   ❌ Sepolia Connection Failed`);
      console.log(`      Error: ${err.message}\n`);
    }
  }

  // Derive wallet address
  console.log("👛 Wallet Information:");
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY);
  console.log(`   Address: ${wallet.address}\n`);

  console.log("✨ Next Steps:");
  console.log("   1. Ensure you have funded your wallet with testnet tokens");
  console.log("   2. For Monad: Visit https://faucet.testnet.monad.xyz/");
  console.log("   3. For Sepolia: Visit https://sepoliafaucet.com/ or https://www.alchemy.com/faucets/ethereum-sepolia\n");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
