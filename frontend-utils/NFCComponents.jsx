/**
 * React Components for NFC Tap-to-Join Feature
 * With automatic fallback to QR codes
 */

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode.react';
import {
  checkNFCSupport,
  createNFCJoinSession,
  startNFCScanning,
  joinViaNFCTap,
  getRecommendedJoinMethod
} from './nfcManager';
import VoidTxAPI from './apiClient';

// ============ NFC/QR Join Creator Component ============
function NFCJoinCreator({ walletAddress, onRecipientsUpdate }) {
  const [sessionId, setSessionId] = useState(null);
  const [joinLink, setJoinLink] = useState('');
  const [method, setMethod] = useState(null); // 'nfc' or 'qr'
  const [nfcSupported, setNfcSupported] = useState(false);
  const [recipients, setRecipients] = useState([]);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  
  // Check NFC support on mount
  useEffect(() => {
    checkNFCSupport().then(result => {
      setNfcSupported(result.supported && result.available);
    });
  }, []);
  
  // Poll for new recipients
  useEffect(() => {
    if (!sessionId) return;
    
    const interval = setInterval(async () => {
      try {
        const data = await VoidTxAPI.getSessionRecipients(sessionId);
        setRecipients(data.recipients);
        onRecipientsUpdate(data.recipients);
      } catch (err) {
        console.error('Failed to fetch recipients:', err);
      }
    }, 3000);
    
    return () => clearInterval(interval);
  }, [sessionId, onRecipientsUpdate]);
  
  const createSession = async () => {
    setStatus('creating');
    setError(null);
    
    const result = await createNFCJoinSession(walletAddress);
    
    if (result.success) {
      setSessionId(result.sessionId);
      setJoinLink(result.joinLink);
      setMethod(result.method);
      setStatus(result.method === 'nfc' ? 'nfc-ready' : 'qr-ready');
      
      if (result.method === 'nfc') {
        // NFC tag written successfully
        console.log('✅ NFC tag ready!');
      } else if (result.qrFallback) {
        // Fell back to QR
        console.log('⚠️ Using QR fallback');
      }
    } else {
      setError(result.error);
      setStatus('error');
    }
  };
  
  const closeSession = async () => {
    try {
      await VoidTxAPI.closeSession(sessionId, walletAddress);
      setStatus('closed');
    } catch (err) {
      console.error('Failed to close session:', err);
      setError(err.message);
    }
  };
  
  return (
    <div className="nfc-join-creator">
      {status === 'idle' && (
        <div className="create-session">
          <h3>💸 Create Payout Session</h3>
          <p>
            {nfcSupported 
              ? '📱 NFC available - recipients can tap to join!'
              : '📱 QR code will be used (NFC not available)'}
          </p>
          <button onClick={createSession} className="btn-primary">
            {nfcSupported ? '📱 Enable NFC Tap-to-Join' : '📱 Generate QR Code'}
          </button>
        </div>
      )}
      
      {status === 'creating' && (
        <div className="loading">
          <p>Creating session...</p>
        </div>
      )}
      
      {status === 'nfc-ready' && (
        <div className="nfc-active">
          <div className="method-indicator">
            <span className="badge nfc">📱 NFC Active</span>
          </div>
          
          <div className="instructions">
            <h3>✅ NFC Tag Ready!</h3>
            <p className="highlight">
              👋 Recipients can now tap their phone to join the payout list
            </p>
            <ol>
              <li>Hold your NFC-enabled phone near the tag</li>
              <li>Tap when prompted</li>
              <li>Your wallet will be automatically added!</li>
            </ol>
          </div>
          
          <div className="qr-fallback">
            <details>
              <summary>📱 Show QR Code (for non-NFC devices)</summary>
              <div className="qr-container">
                <QRCode value={joinLink} size={200} />
                <p className="join-link">{joinLink}</p>
              </div>
            </details>
          </div>
          
          <div className="recipients-list">
            <h4>Joined Recipients ({recipients.length})</h4>
            {recipients.length === 0 ? (
              <p className="empty">Waiting for recipients to join...</p>
            ) : (
              <ul>
                {recipients.map((r, i) => (
                  <li key={i} className="recipient-item">
                    <span className="name">{r.name}</span>
                    <span className="address">{r.address.substring(0, 10)}...{r.address.substring(38)}</span>
                    <span className="badge">{r.joinMethod || 'joined'}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          <button onClick={closeSession} className="btn-secondary">
            Close Session & Proceed to Payment
          </button>
        </div>
      )}
      
      {status === 'qr-ready' && (
        <div className="qr-active">
          <div className="method-indicator">
            <span className="badge qr">📱 QR Code</span>
          </div>
          
          <div className="instructions">
            <h3>Scan to Join Payout</h3>
            <p>Recipients scan this QR code to add their wallet</p>
          </div>
          
          <div className="qr-container">
            <QRCode value={joinLink} size={256} />
            <p className="join-link">{joinLink}</p>
          </div>
          
          <div className="recipients-list">
            <h4>Joined Recipients ({recipients.length})</h4>
            {recipients.map((r, i) => (
              <div key={i} className="recipient-item">
                {r.name} - {r.address.substring(0, 10)}...
              </div>
            ))}
          </div>
          
          <button onClick={closeSession} className="btn-primary">
            Close Session
          </button>
        </div>
      )}
      
      {status === 'error' && (
        <div className="error">
          <p>❌ {error}</p>
          <button onClick={createSession}>Try Again</button>
        </div>
      )}
      
      {status === 'closed' && (
        <div className="success">
          <p>✅ Session closed. {recipients.length} recipients added.</p>
        </div>
      )}
    </div>
  );
}

// ============ NFC/QR Recipient Scanner Component ============
function NFCRecipientScanner({ walletAddress, onJoined }) {
  const [method, setMethod] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState(null);
  const [manualLink, setManualLink] = useState('');
  
  useEffect(() => {
    // Detect best method on mount
    getRecommendedJoinMethod().then(result => {
      setMethod(result.recommended);
    });
  }, []);
  
  const startNFCTap = async () => {
    setScanning(true);
    setError(null);
    
    const result = await startNFCScanning(async (data) => {
      // NFC tag detected with join link
      const joinResult = await joinViaNFCTap(walletAddress, data.joinLink);
      
      if (joinResult.success) {
        setJoined(true);
        setScanning(false);
        onJoined(joinResult);
      } else {
        setError(joinResult.error);
        setScanning(false);
      }
    });
    
    if (!result.success) {
      setError(result.error);
      setScanning(false);
      setMethod('qr'); // Fallback to QR
    }
  };
  
  const joinManually = async () => {
    if (!manualLink) {
      setError('Please enter a join link');
      return;
    }
    
    const result = await joinViaNFCTap(walletAddress, manualLink);
    
    if (result.success) {
      setJoined(true);
      onJoined(result);
    } else {
      setError(result.error);
    }
  };
  
  if (joined) {
    return (
      <div className="join-success">
        <h2>✅ Successfully Joined!</h2>
        <p>You've been added to the payout list.</p>
        <p className="highlight">Wait for the organizer to send the payment.</p>
      </div>
    );
  }
  
  return (
    <div className="nfc-recipient-scanner">
      <h2>💸 Join Flash Pay Payout</h2>
      
      {method === 'nfc' && (
        <div className="nfc-scan">
          <div className="nfc-icon">📱</div>
          <h3>Tap to Join</h3>
          <p>Hold your phone near the NFC tag</p>
          
          {!scanning ? (
            <button onClick={startNFCTap} className="btn-primary btn-large">
              📱 Start NFC Tap
            </button>
          ) : (
            <div className="scanning">
              <div className="pulse"></div>
              <p>👋 Waiting for NFC tag tap...</p>
            </div>
          )}
          
          <details className="manual-fallback">
            <summary>Or scan QR code / enter link manually</summary>
            <div className="manual-input">
              <input
                type="text"
                placeholder="Paste join link..."
                value={manualLink}
                onChange={(e) => setManualLink(e.target.value)}
              />
              <button onClick={joinManually}>Join</button>
            </div>
          </details>
        </div>
      )}
      
      {method === 'qr' && (
        <div className="qr-scan">
          <h3>Scan QR Code or Enter Link</h3>
          <p>Scan the QR code shown by the organizer</p>
          
          <div className="manual-input">
            <input
              type="text"
              placeholder="Or paste join link here..."
              value={manualLink}
              onChange={(e) => setManualLink(e.target.value)}
            />
            <button onClick={joinManually} className="btn-primary">
              Join Payout
            </button>
          </div>
        </div>
      )}
      
      {error && (
        <div className="error-message">
          ⚠️ {error}
        </div>
      )}
    </div>
  );
}

// ============ Method Detector Component ============
function JoinMethodDetector() {
  const [capabilities, setCapabilities] = useState(null);
  
  useEffect(() => {
    getRecommendedJoinMethod().then(setCapabilities);
  }, []);
  
  if (!capabilities) return <div>Detecting capabilities...</div>;
  
  return (
    <div className="capabilities-info">
      <h4>Device Capabilities:</h4>
      <ul>
        <li>
          NFC: {capabilities.nfc.supported ? '✅ Supported' : '❌ Not supported'}
          {capabilities.nfc.available && ' (Available)'}
        </li>
        <li>QR: ✅ Always available</li>
        <li>Recommended: {capabilities.recommended.toUpperCase()}</li>
        <li>Mobile: {capabilities.isMobile ? 'Yes' : 'No'}</li>
      </ul>
    </div>
  );
}

export {
  NFCJoinCreator,
  NFCRecipientScanner,
  JoinMethodDetector
};
