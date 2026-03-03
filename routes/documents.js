/**
 * Investment Banking Platform - Documents Routes
 * Handles account statements, tax documents, and secure document storage
 */

const express = require('express');
const router = express.Router();
const { executeQuery, beginTransaction, commit, rollback } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Generate document ID
function generateDocumentId() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `DOC${timestamp}${random}`;
}

// ============================================
// DOCUMENTS LIST
// ============================================

/**
 * GET /api/documents
 * Get all documents for user
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { type, year, account_id, limit = 50, offset = 0 } = req.query;
        
        let query = `
            SELECT 
                d.*,
                a.account_name,
                a.account_number
            FROM documents d
            LEFT JOIN accounts a ON d.account_id = a.id
            WHERE d.user_id = ?
        `;
        const params = [userId];
        
        if (type) {
            query += ' AND d.document_type = ?';
            params.push(type);
        }
        
        if (year) {
            query += ' AND YEAR(d.document_date) = ?';
            params.push(year);
        }
        
        if (account_id) {
            query += ' AND d.account_id = ?';
            params.push(account_id);
        }
        
        query += ' ORDER BY d.document_date DESC, d.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));
        
        const documents = await executeQuery(query, params);
        
        res.json({ success: true, data: documents });
    } catch (error) {
        console.error('Get documents error:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve documents' });
    }
});

/**
 * GET /api/documents/types
 * Get available document types
 */
router.get('/types', authenticateToken, async (req, res) => {
    try {
        const types = [
            { code: 'statement', name: 'Account Statement', description: 'Monthly account statements' },
            { code: 'tax_1099', name: '1099 Form', description: 'Tax reporting for interest/dividends' },
            { code: 'tax_1098', name: '1098 Form', description: 'Mortgage interest statement' },
            { code: 'tax_5498', name: '5498 Form', description: 'IRA contribution information' },
            { code: 'confirmation', name: 'Trade Confirmation', description: 'Trade execution confirmations' },
            { code: 'prospectus', name: 'Prospectus', description: 'Investment prospectuses' },
            { code: 'agreement', name: 'Agreement', description: 'Account agreements and contracts' },
            { code: 'notice', name: 'Notice', description: 'Important account notices' },
            { code: 'correspondence', name: 'Correspondence', description: 'Secure messages and letters' }
        ];
        
        res.json({ success: true, data: types });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to retrieve document types' });
    }
});

/**
 * GET /api/documents/summary
 * Get documents summary by type and year
 */
router.get('/summary', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const summary = await executeQuery(`
            SELECT 
                document_type,
                YEAR(document_date) as year,
                COUNT(*) as count,
                MAX(document_date) as latest_date
            FROM documents
            WHERE user_id = ?
            GROUP BY document_type, YEAR(document_date)
            ORDER BY year DESC, document_type
        `, [userId]);
        
        const years = await executeQuery(`
            SELECT DISTINCT YEAR(document_date) as year
            FROM documents
            WHERE user_id = ?
            ORDER BY year DESC
        `, [userId]);
        
        res.json({ 
            success: true, 
            data: { 
                summary,
                years: years.map(y => y.year)
            } 
        });
    } catch (error) {
        console.error('Get documents summary error:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve documents summary' });
    }
});

// ============================================
// STATEMENTS
// ============================================

/**
 * GET /api/documents/statements
 * Get account statements
 */
router.get('/statements', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { account_id, year, month, limit = 24, offset = 0 } = req.query;
        
        let query = `
            SELECT 
                d.*,
                a.account_name,
                a.account_number
            FROM documents d
            LEFT JOIN accounts a ON d.account_id = a.id
            WHERE d.user_id = ? AND d.document_type = 'statement'
        `;
        const params = [userId];
        
        if (account_id) {
            query += ' AND d.account_id = ?';
            params.push(account_id);
        }
        
        if (year) {
            query += ' AND YEAR(d.document_date) = ?';
            params.push(year);
        }
        
        if (month) {
            query += ' AND MONTH(d.document_date) = ?';
            params.push(month);
        }
        
        query += ' ORDER BY d.document_date DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));
        
        const statements = await executeQuery(query, params);
        
        res.json({ success: true, data: statements });
    } catch (error) {
        console.error('Get statements error:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve statements' });
    }
});

