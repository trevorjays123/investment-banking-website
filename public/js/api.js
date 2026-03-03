// API Helper Module
const API = {
  baseURL: '/api',

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

  request: async function(endpoint, options = {}) {
    const url = this.baseURL + endpoint;
    const config = {
      headers: this.getHeaders(),
      ...options
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  get: function(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  },

  post: function(endpoint, body) {
    return this.request(endpoint, { method: 'POST', body });
  },

  put: function(endpoint, body) {
    return this.request(endpoint, { method: 'PUT', body });
  },

  delete: function(endpoint, body) {
    return this.request(endpoint, { method: 'DELETE', body });
  }
};
