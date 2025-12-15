/**
 * Transaction Status Component
 * Shows loading, success, or failure states after sending batch payment
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import VoidTxAPI from './apiClient';

function TransactionStatus({ txHash, status, error, onReset }) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [blockConfirmations, setBlockConfirmations] = useState(0);
  const [txDetails, setTxDetails] = useState(null);
  const [pollInterval, setPollInterval] = useState(null);

  // Poll transaction status from backend
  useEffect(() => {
    if (!txHash || status !== 'pending') return;

    const pollTxStatus = async () => {
      try {
        const details = await VoidTxAPI.getTransactionStatus(txHash);
        setTxDetails(details);
        if (details.confirmations) {
          setBlockConfirmations(details.confirmations);
        }
      } catch (error) {
        console.error('Error polling transaction status:', error);
      }
    };

    // Poll every 10 seconds
    const interval = setInterval(pollTxStatus, 10000);
    setPollInterval(interval);
    
    // Check immediately on mount
    pollTxStatus();

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [txHash, status]);

  // Timer for elapsed time
  useEffect(() => {
    if (status === 'pending' || status === 'loading') {
      const interval = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [status]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getExplorerUrl = (hash) => {
    return `https://testnet.monadvision.com/tx/${hash}`;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto"
    >
      <div className="p-8 rounded-3xl bg-white/5 border border-white/10 shadow-2xl backdrop-blur-xl">
        {/* Loading/Pending State */}
        {status === 'loading' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
              className="text-8xl mb-6 inline-block"
            >
              ⏳
            </motion.div>
            <h2 className="text-4xl font-bold mb-6 bg-gradient-to-r from-cyan-300 to-blue-400 text-transparent bg-clip-text">Processing Your Payment...</h2>
            <div className="space-y-4 p-6 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex justify-between">
                <span className="text-gray-300">⏱️ Elapsed Time:</span>
                <span className="text-white font-semibold">{formatTime(elapsedTime)}</span>
              </div>
              {txHash && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">📋 TX Hash:</span>
                  <span className="font-mono text-cyan-300 text-sm">
                    {txHash.slice(0, 12)}...{txHash.slice(-12)}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Pending State (Waiting for Confirmation) */}
        {status === 'pending' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="text-8xl mb-6"
            >
              ⏳
            </motion.div>
            <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-yellow-300 to-orange-400 text-transparent bg-clip-text">Waiting for Confirmation</h2>
            <p className="text-gray-300 mb-8 text-lg">
              Your transaction has been sent and is waiting for block confirmation
            </p>
            <div className="space-y-4 p-6 rounded-2xl bg-white/5 border border-white/10 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-300">⏱️ Elapsed Time:</span>
                <span className="text-white font-semibold">{formatTime(elapsedTime)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">🔗 Confirmations:</span>
                <span className="text-cyan-300 font-bold">{blockConfirmations}</span>
              </div>
              {txHash && (
                <div className="flex flex-col gap-2">
                  <span className="text-gray-300">📋 TX Hash:</span>
                  <a 
                    href={getExplorerUrl(txHash)} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="font-mono text-cyan-400 hover:text-cyan-300 break-all"
                  >
                    {txHash.slice(0, 12)}...{txHash.slice(-12)}
                  </a>
                </div>
              )}
            </div>
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
              <p className="text-blue-200">💡 You can close this page. Your transaction will be processed automatically.</p>
            </div>
          </motion.div>
        )}

        {/* Success State */}
        {status === 'success' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="w-32 h-32 mx-auto mb-6 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center text-white text-7xl relative"
            >
              {/* Ripple Effect */}
              <motion.div
                animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="absolute inset-0 rounded-full bg-green-400"
              />
              <span className="relative z-10">✓</span>
            </motion.div>
            <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-green-300 to-emerald-400 text-transparent bg-clip-text">Payment Sent Successfully!</h2>
            <p className="text-gray-300 mb-8 text-lg">
              All recipients have received their funds
            </p>
            <div className="space-y-4 p-6 rounded-2xl bg-white/5 border border-white/10 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-300">⏱️ Total Time:</span>
                <span className="text-white font-semibold">{formatTime(elapsedTime)}</span>
              </div>
              {txHash && (
                <div className="flex flex-col gap-2">
                  <span className="text-gray-300">📋 TX Hash:</span>
                  <a 
                    href={getExplorerUrl(txHash)} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="font-mono text-cyan-400 hover:text-cyan-300 break-all"
                  >
                    {txHash}
                  </a>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-4">
              <motion.button 
                onClick={onReset}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-4 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black text-lg font-bold shadow-xl hover:shadow-cyan-400/40 transition-all"
              >
                Create Another Batch Payment
              </motion.button>
              {txHash && (
                <motion.a 
                  href={getExplorerUrl(txHash)} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 font-semibold transition-all text-center"
                >
                  View on Monadvision ↗️
                </motion.a>
              )}
            </div>
          </motion.div>
        )}

        {/* Failed State */}
        {status === 'failed' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="w-32 h-32 mx-auto mb-6 rounded-full bg-gradient-to-r from-red-500 to-pink-500 flex items-center justify-center text-white text-7xl"
            >
              ✗
            </motion.div>
            <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-red-300 to-pink-400 text-transparent bg-clip-text">Transaction Failed</h2>
            <p className="text-gray-300 mb-6 text-lg">
              Your payment could not be processed
            </p>
            {error && (
              <div className="mb-6 p-5 rounded-xl bg-red-500/10 border border-red-500/30 text-left">
                <strong className="text-red-400 block mb-2">Error:</strong>
                <p className="text-red-300">{error}</p>
              </div>
            )}
            <div className="space-y-4 p-6 rounded-2xl bg-white/5 border border-white/10 mb-6">
              {txHash && (
                <div className="flex flex-col gap-2">
                  <span className="text-gray-300">📋 TX Hash:</span>
                  <a 
                    href={getExplorerUrl(txHash)} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="font-mono text-cyan-400 hover:text-cyan-300 break-all"
                  >
                    {txHash.slice(0, 12)}...{txHash.slice(-12)}
                  </a>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-4 mb-6">
              <motion.button 
                onClick={onReset}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-4 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black text-lg font-bold shadow-xl hover:shadow-cyan-400/40 transition-all"
              >
                ← Go Back & Try Again
              </motion.button>
              {txHash && (
                <motion.a 
                  href={getExplorerUrl(txHash)} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 font-semibold transition-all text-center"
                >
                  View on Monadvision ↗️
                </motion.a>
              )}
            </div>
            <div className="p-6 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-left">
              <p className="text-yellow-200 font-bold mb-3">⚠️ Troubleshooting:</p>
              <ul className="text-yellow-200 space-y-2 list-disc list-inside">
                <li>Check if you have enough balance</li>
                <li>Verify all recipient addresses are valid</li>
                <li>Ensure you have sufficient gas</li>
                <li>Try connecting wallet again</li>
              </ul>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

export default TransactionStatus;
