const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { auth } = require('../middleware/auth');
const { validate } = require('../middleware/validator');

// Validation rules
const registerValidation = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long')
];

const loginValidation = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email'),
    body('password')
        .exists()
        .withMessage('Password is required')
];

const otpValidation = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email'),
    body('otp')
        .isLength({ min: 6, max: 6 })
        .isNumeric()
        .withMessage('OTP must be 6 digits')
];

// @route   POST /api/auth/register
// @desc    Register new user
// @access  Public
router.post('/register', registerValidation, validate, authController.register);

// @route   POST /api/auth/verify-otp
// @desc    Verify email with OTP
// @access  Public
router.post('/verify-otp', otpValidation, validate, authController.verifyOTP);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', loginValidation, validate, authController.login);

// @route   POST /api/auth/resend-otp
// @desc    Resend OTP to email
// @access  Public
router.post('/resend-otp',
    [body('email').isEmail().normalizeEmail()],
    validate,
    authController.resendOTP
);

// @route   GET /api/auth/me
// @desc    Get current logged in user
// @access  Private
router.get('/me', auth, authController.getCurrentUser);

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', auth, authController.logout);

// @route   POST /api/auth/forgot-password
// @desc    Send OTP for password reset
// @access  Public
router.post('/forgot-password',
    [body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email')],
    validate,
    authController.forgotPassword
);

// @route   POST /api/auth/reset-password
// @desc    Reset password with OTP
// @access  Public
router.post('/reset-password',
    [
        body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
        body('otp').isLength({ min: 6, max: 6 }).isNumeric().withMessage('OTP must be 6 digits'),
        body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
    ],
    validate,
    authController.resetPassword
);

module.exports = router;

