const User = require('../models/User');
const IPO = require('../models/IPO');
const { encrypt, decrypt } = require('../utils/encryption');
const { ALLOTMENT_STATUS } = require('../config/constants');
const { sendAllotmentNotification } = require('../utils/email');

// @desc    Check allotment status
// @route   POST /api/allotment/check
// @access  Private
exports.checkAllotment = async (req, res) => {
    try {
        const { ipoId, panCard } = req.body;
        console.log(`[AllotmentCheck] Request for IPO: ${ipoId}, PAN: ${panCard ? 'Provided' : 'Missing'}`);
        console.log(`[AllotmentCheck] User authenticated: ${req.user ? 'Yes (' + req.user._id + ')' : 'No'}`);

        if (!ipoId) {
            return res.status(400).json({
                success: false,
                error: 'IPO ID is required'
            });
        }

        const ipo = await IPO.findById(ipoId);
        if (!ipo) {
            return res.status(404).json({
                success: false,
                error: 'IPO not found'
            });
        }

        let application = null;
        const normalizedPAN = (panCard || '').toUpperCase();

        // 1. Search for application by PAN in the entire database (Public Check)
        if (normalizedPAN) {
            // Find users who have applied for this specific IPO
            const usersWithIPO = await User.find({
                'appliedIPOs.ipoId': ipoId
            }).select('appliedIPOs');

            for (const user of usersWithIPO) {
                const found = user.appliedIPOs.find(app => {
                    if (app.ipoId.toString() !== ipoId) return false;
                    try {
                        const decryptedPAN = decrypt(app.panCard);
                        return decryptedPAN === normalizedPAN;
                    } catch (e) {
                        return false;
                    }
                });
                if (found) {
                    application = found;
                    break;
                }
            }
        }

        // 2. Fallback: If no PAN (unlikely now) but logged in, use session-linked app
        if (!application && req.user) {
            const user = await User.findById(req.user._id);
            application = user.appliedIPOs.find(app => app.ipoId.toString() === ipoId);
        }

        // Tracking Logic: If logged in, save this check
        let trackingStatus = 'guest';

        if (req.user) {
            console.log(`[AllotmentCheck] Traking for user: ${req.user._id}`);
            const currentUser = await User.findById(req.user._id);
            const existingTrack = currentUser.appliedIPOs.find(app => app.ipoId.toString() === ipoId);

            if (!existingTrack) {
                // Determine what to save
                if (application) {
                    // Found real application -> Add to My Applications
                    currentUser.appliedIPOs.push({
                        ipoId,
                        panCard: application.panCard, // Keep encrypted
                        applicationNumber: application.applicationNumber,
                        appliedDate: application.appliedDate,
                        lotSize: application.lotSize,
                        status: application.status
                    });
                } else {
                    // Not found -> Add as "Checked"
                    currentUser.appliedIPOs.push({
                        ipoId,
                        panCard: encrypt(normalizedPAN),
                        applicationNumber: 'CHK-' + Date.now(),
                        appliedDate: new Date(),
                        lotSize: 0,
                        status: 'checked_external' // Reusing external check status for manual checks
                    });
                }
                await currentUser.save();
            } else if (application && existingTrack.status === 'checked_external') {
                // Upgrade status if we found real data now
                existingTrack.status = application.status;
                existingTrack.lotSize = application.lotSize;
                existingTrack.applicationNumber = application.applicationNumber;
                await currentUser.save();
            }
            trackingStatus = 'tracked';
        } else if (req.authError) {
            console.log(`[AllotmentCheck] Auth Error: ${req.authError}`);
            trackingStatus = 'auth_error';
        }

        if (!application) {
            return res.json({
                success: true,
                found: false,
                trackingStatus,
                message: 'No application found for this PAN card for the selected IPO.'
            });
        }

        res.json({
            success: true,
            found: true,
            trackingStatus,
            allotment: {
                ipoName: ipo.companyName,
                status: application.status,
                appliedDate: application.appliedDate,
                lotSize: application.lotSize,
                applicationNumber: application.applicationNumber
            }
        });
    } catch (error) {
        console.error('Check allotment error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error while checking allotment'
        });
    }
};

