const hre = require("hardhat");

/**
 * Quick balance check script
 */
async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const address = await deployer.getAddress();
  const balance = await hre.ethers.provider.getBalance(address);

  console.log("\n💰 Wallet Balance Check");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`Address: ${address}`);
  console.log(`Balance: ${hre.ethers.formatEther(balance)} ETH`);
  console.log(`Network: ${hre.network.name}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  if (balance === 0n) {
    console.log("⚠️  Your wallet has no balance!");
    console.log("Please fund it with testnet ETH before deploying.\n");
  } else {
    console.log("✅ Wallet funded and ready for deployment!\n");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
