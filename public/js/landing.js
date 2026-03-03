// Landing Page JavaScript for Apex Capital Investment Banking
// Uses shared API module from api.js

// Toast notification system
const Toast = {
  show: function(message, type = 'info') {
    // Remove existing toast
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) {
      existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.innerHTML = `
      <span class="toast-message">${message}</span>
      <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    document.body.appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      if (toast.parentElement) {
        toast.remove();
      }
    }, 5000);
  }
};

// Modal Management
const ModalManager = {
  openModal: function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('modal-open');
      
      // Focus first input
      const firstInput = modal.querySelector('input');
      if (firstInput) {
        setTimeout(() => firstInput.focus(), 100);
      }
    }
  },

  closeModal: function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
      modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('modal-open');
    }
  },

  closeAllModals: function() {
    document.querySelectorAll('.modal-overlay').forEach(modal => {
      modal.classList.remove('active');
      modal.setAttribute('aria-hidden', 'true');
    });
    document.body.classList.remove('modal-open');
  }
};

// Authentication Handler
const AuthHandler = {
  init: function() {
    this.setupLoginModal();
    this.setupSignUpModal();
    this.setupForgotPasswordModal();
    this.setupResetPasswordModal();
    this.setupMobileMenu();
    this.checkExistingSession();
    this.checkResetToken();
  },

  checkResetToken: function() {
    // Check if URL has reset password token
    const urlParams = new URLSearchParams(window.location.search);
    const resetToken = urlParams.get('token');
    
    if (resetToken && window.location.pathname === '/reset-password') {
      // Show reset password modal
      document.getElementById('resetToken').value = resetToken;
      ModalManager.openModal('resetPasswordModal');
    }
  },

  checkExistingSession: function() {
    const token = API.getToken();
    if (token) {
      // Verify token is still valid
      API.get('/auth/me').then(data => {
        if (data.user) {
          // User is logged in, redirect to dashboard
          window.location.href = '/dashboard.html';
        }
      }).catch(() => {
        // Token invalid, clear storage
        API.removeToken();
      });
    }
  },

  setupLoginModal: function() {
    const loginToggle = document.getElementById('loginToggle');
    const mobileLoginToggle = document.getElementById('mobileLoginToggle');
    const heroAccessPortal = document.getElementById('heroAccessPortal');
    const closeLoginModal = document.getElementById('closeLoginModal');
    const loginForm = document.getElementById('loginForm');
    const togglePassword = document.getElementById('togglePassword');
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');

    // Open login modal
    [loginToggle, mobileLoginToggle, heroAccessPortal].forEach(btn => {
      if (btn) {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          ModalManager.closeAllModals();
          ModalManager.openModal('loginModal');
        });
      }
    });

    // Close login modal
    if (closeLoginModal) {
      closeLoginModal.addEventListener('click', () => {
        ModalManager.closeModal('loginModal');
      });
    }

    // Close on backdrop click
    const loginModal = document.getElementById('loginModal');
    if (loginModal) {
      loginModal.addEventListener('click', (e) => {
        if (e.target === loginModal || e.target.classList.contains('modal-backdrop')) {
          ModalManager.closeModal('loginModal');
        }
      });
    }

    // Toggle password visibility
    if (togglePassword) {
      togglePassword.addEventListener('click', () => {
        const passwordInput = document.getElementById('loginPassword');
        const eyeOpen = togglePassword.querySelector('.eye-open');
        const eyeClosed = togglePassword.querySelector('.eye-closed');
        
        if (passwordInput.type === 'password') {
          passwordInput.type = 'text';
          eyeOpen.classList.add('hidden');
          eyeClosed.classList.remove('hidden');
        } else {
          passwordInput.type = 'password';
          eyeOpen.classList.remove('hidden');
          eyeClosed.classList.add('hidden');
        }
      });
    }

    // Forgot password link
    if (forgotPasswordLink) {
      forgotPasswordLink.addEventListener('click', (e) => {
        e.preventDefault();
        ModalManager.closeModal('loginModal');
        ModalManager.openModal('forgotPasswordModal');
      });
    }

    // Sign up link in login modal
    const signUpLink = document.getElementById('signUpLink');
    if (signUpLink) {
      signUpLink.addEventListener('click', (e) => {
        e.preventDefault();
        ModalManager.closeModal('loginModal');
        ModalManager.openModal('signUpModal');
      });
    }

    // Login form submission
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleLogin(loginForm);
      });
    }
  },

  handleLogin: async function(form) {
    const email = form.querySelector('#loginEmail').value;
    const password = form.querySelector('#loginPassword').value;
    const submitBtn = form.querySelector('#loginSubmit');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoader = submitBtn.querySelector('.btn-loader');
    const errorBanner = document.getElementById('loginErrorBanner');
    const errorMessage = document.getElementById('loginErrorMessage');

    // Show loading state
    btnText.classList.add('hidden');
    btnLoader.classList.remove('hidden');
    submitBtn.disabled = true;
    errorBanner.classList.add('hidden');

    try {
      const data = await API.post('/auth/login', { email, password });

      if (data.requires_2fa) {
        // Handle 2FA
        Toast.show('Two-factor authentication required', 'info');
        // For now, just show info - could expand to 2FA modal
        return;
      }

      if (data.token) {
        API.setToken(data.token);
        API.setUser(data.user);
        API.setAccounts(data.accounts);
        
        Toast.show('Login successful! Redirecting...', 'success');
        
        // Redirect based on role
        setTimeout(() => {
          if (data.isAdmin) {
            window.location.href = '/admin';
          } else {
            window.location.href = '/dashboard.html';
          }
        }, 1000);
      }
    } catch (error) {
      errorMessage.textContent = error.message || 'Invalid credentials. Please try again.';
      errorBanner.classList.remove('hidden');
    } finally {
      btnText.classList.remove('hidden');
      btnLoader.classList.add('hidden');
      submitBtn.disabled = false;
    }
  },

  setupSignUpModal: function() {
    const signUpToggle = document.getElementById('signUpToggle');
    const mobileSignUpToggle = document.getElementById('mobileSignUpToggle');
    const closeSignUpModal = document.getElementById('closeSignUpModal');
    const signUpForm = document.getElementById('signUpForm');
    const toggleSignUpPassword = document.getElementById('toggleSignUpPassword');
    const backToLoginFromSignUp = document.getElementById('backToLoginFromSignUp');

    // Open sign up modal
    [signUpToggle, mobileSignUpToggle].forEach(btn => {
      if (btn) {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          ModalManager.closeAllModals();
          ModalManager.openModal('signUpModal');
        });
      }
    });

    // Close sign up modal
    if (closeSignUpModal) {
      closeSignUpModal.addEventListener('click', () => {
        ModalManager.closeModal('signUpModal');
      });
    }

    // Close on backdrop click
    const signUpModal = document.getElementById('signUpModal');
    if (signUpModal) {
      signUpModal.addEventListener('click', (e) => {
        if (e.target === signUpModal || e.target.classList.contains('modal-backdrop')) {
          ModalManager.closeModal('signUpModal');
        }
      });
    }

    // Toggle password visibility
    if (toggleSignUpPassword) {
      toggleSignUpPassword.addEventListener('click', () => {
        const passwordInput = document.getElementById('signUpPassword');
        const eyeOpen = toggleSignUpPassword.querySelector('.eye-open');
        const eyeClosed = toggleSignUpPassword.querySelector('.eye-closed');
        
        if (passwordInput.type === 'password') {
          passwordInput.type = 'text';
          eyeOpen.classList.add('hidden');
          eyeClosed.classList.remove('hidden');
        } else {
          passwordInput.type = 'password';
          eyeOpen.classList.remove('hidden');
          eyeClosed.classList.add('hidden');
        }
      });
    }

    // Back to login
    if (backToLoginFromSignUp) {
      backToLoginFromSignUp.addEventListener('click', (e) => {
        e.preventDefault();
        ModalManager.closeModal('signUpModal');
        ModalManager.openModal('loginModal');
      });
    }

    // Sign up form submission
    if (signUpForm) {
      signUpForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleSignUp(signUpForm);
      });
    }
  },

  handleSignUp: async function(form) {
    const firstName = form.querySelector('#signUpFirstName').value;
    const lastName = form.querySelector('#signUpLastName').value;
    const email = form.querySelector('#signUpEmail').value;
    const phone = form.querySelector('#signUpPhone').value;
    const password = form.querySelector('#signUpPassword').value;
    const confirmPassword = form.querySelector('#signUpConfirmPassword').value;
    const submitBtn = form.querySelector('#signUpSubmit');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoader = submitBtn.querySelector('.btn-loader');
    const errorBanner = document.getElementById('signUpErrorBanner');
    const errorMessage = document.getElementById('signUpErrorMessage');

    // Clear previous errors
    errorBanner.classList.add('hidden');
    document.querySelectorAll('.form-error').forEach(el => el.textContent = '');

    // Validate passwords match
    if (password !== confirmPassword) {
      document.getElementById('confirmPasswordError').textContent = 'Passwords do not match';
      return;
    }

    // Show loading state
    btnText.classList.add('hidden');
    btnLoader.classList.remove('hidden');
    submitBtn.disabled = true;

    try {
      const data = await API.post('/auth/register', {
        first_name: firstName,
        last_name: lastName,
        email: email,
        phone: phone || null,
        password: password
      });

      Toast.show('Registration successful! Please check your email to verify your account.', 'success');
      ModalManager.closeModal('signUpModal');
      
      // Clear form
      form.reset();
    } catch (error) {
      errorMessage.textContent = error.message || 'Registration failed. Please try again.';
      errorBanner.classList.remove('hidden');
    } finally {
      btnText.classList.remove('hidden');
      btnLoader.classList.add('hidden');
      submitBtn.disabled = false;
    }
  },

  setupForgotPasswordModal: function() {
    const closeForgotPasswordModal = document.getElementById('closeForgotPasswordModal');
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    const backToLoginLink = document.getElementById('backToLoginLink');

    // Close modal
    if (closeForgotPasswordModal) {
      closeForgotPasswordModal.addEventListener('click', () => {
        ModalManager.closeModal('forgotPasswordModal');
      });
    }

    // Close on backdrop click
    const forgotModal = document.getElementById('forgotPasswordModal');
    if (forgotModal) {
      forgotModal.addEventListener('click', (e) => {
        if (e.target === forgotModal || e.target.classList.contains('modal-backdrop')) {
          ModalManager.closeModal('forgotPasswordModal');
        }
      });
    }

    // Back to login
    if (backToLoginLink) {
      backToLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        ModalManager.closeModal('forgotPasswordModal');
        ModalManager.openModal('loginModal');
      });
    }

    // Forgot password form submission
    if (forgotPasswordForm) {
      forgotPasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = forgotPasswordForm.querySelector('#resetEmail').value;

        try {
          await API.post('/auth/forgot-password', { email });
          Toast.show('If the email exists, a reset link will be sent.', 'success');
          ModalManager.closeModal('forgotPasswordModal');
        } catch (error) {
          Toast.show(error.message || 'Failed to process request', 'error');
        }
      });
    }
  },

  setupResetPasswordModal: function() {
    const closeResetPasswordModal = document.getElementById('closeResetPasswordModal');
    const resetPasswordForm = document.getElementById('resetPasswordForm');
    const backToLoginFromReset = document.getElementById('backToLoginFromReset');

    // Close reset password modal
    if (closeResetPasswordModal) {
      closeResetPasswordModal.addEventListener('click', () => {
        ModalManager.closeModal('resetPasswordModal');
        // Clear the URL
        window.history.replaceState({}, document.title, '/');
      });
    }

    // Close on backdrop click
    const resetModal = document.getElementById('resetPasswordModal');
    if (resetModal) {
      resetModal.addEventListener('click', (e) => {
        if (e.target === resetModal || e.target.classList.contains('modal-backdrop')) {
          ModalManager.closeModal('resetPasswordModal');
          window.history.replaceState({}, document.title, '/');
        }
      });
    }

    // Back to login
    if (backToLoginFromReset) {
      backToLoginFromReset.addEventListener('click', (e) => {
        e.preventDefault();
        ModalManager.closeModal('resetPasswordModal');
        window.history.replaceState({}, document.title, '/');
        ModalManager.openModal('loginModal');
      });
    }

    // Reset password form submission
    if (resetPasswordForm) {
      resetPasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const token = document.getElementById('resetToken').value;
        const password = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmNewPassword').value;
        const errorEl = document.getElementById('resetPasswordError');
        const submitBtn = resetPasswordForm.querySelector('button[type="submit"]');
        const btnText = submitBtn.querySelector('.btn-text');
        const btnLoader = submitBtn.querySelector('.btn-loader');

        // Validate passwords match
        if (password !== confirmPassword) {
          errorEl.textContent = 'Passwords do not match';
          return;
        }

        if (password.length < 8) {
          errorEl.textContent = 'Password must be at least 8 characters';
          return;
        }

        errorEl.textContent = '';
        btnText.classList.add('hidden');
        btnLoader.classList.remove('hidden');
        submitBtn.disabled = true;

        try {
          await API.post('/auth/reset-password', { token, password });
          Toast.show('Password reset successfully! Please sign in.', 'success');
          ModalManager.closeModal('resetPasswordModal');
          window.history.replaceState({}, document.title, '/');
          ModalManager.openModal('loginModal');
        } catch (error) {
          errorEl.textContent = error.message || 'Failed to reset password. The link may have expired.';
        } finally {
          btnText.classList.remove('hidden');
          btnLoader.classList.add('hidden');
          submitBtn.disabled = false;
        }
      });
    }
  },

  setupMobileMenu: function() {
    const mobileToggle = document.querySelector('.nav-mobile-toggle');
    const mobileMenu = document.getElementById('mobileMenu');

    if (mobileToggle && mobileMenu) {
      mobileToggle.addEventListener('click', () => {
        const isOpen = mobileMenu.classList.contains('active');
        
        if (isOpen) {
          mobileMenu.classList.remove('active');
          mobileMenu.setAttribute('aria-hidden', 'true');
          mobileToggle.setAttribute('aria-expanded', 'false');
        } else {
          mobileMenu.classList.add('active');
          mobileMenu.setAttribute('aria-hidden', 'false');
          mobileToggle.setAttribute('aria-expanded', 'true');
        }
      });

      // Close mobile menu when clicking a link
      mobileMenu.querySelectorAll('a, button').forEach(link => {
        link.addEventListener('click', () => {
          mobileMenu.classList.remove('active');
          mobileMenu.setAttribute('aria-hidden', 'true');
          mobileToggle.setAttribute('aria-expanded', 'false');
        });
      });
    }
  }
};

// Contact Form Handler
const ContactHandler = {
  init: function() {
    const contactForm = document.getElementById('contactForm');
    
    if (contactForm) {
      contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(contactForm);
        const data = Object.fromEntries(formData.entries());
        
        // For now, just show success message
        // In production, this would send to a backend endpoint
        Toast.show('Thank you for your inquiry. Our team will contact you shortly.', 'success');
        contactForm.reset();
      });
    }
  }
};

// Smooth scroll for anchor links
const SmoothScroll = {
  init: function() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function(e) {
        const href = this.getAttribute('href');
        if (href === '#') return;
        
        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      });
    });
  }
};

// Navbar scroll effect
const NavbarScroll = {
  init: function() {
    const navbar = document.querySelector('.navbar');
    
    if (navbar) {
      window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
          navbar.classList.add('scrolled');
        } else {
          navbar.classList.remove('scrolled');
        }
      });
    }
  }
};

// Initialize everything when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  AuthHandler.init();
  ContactHandler.init();
  SmoothScroll.init();
  NavbarScroll.init();
});

// Keyboard accessibility - close modals on Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    ModalManager.closeAllModals();
  }
});
