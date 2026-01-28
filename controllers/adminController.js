const IPO = require('../models/IPO');
const User = require('../models/User');
const { IPO_STATUS } = require('../config/constants');
const notificationService = require('../services/notificationService');

// @desc    Create new IPO
// @route   POST /api/admin/ipos
// @access  Private/Admin
exports.createIPO = async (req, res) => {
    try {
        const ipo = new IPO(req.body);
        await ipo.save();

        // Create notification for new IPO
        try {
            const notification = await notificationService.createNotification('new_ipo', ipo);
            if (notification) {
                // Send notifications to subscribers immediately
                await notificationService.sendBulkNotification(notification, ipo);
            }
        } catch (notifError) {
            console.error('Notification error (non-blocking):', notifError.message);
        }

        res.status(201).json({
            success: true,
            message: 'IPO created successfully',
            ipo
        });
    } catch (error) {
        console.error('Create IPO error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Server error while creating IPO'
        });
    }
};

// @desc    Update IPO
// @route   PUT /api/admin/ipos/:id
// @access  Private/Admin
exports.updateIPO = async (req, res) => {
    try {
        const ipo = await IPO.findById(req.params.id);

        if (!ipo) {
            return res.status(404).json({
                success: false,
                error: 'IPO not found'
            });
        }

        // Update basic fields
        const basicFields = [
            'companyName', 'category', 'sector', 'issueSize', 'lotSize',
            'minInvestment', 'openDate', 'closeDate', 'allotmentDate',
            'listingDate', 'registrar', 'allotmentLink', 'faceValue', 'status', 'companyDescription',
            'companyLogo'
        ];

        basicFields.forEach(field => {
            if (req.body[field] !== undefined) {
                ipo[field] = req.body[field];
            }
        });

        console.log('Updated IPO fields:', req.body); // Debug log

        // Update complex objects
        if (req.body.priceRange) {
            ipo.priceRange = { ...ipo.priceRange, ...req.body.priceRange };
        }

        if (req.body.subscription) {
            ipo.subscription = { ...ipo.subscription, ...req.body.subscription, lastUpdated: Date.now() };
        }

        if (req.body.subscriptionDetails) {
            // Explicitly overwrite the subscriptionDetails to ensure nested updates are saved
            ipo.subscriptionDetails = req.body.subscriptionDetails;
        }

        await ipo.save();

        res.json({
            success: true,
            message: 'IPO updated successfully',
            ipo
        });
    } catch (error) {
        console.error('Update IPO error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Server error while updating IPO'
        });
    }
};

// @desc    Delete IPO
// @route   DELETE /api/admin/ipos/:id
// @access  Private/Admin
exports.deleteIPO = async (req, res) => {
    try {
        const ipo = await IPO.findByIdAndDelete(req.params.id);

        if (!ipo) {
            return res.status(404).json({
                success: false,
                error: 'IPO not found'
            });
        }

        res.json({
            success: true,
            message: 'IPO deleted successfully'
        });
    } catch (error) {
        console.error('Delete IPO error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error while deleting IPO'
        });
    }
};

// @desc    Update subscription data
// @route   PUT /api/admin/ipos/:id/subscription
// @access  Private/Admin
exports.updateSubscription = async (req, res) => {
    try {
        const { retail, nii, qib, shareholder } = req.body;

        const ipo = await IPO.findById(req.params.id);
        if (!ipo) {
            return res.status(404).json({
                success: false,
                error: 'IPO not found'
            });
        }

        ipo.subscription = {
            retail: retail !== undefined ? retail : ipo.subscription.retail,
            nii: nii !== undefined ? nii : ipo.subscription.nii,
            qib: qib !== undefined ? qib : ipo.subscription.qib,
            shareholder: shareholder !== undefined ? shareholder : ipo.subscription.shareholder,
            total: ((retail !== undefined ? retail : ipo.subscription.retail) +
                (nii !== undefined ? nii : ipo.subscription.nii) +
                (qib !== undefined ? qib : ipo.subscription.qib) +
                (shareholder !== undefined ? shareholder : ipo.subscription.shareholder)) / 4,
            lastUpdated: Date.now()
        };

        await ipo.save();

        res.json({
            success: true,
            message: 'Subscription updated successfully',
            ipo
        });
    } catch (error) {
        console.error('Update subscription error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error while updating subscription'
        });
    }
};

