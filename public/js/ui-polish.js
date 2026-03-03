/**
 * UI/UX Polish Utilities
 * Loading Skeletons, Toast Notifications, Dark Mode, Animations
 */

// ============================================
// 1. LOADING SKELETONS
// ============================================

const SkeletonTemplates = {
    // Account card skeleton
    accountCard: () => `
        <div class="skeleton-card">
            <div class="flex justify-between items-start mb-4">
                <div>
                    <div class="skeleton skeleton-title"></div>
                    <div class="skeleton skeleton-subtitle"></div>
                </div>
                <div class="skeleton skeleton-icon"></div>
            </div>
            <div class="skeleton skeleton-amount"></div>
            <div class="skeleton skeleton-badge"></div>
        </div>
    `,

    // Transaction row skeleton
    transactionRow: () => `
        <div class="skeleton-txn-row">
            <div class="skeleton skeleton-txn-icon"></div>
            <div class="skeleton-txn-content">
                <div class="skeleton skeleton-txn-title"></div>
                <div class="skeleton skeleton-txn-date"></div>
            </div>
            <div class="skeleton skeleton-txn-amount"></div>
        </div>
    `,

    // Chart skeleton
    chart: () => `
        <div class="skeleton skeleton-chart">
            <div class="skeleton-chart-bars">
                ${Array(7).fill(0).map((_, i) => `
                    <div class="skeleton-chart-bar" style="height: ${Math.random() * 60 + 40}%"></div>
                `).join('')}
            </div>
        </div>
    `,

    // Stats skeleton
    statCard: () => `
        <div class="skeleton-stat">
            <div class="skeleton skeleton-stat-value"></div>
            <div class="skeleton skeleton-stat-label"></div>
        </div>
    `,

    // Table row skeleton
    tableRow: (cols = 4) => `
        <div class="skeleton-table-row">
            ${Array(cols).fill(0).map(() => `
                <div class="skeleton skeleton-table-cell"></div>
            `).join('')}
        </div>
    `,

    // Full page loading skeleton
    dashboardLoading: () => `
        <div class="space-y-6">
            <!-- Quick Actions -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                ${Array(4).fill(0).map(() => `
                    <div class="skeleton h-12 rounded-lg"></div>
                `).join('')}
            </div>
            
            <!-- Balance Card -->
            <div class="bg-dark-700 rounded-lg p-6 mb-6">
                <div class="skeleton h-4 w-32 mb-2"></div>
                <div class="skeleton h-10 w-48"></div>
            </div>
            
            <!-- Accounts -->
            <div class="mb-6">
                <div class="skeleton h-8 w-40 mb-4"></div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    ${Array(3).fill(0).map(() => SkeletonTemplates.accountCard()).join('')}
                </div>
            </div>
            
            <!-- Transactions -->
            <div>
                <div class="skeleton h-8 w-48 mb-4"></div>
                <div class="bg-dark-700 rounded-lg p-6">
                    ${Array(5).fill(0).map(() => SkeletonTemplates.transactionRow()).join('')}
                </div>
            </div>
        </div>
    `
};

// Show skeleton loading
function showSkeleton(container, template) {
    const el = typeof container === 'string' ? document.querySelector(container) : container;
    if (el) {
        el.innerHTML = typeof template === 'function' ? template() : template;
    }
}

// ============================================
// 2. TOAST NOTIFICATIONS
// ============================================

const ToastManager = {
    container: null,
    maxToasts: 5,
    defaultDuration: 5000,

    init() {
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.className = 'toast-container';
            this.container.setAttribute('role', 'alert');
            this.container.setAttribute('aria-live', 'polite');
            document.body.appendChild(this.container);
        }
    },

    show(options) {
        this.init();

        const {
            type = 'info',
            title = '',
            message = '',
            duration = this.defaultDuration,
            action = null,
            dismissible = true
        } = options;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const icons = {
            success: '<svg class="toast-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
            error: '<svg class="toast-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
            warning: '<svg class="toast-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>',
            info: '<svg class="toast-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
        };

        toast.innerHTML = `
            ${icons[type] || icons.info}
            <div class="toast-content">
                ${title ? `<div class="toast-title">${title}</div>` : ''}
                ${message ? `<div class="toast-message">${message}</div>` : ''}
                ${action ? `<div class="toast-action">${action}</div>` : ''}
            </div>
            ${dismissible ? '<button class="toast-close" aria-label="Close notification">&times;</button>' : ''}
        `;

        // Add dismiss handler
        const closeBtn = toast.querySelector('.toast-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.dismiss(toast));
        }

        // Limit max toasts
        while (this.container.children.length >= this.maxToasts) {
            this.dismiss(this.container.firstChild);
        }

        this.container.appendChild(toast);

        // Auto dismiss
        if (duration > 0) {
            setTimeout(() => this.dismiss(toast), duration);
        }

        return toast;
    },

    dismiss(toast) {
        if (!toast || !toast.parentNode) return;
        
        toast.classList.add('toast-dismiss');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    },

    // Convenience methods
    success(message, title = 'Success') {
        return this.show({ type: 'success', title, message });
    },

    error(message, title = 'Error') {
        return this.show({ type: 'error', title, message, duration: 7000 });
    },

    warning(message, title = 'Warning') {
        return this.show({ type: 'warning', title, message });
    },

    info(message, title = 'Info') {
        return this.show({ type: 'info', title, message });
    }
};

