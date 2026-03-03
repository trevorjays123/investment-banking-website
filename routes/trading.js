/**
 * Investment Banking Platform - Trading Routes
 * Handles stock trading, portfolio management, watchlists
 */

const express = require('express');
const router = express.Router();
const { executeQuery, beginTransaction, commit, rollback } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Generate order ID
function generateOrderId() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `ORD${timestamp}${random}`;
}

// Mock market data
const mockMarketData = {
    'AAPL': { price: 178.52, change: 2.34, changePercent: 1.33, volume: 52340000 },
    'GOOGL': { price: 141.80, change: -0.45, changePercent: -0.32, volume: 18230000 },
    'MSFT': { price: 378.91, change: 4.12, changePercent: 1.10, volume: 21450000 },
    'AMZN': { price: 178.25, change: 1.89, changePercent: 1.07, volume: 35670000 },
    'TSLA': { price: 248.50, change: -5.23, changePercent: -2.06, volume: 89230000 },
    'META': { price: 505.75, change: 8.45, changePercent: 1.70, volume: 15670000 },
    'NVDA': { price: 875.35, change: 15.67, changePercent: 1.82, volume: 42340000 },
    'JPM': { price: 198.45, change: 2.78, changePercent: 1.42, volume: 8920000 },
    'V': { price: 279.30, change: 1.95, changePercent: 0.70, volume: 6780000 },
    'JNJ': { price: 158.75, change: -0.82, changePercent: -0.51, volume: 5670000 }
};

// Get quote
async function getQuote(symbol) {
    const upperSymbol = symbol.toUpperCase();
    if (mockMarketData[upperSymbol]) {
        return {
            symbol: upperSymbol,
            ...mockMarketData[upperSymbol],
            timestamp: new Date().toISOString(),
            bid: mockMarketData[upperSymbol].price - 0.02,
            ask: mockMarketData[upperSymbol].price + 0.02
        };
    }
    const basePrice = Math.random() * 500 + 50;
    return {
        symbol: upperSymbol,
        price: basePrice.toFixed(2),
        change: ((Math.random() - 0.5) * 10).toFixed(2),
        changePercent: ((Math.random() - 0.5) * 5).toFixed(2),
        volume: Math.floor(Math.random() * 100000000),
        timestamp: new Date().toISOString()
    };
}

// ============================================
// MARKET DATA
// ============================================

router.get('/quote/:symbol', authenticateToken, async (req, res) => {
    try {
        const quote = await getQuote(req.params.symbol);
        res.json({ success: true, data: quote });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to retrieve quote' });
    }
});

router.get('/quotes', authenticateToken, async (req, res) => {
    try {
        const { symbols } = req.query;
        if (!symbols) return res.status(400).json({ success: false, message: 'Symbols required' });
        
        const symbolList = symbols.split(',').map(s => s.trim().toUpperCase());
        const quotes = await Promise.all(symbolList.map(s => getQuote(s)));
        res.json({ success: true, data: quotes });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to retrieve quotes' });
    }
});

router.get('/market-status', authenticateToken, async (req, res) => {
    const now = new Date();
    const isWeekday = now.getDay() > 0 && now.getDay() < 6;
    const hour = now.getHours();
    
    res.json({
        success: true,
        data: {
            isOpen: isWeekday && hour >= 9 && hour < 16,
            market: 'NYSE',
            timezone: 'America/New_York'
        }
    });
});

router.get('/search', authenticateToken, async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) return res.json({ success: true, data: [] });
        
        const searchQuery = q.toUpperCase();
        const results = Object.keys(mockMarketData)
            .filter(s => s.includes(searchQuery))
            .map(s => ({
                symbol: s,
                company_name: `${s} Corporation`,
                exchange: 'NYSE/NASDAQ',
                security_type: 'stock'
            }));
        
        res.json({ success: true, data: results });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Search failed' });
    }
});

// ============================================
// TRADING ACCOUNT
// ============================================

router.get('/account', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const accounts = await executeQuery(
            'SELECT * FROM investment_accounts WHERE user_id = ? AND status = ?',
            [userId, 'active']
        );
        
        if (accounts.length === 0) {
            return res.json({ 
                success: true, 
                data: { cash_balance: 0, total_value: 0, positions: [], buying_power: 0 }
            });
        }
        
        const account = accounts[0];
        
        const positions = await executeQuery(
            'SELECT * FROM investment_positions WHERE account_id = ? AND quantity > 0',
            [account.id]
        );
        
        let totalPositionsValue = 0;
        for (const pos of positions) {
            totalPositionsValue += parseFloat(pos.market_value || 0);
        }
        
        res.json({
            success: true,
            data: {
                account_id: account.id,
                account_number: account.account_number,
                cash_balance: parseFloat(account.cash_balance || 0),
                buying_power: parseFloat(account.buying_power || account.cash_balance || 0),
                total_value: parseFloat(account.cash_balance || 0) + totalPositionsValue,
                positions: positions,
                day_trades_remaining: account.day_trades_remaining || 3
            }
        });
    } catch (error) {
        console.error('Get account error:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve account' });
    }
});

