/**
 * Wallet Connection Component
 * Supports MetaMask and WalletConnect
 */

import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { motion } from 'framer-motion';

function WalletConnector({ onConnected }) {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [installed, setInstalled] = useState({
    metamask: false,
  });

  useEffect(() => {
    // Check for MetaMask
    if (typeof window !== 'undefined' && window.ethereum) {
      setInstalled({ metamask: true });
    }
  }, []);

  const MONAD_TESTNET = {
    chainId: '0x279F', // 10143 in hex
    chainName: 'Monad Testnet',
    nativeCurrency: {
      name: 'Monad',
      symbol: 'MON',
      decimals: 18,
    },
    rpcUrls: ['https://monad-testnet.g.alchemy.com/v2/yYeJcuQTPH7eO4NjrhY5v'],
    blockExplorerUrls: ['https://testnet.monad.xyz'],
  };

  const switchToMonadTestnet = async () => {
    try {
      // Try to switch to Monad testnet
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: MONAD_TESTNET.chainId }],
      });
    } catch (switchError) {
      // Chain doesn't exist, add it
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [MONAD_TESTNET],
          });
        } catch (addError) {
          throw new Error('Failed to add Monad Testnet to MetaMask');
        }
      } else {
        throw switchError;
      }
    }
  };

  const connectMetaMask = async () => {
    try {
      setConnecting(true);
      setError(null);

      if (!window.ethereum) {
        throw new Error('MetaMask is not installed');
      }

      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      const address = accounts[0];

      // Create provider and signer
      const provider = new ethers.BrowserProvider(window.ethereum);
      
      // Override getFeeData to force legacy transactions (Monad doesn't support EIP-1559)
      provider.getFeeData = async () => {
        const gasPrice = await provider.send('eth_gasPrice', []);
        return {
          gasPrice: BigInt(gasPrice),
          maxFeePerGas: null,
          maxPriorityFeePerGas: null
        };
      };
      
      const signer = await provider.getSigner();

      // Verify network
      const network = await provider.getNetwork();
      console.log('Connected to network:', network.name, 'Chain ID:', network.chainId);

      // Check if on Monad testnet (Chain ID: 10143)
      if (network.chainId !== 10143n) {
        console.log('Wrong network detected. Switching to Monad Testnet...');
        await switchToMonadTestnet();
        
        // Refresh provider after network switch
        const newProvider = new ethers.BrowserProvider(window.ethereum);
        
        // Override getFeeData for legacy transactions
        newProvider.getFeeData = async () => {
          const gasPrice = await newProvider.send('eth_gasPrice', []);
          return {
            gasPrice: BigInt(gasPrice),
            maxFeePerGas: null,
            maxPriorityFeePerGas: null
          };
        };
        
        const newSigner = await newProvider.getSigner();
        const newNetwork = await newProvider.getNetwork();
        
        console.log('Switched to network:', newNetwork.chainId);
        
        onConnected({
          address,
          provider: newProvider,
          signer: newSigner,
        });
      } else {
        onConnected({
          address,
          provider,
          signer,
        });
      }
    } catch (err) {
      console.error('Connection error:', err);
      setError(err.message || 'Failed to connect wallet');
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 relative">
      {/* Decorative Elements */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 30, ease: "linear" }}
        className="absolute top-20 left-10 w-20 h-20 border-2 border-cyan-500/20 rounded-full"
      />
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ repeat: Infinity, duration: 25, ease: "linear" }}
        className="absolute bottom-20 right-10 w-16 h-16 border-2 border-blue-500/20 rounded-full"
      />
      
      <motion.div 
        className="max-w-2xl w-full p-10 rounded-3xl bg-white/5 border border-white/10 shadow-2xl hover:shadow-cyan-400/30 transition-all backdrop-blur-xl relative z-10"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        whileHover={{ y: -5 }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
          className="text-7xl text-center mb-6"
        >
          🔐
        </motion.div>
        
        <h2 className="text-4xl font-bold text-center mb-4 bg-gradient-to-r from-cyan-300 to-blue-400 text-transparent bg-clip-text">Connect Your Wallet</h2>
        <p className="text-center text-gray-300 mb-10 text-lg">Choose a wallet to start making batch payments on-chain</p>

        <div className="space-y-4">
          <motion.button
            onClick={connectMetaMask}
            disabled={connecting || !installed.metamask}
            whileHover={{ scale: 1.03, y: -3 }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.2 }}
            className="w-full p-6 rounded-2xl bg-gradient-to-r from-orange-500/20 to-orange-600/20 border border-orange-500/30 hover:border-orange-400/50 transition-all flex items-center gap-6 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="text-5xl">
              🦊
            </div>
            <div className="text-left flex-1">
              <div className="text-xl font-bold text-white mb-1">
                {connecting ? 'Connecting...' : 'MetaMask'}
              </div>
              <div className="text-sm text-gray-300">Connect with MetaMask wallet</div>
            </div>
            {connecting && (
              <div className="animate-spin text-3xl">⏳</div>
            )}
          </motion.button>

          {!installed.metamask && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-center"
            >
              <p className="text-yellow-300 mb-2">⚠️ MetaMask not detected</p>
              <a 
                href="https://metamask.io" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-cyan-400 hover:text-cyan-300 underline font-semibold"
              >
                Install MetaMask Extension
              </a>
            </motion.div>
          )}
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 p-5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-4"
          >
            <div className="text-3xl">❌</div>
            <div className="flex-1">
              <strong className="text-red-400 text-lg block mb-1">Connection Failed</strong>
              <p className="text-red-300">{error}</p>
            </div>
          </motion.div>
        )}
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.7 }}
        className="mt-8 max-w-2xl w-full p-8 rounded-2xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20"
      >
        <h3 className="text-2xl font-bold text-center mb-4 text-cyan-300">🎁 Need Testnet Tokens?</h3>
        <p className="text-center text-gray-300 mb-6">Get free testnet MON tokens to start using VoidTx:</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <motion.a 
            href="https://faucet.monad.xyz" 
            target="_blank" 
            rel="noopener noreferrer"
            whileHover={{ scale: 1.05, x: 3 }}
            className="flex items-center gap-3 px-6 py-3 rounded-xl bg-white/5 border border-white/10 hover:border-cyan-500/50 transition-all"
          >
            <span className="text-2xl">🚰</span>
            <span className="font-semibold">Monad Testnet Faucet</span>
          </motion.a>
          <motion.a 
            href="https://discord.gg/monad" 
            target="_blank" 
            rel="noopener noreferrer"
            whileHover={{ scale: 1.05, x: 3 }}
            className="flex items-center gap-3 px-6 py-3 rounded-xl bg-white/5 border border-white/10 hover:border-cyan-500/50 transition-all"
          >
            <span className="text-2xl">💬</span>
            <span className="font-semibold">Monad Discord</span>
          </motion.a>
        </div>
      </motion.div>
    </div>
  );
}

export default WalletConnector;
