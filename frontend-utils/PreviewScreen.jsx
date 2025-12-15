/**
 * Preview Screen Component
 * Shows recipient list, total amount, gas estimation, and confirm button
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ethers } from 'ethers';

function PreviewScreen({ recipients, walletAddress, onConfirm, onBack, provider, signer }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState(null);
  const [gasEstimate, setGasEstimate] = useState(null);
  const [gasPrice, setGasPrice] = useState(null);
  const [estimating, setEstimating] = useState(true);

  const totalAmount = recipients.reduce((sum, r) => sum + r.amount, 0);
  const recipientCount = recipients.length;

  // Estimate gas on mount
  useEffect(() => {
    const estimateGas = async () => {
      if (!provider || !signer) {
        setEstimating(false);
        return;
      }

      try {
        setEstimating(true);
        
        // Get current gas price
        const feeData = await provider.getFeeData();
        setGasPrice(feeData.gasPrice);

        // Simple estimation: ~21000 gas per transaction
        const estimatedGasPerTx = 21000n;
        const totalGas = estimatedGasPerTx * BigInt(recipientCount);
        
        // Calculate cost in ETH
        const gasCostWei = totalGas * feeData.gasPrice;
        const gasCostEth = ethers.formatEther(gasCostWei);
        
        setGasEstimate({
          totalGas: totalGas.toString(),
          gasPrice: feeData.gasPrice.toString(),
          gasCostEth: parseFloat(gasCostEth),
          totalCostEth: totalAmount + parseFloat(gasCostEth)
        });
      } catch (err) {
        console.warn('Gas estimation failed:', err);
        setGasEstimate(null);
      } finally {
        setEstimating(false);
      }
    };

    estimateGas();
  }, [provider, signer, recipientCount, totalAmount]);

  const handleConfirm = async () => {
    try {
      setConfirming(true);
      setError(null);
      await onConfirm(recipients);
    } catch (err) {
      setError(err.message || 'Failed to process payment');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto relative"
    >
      {/* Pulsing Background Effect */}
      <motion.div
        animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ repeat: Infinity, duration: 3 }}
        className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-3xl blur-2xl -z-10"
      />
      
      <div className="p-8 rounded-3xl bg-white/5 border border-white/10 shadow-2xl backdrop-blur-xl relative">
        <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-cyan-300 to-blue-400 text-transparent bg-clip-text">💸 Review Your Payment</h2>
        <p className="text-gray-300 mb-8 text-lg">Please verify all details before confirming the transaction</p>

        {/* Sender Info */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-6 rounded-2xl bg-white/5 border border-white/10"
        >
          <h3 className="text-xl font-bold mb-4 text-cyan-300">👤 From</h3>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Your Wallet</span>
            <span className="font-mono text-white font-semibold">
              {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
            </span>
          </div>
        </motion.div>

        {/* Recipients List */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 p-6 rounded-2xl bg-white/5 border border-white/10"
        >
          <h3 className="text-xl font-bold mb-4 text-cyan-300">👥 To ({recipientCount} recipient{recipientCount !== 1 ? 's' : ''})</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {recipients.map((recipient, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:border-cyan-500/30 transition-all"
              >
                <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-300 font-bold">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="font-mono text-white text-sm">
                    {recipient.address.slice(0, 10)}...{recipient.address.slice(-8)}
                  </div>
                  <div className="text-cyan-300 font-bold">
                    {recipient.amount} ETH
                  </div>
                </div>
                <div className="text-2xl text-green-400">✓</div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Gas Estimation */}
        {estimating && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-6 p-6 rounded-2xl bg-white/5 border border-white/10 text-center"
          >
            <h3 className="text-xl font-bold mb-4 text-cyan-300">⛽ Estimating Gas...</h3>
            <div className="animate-spin text-6xl">⏳</div>
          </motion.div>
        )}

        {!estimating && gasEstimate && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-6 p-6 rounded-2xl bg-gradient-to-r from-orange-500/10 to-yellow-500/10 border border-orange-500/30"
          >
            <h3 className="text-xl font-bold mb-4 text-orange-300">⛽ Gas Estimation</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-300">Estimated Gas:</span>
                <span className="text-white font-semibold">{Number(gasEstimate.totalGas).toLocaleString()} units</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Gas Price:</span>
                <span className="text-white font-semibold">{ethers.formatUnits(gasEstimate.gasPrice, 'gwei')} Gwei</span>
              </div>
              <div className="flex justify-between pt-3 border-t border-orange-500/20">
                <span className="text-orange-300 font-bold">Gas Cost:</span>
                <span className="text-orange-300 font-bold">~{gasEstimate.gasCostEth.toFixed(6)} ETH</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Summary */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-6 p-6 rounded-2xl bg-white/5 border border-white/10"
        >
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-300">👥 Recipients</span>
              <span className="text-white font-semibold">{recipientCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">🌐 Network</span>
              <span className="text-white font-semibold">Monad Testnet</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">💰 Payment Total</span>
              <span className="text-white font-semibold">{totalAmount.toFixed(4)} ETH</span>
            </div>
            {gasEstimate && (
              <div className="flex justify-between">
                <span className="text-gray-300">⛽ Est. Gas Fee</span>
                <span className="text-white font-semibold">+{gasEstimate.gasCostEth.toFixed(6)} ETH</span>
              </div>
            )}
            <div className="flex justify-between pt-4 border-t border-white/10">
              <span className="text-xl text-cyan-300 font-bold">💳 Total Cost</span>
              <span className="text-2xl bg-gradient-to-r from-cyan-300 to-blue-400 text-transparent bg-clip-text font-bold">
                {gasEstimate 
                  ? `${gasEstimate.totalCostEth.toFixed(6)} ETH`
                  : `${totalAmount.toFixed(4)} ETH`
                }
              </span>
            </div>
          </div>
        </motion.div>

        {/* Warning */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-6 p-5 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-start gap-4"
        >
          <span className="text-3xl">⚠️</span>
          <p className="text-yellow-200">
            <strong className="block mb-1">Double-check before confirming!</strong>
            This will send funds to {recipientCount} recipient{recipientCount !== 1 ? 's' : ''}. 
            Blockchain transactions cannot be reversed.
          </p>
        </motion.div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300"
          >
            {error}
          </motion.div>
        )}

        {/* Actions */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex gap-4 mb-6"
        >
          <motion.button
            onClick={onBack}
            disabled={confirming}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex-1 py-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Back & Edit
          </motion.button>
          <motion.button
            onClick={handleConfirm}
            disabled={confirming}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex-1 py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white text-lg font-bold shadow-xl hover:shadow-cyan-400/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            {confirming ? (
              <>
                <span className="animate-spin text-2xl">⏳</span>
                Processing...
              </>
            ) : (
              <>
                ✓ Confirm & Send
              </>
            )}
          </motion.button>
        </motion.div>

        {/* Gas Notice */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center p-4 rounded-xl bg-blue-500/10 border border-blue-500/30"
        >
          <p className="text-blue-200">
            💡 <strong>Gas Fees:</strong> You'll be prompted to approve this transaction in MetaMask
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}

export default PreviewScreen;
