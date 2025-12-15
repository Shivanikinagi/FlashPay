/**
 * NFC Tap-to-Join Manager for Flash Pay
 * Handles NFC reading/writing with fallback to QR codes
 */

/**
 * Check if NFC is supported on this device
 */
async function checkNFCSupport() {
  // Check if browser supports Web NFC API
  if (!('NDEFReader' in window)) {
    return {
      supported: false,
      reason: 'Web NFC API not supported in this browser'
    };
  }
  
  try {
    // Request permission
    const permissionStatus = await navigator.permissions.query({ name: "nfc" });
    
    return {
      supported: true,
      permission: permissionStatus.state, // 'granted', 'denied', or 'prompt'
      available: permissionStatus.state === 'granted'
    };
  } catch (error) {
    return {
      supported: false,
      reason: error.message
    };
  }
}

/**
 * Write join link to NFC tag
 * @param {string} joinLink - The join URL to write
 * @returns {Promise<Object>} Write result
 */
async function writeNFCTag(joinLink) {
  try {
    // Check NFC support first
    const nfcSupport = await checkNFCSupport();
    if (!nfcSupport.supported) {
      throw new Error('NFC not supported on this device');
    }
    
    if (!('NDEFReader' in window)) {
      throw new Error('Web NFC API not available');
    }
    
    const ndef = new NDEFReader();
    
    // Request write permission
    await ndef.write({
      records: [
        {
          recordType: "url",
          data: joinLink
        },
        {
          recordType: "text",
          data: "Flash Pay - Tap to join payout"
        }
      ]
    });
    
    return {
      success: true,
      message: 'NFC tag written successfully',
      joinLink
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      fallback: 'qr'
    };
  }
}

/**
 * Read NFC tag and extract join link
 * @returns {Promise<Object>} Read result
 */
async function readNFCTag() {
  try {
    const nfcSupport = await checkNFCSupport();
    if (!nfcSupport.supported) {
      throw new Error('NFC not supported on this device');
    }
    
    const ndef = new NDEFReader();
    
    return new Promise((resolve, reject) => {
      // Set timeout for reading
      const timeout = setTimeout(() => {
        reject(new Error('NFC read timeout'));
      }, 30000); // 30 second timeout
      
      ndef.scan().then(() => {
        console.log("NFC scan started - waiting for tag...");
        
        ndef.onreading = (event) => {
          clearTimeout(timeout);
          
          const { message } = event;
          let joinLink = null;
          
          // Extract URL from NFC message
          for (const record of message.records) {
            if (record.recordType === "url") {
              const textDecoder = new TextDecoder();
              joinLink = textDecoder.decode(record.data);
              break;
            }
          }
          
          if (joinLink) {
            resolve({
              success: true,
              joinLink,
              serialNumber: event.serialNumber
            });
          } else {
            reject(new Error('No join link found on NFC tag'));
          }
        };
        
        ndef.onerror = (error) => {
          clearTimeout(timeout);
          reject(error);
        };
      }).catch(error => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  } catch (error) {
    return {
      success: false,
      error: error.message,
      fallback: 'qr'
    };
  }
}

/**
 * Start NFC scanning mode (for recipient devices)
 * @param {Function} onJoinLinkDetected - Callback when join link is detected
 */
async function startNFCScanning(onJoinLinkDetected) {
  try {
    const nfcSupport = await checkNFCSupport();
    if (!nfcSupport.supported) {
      return {
        success: false,
        error: 'NFC not supported',
        fallback: 'qr'
      };
    }
    
    const ndef = new NDEFReader();
    await ndef.scan();
    
    console.log("👋 NFC scanning active - tap to join payout");
    
    ndef.onreading = (event) => {
      const { message } = event;
      
      for (const record of message.records) {
        if (record.recordType === "url") {
          const textDecoder = new TextDecoder();
          const joinLink = textDecoder.decode(record.data);
          
          if (joinLink.includes('/join/')) {
            onJoinLinkDetected({
              joinLink,
              serialNumber: event.serialNumber,
              method: 'nfc'
            });
            break;
          }
        }
      }
    };
    
    return {
      success: true,
      message: 'NFC scanning started'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      fallback: 'qr'
    };
  }
}

/**
 * Stop NFC scanning
 */
function stopNFCScanning() {
  // Note: Web NFC API doesn't have explicit stop method
  // Scanning stops when page is closed or navigated away
  console.log("NFC scanning stopped");
}

/**
 * Create NFC join session with automatic fallback to QR
 * @param {string} creatorAddress - Wallet address of creator
 * @param {string} backendUrl - Backend API URL
 */
async function createNFCJoinSession(creatorAddress, backendUrl = 'http://localhost:3001') {
  try {
    // Create session via backend
    const response = await fetch(`${backendUrl}/api/join/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creatorAddress })
    });
    
    if (!response.ok) {
      throw new Error('Failed to create join session');
    }
    
    const data = await response.json();
    const { joinLink, sessionId } = data;
    
    // Check NFC support
    const nfcSupport = await checkNFCSupport();
    
    let method = 'qr'; // Default fallback
    let nfcWriteResult = null;
    
    if (nfcSupport.supported && nfcSupport.available) {
      // Try to write to NFC tag
      console.log("📱 NFC available - tap tag to write...");
      nfcWriteResult = await writeNFCTag(joinLink);
      
      if (nfcWriteResult.success) {
        method = 'nfc';
      }
    }
    
    return {
      success: true,
      sessionId,
      joinLink,
      method, // 'nfc' or 'qr'
      nfcSupported: nfcSupport.supported,
      nfcAvailable: nfcSupport.available,
      nfcWriteResult,
      qrFallback: !nfcWriteResult?.success || method === 'qr'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      method: 'qr', // Always fallback to QR on error
      qrFallback: true
    };
  }
}

/**
 * Handle recipient joining via NFC tap
 * @param {string} walletAddress - Recipient's wallet address
 * @param {string} joinLink - Join link from NFC tag
 * @param {string} backendUrl - Backend API URL
 */
async function joinViaNFCTap(walletAddress, joinLink, backendUrl = 'http://localhost:3001') {
  try {
    // Extract session ID from join link
    const sessionId = joinLink.split('/join/')[1];
    
    if (!sessionId) {
      throw new Error('Invalid join link');
    }
    
    // Add recipient to session
    const response = await fetch(`${backendUrl}/api/join/${sessionId}/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address: walletAddress,
        name: 'NFC Tap User',
        joinMethod: 'nfc'
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to join');
    }
    
    const result = await response.json();
    
    return {
      success: true,
      message: 'Successfully joined via NFC tap! 🎉',
      recipient: result.recipient,
      totalRecipients: result.totalRecipients
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get device capabilities and recommend best method
 */
async function getRecommendedJoinMethod() {
  const nfcSupport = await checkNFCSupport();
  
  // Check if device is mobile
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  return {
    recommended: nfcSupport.supported && nfcSupport.available ? 'nfc' : 'qr',
    nfc: {
      supported: nfcSupport.supported,
      available: nfcSupport.available,
      permission: nfcSupport.permission
    },
    qr: {
      supported: true, // QR always works
      available: true
    },
    isMobile,
    deviceInfo: {
      userAgent: navigator.userAgent,
      platform: navigator.platform
    }
  };
}

export {
  checkNFCSupport,
  writeNFCTag,
  readNFCTag,
  startNFCScanning,
  stopNFCScanning,
  createNFCJoinSession,
  joinViaNFCTap,
  getRecommendedJoinMethod
};
