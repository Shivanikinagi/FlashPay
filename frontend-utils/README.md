# Frontend Utilities - Advanced Features

Complete implementation of advanced features for Flash Pay.

## 📦 Files

### 1. csvParser.js - CSV Upload
Parse and validate CSV files with addresses and amounts.

**Usage:**
```javascript
const { parseCSV } = require('./csvParser');

const result = parseCSV(csvContent);
if (result.success) {
  console.log('Parsed:', result.data);
}
```

**CSV Format:**
```csv
address,amount
0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1,0.5
0x5B38Da6a701c568545dCfcB03FcB875f56beddC4,1.2
```

### 2. templates.js - Payment Templates
Predefined templates for common payment scenarios.

**Templates:**
- Split Equally - Divide total among all
- Team Salary - Role-based percentages
- Creator Payout - Lead gets 50%
- Custom Percentage - Define exact percentages
- Fixed Amount - Same amount for all

**Usage:**
```javascript
const { applyTemplate } = require('./templates');

const result = applyTemplate('split-equally', {
  totalAmount: '100',
  recipients: ['0x...', '0x...']
});
```

### 3. dashboard.js - Dashboard Analytics
Process events and generate dashboard metrics.

**Functions:**
- `processTransactionHistory(events)` - Group events
- `calculateDashboardStats(transactions)` - Get stats
- `generateVolumeChartData(transactions)` - Chart data
- `filterTransactions(transactions, filters)` - Filter
- `searchTransactions(transactions, query)` - Search
- `exportTransactionsToCSV(transactions)` - Export

**Usage:**
```javascript
const { processTransactionHistory, calculateDashboardStats } = require('./dashboard');

// Fetch from backend
const { events } = await fetch('/events/all').then(r => r.json());

// Process
const { transactions } = processTransactionHistory(events);
const stats = calculateDashboardStats(transactions);
```

### 4. qrJoinFlow.js - QR Join Backend
Backend routes for QR code join functionality.

**Endpoints:**
- `POST /api/join/create` - Create session
- `POST /api/join/:id/add` - Add recipient
- `GET /api/join/:id/recipients` - Get recipients
- `POST /api/join/:id/close` - Close session

**Integration:**
```javascript
// In backend/server.js
const qrJoinRouter = require('./qrJoinFlow');
app.use('/api/join', qrJoinRouter);
```

## 🚀 Frontend Integration

### CSV Upload Component
```javascript
const handleFileUpload = (event) => {
  const file = event.target.files[0];
  const reader = new FileReader();
  
  reader.onload = (e) => {
    const result = parseCSV(e.target.result);
    if (result.success) {
      setRecipients(result.data);
    }
  };
  
  reader.readAsText(file);
};

<input type="file" accept=".csv" onChange={handleFileUpload} />
```

### Template Selector
```javascript
const handleTemplateSelect = (templateId) => {
  const result = applyTemplate(templateId, {
    totalAmount: '100',
    recipients: addresses
  });
  
  if (result.success) {
    setPayments(result.payments);
  }
};
```

### Dashboard Display
```javascript
useEffect(() => {
  fetch('/events/all')
    .then(r => r.json())
    .then(({ events }) => {
      const { transactions } = processTransactionHistory(events);
      const stats = calculateDashboardStats(transactions);
      setStats(stats);
    });
}, []);
```

### QR Join Flow
```javascript
// Create session
const createSession = async () => {
  const res = await fetch('/api/join/create', {
    method: 'POST',
    body: JSON.stringify({ creatorAddress: wallet })
  });
  const { joinLink, sessionId } = await res.json();
  setJoinLink(joinLink);
};

// Display QR
<QRCode value={joinLink} />

// Poll for recipients
useEffect(() => {
  const interval = setInterval(async () => {
    const res = await fetch(`/api/join/${sessionId}/recipients`);
    const { recipients } = await res.json();
    setRecipients(recipients);
  }, 3000);
  
  return () => clearInterval(interval);
}, [sessionId]);
```

## 📋 Dependencies

```bash
npm install papaparse recharts qrcode.react
```

## ✅ Feature Checklist

**CSV Upload:**
- [x] Parser implementation
- [x] Validation logic
- [ ] Frontend file input
- [ ] Preview table
- [ ] Error handling UI

**Templates:**
- [x] 5 template implementations
- [x] Apply logic
- [x] Custom template save
- [ ] Frontend selector
- [ ] Template preview

**Dashboard:**
- [x] Data processing
- [x] Stats calculation
- [x] Chart data generation
- [ ] Chart components
- [ ] Filter UI
- [ ] Export button

**QR Join:**
- [x] Backend routes
- [x] Session management
- [ ] QR display component
- [ ] Join landing page
- [ ] Real-time updates

Good luck! 🚀
