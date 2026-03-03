/**
 * Admin Dashboard JavaScript
 * Handles admin dashboard functionality, user management, and charts
 */

// Admin Dashboard Module
const AdminDashboard = (function() {
  // State
  let currentPage = {
    users: 1,
    investments: 1,
    transactions: 1,
    audit: 1
  };
  let revenueChart = null;
  let revenueBreakdownChart = null;

  // Initialize
  function init() {
    // Check authentication
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (!token || user.role !== 'admin') {
      window.location.href = '/';
      return;
    }

    // Set admin name
    document.getElementById('adminName').textContent = `${user.first_name} ${user.last_name}`;

    // Setup navigation
    setupNavigation();

    // Setup event listeners
    setupEventListeners();

    // Load dashboard data
    loadDashboardData();
  }

  // Setup Navigation
  function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item[data-section]');
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const section = item.dataset.section;
        showSection(section);
      });
    });
  }

  // Show Section
  function showSection(sectionName) {
    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.remove('active');
      if (item.dataset.section === sectionName) {
        item.classList.add('active');
      }
    });

    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
      section.classList.add('hidden');
    });

    // Show selected section
    const section = document.getElementById(`${sectionName}Section`);
    if (section) {
      section.classList.remove('hidden');
    }

    // Update page title
    const titles = {
      dashboard: 'Dashboard Overview',
      users: 'User Management',
      investments: 'Investment Management',
      transactions: 'Transaction Management',
      revenue: 'Revenue Analytics',
      audit: 'Audit Logs'
    };
    document.getElementById('pageTitle').textContent = titles[sectionName] || 'Dashboard';

    // Load section data
    switch (sectionName) {
      case 'dashboard':
        loadDashboardData();
        break;
      case 'users':
        loadUsers();
        break;
      case 'investments':
        loadInvestments();
        break;
      case 'transactions':
        loadTransactions();
        break;
      case 'revenue':
        loadRevenueBreakdown();
        break;
      case 'audit':
        loadAuditLogs();
        break;
    }
  }

  // Setup Event Listeners
  function setupEventListeners() {
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    });

    // User search
    document.getElementById('userSearch').addEventListener('input', debounce(() => {
      currentPage.users = 1;
      loadUsers();
    }, 300));

    // Transaction status filter
    document.getElementById('transactionStatusFilter').addEventListener('change', () => {
      currentPage.transactions = 1;
      loadTransactions();
    });
  }

  // Load Dashboard Data
  async function loadDashboardData() {
    try {
      const response = await API.get('/admin/dashboard');
      
      if (response.success) {
        const data = response.data;

        // Update metric cards
        document.getElementById('totalUsers').textContent = formatNumber(data.users.total);
        document.getElementById('totalInvestments').textContent = formatCurrency(data.investments.totalAmount);
        document.getElementById('investmentsChange').textContent = `${data.investments.total} active investments`;
        document.getElementById('todayRevenue').textContent = formatCurrency(data.revenue.today);
        document.getElementById('revenueChange').textContent = `Monthly: ${formatCurrency(data.revenue.monthly)}`;
        document.getElementById('totalTransactions').textContent = formatNumber(data.transactions.total);
        document.getElementById('transactionsVolume').textContent = `Volume: ${formatCurrency(data.transactions.volume)}`;

        // Update recent activity table
        updateRecentActivityTable(data.recentActivity);

        // Load revenue chart
        loadRevenueChart();
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      showToast('Failed to load dashboard data', 'error');
    }
  }

  // Update Recent Activity Table
  function updateRecentActivityTable(activities) {
    const tbody = document.getElementById('recentActivityTable');
    
    if (!activities || activities.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center">No recent activity</td></tr>';
      return;
    }

    tbody.innerHTML = activities.map(activity => `
      <tr>
        <td>${escapeHtml(activity.user_name)}</td>
        <td>${escapeHtml(activity.transaction_type)}</td>
        <td>${formatCurrency(activity.amount)}</td>
        <td><span class="status-badge ${activity.status}">${escapeHtml(activity.status)}</span></td>
        <td>${formatDate(activity.created_at)}</td>
      </tr>
    `).join('');
  }

  // Load Revenue Chart
  async function loadRevenueChart() {
    try {
      const response = await API.get('/admin/revenue?days=30');
      
      if (response.success) {
        const data = response.data;
        const labels = data.map(d => formatDateShort(d.date));
        const values = data.map(d => d.total);

        const ctx = document.getElementById('revenueChart').getContext('2d');

        if (revenueChart) {
          revenueChart.destroy();
        }

        revenueChart = new Chart(ctx, {
          type: 'line',
          data: {
            labels: labels,
            datasets: [{
              label: 'Daily Revenue',
              data: values,
              borderColor: '#4a90d9',
              backgroundColor: 'rgba(74, 144, 217, 0.1)',
              fill: true,
              tension: 0.4
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: false
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  callback: value => '$' + value.toLocaleString()
                }
              }
            }
          }
        });
      }
    } catch (error) {
      console.error('Failed to load revenue chart:', error);
    }
  }

  // Load Users
  async function loadUsers() {
    const search = document.getElementById('userSearch').value;
    const page = currentPage.users;
    const limit = 10;

    try {
      const response = await API.get(`/admin/users?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`);
      
      if (response.success) {
        const { users, pagination } = response.data;

        const tbody = document.getElementById('usersTable');
        
        if (users.length === 0) {
          tbody.innerHTML = '<tr><td colspan="8" class="text-center">No users found</td></tr>';
        } else {
          tbody.innerHTML = users.map(user => `
            <tr>
              <td>${user.id}</td>
              <td>${escapeHtml(user.first_name)} ${escapeHtml(user.last_name)}</td>
              <td>${escapeHtml(user.email)}</td>
              <td><span class="status-badge ${user.role}">${escapeHtml(user.role)}</span></td>
              <td>${user.account_count}</td>
              <td>${formatCurrency(user.total_balance)}</td>
              <td><span class="status-badge ${user.email_verified ? 'active' : 'frozen'}">${user.email_verified ? 'Verified' : 'Pending'}</span></td>
              <td>
                <button class="action-btn view" onclick="AdminDashboard.viewUser(${user.id})">View</button>
                <button class="action-btn edit" onclick="AdminDashboard.editUser(${user.id})">Edit</button>
                <button class="action-btn delete" onclick="AdminDashboard.deleteUser(${user.id})">Delete</button>
              </td>
            </tr>
          `).join('');
        }

        // Update pagination
        updatePagination('users', pagination);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
      showToast('Failed to load users', 'error');
    }
  }

  // Load Investments
  async function loadInvestments() {
    const page = currentPage.investments;
    const limit = 10;

    try {
      const response = await API.get(`/admin/investments?page=${page}&limit=${limit}`);
      
      if (response.success) {
        const { investments, pagination } = response.data;

        const tbody = document.getElementById('investmentsTable');
        
        if (investments.length === 0) {
          tbody.innerHTML = '<tr><td colspan="8" class="text-center">No investments found</td></tr>';
        } else {
          tbody.innerHTML = investments.map(inv => `
            <tr>
              <td>${inv.id}</td>
              <td>${escapeHtml(inv.user_name)}<br><small>${escapeHtml(inv.user_email)}</small></td>
              <td>${formatInvestmentType(inv.investment_type)}</td>
              <td>${formatCurrency(inv.amount)}</td>
              <td>${inv.expected_return}%</td>
              <td><span class="status-badge ${inv.status}">${escapeHtml(inv.status)}</span></td>
              <td>${formatDate(inv.start_date)}</td>
              <td>${inv.maturity_date ? formatDate(inv.maturity_date) : 'N/A'}</td>
            </tr>
          `).join('');
        }

        // Update pagination
        updatePagination('investments', pagination);
      }
    } catch (error) {
      console.error('Failed to load investments:', error);
      showToast('Failed to load investments', 'error');
    }
  }

  // Load Transactions
  async function loadTransactions() {
    const page = currentPage.transactions;
    const limit = 10;
    const status = document.getElementById('transactionStatusFilter').value;

    try {
      let url = `/admin/transactions?page=${page}&limit=${limit}`;
      if (status) url += `&status=${status}`;

      const response = await API.get(url);
      
      if (response.success) {
        const { transactions, pagination } = response.data;

        const tbody = document.getElementById('transactionsTable');
        
        if (transactions.length === 0) {
          tbody.innerHTML = '<tr><td colspan="7" class="text-center">No transactions found</td></tr>';
        } else {
          tbody.innerHTML = transactions.map(txn => `
            <tr>
              <td>${txn.id}</td>
              <td>${txn.from_account ? escapeHtml(txn.from_account) : '-'}<br><small>${txn.from_user_email || ''}</small></td>
              <td>${txn.to_account ? escapeHtml(txn.to_account) : '-'}<br><small>${txn.to_user_email || ''}</small></td>
              <td>${escapeHtml(txn.transaction_type)}</td>
              <td>${formatCurrency(txn.amount)}</td>
              <td><span class="status-badge ${txn.status}">${escapeHtml(txn.status)}</span></td>
              <td>${formatDate(txn.created_at)}</td>
            </tr>
          `).join('');
        }

        // Update pagination
        updatePagination('transactions', pagination);
      }
    } catch (error) {
      console.error('Failed to load transactions:', error);
      showToast('Failed to load transactions', 'error');
    }
  }

  // Load Revenue Breakdown
  async function loadRevenueBreakdown() {
    try {
      const response = await API.get('/admin/revenue?days=30');
      
      if (response.success) {
        const data = response.data;
        
        // Calculate totals for each category
        const totals = data.reduce((acc, d) => {
          acc.transactionFees += d.transactionFees;
          acc.investmentFees += d.investmentFees;
          acc.serviceCharges += d.serviceCharges;
          acc.interestIncome += d.interestIncome;
          return acc;
        }, { transactionFees: 0, investmentFees: 0, serviceCharges: 0, interestIncome: 0 });

        const ctx = document.getElementById('revenueBreakdownChart').getContext('2d');

        if (revenueBreakdownChart) {
          revenueBreakdownChart.destroy();
        }

        revenueBreakdownChart = new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: ['Transaction Fees', 'Investment Fees', 'Service Charges', 'Interest Income'],
            datasets: [{
              data: [totals.transactionFees, totals.investmentFees, totals.serviceCharges, totals.interestIncome],
              backgroundColor: ['#4a90d9', '#38a169', '#d69e2e', '#805ad5']
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'bottom'
              }
            }
          }
        });
      }
    } catch (error) {
      console.error('Failed to load revenue breakdown:', error);
      showToast('Failed to load revenue breakdown', 'error');
    }
  }

  // Load Audit Logs
  async function loadAuditLogs() {
    const page = currentPage.audit;
    const limit = 20;

    try {
      const response = await API.get(`/admin/audit-logs?page=${page}&limit=${limit}`);
      
      if (response.success) {
        const { logs, pagination } = response.data;

        const tbody = document.getElementById('auditLogsTable');
        
        if (logs.length === 0) {
          tbody.innerHTML = '<tr><td colspan="7" class="text-center">No audit logs found</td></tr>';
        } else {
          tbody.innerHTML = logs.map(log => `
            <tr>
              <td>${log.id}</td>
              <td>${escapeHtml(log.admin_name)}<br><small>${escapeHtml(log.admin_email)}</small></td>
              <td>${escapeHtml(log.action)}</td>
              <td>${log.target_type ? `${escapeHtml(log.target_type)} #${log.target_id}` : '-'}</td>
              <td><small>${log.details ? escapeHtml(JSON.stringify(log.details)) : '-'}</small></td>
              <td>${log.ip_address || '-'}</td>
              <td>${formatDate(log.created_at)}</td>
            </tr>
          `).join('');
        }

        // Update pagination
        updatePagination('audit', pagination);
      }
    } catch (error) {
      console.error('Failed to load audit logs:', error);
      showToast('Failed to load audit logs', 'error');
    }
  }

  // Update Pagination
  function updatePagination(type, pagination) {
    const info = document.getElementById(`${type}PaginationInfo`);
    const buttons = document.getElementById(`${type}Pagination`);

    info.textContent = `Showing ${(pagination.page - 1) * pagination.limit + 1} to ${Math.min(pagination.page * pagination.limit, pagination.total)} of ${pagination.total}`;

    let html = '';
    
    // Previous button
    html += `<button class="page-btn" ${pagination.page === 1 ? 'disabled' : ''} onclick="AdminDashboard.changePage('${type}', ${pagination.page - 1})">Previous</button>`;
    
    // Page numbers
    const startPage = Math.max(1, pagination.page - 2);
    const endPage = Math.min(pagination.totalPages, pagination.page + 2);

    for (let i = startPage; i <= endPage; i++) {
      html += `<button class="page-btn ${i === pagination.page ? 'active' : ''}" onclick="AdminDashboard.changePage('${type}', ${i})">${i}</button>`;
    }

    // Next button
    html += `<button class="page-btn" ${pagination.page === pagination.totalPages ? 'disabled' : ''} onclick="AdminDashboard.changePage('${type}', ${pagination.page + 1})">Next</button>`;

    buttons.innerHTML = html;
  }

  // Change Page
  function changePage(type, page) {
    currentPage[type] = page;
    
    switch (type) {
      case 'users':
        loadUsers();
        break;
      case 'investments':
        loadInvestments();
        break;
      case 'transactions':
        loadTransactions();
        break;
      case 'audit':
        loadAuditLogs();
        break;
    }
  }

  // View User
  async function viewUser(userId) {
    try {
      const response = await API.get(`/admin/users/${userId}`);
      
      if (response.success) {
        const user = response.data.user;
        
        const modalBody = document.getElementById('userModalBody');
        modalBody.innerHTML = `
          <div class="row">
            <div class="col-md-6">
              <div class="form-group">
                <label>User ID</label>
                <input type="text" value="${user.id}" disabled>
              </div>
            </div>
            <div class="col-md-6">
              <div class="form-group">
                <label>Email</label>
                <input type="text" value="${escapeHtml(user.email)}" disabled>
              </div>
            </div>
          </div>
          <div class="row">
            <div class="col-md-6">
              <div class="form-group">
                <label>First Name</label>
                <input type="text" value="${escapeHtml(user.first_name)}" disabled>
              </div>
            </div>
            <div class="col-md-6">
              <div class="form-group">
                <label>Last Name</label>
                <input type="text" value="${escapeHtml(user.last_name)}" disabled>
              </div>
            </div>
          </div>
          <div class="row">
            <div class="col-md-6">
              <div class="form-group">
                <label>Phone</label>
                <input type="text" value="${escapeHtml(user.phone || 'N/A')}" disabled>
              </div>
            </div>
            <div class="col-md-6">
              <div class="form-group">
                <label>Role</label>
                <input type="text" value="${escapeHtml(user.role)}" disabled>
              </div>
            </div>
          </div>
          <div class="row">
            <div class="col-md-6">
              <div class="form-group">
                <label>Email Verified</label>
                <input type="text" value="${user.email_verified ? 'Yes' : 'No'}" disabled>
              </div>
            </div>
            <div class="col-md-6">
              <div class="form-group">
                <label>2FA Enabled</label>
                <input type="text" value="${user.two_factor_enabled ? 'Yes' : 'No'}" disabled>
              </div>
            </div>
          </div>
          <h5 class="mt-4 mb-3">Accounts</h5>
          <table class="data-table">
            <thead>
              <tr>
                <th>Account Number</th>
                <th>Type</th>
                <th>Balance</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${user.accounts.map(acc => `
                <tr>
                  <td>${escapeHtml(acc.account_number)}</td>
                  <td>${escapeHtml(acc.account_type)}</td>
                  <td>${formatCurrency(acc.balance)}</td>
                  <td><span class="status-badge ${acc.status}">${escapeHtml(acc.status)}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <h5 class="mt-4 mb-3">Recent Transactions</h5>
          <table class="data-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              ${user.transactions.slice(0, 5).map(txn => `
                <tr>
                  <td>${escapeHtml(txn.transaction_type)}</td>
                  <td>${formatCurrency(txn.amount)}</td>
                  <td><span class="status-badge ${txn.status}">${escapeHtml(txn.status)}</span></td>
                  <td>${formatDate(txn.created_at)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;

        document.getElementById('userModalTitle').textContent = 'User Details';
        document.getElementById('userModalFooter').innerHTML = '<button class="btn-secondary" onclick="AdminDashboard.closeUserModal()">Close</button>';
        document.getElementById('userModal').classList.add('active');
      }
    } catch (error) {
      console.error('Failed to load user:', error);
      showToast('Failed to load user details', 'error');
    }
  }

  // Edit User
  async function editUser(userId) {
    try {
      const response = await API.get(`/admin/users/${userId}`);
      
      if (response.success) {
        const user = response.data.user;
        
        const modalBody = document.getElementById('userModalBody');
        modalBody.innerHTML = `
          <form id="editUserForm">
            <input type="hidden" id="editUserId" value="${user.id}">
            <div class="row">
              <div class="col-md-6">
                <div class="form-group">
                  <label>First Name</label>
                  <input type="text" id="editFirstName" value="${escapeHtml(user.first_name)}">
                </div>
              </div>
              <div class="col-md-6">
                <div class="form-group">
                  <label>Last Name</label>
                  <input type="text" id="editLastName" value="${escapeHtml(user.last_name)}">
                </div>
              </div>
            </div>
            <div class="row">
              <div class="col-md-6">
                <div class="form-group">
                  <label>Phone</label>
                  <input type="text" id="editPhone" value="${escapeHtml(user.phone || '')}">
                </div>
              </div>
              <div class="col-md-6">
                <div class="form-group">
                  <label>Role</label>
                  <select id="editRole">
                    <option value="user" ${user.role === 'user' ? 'selected' : ''}>User</option>
                    <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                  </select>
                </div>
              </div>
            </div>
            <div class="row">
              <div class="col-md-6">
                <div class="form-group">
                  <label>Email Verified</label>
                  <select id="editEmailVerified">
                    <option value="true" ${user.email_verified ? 'selected' : ''}>Yes</option>
                    <option value="false" ${!user.email_verified ? 'selected' : ''}>No</option>
                  </select>
                </div>
              </div>
            </div>
          </form>
        `;

        document.getElementById('userModalTitle').textContent = 'Edit User';
        document.getElementById('userModalFooter').innerHTML = `
          <button class="btn-secondary" onclick="AdminDashboard.closeUserModal()">Cancel</button>
          <button class="btn-primary" onclick="AdminDashboard.saveUser()">Save Changes</button>
        `;
        document.getElementById('userModal').classList.add('active');
      }
    } catch (error) {
      console.error('Failed to load user:', error);
      showToast('Failed to load user details', 'error');
    }
  }

  // Save User
  async function saveUser() {
    const userId = document.getElementById('editUserId').value;
    const data = {
      first_name: document.getElementById('editFirstName').value,
      last_name: document.getElementById('editLastName').value,
      phone: document.getElementById('editPhone').value,
      role: document.getElementById('editRole').value,
      email_verified: document.getElementById('editEmailVerified').value === 'true'
    };

    try {
      const response = await API.put(`/admin/users/${userId}`, data);
      
      if (response.success) {
        showToast('User updated successfully', 'success');
        closeUserModal();
        loadUsers();
      }
    } catch (error) {
      console.error('Failed to update user:', error);
      showToast('Failed to update user', 'error');
    }
  }

  // Delete User
  async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await API.delete(`/admin/users/${userId}`);
      
      if (response.success) {
        showToast('User deleted successfully', 'success');
        loadUsers();
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
      showToast(error.message || 'Failed to delete user', 'error');
    }
  }

  // Create User Modal
  function showCreateUserModal() {
    const modalBody = document.getElementById('userModalBody');
    modalBody.innerHTML = `
      <form id="createUserForm">
        <div class="row">
          <div class="col-md-6">
            <div class="form-group">
              <label>First Name *</label>
              <input type="text" id="createFirstName" required>
            </div>
          </div>
          <div class="col-md-6">
            <div class="form-group">
              <label>Last Name *</label>
              <input type="text" id="createLastName" required>
            </div>
          </div>
        </div>
        <div class="row">
          <div class="col-md-6">
            <div class="form-group">
              <label>Email *</label>
              <input type="email" id="createEmail" required>
            </div>
          </div>
          <div class="col-md-6">
            <div class="form-group">
              <label>Password *</label>
              <input type="password" id="createPassword" required minlength="8">
            </div>
          </div>
        </div>
        <div class="row">
          <div class="col-md-6">
            <div class="form-group">
              <label>Phone</label>
              <input type="text" id="createPhone">
            </div>
          </div>
          <div class="col-md-6">
            <div class="form-group">
              <label>Role</label>
              <select id="createRole">
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
        </div>
      </form>
    `;

    document.getElementById('userModalTitle').textContent = 'Create New User';
    document.getElementById('userModalFooter').innerHTML = `
      <button class="btn-secondary" onclick="AdminDashboard.closeUserModal()">Cancel</button>
      <button class="btn-primary" onclick="AdminDashboard.createUser()">Create User</button>
    `;
    document.getElementById('userModal').classList.add('active');
  }

  // Create User
  async function createUser() {
    const data = {
      first_name: document.getElementById('createFirstName').value,
      last_name: document.getElementById('createLastName').value,
      email: document.getElementById('createEmail').value,
      password: document.getElementById('createPassword').value,
      phone: document.getElementById('createPhone').value,
      role: document.getElementById('createRole').value
    };

    if (!data.first_name || !data.last_name || !data.email || !data.password) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    try {
      const response = await API.post('/admin/users', data);
      
      if (response.success) {
        showToast('User created successfully', 'success');
        closeUserModal();
        loadUsers();
      }
    } catch (error) {
      console.error('Failed to create user:', error);
      showToast(error.message || 'Failed to create user', 'error');
    }
  }

  // Close User Modal
  function closeUserModal() {
    document.getElementById('userModal').classList.remove('active');
  }

  // Show Toast
  function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <i class="bi bi-${type === 'success' ? 'check-circle' : type === 'error' ? 'x-circle' : 'exclamation-circle'}"></i>
      <span>${escapeHtml(message)}</span>
    `;
    container.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  // Utility Functions
  function formatNumber(num) {
    return num ? num.toLocaleString() : '0';
  }

  function formatCurrency(amount) {
    return '$' + (amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function formatDateShort(dateStr) {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function formatInvestmentType(type) {
    const types = {
      stocks: 'Stocks',
      bonds: 'Bonds',
      mutual_funds: 'Mutual Funds',
      fixed_deposit: 'Fixed Deposit',
      real_estate: 'Real Estate'
    };
    return types[type] || type;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '\x26amp;').replace(/</g, '\x26lt;').replace(/>/g, '\x26gt;').replace(/"/g, '\x26quot;');
  }

  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Public API
  return {
    init,
    showSection,
    changePage,
    viewUser,
    editUser,
    saveUser,
    deleteUser,
    showCreateUserModal,
    createUser,
    closeUserModal,
    showToast
  };
})();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  AdminDashboard.init();
});

// Make functions globally accessible for onclick handlers
window.AdminDashboard = AdminDashboard;