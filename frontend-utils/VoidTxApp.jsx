/**
 * VoidTx Main Application Component
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
import VoidTxAPI from './apiClient';
// Dashboard functionality removed as per user request
// GasComparison component removed as per user request

function VoidTxApp({ onBackToLanding }) {
  const [currentScreen, setCurrentScreen] = useState('wallet'); // 'wallet', 'form', 'preview', 'status', 'receipt', 'dashboard'
  const [walletAddress, setWalletAddress] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [recipients, setRecipients] = useState([]);
  const [transactionHash, setTransactionHash] = useState(null);
  const [txStatus, setTxStatus] = useState(null);
  const [error, setError] = useState(null);
  const [backendConnected, setBackendConnected] = useState(false);
  // Dashboard state variables removed as per user request
  const [txTimestamp, setTxTimestamp] = useState(null);

  // Check backend connection on mount
  useEffect(() => {
    const checkBackend = async () => {
      try {
        await VoidTxAPI.checkHealth();
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



  // Dashboard functionality removed as per user request

  // Handle preview confirmation - execute transaction
  const handleConfirmPayment = async (finalRecipients) => {
    try {
      setError(null);
      setCurrentScreen('status');
      setTxStatus('loading'); 

      // Import contract constants - Monad Testnet
      const CONTRACT_ADDRESS = '0x37D4617a10fC421e920d8f921a2BbcD24d5d734f';
      
      // Fetch ABI dynamically
      const abiResponse = await fetch('/deployments/VoidTx-ABI.json');
      const CONTRACT_ABI = await abiResponse.json();

      // Prepare payment data for backend estimation
      const paymentData = finalRecipients.map((recipient) => ({
        recipient: recipient.address,
        amount: recipient.amount.toString(),
      }));

      // Estimate cost using backend if available
      if (backendConnected) {
        try {
          const estimate = await VoidTxAPI.estimateCost(paymentData);
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
              VoidTx
            </h1>
            <p className="text-sm text-gray-400">Batch Payments Made Easy</p>
          </div>
        </div>
        {/* Dashboard button removed as per user request */}
      </motion.nav>

      {/* Gas Comparison Panel removed as per user request */}

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

        {/* Dashboard screen removed as per user request */}
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

// Dashboard Screen Component removed as per user request

export default VoidTxApp;
