const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Subscriber = require('../models/Subscriber');
const { sendOTP } = require('../utils/email');
const { USER_ROLES, OTP } = require('../config/constants');
const notificationService = require('../services/notificationService');

// Generate OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Generate JWT Token
const generateToken = (userId, role) => {
    return jwt.sign(
        { userId, role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                error: 'User already exists with this email'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);



        let user;

        // Always auto-verify user regardless of email configuration
        user = new User({
            email,
            password: hashedPassword,
            role: USER_ROLES.USER,
            isVerified: true  // Auto-verify
        });

        await user.save();

        // Auto-subscribe user to notifications
        try {
            const existingSubscriber = await Subscriber.findOne({ email: email.toLowerCase() });
            if (!existingSubscriber) {
                const subscriber = new Subscriber({
                    email: email.toLowerCase(),
                    source: 'registration',
                    userId: user._id
                });
                await subscriber.save();
                console.log(`✅ Auto-subscribed new user: ${email}`);
            }
        } catch (subError) {
            console.error('Auto-subscribe error (non-blocking):', subError.message);
        }

        // Generate token immediately
        const token = generateToken(user._id, user.role);

        res.status(201).json({
            success: true,
            message: 'Registration successful! You can now login.',
            requiresOTP: false,
            token,
            user: {
                id: user._id,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error during registration'
        });
    }
};

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
// @access  Public
exports.verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        if (!user.otp || user.otp.code !== otp) {
            return res.status(400).json({
                success: false,
                error: 'Invalid OTP'
            });
        }

        if (new Date() > user.otp.expiresAt) {
            return res.status(400).json({
                success: false,
                error: 'OTP has expired. Please request a new one.'
            });
        }

        // Verify user
        user.isVerified = true;
        user.otp = undefined;
        await user.save();

        // Auto-subscribe verified user to notifications
        try {
            const existingSubscriber = await Subscriber.findOne({ email: user.email.toLowerCase() });
            if (!existingSubscriber) {
                const subscriber = new Subscriber({
                    email: user.email.toLowerCase(),
                    source: 'registration',
                    userId: user._id
                });
                await subscriber.save();
                console.log(`✅ Auto-subscribed verified user: ${user.email}`);
            }
        } catch (subError) {
            console.error('Auto-subscribe error (non-blocking):', subError.message);
        }

        // Generate token
        const token = generateToken(user._id, user.role);

        res.json({
            success: true,
            message: 'Email verified successfully',
            token,
            user: {
                id: user._id,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('OTP verification error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error during verification'
        });
    }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid email or password'
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                error: 'Invalid email or password'
            });
        }

        if (!user.isVerified) {
            // Resend OTP
            const otp = generateOTP();
            const otpExpiry = new Date(Date.now() + OTP.EXPIRE_MINUTES * 60 * 1000);

            user.otp = {
                code: otp,
                expiresAt: otpExpiry
            };
            await user.save();
            await sendOTP(email, otp);

            return res.status(403).json({
                success: false,
                error: 'Email not verified. New OTP sent to your email.',
                requiresVerification: true,
                userId: user._id
            });
        }

        const token = generateToken(user._id, user.role);

        // Send login notification (non-blocking)
        notificationService.sendLoginNotification(user).catch(err =>
            console.error('Login notification error:', err.message)
        );

        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error during login'
        });
    }
};

// @desc    Resend OTP
// @route   POST /api/auth/resend-otp
// @access  Public
exports.resendOTP = async (req, res) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        const otp = generateOTP();
        const otpExpiry = new Date(Date.now() + OTP.EXPIRE_MINUTES * 60 * 1000);

        user.otp = {
            code: otp,
            expiresAt: otpExpiry
        };
        await user.save();

        await sendOTP(email, otp);

        res.json({
            success: true,
            message: 'OTP sent successfully to your email'
        });
    } catch (error) {
        console.error('Resend OTP error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error while sending OTP'
        });
    }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
exports.getCurrentUser = async (req, res) => {
    try {
        res.json({
            success: true,
            user: {
                id: req.user._id,
                email: req.user.email,
                role: req.user.role,
                isVerified: req.user.isVerified
            }
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error'
        });
    }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res) => {
    try {
        // In a stateless JWT system, logout is handled client-side
        // But we can add token to blacklist if needed
        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error during logout'
        });
    }
};

// @desc    Forgot password - Send OTP
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'No account found with this email'
            });
        }

        // Generate OTP for password reset
        const otp = generateOTP();
        const otpExpiry = new Date(Date.now() + OTP.EXPIRE_MINUTES * 60 * 1000);

        user.otp = {
            code: otp,
            expiresAt: otpExpiry
        };
        await user.save();

        // Send OTP email
        const emailResult = await sendOTP(email, otp);

        if (!emailResult.success) {
            return res.status(500).json({
                success: false,
                error: `Failed to send OTP email: ${emailResult.error || 'Unknown error'}`
            });
        }

        res.json({
            success: true,
            message: 'Password reset OTP sent to your email',
            email: email
        });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error while processing request'
        });
    }
};

// @desc    Reset password with OTP
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Verify OTP
        if (!user.otp || user.otp.code !== otp) {
            return res.status(400).json({
                success: false,
                error: 'Invalid OTP'
            });
        }

        if (new Date() > user.otp.expiresAt) {
            return res.status(400).json({
                success: false,
                error: 'OTP has expired. Please request a new one.'
            });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password and clear OTP
        user.password = hashedPassword;
        user.otp = undefined;
        await user.save();

        res.json({
            success: true,
            message: 'Password reset successful! You can now login with your new password.'
        });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error while resetting password'
        });
    }
};

