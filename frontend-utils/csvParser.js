/**
 * CSV Parser for Flash Pay
 * Parses CSV files with addresses and amounts
 */

import { ethers } from 'ethers';

/**
 * Parse CSV file content
 * @param {string} csvContent - Raw CSV file content
 * @returns {Object} { success, data, errors }
 */
function parseCSV(csvContent) {
  const lines = csvContent.trim().split('\n');
  const data = [];
  const errors = [];
  
  // Skip header if present
  let startIndex = 0;
  const firstLine = lines[0].toLowerCase();
  if (firstLine.includes('address') || firstLine.includes('wallet')) {
    startIndex = 1;
  }
  
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines
    
    const parts = line.split(',').map(p => p.trim());
    
    if (parts.length < 2) {
      errors.push({
        line: i + 1,
        error: 'Invalid format. Expected: address,amount',
        raw: line
      });
      continue;
    }
    
    let [address, amount] = parts;
    
    // Clean and validate address
    address = address.trim().toLowerCase();
    
    // Basic validation
    if (!address.startsWith('0x') || address.length !== 42) {
      errors.push({
        line: i + 1,
        error: 'Invalid Ethereum address format',
        address,
        raw: line
      });
      continue;
    }
    
    // Check if it's a valid hex string
    const hexPattern = /^0x[0-9a-f]{40}$/i;
    if (!hexPattern.test(address)) {
      errors.push({
        line: i + 1,
        error: 'Invalid Ethereum address (not valid hex)',
        address,
        raw: line
      });
      continue;
    }
    
    // Validate amount
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      errors.push({
        line: i + 1,
        error: 'Invalid amount (must be positive number)',
        amount,
        raw: line
      });
      continue;
    }
    
    // Add valid entry with checksummed address
    try {
      const checksummedAddress = ethers.getAddress(address);
      data.push({
        recipient: checksummedAddress,
        amount: amount.toString()
      });
    } catch (err) {
      errors.push({
        line: i + 1,
        error: 'Failed to checksum address',
        address,
        raw: line
      });
    }
  }
  
  return {
    success: errors.length === 0,
    data,
    errors,
    total: data.length,
    totalAmount: data.reduce((sum, item) => sum + parseFloat(item.amount), 0).toFixed(4)
  };
}

/**
 * Generate sample CSV content
 */
function generateSampleCSV() {
  return `address,amount
0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1,0.5
0x5B38Da6a701c568545dCfcB03FcB875f56beddC4,1.2
0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2,0.8`;
}

/**
 * Validate CSV format before parsing
 */
function validateCSVFormat(csvContent) {
  if (!csvContent || csvContent.trim().length === 0) {
    return { valid: false, message: 'CSV file is empty' };
  }
  
  const lines = csvContent.trim().split('\n');
  if (lines.length < 1) {
    return { valid: false, message: 'CSV must have at least one line' };
  }
  
  return { valid: true, message: 'Format looks valid' };
}

/**
 * Export data back to CSV format
 */
function exportToCSV(data) {
  if (!data || data.length === 0) {
    return 'address,amount\n';
  }
  
  const header = 'address,amount\n';
  const rows = data.map(item => `${item.recipient},${item.amount}`).join('\n');
  return header + rows;
}

export {
  parseCSV,
  generateSampleCSV,
  validateCSVFormat,
  exportToCSV
};
