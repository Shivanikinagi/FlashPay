/**
 * ERC-4337 Account Abstraction Service for VoidTx
 * Enables gasless transactions using Paymaster on Sepolia testnet
 * 
 * Features:
 * - Smart Account creation (ERC-4337)
 * - Paymaster-sponsored gas fees
 * - Bundler for UserOperation submission
 * - Fully decentralized and on-chain
 */

const { createSmartAccountClient } = require('permissionless');
const { signerToSimpleSmartAccount } = require('permissionless/accounts');
const { createPimlicoPaymasterClient, createPimlicoBundlerClient } = require('permissionless/clients/pimlico');
const { createPublicClient, http, createWalletClient, encodeFunctionData } = require('viem');
const { sepolia } = require('viem/chains');
const { privateKeyToAccount } = require('viem/accounts');
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

class AccountAbstractionService {
  constructor() {
    this.publicClient = null;
    this.bundlerClient = null;
    this.paymasterClient = null;
    this.contractAddress = null;
    this.contractABI = null;
    this.initialized = false;
  }

  /**
   * Initialize Account Abstraction service
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    // Validate environment variables
    const requiredVars = ['PIMLICO_API_KEY', 'BUNDLER_OWNER_PRIVATE_KEY'];
    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        throw new Error(`Missing required environment variable: ${varName}`);
      }
    }

    try {
      // Create public client for reading blockchain state
      // Using public Sepolia RPC endpoint (no API key required)
      const rpcUrl = process.env.INFURA_API_KEY 
        ? `https://sepolia.infura.io/v3/${process.env.INFURA_API_KEY}`
        : 'https://ethereum-sepolia-rpc.publicnode.com'; // Free public RPC (no auth required)
      
      this.publicClient = createPublicClient({
        transport: http(rpcUrl),
        chain: sepolia,
      });

      // Create Pimlico bundler client
      this.bundlerClient = createPimlicoBundlerClient({
        transport: http(`https://api.pimlico.io/v2/sepolia/rpc?apikey=${process.env.PIMLICO_API_KEY}`),
        entryPoint: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789', // EntryPoint v0.6
      });

      // Create Pimlico paymaster client
      this.paymasterClient = createPimlicoPaymasterClient({
        transport: http(`https://api.pimlico.io/v2/sepolia/rpc?apikey=${process.env.PIMLICO_API_KEY}`),
        entryPoint: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
      });

      // Load VoidTx contract info
      this.loadContractInfo();

      this.initialized = true;
      console.log('✅ Account Abstraction Service initialized successfully');
      console.log('📍 Network: Sepolia Testnet');
      console.log('⛽ Paymaster: Pimlico (Gas Sponsored)');
      console.log('🔗 Standard: ERC-4337');
    } catch (error) {
      console.error('❌ Failed to initialize Account Abstraction Service:', error.message);
      throw error;
    }
  }

  /**
   * Load VoidTx contract ABI and address
   */
  loadContractInfo() {
    try {
      const abiPath = path.join(__dirname, '..', 'deployments', 'VoidTx-ABI.json');
      this.contractABI = JSON.parse(fs.readFileSync(abiPath, 'utf8'));

      const deploymentPath = path.join(__dirname, '..', 'deployments', 'sepolia-deployment.json');
      const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
      this.contractAddress = deployment.contractAddress;

      console.log(`📋 Loaded VoidTx contract: ${this.contractAddress}`);
    } catch (error) {
      console.error('⚠️  Failed to load contract info:', error.message);
      throw new Error('Contract information not found. Please deploy VoidTx to Sepolia first.');
    }
  }

  /**
   * Create a Smart Account for a user
   * @param {string} userId - Unique identifier for the user
   * @returns {Object} Smart account details
   */
  async createSmartAccount(userId) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      console.log(`🔐 Creating Smart Account for user: ${userId}`);

      // Generate a deterministic private key for the user (in production, use secure key management)
      const userSeed = ethers.keccak256(ethers.toUtf8Bytes(`voidtx-user-${userId}`));
      const signer = privateKeyToAccount(userSeed);

      // Create Simple Account (ERC-4337)
      const simpleAccount = await signerToSimpleSmartAccount(this.publicClient, {
        signer: signer,
        entryPoint: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
        factoryAddress: '0x9406Cc6185a346906296840746125a0E44976454', // SimpleAccountFactory
      });

      const smartAccountAddress = await simpleAccount.address;

      console.log(`✅ Smart Account created successfully`);
      console.log(`   Address: ${smartAccountAddress}`);
      console.log(`   Owner: ${signer.address}`);