// Global toast function
function showToast(message, type = 'info', title = '') {
    return ToastManager.show({ type, message, title });
}

// ============================================
// 3. DARK MODE
// ============================================

const DarkMode = {
    key: 'darkMode',
    isDark: true, // Default to dark for this app

    init() {
        // Check for saved preference
        const saved = localStorage.getItem(this.key);
        
        if (saved !== null) {
            this.isDark = saved === 'true';
        } else {
            // Check system preference
            this.isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        }

        this.apply();
        this.setupListener();
    },

    toggle() {
        this.isDark = !this.isDark;
        this.apply();
        this.save();
    },

    apply() {
        if (this.isDark) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }

        // Update toggle buttons
        document.querySelectorAll('.dark-mode-toggle').forEach(btn => {
            const sunIcon = btn.querySelector('.sun-icon');
            const moonIcon = btn.querySelector('.moon-icon');
            
            if (sunIcon && moonIcon) {
                sunIcon.style.display = this.isDark ? 'none' : 'block';
                moonIcon.style.display = this.isDark ? 'block' : 'none';
            }
        });
    },

    save() {
        localStorage.setItem(this.key, this.isDark);
    },

    setupListener() {
        // Listen for system preference changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (localStorage.getItem(this.key) === null) {
                this.isDark = e.matches;
                this.apply();
            }
        });
    },

    // Create toggle button
    createToggle(container) {
        const el = typeof container === 'string' ? document.querySelector(container) : container;
        if (!el) return;

        el.innerHTML = `
            <button class="dark-mode-toggle" onclick="DarkMode.toggle()" aria-label="Toggle dark mode">
                <svg class="sun-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>
                </svg>
                <svg class="moon-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
                </svg>
            </button>
        `;
        
        this.apply();
    }
};

// ============================================
// 4. PROGRESS BAR
// ============================================

const ProgressBar = {
    bar: null,
    indicator: null,

    init() {
        if (!this.bar) {
            this.bar = document.createElement('div');
            this.bar.className = 'progress-bar';
            this.bar.innerHTML = '<div class="progress-bar-indicator"></div>';
            document.body.appendChild(this.bar);
            this.indicator = this.bar.querySelector('.progress-bar-indicator');
        }
    },

    start() {
        this.init();
        this.indicator.className = 'progress-bar-indicator animating';
    },

    set(percent) {
        this.init();
        this.indicator.className = 'progress-bar-indicator';
        this.indicator.style.width = `${Math.min(100, Math.max(0, percent))}%`;
    },

    complete() {
        this.set(100);
        setTimeout(() => this.hide(), 300);
    },

    hide() {
        if (this.bar) {
            this.indicator.className = 'progress-bar-indicator';
            this.indicator.style.width = '0%';
        }
    }
};

// ============================================
// 5. ANIMATIONS
// ============================================

