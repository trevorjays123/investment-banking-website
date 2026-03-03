// Dashboard Module
const Dashboard = {
  currentPage: 1,
  transactionsPerPage: 10,

  init: async function() {
    await this.loadAccounts();
    this.loadRecentTransactions();
    this.setupEventListeners();
  },

  loadAccounts: async function() {
    try {
      const data = await API.get('/accounts');
      const accounts = data.accounts;
      
      const accountsContainer = document.getElementById('accounts-summary');
      if (accountsContainer) {
        accountsContainer.innerHTML = this.renderAccounts(accounts);
      }
      
      API.setAccounts(accounts);
    } catch (error) {
      console.error('Error loading accounts:', error);
      App.showToast('Failed to load accounts', 'error');
    }
  },

  renderAccounts: function(accounts) {
    if (!accounts || accounts.length === 0) {
      return '<p class="text-gray-500">No accounts found</p>';
    }

    return accounts.map(account => {
      const balance = parseFloat(account.balance);
      const isNegative = balance < 0;
      const accountTypeIcon = this.getAccountTypeIcon(account.account_type);
      const accountTypeLabel = account.account_type.charAt(0).toUpperCase() + account.account_type.slice(1);

      return `
        <div class="bg-white rounded-lg shadow p-4 card-hover transition-all duration-300">
          <div class="flex justify-between items-start mb-2">
            <div>
              <span class="text-xs text-gray-500 uppercase">${accountTypeLabel}</span>
              <p class="font-mono text-sm text-gray-700">${this.maskAccountNumber(account.account_number)}</p>
            </div>
            <i class="${accountTypeIcon} text-2xl text-blue-600"></i>
          </div>
          <p class="text-2xl font-bold ${isNegative ? 'text-red-600' : 'text-gray-800'}">
            ${this.formatCurrency(balance, account.currency)}
          </p>
          <span class="inline-block mt-2 px-2 py-1 text-xs rounded-full ${this.getStatusClass(account.status)}">
            ${account.status}
          </span>
        </div>
      `;
    }).join('');
  },

  getAccountTypeIcon: function(type) {
    const icons = {
      checking: 'fas fa-wallet',
      savings: 'fas fa-piggy-bank',
      credit: 'fas fa-credit-card'
    };
    return icons[type] || 'fas fa-university';
  },

  getStatusClass: function(status) {
    const classes = {
      active: 'bg-green-100 text-green-800',
      frozen: 'bg-yellow-100 text-yellow-800',
      closed: 'bg-red-100 text-red-800'
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
  },

  maskAccountNumber: function(accountNumber) {
    if (!accountNumber) return '****';
    return '*'.repeat(accountNumber.length - 4) + accountNumber.slice(-4);
  },

  formatCurrency: function(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  },

  loadRecentTransactions: async function() {
    try {
      const accounts = API.getAccounts();
      if (!accounts || accounts.length === 0) return;

      let allTransactions = [];
      for (const account of accounts.slice(0, 2)) {
        const data = await API.get(`/accounts/${account.id}/transactions?limit=5`);
        allTransactions = [...allTransactions, ...data.transactions];
      }

      allTransactions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      allTransactions = allTransactions.slice(0, 10);

      const container = document.getElementById('recent-transactions');
      if (container) {
        container.innerHTML = this.renderTransactions(allTransactions.slice(0, 5));
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  },

  renderTransactions: function(transactions) {
    if (!transactions || transactions.length === 0) {
      return '<p class="text-gray-500">No recent transactions</p>';
    }

    return transactions.map(txn => {
      const isCredit = txn.to_account_id && txn.transaction_type !== 'withdrawal' && txn.transaction_type !== 'payment';
      const amountClass = isCredit ? 'text-green-600' : 'text-red-600';
      const amountPrefix = isCredit ? '+' : '-';
      const typeIcon = this.getTransactionIcon(txn.transaction_type);

      return `
        <div class="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
              <i class="${typeIcon} text-gray-600"></i>
            </div>
            <div>
              <p class="font-medium text-gray-800">${txn.description || txn.transaction_type}</p>
              <p class="text-xs text-gray-500">${this.formatDate(txn.created_at)}</p>
            </div>
          </div>
          <p class="font-semibold ${amountClass}">
            ${amountPrefix}${this.formatCurrency(txn.amount)}
          </p>
        </div>
      `;
    }).join('');
  },

  getTransactionIcon: function(type) {
    const icons = {
      transfer: 'fas fa-exchange-alt',
      deposit: 'fas fa-arrow-down',
      withdrawal: 'fas fa-arrow-up',
      payment: 'fas fa-file-invoice-dollar'
    };
    return icons[type] || 'fas fa-money-bill';
  },

  formatDate: function(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  setupEventListeners: function() {
    // Transfer button
    const transferBtn = document.getElementById('transfer-btn');
    if (transferBtn) {
      transferBtn.addEventListener('click', () => this.showTransferModal());
    }

    // Pay bills button
    const payBillsBtn = document.getElementById('pay-bills-btn');
    if (payBillsBtn) {
      payBillsBtn.addEventListener('click', () => App.navigateTo('bills'));
    }

    // Deposit button
    const depositBtn = document.getElementById('deposit-btn');
    if (depositBtn) {
      depositBtn.addEventListener('click', () => this.showDepositModal());
    }
  },

  showTransferModal: function() {
    const accounts = API.getAccounts();
    if (!accounts || accounts.length === 0) return;

    const modal = document.getElementById('modal-container');
    modal.innerHTML = `
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg p-6 w-full max-w-md mx-4">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-xl font-bold">Money Transfer</h3>
            <button onclick="this.closest('.fixed').remove()" class="text-gray-500 hover:text-gray-700">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <form id="transfer-form">
            <div class="mb-4">
              <label class="block text-gray-700 text-sm font-bold mb-2">From Account</label>
              <select id="from-account" class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                ${accounts.map(a => `<option value="${a.id}">${a.account_type} - ${this.maskAccountNumber(a.account_number)} (${this.formatCurrency(a.balance)})</option>`).join('')}
              </select>
            </div>
            <div class="mb-4">
              <label class="block text-gray-700 text-sm font-bold mb-2">To Account Number</label>
              <input type="text" id="to-account" class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required placeholder="Enter account number">
            </div>
            <div class="mb-4">
              <label class="block text-gray-700 text-sm font-bold mb-2">Amount</label>
              <input type="number" id="amount" class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required min="0.01" step="0.01">
            </div>
            <div class="mb-4">
              <label class="block text-gray-700 text-sm font-bold mb-2">Description (Optional)</label>
              <input type="text" id="description" class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="What's this for?">
            </div>
            <div class="flex gap-3">
              <button type="submit" class="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors">
                Transfer
              </button>
              <button type="button" onclick="this.closest('.fixed').remove()" class="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.getElementById('transfer-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.processTransfer();
    });
  },

  processTransfer: async function() {
    const fromAccountId = document.getElementById('from-account').value;
    const toAccountId = document.getElementById('to-account').value;
    const amount = document.getElementById('amount').value;
    const description = document.getElementById('description').value;

    try {
      const data = await API.post('/transactions/transfer', {
        from_account_id: parseInt(fromAccountId),
        to_account_id: parseInt(toAccountId),
        amount: parseFloat(amount),
        description: description
      });

      document.querySelector('.fixed').remove();
      App.showToast('Transfer successful!', 'success');
      await this.loadAccounts();
      await this.loadRecentTransactions();
    } catch (error) {
      App.showToast(error.message || 'Transfer failed', 'error');
    }
  },

  showDepositModal: function() {
    const accounts = API.getAccounts();
    if (!accounts || accounts.length === 0) return;

    const modal = document.getElementById('modal-container');
    modal.innerHTML = `
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg p-6 w-full max-w-md mx-4">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-xl font-bold">Deposit Money</h3>
            <button onclick="this.closest('.fixed').remove()" class="text-gray-500 hover:text-gray-700">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <form id="deposit-form">
            <div class="mb-4">
              <label class="block text-gray-700 text-sm font-bold mb-2">To Account</label>
              <select id="deposit-account" class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                ${accounts.map(a => `<option value="${a.id}">${a.account_type} - ${this.maskAccountNumber(a.account_number)}</option>`).join('')}
              </select>
            </div>
            <div class="mb-4">
              <label class="block text-gray-700 text-sm font-bold mb-2">Amount</label>
              <input type="number" id="deposit-amount" class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required min="0.01" step="0.01">
            </div>
            <div class="mb-4">
              <label class="block text-gray-700 text-sm font-bold mb-2">Description (Optional)</label>
              <input type="text" id="deposit-description" class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="What's this for?">
            </div>
            <div class="flex gap-3">
              <button type="submit" class="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors">
                Deposit
              </button>
              <button type="button" onclick="this.closest('.fixed').remove()" class="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.getElementById('deposit-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.processDeposit();
    });
  },

  processDeposit: async function() {
    const accountId = document.getElementById('deposit-account').value;
    const amount = document.getElementById('deposit-amount').value;
    const description = document.getElementById('deposit-description').value;

    try {
      const data = await API.post('/transactions/deposit', {
        account_id: parseInt(accountId),
        amount: parseFloat(amount),
        description: description
      });

      document.querySelector('.fixed').remove();
      App.showToast('Deposit successful!', 'success');
      await this.loadAccounts();
      await this.loadRecentTransactions();
    } catch (error) {
      App.showToast(error.message || 'Deposit failed', 'error');
    }
  },

  getTotalBalance: function() {
    const accounts = API.getAccounts();
    if (!accounts) return 0;
    return accounts.reduce((sum, acc) => sum + parseFloat(acc.balance), 0);
  }
};
