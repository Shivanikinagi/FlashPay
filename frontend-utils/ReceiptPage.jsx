/**
 * Receipt Page Component
 * Displays transaction receipt with all details after successful payment
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';

function ReceiptPage({ 
  txHash, 
  sender, 
  recipients, 
  timestamp, 
  totalAmount, 
  network = 'Monad Testnet',
  onClose 
}) {
  const [copied, setCopied] = useState(false);

  // Format date/time
  const formattedDate = timestamp 
    ? new Date(timestamp).toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    : new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

  // Generate shareable link (current URL with query params)
  const shareableLink = `${window.location.origin}${window.location.pathname}?tx=${txHash}`;

  // Copy to clipboard
  const handleCopy = (text, type) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(type);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Share functionality
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'VoidTx Transaction Receipt',
          text: `Payment sent to ${recipients.length} recipient${recipients.length !== 1 ? 's' : ''}`,
          url: shareableLink
        });
      } catch (err) {
        console.log('Share cancelled or failed');
      }
    } else {
      handleCopy(shareableLink, 'link');
    }
  };

  // Print receipt
  const handlePrint = () => {
    window.print();
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto px-6"
    >
      <div className="p-8 rounded-3xl bg-white/5 border border-white/10 shadow-2xl backdrop-blur-xl">
        {/* Header */}
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
          className="text-center mb-8"
        >
          <div className="relative inline-block mb-6">
            {/* Success Badge with Glow */}
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
              className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full blur-xl opacity-50"
            />
            <div className="relative w-24 h-24 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center text-white text-6xl shadow-2xl">
              ✓
            </div>
          </div>
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-green-300 to-emerald-400 text-transparent bg-clip-text">Payment Successful!</h1>
          <p className="text-gray-300 text-lg">
            Your batch payment has been processed on {network}
          </p>
        </motion.div>

        {/* Transaction Hash */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6 p-6 rounded-2xl bg-white/5 border border-white/10"
        >
          <h3 className="text-xl font-bold mb-4 text-cyan-300">Transaction Hash</h3>
          <div className="flex items-center gap-3 p-4 rounded-xl bg-black/30 mb-3">
            <div className="flex-1 font-mono text-white text-sm break-all">{txHash}</div>
            <button 
              onClick={() => handleCopy(txHash, 'hash')}
              title="Copy transaction hash"
              className="text-2xl hover:scale-110 transition-transform"
            >
              {copied === 'hash' ? '✓' : '📋'}
            </button>
          </div>
          <a 
            // Fix: Update line 122 in ReceiptPage.jsx to use the correct Monad Testnet explorer URL
href={`https://testnet.monadvision.com/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 hover:text-cyan-300 font-semibold"
          >
            View on Block Explorer →
          </a>
        </motion.div>

        {/* Transaction Details */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-6 p-6 rounded-2xl bg-white/5 border border-white/10"
        >
          <h3 className="text-xl font-bold mb-4 text-cyan-300">Transaction Details</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex justify-between p-3 rounded-xl bg-black/30">
              <span className="text-gray-400">From:</span>
              <span className="font-mono text-white font-semibold">
                {sender?.slice(0, 10)}...{sender?.slice(-8)}
              </span>
            </div>
            <div className="flex justify-between p-3 rounded-xl bg-black/30">
              <span className="text-gray-400">Date:</span>
              <span className="text-white font-semibold">{formattedDate}</span>
            </div>
            <div className="flex justify-between p-3 rounded-xl bg-black/30">
              <span className="text-gray-400">Network:</span>
              <span className="text-white font-semibold">{network}</span>
            </div>
            <div className="flex justify-between p-3 rounded-xl bg-black/30">
              <span className="text-gray-400">Recipients:</span>
              <span className="text-cyan-300 font-bold">{recipients.length}</span>
            </div>
          </div>
        </motion.div>

        {/* Recipients List */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-6 p-6 rounded-2xl bg-white/5 border border-white/10"
        >
          <h3 className="text-xl font-bold mb-4 text-cyan-300">
            Recipients ({recipients.length})
          </h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {recipients.map((recipient, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + (index * 0.05) }}
                className="flex items-center gap-4 p-4 rounded-xl bg-black/30"
              >
                <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-300 font-bold">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="font-mono text-white text-sm break-all">
                    {recipient.address}
                  </div>
                  <div className="text-cyan-300 font-bold text-lg">
                    {recipient.amount} ETH
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Summary */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-6 p-6 rounded-2xl bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30"
        >
          <div className="flex justify-between items-center">
            <span className="text-2xl text-gray-300 font-bold">Total Amount Sent:</span>
            <span className="text-4xl bg-gradient-to-r from-cyan-300 to-blue-400 text-transparent bg-clip-text font-bold">{totalAmount.toFixed(4)} ETH</span>
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex gap-4 flex-wrap mb-6"
        >
          <motion.button 
            onClick={handleShare}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 hover:border-purple-400/50 font-semibold transition-all"
          >
            {navigator.share ? '🔗 Share Receipt' : '🔗 Copy Link'}
          </motion.button>
          
          <motion.button 
            onClick={handlePrint}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 font-semibold transition-all"
          >
            🖨️ Print Receipt
          </motion.button>
          
          <motion.button 
            onClick={onClose}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="flex-1 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold transition-all"
          >
            ✓ Done
          </motion.button>
        </motion.div>

        {/* Footer Note */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 text-center"
        >
          <p className="text-blue-200">
            💡 Save this receipt for your records. You can view the transaction 
            on the block explorer at any time.
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}

export default ReceiptPage;
