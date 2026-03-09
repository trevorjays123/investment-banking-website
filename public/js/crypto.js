// Crypto/Bitcoin Wallet JavaScript
// Handles BTC balance, transactions, send, and receive

const CryptoService = {
    // Get current BTC price
    async getPrice() {
        try {
            const response = await fetch('/api/crypto/price');
            const data = await response.json();
            return data.success ? data.data : null;
        } catch (error) {
            console.error('Failed to get BTC price:', error);
            return null;
        }
    },

    // Get user's BTC balance
    async getBalance() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/crypto/balance', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            return data.success ? data.data : null;
        } catch (error) {
            console.error('Failed to get BTC balance:', error);
            return null;
        }
    },

    // Get BTC transaction history
    async getTransactions(limit = 10, offset = 0) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/crypto/transactions?limit=${limit}&offset=${offset}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            return data.success ? data : null;
        } catch (error) {
            console.error('Failed to get BTC transactions:', error);
            return null;
        }
    },

    // Generate receive address
    async getReceiveAddress() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/crypto/receive', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json();
            return data.success ? data.data : null;
        } catch (error) {
            console.error('Failed to get receive address:', error);
            return null;
        }
    },

    // Send BTC
    async sendBTC(toAddress, amount) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/crypto/send', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    toAddress: toAddress,
                    amount: parseFloat(amount)
                })
            });
            const data = await response.json();
            return data.success ? data.data : null;
        } catch (error) {
            console.error('Failed to send BTC:', error);
            return null;
        }
    }
};

