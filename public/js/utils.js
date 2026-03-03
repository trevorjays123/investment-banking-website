/**
 * Utility Functions Module
 * Comprehensive utility functions for the Apex Capital banking application
 */

const Utils = {
  // ============================================
  // CURRENCY FORMATTING
  // ============================================
  
  /**
   * Format a number as currency
   * @param {number} amount - The amount to format
   * @param {string} currency - Currency code (default: USD)
   * @param {string} locale - Locale string (default: en-US)
   * @returns {string} Formatted currency string
   */
  formatCurrency: function(amount, currency = 'USD', locale = 'en-US') {
    if (typeof amount !== 'number' || isNaN(amount)) {
      amount = 0;
    }
    
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  },

  /**
   * Format currency with compact notation for large numbers
   * @param {number} amount - The amount to format
   * @returns {string} Compact formatted string (e.g., $1.5K, $2.3M)
   */
  formatCurrencyCompact: function(amount) {
    if (typeof amount !== 'number' || isNaN(amount)) {
      return '$0';
    }

    const absAmount = Math.abs(amount);
    const sign = amount < 0 ? '-' : '';

    if (absAmount >= 1e9) {
      return sign + '$' + (absAmount / 1e9).toFixed(1) + 'B';
    } else if (absAmount >= 1e6) {
      return sign + '$' + (absAmount / 1e6).toFixed(1) + 'M';
    } else if (absAmount >= 1e3) {
      return sign + '$' + (absAmount / 1e3).toFixed(1) + 'K';
    }
    return sign + '$' + absAmount.toFixed(2);
  },

  /**
   * Parse currency string to number
   * @param {string} currencyString - Currency string to parse
   * @returns {number} Parsed number
   */
  parseCurrency: function(currencyString) {
    if (typeof currencyString === 'number') return currencyString;
    if (!currencyString) return 0;
    
    return parseFloat(currencyString.replace(/[^0-9.-]/g, ''));
  },

  // ============================================
  // DATE FORMATTING
  // ============================================

  /**
   * Format date to locale string
   * @param {string|Date} date - Date to format
   * @param {object} options - Intl.DateTimeFormat options
   * @returns {string} Formatted date string
   */
  formatDate: function(date, options = {}) {
    const defaultOptions = {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    };
    
    const d = date instanceof Date ? date : new Date(date);
    
    if (isNaN(d.getTime())) {
      return 'Invalid Date';
    }
    
    return d.toLocaleDateString('en-US', { ...defaultOptions, ...options });
  },

  /**
   * Format date with time
   * @param {string|Date} date - Date to format
   * @returns {string} Formatted date and time string
   */
  formatDateTime: function(date) {
    const d = date instanceof Date ? date : new Date(date);
    
    if (isNaN(d.getTime())) {
      return 'Invalid Date';
    }
    
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  /**
   * Format relative time (e.g., "2 hours ago")
   * @param {string|Date} date - Date to format
   * @returns {string} Relative time string
   */
  formatRelativeTime: function(date) {
    const d = date instanceof Date ? date : new Date(date);
    const now = new Date();
    const diffMs = now - d;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    const diffWeek = Math.floor(diffDay / 7);
    const diffMonth = Math.floor(diffDay / 30);
    const diffYear = Math.floor(diffDay / 365);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
    if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
    if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
    if (diffWeek < 4) return `${diffWeek} week${diffWeek > 1 ? 's' : ''} ago`;
    if (diffMonth < 12) return `${diffMonth} month${diffMonth > 1 ? 's' : ''} ago`;
    return `${diffYear} year${diffYear > 1 ? 's' : ''} ago`;
  },

  /**
   * Get ISO date string for API calls
   * @param {Date} date - Date object
   * @returns {string} ISO date string
   */
  toISOString: function(date) {
    const d = date instanceof Date ? date : new Date(date);
    return d.toISOString().split('T')[0];
  },

  /**
   * Get today's date as ISO string
   * @returns {string} Today's date in ISO format
   */
  getTodayISO: function() {
    return new Date().toISOString().split('T')[0];
  },

  // ============================================
  // ACCOUNT NUMBER FORMATTING
  // ============================================

  /**
   * Mask account number showing only last 4 digits
   * @param {string} accountNumber - Full account number
   * @returns {string} Masked account number
   */
  maskAccountNumber: function(accountNumber) {
    if (!accountNumber) return '****';
    const str = String(accountNumber);
    if (str.length <= 4) return str;
    return '*'.repeat(str.length - 4) + str.slice(-4);
  },

  /**
   * Format account number with dashes
   * @param {string} accountNumber - Account number
   * @returns {string} Formatted account number
   */
  formatAccountNumber: function(accountNumber) {
    if (!accountNumber) return '';
    const str = String(accountNumber).replace(/\D/g, '');
    if (str.length <= 4) return str;
    if (str.length <= 8) return str.slice(0, 4) + '-' + str.slice(4);
    return str.slice(0, 4) + '-' + str.slice(4, 8) + '-' + str.slice(8);
  },

  // ============================================
  // STRING UTILITIES
  // ============================================

  /**
   * Capitalize first letter of a string
   * @param {string} str - String to capitalize
   * @returns {string} Capitalized string
   */
  capitalize: function(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  },

  /**
   * Convert string to title case
   * @param {string} str - String to convert
   * @returns {string} Title case string
   */
  toTitleCase: function(str) {
    if (!str) return '';
    return str.replace(/\w\S*/g, (txt) => {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
  },

  /**
   * Truncate string with ellipsis
   * @param {string} str - String to truncate
   * @param {number} maxLength - Maximum length
   * @returns {string} Truncated string
   */
  truncate: function(str, maxLength = 50) {
    if (!str || str.length <= maxLength) return str;
    return str.slice(0, maxLength - 3) + '...';
  },

  /**
   * Generate random reference number
   * @param {string} prefix - Prefix for the reference
   * @returns {string} Reference number
   */
  generateReference: function(prefix = 'TXN') {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  },

  // ============================================
  // NUMBER UTILITIES
  // ============================================

  /**
   * Format number with commas
   * @param {number} num - Number to format
   * @param {number} decimals - Decimal places
   * @returns {string} Formatted number string
   */
  formatNumber: function(num, decimals = 2) {
    if (typeof num !== 'number' || isNaN(num)) return '0';
    return num.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  },

  /**
   * Round number to specified decimal places
   * @param {number} num - Number to round
   * @param {number} decimals - Decimal places
   * @returns {number} Rounded number
   */
  round: function(num, decimals = 2) {
    return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
  },

  /**
   * Clamp a number between min and max
   * @param {number} num - Number to clamp
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @returns {number} Clamped number
   */
  clamp: function(num, min, max) {
    return Math.min(Math.max(num, min), max);
  },

  // ============================================
  // VALIDATION UTILITIES
  // ============================================

  /**
   * Validate email address
   * @param {string} email - Email to validate
   * @returns {boolean} Is valid email
   */
  isValidEmail: function(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * Validate phone number
   * @param {string} phone - Phone to validate
   * @returns {boolean} Is valid phone
   */
  isValidPhone: function(phone) {
    const phoneRegex = /^\+?[\d\s-()]{10,}$/;
    return phoneRegex.test(phone);
  },

  /**
   * Validate password strength
   * @param {string} password - Password to validate
   * @returns {object} Validation result with strength score
   */
  validatePassword: function(password) {
    const result = {
      isValid: false,
      strength: 0,
      errors: [],
      suggestions: []
    };

    if (!password) {
      result.errors.push('Password is required');
      return result;
    }

    if (password.length < 8) {
      result.errors.push('Password must be at least 8 characters');
    } else {
      result.strength += 1;
    }

    if (password.length >= 12) {
      result.strength += 1;
    }

    if (/[a-z]/.test(password)) {
      result.strength += 1;
    } else {
      result.suggestions.push('Add lowercase letters');
    }

    if (/[A-Z]/.test(password)) {
      result.strength += 1;
    } else {
      result.suggestions.push('Add uppercase letters');
    }

    if (/[0-9]/.test(password)) {
      result.strength += 1;
    } else {
      result.suggestions.push('Add numbers');
    }

    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      result.strength += 1;
    } else {
      result.suggestions.push('Add special characters');
    }

    result.isValid = result.errors.length === 0 && result.strength >= 4;
    
    return result;
  },

  /**
   * Validate account number format
   * @param {string} accountNumber - Account number to validate
   * @returns {boolean} Is valid account number
   */
  isValidAccountNumber: function(accountNumber) {
    return /^\d{8,17}$/.test(String(accountNumber).replace(/\D/g, ''));
  },

  /**
   * Validate amount for transactions
   * @param {string|number} amount - Amount to validate
   * @param {number} minAmount - Minimum allowed amount
   * @param {number} maxAmount - Maximum allowed amount
   * @returns {object} Validation result
   */
  validateAmount: function(amount, minAmount = 0.01, maxAmount = 1000000) {
    const result = {
      isValid: false,
      error: null,
      value: null
    };

    const numAmount = parseFloat(amount);

    if (isNaN(numAmount)) {
      result.error = 'Please enter a valid amount';
      return result;
    }

    if (numAmount < minAmount) {
      result.error = `Minimum amount is ${this.formatCurrency(minAmount)}`;
      return result;
    }

    if (numAmount > maxAmount) {
      result.error = `Maximum amount is ${this.formatCurrency(maxAmount)}`;
      return result;
    }

    result.isValid = true;
    result.value = this.round(numAmount);
    return result;
  },

  // ============================================
  // DOM UTILITIES
  // ============================================

  /**
   * Debounce function execution
   * @param {function} func - Function to debounce
   * @param {number} wait - Wait time in ms
   * @returns {function} Debounced function
   */
  debounce: function(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  /**
   * Throttle function execution
   * @param {function} func - Function to throttle
   * @param {number} limit - Time limit in ms
   * @returns {function} Throttled function
   */
  throttle: function(func, limit = 300) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  /**
   * Create element with attributes
   * @param {string} tag - HTML tag name
   * @param {object} attrs - Element attributes
   * @param {string} innerHTML - Inner HTML content
   * @returns {HTMLElement} Created element
   */
  createElement: function(tag, attrs = {}, innerHTML = '') {
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([key, value]) => {
      if (key === 'className') {
        el.className = value;
      } else if (key === 'dataset') {
        Object.entries(value).forEach(([dataKey, dataValue]) => {
          el.dataset[dataKey] = dataValue;
        });
      } else if (key.startsWith('on') && typeof value === 'function') {
        el.addEventListener(key.slice(2).toLowerCase(), value);
      } else {
        el.setAttribute(key, value);
      }
    });
    if (innerHTML) el.innerHTML = innerHTML;
    return el;
  },

  /**
   * Safely get element by ID
   * @param {string} id - Element ID
   * @returns {HTMLElement|null} Element or null
   */
  getElementById: function(id) {
    return document.getElementById(id);
  },

  /**
   * Query selector with error handling
   * @param {string} selector - CSS selector
   * @param {HTMLElement} parent - Parent element
   * @returns {HTMLElement|null} Element or null
   */
  $(selector, parent = document) {
    return parent.querySelector(selector);
  },

  /**
   * Query selector all with error handling
   * @param {string} selector - CSS selector
   * @param {HTMLElement} parent - Parent element
   * @returns {NodeList} NodeList of elements
   */
  $$(selector, parent = document) {
    return parent.querySelectorAll(selector);
  },

  // ============================================
  // STORAGE UTILITIES
  // ============================================

  /**
   * Safely get item from localStorage
   * @param {string} key - Storage key
   * @param {*} defaultValue - Default value if not found
   * @returns {*} Stored value or default
   */
  getStorageItem: function(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  },

  /**
   * Safely set item in localStorage
   * @param {string} key - Storage key
   * @param {*} value - Value to store
   * @returns {boolean} Success status
   */
  setStorageItem: function(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Remove item from localStorage
   * @param {string} key - Storage key
   */
  removeStorageItem: function(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore errors
    }
  },

  // ============================================
  // COLOR UTILITIES
  // ============================================

  /**
   * Get status color class
   * @param {string} status - Status string
   * @returns {object} Background and text color classes
   */
  getStatusColors: function(status) {
    const statusMap = {
      active: { bg: 'bg-green-100', text: 'text-green-800' },
      completed: { bg: 'bg-green-100', text: 'text-green-800' },
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
      frozen: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
      inactive: { bg: 'bg-gray-100', text: 'text-gray-800' },
      closed: { bg: 'bg-red-100', text: 'text-red-800' },
      failed: { bg: 'bg-red-100', text: 'text-red-800' },
      reversed: { bg: 'bg-gray-100', text: 'text-gray-800' },
      user: { bg: 'bg-blue-100', text: 'text-blue-800' },
      admin: { bg: 'bg-purple-100', text: 'text-purple-800' }
    };
    return statusMap[status?.toLowerCase()] || { bg: 'bg-gray-100', text: 'text-gray-800' };
  },

  /**
   * Get transaction type icon
   * @param {string} type - Transaction type
   * @returns {string} Font Awesome icon class
   */
  getTransactionIcon: function(type) {
    const iconMap = {
      transfer: 'fas fa-exchange-alt',
      deposit: 'fas fa-arrow-down',
      withdrawal: 'fas fa-arrow-up',
      payment: 'fas fa-file-invoice-dollar',
      bill: 'fas fa-file-invoice',
      refund: 'fas fa-undo'
    };
    return iconMap[type?.toLowerCase()] || 'fas fa-money-bill';
  },

  /**
   * Get account type icon
   * @param {string} type - Account type
   * @returns {string} Font Awesome icon class
   */
  getAccountIcon: function(type) {
    const iconMap = {
      checking: 'fas fa-wallet',
      savings: 'fas fa-piggy-bank',
      credit: 'fas fa-credit-card',
      investment: 'fas fa-chart-line',
      loan: 'fas fa-hand-holding-usd'
    };
    return iconMap[type?.toLowerCase()] || 'fas fa-university';
  },

  // ============================================
  // COPY UTILITIES
  // ============================================

  /**
   * Copy text to clipboard
   * @param {string} text - Text to copy
   * @returns {Promise<boolean>} Success status
   */
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      return success;
    }
  },

  // ============================================
  // URL UTILITIES
  // ============================================

  /**
   * Get query parameters from URL
   * @param {string} url - URL string (optional, defaults to current URL)
   * @returns {object} Query parameters object
   */
  getQueryParams: function(url = window.location.href) {
    const params = {};
    const searchParams = new URL(url, window.location.origin).searchParams;
    for (const [key, value] of searchParams) {
      params[key] = value;
    }
    return params;
  },

  /**
   * Build query string from object
   * @param {object} params - Parameters object
   * @returns {string} Query string
   */
  buildQueryString: function(params) {
    return Object.entries(params)
      .filter(([, value]) => value !== null && value !== undefined && value !== '')
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Utils;
}

// Make available globally
window.Utils = Utils;