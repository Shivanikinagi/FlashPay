/**
 * Gas Comparison Panel Component
 * Shows gas savings comparison between individual transfers vs FlashPay batch
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ethers } from 'ethers';

function GasComparison({ recipientCount = 10, isVisible = true, provider = null }) {
  const [gasData, setGasData] = useState({
    individualTransfer: 21000, // Base gas for simple ETH transfer
    batchOverhead: 45000, // Base overhead for batch contract
    perRecipientGas: 5000, // Additional gas per recipient in batch
    gasPrice: 20, // Default gas price in Gwei
  });

  const [collapsed, setCollapsed] = useState(false);
  const [isLoadingGasPrice, setIsLoadingGasPrice] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Fetch real-time gas price from network
  useEffect(() => {
    const fetchGasPrice = async () => {
      if (!provider) return;
      
      try {
        setIsLoadingGasPrice(true);
        const feeData = await provider.getFeeData();
        
        if (feeData.gasPrice) {
          const gasPriceGwei = Number(ethers.formatUnits(feeData.gasPrice, 'gwei'));
          setGasData(prev => ({
            ...prev,
            gasPrice: Math.round(gasPriceGwei)
          }));
          setLastUpdated(new Date());
        }
      } catch (error) {
        console.warn('Could not fetch gas price:', error);
      } finally {
        setIsLoadingGasPrice(false);
      }
    };

    fetchGasPrice();
    
    // Update gas price every 30 seconds
    const interval = setInterval(fetchGasPrice, 30000);
    
    return () => clearInterval(interval);
  }, [provider]);

  // Calculate gas costs
  const individualTotalGas = gasData.individualTransfer * recipientCount;
  const batchTotalGas = gasData.batchOverhead + (gasData.perRecipientGas * recipientCount);
  const gasSaved = individualTotalGas - batchTotalGas;
  const savingsPercentage = ((gasSaved / individualTotalGas) * 100).toFixed(1);

  // Calculate costs in ETH
  const individualCostETH = ((individualTotalGas * gasData.gasPrice) / 1e9).toFixed(6);
  const batchCostETH = ((batchTotalGas * gasData.gasPrice) / 1e9).toFixed(6);
  const savedETH = ((gasSaved * gasData.gasPrice) / 1e9).toFixed(6);

  if (!isVisible) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-7xl mx-auto mb-8"
    >
      <div 
        onClick={() => setCollapsed(!collapsed)}
        className="p-6 rounded-2xl bg-gradient-to-r from-orange-500/10 to-yellow-500/10 border border-orange-500/30 cursor-pointer hover:border-orange-400/50 transition-all backdrop-blur-xl flex justify-between items-center"
      >
        <h3 className="text-2xl font-bold text-orange-300">⚡ Gas Efficiency Comparison</h3>
        <button className="text-3xl text-orange-300 transition-transform" style={{ transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)' }}>
          ▼
        </button>
      </div>

      <AnimatePresence>
        {!collapsed && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-4 p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl"
          >
          {/* Control Panel */}
          <div className="flex gap-8 mb-8 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-gray-400 mb-2">Recipients:</label>
              <div className="p-4 rounded-xl bg-black/30 text-center">
                <span className="text-4xl font-bold text-cyan-300 block">{recipientCount}</span>
                {recipientCount !== 10 && (
                  <span className="text-sm text-gray-400 mt-1 block">Live from form</span>
                )}
              </div>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-gray-400 mb-2">Gas Price (Gwei):</label>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  value={gasData.gasPrice}
                  onChange={(e) => setGasData({...gasData, gasPrice: Number(e.target.value)})}
                  min="1"
                  max="500"
                  className="flex-1 px-4 py-2 rounded-xl bg-black/30 border border-white/10 text-white focus:outline-none focus:border-cyan-500 transition-all"
                />
                {isLoadingGasPrice && (
                  <span className="text-2xl animate-spin">⟳</span>
                )}
                {lastUpdated && !isLoadingGasPrice && (
                  <span className="text-sm px-3 py-1 rounded-lg bg-green-500/20 text-green-300">
                    {provider ? '🟢 Live' : '⚠️ Manual'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Comparison Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {/* Individual Transfers */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              whileHover={{ scale: 1.03, y: -5 }}
              className="p-6 rounded-2xl bg-gradient-to-b from-gray-800 to-gray-900 border border-white/10 shadow-lg hover:shadow-2xl hover:shadow-red-900/20 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3 mb-6">
                <span className="text-5xl">🐌</span>
                <h4 className="text-xl font-bold text-gray-300">Traditional Method</h4>
              </div>
              <div className="space-y-4">
                <div>
                  <span className="block text-gray-400 text-sm mb-1">{recipientCount} Individual Transfers</span>
                  <span className="text-2xl font-bold text-white">{individualTotalGas.toLocaleString()} gas</span>
                </div>
                <div>
                  <span className="block text-gray-400 text-sm mb-1">Calculation</span>
                  <span className="font-mono text-orange-300">{recipientCount} × 21,000</span>
                </div>
                <div className="pt-4 border-t border-white/10">
                  <span className="block text-gray-400 text-sm mb-1">Total Cost:</span>
                  <span className="text-3xl font-bold text-red-400">{individualCostETH} ETH</span>
                </div>
              </div>
            </motion.div>

            {/* Arrow */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="flex flex-col items-center justify-center p-6 rounded-2xl bg-gradient-to-b from-green-500/10 to-emerald-500/10 border border-green-500/30"
            >
              <span className="text-6xl mb-3">→</span>
              <span className="px-4 py-2 rounded-full bg-green-500/20 text-green-300 font-bold text-lg">
                Save {savingsPercentage}%
              </span>
            </motion.div>

            {/* FlashPay Batch */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="p-6 rounded-2xl bg-gradient-to-b from-cyan-900/50 to-blue-900/50 border border-cyan-500/30"
            >
              <div className="flex items-center gap-3 mb-6">
                <span className="text-5xl">⚡</span>
                <h4 className="text-xl font-bold text-cyan-300">FlashPay Batch</h4>
              </div>
              <div className="space-y-4">
                <div>
                  <span className="block text-gray-400 text-sm mb-1">1 Batch Transaction</span>
                  <span className="text-2xl font-bold text-white">{batchTotalGas.toLocaleString()} gas</span>
                </div>
                <div>
                  <span className="block text-gray-400 text-sm mb-1">Calculation</span>
                  <span className="font-mono text-cyan-300">45,000 + ({recipientCount} × 5,000)</span>
                </div>
                <div className="pt-4 border-t border-cyan-500/20">
                  <span className="block text-gray-400 text-sm mb-1">Total Cost:</span>
                  <span className="text-3xl font-bold text-green-400">{batchCostETH} ETH</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Savings Summary */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="p-6 rounded-2xl bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 flex items-center gap-6"
          >
            <span className="text-6xl">💰</span>
            <div className="flex-1">
              <div className="text-3xl font-bold text-green-300 mb-2">You Save: {savedETH} ETH</div>
              <div className="text-gray-300">
                ({gasSaved.toLocaleString()} gas saved · {savingsPercentage}% cheaper)
              </div>
            </div>
          </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default GasComparison;
