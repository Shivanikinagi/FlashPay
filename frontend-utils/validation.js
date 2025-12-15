/**
 * Address Validation Utilities
 * Provides checksum validation and duplicate detection for Ethereum addresses
 */

import { ethers } from 'ethers';

/**
 * Validate Ethereum address with checksum
 * @param {string} address - Address to validate
 * @returns {Object} Validation result with status and message
 */
export function validateAddress(address) {
  if (!address || address.trim() === '') {
    return {
      valid: false,
      error: 'Address is required',
      type: 'required'
    };
  }

  const trimmed = address.trim();

  // Check if it starts with 0x
  if (!trimmed.startsWith('0x')) {
    return {
      valid: false,
      error: 'Address must start with 0x',
      type: 'format'
    };
  }

  // Check length (0x + 40 hex characters)
  if (trimmed.length !== 42) {
    return {
      valid: false,
      error: `Address must be 42 characters (got ${trimmed.length})`,
      type: 'length'
    };
  }

  // Check if it contains only hex characters
  const hexRegex = /^0x[0-9a-fA-F]{40}$/;
  if (!hexRegex.test(trimmed)) {
    return {
      valid: false,
      error: 'Address contains invalid characters',
      type: 'format'
    };
  }

  // Validate checksum using ethers.js
  try {
    const checksumAddress = ethers.getAddress(trimmed);
    
    // If the input address has mixed case, verify checksum
    if (trimmed !== trimmed.toLowerCase() && trimmed !== trimmed.toUpperCase()) {
      if (checksumAddress !== trimmed) {
        return {
          valid: false,
          error: 'Invalid checksum - address may be incorrect',
          type: 'checksum',
          suggestion: checksumAddress
        };
      }
    }

    return {
      valid: true,
      address: checksumAddress,
      type: 'success'
    };
  } catch (error) {
    return {
      valid: false,
      error: 'Invalid Ethereum address',
      type: 'invalid'
    };
  }
}

/**
 * Check for duplicate addresses in a list
 * @param {Array} recipients - Array of recipient objects with address field
 * @param {string} currentAddress - Address being checked
 * @param {string} currentId - ID of current recipient (to exclude self)
 * @returns {Object} Duplicate check result
 */
export function checkDuplicate(recipients, currentAddress, currentId) {
  if (!currentAddress || currentAddress.trim() === '') {
    return { isDuplicate: false };
  }

  const trimmed = currentAddress.trim().toLowerCase();
  
  // Find duplicates (excluding current recipient)
  const duplicates = recipients.filter(r => 
    r.id !== currentId && 
    r.address && 
    r.address.trim().toLowerCase() === trimmed
  );

  if (duplicates.length > 0) {
    return {
      isDuplicate: true,
      error: 'Duplicate address detected',
      count: duplicates.length + 1, // Include current one
      type: 'duplicate'
    };
  }

  return { isDuplicate: false };
}

/**
 * Validate amount
 * @param {string|number} amount - Amount to validate
 * @returns {Object} Validation result
 */
export function validateAmount(amount) {
  if (!amount || amount === '') {
    return {
      valid: false,
      error: 'Amount is required',
      type: 'required'
    };
  }

  const numAmount = parseFloat(amount);

  if (isNaN(numAmount)) {
    return {
      valid: false,
      error: 'Amount must be a number',
      type: 'format'
    };
  }

  if (numAmount <= 0) {
    return {
      valid: false,
      error: 'Amount must be greater than 0',
      type: 'range'
    };
  }

  // Check for too many decimals (18 is ETH limit)
  const decimalStr = amount.toString();
  const decimalPart = decimalStr.split('.')[1];
  if (decimalPart && decimalPart.length > 18) {
    return {
      valid: false,
      error: 'Too many decimal places (max 18)',
      type: 'precision'
    };
  }

  // Warn if amount is very small
  if (numAmount < 0.0001) {
    return {
      valid: true,
      warning: 'Amount is very small',
      type: 'warning'
    };
  }

  return {
    valid: true,
    type: 'success'
  };
}

/**
 * Get all validation errors for a recipient
 * @param {Object} recipient - Recipient object
 * @param {Array} allRecipients - All recipients for duplicate check
 * @returns {Object} All validation results
 */
export function validateRecipient(recipient, allRecipients) {
  const addressValidation = validateAddress(recipient.address);
  const duplicateCheck = checkDuplicate(allRecipients, recipient.address, recipient.id);
  const amountValidation = validateAmount(recipient.amount);

  return {
    address: {
      ...addressValidation,
      ...(duplicateCheck.isDuplicate && { duplicate: duplicateCheck })
    },
    amount: amountValidation,
    isValid: addressValidation.valid && !duplicateCheck.isDuplicate && amountValidation.valid
  };
}

/**
 * Batch validate all recipients
 * @param {Array} recipients - Array of recipients
 * @returns {Object} Validation results for all recipients
 */
export function validateAllRecipients(recipients) {
  const errors = [];
  
  recipients.forEach(recipient => {
    const validation = validateRecipient(recipient, recipients);
    
    if (!validation.address.valid) {
      errors.push({
        id: recipient.id,
        field: 'address',
        message: validation.address.error
      });
    }
    
    if (!validation.amount.valid) {
      errors.push({
        id: recipient.id,
        field: 'amount',
        message: validation.amount.error
      });
    }
  });

  return {
    valid: errors.length === 0,
    errors: errors,
    validCount: recipients.length - errors.length
  };
}