const Animations = {
    // Animate number counting
    countUp(element, target, duration = 1000, prefix = '', suffix = '') {
        const el = typeof element === 'string' ? document.querySelector(element) : element;
        if (!el) return;

        const start = parseFloat(el.textContent.replace(/[^0-9.-]/g, '')) || 0;
        const startTime = performance.now();
        const diff = target - start;

        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function (ease-out)
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = start + diff * eased;
            
            el.textContent = prefix + current.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }) + suffix;

            if (progress < 1) {
                requestAnimationFrame(update);
            }
        }

        requestAnimationFrame(update);
    },

    // Stagger animation for lists
    staggerIn(container) {
        const el = typeof container === 'string' ? document.querySelector(container) : container;
        if (!el) return;

        el.querySelectorAll('.stagger-item').forEach((item, index) => {
            item.style.animationDelay = `${index * 0.05}s`;
        });
    },

    // Shake element (for errors)
    shake(element) {
        const el = typeof element === 'string' ? document.querySelector(element) : element;
        if (!el) return;

        el.classList.remove('shake');
        void el.offsetWidth; // Trigger reflow
        el.classList.add('shake');
    },

    // Pulse element
    pulse(element) {
        const el = typeof element === 'string' ? document.querySelector(element) : element;
        if (!el) return;

        el.classList.remove('pulse-animation');
        void el.offsetWidth;
        el.classList.add('pulse-animation');
    },

    // Slide in animation
    slideIn(element, direction = 'up') {
        const el = typeof element === 'string' ? document.querySelector(element) : element;
        if (!el) return;

        el.classList.remove('slide-in-up', 'slide-in-down', 'slide-in-left', 'slide-in-right');
        void el.offsetWidth;
        el.classList.add(`slide-in-${direction}`);
    }
};

// ============================================
// 6. FORM VALIDATION UI
// ============================================

const FormValidation = {
    // Show field error
    showError(field, message) {
        const el = typeof field === 'string' ? document.querySelector(field) : field;
        if (!el) return;

        el.classList.add('input-invalid');
        el.classList.remove('input-valid');

        // Remove existing error message
        const existingError = el.parentNode.querySelector('.field-error');
        if (existingError) existingError.remove();

        // Add new error message
        const errorEl = document.createElement('div');
        errorEl.className = 'field-error';
        errorEl.innerHTML = `
            <svg class="field-error-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span>${message}</span>
        `;
        el.parentNode.appendChild(errorEl);
    },

    // Show field success
    showSuccess(field) {
        const el = typeof field === 'string' ? document.querySelector(field) : field;
        if (!el) return;

        el.classList.add('input-valid');
        el.classList.remove('input-invalid');

        // Remove error message
        const existingError = el.parentNode.querySelector('.field-error');
        if (existingError) existingError.remove();
    },

    // Clear field state
    clear(field) {
        const el = typeof field === 'string' ? document.querySelector(field) : field;
        if (!el) return;

        el.classList.remove('input-valid', 'input-invalid');
        const existingError = el.parentNode.querySelector('.field-error');
        if (existingError) existingError.remove();
    },

    // Password strength meter
    passwordStrength(password) {
        let strength = 0;
        
        if (password.length >= 8) strength++;
        if (password.length >= 12) strength++;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
        if (/\d/.test(password)) strength++;
        if (/[^a-zA-Z0-9]/.test(password)) strength++;

        const labels = ['weak', 'weak', 'fair', 'fair', 'good', 'strong'];
        return {
            score: Math.min(strength, 5),
            label: labels[strength]
        };
    },

    // Update password strength UI
    updatePasswordStrength(field, container) {
        const el = typeof field === 'string' ? document.querySelector(field) : field;
        const containerEl = typeof container === 'string' ? document.querySelector(container) : container;
        if (!el || !containerEl) return;

        const { score, label } = this.passwordStrength(el.value);
        
        containerEl.innerHTML = `
            <div class="password-strength-bar">
                <div class="password-strength-fill ${label}" style="width: ${(score / 5) * 100}%"></div>
            </div>
            <div class="password-strength-text ${label}">${label.charAt(0).toUpperCase() + label.slice(1)}</div>
        `;
    }
};

// ============================================
// 7. MODAL UTILITIES
// ============================================

