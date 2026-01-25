const express = require('express');
const router = express.Router();
const Subscriber = require('../models/Subscriber');
const Notification = require('../models/Notification');
const notificationService = require('../services/notificationService');
const scheduler = require('../services/scheduler');
const { auth, adminAuth } = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(auth, adminAuth);

// Get all subscribers (admin only)
router.get('/subscribers', async (req, res) => {
    try {
        const { page = 1, limit = 20, status = 'all' } = req.query;

        let query = {};
        if (status === 'active') query.isActive = true;
        else if (status === 'inactive') query.isActive = false;

        const subscribers = await Subscriber.find(query)
            .sort({ subscribedAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Subscriber.countDocuments(query);

        res.json({
            success: true,
            subscribers,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get subscribers error:', error);
        res.status(500).json({ success: false, error: 'Failed to get subscribers' });
    }
});

// Get notification history
router.get('/history', async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;

        const notifications = await Notification.find()
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Notification.countDocuments();

        res.json({
            success: true,
            notifications,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ success: false, error: 'Failed to get notifications' });
    }
});

// Trigger daily digest manually
router.post('/trigger-digest', async (req, res) => {
    try {
        const result = await scheduler.triggerDailyDigest();
        res.json({
            success: true,
            message: 'Daily digest triggered',
            result
        });
    } catch (error) {
        console.error('Trigger digest error:', error);
        res.status(500).json({ success: false, error: 'Failed to trigger digest' });
    }
});

// Process pending notifications manually
router.post('/process-notifications', async (req, res) => {
    try {
        const result = await notificationService.processPendingNotifications();
        res.json({
            success: true,
            message: 'Notifications processed',
            result
        });
    } catch (error) {
        console.error('Process notifications error:', error);
        res.status(500).json({ success: false, error: 'Failed to process notifications' });
    }
});

// Send test notification
router.post('/test-notification', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, error: 'Email is required' });
        }

        const template = {
            subject: '🧪 Test Notification - IPOGains',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a2e; color: #fff; padding: 30px; border-radius: 10px;">
                    <h1 style="color: #10b981;">🧪 Test Notification</h1>
                    <p>This is a test notification from IPOGains.</p>
                    <p>If you received this, the email notification system is working correctly!</p>
                    <p style="color: #666; font-size: 12px; margin-top: 20px;">Sent at: ${new Date().toLocaleString('en-IN')}</p>
                </div>
            `
        };

        const result = await notificationService.sendEmail(email, template);

        res.json({
            success: true,
            message: result.skipped ? 'Email service not configured, but would have sent' : 'Test email sent',
            result
        });
    } catch (error) {
        console.error('Test notification error:', error);
        res.status(500).json({ success: false, error: 'Failed to send test notification' });
    }
});

// Get notification stats
router.get('/stats', async (req, res) => {
    try {
        const subscriberStats = {
            total: await Subscriber.countDocuments(),
            active: await Subscriber.countDocuments({ isActive: true }),
            bySource: {
                newsletter: await Subscriber.countDocuments({ source: 'newsletter' }),
                registration: await Subscriber.countDocuments({ source: 'registration' })
            }
        };

        const notificationStats = {
            total: await Notification.countDocuments(),
            processed: await Notification.countDocuments({ isProcessed: true }),
            pending: await Notification.countDocuments({ isProcessed: false }),
            totalEmailsSent: (await Notification.aggregate([
                { $group: { _id: null, total: { $sum: '$emailsSent' } } }
            ]))[0]?.total || 0
        };

        res.json({
            success: true,
            stats: {
                subscribers: subscriberStats,
                notifications: notificationStats,
                emailConfigured: notificationService.isEmailConfigured()
            }
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ success: false, error: 'Failed to get stats' });
    }
});

// Delete subscriber (admin only)
router.delete('/subscribers/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await Subscriber.findByIdAndDelete(id);
        res.json({ success: true, message: 'Subscriber deleted' });
    } catch (error) {
        console.error('Delete subscriber error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete subscriber' });
    }
});

// Export subscribers list
router.get('/subscribers/export', async (req, res) => {
    try {
        const subscribers = await Subscriber.find({ isActive: true })
            .select('email name subscribedAt source')
            .sort({ subscribedAt: -1 });

        // Create CSV
        let csv = 'Email,Name,Subscribed At,Source\n';
        subscribers.forEach(sub => {
            csv += `${sub.email},"${sub.name || ''}",${new Date(sub.subscribedAt).toISOString()},${sub.source}\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=subscribers.csv');
        res.send(csv);
    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ success: false, error: 'Failed to export' });
    }
});

module.exports = router;
