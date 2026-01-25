// Application Constants

module.exports = {
    // IPO Status
    IPO_STATUS: {
        UPCOMING: 'upcoming',
        OPEN: 'open',
        CLOSED: 'closed',
        LISTED: 'listed'
    },

    // IPO Categories
    IPO_CATEGORY: {
        MAINBOARD: 'Mainboard',
        SME: 'SME'
    },

    // User Roles
    USER_ROLES: {
        USER: 'user',
        ADMIN: 'admin'
    },

    // Allotment Status
    ALLOTMENT_STATUS: {
        PENDING: 'pending',
        ALLOTTED: 'allotted',
        NOT_ALLOTTED: 'not_allotted'
    },

    // JWT Configuration
    JWT: {
        EXPIRE: '7d',
        COOKIE_EXPIRE: 7
    },

    // OTP Configuration
    OTP: {
        LENGTH: 6,
        EXPIRE_MINUTES: 10
    },

    // Rate Limiting
    RATE_LIMIT: {
        WINDOW_MS: 15 * 60 * 1000, // 15 minutes
        MAX_REQUESTS: 100
    },

    // Pagination
    PAGINATION: {
        DEFAULT_PAGE: 1,
        DEFAULT_LIMIT: 20,
        MAX_LIMIT: 100
    },

    // Encryption
    ENCRYPTION: {
        ALGORITHM: 'aes-256-cbc',
        IV_LENGTH: 16
    }
};
