/**
 * Form Validation Module
 * Comprehensive form validation for the Apex Capital banking application
 */

const Validation = {
  // Validation rules
  rules: {
    required: {
      test: (value) => value !== null && value !== undefined && String(value).trim() !== '',
      message: 'This field is required'
    },
    email: {
      test: (value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      message: 'Please enter a valid email address'
    },
    phone: {
      test: (value) => !value || /^\+?[\d\s-()]{10,}$/.test(value),
      message: 'Please enter a valid phone number'
    },
    minLength: {
      test: (value, param) => !value || String(value).length >= param,
      message: (param) => `Must be at least ${param} characters`
    },
    maxLength: {
      test: (value, param) => !value || String(value).length <= param,
      message: (param) => `Must be no more than ${param} characters`
    },
    min: {
      test: (value, param) => !value || parseFloat(value) >= param,
      message: (param) => `Must be at least ${param}`
    },
    max: {
      test: (value, param) => !value || parseFloat(value) <= param,
      message: (param) => `Must be no more than ${param}`
    },
    pattern: {
      test: (value, param) => !value || new RegExp(param).test(value),
      message: 'Invalid format'
    },
    match: {
      test: (value, param, formData) => value === formData[param],
      message: (param) => `Must match ${param}`
    },
    accountNumber: {
      test: (value) => !value || /^\d{8,17}$/.test(String(value).replace(/\D/g, '')),
      message: 'Please enter a valid account number (8-17 digits)'
    },
    routingNumber: {
      test: (value) => !value || /^\d{9}$/.test(String(value).replace(/\D/g, '')),
      message: 'Please enter a valid 9-digit routing number'
    },
    amount: {
      test: (value) => !value || /^\d+(\.\d{1,2})?$/.test(String(value)),
      message: 'Please enter a valid amount'
    },
    password: {
      test: (value) => !value || value.length >= 8,
      message: 'Password must be at least 8 characters'
    },
    passwordStrength: {
      test: (value) => {
        if (!value) return true;
        const hasLower = /[a-z]/.test(value);
        const hasUpper = /[A-Z]/.test(value);
        const hasNumber = /[0-9]/.test(value);
        const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(value);
        return hasLower && hasUpper && hasNumber && hasSpecial;
      },
      message: 'Password must include uppercase, lowercase, number, and special character'
    }
  },

  // Custom error messages for fields
  customMessages: {},

  /**
   * Set custom error message for a field
   * @param {string} field - Field name
   * @param {string} rule - Rule name
   * @param {string} message - Custom message
   */
  setCustomMessage: function(field, rule, message) {
    if (!this.customMessages[field]) {
      this.customMessages[field] = {};
    }
    this.customMessages[field][rule] = message;
  },

  /**
   * Validate a single field
   * @param {string} fieldName - Field name
   * @param {*} value - Field value
   * @param {array|string} rules - Validation rules
   * @param {object} formData - All form data (for match validation)
   * @returns {object} Validation result
   */
  validateField: function(fieldName, value, rules, formData = {}) {
    const errors = [];
    
    if (typeof rules === 'string') {
      rules = rules.split('|');
    }

    for (const rule of rules) {
      let ruleName = rule;
      let ruleParam = null;

      // Parse rule with parameter (e.g., minLength:8)
      if (rule.includes(':')) {
        const parts = rule.split(':');
        ruleName = parts[0];
        ruleParam = parts[1];
        
        // Convert numeric params
        if (!isNaN(ruleParam)) {
          ruleParam = parseFloat(ruleParam);
        }
      }

      const validationRule = this.rules[ruleName];
      if (!validationRule) continue;

      // Check custom message first
      const customMsg = this.customMessages[fieldName]?.[ruleName];
      
      if (!validationRule.test(value, ruleParam, formData)) {
        const message = customMsg || 
          (typeof validationRule.message === 'function' 
            ? validationRule.message(ruleParam) 
            : validationRule.message);
        errors.push(message);
      }
    }

    return {
      isValid: errors.length === 0,
      errors: errors,
      field: fieldName,
      value: value
    };
  },

  /**
   * Validate an entire form
   * @param {object} formData - Form data object
   * @param {object} schema - Validation schema
   * @returns {object} Validation result
   */
  validateForm: function(formData, schema) {
    const results = {};
    const errors = {};
    let isValid = true;

    for (const [field, rules] of Object.entries(schema)) {
      const value = formData[field];
      const result = this.validateField(field, value, rules, formData);
      results[field] = result;

      if (!result.isValid) {
        isValid = false;
        errors[field] = result.errors;
      }
    }

    return {
      isValid: isValid,
      results: results,
      errors: errors,
      firstError: isValid ? null : Object.values(errors)[0][0]
    };
  },

  /**
   * Validate a form element
   * @param {HTMLFormElement} form - Form element
   * @param {object} schema - Validation schema
   * @returns {object} Validation result
   */
  validateFormElement: function(form, schema) {
    const formData = new FormData(form);
    const data = {};
    
    for (const [key, value] of formData.entries()) {
      data[key] = value;
    }

    const result = this.validateForm(data, schema);
    
    // Clear previous errors
    this.clearFormErrors(form);
    
    // Show new errors
    if (!result.isValid) {
      this.showFormErrors(form, result.errors);
    }

    return result;
  },

  /**
   * Show form errors
   * @param {HTMLFormElement} form - Form element
   * @param {object} errors - Errors object
   */
  showFormErrors: function(form, errors) {
    for (const [field, fieldErrors] of Object.entries(errors)) {
      const input = form.querySelector(`[name="${field}"]`);
      if (!input) continue;

      // Add error class
      input.classList.add('border-red-500');
      input.classList.remove('border-gray-300');

      // Create error message element
      const errorEl = document.createElement('p');
      errorEl.className = 'text-red-500 text-sm mt-1 validation-error';
      errorEl.textContent = fieldErrors[0];
      errorEl.setAttribute('data-field', field);

      // Insert after input or after input wrapper
      const wrapper = input.closest('.form-group') || input.parentElement;
      const existingError = wrapper.querySelector('.validation-error');
      if (existingError) {
        existingError.remove();
      }
      wrapper.appendChild(errorEl);

      // Add input event listener to clear error on change
      input.addEventListener('input', () => {
        this.clearFieldError(input);
      }, { once: true });
    }
  },

  /**
   * Clear field error
   * @param {HTMLElement} input - Input element
   */
  clearFieldError: function(input) {
    input.classList.remove('border-red-500');
    input.classList.add('border-gray-300');
    
    const wrapper = input.closest('.form-group') || input.parentElement;
    const errorEl = wrapper.querySelector('.validation-error');
    if (errorEl) {
      errorEl.remove();
    }
  },

  /**
   * Clear all form errors
   * @param {HTMLFormElement} form - Form element
   */
  clearFormErrors: function(form) {
    const errorElements = form.querySelectorAll('.validation-error');
    errorElements.forEach(el => el.remove());

    const invalidInputs = form.querySelectorAll('.border-red-500');
    invalidInputs.forEach(input => {
      input.classList.remove('border-red-500');
      input.classList.add('border-gray-300');
    });
  },

  /**
   * Get form data as object
   * @param {HTMLFormElement} form - Form element
   * @returns {object} Form data
   */
  getFormData: function(form) {
    const formData = new FormData(form);
    const data = {};
    
    for (const [key, value] of formData.entries()) {
      // Handle multiple values (checkboxes, multi-select)
      if (data[key] !== undefined) {
        if (!Array.isArray(data[key])) {
          data[key] = [data[key]];
        }
        data[key].push(value);
      } else {
        data[key] = value;
      }
    }
    
    return data;
  },

  // ============================================
  // REAL-TIME VALIDATION
  // ============================================

  /**
   * Setup real-time validation for a form
   * @param {HTMLFormElement} form - Form element
   * @param {object} schema - Validation schema
   * @param {object} options - Options
   */
  setupRealTimeValidation: function(form, schema, options = {}) {
    const defaultOptions = {
      validateOnInput: false,
      validateOnBlur: true,
      debounceMs: 300
    };
    const opts = { ...defaultOptions, ...options };

    for (const [field, rules] of Object.entries(schema)) {
      const input = form.querySelector(`[name="${field}"]`);
      if (!input) continue;

      if (opts.validateOnBlur) {
        input.addEventListener('blur', () => {
          const result = this.validateField(field, input.value, rules);
          this.clearFieldError(input);
          if (!result.isValid) {
            this.showFormErrors(form, { [field]: result.errors });
          }
        });
      }

      if (opts.validateOnInput) {
        const debouncedValidate = Utils.debounce(() => {
          const result = this.validateField(field, input.value, rules);
          this.clearFieldError(input);
          if (!result.isValid) {
            this.showFormErrors(form, { [field]: result.errors });
          }
        }, opts.debounceMs);

        input.addEventListener('input', debouncedValidate);
      }
    }
  },

  // ============================================
  // SPECIALIZED VALIDATORS
  // ============================================

  /**
   * Validate transfer form
   * @param {object} data - Transfer data
   * @param {array} accounts - User accounts
   * @returns {object} Validation result
   */
  validateTransfer: function(data, accounts) {
    const schema = {
      from_account_id: 'required',
      to_account_id: ['required', 'accountNumber'],
      amount: ['required', 'amount', 'min:0.01', 'max:1000000'],
      description: 'maxLength:200'
    };

    const result = this.validateForm(data, schema);

    // Additional validations
    if (result.isValid) {
      // Check if source account belongs to user
      const sourceAccount = accounts?.find(a => a.id === parseInt(data.from_account_id));
      if (!sourceAccount) {
        result.isValid = false;
        result.errors.from_account_id = ['Invalid source account'];
      }

      // Check sufficient balance
      if (sourceAccount && parseFloat(sourceAccount.balance) < parseFloat(data.amount)) {
        result.isValid = false;
        result.errors.amount = ['Insufficient funds'];
      }

      // Check not transferring to same account
      if (sourceAccount && sourceAccount.account_number === data.to_account_id) {
        result.isValid = false;
        result.errors.to_account_id = ['Cannot transfer to the same account'];
      }
    }

    return result;
  },

  /**
   * Validate deposit form
   * @param {object} data - Deposit data
   * @returns {object} Validation result
   */
  validateDeposit: function(data) {
    const schema = {
      account_id: 'required',
      amount: ['required', 'amount', 'min:0.01', 'max:50000'],
      description: 'maxLength:200'
    };

    return this.validateForm(data, schema);
  },

  /**
   * Validate bill payment form
   * @param {object} data - Bill payment data
   * @param {array} accounts - User accounts
   * @returns {object} Validation result
   */
  validateBillPayment: function(data, accounts) {
    const schema = {
      payee_id: 'required',
      from_account_id: 'required',
      amount: ['required', 'amount', 'min:0.01', 'max:10000'],
      payment_date: 'required'
    };

    const result = this.validateForm(data, schema);

    // Check sufficient balance
    if (result.isValid && accounts) {
      const sourceAccount = accounts.find(a => a.id === parseInt(data.from_account_id));
      if (sourceAccount && parseFloat(sourceAccount.balance) < parseFloat(data.amount)) {
        result.isValid = false;
        result.errors.amount = ['Insufficient funds'];
      }
    }

    return result;
  },

  /**
   * Validate profile update form
   * @param {object} data - Profile data
   * @returns {object} Validation result
   */
  validateProfile: function(data) {
    const schema = {
      first_name: ['required', 'minLength:2', 'maxLength:50'],
      last_name: ['required', 'minLength:2', 'maxLength:50'],
      phone: 'phone',
      address: 'maxLength:200'
    };

    return this.validateForm(data, schema);
  },

  /**
   * Validate password change form
   * @param {object} data - Password data
   * @returns {object} Validation result
   */
  validatePasswordChange: function(data) {
    const schema = {
      current_password: 'required',
      new_password: ['required', 'password', 'passwordStrength'],
      confirm_password: ['required', 'match:new_password']
    };

    return this.validateForm(data, schema);
  },

  /**
   * Validate registration form
   * @param {object} data - Registration data
   * @returns {object} Validation result
   */
  validateRegistration: function(data) {
    const schema = {
      first_name: ['required', 'minLength:2', 'maxLength:50'],
      last_name: ['required', 'minLength:2', 'maxLength:50'],
      email: ['required', 'email'],
      phone: 'phone',
      password: ['required', 'password', 'passwordStrength'],
      confirm_password: ['required', 'match:password']
    };

    return this.validateForm(data, schema);
  },

  /**
   * Validate login form
   * @param {object} data - Login data
   * @returns {object} Validation result
   */
  validateLogin: function(data) {
    const schema = {
      email: ['required', 'email'],
      password: 'required'
    };

    return this.validateForm(data, schema);
  },

  // ============================================
  // SANITIZATION
  // ============================================

  /**
   * Sanitize input value
   * @param {string} value - Value to sanitize
   * @param {string} type - Sanitization type
   * @returns {string} Sanitized value
   */
  sanitize: function(value, type = 'text') {
    if (!value) return '';

    const sanitizers = {
      text: (v) => String(v).trim().replace(/<[^>]*>/g, ''),
      email: (v) => String(v).trim().toLowerCase().replace(/[^a-z0-9@._-]/g, ''),
      phone: (v) => String(v).replace(/[^0-9+\-() ]/g, '').trim(),
      number: (v) => String(v).replace(/[^0-9.-]/g, ''),
      amount: (v) => String(v).replace(/[^0-9.]/g, ''),
      accountNumber: (v) => String(v).replace(/[^0-9]/g, ''),
      alphanumeric: (v) => String(v).replace(/[^a-zA-Z0-9]/g, '')
    };

    return sanitizers[type] ? sanitizers[type](value) : sanitizers.text(value);
  },

  /**
   * Sanitize form data
   * @param {object} data - Form data
   * @param {object} types - Field sanitization types
   * @returns {object} Sanitized data
   */
  sanitizeForm: function(data, types) {
    const sanitized = {};
    
    for (const [field, value] of Object.entries(data)) {
      const type = types[field] || 'text';
      sanitized[field] = this.sanitize(value, type);
    }

    return sanitized;
  }
};

// Make available globally
if (typeof window !== 'undefined') {
  window.Validation = Validation;
}