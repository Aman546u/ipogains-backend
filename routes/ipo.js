const express = require('express');
const router = express.Router();
const ipoController = require('../controllers/ipoController');

// @route   GET /api/ipos/stats/overview
// @desc    Get IPO statistics
// @access  Public
router.get('/stats/overview', ipoController.getIPOStats);

// @route   GET /api/ipos/search
// @desc    Search IPOs
// @access  Public
router.get('/search', ipoController.searchIPOs);

// @route   GET /api/ipos/category/:category
// @desc    Get IPOs by category
// @access  Public
router.get('/category/:category', ipoController.getIPOsByCategory);

// @route   GET /api/ipos/status/:status
// @desc    Get IPOs by status
// @access  Public
router.get('/status/:status', ipoController.getIPOsByStatus);

// @route   GET /api/ipos/:id
// @desc    Get single IPO by ID
// @access  Public
router.get('/:id', ipoController.getIPOById);

// @route   GET /api/ipos
// @desc    Get all IPOs with filters
// @access  Public
router.get('/', ipoController.getAllIPOs);

module.exports = router;