// ============================================
// ORDERS
// ============================================

router.get('/orders', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { status, limit = 50, offset = 0 } = req.query;
        
        let query = `
            SELECT o.* FROM orders o
            JOIN investment_accounts ia ON o.account_id = ia.id
            WHERE ia.user_id = ?
        `;
        const params = [userId];
        
        if (status) {
            query += ' AND o.status = ?';
            params.push(status);
        }
        
        query += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));
        
        const orders = await executeQuery(query, params);
        res.json({ success: true, data: orders });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to retrieve orders' });
    }
});

router.post('/orders', authenticateToken, async (req, res) => {
    const connection = await beginTransaction();
    
    try {
        const userId = req.user.id;
        const { account_id, symbol, order_type, side, quantity, limit_price, time_in_force = 'day' } = req.body;
        
        if (!symbol || !order_type || !side || !quantity || !account_id) {
            await rollback(connection);
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }
        
        const account = await executeQuery(
            'SELECT * FROM investment_accounts WHERE id = ? AND user_id = ? AND status = ?',
            [account_id, userId, 'active']
        );
        
        if (account.length === 0) {
            await rollback(connection);
            return res.status(404).json({ success: false, message: 'Account not found' });
        }
        
        const tradingAccount = account[0];
        const quote = await getQuote(symbol);
        const currentPrice = parseFloat(quote.price);
        const executionPrice = order_type === 'market' ? currentPrice : parseFloat(limit_price || currentPrice);
        const estimatedCost = executionPrice * parseFloat(quantity);
        
        if (side === 'buy') {
            const buyingPower = parseFloat(tradingAccount.buying_power || tradingAccount.cash_balance);
            if (estimatedCost > buyingPower) {
                await rollback(connection);
                return res.status(400).json({ success: false, message: 'Insufficient buying power' });
            }
        }
        
        if (side === 'sell') {
            const position = await executeQuery(
                'SELECT quantity FROM investment_positions WHERE account_id = ? AND symbol = ?',
                [account_id, symbol.toUpperCase()]
            );
            
            if (position.length === 0 || parseFloat(position[0].quantity) < parseFloat(quantity)) {
                await rollback(connection);
                return res.status(400).json({ success: false, message: 'Insufficient shares' });
            }
        }
        
        const orderId = generateOrderId();
        
        const result = await executeQuery(`
            INSERT INTO orders (account_id, order_id, symbol, order_type, side, quantity, 
                limit_price, time_in_force, status, estimated_cost, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, NOW())
        `, [account_id, orderId, symbol.toUpperCase(), order_type, side, quantity, 
            limit_price || null, time_in_force, estimatedCost]);
        
        // Simulate market order execution
        if (order_type === 'market') {
            await executeQuery(`
                UPDATE orders SET status = 'filled', filled_quantity = ?, 
                    average_fill_price = ?, filled_at = NOW() WHERE id = ?
            `, [quantity, currentPrice, result.insertId]);
            
            if (side === 'buy') {
                const existingPos = await executeQuery(
                    'SELECT * FROM investment_positions WHERE account_id = ? AND symbol = ?',
                    [account_id, symbol.toUpperCase()]
                );
                
                if (existingPos.length > 0) {
                    const pos = existingPos[0];
                    const newQty = parseFloat(pos.quantity) + parseFloat(quantity);
                    const newAvgCost = (parseFloat(pos.quantity) * parseFloat(pos.average_cost) + estimatedCost) / newQty;
                    
                    await executeQuery(`
                        UPDATE investment_positions SET quantity = ?, average_cost = ?, 
                            current_price = ?, market_value = ?, updated_at = NOW()
                        WHERE id = ?
                    `, [newQty, newAvgCost, currentPrice, newQty * currentPrice, pos.id]);
                } else {
                    await executeQuery(`
                        INSERT INTO investment_positions (account_id, symbol, quantity, 
                            average_cost, current_price, market_value, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, NOW())
                    `, [account_id, symbol.toUpperCase(), quantity, executionPrice, 
                        currentPrice, quantity * currentPrice]);
                }
                
                await executeQuery(`
                    UPDATE investment_accounts SET cash_balance = cash_balance - ?, 
                        buying_power = buying_power - ?, updated_at = NOW() WHERE id = ?
                `, [estimatedCost, estimatedCost, account_id]);
            } else {
                await executeQuery(`
                    UPDATE investment_positions SET quantity = quantity - ?, 
                        market_value = (quantity - ?) * current_price, updated_at = NOW()
                    WHERE account_id = ? AND symbol = ?
                `, [quantity, quantity, account_id, symbol.toUpperCase()]);
                
                await executeQuery(`
                    UPDATE investment_accounts SET cash_balance = cash_balance + ?, 
                        buying_power = buying_power + ?, updated_at = NOW() WHERE id = ?
                `, [estimatedCost, estimatedCost, account_id]);
            }
            
            // Record transaction
            await executeQuery(`
                INSERT INTO investment_transactions (account_id, transaction_type, symbol, 
                    quantity, price, total_amount, transaction_date, created_at)
                VALUES (?, ?, ?, ?, ?, ?, CURDATE(), NOW())
            `, [account_id, side, symbol.toUpperCase(), quantity, currentPrice, estimatedCost]);
        }
        
        await commit(connection);
        
        res.status(201).json({
            success: true,
            message: 'Order placed successfully',
            data: {
                orderId,
                status: order_type === 'market' ? 'filled' : 'pending',
                symbol: symbol.toUpperCase(),
                side,
                quantity,
                executionPrice: currentPrice,
                estimatedCost
            }
        });
    } catch (error) {
        await rollback(connection);
        console.error('Order error:', error);
        res.status(500).json({ success: false, message: 'Failed to place order' });
    }
});

