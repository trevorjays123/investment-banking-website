// API Helper Module
const API = {
  baseURL: '/api',
  timeout: 15000, // 15 second default timeout

  getToken: function() {
    return localStorage.getItem('token');
  },

  setToken: function(token) {
    localStorage.setItem('token', token);
  },

  removeToken: function() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('accounts');
  },

  getUser: function() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  setUser: function(user) {
    localStorage.setItem('user', JSON.stringify(user));
  },

  getAccounts: function() {
    const accounts = localStorage.getItem('accounts');
    return accounts ? JSON.parse(accounts) : null;
  },

  setAccounts: function(accounts) {
    localStorage.setItem('accounts', JSON.stringify(accounts));
  },

  getHeaders: function() {
    const headers = {
      'Content-Type': 'application/json'
    };
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  },

  // Create abort controller with timeout
  createTimeoutController: function(timeoutMs) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs || this.timeout);
    return { controller, timeoutId };
  },

  request: async function(endpoint, options = {}) {
    const url = this.baseURL + endpoint;
    const timeout = options.timeout || this.timeout;
    
    // Create timeout controller
    const { controller, timeoutId } = this.createTimeoutController(timeout);
    
    const config = {
      headers: this.getHeaders(),
      signal: controller.signal,
      ...options
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);
      clearTimeout(timeoutId);
      
      // Handle non-JSON responses
      const contentType = response.headers.get('content-type');
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        try {
          data = JSON.parse(text);
        } catch (e) {
          data = { error: text || 'Unknown error' };
        }
      }

      if (!response.ok) {
        // Handle authentication errors
        if (response.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('accounts');
          window.location.href = '/';
          throw new Error('Session expired. Please log in again.');
        }
        if (response.status === 403) {
          throw new Error('Access denied. Please check your permissions.');
        }
        if (response.status === 404) {
          throw new Error('Resource not found.');
        }
        if (response.status >= 500) {
          throw new Error('Server error. Please try again later.');
        }
        throw new Error(data.error || data.message || 'Request failed');
      }

      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      
      // Handle timeout/abort errors
      if (error.name === 'AbortError') {
        console.error('API Timeout:', endpoint);
        throw new Error('Request timed out. Please check your connection and try again.');
      }
      
      // Handle network errors
      if (error.message === 'Failed to fetch' || error.message === 'NetworkError') {
        console.error('Network Error:', error);
        throw new Error('Network error. Please check your connection.');
      }
      
      console.error('API Error:', error);
      throw error;
    }
  },

  get: function(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  },

  post: function(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'POST', body });
  },

  put: function(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'PUT', body });
  },

  delete: function(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE', body });
  },
  
  // Health check method
  healthCheck: async function() {
    try {
      const response = await fetch('/api/health', {
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }
};
