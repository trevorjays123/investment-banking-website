// Authentication Module
const Auth = {
  isAuthenticated: function() {
    return !!API.getToken();
  },

  login: async function(email, password) {
    try {
      const data = await API.post('/auth/login', { email, password });
      
      if (data.requires_2fa) {
        return { requires_2fa: true, temp_token: data.temp_token };
      }

      if (data.token) {
        API.setToken(data.token);
        API.setUser(data.user);
        API.setAccounts(data.accounts);
        return { success: true, isAdmin: data.isAdmin };
      }

      return { success: false, error: 'Login failed' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  verify2FA: async function(tempToken, code) {
    try {
      const data = await API.post('/auth/verify-2fa', { 
        temp_token: tempToken, 
        code: code 
      });

      if (data.token) {
        API.setToken(data.token);
        API.setUser(data.user);
        API.setAccounts(data.accounts);
        return { success: true, isAdmin: data.isAdmin };
      }

      return { success: false, error: '2FA verification failed' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  register: async function(userData) {
    try {
      const data = await API.post('/auth/register', userData);
      return { success: true, message: data.message };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  logout: function() {
    API.removeToken();
    window.location.href = '/';
  },

  getCurrentUser: function() {
    return API.getUser();
  },

  isAdmin: function() {
    const user = API.getUser();
    return user && user.role === 'admin';
  }
};
