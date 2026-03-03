// Transfers Page JavaScript
let currentTransferType = 'internal';
let accounts = [];

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
  loadAccounts();
  loadRecentTransfers();
  
  // Wire amount change handler
  document.getElementById('wireAmount').addEventListener('input', updateWireTotal);
});

// Load user accounts
async function loadAccounts() {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/accounts', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      accounts = await response.json();
      displayAccounts(accounts);
      populateAccountDropdowns(accounts);
    } else {
      displayDemoAccounts();
    }
  } catch (error) {
    console.error('Error loading accounts:', error);
    displayDemoAccounts();
  }
}

// Display accounts
function displayAccounts(accountList) {
  if (!accountList || accountList.length === 0) {
    displayDemoAccounts();
    return;
  }
  
  const container = document.getElementById('accountsList');
  container.innerHTML = accountList.map(acc => `
    <div class="p-3 bg-gray-700 rounded-lg">
      <div class="flex justify-between items-center">
        <div>
          <span class="font-semibold">${acc.account_type || acc.type}</span>
          <span class="text-gray-400 text-sm ml-2">****${(acc.account_number || acc.accountNumber || '0000').slice(-4)}</span>
        </div>
        <span class="font-semibold">$${formatNumber(acc.balance || 0)}</span>
      </div>
    </div>
  `).join('');
  
  // Update balance display
  const totalBalance = accountList.reduce((sum, acc) => sum + (parseFloat(acc.balance) || 0), 0);
  document.getElementById('userBalance').textContent = `$${formatNumber(totalBalance)}`;
}

// Display demo accounts
function displayDemoAccounts() {
  accounts = [
    { id: 1, account_type: 'Checking', account_number: '1234567890', balance: 15000.00 },
    { id: 2, account_type: 'Savings', account_number: '0987654321', balance: 50000.00 },
    { id: 3, account_type: 'Investment', account_number: '5678901234', balance: 25000.00 }
  ];
  
  const container = document.getElementById('accountsList');
  container.innerHTML = accounts.map(acc => `
    <div class="p-3 bg-gray-700 rounded-lg">
      <div class="flex justify-between items-center">
        <div>
          <span class="font-semibold">${acc.account_type}</span>
          <span class="text-gray-400 text-sm ml-2">****${acc.account_number.slice(-4)}</span>
        </div>
        <span class="font-semibold">$${formatNumber(acc.balance)}</span>
      </div>
    </div>
  `).join('');
  
  populateAccountDropdowns(accounts);
  document.getElementById('userBalance').textContent = '$90,000.00';
}

// Populate account dropdowns
function populateAccountDropdowns(accountList) {
  const dropdowns = [
    'internalFromAccount', 'internalToAccount',
    'achAccount', 'wireFromAccount'
  ];
  
  dropdowns.forEach(id => {
    const select = document.getElementById(id);
    if (select) {
      select.innerHTML = '<option value="">Select account</option>' +
        accountList.map(acc => `
          <option value="${acc.id}" data-balance="${acc.balance}">
            ${acc.account_type || acc.type} - $${formatNumber(acc.balance)} (****${(acc.account_number || acc.accountNumber || '0000').slice(-4)})
          </option>
        `).join('');
    }
  });
}

// Set transfer type
function setTransferType(type) {
  currentTransferType = type;
  
  // Update tab styles
  document.querySelectorAll('.transfer-tab').forEach(tab => {
    tab.classList.remove('bg-blue-600', 'text-white');
    tab.classList.add('bg-gray-700', 'text-gray-300');
  });
  
  const activeTab = document.getElementById(`${type}Tab`);
  activeTab.classList.remove('bg-gray-700', 'text-gray-300');
  activeTab.classList.add('bg-blue-600', 'text-white');
  
  // Show/hide forms
  document.getElementById('internalForm').classList.add('hidden');
  document.getElementById('achForm').classList.add('hidden');
  document.getElementById('wireForm').classList.add('hidden');
  document.getElementById(`${type}Form`).classList.remove('hidden');
}

// Submit internal transfer
async function submitInternalTransfer(event) {
  event.preventDefault();
  
  const fromAccount = document.getElementById('internalFromAccount').value;
  const toAccount = document.getElementById('internalToAccount').value;
  const amount = parseFloat(document.getElementById('internalAmount').value);
  const memo = document.getElementById('internalMemo').value;
  
  if (!fromAccount || !toAccount) {
    showToast('Please select both accounts', 'error');
    return;
  }
  
  if (fromAccount === toAccount) {
    showToast('Cannot transfer to the same account', 'error');
    return;
  }
  
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/transfers/internal', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ fromAccountId: fromAccount, toAccountId: toAccount, amount, memo })
    });
    
    const result = await response.json();
    
    if (response.ok) {
      showToast(`Transfer successful! Reference: ${result.reference || result.transactionId}`, 'success');
      document.getElementById('internalTransferForm').reset();
      loadAccounts();
      loadRecentTransfers();
    } else {
      showToast(result.error || 'Transfer failed', 'error');
    }
  } catch (error) {
    console.error('Transfer error:', error);
    showToast('Transfer successful (demo mode)', 'success');
    document.getElementById('internalTransferForm').reset();
  }
}

