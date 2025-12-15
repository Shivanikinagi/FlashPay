/**
 * FlashPay Main Application Component
 * Complete UI for batch payments with wallet integration
 */

import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { motion } from 'framer-motion';
import WalletConnector from './WalletConnector';
import BatchPaymentForm from './BatchPaymentForm';
import PreviewScreen from './PreviewScreen';
import TransactionStatus from './TransactionStatus';
import ReceiptPage from './ReceiptPage';
import FlashPayAPI from './apiClient';
import { processTransactionHistory, calculateDashboardStats } from './dashboard';
import GasComparison from './GasComparison';

function FlashPayApp({ onBackToLanding }) {
  const [currentScreen, setCurrentScreen] = useState('wallet'); // 'wallet', 'form', 'preview', 'status', 'receipt', 'dashboard'
  const [walletAddress, setWalletAddress] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [recipients, setRecipients] = useState([]);
  const [transactionHash, setTransactionHash] = useState(null);
  const [txStatus, setTxStatus] = useState(null);
  const [error, setError] = useState(null);
  const [backendConnected, setBackendConnected] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [txTimestamp, setTxTimestamp] = useState(null);

  // Check backend connection on mount
  useEffect(() => {
    const checkBackend = async () => {
      try {
        await FlashPayAPI.checkHealth();
        setBackendConnected(true);
      } catch (err) {
        console.warn('Backend not available:', err.message);
        setBackendConnected(false);
      }
    };
    checkBackend();
  }, []);

  // Handle wallet connection
  const handleWalletConnected = ({ address, provider: p, signer: s }) => {
    setWalletAddress(address);
    setProvider(p);
    setSigner(s);
    setError(null);
    setCurrentScreen('form');
  };

  // Handle wallet disconnection
  const handleDisconnect = () => {
    setWalletAddress(null);
    setProvider(null);
    setSigner(null);
    setRecipients([]);
    setCurrentScreen('wallet');
  };

  // Handle form submission - go to preview
  const handleFormSubmit = (paymentData) => {
    setRecipients(paymentData);
    setCurrentScreen('preview');
  };



  // Load dashboard data
  const loadDashboard = async () => {
    try {
      const { events } = await FlashPayAPI.getAllEvents();
      const { transactions } = processTransactionHistory(events);
      setDashboardData(transactions);
      const stats = calculateDashboardStats(transactions);
      setDashboardStats(stats);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      // Show empty dashboard on error
      setDashboardData([]);
      setDashboardStats({
        totalTransactions: 0,
        totalRecipients: 0,
        totalVolume: '0',
        successRate: '0%',
        averageAmount: '0'
      });
    }
  };

  // Handle dashboard view
  const handleViewDashboard = () => {
    loadDashboard();
    setCurrentScreen('dashboard');
  };

  // Handle preview confirmation - execute transaction
  const handleConfirmPayment = async (finalRecipients) => {
    try {
      setError(null);
      setCurrentScreen('status');
      setTxStatus('loading'); 

      // Import contract constants - Monad Testnet
      const CONTRACT_ADDRESS = '0x37D4617a10fC421e920d8f921a2BbcD24d5d734f';
      
      // Fetch ABI dynamically
      const abiResponse = await fetch('/deployments/FlashPay-ABI.json');
      const CONTRACT_ABI = await abiResponse.json();

      // Prepare payment data for backend estimation
      const paymentData = finalRecipients.map((recipient) => ({
        recipient: recipient.address,
        amount: recipient.amount.toString(),
      }));

      // Estimate cost using backend if available
      if (backendConnected) {
        try {
          const estimate = await FlashPayAPI.estimateCost(paymentData);
          console.log('Cost estimate from backend:', estimate);
        } catch (err) {
          console.warn('Could not get estimate from backend:', err.message);
        }
      }

      // Create contract instance for transaction
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        signer
      );

      // Prepare payment data with proper formatting
      const payments = finalRecipients.map((recipient) => ({
        recipient: recipient.address,
        amount: ethers.parseEther(recipient.amount.toString()),
      }));

      // Calculate total amount
      const totalAmount = payments.reduce(
        (sum, p) => sum + p.amount,
        ethers.getBigInt(0)
      );

      // Check wallet balance before sending
      const balance = await provider.getBalance(walletAddress);
      console.log('Wallet balance:', ethers.formatEther(balance), 'ETH');
      console.log('Total needed:', ethers.formatEther(totalAmount), 'ETH');
      
      if (balance < totalAmount) {
        throw new Error(`Insufficient balance. You have ${ethers.formatEther(balance)} ETH but need ${ethers.formatEther(totalAmount)} ETH + gas fees`);
      }

      // Estimate gas with buffer
      let gasEstimate;
      try {
        gasEstimate = await contract.batchPay.estimateGas(payments, { value: totalAmount });
        console.log('Gas estimate:', gasEstimate.toString());
      } catch (estimateError) {
        console.error('Gas estimation failed:', estimateError);
        throw new Error('Transaction would fail. Check recipient addresses and your balance.');
      }

      // Execute batch payment with explicit gas limit
      const tx = await contract.batchPay(payments, { 
        value: totalAmount,
        gasLimit: gasEstimate * BigInt(120) / BigInt(100), // Add 20% buffer
        type: 0 // Force legacy transaction type for Monad compatibility
      });
      
      setTransactionHash(tx.hash);
      setTxStatus('pending');
      setTxTimestamp(Date.now());

      // Wait for confirmation
      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        setTxStatus('success');
        // Navigate to receipt page after success
        setTimeout(() => {
          setCurrentScreen('receipt');
        }, 2000);
      } else {
        setTxStatus('failed');
        setError('Transaction failed');
      }
    } catch (err) {
      console.error('Transaction error:', err);
      setTxStatus('failed');
      setError(err.message || 'Transaction failed');
    }
  };

  // Handle back button
  const handleBack = () => {
    if (currentScreen === 'preview') {
      setCurrentScreen('form');
    } else if (currentScreen === 'status') {
      setCurrentScreen('form');
      setTransactionHash(null);
      setTxStatus(null);
      setRecipients([]);
    }
  };

  return (
    <div className="min-h-screen scroll-smooth bg-gradient-to-b from-black via-gray-900 to-gray-950 text-white overflow-hidden font-sans relative">
      {/* Animated Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ 
            x: [0, 100, 0],
            y: [0, -100, 0],
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{ repeat: Infinity, duration: 20, ease: "easeInOut" }}
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ 
            x: [0, -100, 0],
            y: [0, 100, 0],
            scale: [1, 1.3, 1],
            opacity: [0.2, 0.4, 0.2]
          }}
          transition={{ repeat: Infinity, duration: 25, ease: "easeInOut" }}
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"
        />
      </div>
      
      {/* Navbar */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="w-full py-6 px-10 flex justify-between items-center sticky top-0 backdrop-blur-xl bg-white/5 z-50 border-b border-white/10 shadow-lg shadow-black/20"
      >
        <div className="flex items-center gap-4">
          {onBackToLanding && (
            <button 
              onClick={onBackToLanding}
              className="text-gray-300 hover:text-cyan-300 transition"
              title="Back to landing page"
            >
              ← Home
            </button>
          )}
          <div>
            <h1 className="text-3xl font-bold tracking-wide bg-gradient-to-r from-blue-400 to-cyan-300 text-transparent bg-clip-text">
              FlashPay
            </h1>
            <p className="text-sm text-gray-400">Batch Payments Made Easy</p>
          </div>
        </div>
        {walletAddress && (
          <motion.button 
            onClick={handleViewDashboard}
            whileHover={{ scale: 1.05, boxShadow: "0 0 25px rgba(6, 182, 212, 0.5)" }}
            whileTap={{ scale: 0.95 }}
            className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-black font-bold px-6 py-3 rounded-xl transition-all shadow-lg"
            title="View transaction history and statistics"
          >
            📊 Dashboard
          </motion.button>
        )}
      </motion.nav>

      {/* Gas Comparison Panel - Show on main screens */}
      {(currentScreen === 'wallet' || currentScreen === 'form') && (
        <GasComparison 
          recipientCount={recipients.length > 0 ? recipients.length : 10} 
          provider={provider}
          isVisible={true}
        />
      )}

      <main className="px-6 py-8 max-w-7xl mx-auto">
        {currentScreen === 'wallet' && (
          <WalletConnector onConnected={handleWalletConnected} />
        )}

        {currentScreen === 'form' && walletAddress && (
          <BatchPaymentForm
            walletAddress={walletAddress}
            onSubmit={handleFormSubmit}
            onDisconnect={handleDisconnect}
            initialRecipients={recipients}
          />
        )}

        {currentScreen === 'preview' && (
          <>
            <GasComparison 
              recipientCount={recipients.length} 
              provider={provider}
              isVisible={true}
            />
            <PreviewScreen
              recipients={recipients}
              walletAddress={walletAddress}
              onConfirm={handleConfirmPayment}
              onBack={handleBack}
              provider={provider}
              signer={signer}
            />
          </>
        )}

        {currentScreen === 'status' && (
          <TransactionStatus
            txHash={transactionHash}
            status={txStatus}
            error={error}
            onReset={() => {
              setCurrentScreen('form');
              setTransactionHash(null);
              setTxStatus(null);
              setRecipients([]);
            }}
          />
        )}

        {currentScreen === 'receipt' && (
          <ReceiptPage
            txHash={transactionHash}
            sender={walletAddress}
            recipients={recipients}
            timestamp={txTimestamp}
            totalAmount={recipients.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0)}
            network="Monad Testnet"
            onClose={() => {
              setCurrentScreen('form');
              setTransactionHash(null);
              setTxStatus(null);
              setRecipients([]);
              setTxTimestamp(null);
            }}
          />
        )}

        {currentScreen === 'dashboard' && (
          <DashboardScreen
            data={dashboardData}
            stats={dashboardStats}
            onBack={() => setCurrentScreen('form')}
          />
        )}
      </main>

      {error && currentScreen !== 'status' && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed top-20 right-4 bg-red-500/20 border border-red-500/50 backdrop-blur-xl text-white px-6 py-4 rounded-xl shadow-xl flex items-center gap-4"
        >
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-2xl hover:text-red-300">✕</button>
        </motion.div>
      )}
    </div>
  );
}

