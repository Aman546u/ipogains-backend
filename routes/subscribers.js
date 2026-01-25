const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Subscriber = require('../models/Subscriber');
const User = require('../models/User');
const notificationService = require('../services/notificationService');

// Subscribe to newsletter
router.post('/subscribe', [
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: errors.array()[0].msg
            });
        }

        const { email, name, source = 'newsletter' } = req.body;

        // Check if already subscribed
        let subscriber = await Subscriber.findOne({ email: email.toLowerCase() });

        if (subscriber) {
            if (subscriber.isActive) {
                return res.status(400).json({
                    success: false,
                    error: 'This email is already subscribed!'
                });
            } else {
                // Reactivate subscription
                subscriber.isActive = true;
                subscriber.subscribedAt = new Date();
                await subscriber.save();

                return res.json({
                    success: true,
                    message: 'Welcome back! Your subscription has been reactivated.'
                });
            }
        }

        // Check if email belongs to a registered user
        const user = await User.findOne({ email: email.toLowerCase() });

        // Create new subscriber
        subscriber = new Subscriber({
            email: email.toLowerCase(),
            name: name || '',
            source,
            userId: user ? user._id : null
        });

        await subscriber.save();

        // Send welcome email
        await notificationService.sendWelcomeEmail(email, subscriber.unsubscribeToken);

        console.log(`✅ New subscriber: ${email} (source: ${source})`);

        res.status(201).json({
            success: true,
            message: 'Successfully subscribed! You will receive IPO updates.'
        });

    } catch (error) {
        console.error('Subscribe error:', error);

        // Handle duplicate key error
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                error: 'This email is already subscribed!'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Failed to subscribe. Please try again.'
        });
    }
});

// Unsubscribe via token (one-click unsubscribe from email)
router.get('/unsubscribe/:token', async (req, res) => {
    try {
        const { token } = req.params;

        const subscriber = await Subscriber.findOne({ unsubscribeToken: token });

        if (!subscriber) {
            return res.send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Unsubscribe - IPOGains</title>
                    <style>
                        body { font-family: Arial, sans-serif; background: #1a1a2e; color: #fff; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
                        .container { text-align: center; padding: 40px; background: #252542; border-radius: 10px; max-width: 400px; }
                        h1 { color: #ef4444; }
                        a { color: #10b981; text-decoration: none; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>❌ Invalid Link</h1>
                        <p>This unsubscribe link is invalid or has expired.</p>
                        <a href="/">← Back to IPOGains</a>
                    </div>
                </body>
                </html>
            `);
        }

        subscriber.isActive = false;
        await subscriber.save();

        console.log(`📭 Unsubscribed: ${subscriber.email}`);

        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Unsubscribed - IPOGains</title>
                <style>
                    body { font-family: Arial, sans-serif; background: #1a1a2e; color: #fff; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
                    .container { text-align: center; padding: 40px; background: #252542; border-radius: 10px; max-width: 400px; }
                    h1 { color: #10b981; }
                    a { color: #10b981; text-decoration: none; }
                    .btn { display: inline-block; padding: 12px 30px; background: #10b981; color: white; text-decoration: none; border-radius: 8px; margin-top: 20px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>✅ Unsubscribed</h1>
                    <p>You have been successfully unsubscribed from IPOGains notifications.</p>
                    <p style="color: #a0a0a0; font-size: 14px;">We're sorry to see you go!</p>
                    <a href="/" class="btn">← Back to IPOGains</a>
                </div>
            </body>
            </html>
        `);

    } catch (error) {
        console.error('Unsubscribe error:', error);
        res.status(500).send('An error occurred. Please try again.');
    }
});

// Update notification preferences
router.put('/preferences/:token', async (req, res) => {
    try {
        const { token } = req.params;
        const { preferences } = req.body;

        const subscriber = await Subscriber.findOne({ unsubscribeToken: token });

        if (!subscriber) {
            return res.status(404).json({
                success: false,
                error: 'Invalid token'
            });
        }

        // Update preferences
        if (preferences) {
            subscriber.preferences = { ...subscriber.preferences, ...preferences };
        }

        await subscriber.save();

        res.json({
            success: true,
            message: 'Preferences updated successfully',
            preferences: subscriber.preferences
        });

    } catch (error) {
        console.error('Update preferences error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update preferences'
        });
    }
});

// Get subscriber stats (admin only)
router.get('/stats', async (req, res) => {
    try {
        const total = await Subscriber.countDocuments();
        const active = await Subscriber.countDocuments({ isActive: true });
        const fromNewsletter = await Subscriber.countDocuments({ source: 'newsletter' });
        const fromRegistration = await Subscriber.countDocuments({ source: 'registration' });

        res.json({
            success: true,
            stats: {
                total,
                active,
                inactive: total - active,
                sources: {
                    newsletter: fromNewsletter,
                    registration: fromRegistration
                }
            }
        });
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get stats'
        });
    }
});

// Check if email is subscribed
router.get('/check/:email', async (req, res) => {
    try {
        const { email } = req.params;
        const subscriber = await Subscriber.findOne({
            email: email.toLowerCase(),
            isActive: true
        });

        res.json({
            success: true,
            isSubscribed: !!subscriber
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to check subscription'
        });
    }
});

module.exports = router;
