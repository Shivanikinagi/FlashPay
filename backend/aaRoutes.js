/**
 * ERC-4337 Account Abstraction API Routes
 * Provides gasless transaction endpoints using Paymaster
 */

const express = require('express');
const router = express.Router();
const aaService = require('./accountAbstractionService');

/**
 * POST /api/aa/account/create
 * Create a new Smart Account (ERC-4337) for a user
 */
router.post('/account/create', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required',
      });
    }

    console.log(`📥 Request to create Smart Account for user: ${userId}`);

    const result = await aaService.createSmartAccount(userId);

    if (!result.success) {
      return res.status(500).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Error in Smart Account creation endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/aa/account/:userId
 * Get Smart Account address for a user
 */
router.get('/account/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    console.log(`📥 Request to fetch Smart Account: ${userId}`);

    const result = await aaService.getSmartAccountAddress(userId);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Error in Smart Account fetch endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/aa/account/:userId/balance
 * Get Smart Account balance
 */
router.get('/account/:userId/balance', async (req, res) => {
  try {
    const { userId } = req.params;

    console.log(`📥 Request to fetch balance for: ${userId}`);

    const result = await aaService.getSmartAccountBalance(userId);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Error in balance fetch endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/aa/transaction/gasless-batch
 * Execute a gasless batch payment via Paymaster
 */
router.post('/transaction/gasless-batch', async (req, res) => {
  try {
    const { userId, payments } = req.body;

    // Validation
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required',
      });
    }

    if (!payments || !Array.isArray(payments) || payments.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'payments must be a non-empty array',
      });
    }

    // Validate each payment
    for (let i = 0; i < payments.length; i++) {
      const payment = payments[i];
      
      if (!payment.recipient || !payment.amount) {
        return res.status(400).json({
          success: false,
          error: `Payment at index ${i} is missing recipient or amount`,
        });
      }

      if (!/^0x[a-fA-F0-9]{40}$/.test(payment.recipient)) {
        return res.status(400).json({
          success: false,
          error: `Invalid recipient address at index ${i}: ${payment.recipient}`,
        });
      }

      const amount = parseFloat(payment.amount);
      if (isNaN(amount) || amount <= 0) {
        return res.status(400).json({
          success: false,
          error: `Invalid amount at index ${i}: ${payment.amount}`,
        });
      }
    }

    console.log(`📥 Gasless batch payment request`);
    console.log(`   User: ${userId}`);
    console.log(`   Recipients: ${payments.length}`);

    const result = await aaService.executeGaslessBatchPayment(userId, payments);

    if (!result.success) {
      return res.status(500).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Error in gasless batch payment endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/aa/health
 * Health check endpoint
 */
router.get('/health', async (req, res) => {
  try {
    await aaService.initialize();
    
    res.json({
      success: true,
      service: 'ERC-4337 Account Abstraction',
      network: 'Sepolia Testnet',
      paymaster: 'Pimlico',
      bundler: 'Pimlico',
      standard: 'ERC-4337',
      gasSponsorship: 'Enabled',
      message: 'Service is operational',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Service initialization failed. Check your API keys.',
    });
  }
});

/**
 * POST /api/aa/demo/gasless-payment
 * Demo endpoint for full flow
 */
router.post('/demo/gasless-payment', async (req, res) => {
  try {
    const { userId, payments } = req.body;

    if (!userId || !payments) {
      return res.status(400).json({
        success: false,
        error: 'userId and payments are required',
      });
    }

    console.log(`🎬 Demo: Full gasless payment flow for ${userId}`);

    // Step 1: Create Smart Account
    console.log('Step 1: Creating Smart Account...');
    const accountResult = await aaService.createSmartAccount(userId);
    
    if (!accountResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to create Smart Account',
        details: accountResult,
      });
    }

    console.log(`✅ Smart Account: ${accountResult.smartAccountAddress}`);

    // Step 2: Execute gasless payment
    console.log('Step 2: Executing gasless batch payment...');
    const txResult = await aaService.executeGaslessBatchPayment(userId, payments);

    if (!txResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to execute payment',
        accountCreated: accountResult,
        transactionError: txResult,
      });
    }

    console.log(`✅ Transaction confirmed: ${txResult.transactionHash}`);

    res.json({
      success: true,
      account: accountResult,
      transaction: txResult,
      message: 'Demo completed successfully! Smart Account created and gasless payment executed.',
    });
  } catch (error) {
    console.error('Error in demo endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
