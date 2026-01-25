const mongoose = require('mongoose');

const ipoSchema = new mongoose.Schema({
    companyName: {
        type: String,
        required: true,
        trim: true
    },
    companyLogo: {
        type: String,
        default: ''
    },
    category: {
        type: String,
        enum: ['Mainboard', 'SME'],
        required: true
    },
    sector: {
        type: String,
        required: true
    },

    // Price Details
    priceRange: {
        min: { type: Number, required: true },
        max: { type: Number, required: true }
    },
    lotSize: {
        type: Number,
        required: true
    },
    minInvestment: {
        type: Number,
        required: true
    },

    // Dates
    openDate: {
        type: Date,
        required: true
    },
    closeDate: {
        type: Date,
        required: true
    },
    allotmentDate: {
        type: Date,
        required: true
    },
    listingDate: {
        type: Date,
        required: true
    },

    // Status
    status: {
        type: String,
        enum: ['upcoming', 'open', 'closed', 'listed'],
        default: 'upcoming'
    },

    // Subscription Data
    subscription: {
        retail: { type: Number, default: 0 },
        nii: { type: Number, default: 0 },
        qib: { type: Number, default: 0 },
        shareholder: { type: Number, default: 0 },
        total: { type: Number, default: 0 },
        lastUpdated: { type: Date, default: Date.now }
    },

    // Detailed Subscription Data (Application-wise)
    subscriptionDetails: {
        sharesOffered: {
            qib: { type: Number, default: 0 },
            nii: { type: Number, default: 0 },
            retail: { type: Number, default: 0 },
            shareholder: { type: Number, default: 0 }
        },
        sharesSubscribed: {
            qib: { type: Number, default: 0 },
            nii: { type: Number, default: 0 },
            retail: { type: Number, default: 0 },
            shareholder: { type: Number, default: 0 }
        },
        qib: {
            offered: { type: Number, default: 0 },
            received: { type: Number, default: 0 }
        },
        nii: {
            offered: { type: Number, default: 0 },
            received: { type: Number, default: 0 }
        },
        retail: {
            offered: { type: Number, default: 0 },
            received: { type: Number, default: 0 }
        },
        shareholder: {
            offered: { type: Number, default: 0 },
            received: { type: Number, default: 0 }
        }
    },

    // GMP Data
    gmp: [{
        value: { type: Number, required: true },
        percentage: { type: Number },
        date: { type: Date, default: Date.now }
    }],

    // Listing Performance
    listingPrice: {
        type: Number,
        default: null
    },
    listingGain: {
        amount: { type: Number },
        percentage: { type: Number }
    },

    // Company Details
    companyDescription: {
        type: String,
        default: ''
    },
    financials: {
        revenue: { type: Number },
        profit: { type: Number },
        peRatio: { type: Number }
    },

    // Issue Details
    issueSize: {
        type: Number,
        required: true
    },
    faceValue: {
        type: Number,
        required: true
    },

    // Lead Managers
    leadManagers: [{
        type: String
    }],
    registrar: {
        type: String,
        required: true
    },
    allotmentLink: {
        type: String, // Direct link to registrar allotment page
        default: ''
    },

    // Recommendation
    recommendation: {
        type: String,
        enum: ['Subscribe', 'Avoid', 'Neutral', ''],
        default: ''
    },
    recommendationNote: {
        type: String,
        default: ''
    },

    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Auto-update status based on dates
// Auto-update status based on dates
// Auto-update status based on dates
ipoSchema.pre('save', async function () {
    const now = new Date();

    // If listing price is set, it is definitely listed, regardless of date
    if (this.listingPrice) {
        this.status = 'listed';
    } else {
        // Otherwise, follow date logic
        if (this.listingDate && now >= this.listingDate) {
            this.status = 'listed';
        } else if (this.closeDate && now > this.closeDate) {
            this.status = 'closed';
        } else if (this.openDate && now >= this.openDate && now <= this.closeDate) {
            this.status = 'open';
        } else if (this.openDate && now < this.openDate) {
            this.status = 'upcoming';
        }
    }

    this.updatedAt = Date.now();
});

module.exports = mongoose.model('IPO', ipoSchema);
