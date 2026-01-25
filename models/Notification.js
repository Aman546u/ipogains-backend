const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    // Type of notification
    type: {
        type: String,
        enum: ['new_ipo', 'status_change', 'gmp_update', 'subscription_update', 'allotment_available', 'listing'],
        required: true
    },

    // Reference to IPO
    ipoId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'IPO',
        required: true
    },

    // IPO details for quick access
    ipoName: {
        type: String,
        required: true
    },

    // Change details
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },

    // Old and new values for tracking changes
    previousValue: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    },
    newValue: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    },

    // Status
    isProcessed: {
        type: Boolean,
        default: false
    },
    processedAt: {
        type: Date,
        default: null
    },

    // Statistics
    emailsSent: {
        type: Number,
        default: 0
    },
    emailsFailed: {
        type: Number,
        default: 0
    },

    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Index for finding unprocessed notifications
notificationSchema.index({ isProcessed: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