router.get('/orders/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const order = await executeQuery(`
            SELECT o.* FROM orders o
            JOIN investment_accounts ia ON o.account_id = ia.id
            WHERE o.id = ? AND ia.user_id = ?
        `, [req.params.id, userId]);
        
        if (order.length === 0) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        
        res.json({ success: true, data: order[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to retrieve order' });
    }
});

router.delete('/orders/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const order = await executeQuery(`
            SELECT o.* FROM orders o
            JOIN investment_accounts ia ON o.account_id = ia.id
            WHERE o.id = ? AND ia.user_id = ?
        `, [req.params.id, userId]);
        
        if (order.length === 0) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        
        if (!['pending', 'open'].includes(order[0].status)) {
            return res.status(400).json({ success: false, message: 'Order cannot be cancelled' });
        }
        
        await executeQuery(`UPDATE orders SET status = 'cancelled', cancelled_at = NOW() WHERE id = ?`, [req.params.id]);
        
        res.json({ success: true, message: 'Order cancelled' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to cancel order' });
    }
});

// ============================================
// POSITIONS
// ============================================

router.get('/positions', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const positions = await executeQuery(`
            SELECT ip.* FROM investment_positions ip
            JOIN investment_accounts ia ON ip.account_id = ia.id
            WHERE ia.user_id = ? AND ip.quantity > 0
        `, [userId]);
        
        res.json({ success: true, data: positions });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to retrieve positions' });
    }
});

// ============================================
// WATCHLISTS
// ============================================

router.get('/watchlists', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const watchlists = await executeQuery(`
            SELECT w.*, 
                   GROUP_CONCAT(wi.symbol) as symbols
            FROM watchlists w
            LEFT JOIN watchlist_items wi ON w.id = wi.watchlist_id
            WHERE w.user_id = ?
            GROUP BY w.id
        `, [userId]);
        
        // Parse symbols
        const result = watchlists.map(w => ({
            ...w,
            symbols: w.symbols ? w.symbols.split(',') : []
        }));
        
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to retrieve watchlists' });
    }
});

router.post('/watchlists', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { name } = req.body;
        
        if (!name) {
            return res.status(400).json({ success: false, message: 'Name required' });
        }
        
        const result = await executeQuery(
            'INSERT INTO watchlists (user_id, name, created_at) VALUES (?, ?, NOW())',
            [userId, name]
        );
        
        res.status(201).json({ success: true, data: { id: result.insertId, name, symbols: [] } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to create watchlist' });
    }
});

router.post('/watchlists/:id/items', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { symbol } = req.body;
        
        if (!symbol) {
            return res.status(400).json({ success: false, message: 'Symbol required' });
        }
        
        const watchlist = await executeQuery(
            'SELECT * FROM watchlists WHERE id = ? AND user_id = ?',
            [req.params.id, userId]
        );
        
        if (watchlist.length === 0) {
            return res.status(404).json({ success: false, message: 'Watchlist not found' });
        }
        
        await executeQuery(
            'INSERT IGNORE INTO watchlist_items (watchlist_id, symbol, added_at) VALUES (?, ?, NOW())',
            [req.params.id, symbol.toUpperCase()]
        );
        
        res.json({ success: true, message: 'Symbol added to watchlist' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to add symbol' });
    }
});

router.delete('/watchlists/:id/items/:symbol', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        await executeQuery(`
            DELETE wi FROM watchlist_items wi
            JOIN watchlists w ON wi.watchlist_id = w.id
            WHERE w.id = ? AND w.user_id = ? AND wi.symbol = ?
        `, [req.params.id, userId, req.params.symbol.toUpperCase()]);
        
        res.json({ success: true, message: 'Symbol removed from watchlist' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to remove symbol' });
    }
});

// ============================================
// TRANSACTIONS
// ============================================

router.get('/transactions', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { limit = 50, offset = 0 } = req.query;
        
        const transactions = await executeQuery(`
            SELECT it.* FROM investment_transactions it
            JOIN investment_accounts ia ON it.account_id = ia.id
            WHERE ia.user_id = ?
            ORDER BY it.created_at DESC
            LIMIT ? OFFSET ?
        `, [userId, parseInt(limit), parseInt(offset)]);
        
        res.json({ success: true, data: transactions });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to retrieve transactions' });
    }
});

module.exports = router;