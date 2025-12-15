/**
 * Example React Components for Flash Pay Advanced Features
 * Copy these components to your React frontend
 */

// ============ CSV Upload Component ============
import React, { useState } from 'react';
import { parseCSV } from '../utils/csvParser';

function CSVUpload({ onRecipientsParsed }) {
  const [error, setError] = useState(null);
  
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = parseCSV(e.target.result);
      
      if (result.success) {
        onRecipientsParsed(result.data);
        setError(null);
      } else {
        setError(result.errors);
      }
    };
    
    reader.readAsText(file);
  };
  
  return (
    <div className="csv-upload">
      <input 
        type="file" 
        accept=".csv" 
        onChange={handleFileUpload}
      />
      {error && (
        <div className="errors">
          {error.map((err, i) => (
            <div key={i}>Line {err.line}: {err.error}</div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ Template Selector Component ============
import { getAvailableTemplates, applyTemplate } from '../utils/templates';

function TemplateSelector({ recipients, onApply }) {
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const templates = getAvailableTemplates();
  
  const handleApply = () => {
    const result = applyTemplate(selectedTemplate, {
      totalAmount,
      recipients: recipients.map(r => r.address)
    });
    
    if (result.success) {
      onApply(result.payments);
    }
  };
  
  return (
    <div className="template-selector">
      <select 
        value={selectedTemplate}
        onChange={(e) => setSelectedTemplate(e.target.value)}
      >
        <option value="">Select Template</option>
        {templates.map(t => (
          <option key={t.id} value={t.id}>
            {t.icon} {t.name}
          </option>
        ))}
      </select>
      
      {selectedTemplate && (
        <>
          <input
            type="number"
            placeholder="Total Amount (ETH)"
            value={totalAmount}
            onChange={(e) => setTotalAmount(e.target.value)}
          />
          <button onClick={handleApply}>Apply Template</button>
        </>
      )}
    </div>
  );
}

// ============ Dashboard Component ============
import { 
  processTransactionHistory, 
  calculateDashboardStats,
  generateVolumeChartData,
  searchTransactions,
  exportTransactionsToCSV
} from '../utils/dashboard';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

function Dashboard() {
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  useEffect(() => {
    // Fetch events from backend
    fetch('http://localhost:3001/events/all')
      .then(r => r.json())
      .then(({ events }) => {
        const { transactions } = processTransactionHistory(events);
        setTransactions(transactions);
        
        const stats = calculateDashboardStats(transactions);
        setStats(stats);
        
        const chartData = generateVolumeChartData(transactions, 'day');
        setChartData(chartData);
      });
  }, []);
  
  const filteredTransactions = searchTransactions(transactions, searchQuery);
  
  const handleExport = () => {
    const csv = exportTransactionsToCSV(filteredTransactions);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'flashpay-transactions.csv';
    a.click();
  };
  
  return (
    <div className="dashboard">
      <div className="stats">
        <div className="stat-card">
          <h3>{stats?.totalTransactions}</h3>
          <p>Total Transactions</p>
        </div>
        <div className="stat-card">
          <h3>{stats?.totalRecipients}</h3>
          <p>Total Recipients</p>
        </div>
        <div className="stat-card">
          <h3>{stats?.totalVolume} ETH</h3>
          <p>Total Volume</p>
        </div>
        <div className="stat-card">
          <h3>{stats?.successRate}</h3>
          <p>Success Rate</p>
        </div>
      </div>
      
      <div className="chart">
        <h3>Volume Over Time</h3>
        <LineChart width={600} height={300} data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="volume" stroke="#8884d8" />
        </LineChart>
      </div>
      
      <div className="transactions">
        <input
          type="text"
          placeholder="Search by address or tx hash..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <button onClick={handleExport}>Export CSV</button>
        
        <table>
          <thead>
            <tr>
              <th>Tx Hash</th>
              <th>Recipients</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.map(tx => (
              <tr key={tx.txHash}>
                <td>{tx.txHash.substring(0, 10)}...</td>
                <td>{tx.totalRecipients}</td>
                <td>{(parseFloat(tx.totalAmount) / 1e18).toFixed(4)} ETH</td>
                <td>{tx.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============ QR Join Flow Component ============
import QRCode from 'qrcode.react';

function QRJoinCreator({ walletAddress, onRecipientsUpdate }) {
  const [sessionId, setSessionId] = useState(null);
  const [joinLink, setJoinLink] = useState('');
  const [recipients, setRecipients] = useState([]);
  
  const createSession = async () => {
    const response = await fetch('http://localhost:3001/api/join/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creatorAddress: walletAddress })
    });
    
    const data = await response.json();
    setSessionId(data.sessionId);
    setJoinLink(data.joinLink);
  };
  
  // Poll for new recipients every 3 seconds
  useEffect(() => {
    if (!sessionId) return;
    
    const interval = setInterval(async () => {
      const response = await fetch(`http://localhost:3001/api/join/${sessionId}/recipients`);
      const data = await response.json();
      setRecipients(data.recipients);
      onRecipientsUpdate(data.recipients);
    }, 3000);
    
    return () => clearInterval(interval);
  }, [sessionId]);
  
  const closeSession = async () => {
    await fetch(`http://localhost:3001/api/join/${sessionId}/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creatorAddress: walletAddress })
    });
  };
  
  return (
    <div className="qr-join-creator">
      {!sessionId ? (
        <button onClick={createSession}>Generate QR Code</button>
      ) : (
        <div>
          <h3>Scan to Join Payout</h3>
          <QRCode value={joinLink} size={256} />
          <p>{joinLink}</p>
          
          <div className="recipients-list">
            <h4>Joined Recipients ({recipients.length})</h4>
            {recipients.map((r, i) => (
              <div key={i}>
                {r.name} - {r.address.substring(0, 10)}...
              </div>
            ))}
          </div>
          
          <button onClick={closeSession}>Close Session</button>
        </div>
      )}
    </div>
  );
}

// ============ QR Join Landing Page Component ============
import { useParams } from 'react-router-dom';

function JoinPage() {
  const { sessionId } = useParams();
  const [address, setAddress] = useState('');
  const [name, setName] = useState('');
  const [joined, setJoined] = useState(false);
  
  const handleJoin = async () => {
    const response = await fetch(`http://localhost:3001/api/join/${sessionId}/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, name })
    });
    
    if (response.ok) {
      setJoined(true);
    } else {
      const error = await response.json();
      alert(error.error);
    }
  };
  
  if (joined) {
    return (
      <div className="join-success">
        <h2>✅ Successfully Joined!</h2>
        <p>You've been added to the payout list.</p>
        <p>Keep this page open to receive your payment.</p>
      </div>
    );
  }
  
  return (
    <div className="join-page">
      <h2>💸 Join Flash Pay Payout</h2>
      <p>Enter your details to join the payout list</p>
      
      <input
        type="text"
        placeholder="Your Name (optional)"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      
      <input
        type="text"
        placeholder="Your Wallet Address (0x...)"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
      />
      
      <button onClick={handleJoin}>Join Payout</button>
    </div>
  );
}

export {
  CSVUpload,
  TemplateSelector,
  Dashboard,
  QRJoinCreator,
  JoinPage
};
