const mongoose = require('mongoose');
const crypto = require('crypto');

const subscriberSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    name: {
        type: String,
        trim: true,
        default: ''
    },
    subscribedAt: {
        type: Date,
        default: Date.now
    },
    isActive: {
        type: Boolean,
        default: true
    },
    // Source of subscription
    source: {
        type: String,
        enum: ['newsletter', 'registration', 'manual'],
        default: 'newsletter'
    },
    // Notification preferences
    preferences: {
        newIPO: { type: Boolean, default: true },
        ipoStatusChange: { type: Boolean, default: true },
        gmpUpdates: { type: Boolean, default: true },
        allotmentStatus: { type: Boolean, default: true },
        dailyDigest: { type: Boolean, default: true }
    },
    // Unsubscribe token for one-click unsubscribe
    unsubscribeToken: {
        type: String,
        unique: true,
        default: function () {
            return crypto.randomBytes(32).toString('hex');
        }
    },
    // Tracking
    lastNotificationSent: {
        type: Date,
        default: null
    },
    notificationCount: {
        type: Number,
        default: 0
    },
    // User reference (if registered user)
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    }
});

// Index for efficient queries
subscriberSchema.index({ isActive: 1, 'preferences.dailyDigest': 1 });

module.exports = mongoose.model('Subscriber', subscriberSchema);