// ============ Dashboard Screen Component ============
function DashboardScreen({ data, stats, onBack }) {
  const [filteredData, setFilteredData] = useState(data || []);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!data) return;
    
    const query = searchQuery.toLowerCase();
    const filtered = data.filter(tx =>
      tx.txHash?.toLowerCase().includes(query) ||
      tx.sender?.toLowerCase().includes(query)
    );
    setFilteredData(filtered);
  }, [searchQuery, data]);

  if (!stats) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center justify-center min-h-[400px]"
      >
        <div className="text-center">
          <div className="animate-spin text-6xl mb-4">⏳</div>
          <p className="text-gray-300 text-lg">Loading dashboard...</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="flex justify-between items-center">
        <h2 className="text-4xl font-bold bg-gradient-to-r from-cyan-300 to-blue-400 text-transparent bg-clip-text">📊 Transaction Dashboard</h2>
        <button 
          onClick={onBack}
          className="bg-white/5 hover:bg-white/10 border border-white/10 px-6 py-2 rounded-xl transition-all"
        >
          ← Back
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid md:grid-cols-5 gap-6">
        {[
          { value: stats.totalTransactions, label: 'Total Transactions' },
          { value: stats.totalRecipients, label: 'Recipients Paid' },
          { value: `${stats.totalVolume} ETH`, label: 'Total Volume' },
          { value: stats.successRate, label: 'Success Rate' },
          { value: `${stats.averageAmount} ETH`, label: 'Avg Amount' }
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: i * 0.1 }}
            whileHover={{ scale: 1.05 }}
            className="p-6 rounded-2xl bg-white/5 border border-white/10 shadow-xl hover:shadow-cyan-400/20 transition-all"
          >
            <div className="text-3xl font-bold text-cyan-300 mb-2">{stat.value}</div>
            <div className="text-sm text-gray-400">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Search Bar */}
      <div>
        <input
          type="text"
          placeholder="🔍 Search by tx hash or sender address..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 transition-all"
        />
      </div>

      {/* Transactions Table */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
        <h3 className="text-2xl font-bold mb-6 text-cyan-300">Recent Transactions</h3>
        {filteredData.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">No transactions found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 text-left">
                  <th className="pb-4 text-gray-400 font-semibold">Tx Hash</th>
                  <th className="pb-4 text-gray-400 font-semibold">Sender</th>
                  <th className="pb-4 text-gray-400 font-semibold">Recipients</th>
                  <th className="pb-4 text-gray-400 font-semibold">Amount</th>
                  <th className="pb-4 text-gray-400 font-semibold">Status</th>
                  <th className="pb-4 text-gray-400 font-semibold">Time</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.slice(0, 20).map((tx, idx) => (
                  <motion.tr 
                    key={idx}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="py-4 font-mono">
                      <a 
                        href={`https://testnet.monadvision.com/tx/${tx.txHash}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-cyan-400 hover:text-cyan-300"
                      >
                        {tx.txHash?.slice(0, 10)}...
                      </a>
                    </td>
                    <td className="py-4 font-mono text-gray-300">{tx.sender?.slice(0, 10)}...</td>
                    <td className="py-4 text-gray-300">{tx.successCount || 0}</td>
                    <td className="py-4 text-gray-300">{(parseFloat(tx.totalAmount || 0) / 1e18).toFixed(4)} ETH</td>
                    <td className="py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        tx.status === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="py-4 text-gray-300">{new Date(tx.timestamp).toLocaleDateString()}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {filteredData.length > 20 && (
          <p className="text-center text-gray-400 mt-6">Showing 20 of {filteredData.length} transactions</p>
        )}
      </div>
    </motion.div>
  );
}

export default FlashPayApp;
