/**
 * API Service Module
 * Enhanced API layer with caching, error handling, retry logic, and request interceptors
 */

const ApiService = {
  // Configuration
  config: {
    baseURL: '/api',
    timeout: 30000,
    maxRetries: 3,
    retryDelay: 1000,
    cacheEnabled: true,
    cacheTTL: 5 * 60 * 1000, // 5 minutes
  },

  // Cache storage
  cache: new Map(),

  // Request queue for deduplication
  pendingRequests: new Map(),

  // Interceptors
  interceptors: {
    request: [],
    response: [],
    error: []
  },

  // Online status
  isOnline: navigator.onLine,

  // ============================================
  // INITIALIZATION
  // ============================================

  /**
   * Initialize the API service
   * @param {object} options - Configuration options
   */
  init: function(options = {}) {
    this.config = { ...this.config, ...options };
    
    // Clear cache periodically
    setInterval(() => this.clearExpiredCache(), 60000);
    
    // Setup online/offline listeners
    window.addEventListener('online', () => this.onOnline());
    window.addEventListener('offline', () => this.onOffline());
    
    console.log('[ApiService] Initialized');
  },

  // ============================================
  // AUTHENTICATION
  // ============================================

  /**
   * Get authentication token
   * @returns {string|null} Auth token
   */
  getToken: function() {
    return localStorage.getItem('token');
  },

  /**
   * Set authentication token
   * @param {string} token - Auth token
   */
  setToken: function(token) {
    localStorage.setItem('token', token);
  },

  /**
   * Remove authentication token and clear user data
   */
  removeToken: function() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('accounts');
    this.clearCache();
  },

  /**
   * Get current user data
   * @returns {object|null} User object
   */
  getUser: function() {
    try {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    } catch {
      return null;
    }
  },

  /**
   * Set user data
   * @param {object} user - User object
   */
  setUser: function(user) {
    localStorage.setItem('user', JSON.stringify(user));
  },

  /**
   * Get cached accounts
   * @returns {array|null} Accounts array
   */
  getAccounts: function() {
    try {
      const accounts = localStorage.getItem('accounts');
      return accounts ? JSON.parse(accounts) : null;
    } catch {
      return null;
    }
  },

  /**
   * Cache accounts data
   * @param {array} accounts - Accounts array
   */
  setAccounts: function(accounts) {
    localStorage.setItem('accounts', JSON.stringify(accounts));
  },

  // ============================================
  // HEADERS
  // ============================================

  /**
   * Build request headers
   * @param {object} customHeaders - Additional headers
   * @returns {object} Headers object
   */
  getHeaders: function(customHeaders = {}) {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return { ...headers, ...customHeaders };
  },

  // ============================================
  // CACHING
  // ============================================

  /**
   * Generate cache key
   * @param {string} endpoint - API endpoint
   * @param {object} options - Request options
   * @returns {string} Cache key
   */
  getCacheKey: function(endpoint, options = {}) {
    const method = options.method || 'GET';
    const body = options.body ? JSON.stringify(options.body) : '';
    return `${method}:${endpoint}:${body}`;
  },

  /**
   * Get cached response
   * @param {string} key - Cache key
   * @returns {object|null} Cached response
   */
  getCached: function(key) {
    if (!this.config.cacheEnabled) return null;

    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() > cached.expiry) {
      this.cache.delete(key);
      return null;
    }

    console.log('[ApiService] Cache hit:', key);
    return cached.data;
  },

  /**
   * Set cache entry
   * @param {string} key - Cache key
   * @param {*} data - Data to cache
   * @param {number} ttl - Time to live in ms
   */
  setCached: function(key, data, ttl = this.config.cacheTTL) {
    if (!this.config.cacheEnabled) return;

    this.cache.set(key, {
      data: data,
      expiry: Date.now() + ttl
    });
  },

  /**
   * Clear all cache
   */
  clearCache: function() {
    this.cache.clear();
    console.log('[ApiService] Cache cleared');
  },

  /**
   * Clear expired cache entries
   */
  clearExpiredCache: function() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now > value.expiry) {
        this.cache.delete(key);
      }
    }
  },

  /**
   * Invalidate cache for specific pattern
   * @param {string} pattern - Pattern to match
   */
  invalidateCache: function(pattern) {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  },

  // ============================================
  // REQUEST METHODS
  // ============================================

  /**
   * Make HTTP request with error handling and retry
   * @param {string} endpoint - API endpoint
   * @param {object} options - Fetch options
   * @returns {Promise} Response data
   */
  request: async function(endpoint, options = {}) {
    const url = this.config.baseURL + endpoint;
    const cacheKey = this.getCacheKey(endpoint, options);

    // Check cache for GET requests
    if ((!options.method || options.method === 'GET') && !options.skipCache) {
      const cached = this.getCached(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Deduplicate pending requests
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey);
    }

    const requestPromise = this._executeRequest(url, endpoint, options, cacheKey);
    this.pendingRequests.set(cacheKey, requestPromise);

    try {
      const result = await requestPromise;
      return result;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  },

  /**
   * Execute the actual HTTP request
   * @private
   */
  _executeRequest: async function(url, endpoint, options, cacheKey) {
    const config = {
      headers: this.getHeaders(options.headers),
      ...options
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    let lastError;
    const retries = options.retries ?? this.config.maxRetries;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
        config.signal = controller.signal;

        const response = await fetch(url, config);
        clearTimeout(timeoutId);

        const data = await this._parseResponse(response);

        if (!response.ok) {
          throw this._createError(data, response.status);
        }

        // Cache successful GET requests
        if ((!options.method || options.method === 'GET')) {
          this.setCached(cacheKey, data);
        }

        return data;
      } catch (error) {
        lastError = error;

        // Don't retry on certain errors
        if (error.status === 401 || error.status === 403 || error.status === 404) {
          throw error;
        }

        // Handle offline
        if (!this.isOnline) {
          throw new Error('You are offline. Please check your connection.');
        }

        // Retry with delay
        if (attempt < retries) {
          const delay = this.config.retryDelay * Math.pow(2, attempt);
          console.log(`[ApiService] Retry ${attempt + 1}/${retries} after ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  },

  /**
   * Parse response based on content type
   * @private
   */
  _parseResponse: async function(response) {
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    
    return await response.text();
  },

  /**
   * Create structured error object
   * @private
   */
  _createError: function(data, status) {
    const error = new Error(data.error || data.message || 'Request failed');
    error.status = status;
    error.data = data;
    error.code = data.code;

    // Handle 401 Unauthorized
    if (status === 401) {
      this.removeToken();
      window.dispatchEvent(new CustomEvent('unauthorized'));
    }

    return error;
  },

  // ============================================
  // ONLINE/OFFLINE HANDLING
  // ============================================

  onOnline: function() {
    this.isOnline = true;
    console.log('[ApiService] Back online');
    window.dispatchEvent(new CustomEvent('connectionRestored'));
  },

  onOffline: function() {
    this.isOnline = false;
    console.log('[ApiService] Gone offline');
    window.dispatchEvent(new CustomEvent('connectionLost'));
  },

  // ============================================
  // CONVENIENCE METHODS
  // ============================================

  /**
   * GET request
   * @param {string} endpoint - API endpoint
   * @param {object} options - Additional options
   * @returns {Promise} Response data
   */
  get: function(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  },

  /**
   * POST request
   * @param {string} endpoint - API endpoint
   * @param {object} body - Request body
   * @param {object} options - Additional options
   * @returns {Promise} Response data
   */
  post: function(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'POST', body });
  },

  /**
   * PUT request
   * @param {string} endpoint - API endpoint
   * @param {object} body - Request body
   * @param {object} options - Additional options
   * @returns {Promise} Response data
   */
  put: function(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'PUT', body });
  },

  /**
   * PATCH request
   * @param {string} endpoint - API endpoint
   * @param {object} body - Request body
   * @param {object} options - Additional options
   * @returns {Promise} Response data
   */
  patch: function(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'PATCH', body });
  },

  /**
   * DELETE request
   * @param {string} endpoint - API endpoint
   * @param {object} body - Request body (optional)
   * @param {object} options - Additional options
   * @returns {Promise} Response data
   */
  delete: function(endpoint, body = null, options = {}) {
    const config = { ...options, method: 'DELETE' };
    if (body) {
      config.body = body;
    }
    return this.request(endpoint, config);
  },

  // ============================================
  // SPECIALIZED API METHODS
  // ============================================

  // Account endpoints
  accounts: {
    getAll: function() {
      return ApiService.get('/accounts');
    },
    getById: function(id) {
      return ApiService.get(`/accounts/${id}`);
    },
    getTransactions: function(id, params = {}) {
      const query = new URLSearchParams(params).toString();
      return ApiService.get(`/accounts/${id}/transactions${query ? '?' + query : ''}`);
    }
  },

  // Transaction endpoints
  transactions: {
    getAll: function(params = {}) {
      const query = new URLSearchParams(params).toString();
      return ApiService.get(`/transactions${query ? '?' + query : ''}`);
    },
    transfer: function(data) {
      return ApiService.post('/transactions/transfer', data);
    },
    deposit: function(data) {
      return ApiService.post('/transactions/deposit', data);
    },
    withdraw: function(data) {
      return ApiService.post('/transactions/withdraw', data);
    }
  },

  // Bill payment endpoints
  bills: {
    getPayees: function() {
      return ApiService.get('/bills/payees');
    },
    addPayee: function(data) {
      return ApiService.post('/bills/payees', data);
    },
    getPayments: function() {
      return ApiService.get('/bills/payments');
    },
    schedulePayment: function(data) {
      return ApiService.post('/bills/payments', data);
    }
  },

  // Profile endpoints
  profile: {
    get: function() {
      return ApiService.get('/profile');
    },
    update: function(data) {
      return ApiService.put('/profile', data);
    },
    changePassword: function(data) {
      return ApiService.put('/profile/password', data);
    }
  },

  // Auth endpoints
  auth: {
    login: function(credentials) {
      return ApiService.post('/auth/login', credentials);
    },
    register: function(data) {
      return ApiService.post('/auth/register', data);
    },
    logout: function() {
      return ApiService.post('/auth/logout');
    },
    verify2FA: function(tempToken, code) {
      return ApiService.post('/auth/verify-2fa', { temp_token: tempToken, code });
    }
  }
};

// Initialize on load
if (typeof window !== 'undefined') {
  window.ApiService = ApiService;
}