const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Main deployment script for FlashPay contract
 * Deploys to Monad Testnet and saves deployment info
 */
async function main() {
  console.log("🚀 Starting FlashPay deployment...\n");

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  
  console.log("📋 Deployment Details:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`Network: ${hre.network.name}`);
  console.log(`Deployer: ${deployerAddress}`);
  
  // Get deployer balance
  const balance = await hre.ethers.provider.getBalance(deployerAddress);
  console.log(`Balance: ${hre.ethers.formatEther(balance)} ETH`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Check if deployer has sufficient balance
  if (balance === 0n) {
    console.error("❌ Error: Deployer account has no balance!");
    console.error("Please fund the account before deployment.");
    process.exit(1);
  }

  // Deploy VoidTx contract
  console.log("📦 Deploying VoidTx contract...");
  const VoidTx = await hre.ethers.getContractFactory("VoidTx");
  const voidTx = await VoidTx.deploy();
  
  await voidTx.waitForDeployment();
  const contractAddress = await voidTx.getAddress();

  console.log("✅ VoidTx deployed successfully!");
  console.log(`📍 Contract Address: ${contractAddress}\n`);

  // Save deployment information
  const deploymentInfo = {
    network: hre.network.name,
    contractAddress: contractAddress,
    deployer: deployerAddress,
    deployedAt: new Date().toISOString(),
    blockNumber: await hre.ethers.provider.getBlockNumber(),
    chainId: (await hre.ethers.provider.getNetwork()).chainId.toString()
  };

  // Create deployments directory if it doesn't exist
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  // Save deployment info to JSON file
  const deploymentFile = path.join(
    deploymentsDir,
    `${hre.network.name}-deployment.json`
  );
  fs.writeFileSync(
    deploymentFile,
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("📄 Deployment info saved to:", deploymentFile);

  // Save ABI
  const artifactsPath = path.join(
    __dirname,
    "..",
    "artifacts",
    "contracts",
    "FlashPay.sol",
    "FlashPay.json"
  );
  
  if (fs.existsSync(artifactsPath)) {
    const artifacts = JSON.parse(fs.readFileSync(artifactsPath, "utf8"));
    const abiFile = path.join(deploymentsDir, "FlashPay-ABI.json");
    fs.writeFileSync(abiFile, JSON.stringify(artifacts.abi, null, 2));
    console.log("📄 ABI saved to:", abiFile);
  }

  // Create a .env update suggestion
  console.log("\n📝 Update your .env file with:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`CONTRACT_ADDRESS=${contractAddress}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Verify contract (if on testnet and API key available)
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("⏳ Waiting for block confirmations...");
    await flashPay.deploymentTransaction().wait(5);

    console.log("🔍 Verifying contract on block explorer...");
    try {
      await hre.run("verify:verify", {
        address: contractAddress,
        constructorArguments: [],
      });
      console.log("✅ Contract verified successfully!");
    } catch (error) {
      console.log("⚠️  Verification failed:", error.message);
      console.log("You can verify manually later using:");
      console.log(`npx hardhat verify --network ${hre.network.name} ${contractAddress}`);
    }
  }

  console.log("\n✨ Deployment complete! ✨\n");
  
  // Test basic functionality
  console.log("🧪 Running basic contract tests...");
  try {
    const stats = await flashPay.getStats();
    console.log("✅ Contract is responsive");
    console.log(`   Total Payments: ${stats[0]}`);
    console.log(`   Total Volume: ${hre.ethers.formatEther(stats[1])} ETH`);
  } catch (error) {
    console.log("⚠️  Could not fetch stats:", error.message);
  }

  console.log("\n🎉 All done! Your FlashPay contract is ready to use.");
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  });
