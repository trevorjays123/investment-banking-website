/**
 * UI Components Module
 * Reusable UI components with loading states, error boundaries, and animations
 */

const Components = {
  // ============================================
  // LOADING STATES
  // ============================================

  /**
   * Show loading spinner
   * @param {HTMLElement} container - Container element
   * @param {string} message - Loading message
   */
  showLoading: function(container, message = 'Loading...') {
    const loader = document.createElement('div');
    loader.className = 'loading-overlay';
    loader.innerHTML = `
      <div class="loading-spinner">
        <div class="spinner"></div>
        <p class="loading-message">${message}</p>
      </div>
    `;
    
    // Ensure container has relative position
    if (getComputedStyle(container).position === 'static') {
      container.style.position = 'relative';
    }
    
    container.appendChild(loader);
  },

  /**
   * Hide loading spinner
   * @param {HTMLElement} container - Container element
   */
  hideLoading: function(container) {
    const loader = container.querySelector('.loading-overlay');
    if (loader) {
      loader.remove();
    }
  },

  /**
   * Show button loading state
   * @param {HTMLElement} button - Button element
   * @param {string} loadingText - Loading text
   */
  setButtonLoading: function(button, loadingText = 'Processing...') {
    button.dataset.originalText = button.innerHTML;
    button.disabled = true;
    button.innerHTML = `
      <span class="btn-spinner"></span>
      <span>${loadingText}</span>
    `;
    button.classList.add('btn-loading');
  },

  /**
   * Reset button from loading state
   * @param {HTMLElement} button - Button element
   */
  resetButton: function(button) {
    button.disabled = false;
    button.innerHTML = button.dataset.originalText || 'Submit';
    button.classList.remove('btn-loading');
  },

  /**
   * Create skeleton loader
   * @param {string} type - Skeleton type (card, text, avatar, list)
   * @param {object} options - Options
   * @returns {string} HTML string
   */
  skeleton: function(type = 'text', options = {}) {
    const skeletons = {
      card: () => `
        <div class="skeleton-card animate-pulse">
          <div class="skeleton-header bg-gray-700 h-4 w-3/4 rounded mb-4"></div>
          <div class="skeleton-body bg-gray-700 h-8 w-full rounded mb-2"></div>
          <div class="skeleton-footer bg-gray-700 h-3 w-1/2 rounded"></div>
        </div>
      `,
      text: () => `
        <div class="skeleton-text animate-pulse">
          <div class="bg-gray-700 h-4 w-full rounded mb-2"></div>
          <div class="bg-gray-700 h-4 w-5/6 rounded mb-2"></div>
          <div class="bg-gray-700 h-4 w-4/6 rounded"></div>
        </div>
      `,
      avatar: () => `
        <div class="skeleton-avatar animate-pulse flex items-center gap-3">
          <div class="bg-gray-700 h-12 w-12 rounded-full"></div>
          <div class="flex-1">
            <div class="bg-gray-700 h-4 w-24 rounded mb-2"></div>
            <div class="bg-gray-700 h-3 w-32 rounded"></div>
          </div>
        </div>
      `,
      list: () => `
        <div class="skeleton-list space-y-3">
          ${Array(options.count || 3).fill(`
            <div class="animate-pulse flex items-center gap-3 p-3">
              <div class="bg-gray-700 h-10 w-10 rounded-full"></div>
              <div class="flex-1">
                <div class="bg-gray-700 h-4 w-3/4 rounded mb-2"></div>
                <div class="bg-gray-700 h-3 w-1/2 rounded"></div>
              </div>
              <div class="bg-gray-700 h-6 w-16 rounded"></div>
            </div>
          `).join('')}
        </div>
      `,
      transaction: () => `
        <div class="skeleton-transaction animate-pulse flex items-center justify-between p-4 border-b border-gray-700">
          <div class="flex items-center gap-3">
            <div class="bg-gray-700 h-10 w-10 rounded-full"></div>
            <div>
              <div class="bg-gray-700 h-4 w-32 rounded mb-2"></div>
              <div class="bg-gray-700 h-3 w-24 rounded"></div>
            </div>
          </div>
          <div class="bg-gray-700 h-5 w-20 rounded"></div>
        </div>
      `
    };

    return skeletons[type] ? skeletons[type]() : skeletons.text();
  },

  // ============================================
  // ERROR BOUNDARIES
  // ============================================

  /**
   * Show error state
   * @param {HTMLElement} container - Container element
   * @param {Error|string} error - Error object or message
   * @param {function} retryCallback - Retry callback function
   */
  showError: function(container, error, retryCallback = null) {
    const message = error?.message || error || 'An error occurred';
    const isOffline = !navigator.onLine;
    
    container.innerHTML = `
      <div class="error-state text-center py-12">
        <div class="error-icon text-6xl mb-4">
          <i class="fas ${isOffline ? 'fa-wifi' : 'fa-exclamation-circle'} text-red-500"></i>
        </div>
        <h3 class="text-xl font-semibold text-white mb-2">
          ${isOffline ? 'You\'re Offline' : 'Something went wrong'}
        </h3>
        <p class="text-gray-400 mb-6">${message}</p>
        ${retryCallback ? `
          <button class="btn-retry bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors">
            <i class="fas fa-redo mr-2"></i>Try Again
          </button>
        ` : ''}
      </div>
    `;

    if (retryCallback) {
      container.querySelector('.btn-retry')?.addEventListener('click', retryCallback);
    }
  },

  /**
   * Show empty state
   * @param {HTMLElement} container - Container element
   * @param {string} message - Empty state message
   * @param {string} icon - Icon class
   * @param {string} actionText - Action button text
   * @param {function} actionCallback - Action callback
   */
  showEmpty: function(container, message, icon = 'fa-inbox', actionText = null, actionCallback = null) {
    container.innerHTML = `
      <div class="empty-state text-center py-12">
        <div class="empty-icon text-6xl mb-4">
          <i class="fas ${icon} text-gray-500"></i>
        </div>
        <p class="text-gray-400 mb-4">${message}</p>
        ${actionText && actionCallback ? `
          <button class="btn-action bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors">
            ${actionText}
          </button>
        ` : ''}
      </div>
    `;

    if (actionText && actionCallback) {
      container.querySelector('.btn-action')?.addEventListener('click', actionCallback);
    }
  },

  // ============================================
  // TOAST NOTIFICATIONS
  // ============================================

  toastContainer: null,

  /**
   * Initialize toast container
   */
  initToastContainer: function() {
    if (!this.toastContainer) {
      this.toastContainer = document.createElement('div');
      this.toastContainer.id = 'toast-container';
      this.toastContainer.className = 'fixed bottom-4 right-4 z-50 flex flex-col gap-2';
      document.body.appendChild(this.toastContainer);
    }
  },

  /**
   * Show toast notification
   * @param {string} message - Toast message
   * @param {string} type - Toast type (success, error, warning, info)
   * @param {number} duration - Duration in ms
   */
  toast: function(message, type = 'info', duration = 5000) {
    this.initToastContainer();

    const icons = {
      success: 'fa-check-circle',
      error: 'fa-times-circle',
      warning: 'fa-exclamation-triangle',
      info: 'fa-info-circle'
    };

    const colors = {
      success: 'bg-green-600',
      error: 'bg-red-600',
      warning: 'bg-yellow-600',
      info: 'bg-blue-600'
    };

    const toast = document.createElement('div');
    toast.className = `toast-notification ${colors[type]} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-64 animate-slide-in`;
    toast.innerHTML = `
      <i class="fas ${icons[type]} text-lg"></i>
      <span class="flex-1">${message}</span>
      <button class="toast-close text-white opacity-70 hover:opacity-100 ml-2">
        <i class="fas fa-times"></i>
      </button>
    `;

    toast.querySelector('.toast-close').addEventListener('click', () => {
      this.dismissToast(toast);
    });

    this.toastContainer.appendChild(toast);

    if (duration > 0) {
      setTimeout(() => this.dismissToast(toast), duration);
    }

    return toast;
  },

  /**
   * Dismiss toast notification
   * @param {HTMLElement} toast - Toast element
   */
  dismissToast: function(toast) {
    toast.classList.add('animate-slide-out');
    setTimeout(() => toast.remove(), 300);
  },

  // ============================================
  // MODALS
  // ============================================

  activeModal: null,

  /**
   * Show modal
   * @param {object} options - Modal options
   * @returns {HTMLElement} Modal element
   */
  showModal: function(options) {
    const {
      title = '',
      content = '',
      size = 'md', // sm, md, lg, xl
      closable = true,
      onClose = null,
      footer = null
    } = options;

    // Close any existing modal
    this.closeModal();

    const sizeClasses = {
      sm: 'max-w-sm',
      md: 'max-w-md',
      lg: 'max-w-lg',
      xl: 'max-w-xl'
    };

    const modal = document.createElement('div');
    modal.className = 'modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4';
    modal.innerHTML = `
      <div class="modal-backdrop absolute inset-0 bg-black bg-opacity-60"></div>
      <div class="modal-content relative bg-gray-800 rounded-xl shadow-2xl w-full ${sizeClasses[size]} max-h-[90vh] overflow-hidden">
        ${title ? `
          <div class="modal-header flex items-center justify-between p-4 border-b border-gray-700">
            <h3 class="text-lg font-semibold text-white">${title}</h3>
            ${closable ? `
              <button class="modal-close text-gray-400 hover:text-white transition-colors">
                <i class="fas fa-times"></i>
              </button>
            ` : ''}
          </div>
        ` : ''}
        <div class="modal-body p-4 overflow-y-auto max-h-[60vh]">
          ${content}
        </div>
        ${footer ? `
          <div class="modal-footer p-4 border-t border-gray-700 flex justify-end gap-3">
            ${footer}
          </div>
        ` : ''}
      </div>
    `;

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    this.activeModal = modal;

    // Handle close
    if (closable) {
      const closeBtn = modal.querySelector('.modal-close');
      const backdrop = modal.querySelector('.modal-backdrop');
      
      const handleClose = () => {
        this.closeModal();
        if (onClose) onClose();
      };

      closeBtn?.addEventListener('click', handleClose);
      backdrop?.addEventListener('click', handleClose);
      
      // Escape key to close
      document.addEventListener('keydown', this.handleEscapeKey);
    }

    // Animate in
    requestAnimationFrame(() => {
      modal.classList.add('modal-visible');
    });

    return modal;
  },

  /**
   * Handle escape key press
   * @private
   */
  handleEscapeKey: function(e) {
    if (e.key === 'Escape' && Components.activeModal) {
      Components.closeModal();
    }
  },

  /**
   * Close modal
   */
  closeModal: function() {
    if (this.activeModal) {
      this.activeModal.classList.remove('modal-visible');
      setTimeout(() => {
        this.activeModal?.remove();
        this.activeModal = null;
        document.body.style.overflow = '';
      }, 200);
      document.removeEventListener('keydown', this.handleEscapeKey);
    }
  },

  /**
   * Show confirmation dialog
   * @param {object} options - Confirmation options
   * @returns {Promise} Resolves with true/false
   */
  confirm: function(options) {
    return new Promise((resolve) => {
      const {
        title = 'Confirm',
        message = 'Are you sure?',
        confirmText = 'Confirm',
        cancelText = 'Cancel',
        type = 'primary' // primary, danger
      } = options;

      const confirmBtnClass = type === 'danger' 
        ? 'bg-red-600 hover:bg-red-700' 
        : 'bg-blue-600 hover:bg-blue-700';

      const modal = this.showModal({
        title,
        content: `<p class="text-gray-300">${message}</p>`,
        closable: false,
        footer: `
          <button class="btn-cancel bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors">
            ${cancelText}
          </button>
          <button class="btn-confirm ${confirmBtnClass} text-white px-4 py-2 rounded-lg transition-colors">
            ${confirmText}
          </button>
        `
      });

      modal.querySelector('.btn-cancel').addEventListener('click', () => {
        this.closeModal();
        resolve(false);
      });

      modal.querySelector('.btn-confirm').addEventListener('click', () => {
        this.closeModal();
        resolve(true);
      });
    });
  },

  // ============================================
  // CARDS
  // ============================================

  /**
   * Render account card
   * @param {object} account - Account data
   * @returns {string} HTML string
   */
  accountCard: function(account) {
    const balance = parseFloat(account.balance);
    const isNegative = balance < 0;
    const icon = Utils.getAccountIcon(account.account_type);
    const colors = Utils.getStatusColors(account.status);

    return `
      <article class="account-card bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-5 border border-gray-700 card-hover transition-all duration-300" data-account-id="${account.id}">
        <header class="flex justify-between items-start mb-3">
          <div>
            <span class="text-xs text-gray-400 uppercase tracking-wide">${Utils.capitalize(account.account_type)}</span>
            <p class="font-mono text-sm text-gray-300 mt-1">${Utils.maskAccountNumber(account.account_number)}</p>
          </div>
          <div class="w-10 h-10 rounded-full bg-blue-600 bg-opacity-20 flex items-center justify-center">
            <i class="${icon} text-blue-400 text-lg"></i>
          </div>
        </header>
        <p class="text-2xl font-bold ${isNegative ? 'text-red-400' : 'text-white'}">
          ${Utils.formatCurrency(balance, account.currency)}
        </p>
        <footer class="mt-3 flex justify-between items-center">
          <span class="inline-flex items-center px-2 py-1 text-xs rounded-full ${colors.bg} ${colors.text}">
            <span class="w-1.5 h-1.5 rounded-full ${colors.text.replace('text-', 'bg-')} mr-1.5"></span>
            ${Utils.capitalize(account.status)}
          </span>
          <button class="text-blue-400 text-sm hover:text-blue-300 transition-colors" onclick="App.navigateTo('transactions')">
            View <i class="fas fa-arrow-right ml-1"></i>
          </button>
        </footer>
      </article>
    `;
  },

  /**
   * Render transaction item
   * @param {object} transaction - Transaction data
   * @returns {string} HTML string
   */
  transactionItem: function(transaction) {
    const isCredit = transaction.to_account_id && transaction.transaction_type !== 'withdrawal' && transaction.transaction_type !== 'payment';
    const amountClass = isCredit ? 'text-green-400' : 'text-red-400';
    const amountPrefix = isCredit ? '+' : '-';
    const icon = Utils.getTransactionIcon(transaction.transaction_type);
    const colors = Utils.getStatusColors(transaction.status);

    return `
      <article class="transaction-item flex items-center justify-between py-3 px-4 border-b border-gray-700 hover:bg-gray-800 transition-colors cursor-pointer" data-txn-id="${transaction.id}">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
            <i class="${icon} text-gray-400"></i>
          </div>
          <div>
            <p class="font-medium text-white">${transaction.description || Utils.capitalize(transaction.transaction_type)}</p>
            <p class="text-xs text-gray-400">
              <time datetime="${transaction.created_at}">${Utils.formatRelativeTime(transaction.created_at)}</time>
              ${transaction.reference_number ? `• ${transaction.reference_number}` : ''}
            </p>
          </div>
        </div>
        <div class="text-right">
          <p class="font-semibold ${amountClass}">
            ${amountPrefix}${Utils.formatCurrency(transaction.amount)}
          </p>
          <span class="text-xs px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}">
            ${Utils.capitalize(transaction.status)}
          </span>
        </div>
      </article>
    `;
  },

  /**
   * Render quick action button
   * @param {object} options - Button options
   * @returns {string} HTML string
   */
  quickActionButton: function(options) {
    const { icon, label, color = 'blue', onClick } = options;
    const colors = {
      blue: 'bg-blue-600 hover:bg-blue-700',
      green: 'bg-green-600 hover:bg-green-700',
      purple: 'bg-purple-600 hover:bg-purple-700',
      red: 'bg-red-600 hover:bg-red-700',
      gray: 'bg-gray-600 hover:bg-gray-700'
    };

    return `
      <button class="quick-action-btn ${colors[color]} text-white p-4 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 hover:scale-105" onclick="${onClick}">
        <i class="${icon} text-lg"></i>
        <span class="font-medium">${label}</span>
      </button>
    `;
  },

  // ============================================
  // FORM COMPONENTS
  // ============================================

  /**
   * Create form input group
   * @param {object} options - Input options
   * @returns {string} HTML string
   */
  formInput: function(options) {
    const {
      type = 'text',
      name,
      label,
      placeholder = '',
      value = '',
      required = false,
      icon = null,
      hint = null,
      disabled = false
    } = options;

    return `
      <div class="form-group mb-4">
        ${label ? `<label for="${name}" class="block text-sm font-medium text-gray-300 mb-1">${label}${required ? ' <span class="text-red-400">*</span>' : ''}</label>` : ''}
        <div class="relative">
          ${icon ? `<div class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><i class="${icon}"></i></div>` : ''}
          <input 
            type="${type}" 
            id="${name}" 
            name="${name}" 
            value="${value}"
            placeholder="${placeholder}"
            ${required ? 'required' : ''}
            ${disabled ? 'disabled' : ''}
            class="w-full px-4 py-3 ${icon ? 'pl-10' : ''} bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
        </div>
        ${hint ? `<p class="text-xs text-gray-400 mt-1">${hint}</p>` : ''}
      </div>
    `;
  },

  /**
   * Create form select group
   * @param {object} options - Select options
   * @returns {string} HTML string
   */
  formSelect: function(options) {
    const {
      name,
      label,
      options: selectOptions = [],
      placeholder = 'Select...',
      required = false,
      value = '',
      disabled = false
    } = options;

    return `
      <div class="form-group mb-4">
        ${label ? `<label for="${name}" class="block text-sm font-medium text-gray-300 mb-1">${label}${required ? ' <span class="text-red-400">*</span>' : ''}</label>` : ''}
        <select 
          id="${name}" 
          name="${name}"
          ${required ? 'required' : ''}
          ${disabled ? 'disabled' : ''}
          class="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="">${placeholder}</option>
          ${selectOptions.map(opt => `
            <option value="${opt.value}" ${opt.value === value ? 'selected' : ''}>${opt.label}</option>
          `).join('')}
        </select>
      </div>
    `;
  },

  // ============================================
  // PROGRESS INDICATORS
  // ============================================

  /**
   * Create progress bar
   * @param {number} value - Current value
   * @param {number} max - Maximum value
   * @param {string} label - Label text
   * @returns {string} HTML string
   */
  progressBar: function(value, max, label = '') {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));
    const colorClass = percentage >= 90 ? 'bg-red-500' : percentage >= 70 ? 'bg-yellow-500' : 'bg-green-500';

    return `
      <div class="progress-container">
        ${label ? `<div class="flex justify-between text-sm mb-1"><span class="text-gray-400">${label}</span><span class="text-white">${Utils.formatCurrency(value)} / ${Utils.formatCurrency(max)}</span></div>` : ''}
        <div class="progress-track h-2 bg-gray-700 rounded-full overflow-hidden">
          <div class="progress-bar h-full ${colorClass} rounded-full transition-all duration-500" style="width: ${percentage}%"></div>
        </div>
      </div>
    `;
  },

  /**
   * Create circular progress
   * @param {number} percentage - Percentage value
   * @param {string} label - Center label
   * @returns {string} HTML string
   */
  circularProgress: function(percentage, label = '') {
    const circumference = 2 * Math.PI * 45;
    const offset = circumference - (percentage / 100) * circumference;

    return `
      <div class="circular-progress relative inline-flex items-center justify-center">
        <svg class="w-24 h-24 -rotate-90">
          <circle cx="48" cy="48" r="45" stroke="#374151" stroke-width="6" fill="none" />
          <circle cx="48" cy="48" r="45" stroke="#3B82F6" stroke-width="6" fill="none" 
            stroke-linecap="round"
            stroke-dasharray="${circumference}"
            stroke-dashoffset="${offset}"
            class="transition-all duration-500"
          />
        </svg>
        <div class="absolute inset-0 flex items-center justify-center flex-col">
          <span class="text-2xl font-bold text-white">${percentage}%</span>
          ${label ? `<span class="text-xs text-gray-400">${label}</span>` : ''}
        </div>
      </div>
    `;
  }
};

// Initialize components
document.addEventListener('DOMContentLoaded', () => {
  Components.initToastContainer();
});

// Make available globally
if (typeof window !== 'undefined') {
  window.Components = Components;
}