const Modal = {
    activeModal: null,

    show(content, options = {}) {
        const { closable = true, onClose = null, className = '' } = options;

        // Create modal
        const modal = document.createElement('div');
        modal.className = 'modal-overlay modal-animated';
        modal.innerHTML = `
            <div class="modal-backdrop" ${closable ? 'onclick="Modal.hide()"' : ''}></div>
            <div class="modal-content ${className}">
                ${content}
            </div>
        `;

        document.body.appendChild(modal);
        
        // Animate in
        requestAnimationFrame(() => modal.classList.add('active'));

        // Store reference
        this.activeModal = { element: modal, onClose };

        // Handle escape key
        if (closable) {
            document.addEventListener('keydown', this.handleEscape);
        }

        // Prevent body scroll
        document.body.style.overflow = 'hidden';

        return modal;
    },

    hide() {
        if (!this.activeModal) return;

        const { element, onClose } = this.activeModal;
        
        // Animate out
        element.classList.remove('active');
        
        setTimeout(() => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
            document.body.style.overflow = '';
            
            if (onClose) onClose();
        }, 200);

        this.activeModal = null;
        document.removeEventListener('keydown', this.handleEscape);
    },

    handleEscape(e) {
        if (e.key === 'Escape') {
            Modal.hide();
        }
    },

    // Confirmation modal
    confirm(message, onConfirm, onCancel = null) {
        const content = `
            <div class="text-center">
                <div class="mb-4">
                    <svg class="w-12 h-12 mx-auto text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                    </svg>
                </div>
                <h3 class="text-xl font-bold text-white mb-2">Confirm Action</h3>
                <p class="text-gray-300 mb-6">${message}</p>
                <div class="flex gap-3 justify-center">
                    <button onclick="Modal.hide(); ${onCancel ? onCancel.toString() + '()' : ''}" class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500">
                        Cancel
                    </button>
                    <button onclick="Modal.hide(); ${onConfirm.toString()}()" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        Confirm
                    </button>
                </div>
            </div>
        `;
        
        return this.show(content, { closable: true });
    },

    // Loading modal
    loading(message = 'Loading...') {
        const content = `
            <div class="text-center py-4">
                <div class="spinner w-10 h-10 mx-auto mb-4"></div>
                <p class="text-gray-300">${message}</p>
            </div>
        `;
        
        return this.show(content, { closable: false });
    }
};

// ============================================
// 8. EMPTY STATES
// ============================================

const EmptyState = {
    render(container, options = {}) {
        const {
            icon = 'inbox',
            title = 'No data found',
            description = 'There\'s nothing here yet.',
            action = null
        } = options;

        const el = typeof container === 'string' ? document.querySelector(container) : container;
        if (!el) return;

        const icons = {
            inbox: '<svg class="empty-state-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/></svg>',
            search: '<svg class="empty-state-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>',
            wallet: '<svg class="empty-state-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>',
            document: '<svg class="empty-state-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>'
        };

        el.innerHTML = `
            <div class="empty-state">
                ${icons[icon] || icons.inbox}
                <h3 class="empty-state-title">${title}</h3>
                <p class="empty-state-description">${description}</p>
                ${action ? `<div class="empty-state-action">${action}</div>` : ''}
            </div>
        `;
    }
};

// ============================================
// 9. OFFLINE HANDLING
// ============================================

const OfflineHandler = {
    indicator: null,

    init() {
        // Create offline indicator
        this.indicator = document.createElement('div');
        this.indicator.className = 'offline-indicator';
        this.indicator.innerHTML = `
            <span class="pulse-dot"></span>
            <span>You're offline. Some features may be unavailable.</span>
        `;
        this.indicator.style.display = 'none';
        document.body.appendChild(this.indicator);

        // Listen for online/offline events
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());

        // Initial check
        if (!navigator.onLine) {
            this.handleOffline();
        }
    },

    handleOnline() {
        this.indicator.style.display = 'none';
        ToastManager.success('You\'re back online!', 'Connection restored');
    },

    handleOffline() {
        this.indicator.style.display = 'flex';
        ToastManager.warning('You\'ve lost your internet connection.', 'Offline');
    }
};

// ============================================
// 10. BUTTON LOADING STATES
// ============================================

function setButtonLoading(button, loading = true) {
    const el = typeof button === 'string' ? document.querySelector(button) : button;
    if (!el) return;

    if (loading) {
        el.dataset.originalText = el.innerHTML;
        el.classList.add('btn-loading');
        el.disabled = true;
    } else {
        el.classList.remove('btn-loading');
        el.innerHTML = el.dataset.originalText || el.innerHTML;
        el.disabled = false;
    }
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Initialize dark mode
    DarkMode.init();
    
    // Initialize offline handler
    OfflineHandler.init();
    
    // Add smooth transitions for dark mode changes
    document.body.classList.add('dark-mode-transition');
});

// Export for global use
window.SkeletonTemplates = SkeletonTemplates;
window.showSkeleton = showSkeleton;
window.ToastManager = ToastManager;
window.showToast = showToast;
window.DarkMode = DarkMode;
window.ProgressBar = ProgressBar;
window.Animations = Animations;
window.FormValidation = FormValidation;
window.Modal = Modal;
window.EmptyState = EmptyState;
window.OfflineHandler = OfflineHandler;
window.setButtonLoading = setButtonLoading;