// Submit ACH transfer
async function submitACHTransfer(event) {
  event.preventDefault();
  
  const direction = document.getElementById('achDirection').value;
  const accountId = document.getElementById('achAccount').value;
  const externalAccountId = document.getElementById('achExternalAccount').value;
  const amount = parseFloat(document.getElementById('achAmount').value);
  const memo = document.getElementById('achMemo').value;
  
  if (!accountId || !externalAccountId) {
    showToast('Please select all required accounts', 'error');
    return;
  }
  
  if (externalAccountId === 'new') {
    showToast('Bank linking feature coming soon', 'info');
    return;
  }
  
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/transfers/ach', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ direction, accountId, externalAccountId, amount, memo })
    });
    
    const result = await response.json();
    
    if (response.ok) {
      showToast(`ACH transfer initiated! Reference: ${result.reference}`, 'success');
      document.getElementById('achTransferForm').reset();
      loadRecentTransfers();
    } else {
      showToast(result.error || 'ACH transfer failed', 'error');
    }
  } catch (error) {
    console.error('ACH error:', error);
    showToast('ACH transfer initiated (demo mode)', 'success');
    document.getElementById('achTransferForm').reset();
  }
}

// Submit wire transfer
async function submitWireTransfer(event) {
  event.preventDefault();
  
  const fromAccountId = document.getElementById('wireFromAccount').value;
  const recipientName = document.getElementById('wireRecipientName').value;
  const bankName = document.getElementById('wireBankName').value;
  const routingNumber = document.getElementById('wireRoutingNumber').value;
  const accountNumber = document.getElementById('wireAccountNumber').value;
  const amount = parseFloat(document.getElementById('wireAmount').value);
  const reference = document.getElementById('wireReference').value;
  
  if (!fromAccountId) {
    showToast('Please select an account', 'error');
    return;
  }
  
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/transfers/wire', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        fromAccountId,
        recipientName,
        bankName,
        routingNumber,
        accountNumber,
        amount,
        reference
      })
    });
    
    const result = await response.json();
    
    if (response.ok) {
      showToast(`Wire transfer sent! Reference: ${result.reference}`, 'success');
      document.getElementById('wireTransferForm').reset();
      updateWireTotal();
      loadAccounts();
      loadRecentTransfers();
    } else {
      showToast(result.error || 'Wire transfer failed', 'error');
    }
  } catch (error) {
    console.error('Wire error:', error);
    showToast('Wire transfer sent (demo mode)', 'success');
    document.getElementById('wireTransferForm').reset();
    updateWireTotal();
  }
}

// Update wire total
function updateWireTotal() {
  const amount = parseFloat(document.getElementById('wireAmount').value) || 0;
  const fee = 25;
  document.getElementById('wireTotal').textContent = `$${formatNumber(amount + fee)}`;
}

// Update ACH form
function updateACHForm() {
  // Could add conditional fields based on direction
}

// Load recent transfers
async function loadRecentTransfers() {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/transfers', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      const transfers = await response.json();
      displayRecentTransfers(transfers);
    } else {
      displayDemoTransfers();
    }
  } catch (error) {
    displayDemoTransfers();
  }
}

// Display recent transfers
function displayRecentTransfers(transfers) {
  if (!transfers || transfers.length === 0) {
    displayDemoTransfers();
    return;
  }
  
  const container = document.getElementById('recentTransfers');
  container.innerHTML = transfers.slice(0, 5).map(t => `
    <div class="p-3 bg-gray-700 rounded-lg">
      <div class="flex justify-between items-center">
        <span class="font-semibold">${t.type || 'Transfer'}</span>
        <span class="text-sm ${t.status === 'completed' ? 'text-green-400' : 'text-yellow-400'}">${t.status}</span>
      </div>
      <div class="flex justify-between text-sm mt-1">
        <span class="text-gray-400">${new Date(t.created_at || t.date).toLocaleDateString()}</span>
        <span>$${formatNumber(t.amount)}</span>
      </div>
    </div>
  `).join('');
}

// Display demo transfers
function displayDemoTransfers() {
  const container = document.getElementById('recentTransfers');
  container.innerHTML = `
    <div class="p-3 bg-gray-700 rounded-lg">
      <div class="flex justify-between items-center">
        <span class="font-semibold">Internal</span>
        <span class="text-sm text-green-400">Completed</span>
      </div>
      <div class="flex justify-between text-sm mt-1">
        <span class="text-gray-400">${new Date().toLocaleDateString()}</span>
        <span>$5,000.00</span>
      </div>
    </div>
    <div class="p-3 bg-gray-700 rounded-lg">
      <div class="flex justify-between items-center">
        <span class="font-semibold">ACH Deposit</span>
        <span class="text-sm text-green-400">Completed</span>
      </div>
      <div class="flex justify-between text-sm mt-1">
        <span class="text-gray-400">${new Date(Date.now() - 86400000).toLocaleDateString()}</span>
        <span>$10,000.00</span>
      </div>
    </div>
    <div class="p-3 bg-gray-700 rounded-lg">
      <div class="flex justify-between items-center">
        <span class="font-semibold">Wire Out</span>
        <span class="text-sm text-yellow-400">Pending</span>
      </div>
      <div class="flex justify-between text-sm mt-1">
        <span class="text-gray-400">${new Date(Date.now() - 172800000).toLocaleDateString()}</span>
        <span>$2,500.00</span>
      </div>
    </div>
  `;
}

// Format number
function formatNumber(num) {
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Show toast notification
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toastMessage');
  const toastIcon = document.getElementById('toastIcon');
  
  toastMessage.textContent = message;
  toastIcon.className = type === 'success' ? 'fas fa-check-circle text-green-500' :
                        type === 'error' ? 'fas fa-exclamation-circle text-red-500' :
                        'fas fa-info-circle text-blue-500';
  
  toast.classList.remove('hidden');
  
  setTimeout(() => {
    toast.classList.add('hidden');
  }, 3000);
}

// Logout
function logout() {
  localStorage.removeItem('token');
  window.location.href = 'index.html';
}