/**
 * GET /api/documents/statements/available
 * Get available statement periods
 */
router.get('/statements/available', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { account_id } = req.query;
        
        let query = `
            SELECT 
                YEAR(document_date) as year,
                MONTH(document_date) as month,
                COUNT(*) as count
            FROM documents
            WHERE user_id = ? AND document_type = 'statement'
        `;
        const params = [userId];
        
        if (account_id) {
            query += ' AND account_id = ?';
            params.push(account_id);
        }
        
        query += ' GROUP BY YEAR(document_date), MONTH(document_date) ORDER BY year DESC, month DESC';
        
        const periods = await executeQuery(query, params);
        
        res.json({ success: true, data: periods });
    } catch (error) {
        console.error('Get available periods error:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve available periods' });
    }
});

// ============================================
// TAX DOCUMENTS
// ============================================

/**
 * GET /api/documents/tax
 * Get tax documents
 */
router.get('/tax', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { year, form_type } = req.query;
        
        let query = `
            SELECT 
                d.*,
                a.account_name,
                a.account_number
            FROM documents d
            LEFT JOIN accounts a ON d.account_id = a.id
            WHERE d.user_id = ? AND d.document_type LIKE 'tax_%'
        `;
        const params = [userId];
        
        if (year) {
            query += ' AND YEAR(d.document_date) = ?';
            params.push(year);
        }
        
        if (form_type) {
            query += ' AND d.document_type = ?';
            params.push(`tax_${form_type}`);
        }
        
        query += ' ORDER BY d.document_date DESC';
        
        const documents = await executeQuery(query, params);
        
        // Group by tax year
        const grouped = documents.reduce((acc, doc) => {
            const taxYear = new Date(doc.document_date).getFullYear();
            if (!acc[taxYear]) acc[taxYear] = [];
            acc[taxYear].push(doc);
            return acc;
        }, {});
        
        res.json({ success: true, data: { documents, grouped } });
    } catch (error) {
        console.error('Get tax documents error:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve tax documents' });
    }
});

/**
 * GET /api/documents/tax/years
 * Get available tax years
 */
router.get('/tax/years', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const years = await executeQuery(`
            SELECT 
                YEAR(document_date) as tax_year,
                document_type,
                COUNT(*) as document_count,
                MIN(document_date) as earliest,
                MAX(document_date) as latest
            FROM documents
            WHERE user_id = ? AND document_type LIKE 'tax_%'
            GROUP BY YEAR(document_date), document_type
            ORDER BY tax_year DESC
        `, [userId]);
        
        const taxYears = years.reduce((acc, item) => {
            if (!acc[item.tax_year]) {
                acc[item.tax_year] = { year: item.tax_year, forms: [] };
            }
            acc[item.tax_year].forms.push({
                type: item.document_type,
                count: item.document_count
            });
            return acc;
        }, {});
        
        res.json({ success: true, data: Object.values(taxYears) });
    } catch (error) {
        console.error('Get tax years error:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve tax years' });
    }
});

// ============================================
// TRADE CONFIRMATIONS
// ============================================

/**
 * GET /api/documents/confirmations
 * Get trade confirmations
 */
router.get('/confirmations', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { symbol, year, limit = 50, offset = 0 } = req.query;
        
        let query = `
            SELECT 
                d.*,
                dc.trade_date,
                dc.settlement_date,
                dc.symbol,
                dc.side,
                dc.quantity,
                dc.price,
                dc.total_amount,
                dc.order_id
            FROM documents d
            JOIN document_confirmations dc ON d.id = dc.document_id
            WHERE d.user_id = ? AND d.document_type = 'confirmation'
        `;
        const params = [userId];
        
        if (symbol) {
            query += ' AND dc.symbol = ?';
            params.push(symbol.toUpperCase());
        }
        
        if (year) {
            query += ' AND YEAR(dc.trade_date) = ?';
            params.push(year);
        }
        
        query += ' ORDER BY dc.trade_date DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));
        
        const confirmations = await executeQuery(query, params);
        
        res.json({ success: true, data: confirmations });
    } catch (error) {
        console.error('Get confirmations error:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve trade confirmations' });
    }
});

