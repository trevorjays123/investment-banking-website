const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// Get all notifications for the authenticated user
router.get('/', async (req, res) => {
    try {
        // For demo purposes, return mock notifications
        // In production, you would query from database
        const mockNotifications = [
            {
                id: 1,
                user_id: 1,
                title: 'Welcome to Apex Capital!',
                message: 'Your account has been successfully created.',
                type: 'info',
                is_read: false,
                created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString() // 5 mins ago
            },
            {
                id: 2,
                user_id: 1,
                title: 'Account Verified',
                message: 'Your identity has been verified successfully.',
                type: 'success',
                is_read: false,
                created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString() // 30 mins ago
            },
            {
                id: 3,
                user_id: 1,
                title: 'Security Alert',
                message: 'New login detected from Chrome on Windows.',
                type: 'warning',
                is_read: true,
                created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() // 2 hours ago
            }
        ];

        res.json({ notifications: mockNotifications });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

// Get unread notification count
router.get('/unread', async (req, res) => {
    try {
        // Mock response
        res.json({ unread_count: 2 });
    } catch (error) {
        console.error('Get unread count error:', error);
        res.status(500).json({ error: 'Failed to fetch unread count' });
    }
});

// Mark a specific notification as read
router.post('/:id/read', async (req, res) => {
    try {
        const { id } = req.params;
        // In production, update database
        res.json({ success: true, message: 'Notification marked as read' });
    } catch (error) {
        console.error('Mark notification read error:', error);
        res.status(500).json({ error: 'Failed to mark notification as read' });
    }
});

// Mark all notifications as read
router.post('/mark-all-read', async (req, res) => {
    try {
        // In production, update all notifications for user in database
        res.json({ success: true, message: 'All notifications marked as read' });
    } catch (error) {
        console.error('Mark all read error:', error);
        res.status(500).json({ error: 'Failed to mark all notifications as read' });
    }
});

// Create a new notification (admin/system use)
router.post('/', async (req, res) => {
    try {
        const { user_id, title, message, type = 'info' } = req.body;
        
        // In production, insert into database
        const newNotification = {
            id: Date.now(),
            user_id,
            title,
            message,
            type,
            is_read: false,
            created_at: new Date().toISOString()
        };

        res.status(201).json({ 
            success: true, 
            notification: newNotification 
        });
    } catch (error) {
        console.error('Create notification error:', error);
        res.status(500).json({ error: 'Failed to create notification' });
    }
});

// Delete a notification
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // In production, delete from database
        res.json({ success: true, message: 'Notification deleted' });
    } catch (error) {
        console.error('Delete notification error:', error);
        res.status(500).json({ error: 'Failed to delete notification' });
    }
});

module.exports = router;