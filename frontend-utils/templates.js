/**
 * Templates System for Flash Pay
 * Predefined templates for common payment scenarios
 */

import { ethers } from 'ethers';

/**
 * Split Equally Template
 * Divides total amount equally among all recipients
 */
function splitEqually(totalAmount, recipients) {
  if (!recipients || recipients.length === 0) {
    return { success: false, error: 'No recipients provided' };
  }
  
  const total = parseFloat(totalAmount);
  if (isNaN(total) || total <= 0) {
    return { success: false, error: 'Invalid total amount' };
  }
  
  const perPerson = (total / recipients.length).toFixed(6);
  
  const payments = recipients.map(recipient => ({
    recipient: recipient.address || recipient,
    amount: perPerson
  }));
  
  return {
    success: true,
    payments,
    totalAmount: total.toFixed(6),
    perPerson
  };
}

/**
 * Fixed Amount Template
 * Each recipient gets a predefined fixed amount
 */
function fixedAmountTemplate(amountPerPerson, recipients) {
  const amount = parseFloat(amountPerPerson);
  if (isNaN(amount) || amount <= 0) {
    return { success: false, error: 'Invalid amount per person' };
  }
  
  const payments = recipients.map(recipient => ({
    recipient: recipient.address || recipient,
    amount: amount.toFixed(6)
  }));
  
  const totalAmount = (amount * recipients.length).toFixed(6);
  
  return {
    success: true,
    payments,
    totalAmount,
    perPerson: amount.toFixed(6)
  };
}

/**
 * Get all available templates
 */
function getAvailableTemplates() {
  return [
    {
      id: 'split-equally',
      name: 'Split Equally',
      description: 'Divide total amount equally among all recipients - Perfect for trips, dinners, group expenses',
      icon: '⚖️',
      inputs: ['totalAmount', 'recipients']
    },
    {
      id: 'fixed-amount',
      name: 'Fixed Amount',
      description: 'Each recipient gets the same fixed amount - Great for stipends, bounties, rewards',
      icon: '💰',
      inputs: ['amountPerPerson', 'recipients']
    }
  ];
}

/**
 * Apply template by ID
 */
function applyTemplate(templateId, params) {
  switch(templateId) {
    case 'split-equally':
      return splitEqually(params.totalAmount, params.recipients);
    case 'fixed-amount':
      return fixedAmountTemplate(params.amountPerPerson, params.recipients);
    default:
      return { success: false, error: 'Unknown template' };
  }
}

/**
 * Save custom template to localStorage
 */
function saveCustomTemplate(template) {
  if (typeof window === 'undefined') return { success: false, error: 'Not in browser' };
  
  try {
    const templates = JSON.parse(localStorage.getItem('voidtx_custom_templates') || '[]');
    templates.push({
      ...template,
      id: `custom-${Date.now()}`,
      createdAt: new Date().toISOString()
    });
    localStorage.setItem('voidtx_custom_templates', JSON.stringify(templates));
    return { success: true, templates };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Load custom templates from localStorage
 */
function loadCustomTemplates() {
  if (typeof window === 'undefined') return [];
  
  try {
    return JSON.parse(localStorage.getItem('voidtx_custom_templates') || '[]');
  } catch {
    return [];
  }
}

export {
  splitEqually,
  fixedAmountTemplate,
  getAvailableTemplates,
  applyTemplate,
  saveCustomTemplate,
  loadCustomTemplates
};
