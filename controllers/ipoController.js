const IPO = require('../models/IPO');
const { IPO_STATUS, IPO_CATEGORY } = require('../config/constants');

// @desc    Get all IPOs with filters
// @route   GET /api/ipos
// @access  Public
exports.getAllIPOs = async (req, res) => {
    try {
        const { status, category, sector, sort, page = 1, limit = 20 } = req.query;

        // Build query
        let query = {};

        if (status && status !== 'all') {
            query.status = status;
        }
        if (category && category !== 'all') {
            query.category = category;
        }
        if (sector) {
            query.sector = sector;
        }

        // Build sort option
        let sortOption = { createdAt: -1 };
        if (sort === 'openDate') sortOption = { openDate: -1 };
        if (sort === 'closeDate') sortOption = { closeDate: -1 };
        if (sort === 'subscription') sortOption = { 'subscription.total': -1 };
        if (sort === 'gmp') sortOption = { 'gmp.value': -1 };

        // Pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const ipos = await IPO.find(query)
            .sort(sortOption)
            .skip(skip)
            .limit(parseInt(limit));

        // Update status for each IPO
        for (let ipo of ipos) {
            await ipo.save(); // Triggers pre-save hook to update status
        }

        const total = await IPO.countDocuments(query);

        res.json({
            success: true,
            count: ipos.length,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / parseInt(limit)),
            ipos
        });
    } catch (error) {
        console.error('Get IPOs error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error while fetching IPOs'
        });
    }
};

// @desc    Get single IPO by ID
// @route   GET /api/ipos/:id
// @access  Public
exports.getIPOById = async (req, res) => {
    try {
        const ipo = await IPO.findById(req.params.id);

        if (!ipo) {
            return res.status(404).json({
                success: false,
                error: 'IPO not found'
            });
        }

        await ipo.save(); // Update status

        res.json({
            success: true,
            ipo
        });
    } catch (error) {
        console.error('Get IPO error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error while fetching IPO'
        });
    }
};

// @desc    Get IPO statistics
// @route   GET /api/ipos/stats/overview
// @access  Public
exports.getIPOStats = async (req, res) => {
    try {
        const totalIPOs = await IPO.countDocuments();
        const openIPOs = await IPO.countDocuments({ status: IPO_STATUS.OPEN });
        const upcomingIPOs = await IPO.countDocuments({ status: IPO_STATUS.UPCOMING });
        const listedIPOs = await IPO.countDocuments({ status: IPO_STATUS.LISTED });

        // Calculate average listing gains
        const listedWithGains = await IPO.find({
            status: IPO_STATUS.LISTED,
            'listingGain.percentage': { $exists: true, $ne: null }
        });

        const avgGain = listedWithGains.length > 0
            ? listedWithGains.reduce((sum, ipo) => sum + (ipo.listingGain.percentage || 0), 0) / listedWithGains.length
            : 0;

        // Get recent IPOs
        const recentIPOs = await IPO.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .select('companyName status openDate');

        res.json({
            success: true,
            stats: {
                total: totalIPOs,
                open: openIPOs,
                upcoming: upcomingIPOs,
                listed: listedIPOs,
                averageListingGain: avgGain.toFixed(2)
            },
            recentIPOs
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error while fetching statistics'
        });
    }
};

// @desc    Search IPOs
// @route   GET /api/ipos/search
// @access  Public
exports.searchIPOs = async (req, res) => {
    try {
        const { q } = req.query;

        if (!q) {
            return res.status(400).json({
                success: false,
                error: 'Search query is required'
            });
        }

        const ipos = await IPO.find({
            $or: [
                { companyName: { $regex: q, $options: 'i' } },
                { sector: { $regex: q, $options: 'i' } }
            ]
        }).limit(10);

        res.json({
            success: true,
            count: ipos.length,
            ipos
        });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error during search'
        });
    }
};

// @desc    Get IPOs by category
// @route   GET /api/ipos/category/:category
// @access  Public
exports.getIPOsByCategory = async (req, res) => {
    try {
        const { category } = req.params;

        if (!Object.values(IPO_CATEGORY).includes(category)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid category'
            });
        }

        const ipos = await IPO.find({ category }).sort({ openDate: -1 });

        res.json({
            success: true,
            count: ipos.length,
            category,
            ipos
        });
    } catch (error) {
        console.error('Get category IPOs error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error while fetching IPOs by category'
        });
    }
};

// @desc    Get IPOs by status
// @route   GET /api/ipos/status/:status
// @access  Public
exports.getIPOsByStatus = async (req, res) => {
    try {
        const { status } = req.params;

        if (!Object.values(IPO_STATUS).includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid status'
            });
        }

        const ipos = await IPO.find({ status }).sort({ openDate: -1 });

        res.json({
            success: true,
            count: ipos.length,
            status,
            ipos
        });
    } catch (error) {
        console.error('Get status IPOs error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error while fetching IPOs by status'
        });
    }
};
