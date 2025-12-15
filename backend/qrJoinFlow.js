/**
 * QR Join Flow - Backend Session Management
 * Allows users to scan QR code and join payout list
 */

const express = require('express');
const router = express.Router();
const { ethers } = require('ethers');

// In-memory session storage (use Redis in production)
const sessions = new Map();
const SESSION_EXPIRY = 30 * 60 * 1000; // 30 minutes

/**
 * Generate session ID
 */
function generateSessionId() {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

/**
 * Create new join session
 * POST /api/join/create
 */
router.post('/create', (req, res) => {
  try {
    const { creatorAddress, maxRecipients = 100 } = req.body;
    
    if (!creatorAddress) {
      return res.status(400).json({ error: 'Creator address required' });
    }
    
    const sessionId = generateSessionId();
    
    // Generate join links - web URL and deep link
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const webLink = `${frontendUrl}/join/${sessionId}`;
    const deepLink = `voidtx://join/${sessionId}`;
    const universalLink = `${frontendUrl}?session=${sessionId}`;
    const joinLink = webLink; // Default for QR code
    
    sessions.set(sessionId, {
      sessionId,
      creatorAddress,
      recipients: [],
      maxRecipients,
      createdAt: Date.now(),
      expiresAt: Date.now() + SESSION_EXPIRY,
      active: true
    });
    
    res.json({
      success: true,
      sessionId,
      joinLink,  // Web URL for QR code
      webLink,   // Full web URL
      deepLink,  // Deep link
      universalLink, // Universal link
      qrData: joinLink,
      expiresIn: SESSION_EXPIRY / 1000
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get session details
 * GET /api/join/:sessionId
 */
router.get('/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = sessions.get(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    if (Date.now() > session.expiresAt) {
      sessions.delete(sessionId);
      return res.status(410).json({ error: 'Session expired' });
    }
    
    res.json({
      success: true,
      session: {
        sessionId: session.sessionId,
        recipientCount: session.recipients.length,
        maxRecipients: session.maxRecipients,
        active: session.active,
        expiresAt: new Date(session.expiresAt).toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Add recipient to session
 * POST /api/join/:sessionId/add
 */
router.post('/:sessionId/add', (req, res) => {
  try {
    const { sessionId } = req.params;
    const { address, name, amount, joinMethod } = req.body;
    
    if (!address) {
      return res.status(400).json({ error: 'Address required' });
    }
    
    const session = sessions.get(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    if (Date.now() > session.expiresAt) {
      sessions.delete(sessionId);
      return res.status(410).json({ error: 'Session expired' });
    }
    
    if (!session.active) {
      return res.status(403).json({ error: 'Session is closed' });
    }
    
    if (session.recipients.some(r => r.address.toLowerCase() === address.toLowerCase())) {
      return res.status(409).json({ error: 'Address already added' });
    }
    
    if (session.recipients.length >= session.maxRecipients) {
      return res.status(403).json({ error: 'Maximum recipients reached' });
    }
    
    if (!ethers.isAddress(address)) {
      return res.status(400).json({ error: 'Invalid Ethereum address' });
    }
    
    session.recipients.push({
      address,
      name: name || 'Anonymous',
      amount: amount || 0,
      joinMethod: joinMethod || 'qr', // 'qr' or other methods
      addedAt: Date.now()
    });
    
    res.json({
      success: true,
      recipient: {
        address,
        name: name || 'Anonymous',
        amount: amount || 0,
        joinMethod: joinMethod || 'qr',
        position: session.recipients.length
      },
      totalRecipients: session.recipients.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get all recipients
 * GET /api/join/:sessionId/recipients
 */
router.get('/:sessionId/recipients', (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = sessions.get(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    res.json({
      success: true,
      recipients: session.recipients,
      total: session.recipients.length,
      maxRecipients: session.maxRecipients
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Close session
 * POST /api/join/:sessionId/close
 */
router.post('/:sessionId/close', (req, res) => {
  try {
    const { sessionId } = req.params;
    const { creatorAddress } = req.body;
    
    const session = sessions.get(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    if (session.creatorAddress.toLowerCase() !== creatorAddress?.toLowerCase()) {
      return res.status(403).json({ error: 'Only creator can close session' });
    }
    
    session.active = false;
    
    res.json({
      success: true,
      message: 'Session closed',
      finalRecipients: session.recipients
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Cleanup expired sessions
 */
function cleanupExpiredSessions() {
  const now = Date.now();
  for (const [sessionId, session] of sessions.entries()) {
    if (now > session.expiresAt) {
      sessions.delete(sessionId);
    }
  }
}

setInterval(cleanupExpiredSessions, 5 * 60 * 1000);

module.exports = router;
