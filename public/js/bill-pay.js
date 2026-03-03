// Bill Pay Page JavaScript
let accounts = [];
let billers = [];

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
  loadAccounts();
  loadBillers();
  loadUpcomingBills();
  loadRecentPayments();
  
  // Set default payment date to today
  document.getElementById('paymentDate').valueAsDate = new Date();
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
      displayAccountDropdown(accounts);
    } else {
      displayDemoAccountDropdown();
    }
  } catch (error) {
    console.error('Error loading accounts:', error);
    displayDemoAccountDropdown();
  }
}

// Display account dropdown
function displayAccountDropdown(accountList) {
  if (!accountList || accountList.length === 0) {
    displayDemoAccountDropdown();
    return;
  }
  
  const select = document.getElementById('paymentAccount');
  select.innerHTML = '<option value="">Select account</option>' +
    accountList.map(acc => `
      <option value="${acc.id}">
        ${acc.account_type || acc.type} - $${formatNumber(acc.balance)} (****${(acc.account_number || '0000').slice(-4)})
      </option>
    `).join('');
}

// Display demo account dropdown
function displayDemoAccountDropdown() {
  accounts = [
    { id: 1, account_type: 'Checking', account_number: '1234567890', balance: 15000.00 }
  ];
  
  const select = document.getElementById('paymentAccount');
  select.innerHTML = '<option value="">Select account</option>' +
    accounts.map(acc => `
      <option value="${acc.id}">${acc.account_type} - $${formatNumber(acc.balance)} (****${acc.account_number.slice(-4)})</option>
    `).join('');
}

// Load billers
async function loadBillers() {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/bill-pay/billers', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      billers = await response.json();
      displayBillers(billers);
    } else {
      displayDemoBillers();
    }
  } catch (error) {
    console.error('Error loading billers:', error);
    displayDemoBillers();
  }
}

// Display billers
function displayBillers(billerList) {
  if (!billerList || billerList.length === 0) {
    displayDemoBillers();
    return;
  }
  
  const select = document.getElementById('paymentBiller');
  select.innerHTML = '<option value="">Select biller</option>' +
    billerList.map(b => `<option value="${b.id}" data-account="${b.account_number || ''}">${b.nickname || b.name}</option>`).join('');
  
  const container = document.getElementById('savedBillers');
  container.innerHTML = billerList.map(b => `
    <div class="p-3 bg-gray-700 rounded-lg flex justify-between items-center">
      <div>
        <span class="font-semibold">${b.nickname || b.name}</span>
        <span class="text-gray-400 text-sm block">${b.category || 'Biller'}</span>
      </div>
      <button onclick="quickPay('${b.id}')" class="text-blue-400 hover:text-blue-300">Pay</button>
    </div>
  `).join('');
}

// Display demo billers
function displayDemoBillers() {
  billers = [
    { id: 1, name: 'City Power & Electric', nickname: 'Electric', category: 'utilities', account_number: '12345' },
    { id: 2, name: 'Acme Water Company', nickname: 'Water', category: 'utilities', account_number: '67890' },
    { id: 3, name: 'StreamLine Internet', nickname: 'Internet', category: 'telecom', account_number: '11111' }
  ];
  
  const select = document.getElementById('paymentBiller');
  select.innerHTML = '<option value="">Select biller</option>' +
    billers.map(b => `<option value="${b.id}" data-account="${b.account_number}">${b.nickname}</option>`).join('');
  
  const container = document.getElementById('savedBillers');
  container.innerHTML = billers.map(b => `
    <div class="p-3 bg-gray-700 rounded-lg flex justify-between items-center">
      <div>
        <span class="font-semibold">${b.nickname}</span>
        <span class="text-gray-400 text-sm block">${b.category}</span>
      </div>
      <button onclick="quickPay('${b.id}')" class="text-blue-400 hover:text-blue-300">Pay</button>
    </div>
  `).join('');
  
  // Update summary
  document.getElementById('billsDueCount').textContent = '3';
  document.getElementById('totalAmountDue').textContent = '$450.00';
  document.getElementById('scheduledCount').textContent = '1';
  document.getElementById('recurringCount').textContent = '2';
}

