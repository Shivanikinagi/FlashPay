/**
 * Dashboard Data Processing for Flash Pay
 * Utilities to process events and generate dashboard metrics
 */

/**
 * Process events for transaction history
 */
function processTransactionHistory(events) {
  if (!events || events.length === 0) {
    return { transactions: [], totalCount: 0 };
  }
  
  const grouped = {};
  
  events.forEach(event => {
    const txHash = event.transactionHash;
    if (!grouped[txHash]) {
      grouped[txHash] = {
        txHash,
        blockNumber: event.blockNumber,
        timestamp: event.timestamp || new Date(event.blockNumber * 15000).toISOString(),
        sender: event.args?.sender || event.args?.[0],
        recipients: [],
        successCount: 0,
        failureCount: 0,
        totalAmount: '0',
        status: 'pending'
      };
    }
    
    const tx = grouped[txHash];
    
    if (event.event === 'BatchPaymentInitiated') {
      tx.totalRecipients = parseInt(event.args?.totalRecipients || event.args?.[1] || 0);
      tx.totalAmount = event.args?.totalAmount?.toString() || event.args?.[2]?.toString() || '0';
      tx.status = 'processing';
    } else if (event.event === 'PaymentSuccess') {
      tx.successCount++;
      tx.recipients.push({
        address: event.args?.recipient || event.args?.[1],
        amount: event.args?.amount?.toString() || event.args?.[2]?.toString(),
        status: 'success'
      });
    } else if (event.event === 'PaymentFailed') {
      tx.failureCount++;
      tx.recipients.push({
        address: event.args?.recipient || event.args?.[1],
        amount: event.args?.amount?.toString() || event.args?.[2]?.toString(),
        status: 'failed',
        reason: event.args?.reason || event.args?.[4] || 'Unknown'
      });
    } else if (event.event === 'BatchPaymentCompleted') {
      tx.status = 'completed';
    }
  });
  
  const transactions = Object.values(grouped).sort((a, b) => b.blockNumber - a.blockNumber);
  return { transactions, totalCount: transactions.length };
}

/**
 * Calculate dashboard statistics
 */
function calculateDashboardStats(transactions) {
  if (!transactions || transactions.length === 0) {
    return {
      totalTransactions: 0,
      totalRecipients: 0,
      totalVolume: '0',
      successRate: '0%',
      averageAmount: '0'
    };
  }
  
  let totalRecipients = 0;
  let totalVolume = 0;
  let totalSuccess = 0;
  let totalPayments = 0;
  
  transactions.forEach(tx => {
    totalRecipients += tx.successCount || 0;
    totalVolume += parseFloat(tx.totalAmount || 0) / 1e18;
    totalSuccess += tx.successCount || 0;
    totalPayments += (tx.successCount || 0) + (tx.failureCount || 0);
  });
  
  const successRate = totalPayments > 0 ? (totalSuccess / totalPayments) * 100 : 0;
  const averageAmount = totalRecipients > 0 ? totalVolume / totalRecipients : 0;
  
  return {
    totalTransactions: transactions.length,
    totalRecipients,
    totalVolume: totalVolume.toFixed(4),
    successRate: successRate.toFixed(2) + '%',
    averageAmount: averageAmount.toFixed(6)
  };
}

/**
 * Generate chart data for volume over time
 */
function generateVolumeChartData(transactions, period = 'day') {
  if (!transactions || transactions.length === 0) return [];
  
  const grouped = {};
  
  transactions.forEach(tx => {
    const date = new Date(tx.timestamp);
    let key;
    
    if (period === 'day') {
      key = date.toISOString().split('T')[0];
    } else if (period === 'week') {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      key = weekStart.toISOString().split('T')[0];
    } else if (period === 'month') {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }
    
    if (!grouped[key]) {
      grouped[key] = { date: key, volume: 0, count: 0 };
    }
    
    grouped[key].volume += parseFloat(tx.totalAmount || 0) / 1e18;
    grouped[key].count += 1;
  });
  
  return Object.values(grouped)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(item => ({
      date: item.date,
      volume: parseFloat(item.volume.toFixed(4)),
      count: item.count
    }));
}

/**
 * Filter transactions
 */
function filterTransactions(transactions, filters) {
  if (!filters) return transactions;
  
  return transactions.filter(tx => {
    if (filters.startDate && new Date(tx.timestamp) < new Date(filters.startDate)) return false;
    if (filters.endDate && new Date(tx.timestamp) > new Date(filters.endDate)) return false;
    if (filters.status && tx.status !== filters.status) return false;
    if (filters.sender && tx.sender?.toLowerCase() !== filters.sender.toLowerCase()) return false;
    if (filters.minAmount && parseFloat(tx.totalAmount) / 1e18 < parseFloat(filters.minAmount)) return false;
    return true;
  });
}

/**
 * Search transactions
 */
function searchTransactions(transactions, query) {
  if (!query || query.trim().length === 0) return transactions;
  
  const searchTerm = query.toLowerCase().trim();
  return transactions.filter(tx => 
    tx.txHash?.toLowerCase().includes(searchTerm) ||
    tx.sender?.toLowerCase().includes(searchTerm) ||
    tx.recipients?.some(r => r.address?.toLowerCase().includes(searchTerm))
  );
}

/**
 * Export to CSV
 */
function exportTransactionsToCSV(transactions) {
  if (!transactions || transactions.length === 0) {
    return 'txHash,sender,recipients,amount,status,timestamp\n';
  }
  
  const header = 'txHash,sender,recipients,successCount,failureCount,totalAmount,status,timestamp\n';
  const rows = transactions.map(tx => {
    const amount = (parseFloat(tx.totalAmount || 0) / 1e18).toFixed(6);
    return `${tx.txHash},${tx.sender},${tx.totalRecipients || 0},${tx.successCount || 0},${tx.failureCount || 0},${amount},${tx.status},${tx.timestamp}`;
  }).join('\n');
  
  return header + rows;
}

export {
  processTransactionHistory,
  calculateDashboardStats,
  generateVolumeChartData,
  filterTransactions,
  searchTransactions,
  exportTransactionsToCSV
};