// @desc    Add GMP entry
// @route   POST /api/admin/ipos/:id/gmp
// @access  Private/Admin
exports.addGMP = async (req, res) => {
    try {
        const { value } = req.body;

        if (!value || value < 0) {
            return res.status(400).json({
                success: false,
                error: 'Valid GMP value is required'
            });
        }

        const ipo = await IPO.findById(req.params.id);
        if (!ipo) {
            return res.status(404).json({
                success: false,
                error: 'IPO not found'
            });
        }

        // Get previous GMP for notification
        const previousGMP = ipo.gmp.length > 0 ? ipo.gmp[ipo.gmp.length - 1].value : 0;

        const percentage = ((value / ipo.priceRange.max) * 100).toFixed(2);

        ipo.gmp.push({
            value,
            percentage: parseFloat(percentage),
            date: new Date()
        });

        await ipo.save();

        // Create notification for significant GMP change (>10% difference)
        if (Math.abs(value - previousGMP) > previousGMP * 0.1 || previousGMP === 0) {
            try {
                const notification = await notificationService.createNotification('gmp_update', ipo, previousGMP, value);
                if (notification) {
                    await notificationService.sendBulkNotification(notification, ipo);
                }
            } catch (notifError) {
                console.error('GMP notification error (non-blocking):', notifError.message);
            }
        }

        res.json({
            success: true,
            message: 'GMP added successfully',
            ipo
        });
    } catch (error) {
        console.error('Add GMP error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error while adding GMP'
        });
    }
};

// @desc    Update listing price and calculate gains
// @route   PUT /api/admin/ipos/:id/listing
// @access  Private/Admin
exports.updateListingPrice = async (req, res) => {
    try {
        const { listingPrice } = req.body;

        if (!listingPrice || listingPrice <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Valid listing price is required'
            });
        }

        const ipo = await IPO.findById(req.params.id);
        if (!ipo) {
            return res.status(404).json({
                success: false,
                error: 'IPO not found'
            });
        }

        const previousStatus = ipo.status;

        ipo.listingPrice = listingPrice;
        const gainAmount = listingPrice - ipo.priceRange.max;
        const gainPercentage = ((gainAmount / ipo.priceRange.max) * 100).toFixed(2);

        ipo.listingGain = {
            amount: gainAmount,
            percentage: parseFloat(gainPercentage)
        };

        ipo.status = IPO_STATUS.LISTED;
        await ipo.save();

        // Create notification for listing
        try {
            const notification = await notificationService.createNotification(
                'status_change',
                ipo,
                previousStatus,
                'listed',
                `${ipo.companyName} is now LISTED!`,
                `Listed at ₹${listingPrice} with ${parseFloat(gainPercentage) >= 0 ? '+' : ''}${gainPercentage}% gain`
            );
            if (notification) {
                await notificationService.sendBulkNotification(notification, ipo);
            }
        } catch (notifError) {
            console.error('Listing notification error (non-blocking):', notifError.message);
        }

        res.json({
            success: true,
            message: 'Listing price updated successfully',
            ipo
        });
    } catch (error) {
        console.error('Update listing error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error while updating listing price'
        });
    }
};

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password -otp').sort({ createdAt: -1 });

        res.json({
            success: true,
            count: users.length,
            users
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error while fetching users'
        });
    }
};

// @desc    Update user role
// @route   PUT /api/admin/users/:id/role
// @access  Private/Admin
exports.updateUserRole = async (req, res) => {
    try {
        const { role } = req.body;

        if (!['user', 'admin'].includes(role)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid role'
            });
        }

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { role },
            { new: true }
        ).select('-password -otp');

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.json({
            success: true,
            message: 'User role updated successfully',
            user
        });
    } catch (error) {
        console.error('Update user role error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error while updating user role'
        });
    }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error while deleting user'
        });
    }
};

// @desc    Get dashboard statistics
// @route   GET /api/admin/dashboard/stats
// @access  Private/Admin
exports.getDashboardStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalIPOs = await IPO.countDocuments();
        const activeIPOs = await IPO.countDocuments({ status: IPO_STATUS.OPEN });
        const upcomingIPOs = await IPO.countDocuments({ status: IPO_STATUS.UPCOMING });
        const listedIPOs = await IPO.countDocuments({ status: IPO_STATUS.LISTED });

        // Get recent activities
        const recentIPOs = await IPO.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .select('companyName status createdAt');

        const recentUsers = await User.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .select('email createdAt');

        res.json({
            success: true,
            stats: {
                totalUsers,
                totalIPOs,
                activeIPOs,
                upcomingIPOs,
                listedIPOs
            },
            recentActivities: {
                ipos: recentIPOs,
                users: recentUsers
            }
        });
    } catch (error) {
        console.error('Get dashboard stats error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error while fetching statistics'
        });
    }
};