// @desc    Log external check
// @route   POST /api/allotment/log-external
// @access  Private
exports.logExternalCheck = async (req, res) => {
    try {
        const { ipoId } = req.body;
        console.log(`[ExternalLog] Request for IPO: ${ipoId}, User: ${req.user ? req.user._id : 'Guest'}`);

        if (!req.user) {
            return res.json({ success: false, message: 'User not authenticated' });
        }

        const user = await User.findById(req.user._id);
        const existingApp = user.appliedIPOs.find(app => app.ipoId.toString() === ipoId);

        if (!existingApp) {
            user.appliedIPOs.push({
                ipoId,
                panCard: 'EXTERNAL_CHECK', // Placeholder for encrypted field
                applicationNumber: 'EXT-' + Date.now(), // Unique ID
                appliedDate: new Date(),
                lotSize: 0,
                status: 'checked_external'
            });
            await user.save();
            console.log('[ExternalLog] Created new external check entry');
        } else {
            // Update existing entry to show recent activity
            // Only update if it's currently a 'checked_external' status or similar placeholder
            // Don't overwrite if they actually have a real 'allotted'/'not_allotted' status from manual entry
            if (existingApp.status === 'checked_external') {
                existingApp.appliedDate = new Date(); // Update timestamp
                await user.save();
                console.log('[ExternalLog] Updated timestamp for existing entry');
            } else {
                console.log('[ExternalLog] Skipped update, existing status takes precedence:', existingApp.status);
            }
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Log external error:', error);
        res.status(500).json({ success: false });
    }
};

// @desc    Apply for IPO (save application)
// @route   POST /api/allotment/apply
// @access  Private
exports.applyForIPO = async (req, res) => {
    try {
        const { ipoId, panCard, applicationNumber, lotSize } = req.body;

        if (!ipoId || !panCard || !applicationNumber || !lotSize) {
            return res.status(400).json({
                success: false,
                error: 'All fields are required'
            });
        }

        // Validate PAN
        const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
        if (!panRegex.test(panCard.toUpperCase())) {
            return res.status(400).json({
                success: false,
                error: 'Invalid PAN card format'
            });
        }

        const ipo = await IPO.findById(ipoId);
        if (!ipo) {
            return res.status(404).json({
                success: false,
                error: 'IPO not found'
            });
        }

        if (ipo.status !== 'open') {
            return res.status(400).json({
                success: false,
                error: 'IPO is not open for application'
            });
        }

        const user = await User.findById(req.user._id);

        // Check if already applied
        const existingApplication = user.appliedIPOs.find(app =>
            app.ipoId.toString() === ipoId
        );

        if (existingApplication) {
            return res.status(400).json({
                success: false,
                error: 'You have already applied for this IPO'
            });
        }

        // Encrypt PAN
        const encryptedPAN = encrypt(panCard.toUpperCase());

        user.appliedIPOs.push({
            ipoId,
            panCard: encryptedPAN,
            applicationNumber,
            appliedDate: new Date(),
            lotSize,
            status: ALLOTMENT_STATUS.PENDING
        });

        await user.save();

        res.json({
            success: true,
            message: 'IPO application saved successfully',
            application: {
                ipoName: ipo.companyName,
                applicationNumber,
                appliedDate: new Date()
            }
        });
    } catch (error) {
        console.error('Apply IPO error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error while saving application'
        });
    }
};

// @desc    Get user's IPO applications
// @route   GET /api/allotment/my-applications
// @access  Private
exports.getMyApplications = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).populate('appliedIPOs.ipoId');

        const applications = user.appliedIPOs.map(app => ({
            id: app._id,
            ipo: app.ipoId ? {
                id: app.ipoId._id,
                name: app.ipoId.companyName,
                logo: app.ipoId.companyLogo,
                status: app.ipoId.status,
                category: app.ipoId.category
            } : null,
            applicationNumber: app.applicationNumber,
            appliedDate: app.appliedDate,
            lotSize: app.lotSize,
            status: app.status
        }));

        res.json({
            success: true,
            count: applications.length,
            applications
        });
    } catch (error) {
        console.error('Get applications error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error while fetching applications'
        });
    }
};

// @desc    Update allotment status (Admin only)
// @route   PUT /api/allotment/update-status
// @access  Private/Admin
exports.updateAllotmentStatus = async (req, res) => {
    try {
        const { userId, applicationId, status } = req.body;

        if (!Object.values(ALLOTMENT_STATUS).includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid status'
            });
        }

        const user = await User.findById(userId).populate('appliedIPOs.ipoId');
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        const application = user.appliedIPOs.id(applicationId);
        if (!application) {
            return res.status(404).json({
                success: false,
                error: 'Application not found'
            });
        }

        application.status = status;
        await user.save();

        // Send notification email
        if (application.ipoId) {
            await sendAllotmentNotification(
                user.email,
                application.ipoId.companyName,
                status
            );
        }

        res.json({
            success: true,
            message: 'Allotment status updated successfully',
            application
        });
    } catch (error) {
        console.error('Update status error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error while updating status'
        });
    }
};

// @desc    Update application status (User)
// @route   PUT /api/allotment/my-status
// @access  Private
exports.updateUserApplicationStatus = async (req, res) => {
    try {
        console.log('Update Status Body:', req.body);
        const { applicationId, status, lotSize } = req.body;

        console.log('User ID from Token:', req.user._id);
        const user = await User.findById(req.user._id);
        if (!user) console.log('User not found in DB');

        console.log('Looking for Application ID:', applicationId);
        const application = user.appliedIPOs.id(applicationId);

        if (!['allotted', 'not_allotted'].includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid status'
            });
        }

        // Removed duplicate declarations here

        if (!application) {
            return res.status(404).json({
                success: false,
                error: 'Application not found'
            });
        }

        application.status = status;
        if (status === 'allotted') {
            application.lotSize = lotSize ? parseInt(lotSize) : 0;
            if (isNaN(application.lotSize)) application.lotSize = 0;
        } else if (status === 'not_allotted') {
            application.lotSize = 0;
        }

        await user.save();

        res.json({
            success: true,
            message: 'Status updated successfully',
            application
        });
    } catch (error) {
        console.error('Update user status error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error while updating status'
        });
    }
};

// @desc    Delete application
// @route   DELETE /api/allotment/:applicationId
// @access  Private
exports.deleteApplication = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        const application = user.appliedIPOs.id(req.params.applicationId);
        if (!application) {
            return res.status(404).json({
                success: false,
                error: 'Application not found'
            });
        }

        application.remove();
        await user.save();

        res.json({
            success: true,
            message: 'Application deleted successfully'
        });
    } catch (error) {
        console.error('Delete application error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error while deleting application'
        });
    }
};
