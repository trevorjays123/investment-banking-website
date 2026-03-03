/**
 * Enhanced Dashboard Module
 * Real-time updates, Chart.js integration, transaction filtering, and modern UI
 */

const DashboardEnhanced = {
  // State
  state: {
    accounts: [],
    transactions: [],
    filteredTransactions: [],
    currentPage: 1,
    transactionsPerPage: 10,
    isLoading: false,
    chart: null,
    ws: null,
    refreshInterval: null
  },

  // Configuration
  config: {
    refreshRate: 30000, // 30 seconds
    maxRetries: 3,
    currency: 'USD'
  },

  /**
   * Initialize dashboard
   */
  init: async function() {
    this.showLoadingState();
    
    try {
      await Promise.all([
        this.loadAccounts(),
        this.loadTransactions()
      ]);
      
      this.setupEventListeners();
      this.setupRealTimeUpdates();
      this.initializeCharts();
      this.renderDashboard();
      
    } catch (error) {
      console.error('[Dashboard] Initialization error:', error);
      Components.toast('Failed to load dashboard data', 'error');
    } finally {
      this.hideLoadingState();
    }
  },

  /**
   * Show loading state
   */
  showLoadingState: function() {
    this.state.isLoading = true;
    const main = document.getElementById('main-content');
    if (main) {
      main.innerHTML = `
        <div class="animate-pulse space-y-6">
          <!-- Balance Card Skeleton -->
          <div class="bg-gray-800 rounded-xl p-6">
            <div class="h-4 bg-gray-700 w-24 rounded mb-2"></div>
            <div class="h-10 bg-gray-700 w-48 rounded"></div>
          </div>
          
          <!-- Quick Actions Skeleton -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            ${Array(4).fill('<div class="h-16 bg-gray-800 rounded-xl"></div>').join('')}
          </div>
          
          <!-- Accounts Skeleton -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            ${Array(3).fill('<div class="h-32 bg-gray-800 rounded-xl"></div>').join('')}
          </div>
          
          <!-- Transactions Skeleton -->
          <div class="bg-gray-800 rounded-xl p-6">
            <div class="h-6 bg-gray-700 w-40 rounded mb-4"></div>
            ${Array(5).fill('<div class="flex items-center gap-3 py-3 border-b border-gray-700"><div class="w-10 h-10 bg-gray-700 rounded-full"></div><div class="flex-1"><div class="h-4 bg-gray-700 w-32 rounded mb-2"></div><div class="h-3 bg-gray-700 w-24 rounded"></div></div></div>').join('')}
          </div>
        </div>
      `;
    }
  },

  /**
   * Hide loading state
   */
  hideLoadingState: function() {
    this.state.isLoading = false;
  },

  /**
   * Load accounts
   */
  loadAccounts: async function() {
    try {
      const data = await API.get('/accounts');
      this.state.accounts = data.accounts || [];
      API.setAccounts(this.state.accounts);
      return this.state.accounts;
    } catch (error) {
      console.error('[Dashboard] Error loading accounts:', error);
      throw error;
    }
  },

  /**
   * Load transactions
   */
  loadTransactions: async function() {
    try {
      const accounts = this.state.accounts;
      let allTransactions = [];

      if (accounts && accounts.length > 0) {
        for (const account of accounts.slice(0, 2)) {
          try {
            const data = await API.get(`/accounts/${account.id}/transactions?limit=20`);
            if (data.transactions) {
              allTransactions = [...allTransactions, ...data.transactions];
            }
          } catch (err) {
            console.warn(`Failed to load transactions for account ${account.id}`);
          }
        }
      }

      // Sort by date
      allTransactions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      this.state.transactions = allTransactions;
      this.state.filteredTransactions = allTransactions;
      
      return allTransactions;
    } catch (error) {
      console.error('[Dashboard] Error loading transactions:', error);
      throw error;
    }
  },

  /**
   * Render the dashboard
   */
  renderDashboard: function() {
    const main = document.getElementById('main-content');
    if (!main) return;

    const totalBalance = this.getTotalBalance();

    main.innerHTML = `
      <div class="space-y-6 fade-in">
        <!-- Balance Overview Card -->
        <section class="balance-card bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-6 shadow-xl" aria-labelledby="balance-heading">
          <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p class="text-blue-200 text-sm font-medium mb-1" id="balance-heading">Total Balance</p>
              <h2 class="text-4xl font-bold text-white" id="total-balance">
                ${Utils.formatCurrency(totalBalance)}
              </h2>
              <div class="flex items-center gap-2 mt-2">
                <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-500 bg-opacity-20 text-green-300">
                  <i class="fas fa-arrow-up mr-1"></i>
                  <span id="balance-change">+2.5%</span>
                </span>
                <span class="text-blue-200 text-xs">vs last month</span>
              </div>
            </div>
            <div class="flex gap-2">
              <button onclick="DashboardEnhanced.showTransferModal()" class="px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-lg font-medium transition-colors">
                <i class="fas fa-paper-plane mr-2"></i>Transfer
              </button>
              <button onclick="DashboardEnhanced.showDepositModal()" class="px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-lg font-medium transition-colors">
                <i class="fas fa-plus mr-2"></i>Deposit
              </button>
            </div>
          </div>
        </section>

        <!-- Quick Actions -->
        <section class="quick-actions" aria-label="Quick actions">
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            ${Components.quickActionButton({ icon: 'fas fa-paper-plane', label: 'Transfer', color: 'blue', onClick: 'DashboardEnhanced.showTransferModal()' })}
            ${Components.quickActionButton({ icon: 'fas fa-plus', label: 'Deposit', color: 'green', onClick: 'DashboardEnhanced.showDepositModal()' })}
            ${Components.quickActionButton({ icon: 'fas fa-file-invoice-dollar', label: 'Pay Bills', color: 'purple', onClick: 'App.navigateTo("bills")' })}
            ${Components.quickActionButton({ icon: 'fas fa-history', label: 'History', color: 'gray', onClick: 'App.navigateTo("transactions")' })}
          </div>
        </section>

        <!-- Main Content Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Accounts Section -->
          <section class="lg:col-span-2" aria-labelledby="accounts-heading">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-semibold text-white" id="accounts-heading">Your Accounts</h3>
              <button class="text-blue-400 text-sm hover:text-blue-300 transition-colors" onclick="App.navigateTo('accounts')">
                View All <i class="fas fa-arrow-right ml-1"></i>
              </button>
            </div>
            <div class="accounts-grid grid grid-cols-1 md:grid-cols-2 gap-4" id="accounts-container" role="list">
              ${this.renderAccounts()}
            </div>
          </section>

          <!-- Spending Chart -->
          <section class="spending-chart" aria-labelledby="spending-heading">
            <div class="bg-gray-800 rounded-xl p-5 border border-gray-700">
              <h3 class="text-lg font-semibold text-white mb-4" id="spending-heading">Monthly Spending</h3>
              <div class="chart-container" style="height: 200px;">
                <canvas id="spending-chart"></canvas>
              </div>
            </div>
          </section>
        </div>

        <!-- Recent Transactions -->
        <section class="recent-transactions" aria-labelledby="transactions-heading">
          <div class="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            <div class="p-4 border-b border-gray-700 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <h3 class="text-lg font-semibold text-white" id="transactions-heading">Recent Transactions</h3>
              
              <!-- Filters -->
              <div class="flex flex-wrap items-center gap-3">
                <select id="txn-filter-type" class="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white" onchange="DashboardEnhanced.filterTransactions()">
                  <option value="">All Types</option>
                  <option value="transfer">Transfers</option>
                  <option value="deposit">Deposits</option>
                  <option value="withdrawal">Withdrawals</option>
                  <option value="payment">Payments</option>
                </select>
                <select id="txn-filter-period" class="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white" onchange="DashboardEnhanced.filterTransactions()">
                  <option value="">All Time</option>
                  <option value="7">Last 7 Days</option>
                  <option value="30">Last 30 Days</option>
                  <option value="90">Last 90 Days</option>
                </select>
                <button class="text-blue-400 text-sm hover:text-blue-300 transition-colors" onclick="App.navigateTo('transactions')">
                  View All <i class="fas fa-arrow-right ml-1"></i>
                </button>
              </div>
            </div>
            
            <div id="transactions-container" role="list">
              ${this.renderTransactions()}
            </div>
          </div>
        </section>

        <!-- Activity Summary -->
        <section class="activity-summary grid grid-cols-1 md:grid-cols-3 gap-4" aria-label="Activity summary">
          <div class="bg-gray-800 rounded-xl p-5 border border-gray-700">
            <div class="flex items-center gap-3 mb-3">
              <div class="w-10 h-10 rounded-full bg-green-600 bg-opacity-20 flex items-center justify-center">
                <i class="fas fa-arrow-down text-green-400"></i>
              </div>
              <span class="text-gray-400 text-sm">Income (This Month)</span>
            </div>
            <p class="text-2xl font-bold text-white" id="monthly-income">
              ${Utils.formatCurrency(this.getMonthlyIncome())}
            </p>
          </div>
          
          <div class="bg-gray-800 rounded-xl p-5 border border-gray-700">
            <div class="flex items-center gap-3 mb-3">
              <div class="w-10 h-10 rounded-full bg-red-600 bg-opacity-20 flex items-center justify-center">
                <i class="fas fa-arrow-up text-red-400"></i>
              </div>
              <span class="text-gray-400 text-sm">Expenses (This Month)</span>
            </div>
            <p class="text-2xl font-bold text-white" id="monthly-expenses">
              ${Utils.formatCurrency(this.getMonthlyExpenses())}
            </p>
          </div>
          
          <div class="bg-gray-800 rounded-xl p-5 border border-gray-700">
            <div class="flex items-center gap-3 mb-3">
              <div class="w-10 h-10 rounded-full bg-blue-600 bg-opacity-20 flex items-center justify-center">
                <i class="fas fa-exchange-alt text-blue-400"></i>
              </div>
              <span class="text-gray-400 text-sm">Transactions</span>
            </div>
            <p class="text-2xl font-bold text-white" id="transaction-count">
              ${this.state.transactions.length}
            </p>
          </div>
        </section>
      </div>
    `;

    // Reinitialize charts after render
    this.initializeCharts();
  },

  /**
   * Render accounts
   */
  renderAccounts: function() {
    const accounts = this.state.accounts;
    
    if (!accounts || accounts.length === 0) {
      return `
        <div class="col-span-full text-center py-8">
          <i class="fas fa-wallet text-4xl text-gray-500 mb-3"></i>
          <p class="text-gray-400">No accounts found</p>
        </div>
      `;
    }

    return accounts.map(account => Components.accountCard(account)).join('');
  },

  /**
   * Render transactions
   */
  renderTransactions: function() {
    const transactions = this.state.filteredTransactions.slice(0, 5);
    
    if (!transactions || transactions.length === 0) {
      return Components.showEmpty(
        document.createElement('div'),
        'No transactions found',
        'fa-receipt'
      ).innerHTML;
    }

    return transactions.map(txn => Components.transactionItem(txn)).join('');
  },

  /**
   * Initialize charts
   */
  initializeCharts: function() {
    this.initializeSpendingChart();
  },

  /**
   * Initialize spending chart
   */
  initializeSpendingChart: function() {
    const canvas = document.getElementById('spending-chart');
    if (!canvas) return;

    // Destroy existing chart
    if (this.state.chart) {
      this.state.chart.destroy();
    }

    const ctx = canvas.getContext('2d');
    const data = this.getSpendingData();

    this.state.chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: data.labels,
        datasets: [{
          data: data.values,
          backgroundColor: [
            '#3B82F6', // blue
            '#10B981', // green
            '#F59E0B', // yellow
            '#EF4444', // red
            '#8B5CF6', // purple
            '#6B7280'  // gray
          ],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: '#1F2937',
            titleColor: '#fff',
            bodyColor: '#9CA3AF',
            borderColor: '#374151',
            borderWidth: 1,
            padding: 12,
            displayColors: true,
            callbacks: {
              label: function(context) {
                return ` ${Utils.formatCurrency(context.raw)}`;
              }
            }
          }
        },
        cutout: '70%'
      }
    });

    // Add legend
    this.renderChartLegend(data);
  },

  /**
   * Get spending data for chart
   */
  getSpendingData: function() {
    const categories = {
      'Transfer': 0,
      'Deposit': 0,
      'Withdrawal': 0,
      'Payment': 0,
      'Other': 0
    };

    this.state.transactions.forEach(txn => {
      const type = Utils.capitalize(txn.transaction_type);
      if (categories[type] !== undefined) {
        categories[type] += parseFloat(txn.amount);
      } else {
        categories['Other'] += parseFloat(txn.amount);
      }
    });

    // Filter out zero values
    const labels = [];
    const values = [];
    
    Object.entries(categories).forEach(([label, value]) => {
      if (value > 0) {
        labels.push(label);
        values.push(value);
      }
    });

    return { labels, values };
  },

  /**
   * Render chart legend
   */
  renderChartLegend: function(data) {
    const legendContainer = document.querySelector('.chart-container');
    if (!legendContainer) return;

    const legend = document.createElement('div');
    legend.className = 'chart-legend flex flex-wrap gap-2 mt-4 text-xs';
    legend.innerHTML = data.labels.map((label, i) => `
      <div class="flex items-center gap-1.5">
        <span class="w-2 h-2 rounded-full" style="background: ${['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#6B7280'][i]}"></span>
        <span class="text-gray-400">${label}</span>
      </div>
    `).join('');

    legendContainer.appendChild(legend);
  },

  /**
   * Filter transactions
   */
  filterTransactions: function() {
    const typeFilter = document.getElementById('txn-filter-type')?.value || '';
    const periodFilter = document.getElementById('txn-filter-period')?.value || '';

    let filtered = [...this.state.transactions];

    // Filter by type
    if (typeFilter) {
      filtered = filtered.filter(txn => txn.transaction_type === typeFilter);
    }

    // Filter by period
    if (periodFilter) {
      const days = parseInt(periodFilter);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      filtered = filtered.filter(txn => new Date(txn.created_at) >= cutoff);
    }

    this.state.filteredTransactions = filtered;
    
    // Re-render transactions
    const container = document.getElementById('transactions-container');
    if (container) {
      container.innerHTML = this.renderTransactions();
    }
  },

  /**
   * Setup real-time updates
   */
  setupRealTimeUpdates: function() {
    // Polling for updates
    this.state.refreshInterval = setInterval(async () => {
      try {
        await this.refreshData();
      } catch (error) {
        console.warn('[Dashboard] Auto-refresh failed:', error);
      }
    }, this.config.refreshRate);

    // Listen for balance updates
    window.addEventListener('balanceUpdate', (e) => {
      this.updateBalanceDisplay(e.detail);
    });

    // WebSocket connection (optional)
    this.setupWebSocket();
  },

  /**
   * Setup WebSocket connection
   */
  setupWebSocket: function() {
    // Only setup if WebSocket is available and configured
    const wsUrl = window.WS_URL;
    if (!wsUrl || !window.WebSocket) return;

    try {
      this.state.ws = new WebSocket(wsUrl);

      this.state.ws.onopen = () => {
        console.log('[Dashboard] WebSocket connected');
        // Subscribe to account updates
        const userId = API.getUser()?.id;
        if (userId) {
          this.state.ws.send(JSON.stringify({
            type: 'subscribe',
            channel: `user:${userId}`
          }));
        }
      };

      this.state.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleWebSocketMessage(data);
        } catch (e) {
          console.warn('[Dashboard] Failed to parse WebSocket message');
        }
      };

      this.state.ws.onerror = (error) => {
        console.warn('[Dashboard] WebSocket error:', error);
      };

      this.state.ws.onclose = () => {
        console.log('[Dashboard] WebSocket disconnected');
        // Attempt reconnect after delay
        setTimeout(() => this.setupWebSocket(), 5000);
      };
    } catch (error) {
      console.warn('[Dashboard] WebSocket setup failed:', error);
    }
  },

  /**
   * Handle WebSocket message
   */
  handleWebSocketMessage: function(data) {
    switch (data.type) {
      case 'balance_update':
        this.updateBalanceDisplay(data.payload);
        break;
      case 'new_transaction':
        this.addNewTransaction(data.payload);
        break;
      case 'notification':
        Components.toast(data.message, data.level || 'info');
        break;
    }
  },

  /**
   * Update balance display in real-time
   */
  updateBalanceDisplay: function(data) {
    const balanceEl = document.getElementById('total-balance');
    if (balanceEl && data.balance !== undefined) {
      balanceEl.textContent = Utils.formatCurrency(data.balance);
      balanceEl.classList.add('pulse-live');
      setTimeout(() => balanceEl.classList.remove('pulse-live'), 2000);
    }
  },

  /**
   * Add new transaction to list
   */
  addNewTransaction: function(transaction) {
    // Add to beginning of array
    this.state.transactions.unshift(transaction);
    this.state.filteredTransactions = [...this.state.transactions];
    
    // Re-render
    const container = document.getElementById('transactions-container');
    if (container) {
      container.innerHTML = this.renderTransactions();
    }

    // Show notification
    Components.toast(
      `New transaction: ${Utils.formatCurrency(transaction.amount)}`,
      'info'
    );
  },

  /**
   * Refresh data
   */
  refreshData: async function() {
    try {
      await this.loadAccounts();
      await this.loadTransactions();
      this.updateDashboardStats();
    } catch (error) {
      console.error('[Dashboard] Refresh failed:', error);
    }
  },

  /**
   * Update dashboard statistics
   */
  updateDashboardStats: function() {
    const totalBalance = this.getTotalBalance();
    const balanceEl = document.getElementById('total-balance');
    if (balanceEl) {
      balanceEl.textContent = Utils.formatCurrency(totalBalance);
    }

    const incomeEl = document.getElementById('monthly-income');
    if (incomeEl) {
      incomeEl.textContent = Utils.formatCurrency(this.getMonthlyIncome());
    }

    const expensesEl = document.getElementById('monthly-expenses');
    if (expensesEl) {
      expensesEl.textContent = Utils.formatCurrency(this.getMonthlyExpenses());
    }

    const countEl = document.getElementById('transaction-count');
    if (countEl) {
      countEl.textContent = this.state.transactions.length;
    }

    // Update accounts
    const accountsContainer = document.getElementById('accounts-container');
    if (accountsContainer) {
      accountsContainer.innerHTML = this.renderAccounts();
    }
  },

  /**
   * Get total balance
   */
  getTotalBalance: function() {
    return this.state.accounts.reduce((sum, acc) => sum + parseFloat(acc.balance || 0), 0);
  },

  /**
   * Get monthly income
   */
  getMonthlyIncome: function() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    return this.state.transactions
      .filter(txn => {
        const date = new Date(txn.created_at);
        const isCredit = txn.to_account_id && txn.transaction_type !== 'withdrawal' && txn.transaction_type !== 'payment';
        return date >= startOfMonth && isCredit;
      })
      .reduce((sum, txn) => sum + parseFloat(txn.amount || 0), 0);
  },

  /**
   * Get monthly expenses
   */
  getMonthlyExpenses: function() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    return this.state.transactions
      .filter(txn => {
        const date = new Date(txn.created_at);
        const isDebit = !txn.to_account_id || txn.transaction_type === 'withdrawal' || txn.transaction_type === 'payment';
        return date >= startOfMonth && isDebit;
      })
      .reduce((sum, txn) => sum + parseFloat(txn.amount || 0), 0);
  },

  /**
   * Setup event listeners
   */
  setupEventListeners: function() {
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + T for transfer
      if ((e.ctrlKey || e.metaKey) && e.key === 't') {
        e.preventDefault();
        this.showTransferModal();
      }
      // Ctrl/Cmd + D for deposit
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        this.showDepositModal();
      }
    });
  },

  /**
   * Show transfer modal
   */
  showTransferModal: function() {
    const accounts = this.state.accounts;
    if (!accounts || accounts.length === 0) {
      Components.toast('No accounts available', 'warning');
      return;
    }

    const modal = Components.showModal({
      title: 'Money Transfer',
      size: 'md',
      content: `
        <form id="transfer-form" class="space-y-4">
          ${Components.formSelect({
            name: 'from_account_id',
            label: 'From Account',
            required: true,
            options: accounts.map(a => ({
              value: a.id,
              label: `${Utils.capitalize(a.account_type)} - ${Utils.maskAccountNumber(a.account_number)} (${Utils.formatCurrency(a.balance)})`
            }))
          })}
          
          ${Components.formInput({
            name: 'to_account_id',
            label: 'To Account Number',
            placeholder: 'Enter account number',
            required: true,
            icon: 'fas fa-university'
          })}
          
          ${Components.formInput({
            type: 'number',
            name: 'amount',
            label: 'Amount',
            placeholder: '0.00',
            required: true,
            icon: 'fas fa-dollar-sign'
          })}
          
          ${Components.formInput({
            name: 'description',
            label: 'Description (Optional)',
            placeholder: "What's this for?"
          })}
        </form>
      `,
      footer: `
        <button type="button" class="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors" onclick="Components.closeModal()">
          Cancel
        </button>
        <button type="submit" form="transfer-form" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
          Transfer
        </button>
      `
    });

    // Setup form submission
    const form = modal.querySelector('#transfer-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.processTransfer();
    });
  },

  /**
   * Process transfer
   */
  processTransfer: async function() {
    const form = document.getElementById('transfer-form');
    const formData = Validation.getFormData(form);
    
    // Validate
    const validation = Validation.validateTransfer(formData, this.state.accounts);
    if (!validation.isValid) {
      Validation.showFormErrors(form, validation.errors);
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    Components.setButtonLoading(submitBtn, 'Processing...');

    try {
      await API.post('/transactions/transfer', {
        from_account_id: parseInt(formData.from_account_id),
        to_account_id: formData.to_account_id,
        amount: parseFloat(formData.amount),
        description: formData.description
      });

      Components.closeModal();
      Components.toast('Transfer successful!', 'success');
      
      // Refresh data
      await this.refreshData();
      
    } catch (error) {
      Components.toast(error.message || 'Transfer failed', 'error');
    } finally {
      Components.resetButton(submitBtn);
    }
  },

  /**
   * Show deposit modal
   */
  showDepositModal: function() {
    const accounts = this.state.accounts;
    if (!accounts || accounts.length === 0) {
      Components.toast('No accounts available', 'warning');
      return;
    }

    const modal = Components.showModal({
      title: 'Deposit Money',
      size: 'md',
      content: `
        <form id="deposit-form" class="space-y-4">
          ${Components.formSelect({
            name: 'account_id',
            label: 'To Account',
            required: true,
            options: accounts.map(a => ({
              value: a.id,
              label: `${Utils.capitalize(a.account_type)} - ${Utils.maskAccountNumber(a.account_number)}`
            }))
          })}
          
          ${Components.formInput({
            type: 'number',
            name: 'amount',
            label: 'Amount',
            placeholder: '0.00',
            required: true,
            icon: 'fas fa-dollar-sign'
          })}
          
          ${Components.formInput({
            name: 'description',
            label: 'Description (Optional)',
            placeholder: "What's this for?"
          })}
        </form>
      `,
      footer: `
        <button type="button" class="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors" onclick="Components.closeModal()">
          Cancel
        </button>
        <button type="submit" form="deposit-form" class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">
          Deposit
        </button>
      `
    });

    // Setup form submission
    const form = modal.querySelector('#deposit-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.processDeposit();
    });
  },

  /**
   * Process deposit
   */
  processDeposit: async function() {
    const form = document.getElementById('deposit-form');
    const formData = Validation.getFormData(form);

    const submitBtn = form.querySelector('button[type="submit"]');
    Components.setButtonLoading(submitBtn, 'Processing...');

    try {
      await API.post('/transactions/deposit', {
        account_id: parseInt(formData.account_id),
        amount: parseFloat(formData.amount),
        description: formData.description
      });

      Components.closeModal();
      Components.toast('Deposit successful!', 'success');
      
      // Refresh data
      await this.refreshData();
      
    } catch (error) {
      Components.toast(error.message || 'Deposit failed', 'error');
    } finally {
      Components.resetButton(submitBtn);
    }
  },

  /**
   * Cleanup on destroy
   */
  destroy: function() {
    if (this.state.refreshInterval) {
      clearInterval(this.state.refreshInterval);
    }
    if (this.state.chart) {
      this.state.chart.destroy();
    }
    if (this.state.ws) {
      this.state.ws.close();
    }
  }
};

// Make available globally
if (typeof window !== 'undefined') {
  window.DashboardEnhanced = DashboardEnhanced;
}