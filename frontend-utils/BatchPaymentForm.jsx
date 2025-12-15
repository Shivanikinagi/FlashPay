/**
 * Batch Payment Form Component
 * Input fields for addresses and amounts with add/remove functionality
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { parseCSV } from './csvParser';
import VoidTxAPI from './apiClient';
import { 
  splitEqually, 
  getAvailableTemplates, 
  applyTemplate,
  loadCustomTemplates 
} from './templates';
import { validateAddress, checkDuplicate, validateAmount, validateAllRecipients } from './validation';


function BatchPaymentForm({ walletAddress, onSubmit, onDisconnect, initialRecipients }) {
  const [recipients, setRecipients] = useState(
    initialRecipients && initialRecipients.length > 0 
      ? initialRecipients 
      : [
          { id: 1, address: '', amount: '' },
          { id: 2, address: '', amount: '' },
        ]
  );
  const [nextId, setNextId] = useState(initialRecipients?.length ? initialRecipients.length + 1 : 3);
  const [totalAmount, setTotalAmount] = useState('0');
  const [errors, setErrors] = useState({});
  const [warnings, setWarnings] = useState({});
  const [csvError, setCsvError] = useState(null);
  const [estimatedCost, setEstimatedCost] = useState(null);
  const [backendStatus, setBackendStatus] = useState('checking');
  const [estimating, setEstimating] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [templateAmount, setTemplateAmount] = useState('');
  const [availableTemplates, setAvailableTemplates] = useState([]);
  const [customTemplates, setCustomTemplates] = useState([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showAutoSplitModal, setShowAutoSplitModal] = useState(false);
  const [autoSplitAmount, setAutoSplitAmount] = useState('');

  // Update recipients when initialRecipients change
  useEffect(() => {
    if (initialRecipients && initialRecipients.length > 0) {
      // Merge with current recipients, avoiding duplicates
      setRecipients(prevRecipients => {
        const existingAddresses = new Set(
          prevRecipients
            .filter(r => r.address.trim())
            .map(r => r.address.toLowerCase())
        );
        
        const newRecipients = initialRecipients.filter(r => 
          r.address && !existingAddresses.has(r.address.toLowerCase())
        );
        
        // If we have new recipients, merge them
        if (newRecipients.length > 0) {
          const merged = [...prevRecipients, ...newRecipients];
          setNextId(merged.length + 1);
          setTotalAmount(calculateTotal(merged));
          return merged;
        }
        
        // Otherwise just update amounts if they changed
        const updated = prevRecipients.map(prevRec => {
          const matching = initialRecipients.find(
            r => r.address?.toLowerCase() === prevRec.address?.toLowerCase()
          );
          return matching && matching.amount ? matching : prevRec;
        });
        setTotalAmount(calculateTotal(updated));
        return updated;
      });
    }
  }, [initialRecipients]);

  // Check backend status on mount
  useEffect(() => {
    const checkBackend = async () => {
      try {
        await VoidTxAPI.checkHealth();
        setBackendStatus('connected');
      } catch (err) {
        setBackendStatus('disconnected');
      }
    };
    checkBackend();
  }, []);

  // Load templates on mount
  useEffect(() => {
    try {
      const templates = getAvailableTemplates();
      setAvailableTemplates(templates);
      const custom = loadCustomTemplates();
      setCustomTemplates(custom);
    } catch (err) {
      console.warn('Failed to load templates:', err);
    }
  }, []);

  // Estimate cost when recipients change
  useEffect(() => {
    const estimateCost = async () => {
      if (backendStatus !== 'connected' || recipients.length === 0) {
        setEstimatedCost(null);
        return;
      }

      // Only estimate if all fields are filled
      const validRecipients = recipients.filter(r => r.address.trim() && r.amount);
      if (validRecipients.length === 0) {
        setEstimatedCost(null);
        return;
      }

      setEstimating(true);
      try {
        const payments = validRecipients.map(r => ({
          recipient: r.address.trim(),
          amount: r.amount
        }));
        
        const estimate = await VoidTxAPI.estimateCost(payments);
        setEstimatedCost(estimate);
      } catch (err) {
        console.warn('Cost estimation failed:', err.message);
        setEstimatedCost(null);
      } finally {
        setEstimating(false);
      }
    };

    // Debounce estimation
    const timeout = setTimeout(estimateCost, 500);
    return () => clearTimeout(timeout);
  }, [recipients, backendStatus]);

  // Calculate total amount
  const calculateTotal = (recs) => {
    const total = recs.reduce((sum, r) => {
      const amount = parseFloat(r.amount) || 0;
      return sum + amount;
    }, 0);
    return total.toFixed(4);
  };

  // Auto-split: Divide total equally among recipients
  const handleAutoSplit = () => {
    const totalVal = parseFloat(totalAmount);
    if (isNaN(totalVal) || totalVal <= 0) {
      setShowAutoSplitModal(true);
      return;
    }

    const validRecipients = recipients.filter(r => r.address.trim());
    if (validRecipients.length === 0) {
      alert('Please add at least one recipient address');
      return;
    }

    const amountPerRecipient = (totalVal / validRecipients.length).toFixed(6);
    const updated = recipients.map(r => 
      r.address.trim() 
        ? { ...r, amount: amountPerRecipient }
        : r
    );
    setRecipients(updated);
    setShowAutoSplitModal(false);
  };

  // Apply auto-split from modal
  const applyAutoSplitFromModal = () => {
    const totalVal = parseFloat(autoSplitAmount);
    if (isNaN(totalVal) || totalVal <= 0) {
      alert('Please enter a valid total amount');
      return;
    }

    const validRecipients = recipients.filter(r => r.address.trim());
    if (validRecipients.length === 0) {
      alert('Please add at least one recipient address');
      setShowAutoSplitModal(false);
      return;
    }

    const amountPerRecipient = (totalVal / validRecipients.length).toFixed(6);
    const updated = recipients.map(r => 
      r.address.trim() 
        ? { ...r, amount: amountPerRecipient }
        : r
    );
    setRecipients(updated);
    setTotalAmount(totalVal.toFixed(4));
    setShowAutoSplitModal(false);
  };

  // Apply template
  const handleApplyTemplate = () => {
    if (!selectedTemplate) {
      alert('Please select a template');
      return;
    }

    const templateVal = parseFloat(templateAmount);
    if (isNaN(templateVal) || templateVal <= 0) {
      alert('Please enter a valid total amount');
      return;
    }

    const validRecipients = recipients.filter(r => r.address.trim());
    if (validRecipients.length === 0) {
      alert('Please add at least one recipient address');
      return;
    }

    // Prepare parameters based on template type
    const params = {
      recipients: validRecipients.map(r => ({ address: r.address.trim() }))
    };

    if (selectedTemplate === 'fixed-amount') {
      params.amountPerPerson = templateVal;
    } else {
      params.totalAmount = templateVal;
    }

    const result = applyTemplate(selectedTemplate, params);

    if (result.success) {
      // Map payments back to all recipients
      const updated = recipients.map(r => {
        if (!r.address.trim()) return r;
        const payment = result.payments.find(p => p.recipient.toLowerCase() === r.address.trim().toLowerCase());
        return payment ? { ...r, amount: payment.amount } : r;
      });
      
      setRecipients(updated);
      setTotalAmount(calculateTotal(updated));
      setShowTemplateModal(false);
      
      const message = selectedTemplate === 'fixed-amount' 
        ? `✅ Fixed amount applied! Each recipient gets ${result.perPerson} ETH (Total: ${result.totalAmount} ETH)`
        : `✅ Split equally applied! Each recipient gets ${result.perPerson} ETH`;
      alert(message);
    } else {
      alert(`❌ Error: ${result.error}`);
    }
  };

  // Handle input change with real-time validation
  const handleInputChange = (id, field, value) => {
    const updated = recipients.map((r) =>
      r.id === id ? { ...r, [field]: value } : r
    );
    setRecipients(updated);
    setTotalAmount(calculateTotal(updated));

    // Real-time validation
    if (field === 'address' && value) {
      const addressValidation = validateAddress(value);
      const errorKey = `${id}-address`;
      
      if (addressValidation.error) {
        setErrors(prev => ({ ...prev, [errorKey]: addressValidation.error }));
      } else {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[errorKey];
          return newErrors;
        });
      }
      
      // Check for duplicates
      const duplicateCheck = checkDuplicate(updated, value, id);
      const warningKey = `${id}-address`;
      if (duplicateCheck.isDuplicate) {
        setWarnings(prev => ({
          ...prev,
          [warningKey]: `⚠️ Duplicate address (appears ${duplicateCheck.count} times)`
        }));
      } else {
        setWarnings(prev => {
          const newWarnings = { ...prev };
          delete newWarnings[warningKey];
          return newWarnings;
        });
      }
    }
    
    if (field === 'amount' && value) {
      const amountValidation = validateAmount(value);
      const errorKey = `${id}-amount`;
      
      if (amountValidation.error) {
        setErrors(prev => ({ ...prev, [errorKey]: amountValidation.error }));
      } else {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[errorKey];
          return newErrors;
        });
      }
    }
  };

  // Add new row
  const handleAddRow = () => {
    setRecipients([...recipients, { id: nextId, address: '', amount: '' }]);
    setNextId(nextId + 1);
  };

  // Remove row
  const handleRemoveRow = (id) => {
    if (recipients.length === 1) {
      alert('You must have at least one recipient');
      return;
    }
    const updated = recipients.filter((r) => r.id !== id);
    setRecipients(updated);
    setTotalAmount(calculateTotal(updated));
  };

  // Handle CSV upload
  const handleCsvUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        setCsvError(null);
        const result = parseCSV(e.target.result);

        if (!result.success) {
          setCsvError(result.errors[0]?.error || 'Invalid CSV format');
          return;
        }

        // Convert CSV data to recipients
        const csvRecipients = result.data.map((item, index) => ({
          id: nextId + index,
          address: item.recipient || item.address || item.wallet || '',
          amount: item.amount || item.value || '',
        }));

        setRecipients(csvRecipients);
        setNextId(nextId + csvRecipients.length);
        setTotalAmount(calculateTotal(csvRecipients));
      } catch (err) {
        setCsvError('Failed to parse CSV file');
      }
    };

    reader.readAsText(file);
  };

  // Validate inputs using comprehensive validation
  const validateForm = () => {
    const validation = validateAllRecipients(recipients);
    
    if (!validation.valid && validation.errors) {
      const newErrors = {};
      validation.errors.forEach(error => {
        newErrors[`${error.id}-${error.field}`] = error.message;
      });
      setErrors(newErrors);
      return false;
    }

    return validation.valid;
  };

  // Handle submit
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) {
      alert('Please fix validation errors');
      return;
    }

    // Filter empty rows and prepare final data
    const finalRecipients = recipients
      .filter((r) => r.address.trim() && r.amount)
      .map((r) => ({
        address: r.address.trim(),
        amount: parseFloat(r.amount),
      }));

    if (finalRecipients.length === 0) {
      alert('Please add at least one recipient');
      return;
    }

    onSubmit(finalRecipients);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto"
    >
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-4xl font-bold bg-gradient-to-r from-cyan-300 to-blue-400 text-transparent bg-clip-text">💸 Create Batch Payment</h2>
        <div className="flex items-center gap-4">
          <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 font-mono text-cyan-300">
            {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
          </div>
          <button 
            onClick={onDisconnect}
            className="px-4 py-2 rounded-xl bg-red-500/20 border border-red-500/30 hover:bg-red-500/30 transition-all"
          >
            Disconnect
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* CSV Upload Section */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl"
        >
          <div className="text-lg font-semibold mb-4 text-cyan-300">
            📄 Or upload CSV
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <input
                id="csv-upload"
                type="file"
                accept=".csv"
                onChange={handleCsvUpload}
                style={{ display: 'none' }}
              />
              <label 
                htmlFor="csv-upload" 
                className="inline-block px-6 py-3 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-xl cursor-pointer hover:border-purple-400/50 transition-all"
              >
                📂 Choose File
              </label>
            </div>
            <span className="text-gray-400 text-sm">Format: address,amount (one per line)</span>
          </div>
          {csvError && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300"
            >
              {csvError}
            </motion.div>
          )}
        </motion.div>

        {/* Recipients Table */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl"
        >
          <h3 className="text-2xl font-bold mb-6 text-cyan-300">👥 Recipients</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="pb-4 text-left text-gray-400 font-semibold w-12">#</th>
                  <th className="pb-4 text-left text-gray-400 font-semibold">Address</th>
                  <th className="pb-4 text-left text-gray-400 font-semibold w-48">Amount (ETH)</th>
                  <th className="pb-4 w-16"></th>
                </tr>
              </thead>
              <tbody>
                {recipients.map((recipient, index) => {
                  const addressError = errors[`${recipient.id}-address`];
                  const addressWarning = warnings[`${recipient.id}-address`];
                  const amountError = errors[`${recipient.id}-amount`];

                  return (
                    <motion.tr 
                      key={recipient.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="border-b border-white/5"
                    >
                      <td className="py-4 text-gray-300">{index + 1}</td>
                      <td className="py-4">
                        <input
                          type="text"
                          placeholder="0x..."
                          value={recipient.address}
                          onChange={(e) =>
                            handleInputChange(recipient.id, 'address', e.target.value)
                          }
                          className={`w-full px-4 py-2 rounded-xl bg-white/5 border ${
                            addressError ? 'border-red-500/50' : addressWarning ? 'border-yellow-500/50' : 'border-white/10'
                          } text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-all font-mono`}
                        />
                        {addressError && (
                          <div className="mt-1 text-xs text-red-400">{addressError}</div>
                        )}
                        {!addressError && addressWarning && (
                          <div className="mt-1 text-xs text-yellow-400">{addressWarning}</div>
                        )}
                      </td>
                      <td className="py-4">
                        <input
                          type="number"
                          step="0.0001"
                          min="0"
                          placeholder="0.0"
                          value={recipient.amount}
                          onChange={(e) =>
                            handleInputChange(recipient.id, 'amount', e.target.value)
                          }
                          className={`w-full px-4 py-2 rounded-xl bg-white/5 border ${
                            amountError ? 'border-red-500/50' : 'border-white/10'
                          } text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-all`}
                        />
                        {amountError && (
                          <div className="mt-1 text-xs text-red-400">{amountError}</div>
                        )}
                      </td>
                      <td className="py-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(recipient.id)}
                          title="Remove row"
                          className="text-2xl hover:scale-110 transition-transform"
                        >
                          🗑️
                        </button>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Add Row Button */}
        <motion.button
          type="button"
          onClick={handleAddRow}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full py-3 rounded-xl bg-white/5 border border-white/10 hover:border-cyan-500/50 text-cyan-300 font-semibold transition-all"
        >
          + Add Recipient
        </motion.button>

        {/* Feature Buttons Row */}
        <div className="flex gap-4 flex-wrap">
          <motion.button
            type="button"
            onClick={handleAutoSplit}
            title="Divide total amount equally among recipients"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 hover:border-green-400/50 font-semibold transition-all"
          >
            ⚖️ Auto-Split
          </motion.button>

          <motion.button
            type="button"
            onClick={() => setShowTemplateModal(true)}
            title="Apply a predefined payment template"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 hover:border-purple-400/50 font-semibold transition-all"
          >
            📋 Templates
          </motion.button>
        </div>

        {/* Template Modal */}
        {showTemplateModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-2xl w-full bg-gradient-to-b from-gray-900 to-black border border-white/10 rounded-3xl p-8 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-3xl font-bold bg-gradient-to-r from-cyan-300 to-blue-400 text-transparent bg-clip-text">📋 Payment Templates</h3>
                <button 
                  onClick={() => setShowTemplateModal(false)}
                  className="text-3xl text-gray-400 hover:text-white transition"
                >
                  ✕
                </button>
              </div>

              <div>
                <p className="text-gray-300 mb-6">Choose a quick payment distribution method:</p>
                
                <div className="space-y-3 mb-6">
                  {availableTemplates.map(template => (
                    <motion.div
                      key={template.id}
                      onClick={() => setSelectedTemplate(template.id)}
                      whileHover={{ scale: 1.02 }}
                      className={`p-5 rounded-xl cursor-pointer transition-all ${
                        selectedTemplate === template.id 
                          ? 'bg-cyan-500/20 border-2 border-cyan-500/50' 
                          : 'bg-white/5 border border-white/10 hover:border-cyan-500/30'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-4xl">{template.icon}</div>
                        <div className="flex-1">
                          <div className="font-bold text-lg text-white">{template.name}</div>
                          <div className="text-sm text-gray-400">{template.description}</div>
                        </div>
                        {selectedTemplate === template.id && (
                          <div className="text-3xl text-cyan-400">✓</div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>

                {selectedTemplate && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    <label className="block text-gray-300 font-semibold">
                      {selectedTemplate === 'fixed-amount' ? 'Amount per Recipient (ETH):' : 'Total Amount (ETH):'}
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      min="0"
                      placeholder={selectedTemplate === 'fixed-amount' ? 'e.g., 0.1' : 'e.g., 1.0'}
                      value={templateAmount}
                      onChange={(e) => setTemplateAmount(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-all"
                    />
                    {selectedTemplate === 'split-equally' && templateAmount && recipients.filter(r => r.address.trim()).length > 0 && (
                      <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-green-300">
                        Each recipient gets: <strong>{(parseFloat(templateAmount) / recipients.filter(r => r.address.trim()).length).toFixed(6)} ETH</strong>
                      </div>
                    )}
                    {selectedTemplate === 'fixed-amount' && templateAmount && recipients.filter(r => r.address.trim()).length > 0 && (
                      <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300">
                        Total: <strong>{(parseFloat(templateAmount) * recipients.filter(r => r.address.trim()).length).toFixed(6)} ETH</strong>
                      </div>
                    )}
                  </motion.div>
                )}
              </div>

              <div className="flex gap-4 mt-8">
                <button
                  onClick={() => setShowTemplateModal(false)}
                  className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApplyTemplate}
                  disabled={!selectedTemplate || !templateAmount}
                  className="flex-1 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Apply Template
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Auto-Split Modal */}
        {showAutoSplitModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-lg w-full bg-gradient-to-b from-gray-900 to-black border border-white/10 rounded-3xl p-8 shadow-2xl"
            >
              <h3 className="text-3xl font-bold mb-4 bg-gradient-to-r from-green-300 to-emerald-400 text-transparent bg-clip-text">⚖️ Auto-Split Payments</h3>
              <p className="text-gray-300 mb-6">
                Divide the total amount equally among all recipients with addresses
              </p>

              <div className="p-4 rounded-xl bg-white/5 border border-white/10 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-400">Recipients with addresses:</span>
                  <span className="text-cyan-300 font-bold">{recipients.filter(r => r.address.trim()).length}</span>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-gray-300 font-semibold mb-3">Total Amount (ETH)</label>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  placeholder="0.00"
                  value={autoSplitAmount}
                  onChange={(e) => {
                    const val = e.target.value;
                    setAutoSplitAmount(val);
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      applyAutoSplitFromModal();
                    }
                  }}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-all"
                />
              </div>

              {autoSplitAmount && recipients.filter(r => r.address.trim()).length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-5 rounded-xl bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 mb-6 text-center"
                >
                  <div className="text-sm text-gray-300 mb-2">Each recipient will receive:</div>
                  <div className="text-3xl font-bold text-green-300">
                    {(parseFloat(autoSplitAmount) / recipients.filter(r => r.address.trim()).length).toFixed(6)} ETH
                  </div>
                </motion.div>
              )}

              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setShowAutoSplitModal(false);
                    setAutoSplitAmount('');
                  }}
                  className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={applyAutoSplitFromModal}
                  disabled={!autoSplitAmount || parseFloat(autoSplitAmount) <= 0}
                  className="flex-1 py-3 rounded-xl bg-green-500 hover:bg-green-400 text-black font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Split Equally
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Backend Status */}
        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${
          backendStatus === 'connected' ? 'bg-green-500/10 border border-green-500/30' : 
          backendStatus === 'checking' ? 'bg-yellow-500/10 border border-yellow-500/30' :
          'bg-gray-500/10 border border-gray-500/30'
        }`}>
          <span className={`text-2xl ${
            backendStatus === 'connected' ? 'text-green-400' :
            backendStatus === 'checking' ? 'text-yellow-400' :
            'text-gray-400'
          }`}>●</span>
          <span className="text-sm text-gray-300">
            {backendStatus === 'connected' && 'Backend Connected'}
            {backendStatus === 'checking' && 'Checking backend...'}
            {backendStatus === 'disconnected' && 'Backend Offline (fallback mode)'}
          </span>
        </div>

        {/* Cost Estimation */}
        {estimatedCost && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-2xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30"
          >
            <h4 className="text-xl font-bold mb-4 text-blue-300">Cost Breakdown</h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-300">Total Payment:</span>
                <strong className="text-white">{estimatedCost.totalCost} ETH</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Gas Estimate:</span>
                <strong className="text-white">{estimatedCost.gasEstimate !== 'N/A' ? estimatedCost.gasEstimate : 'N/A'} units</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Recipients:</span>
                <strong className="text-white">{estimatedCost.recipientCount}</strong>
              </div>
            </div>
          </motion.div>
        )}

        {/* Summary */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-6 rounded-2xl bg-white/5 border border-white/10"
        >
          <div className="flex justify-between items-center mb-3">
            <span className="text-gray-300">Recipients:</span>
            <strong className="text-2xl text-cyan-300">{recipients.filter(r => r.address.trim() && r.amount).length}</strong>
          </div>
          <div className="flex justify-between items-center pt-3 border-t border-white/10">
            <span className="text-xl text-gray-300">Total Amount:</span>
            <strong className="text-3xl bg-gradient-to-r from-cyan-300 to-blue-400 text-transparent bg-clip-text">{totalAmount} ETH</strong>
          </div>
        </motion.div>

        {/* Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <motion.button 
            type="submit"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-4 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black text-lg font-bold shadow-xl hover:shadow-cyan-400/40 transition-all"
          >
            Next: Review Payment →
          </motion.button>
        </motion.div>
      </form>
    </motion.div>
  );
}

export default BatchPaymentForm;
