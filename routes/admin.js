const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const adminController = require('../controllers/adminController');
const { auth, adminAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validator');

// All routes require admin authentication
router.use(auth, adminAuth);

// IPO Management Routes

// @route   POST /api/admin/ipos
// @desc    Create new IPO
// @access  Private/Admin
router.post('/ipos', adminController.createIPO);

// @route   PUT /api/admin/ipos/:id
// @desc    Update IPO
// @access  Private/Admin
router.put('/ipos/:id', adminController.updateIPO);

// @route   DELETE /api/admin/ipos/:id
// @desc    Delete IPO
// @access  Private/Admin
router.delete('/ipos/:id', adminController.deleteIPO);

// @route   PUT /api/admin/ipos/:id/subscription
// @desc    Update subscription data
// @access  Private/Admin
router.put('/ipos/:id/subscription',
    [
        body('retail').optional().isFloat({ min: 0 }),
        body('nii').optional().isFloat({ min: 0 }),
        body('qib').optional().isFloat({ min: 0 }),
        body('shareholder').optional().isFloat({ min: 0 })
    ],
    validate,
    adminController.updateSubscription
);

// @route   POST /api/admin/ipos/:id/gmp
// @desc    Add GMP entry
// @access  Private/Admin
router.post('/ipos/:id/gmp',
    [body('value').isFloat({ min: 0 }).withMessage('GMP value must be a positive number')],
    validate,
    adminController.addGMP
);

// @route   PUT /api/admin/ipos/:id/listing
// @desc    Update listing price
// @access  Private/Admin
router.put('/ipos/:id/listing',
    [body('listingPrice').isFloat({ min: 0 }).withMessage('Listing price must be a positive number')],
    validate,
    adminController.updateListingPrice
);

// User Management Routes

// @route   GET /api/admin/users
// @desc    Get all users
// @access  Private/Admin
router.get('/users', adminController.getAllUsers);

// @route   PUT /api/admin/users/:id/role
// @desc    Update user role
// @access  Private/Admin
router.put('/users/:id/role',
    [body('role').isIn(['user', 'admin']).withMessage('Invalid role')],
    validate,
    adminController.updateUserRole
);

// @route   DELETE /api/admin/users/:id
// @desc    Delete user
// @access  Private/Admin
router.delete('/users/:id', adminController.deleteUser);

// Dashboard Routes

// @route   GET /api/admin/dashboard/stats
// @desc    Get dashboard statistics
// @access  Private/Admin
router.get('/dashboard/stats', adminController.getDashboardStats);

module.exports = router;
