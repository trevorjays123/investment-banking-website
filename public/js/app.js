// Main Application Module
const App = {
  currentView: 'home',

  init: function() {
    this.updateNav();
    this.checkAuthAndRender();
    this.setupNavigation();
  },

  checkAuthAndRender: function() {
    if (Auth.isAuthenticated()) {
      this.navigateTo('dashboard');
    } else {
      this.navigateTo('login');
    }
  },

  updateNav: function() {
    const navLinks = document.getElementById('nav-links');
    if (!navLinks) return;

    if (Auth.isAuthenticated()) {
      const user = Auth.getCurrentUser();
      navLinks.innerHTML = `
        <span class="text-sm">Welcome, ${user?.first_name || 'User'}</span>
        <a href="#" onclick="App.navigateTo('dashboard')" class="hover:text-blue-200">Dashboard</a>
        <a href="#" onclick="App.navigateTo('profile')" class="hover:text-blue-200">Profile</a>
        <a href="#" onclick="Auth.logout()" class="bg-red-500 hover:bg-red-600 px-4 py-2 rounded transition-colors">Logout</a>
      `;
    } else {
      navLinks.innerHTML = `
        <a href="#" onclick="App.navigateTo('login')" class="hover:text-blue-200">Login</a>
        <a href="#" onclick="App.navigateTo('register')" class="bg-white text-blue-600 hover:bg-gray-100 px-4 py-2 rounded transition-colors">Register</a>
      `;
    }
  },

  setupNavigation: function() {
    window.navigateTo = this.navigateTo.bind(this);
  },

  navigateTo: function(view) {
    this.currentView = view;
    // Support both #app and #main-content containers
    const app = document.getElementById('app') || document.getElementById('main-content');
    
    switch(view) {
      case 'login':
        app.innerHTML = this.renderLogin();
        this.setupLoginForm();
        break;
      case 'register':
        app.innerHTML = this.renderRegister();
        this.setupRegisterForm();
        break;
      case 'dashboard':
        app.innerHTML = this.renderDashboard();
        Dashboard.init();
        break;
      case 'profile':
        app.innerHTML = this.renderProfile();
        this.loadProfile();
        break;
      case 'bills':
        app.innerHTML = this.renderBills();
        this.loadBills();
        break;
      case 'transactions':
        app.innerHTML = this.renderTransactions();
        this.loadAllTransactions();
        break;
      default:
        app.innerHTML = this.renderLogin();
    }

    this.updateNav();
    window.scrollTo(0, 0);
  },

  renderLogin: function() {
    return `
      <div class="max-w-md mx-auto mt-10 fade-in">
        <div class="bg-white rounded-lg shadow-xl overflow-hidden">
          <div class="gradient-bg p-6 text-center">
            <i class="fas fa-university text-4xl text-white mb-2"></i>
            <h1 class="text-2xl font-bold text-white">Welcome Back</h1>
            <p class="text-blue-100">Sign in to your account</p>
          </div>
          <div class="p-6">
            <form id="login-form">
              <div class="mb-4">
                <label class="block text-gray-700 text-sm font-bold mb-2">Email</label>
                <input type="email" id="login-email" class="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="your@email.com" required>
              </div>
              <div class="mb-6">
                <label class="block text-gray-700 text-sm font-bold mb-2">Password</label>
                <input type="password" id="login-password" class="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="••••••••" required>
              </div>
              <button type="submit" class="w-full gradient-bg text-white font-bold py-3 rounded-lg hover:opacity-90 transition-opacity">
                Sign In
              </button>
            </form>
            <div class="mt-4 text-center">
              <a href="#" onclick="App.navigateTo('register')" class="text-blue-600 hover:underline">Don't have an account? Register</a>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  setupLoginForm: function() {
    document.getElementById('login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;

      const result = await Auth.login(email, password);

      if (result.success) {
        this.showToast('Login successful!', 'success');
        this.navigateTo('dashboard');
      } else if (result.requires_2fa) {
        this.show2FAModal(result.temp_token);
      } else {
        this.showToast(result.error || 'Login failed', 'error');
      }
    });
  },

  show2FAModal: function(tempToken) {
    const modal = document.getElementById('modal-container') || document.createElement('div');
    modal.id = 'modal-container';
    document.body.appendChild(modal);
    
    modal.innerHTML = `
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg p-6 w-full max-w-md mx-4">
          <div class="text-center mb-4">
            <i class="fas fa-shield-alt text-4xl text-blue-600 mb-2"></i>
            <h3 class="text-xl font-bold">Two-Factor Authentication</h3>
            <p class="text-gray-600">Enter your 2FA code</p>
          </div>
          <form id="2fa-form">
            <input type="text" id="2fa-code" class="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-2xl tracking-widest" placeholder="000000" maxlength="6" required>
            <button type="submit" class="w-full mt-4 gradient-bg text-white font-bold py-3 rounded-lg hover:opacity-90 transition-opacity">
              Verify
            </button>
          </form>
        </div>
      </div>
    `;

    document.getElementById('2fa-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const code = document.getElementById('2fa-code').value;
      const result = await Auth.verify2FA(tempToken, code);
      
      if (result.success) {
        document.querySelector('.fixed').remove();
        this.showToast('Login successful!', 'success');
        this.navigateTo('dashboard');
      } else {
        this.showToast(result.error || '2FA verification failed', 'error');
      }
    });
  },

  renderRegister: function() {
    return `
      <div class="max-w-md mx-auto mt-10 fade-in">
        <div class="bg-white rounded-lg shadow-xl overflow-hidden">
          <div class="gradient-bg p-6 text-center">
            <i class="fas fa-user-plus text-4xl text-white mb-2"></i>
            <h1 class="text-2xl font-bold text-white">Create Account</h1>
            <p class="text-blue-100">Join us today</p>
          </div>
          <div class="p-6">
            <form id="register-form">
              <div class="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label class="block text-gray-700 text-sm font-bold mb-2">First Name</label>
                  <input type="text" id="reg-first-name" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                </div>
                <div>
                  <label class="block text-gray-700 text-sm font-bold mb-2">Last Name</label>
                  <input type="text" id="reg-last-name" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                </div>
              </div>
              <div class="mb-4">
                <label class="block text-gray-700 text-sm font-bold mb-2">Email</label>
                <input type="email" id="reg-email" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required>
              </div>
              <div class="mb-4">
                <label class="block text-gray-700 text-sm font-bold mb-2">Phone</label>
                <input type="tel" id="reg-phone" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              </div>
              <div class="mb-4">
                <label class="block text-gray-700 text-sm font-bold mb-2">Password</label>
                <input type="password" id="reg-password" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" minlength="8" required>
              </div>
              <div class="mb-4">
                <label class="block text-gray-700 text-sm font-bold mb-2">Confirm Password</label>
                <input type="password" id="reg-confirm-password" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required>
              </div>
              <button type="submit" class="w-full gradient-bg text-white font-bold py-3 rounded-lg hover:opacity-90 transition-opacity">
                Create Account
              </button>
            </form>
            <div class="mt-4 text-center">
              <a href="#" onclick="App.navigateTo('login')" class="text-blue-600 hover:underline">Already have an account? Sign In</a>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  setupRegisterForm: function() {
    document.getElementById('register-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const password = document.getElementById('reg-password').value;
      const confirmPassword = document.getElementById('reg-confirm-password').value;

      if (password !== confirmPassword) {
        this.showToast('Passwords do not match', 'error');
        return;
      }

      const userData = {
        first_name: document.getElementById('reg-first-name').value,
        last_name: document.getElementById('reg-last-name').value,
        email: document.getElementById('reg-email').value,
        phone: document.getElementById('reg-phone').value,
        password: password
      };

      const result = await Auth.register(userData);

      if (result.success) {
        this.showToast(result.message, 'success');
        this.navigateTo('login');
      } else {
        this.showToast(result.error || 'Registration failed', 'error');
      }
    });
  },

  renderDashboard: function() {
    return `
      <div class="fade-in">
        <!-- Quick Actions -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <button id="transfer-btn" class="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-lg flex items-center justify-center space-x-2 transition-colors">
            <i class="fas fa-exchange-alt"></i>
            <span>Transfer</span>
          </button>
          <button id="deposit-btn" class="bg-green-600 hover:bg-green-700 text-white p-4 rounded-lg flex items-center justify-center space-x-2 transition-colors">
            <i class="fas fa-plus"></i>
            <span>Deposit</span>
          </button>
          <button id="pay-bills-btn" class="bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-lg flex items-center justify-center space-x-2 transition-colors">
            <i class="fas fa-file-invoice-dollar"></i>
            <span>Pay Bills</span>
          </button>
          <button onclick="App.navigateTo('transactions')" class="bg-gray-600 hover:bg-gray-700 text-white p-4 rounded-lg flex items-center justify-center space-x-2 transition-colors">
            <i class="fas fa-history"></i>
            <span>History</span>
          </button>
        </div>

        <!-- Total Balance -->
        <div class="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg shadow-lg p-6 mb-8 text-white">
          <p class="text-blue-100 mb-1">Total Balance</p>
          <p class="text-4xl font-bold" id="total-balance">$0.00</p>
        </div>

        <!-- Accounts Summary -->
        <h2 class="text-2xl font-bold mb-4">Your Accounts</h2>
        <div id="accounts-summary" class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <!-- Accounts will be loaded here -->
        </div>

        <!-- Recent Transactions -->
        <h2 class="text-2xl font-bold mb-4">Recent Transactions</h2>
        <div class="bg-white rounded-lg shadow p-6">
          <div id="recent-transactions">
            <!-- Transactions will be loaded here -->
          </div>
        </div>

        <!-- Modal Container -->
        <div id="modal-container"></div>
      </div>
    `;
  },

  renderProfile: function() {
    return `
      <div class="max-w-2xl mx-auto fade-in">
        <div class="bg-white rounded-lg shadow p-6">
          <h2 class="text-2xl font-bold mb-6">Profile Settings</h2>
          <form id="profile-form">
            <div class="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label class="block text-gray-700 text-sm font-bold mb-2">First Name</label>
                <input type="text" id="profile-first-name" class="w-full px-4 py-2 border rounded-lg">
              </div>
              <div>
                <label class="block text-gray-700 text-sm font-bold mb-2">Last Name</label>
                <input type="text" id="profile-last-name" class="w-full px-4 py-2 border rounded-lg">
              </div>
            </div>
            <div class="mb-4">
              <label class="block text-gray-700 text-sm font-bold mb-2">Email</label>
              <input type="email" id="profile-email" class="w-full px-4 py-2 border rounded-lg bg-gray-100" disabled>
            </div>
            <div class="mb-4">
              <label class="block text-gray-700 text-sm font-bold mb-2">Phone</label>
              <input type="tel" id="profile-phone" class="w-full px-4 py-2 border rounded-lg">
            </div>
            <div class="mb-4">
              <label class="block text-gray-700 text-sm font-bold mb-2">Address</label>
              <textarea id="profile-address" class="w-full px-4 py-2 border rounded-lg" rows="3"></textarea>
            </div>
            <button type="submit" class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">Save Changes</button>
          </form>

          <hr class="my-6">

          <h3 class="text-xl font-bold mb-4">Change Password</h3>
          <form id="password-form">
            <div class="mb-4">
              <label class="block text-gray-700 text-sm font-bold mb-2">Current Password</label>
              <input type="password" id="current-password" class="w-full px-4 py-2 border rounded-lg">
            </div>
            <div class="mb-4">
              <label class="block text-gray-700 text-sm font-bold mb-2">New Password</label>
              <input type="password" id="new-password" class="w-full px-4 py-2 border rounded-lg" minlength="8">
            </div>
            <button type="submit" class="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700">Change Password</button>
          </form>
        </div>
      </div>
    `;
  },

  loadProfile: async function() {
    try {
      const data = await API.get('/profile');
      const user = data.user;
      
      document.getElementById('profile-first-name').value = user.first_name || '';
      document.getElementById('profile-last-name').value = user.last_name || '';
      document.getElementById('profile-email').value = user.email || '';
      document.getElementById('profile-phone').value = user.phone || '';
      document.getElementById('profile-address').value = user.address || '';

      // Setup form handlers
      document.getElementById('profile-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.updateProfile();
      });

      document.getElementById('password-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.changePassword();
      });
    } catch (error) {
      this.showToast('Failed to load profile', 'error');
    }
  },

  updateProfile: async function() {
    try {
      const data = await API.put('/profile', {
        first_name: document.getElementById('profile-first-name').value,
        last_name: document.getElementById('profile-last-name').value,
        phone: document.getElementById('profile-phone').value,
        address: document.getElementById('profile-address').value
      });
      this.showToast('Profile updated successfully', 'success');
      this.updateNav();
    } catch (error) {
      this.showToast(error.message, 'error');
    }
  },

  changePassword: async function() {
    try {
      await API.put('/profile/password', {
        current_password: document.getElementById('current-password').value,
        new_password: document.getElementById('new-password').value
      });
      this.showToast('Password changed successfully', 'success');
      document.getElementById('password-form').reset();
    } catch (error) {
      this.showToast(error.message, 'error');
    }
  },

  renderBills: function() {
    return `
      <div class="fade-in">
        <h2 class="text-2xl font-bold mb-6">Bill Payments</h2>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div class="bg-white rounded-lg shadow p-6">
            <h3 class="text-lg font-bold mb-4">Your Payees</h3>
            <div id="payees-list" class="space-y-3">
              <p class="text-gray-500">Loading...</p>
            </div>
            <button onclick="App.showAddPayeeModal()" class="mt-4 w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
              Add Payee
            </button>
          </div>

          <div class="bg-white rounded-lg shadow p-6">
            <h3 class="text-lg font-bold mb-4">Scheduled Payments</h3>
            <div id="payments-list" class="space-y-3">
              <p class="text-gray-500">Loading...</p>
            </div>
          </div>
        </div>
      </div>
      <div id="modal-container"></div>
    `;
  },

  loadBills: async function() {
    try {
      const [payeesData, paymentsData] = await Promise.all([
        API.get('/bills/payees'),
        API.get('/bills/payments')
      ]);

      document.getElementById('payees-list').innerHTML = payeesData.payees.length > 0 
        ? payeesData.payees.map(p => `
            <div class="flex justify-between items-center p-3 bg-gray-50 rounded">
              <div>
                <p class="font-medium">${p.payee_name}</p>
                <p class="text-sm text-gray-500">${p.bank_name}</p>
              </div>
              <button onclick="App.showPayBillModal(${p.id}, '${p.payee_name}')" class="text-blue-600 hover:underline">Pay</button>
            </div>
          `).join('')
        : '<p class="text-gray-500">No payees added</p>';

      document.getElementById('payments-list').innerHTML = paymentsData.payments.length > 0
        ? paymentsData.payments.map(p => `
            <div class="flex justify-between items-center p-3 bg-gray-50 rounded">
              <div>
                <p class="font-medium">${p.payee_name}</p>
                <p class="text-sm text-gray-500">Due: ${new Date(p.payment_date).toLocaleDateString()}</p>
              </div>
              <span class="px-2 py-1 text-xs rounded ${p.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">${p.status}</span>
            </div>
          `).join('')
        : '<p class="text-gray-500">No scheduled payments</p>';
    } catch (error) {
      console.error('Error loading bills:', error);
    }
  },

  showPayBillModal: function(payeeId, payeeName) {
    const accounts = API.getAccounts();
    const modal = document.getElementById('modal-container');
    modal.innerHTML = `
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg p-6 w-full max-w-md mx-4">
          <h3 class="text-xl font-bold mb-4">Pay ${payeeName}</h3>
          <form id="pay-bill-form">
            <div class="mb-4">
              <label class="block text-gray-700 text-sm font-bold mb-2">From Account</label>
              <select id="bill-account" class="w-full px-3 py-2 border rounded-lg" required>
                ${accounts.map(a => `<option value="${a.id}">${a.account_type} - ${a.account_number.slice(-4)}</option>`).join('')}
              </select>
            </div>
            <div class="mb-4">
              <label class="block text-gray-700 text-sm font-bold mb-2">Amount</label>
              <input type="number" id="bill-amount" class="w-full px-3 py-2 border rounded-lg" required min="0.01" step="0.01">
            </div>
            <div class="mb-4">
              <label class="block text-gray-700 text-sm font-bold mb-2">Payment Date</label>
              <input type="date" id="bill-date" class="w-full px-3 py-2 border rounded-lg" required>
            </div>
            <div class="flex gap-3">
              <button type="submit" class="flex-1 bg-blue-600 text-white py-2 rounded-lg">Schedule Payment</button>
              <button type="button" onclick="this.closest('.fixed').remove()" class="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    `;

    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('bill-date').min = today;

    document.getElementById('pay-bill-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await API.post('/bills/payments', {
          payee_id: payeeId,
          from_account_id: parseInt(document.getElementById('bill-account').value),
          amount: parseFloat(document.getElementById('bill-amount').value),
          payment_date: document.getElementById('bill-date').value
        });
        document.querySelector('.fixed').remove();
        this.showToast('Payment scheduled successfully', 'success');
        this.loadBills();
      } catch (error) {
        this.showToast(error.message, 'error');
      }
    });
  },

  showAddPayeeModal: function() {
    const modal = document.getElementById('modal-container');
    modal.innerHTML = `
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg p-6 w-full max-w-md mx-4">
          <h3 class="text-xl font-bold mb-4">Add Payee</h3>
          <form id="add-payee-form">
            <div class="mb-4">
              <label class="block text-gray-700 text-sm font-bold mb-2">Payee Name</label>
              <input type="text" id="payee-name" class="w-full px-3 py-2 border rounded-lg" required>
            </div>
            <div class="mb-4">
              <label class="block text-gray-700 text-sm font-bold mb-2">Account Number</label>
              <input type="text" id="payee-account" class="w-full px-3 py-2 border rounded-lg" required>
            </div>
            <div class="mb-4">
              <label class="block text-gray-700 text-sm font-bold mb-2">Bank Name</label>
              <input type="text" id="payee-bank" class="w-full px-3 py-2 border rounded-lg" required>
            </div>
            <div class="flex gap-3">
              <button type="submit" class="flex-1 bg-blue-600 text-white py-2 rounded-lg">Add Payee</button>
              <button type="button" onclick="this.closest('.fixed').remove()" class="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.getElementById('add-payee-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await API.post('/bills/payees', {
          payee_name: document.getElementById('payee-name').value,
          account_number: document.getElementById('payee-account').value,
          bank_name: document.getElementById('payee-bank').value
        });
        document.querySelector('.fixed').remove();
        this.showToast('Payee added successfully', 'success');
        this.loadBills();
      } catch (error) {
        this.showToast(error.message, 'error');
      }
    });
  },

  renderTransactions: function() {
    return `
      <div class="fade-in">
        <h2 class="text-2xl font-bold mb-6">Transaction History</h2>
        
        <div class="bg-white rounded-lg shadow p-6 mb-6">
          <div class="flex flex-wrap gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">From Date</label>
              <input type="date" id="txn-start-date" class="px-3 py-2 border rounded-lg">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">To Date</label>
              <input type="date" id="txn-end-date" class="px-3 py-2 border rounded-lg">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select id="txn-type" class="px-3 py-2 border rounded-lg">
                <option value="">All</option>
                <option value="transfer">Transfer</option>
                <option value="deposit">Deposit</option>
                <option value="withdrawal">Withdrawal</option>
                <option value="payment">Payment</option>
              </select>
            </div>
            <div class="flex items-end">
              <button onclick="App.loadAllTransactions()" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Filter</button>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow">
          <div id="transactions-list" class="divide-y divide-gray-200">
            <p class="p-6 text-gray-500">Loading...</p>
          </div>
          <div id="pagination" class="p-4 flex justify-center"></div>
        </div>
      </div>
    `;
  },

  loadAllTransactions: async function() {
    try {
      const startDate = document.getElementById('txn-start-date')?.value || '';
      const endDate = document.getElementById('txn-end-date')?.value || '';
      const type = document.getElementById('txn-type')?.value || '';

      let url = '/transactions?limit=20';
      if (startDate) url += `&start_date=${startDate}`;
      if (endDate) url += `&end_date=${endDate}`;
      if (type) url += `&type=${type}`;

      const data = await API.get(url);
      this.renderTransactionsList(data.transactions);
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  },

  renderTransactionsList: function(transactions) {
    const container = document.getElementById('transactions-list');
    if (!container) return;

    if (!transactions || transactions.length === 0) {
      container.innerHTML = '<p class="p-6 text-gray-500">No transactions found</p>';
      return;
    }

    container.innerHTML = transactions.map(txn => {
      const isCredit = txn.to_account_id && txn.transaction_type !== 'withdrawal' && txn.transaction_type !== 'payment';
      const amountClass = isCredit ? 'text-green-600' : 'text-red-600';
      const amountPrefix = isCredit ? '+' : '-';
      const typeIcon = this.getTransactionIcon(txn.transaction_type);

      return `
        <div class="p-4 flex items-center justify-between hover:bg-gray-50">
          <div class="flex items-center space-x-4">
            <div class="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
              <i class="${typeIcon} text-gray-600 text-xl"></i>
            </div>
            <div>
              <p class="font-medium text-gray-800">${txn.description || txn.transaction_type}</p>
              <p class="text-sm text-gray-500">
                ${txn.reference_number} • ${new Date(txn.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div class="text-right">
            <p class="font-bold ${amountClass}">${amountPrefix}$${parseFloat(txn.amount).toFixed(2)}</p>
            <span class="text-xs px-2 py-1 rounded-full ${this.getTxnStatusClass(txn.status)}">${txn.status}</span>
          </div>
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

  getTxnStatusClass: function(status) {
    const classes = {
      completed: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800',
      reversed: 'bg-gray-100 text-gray-800'
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
  },

  showToast: function(message, type = 'info') {
    // Create or get toast container
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    
    const colors = {
      success: 'bg-green-500',
      error: 'bg-red-500',
      info: 'bg-blue-500'
    };

    toast.className = `${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg mb-2 fade-in`;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3000);
  }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