      return {
        success: true,
        smartAccountAddress: smartAccountAddress,
        ownerAddress: signer.address,
        userId: userId,
        accountType: 'ERC-4337 Simple Account',
        message: 'Smart Account created. This account supports gasless transactions via Paymaster.',
      };
    } catch (error) {
      console.error('❌ Error creating Smart Account:', error);
      return {
        success: false,
        error: error.message,
        details: error,
      };
    }
  }

  /**
   * Execute gasless VoidTx batch payment
   * @param {string} userId - User identifier
   * @param {Array} payments - Array of {recipient: address, amount: string (in ETH)}
   * @returns {Object} Transaction result
   */
  async executeGaslessBatchPayment(userId, payments) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      console.log(`⚡ Initiating gasless batch payment`);
      console.log(`   User ID: ${userId}`);
      console.log(`   Recipients: ${payments.length}`);

      // Validate payments
      if (!Array.isArray(payments) || payments.length === 0) {
        throw new Error('Payments must be a non-empty array');
      }

      if (payments.length > 100) {
        throw new Error('Maximum 100 recipients per batch');
      }

      // Generate user signer
      const userSeed = ethers.keccak256(ethers.toUtf8Bytes(`voidtx-user-${userId}`));
      const signer = privateKeyToAccount(userSeed);

      // Create Simple Account
      const simpleAccount = await signerToSimpleSmartAccount(this.publicClient, {
        signer: signer,
        entryPoint: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
        factoryAddress: '0x9406Cc6185a346906296840746125a0E44976454',
      });

      const smartAccountAddress = await simpleAccount.address;
      console.log(`   Smart Account: ${smartAccountAddress}`);

      // Create Smart Account Client with Paymaster
      const smartAccountClient = createSmartAccountClient({
        account: simpleAccount,
        chain: sepolia,
        bundlerTransport: http(`https://api.pimlico.io/v2/sepolia/rpc?apikey=${process.env.PIMLICO_API_KEY}`),
        middleware: {
          sponsorUserOperation: this.paymasterClient.sponsorUserOperation,
          gasPrice: async () => {
            return await this.bundlerClient.getUserOperationGasPrice();
          },
        },
      });

      // Prepare VoidTx calldata
      const formattedPayments = payments.map(p => ({
        recipient: p.recipient,
        amount: ethers.parseEther(p.amount.toString()),
      }));

      const totalAmount = formattedPayments.reduce(
        (sum, p) => sum + p.amount,
        0n
      );

      const totalAmountEth = ethers.formatEther(totalAmount);
      console.log(`   Total amount: ${totalAmountEth} ETH`);

      // Encode function call
      const iface = new ethers.Interface(this.contractABI);
      const calldata = iface.encodeFunctionData('batchPay', [formattedPayments]);

      // Send UserOperation (gas sponsored by Paymaster)
      const txHash = await smartAccountClient.sendTransaction({
        to: this.contractAddress,
        data: calldata,
        value: totalAmount,
      });

      console.log(`📝 Transaction submitted: ${txHash}`);

      // Wait for transaction receipt
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash: txHash });

      console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);

      return {
        success: true,
        transactionHash: txHash,
        smartAccountAddress: smartAccountAddress,
        recipientCount: payments.length,
        totalAmount: totalAmountEth,
        gasSponsored: true,
        blockNumber: receipt.blockNumber.toString(),
        status: receipt.status === 'success' ? 'CONFIRMED' : 'FAILED',
        message: 'Gasless transaction completed! Gas was sponsored by Pimlico Paymaster.',
        blockExplorer: `https://sepolia.etherscan.io/tx/${txHash}`,
      };
    } catch (error) {
      console.error('❌ Error executing gasless payment:', error);
      return {
        success: false,
        error: error.message,
        details: error.toString(),
      };
    }
  }

  /**
   * Get Smart Account address for a user
   * @param {string} userId - User identifier
   * @returns {Object} Account information
   */
  async getSmartAccountAddress(userId) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const userSeed = ethers.keccak256(ethers.toUtf8Bytes(`voidtx-user-${userId}`));
      const signer = privateKeyToAccount(userSeed);

      const simpleAccount = await signerToSimpleSmartAccount(this.publicClient, {
        signer: signer,
        entryPoint: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
        factoryAddress: '0x9406Cc6185a346906296840746125a0E44976454',
      });

      const address = await simpleAccount.address;

      return {
        success: true,
        smartAccountAddress: address,
        ownerAddress: signer.address,
        userId: userId,
      };
    } catch (error) {
      console.error('❌ Error getting Smart Account address:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Check Smart Account balance
   * @param {string} userId - User identifier
   * @returns {Object} Balance information
   */
  async getSmartAccountBalance(userId) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const accountInfo = await this.getSmartAccountAddress(userId);
      if (!accountInfo.success) {
        throw new Error('Failed to get Smart Account address');
      }

      const balance = await this.publicClient.getBalance({
        address: accountInfo.smartAccountAddress,
      });

      return {
        success: true,
        smartAccountAddress: accountInfo.smartAccountAddress,
        balance: balance.toString(),
        balanceEth: ethers.formatEther(balance),
      };
    } catch (error) {
      console.error('❌ Error getting balance:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

// Export singleton instance
module.exports = new AccountAbstractionService();
