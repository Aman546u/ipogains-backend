require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Import database connection
const connectDB = require('./config/database');

// Import constants
const { RATE_LIMIT } = require('./config/constants');

// Import scheduler for notifications
const scheduler = require('./services/scheduler');

const app = express();

// Connect to MongoDB Atlas
connectDB();

// Security middleware
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));

// CORS configuration - Allow frontend to access backend
const corsOptions = {
    origin: process.env.FRONTEND_URL || 'http://localhost:5500',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// Rate limiting (Disabled for development)
/*
const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute window
    max: 5000, 
    message: {
        success: false,
        error: 'Too many requests from this IP, please try again later.'
    }
});
app.use('/api/', limiter);
*/

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/ipos', require('./routes/ipo'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/allotment', require('./routes/allotment'));
app.use('/api/subscription', require('./routes/subscription'));
app.use('/api/subscribers', require('./routes/subscribers'));
app.use('/api/notifications', require('./routes/notifications'));

// Health check route
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Backend API server is running',
        timestamp: new Date().toISOString()
    });
});

// Root route
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'IPOGains Backend API',
        version: '1.0.0',
        endpoints: {
            health: '/api/health',
            auth: '/api/auth',
            ipos: '/api/ipos',
            admin: '/api/admin',
            allotment: '/api/allotment',
            subscription: '/api/subscription',
            subscribers: '/api/subscribers',
            notifications: '/api/notifications'
        }
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    res.status(err.status || 500).json({
        success: false,
        error: err.message || 'Something went wrong!'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found'
    });
});

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
    console.log('');
    console.log('🚀 ═══════════════════════════════════════════════════════');
    console.log('');
    console.log('🚀 ═══════════════════════════════════════════════════════');
    console.log('✅ BACKEND API SERVER STARTED');
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5500'}`);
    console.log('🚀 ═══════════════════════════════════════════════════════');
    console.log('');
    console.log('📍 Available API Routes:');
    console.log(`   🏥 Health Check: http://localhost:${PORT}/api/health`);
    console.log(`   🔐 Auth API: http://localhost:${PORT}/api/auth`);
    console.log(`   📈 IPOs API: http://localhost:${PORT}/api/ipos`);
    console.log(`   ⚙️  Admin API: http://localhost:${PORT}/api/admin`);
    console.log('');
});

// Create default admin user
const createDefaultAdmin = async () => {
    try {
        const User = require('./models/User');
        const bcrypt = require('bcryptjs');

        const adminEmail = process.env.ADMIN_EMAIL || 'admin@ipogains.com';
        const adminExists = await User.findOne({ email: adminEmail });

        if (!adminExists) {
            const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Admin@123', 10);

            const admin = new User({
                email: adminEmail,
                password: hashedPassword,
                role: 'admin',
                isVerified: true
            });

            await admin.save();
            console.log('✅ Default admin user created');
            console.log(`   📧 Email: ${adminEmail}`);
            console.log(`   🔑 Password: ${process.env.ADMIN_PASSWORD || 'Admin@123'}`);
            console.log('   ⚠️  Please change the password after first login!');
            console.log('');
        }
    } catch (error) {
        console.error('❌ Error creating admin:', error.message);
    }
};

// Wait for DB connection then create admin and start scheduler
const mongoose = require('mongoose');
mongoose.connection.once('open', () => {
    createDefaultAdmin();
    // Initialize notification schedulers
    scheduler.initSchedulers();
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
        mongoose.connection.close(false, () => {
            console.log('MongoDB connection closed');
            process.exit(0);
        });
    });
});

module.exports = app;