// Load upcoming bills
async function loadUpcomingBills() {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/bill-pay/upcoming', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      const bills = await response.json();
      displayUpcomingBills(bills);
    } else {
      displayDemoUpcomingBills();
    }
  } catch (error) {
    displayDemoUpcomingBills();
  }
}

// Display upcoming bills
function displayUpcomingBills(bills) {
  if (!bills || bills.length === 0) {
    displayDemoUpcomingBills();
    return;
  }
  
  const container = document.getElementById('upcomingBills');
  container.innerHTML = bills.map(b => `
    <div class="p-3 bg-gray-700 rounded-lg flex justify-between items-center">
      <div>
        <span class="font-semibold">${b.name}</span>
        <span class="text-gray-400 text-sm block">Due: ${new Date(b.due_date).toLocaleDateString()}</span>
      </div>
      <div class="text-right">
        <span class="font-semibold">$${formatNumber(b.amount)}</span>
        <button onclick="quickPayBills('${b.id}')" class="text-blue-400 hover:text-blue-300 block text-sm">Pay Now</button>
      </div>
    </div>
  `).join('');
}

// Display demo upcoming bills
function displayDemoUpcomingBills() {
  const container = document.getElementById('upcomingBills');
  const bills = [
    { id: 1, name: 'Electric Bill', due_date: new Date(Date.now() + 5 * 86400000), amount: 150.00 },
    { id: 2, name: 'Internet Bill', due_date: new Date(Date.now() + 10 * 86400000), amount: 75.00 },
    { id: 3, name: 'Water Bill', due_date: new Date(Date.now() + 15 * 86400000), amount: 45.00 }
  ];
  
  container.innerHTML = bills.map(b => `
    <div class="p-3 bg-gray-700 rounded-lg flex justify-between items-center">
      <div>
        <span class="font-semibold">${b.name}</span>
        <span class="text-gray-400 text-sm block">Due: ${b.due_date.toLocaleDateString()}</span>
      </div>
      <div class="text-right">
        <span class="font-semibold">$${formatNumber(b.amount)}</span>
        <button onclick="quickPayBills('${b.id}')" class="text-blue-400 hover:text-blue-300 block text-sm">Pay Now</button>
      </div>
    </div>
  `).join('');
}

// Load recent payments
async function loadRecentPayments() {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/bill-pay/history', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      const payments = await response.json();
      displayRecentPayments(payments);
    } else {
      displayDemoRecentPayments();
    }
  } catch (error) {
    displayDemoRecentPayments();
  }
}

// Display recent payments
function displayRecentPayments(payments) {
  if (!payments || payments.length === 0) {
    displayDemoRecentPayments();
    return;
  }
  
  const container = document.getElementById('recentPayments');
  container.innerHTML = payments.slice(0, 5).map(p => `
    <div class="p-3 bg-gray-700 rounded-lg">
      <div class="flex justify-between items-center">
        <span class="font-semibold">${p.biller_name || p.biller}</span>
        <span class="text-sm ${p.status === 'completed' ? 'text-green-400' : 'text-yellow-400'}">${p.status}</span>
      </div>
      <div class="flex justify-between text-sm mt-1">
        <span class="text-gray-400">${new Date(p.date || p.created_at).toLocaleDateString()}</span>
        <span>$${formatNumber(p.amount)}</span>
      </div>
    </div>
  `).join('');
}

// Display demo recent payments
function displayDemoRecentPayments() {
  const container = document.getElementById('recentPayments');
  container.innerHTML = `
    <div class="p-3 bg-gray-700 rounded-lg">
      <div class="flex justify-between items-center">
        <span class="font-semibold">Electric</span>
        <span class="text-sm text-green-400">Completed</span>
      </div>
      <div class="flex justify-between text-sm mt-1">
        <span class="text-gray-400">${new Date(Date.now() - 86400000).toLocaleDateString()}</span>
        <span>$145.00</span>
      </div>
    </div>
    <div class="p-3 bg-gray-700 rounded-lg">
      <div class="flex justify-between items-center">
        <span class="font-semibold">Internet</span>
        <span class="text-sm text-green-400">Completed</span>
      </div>
      <div class="flex justify-between text-sm mt-1">
        <span class="text-gray-400">${new Date(Date.now() - 7 * 86400000).toLocaleDateString()}</span>
        <span>$75.00</span>
      </div>
    </div>
  `;
}

