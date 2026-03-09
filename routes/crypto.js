const express = require('express');
const { executeQuery } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const axios = require('axios');

const router = express.Router();

// Current BTC price (fallback if API fails)
const FALLBACK_BTC_PRICE = 70000;

// Get current BTC/USD price
router.get('/price', async (req, res) => {
    try {
        // Try to get price from CoinGecko API (free, no API key needed)
        let btcPrice = FALLBACK_BTC_PRICE;
        
        try {
            const response = await axios.get(
                'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
                { timeout: 5000 }
            );
            if (response.data && response.data.bitcoin) {
                btcPrice = response.data.bitcoin.usd;
            }
        } catch (apiError) {
            console.log('Using fallback BTC price:', FALLBACK_BTC_PRICE);
        }

        // Try to get last stored price from database
        try {
            const prices = await executeQuery(
                'SELECT usd_price FROM crypto_prices ORDER BY created_at DESC LIMIT 1'
            );
            if (prices.length > 0) {
                // Store the API price in database for future reference
                await executeQuery(
                    'INSERT INTO crypto_prices (currency, usd_price) VALUES (?, ?)',
                    ['BTC', btcPrice]
                );
            }
        } catch (dbError) {
            // Table might not exist, ignore
        }

        res.json({
            success: true,
            data: {
                currency: 'BTC',
                symbol: '₿',
                price: btcPrice,
                priceFormatted: `$${btcPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
                lastUpdated: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Get BTC price error:', error);
        res.status(500).json({ success: false, error: 'Failed to get BTC price' });
    }
});

// Get BTC balance for user
router.get('/balance', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // First, ensure the columns exist
        try {
            await executeQuery('SELECT btc_balance FROM accounts LIMIT 1');
        } catch (e) {
            // Columns don't exist, create them
            console.log('Creating BTC columns...');
            await executeQuery('ALTER TABLE accounts ADD COLUMN btc_balance DECIMAL(16,8) DEFAULT 0.00000000');
            await executeQuery('ALTER TABLE accounts ADD COLUMN btc_address VARCHAR(255)');
            await executeQuery('ALTER TABLE accounts ADD COLUMN last_btc_price DECIMAL(16,2)');
            await executeQuery('ALTER TABLE accounts ADD COLUMN is_crypto BOOLEAN DEFAULT FALSE');
            await executeQuery('ALTER TABLE accounts ADD COLUMN crypto_currency VARCHAR(10)');
        }
        
        // Ensure btc_transactions table exists
        try {
            await executeQuery('SELECT id FROM btc_transactions LIMIT 1');
        } catch (e) {
            console.log('Creating btc_transactions table...');
            await executeQuery(`
                CREATE TABLE IF NOT EXISTS btc_transactions (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    account_id INT NOT NULL,
                    tx_hash VARCHAR(255),
                    btc_amount DECIMAL(16,8) NOT NULL,
                    usd_amount DECIMAL(16,2),
                    btc_price DECIMAL(16,2),
                    address_from VARCHAR(255),
                    address_to VARCHAR(255),
                    type ENUM('received', 'sent', 'exchange', 'deposit', 'withdrawal') DEFAULT 'deposit',
                    status ENUM('pending', 'confirmed', 'failed') DEFAULT 'pending',
                    confirmations INT DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
            `);
        }
        
        // Get user's BTC account
        const accounts = await executeQuery(
            `SELECT id, account_number, btc_balance, btc_address, is_crypto, crypto_currency 
             FROM accounts 
             WHERE user_id = ? AND (is_crypto = TRUE OR account_type = 'crypto' OR account_type = 'btc')`,
            [userId]
        );

        // If no crypto account exists, create one
        let btcAccount = accounts.find(a => a.is_crypto || a.crypto_currency === 'BTC');
        
        if (!btcAccount) {
            // Create a new BTC account for the user
            const btcAddress = generateBTCAddress();
            const accountNumber = 'BTC' + Date.now().toString().slice(-10);
            
            const result = await executeQuery(
                `INSERT INTO accounts (user_id, account_number, account_type, balance, currency, btc_balance, btc_address, is_crypto, crypto_currency, status) 
                 VALUES (?, ?, 'crypto', 0, 'BTC', 0.05, ?, TRUE, 'BTC', 'active')`,
                [userId, accountNumber, btcAddress]
            );
            
            btcAccount = {
                id: result.insertId,
                account_number: accountNumber,
                btc_balance: 0.05,
                btc_address: btcAddress,
                is_crypto: true,
                crypto_currency: 'BTC'
            };

            // Add initial deposit transaction
            await executeQuery(
                `INSERT INTO btc_transactions (account_id, btc_amount, usd_amount, btc_price, address_to, type, status, confirmations) 
                 VALUES (?, 0.05, 3500, 70000, ?, 'deposit', 'confirmed', 6)`,
                [btcAccount.id, btcAddress]
            );
        }

        // Get current BTC price
        let btcPrice = FALLBACK_BTC_PRICE;
        try {
            const response = await axios.get(
                'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
                { timeout: 5000 }
            );
            if (response.data && response.data.bitcoin) {
                btcPrice = response.data.bitcoin.usd;
            }
        } catch (e) {
            // Use fallback
        }

        const btcBalance = parseFloat(btcAccount.btc_balance) || 0;
        const usdValue = btcBalance * btcPrice;

        res.json({
            success: true,
            data: {
                accountId: btcAccount.id,
                accountNumber: btcAccount.account_number,
                btcBalance: btcBalance,
                btcBalanceFormatted: btcBalance.toFixed(8),
                btcAddress: btcAccount.btc_address,
                usdValue: usdValue,
                usdValueFormatted: `$${usdValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
                currency: 'BTC',
                pricePerBTC: btcPrice,
                priceFormatted: `$${btcPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
            }
        });
    } catch (error) {
        console.error('Get BTC balance error:', error);
        res.status(500).json({ success: false, error: 'Failed to get BTC balance' });
    }
});

// Get BTC transaction history
router.get('/transactions', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const limit = parseInt(req.query.limit) || 10;
        const offset = parseInt(req.query.offset) || 0;

        // Get user's crypto accounts
        const accounts = await executeQuery(
            'SELECT id FROM accounts WHERE user_id = ? AND is_crypto = TRUE',
            [userId]
        );

        if (accounts.length === 0) {
            return res.json({
                success: true,
                data: [],
                pagination: { page: 1, limit, total: 0, pages: 0 }
            });
        }

        const accountIds = accounts.map(a => a.id);
        const placeholders = accountIds.map(() => '?').join(',');

        // Get transactions
        const transactions = await executeQuery(
            `SELECT bt.*, a.account_number 
             FROM btc_transactions bt
             JOIN accounts a ON bt.account_id = a.id
             WHERE bt.account_id IN (${placeholders})
             ORDER BY bt.created_at DESC 
             LIMIT ? OFFSET ?`,
            [...accountIds, limit, offset]
        );

        // Get total count
        const countResult = await executeQuery(
            `SELECT COUNT(*) as total FROM btc_transactions WHERE account_id IN (${placeholders})`,
            accountIds
        );

        const total = countResult[0].total;

        // Format transactions
        const formattedTransactions = transactions.map(tx => ({
            id: tx.id,
            txHash: tx.tx_hash || `tx-${tx.id}`,
            btcAmount: parseFloat(tx.btc_amount),
            btcAmountFormatted: parseFloat(tx.btc_amount).toFixed(8),
            usdAmount: tx.usd_amount ? parseFloat(tx.usd_amount) : null,
            usdAmountFormatted: tx.usd_amount ? `$${parseFloat(tx.usd_amount).toLocaleString()}` : null,
            btcPrice: tx.btc_price,
            addressFrom: tx.address_from ? truncateBTCAddress(tx.address_from) : null,
            addressTo: tx.address_to ? truncateBTCAddress(tx.address_to) : null,
            type: tx.type,
            status: tx.status,
            confirmations: tx.confirmations,
            createdAt: tx.created_at
        }));

        res.json({
            success: true,
            data: formattedTransactions,
            pagination: {
                page: Math.floor(offset / limit) + 1,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get BTC transactions error:', error);
        res.status(500).json({ success: false, error: 'Failed to get BTC transactions' });
    }
});

// Generate BTC receive address
router.post('/receive', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        // Get or create BTC address
        const accounts = await executeQuery(
            'SELECT id, btc_address FROM accounts WHERE user_id = ? AND is_crypto = TRUE',
            [userId]
        );

        let btcAddress;
        let accountId;

        if (accounts.length > 0 && accounts[0].btc_address) {
            btcAddress = accounts[0].btc_address;
            accountId = accounts[0].id;
        } else {
            // Generate new address
            btcAddress = generateBTCAddress();
            
            if (accounts.length > 0) {
                accountId = accounts[0].id;
                await executeQuery(
                    'UPDATE accounts SET btc_address = ? WHERE id = ?',
                    [btcAddress, accountId]
                );
            } else {
                // Create new account
                const accountNumber = 'BTC' + Date.now().toString().slice(-10);
                const result = await executeQuery(
                    `INSERT INTO accounts (user_id, account_number, account_type, balance, currency, btc_balance, btc_address, is_crypto, crypto_currency, status) 
                     VALUES (?, ?, 'crypto', 0, 'BTC', 0, ?, TRUE, 'BTC', 'active')`,
                    [userId, accountNumber, btcAddress]
                );
                accountId = result.insertId;
            }
        }

        res.json({
            success: true,
            data: {
                address: btcAddress,
                truncated: truncateBTCAddress(btcAddress),
                qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${btcAddress}`
            }
        });
    } catch (error) {
        console.error('Generate BTC address error:', error);
        res.status(500).json({ success: false, error: 'Failed to generate BTC address' });
    }
});

// Send BTC (simulated - in production would integrate with real BTC network)
router.post('/send', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { toAddress, amount } = req.body;

        // Validate input
        if (!toAddress || !amount) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        if (amount <= 0) {
            return res.status(400).json({ success: false, error: 'Invalid amount' });
        }

        // Validate BTC address format (basic check)
        if (!/^(1|3|bc1)[a-zA-HJ-NP-Z0-9]{25,62}$/.test(toAddress)) {
            return res.status(400).json({ success: false, error: 'Invalid Bitcoin address' });
        }

        // Get user's BTC account
        const accounts = await executeQuery(
            'SELECT id, btc_balance, btc_address FROM accounts WHERE user_id = ? AND is_crypto = TRUE',
            [userId]
        );

        if (accounts.length === 0) {
            return res.status(400).json({ success: false, error: 'No BTC account found' });
        }

        const account = accounts[0];
        const balance = parseFloat(account.btc_balance) || 0;

        if (balance < amount) {
            return res.status(400).json({ success: false, error: 'Insufficient BTC balance' });
        }

        // Get current BTC price
        let btcPrice = FALLBACK_BTC_PRICE;
        try {
            const response = await axios.get(
                'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
                { timeout: 5000 }
            );
            if (response.data && response.data.bitcoin) {
                btcPrice = response.data.bitcoin.usd;
            }
        } catch (e) {
            // Use fallback
        }

        const usdValue = amount * btcPrice;
        const txHash = generateTXHash();

        // Deduct from balance
        await executeQuery(
            'UPDATE accounts SET btc_balance = btc_balance - ? WHERE id = ?',
            [amount, account.id]
        );

        // Record transaction
        await executeQuery(
            `INSERT INTO btc_transactions (account_id, tx_hash, btc_amount, usd_amount, btc_price, address_from, address_to, type, status, confirmations) 
             VALUES (?, ?, ?, ?, ?, ?, ?, 'sent', 'pending', 0)`,
            [account.id, txHash, amount, usdValue, btcPrice, account.btc_address, toAddress]
        );

        // Simulate confirmation after delay (in production, would wait for real confirmations)
        setTimeout(async () => {
            try {
                await executeQuery(
                    'UPDATE btc_transactions SET status = ?, confirmations = 6 WHERE tx_hash = ?',
                    ['confirmed', txHash]
                );
            } catch (e) {
                console.log('Failed to update tx confirmation:', e.message);
            }
        }, 10000);

        res.json({
            success: true,
            data: {
                txHash,
                amount: amount,
                amountFormatted: amount.toFixed(8),
                toAddress: truncateBTCAddress(toAddress),
                usdValue: usdValue,
                usdValueFormatted: `$${usdValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
                status: 'pending',
                message: 'BTC sent successfully. Transaction is pending confirmation.'
            }
        });
    } catch (error) {
        console.error('Send BTC error:', error);
        res.status(500).json({ success: false, error: 'Failed to send BTC' });
    }
});

// Helper function to generate a fake BTC address (for demo)
function generateBTCAddress() {
    const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    let address = '1'; // Start with 1 (P2PKH)
    for (let i = 0; i < 33; i++) {
        address += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return address;
}

// Helper function to generate a fake TX hash
function generateTXHash() {
    const chars = '0123456789ABCDEF';
    let hash = '';
    for (let i = 0; i < 64; i++) {
        hash += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return hash;
}

// Helper function to truncate BTC address for display
function truncateBTCAddress(address) {
    if (!address) return '';
    if (address.length <= 12) return address;
    return address.slice(0, 6) + '...' + address.slice(-4);
}

module.exports = router;
