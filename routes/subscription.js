const express = require('express');
const router = express.Router();
const Subscriber = require('../models/Subscriber');
const { body, validationResult } = require('express-validator');

// @route   POST /api/subscription/subscribe
// @desc    Subscribe to newsletter
// @access  Public
router.post('/subscribe', [
    body('email').isEmail().withMessage('Please enter a valid email address')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email } = req.body;

    try {
        let subscriber = await Subscriber.findOne({ email });

        if (subscriber) {
            if (!subscriber.isActive) {
                subscriber.isActive = true;
                await subscriber.save();
                return res.json({ success: true, message: 'Welcome back! You have been resubscribed.' });
            }
            return res.status(400).json({ success: false, message: 'Email is already subscribed.' });
        }

        subscriber = new Subscriber({ email });
        await subscriber.save();

        res.json({ success: true, message: 'Thank you for subscribing!' });
    } catch (error) {
        console.error('Subscription error:', error);
        res.status(500).json({ success: false, message: 'Server error. Please try again later.' });
    }
});

module.exports = router;