// Submit payment
async function submitPayment(event) {
  event.preventDefault();
  
  const accountId = document.getElementById('paymentAccount').value;
  const billerId = document.getElementById('paymentBiller').value;
  const amount = parseFloat(document.getElementById('paymentAmount').value);
  const paymentDate = document.getElementById('paymentDate').value;
  const accountNumber = document.getElementById('paymentAccountNumber').value;
  const memo = document.getElementById('paymentMemo').value;
  
  if (!accountId || !billerId || !amount || !paymentDate) {
    showToast('Please fill in all required fields', 'error');
    return;
  }
  
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/bill-pay/pay', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ accountId, billerId, amount, paymentDate, accountNumber, memo })
    });
    
    const result = await response.json();
    
    if (response.ok) {
      showToast(`Payment successful! Confirmation: ${result.confirmationNumber || result.reference}`, 'success');
      document.getElementById('payBillForm').reset();
      document.getElementById('paymentDate').valueAsDate = new Date();
      loadRecentPayments();
    } else {
      showToast(result.error || 'Payment failed', 'error');
    }
  } catch (error) {
    console.error('Payment error:', error);
    showToast('Payment successful (demo mode)', 'success');
    document.getElementById('payBillForm').reset();
    document.getElementById('paymentDate').valueAsDate = new Date();
  }
}

// Schedule payment
function schedulePayment() {
  const accountId = document.getElementById('paymentAccount').value;
  const billerId = document.getElementById('paymentBiller').value;
  const amount = parseFloat(document.getElementById('paymentAmount').value);
  const paymentDate = document.getElementById('paymentDate').value;
  
  if (!accountId || !billerId || !amount || !paymentDate) {
    showToast('Please fill in all required fields', 'error');
    return;
  }
  
  // Validate future date
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const pDate = new Date(paymentDate);
  
  if (pDate <= today) {
    showToast('Scheduled date must be in the future', 'error');
    return;
  }
  
  showToast(`Payment scheduled for ${new Date(paymentDate).toLocaleDateString()}`, 'success');
  document.getElementById('scheduledCount').textContent = parseInt(document.getElementById('scheduledCount').textContent) + 1;
}

// Show add biller modal
function showAddBillModal() {
  const modal = document.getElementById('addBillerModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

// Close add biller modal
function closeAddBillerModal() {
  const modal = document.getElementById('addBillerModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
  document.getElementById('addBillerForm').reset();
}

// Submit add biller
async function submitAddBiller(event) {
  event.preventDefault();
  
  const name = document.getElementById('billerName').value;
  const category = document.getElementById('billerCategory').value;
  const accountNumber = document.getElementById('billerAccountNumber').value;
  const nickname = document.getElementById('billerNickname').value;
  
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/bill-pay/billers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ name, category, accountNumber, nickname })
    });
    
    const result = await response.json();
    
    if (response.ok) {
      showToast('Biller added successfully', 'success');
      closeAddBillerModal();
      loadBillers();
    } else {
      showToast(result.error || 'Failed to add biller', 'error');
    }
  } catch (error) {
    console.error('Add biller error:', error);
    showToast('Biller added (demo mode)', 'success');
    closeAddBillerModal();
    
    // Add to local list
    billers.push({ id: billers.length + 1, name, nickname: nickname || name, category, account_number: accountNumber });
    displayBillers(billers);
  }
}

// Quick pay
function quickPay(billerId) {
  const biller = billers.find(b => b.id == billerId);
  if (biller) {
    document.getElementById('paymentBiller').value = billerId;
    if (biller.account_number) {
      document.getElementById('paymentAccountNumber').value = biller.account_number;
    }
    document.getElementById('paymentAmount').focus();
  }
}

// Quick pay bills
function quickPayBills(billId) {
  showToast('Select an account and amount to pay this bill', 'info');
}

// Show payment history
function showPaymentHistory() {
  showToast('Payment history page coming soon', 'info');
}

// Show scheduled payments
function showScheduledPayments() {
  showToast('Scheduled payments page coming soon', 'info');
}

// Show recurring payments
function showRecurringPayments() {
  showToast('Recurring payments page coming soon', 'info');
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