// UI Functions
const CryptoUI = {
    // Format BTC amount with 8 decimals
    formatBTC(amount) {
        return parseFloat(amount).toFixed(8);
    },

    // Format USD amount with commas
    formatUSD(amount) {
        return `$${parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    },

    // Get status badge class
    getStatusBadge(status) {
        const badges = {
            'confirmed': 'bg-green-100 text-green-800',
            'pending': 'bg-yellow-100 text-yellow-800',
            'failed': 'bg-red-100 text-red-800'
        };
        return badges[status] || 'bg-gray-100 text-gray-800';
    },

    // Get transaction type icon
    getTypeIcon(type) {
        const icons = {
            'received': '↓',
            'deposit': '↓',
            'sent': '↑',
            'withdrawal': '↑',
            'exchange': '⇄'
        };
        return icons[type] || '•';
    },

    // Get transaction type color
    getTypeColor(type) {
        const colors = {
            'received': 'text-green-600',
            'deposit': 'text-green-600',
            'sent': 'text-red-600',
            'withdrawal': 'text-red-600',
            'exchange': 'text-blue-600'
        };
        return colors[type] || 'text-gray-600';
    },

    // Render BTC wallet card
    renderWalletCard(balanceData) {
        if (!balanceData) {
            return `
                <div class="bg-white rounded-lg shadow-md p-6 border-l-4 border-orange-500">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-gray-500 text-sm">Bitcoin Wallet</p>
                            <p class="text-2xl font-bold text-gray-800">Loading...</p>
                        </div>
                        <div class="text-orange-500 text-3xl">₿</div>
                    </div>
                </div>
            `;
        }

        return `
            <div class="bg-white rounded-lg shadow-md p-6 border-l-4 border-orange-500 crypto-wallet-card">
                <div class="flex items-center justify-between mb-4">
                    <div class="flex items-center space-x-3">
                        <div class="text-orange-500 text-3xl">₿</div>
                        <div>
                            <p class="text-gray-500 text-sm">Bitcoin Wallet</p>
                            <p class="text-xs text-gray-400">${balanceData.accountNumber}</p>
                        </div>
                    </div>
                    <span class="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Active</span>
                </div>
                
                <div class="mb-4">
                    <div class="flex items-baseline">
                        <p class="text-3xl font-bold text-gray-800" id="btcBalance">${balanceData.btcBalanceFormatted}</p>
                        <span class="ml-2 text-gray-500 font-medium">BTC</span>
                    </div>
                    <p class="text-lg text-gray-500 mt-1" id="btcUsdValue">≈ ${balanceData.usdValueFormatted}</p>
                    <p class="text-xs text-gray-400 mt-1">1 BTC ≈ ${balanceData.priceFormatted}</p>
                </div>

                <div class="flex space-x-3">
                    <button onclick="CryptoUI.showSendModal()" class="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4 rounded transition">
                        Send ₿
                    </button>
                    <button onclick="CryptoUI.showReceiveModal()" class="flex-1 bg-gray-800 hover:bg-gray-900 text-white font-medium py-2 px-4 rounded transition">
                        Receive
                    </button>
                </div>
            </div>
        `;
    },

    // Render transaction row
    renderTransactionRow(tx) {
        const isReceived = tx.type === 'received' || tx.type === 'deposit';
        const amountColor = isReceived ? 'text-green-600' : 'text-red-600';
        const amountPrefix = isReceived ? '+' : '-';
        
        return `
            <tr class="hover:bg-gray-50 transition">
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${new Date(tx.createdAt).toLocaleDateString()}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 py-1 rounded text-xs font-medium ${tx.status === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">
                        ${tx.status}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="${amountColor} font-mono font-medium">
                        ${amountPrefix}${tx.btcAmountFormatted} BTC
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-gray-500 text-sm">
                    ${tx.usdAmountFormatted || '—'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap font-mono text-xs text-gray-400">
                    ${tx.addressFrom || tx.addressTo || '—'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-center">
                    <span class="inline-flex items-center justify-center w-6 h-6 rounded-full ${isReceived ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}">
                        ${CryptoUI.getTypeIcon(tx.type)}
                    </span>
                </td>
            </tr>
        `;
    },

    // Show send modal
    showSendModal() {
        const modal = document.createElement('div');
        modal.id = 'sendBTCModal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-bold text-gray-800">Send Bitcoin</h3>
                    <button onclick="this.closest('.fixed').remove()" class="text-gray-500 hover:text-gray-700">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
                
                <form id="sendBTCForm" onsubmit="return CryptoUI.handleSend(event)">
                    <div class="mb-4">
                        <label class="block text-gray-700 text-sm font-medium mb-2">Recipient BTC Address</label>
                        <input type="text" name="toAddress" required
                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-mono text-sm"
                            placeholder="1A1zP1eP5eGD5X7d4...">
                        <p class="text-xs text-gray-500 mt-1">Enter a valid Bitcoin address starting with 1, 3, or bc1</p>
                    </div>
                    
                    <div class="mb-4">
                        <label class="block text-gray-700 text-sm font-medium mb-2">Amount (BTC)</label>
                        <input type="number" name="amount" required step="0.00000001" min="0.00000001"
                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                            placeholder="0.00000000">
                    </div>
                    
                    <div class="mb-4 p-3 bg-gray-50 rounded-lg">
                        <div class="flex justify-between text-sm">
                            <span class="text-gray-500">USD Equivalent:</span>
                            <span class="font-medium" id="sendUsdEquivalent">—</span>
                        </div>
                    </div>
                    
                    <div id="sendError" class="mb-4 text-red-600 text-sm hidden"></div>
                    <div id="sendSuccess" class="mb-4 text-green-600 text-sm hidden"></div>
                    
                    <div class="flex space-x-3">
                        <button type="button" onclick="this.closest('.fixed').remove()" 
                            class="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded transition">
                            Cancel
                        </button>
                        <button type="submit" 
                            class="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4 rounded transition">
                            Send BTC
                        </button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Add amount input listener for USD conversion
        const amountInput = modal.querySelector('input[name="amount"]');
        amountInput.addEventListener('input', async (e) => {
            const btcPrice = await CryptoService.getPrice();
            if (btcPrice) {
                const usd = parseFloat(e.target.value) * btcPrice.price;
                document.getElementById('sendUsdEquivalent').textContent = `$${usd.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
            }
        });
    },

    // Handle send form submit
    async handleSend(event) {
        event.preventDefault();
        const form = event.target;
        const toAddress = form.toAddress.value;
        const amount = form.amount.value;
        
        const errorDiv = document.getElementById('sendError');
        const successDiv = document.getElementById('sendSuccess');
        const submitBtn = form.querySelector('button[type="submit"]');
        
        errorDiv.classList.add('hidden');
        successDiv.classList.add('hidden');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending...';
        
        try {
            const result = await CryptoService.sendBTC(toAddress, amount);
            
            if (result) {
                successDiv.textContent = `Successfully sent ${amount} BTC! Transaction: ${result.txHash}`;
                successDiv.classList.remove('hidden');
                
                setTimeout(() => {
                    document.getElementById('sendBTCModal')?.remove();
                    // Refresh balance if on dashboard
                    if (typeof loadDashboardData === 'function') {
                        loadDashboardData();
                    }
                }, 2000);
            } else {
                throw new Error('Failed to send BTC');
            }
        } catch (error) {
            errorDiv.textContent = error.message || 'Failed to send BTC. Please try again.';
            errorDiv.classList.remove('hidden');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Send BTC';
        }
        
        return false;
    },

    // Show receive modal
    async showReceiveModal() {
        const addressData = await CryptoService.getReceiveAddress();
        
        if (!addressData) {
            alert('Failed to generate receive address. Please try again.');
            return;
        }
        
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-bold text-gray-800">Receive Bitcoin</h3>
                    <button onclick="this.closest('.fixed').remove()" class="text-gray-500 hover:text-gray-700">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
                
                <div class="text-center mb-4">
                    <img src="${addressData.qrCode}" alt="QR Code" class="w-48 h-48 mx-auto rounded-lg">
                </div>
                
                <div class="mb-4">
                    <label class="block text-gray-700 text-sm font-medium mb-2">Your BTC Address</label>
                    <div class="flex space-x-2">
                        <input type="text" value="${addressData.address}" readonly
                            class="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm">
                        <button onclick="navigator.clipboard.writeText('${addressData.address}'); this.textContent='Copied!'"
                            class="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium">
                            Copy
                        </button>
                    </div>
                </div>
                
                <div class="p-3 bg-blue-50 rounded-lg">
                    <p class="text-sm text-blue-800">
                        <strong>Note:</strong> Only send Bitcoin (BTC) to this address. Sending other cryptocurrencies may result in permanent loss.
                    </p>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    // Initialize crypto section on dashboard
    async initDashboard() {
        const walletContainer = document.getElementById('cryptoWallet');
        if (!walletContainer) return;
        
        // Show loading state
        walletContainer.innerHTML = CryptoUI.renderWalletCard(null);
        
        // Load balance
        const balanceData = await CryptoService.getBalance();
        
        if (balanceData) {
            walletContainer.innerHTML = CryptoUI.renderWalletCard(balanceData);
        }
    },

    // Initialize transactions table
    async initTransactions() {
        const txContainer = document.getElementById('cryptoTransactionsBody');
        if (!txContainer) return;
        
        const result = await CryptoService.getTransactions(20, 0);
        
        if (result && result.data.length > 0) {
            txContainer.innerHTML = result.data.map(tx => CryptoUI.renderTransactionRow(tx)).join('');
        } else {
            txContainer.innerHTML = `
                <tr>
                    <td colspan="6" class="px-6 py-8 text-center text-gray-500">
                        <div class="text-4xl mb-2">₿</div>
                        <p>No Bitcoin transactions yet</p>
                    </td>
                </tr>
            `;
        }
    }
};

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Initialize based on current page
    if (document.getElementById('cryptoWallet')) {
        CryptoUI.initDashboard();
    }
    
    if (document.getElementById('cryptoTransactionsBody')) {
        CryptoUI.initTransactions();
    }
});

// Export for global use
window.CryptoService = CryptoService;
window.CryptoUI = CryptoUI;