// ============================================
// DOCUMENT ACTIONS
// ============================================

/**
 * GET /api/documents/:id
 * Get document details
 */
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const document = await executeQuery(`
            SELECT 
                d.*,
                a.account_name,
                a.account_number
            FROM documents d
            LEFT JOIN accounts a ON d.account_id = a.id
            WHERE d.id = ? AND d.user_id = ?
        `, [req.params.id, userId]);
        
        if (document.length === 0) {
            return res.status(404).json({ success: false, message: 'Document not found' });
        }
        
        // Update read status
        await executeQuery(
            'UPDATE documents SET is_read = TRUE, read_at = NOW() WHERE id = ?',
            [req.params.id]
        );
        
        // Log access
        await executeQuery(`
            INSERT INTO document_access_log (document_id, user_id, access_type, accessed_at)
            VALUES (?, ?, 'view', NOW())
        `, [req.params.id, userId]);
        
        res.json({ success: true, data: document[0] });
    } catch (error) {
        console.error('Get document error:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve document' });
    }
});

/**
 * GET /api/documents/:id/download
 * Download document
 */
router.get('/:id/download', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const document = await executeQuery(
            'SELECT * FROM documents WHERE id = ? AND user_id = ?',
            [req.params.id, userId]
        );
        
        if (document.length === 0) {
            return res.status(404).json({ success: false, message: 'Document not found' });
        }
        
        const doc = document[0];
        
        // Log download
        await executeQuery(`
            INSERT INTO document_access_log (document_id, user_id, access_type, accessed_at)
            VALUES (?, ?, 'download', NOW())
        `, [req.params.id, userId]);
        
        // Update download count
        await executeQuery(
            'UPDATE documents SET download_count = download_count + 1 WHERE id = ?',
            [req.params.id]
        );
        
        // In production, serve actual file from storage
        // For now, return download info
        res.json({
            success: true,
            data: {
                document_id: doc.id,
                document_name: doc.document_name,
                file_type: doc.file_type,
                file_size: doc.file_size,
                download_url: `/api/documents/${doc.id}/file`,
                expires_at: new Date(Date.now() + 3600000).toISOString() // 1 hour
            }
        });
    } catch (error) {
        console.error('Download document error:', error);
        res.status(500).json({ success: false, message: 'Failed to download document' });
    }
});

/**
 * POST /api/documents/:id/share
 * Share document via secure link
 */
router.post('/:id/share', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { email, expires_in_hours = 24 } = req.body;
        
        const document = await executeQuery(
            'SELECT * FROM documents WHERE id = ? AND user_id = ?',
            [req.params.id, userId]
        );
        
        if (document.length === 0) {
            return res.status(404).json({ success: false, message: 'Document not found' });
        }
        
        const shareToken = Math.random().toString(36).substring(2, 15) + 
                          Math.random().toString(36).substring(2, 15);
        const expiresAt = new Date(Date.now() + expires_in_hours * 3600000);
        
        const result = await executeQuery(`
            INSERT INTO document_shares (document_id, shared_by_user_id, share_token, 
                shared_with_email, expires_at, created_at)
            VALUES (?, ?, ?, ?, ?, NOW())
        `, [req.params.id, userId, shareToken, email || null, expiresAt]);
        
        await executeQuery(`
            INSERT INTO document_access_log (document_id, user_id, access_type, accessed_at)
            VALUES (?, ?, 'share', NOW())
        `, [req.params.id, userId]);
        
        res.json({
            success: true,
            message: 'Share link created',
            data: {
                share_id: result.insertId,
                share_token: shareToken,
                share_url: `/api/documents/shared/${shareToken}`,
                expires_at: expiresAt.toISOString()
            }
        });
    } catch (error) {
        console.error('Share document error:', error);
        res.status(500).json({ success: false, message: 'Failed to share document' });
    }
});

/**
 * GET /api/documents/shared/:token
 * Access shared document
 */
