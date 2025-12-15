/**
 * VoidTx API Client
 * Centralized API communication with backend server
 */

// Get API base URL from environment or default
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

class VoidTxAPI {
  /**
   * Health check - verify backend is running
   */
  static async checkHealth() {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      return await response.json();
    } catch (error) {
      console.error('Health check failed:', error);
      throw new Error('Backend server is not responding');
    }
  }

  /**
   * Get contract statistics
   */
  static async getStats() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/stats`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      throw error;
    }
  }

  /**
   * Get transaction events
   * @param {string} type - Event type: 'all', 'batch', 'success', 'failed', 'completed'
   * @param {Object} options - Query options { fromBlock, toBlock, limit }
   */
  static async getEvents(type = 'all', options = {}) {
    try {
      const params = new URLSearchParams();
      if (options.fromBlock) params.append('fromBlock', options.fromBlock);
      if (options.toBlock) params.append('toBlock', options.toBlock);
      if (options.limit) params.append('limit', options.limit);

      const url = `${API_BASE_URL}/api/events/${type}${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch events:', error);
      throw error;
    }
  }

  /**
   * Estimate batch payment cost
   * @param {Array} payments - Array of {recipient, amount}
   */
  static async estimateCost(payments) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/estimate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payments })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Failed to estimate cost:', error);
      throw error;
    }
  }

  /**
   * Get transaction status and details
   * @param {string} hash - Transaction hash
   */
  static async getTransactionStatus(hash) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/transaction/${hash}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch transaction status:', error);
      throw error;
    }
  }

  /**
   * Generate QR code for group payment
   * @param {string} sessionId - QR session ID
   */
  static async generateQR(sessionId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/qr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Failed to generate QR:', error);
      throw error;
    }
  }

  /**
   * Create QR join session
   * @param {Object} config - Session config
   */
  static async createQRSession(config) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/join/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Failed to create QR session:', error);
      throw error;
    }
  }

  /**
   * Add participant to QR join session
   * @param {string} sessionId - Session ID
   * @param {Object} participant - Participant data
   */
  static async addParticipant(sessionId, participant) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/join/${sessionId}/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(participant)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Failed to add participant:', error);
      throw error;
    }
  }

  /**
   * Get QR session recipients
   * @param {string} sessionId - Session ID
   */
  static async getSessionRecipients(sessionId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/join/${sessionId}/recipients`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch session recipients:', error);
      throw error;
    }
  }

  /**
   * Get session info
   * @param {string} sessionId - Session ID
   */
  static async getSessionInfo(sessionId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/join/${sessionId}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch session info:', error);
      throw error;
    }
  }

  /**
   * Close QR join session
   * @param {string} sessionId - Session ID
   * @param {string} creatorAddress - Creator wallet address
   */
  static async closeSession(sessionId, creatorAddress) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/join/${sessionId}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creatorAddress })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Failed to close session:', error);
      throw error;
    }
  }

  /**
   * Get all contract events for dashboard
   */
  static async getAllEvents() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/events/all?limit=200`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch all events:', error);
      throw error;
    }
  }

  /**
   * Get API base URL
   */
  static getBaseURL() {
    return API_BASE_URL;
  }

  /**
   * Set API base URL (for testing or different environments)
   */
  static setBaseURL(url) {
    return url;
  }
}

export default VoidTxAPI;
