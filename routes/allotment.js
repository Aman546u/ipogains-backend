const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const allotmentController = require('../controllers/allotmentController');
const { auth, optionalAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validator');

// Validation rules
const checkAllotmentValidation = [
    body('ipoId')
        .isMongoId()
        .withMessage('Invalid IPO ID')
];

const applyIPOValidation = [
    body('ipoId').isMongoId().withMessage('Invalid IPO ID'),
    body('panCard')
        .isLength({ min: 10, max: 10 })
        .matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)
        .withMessage('Invalid PAN card format'),
    body('applicationNumber').notEmpty().withMessage('Application number is required'),
    body('lotSize').isInt({ min: 1 }).withMessage('Lot size must be a positive number')
];

console.log('✅ Allotment Routes Loaded');

// @route   POST /api/allotment/my-status
// @desc    Update user own application status
// @access  Private
router.post('/my-status', auth, allotmentController.updateUserApplicationStatus);

// @route   POST /api/allotment/check
// @desc    Check allotment status
// @access  Public/Private
router.post('/check', optionalAuth, checkAllotmentValidation, validate, allotmentController.checkAllotment);

// @route   POST /api/allotment/log-external
// @desc    Log external check
// @access  Private
router.post('/log-external', auth, allotmentController.logExternalCheck);

// @route   POST /api/allotment/apply
// @desc    Save IPO application
// @access  Private
router.post('/apply', auth, applyIPOValidation, validate, allotmentController.applyForIPO);

// @route   GET /api/allotment/my-applications
// @desc    Get user's IPO applications
// @access  Private
router.get('/my-applications', auth, allotmentController.getMyApplications);

// @route   DELETE /api/allotment/:applicationId
// @desc    Delete application
// @access  Private
router.delete('/:applicationId', auth, allotmentController.deleteApplication);

// @route   PUT /api/allotment/update-status
// @desc    Update allotment status (Admin only)
// @access  Private/Admin
router.put('/update-status', auth, allotmentController.updateAllotmentStatus);

module.exports = router;