router.get('/shared/:token', async (req, res) => {
    try {
        const { token } = req.params;
        
        const share = await executeQuery(`
            SELECT 
                ds.*,
                d.document_name,
                d.file_type,
                d.file_size,
                d.document_type
            FROM document_shares ds
            JOIN documents d ON ds.document_id = d.id
            WHERE ds.share_token = ? AND ds.expires_at > NOW()
        `, [token]);
        
        if (share.length === 0) {
            return res.status(404).json({ success: false, message: 'Share link not found or expired' });
        }
        
        // Update access count
        await executeQuery(
            'UPDATE document_shares SET access_count = access_count + 1, last_accessed_at = NOW() WHERE id = ?',
            [share[0].id]
        );
        
        res.json({
            success: true,
            data: {
                document_name: share[0].document_name,
                document_type: share[0].document_type,
                file_type: share[0].file_type,
                file_size: share[0].file_size
            }
        });
    } catch (error) {
        console.error('Access shared document error:', error);
        res.status(500).json({ success: false, message: 'Failed to access shared document' });
    }
});

/**
 * DELETE /api/documents/:id
 * Delete document (if allowed)
 */
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const document = await executeQuery(
            'SELECT * FROM documents WHERE id = ? AND user_id = ?',
            [req.params.id, userId]
        );
        
        if (document.length === 0) {
            return res.status(404).json({ success: false, message: 'Document not found' });
        }
        
        // Only allow deletion of certain document types
        const deletableTypes = ['correspondence', 'notice'];
        if (!deletableTypes.includes(document[0].document_type)) {
            return res.status(400).json({ 
                success: false, 
                message: 'This document type cannot be deleted' 
            });
        }
        
        await executeQuery('DELETE FROM documents WHERE id = ?', [req.params.id]);
        
        res.json({ success: true, message: 'Document deleted successfully' });
    } catch (error) {
        console.error('Delete document error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete document' });
    }
});

// ============================================
// DOCUMENT PREFERENCES
// ============================================

/**
 * GET /api/documents/preferences
 * Get document delivery preferences
 */
router.get('/preferences', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const preferences = await executeQuery(`
            SELECT 
                dp.*,
                a.account_name,
                a.account_number
            FROM document_preferences dp
            LEFT JOIN accounts a ON dp.account_id = a.id
            WHERE dp.user_id = ?
        `, [userId]);
        
        const globalPrefs = preferences.find(p => p.account_id === null) || {
            paperless_enabled: true,
            email_notifications: true,
            sms_notifications: false
        };
        
        res.json({ 
            success: true, 
            data: { 
                global: globalPrefs,
                accounts: preferences.filter(p => p.account_id !== null)
            } 
        });
    } catch (error) {
        console.error('Get document preferences error:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve preferences' });
    }
});

/**
 * PUT /api/documents/preferences
 * Update document delivery preferences
 */
router.put('/preferences', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { 
            paperless_enabled, 
            email_notifications, 
            sms_notifications, 
            account_id 
        } = req.body;
        
        const existing = await executeQuery(
            'SELECT * FROM document_preferences WHERE user_id = ? AND (account_id = ? OR (account_id IS NULL AND ? IS NULL))',
            [userId, account_id, account_id]
        );
        
        if (existing.length > 0) {
            await executeQuery(`
                UPDATE document_preferences 
                SET paperless_enabled = ?, email_notifications = ?, sms_notifications = ?, updated_at = NOW()
                WHERE id = ?
            `, [paperless_enabled ?? true, email_notifications ?? true, sms_notifications ?? false, existing[0].id]);
        } else {
            await executeQuery(`
                INSERT INTO document_preferences (user_id, account_id, paperless_enabled, email_notifications, sms_notifications, created_at)
                VALUES (?, ?, ?, ?, ?, NOW())
            `, [userId, account_id, paperless_enabled ?? true, email_notifications ?? true, sms_notifications ?? false]);
        }
        
        res.json({ success: true, message: 'Preferences updated successfully' });
    } catch (error) {
        console.error('Update preferences error:', error);
        res.status(500).json({ success: false, message: 'Failed to update preferences' });
    }
});

module.exports = router;