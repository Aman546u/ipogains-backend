const notificationService = require('./notificationService');

// Scheduler configuration
let dailyDigestInterval = null;
let notificationProcessorInterval = null;

// Schedule daily digest (runs at 9 AM IST every day)
const scheduleDailyDigest = () => {
    const now = new Date();

    // Calculate time until next 9 AM IST
    const targetHour = 9; // 9 AM
    let nextRun = new Date();
    nextRun.setHours(targetHour, 0, 0, 0);

    // If it's already past 9 AM, schedule for tomorrow
    if (now.getHours() >= targetHour) {
        nextRun.setDate(nextRun.getDate() + 1);
    }

    const msUntilNextRun = nextRun.getTime() - now.getTime();

    console.log(`📅 Daily digest scheduled for: ${nextRun.toLocaleString('en-IN')}`);

    // Initial timeout to reach 9 AM
    setTimeout(() => {
        // Run immediately at 9 AM
        runDailyDigest();

        // Then run every 24 hours
        dailyDigestInterval = setInterval(runDailyDigest, 24 * 60 * 60 * 1000);
    }, msUntilNextRun);
};

// Run daily digest
const runDailyDigest = async () => {
    console.log('📬 Running daily digest...');
    try {
        const result = await notificationService.sendDailyDigest();
        console.log(`📬 Daily digest complete:`, result);
    } catch (error) {
        console.error('❌ Daily digest error:', error.message);
    }
};

// Process pending notifications every 5 minutes
const startNotificationProcessor = () => {
    console.log('🔄 Notification processor started (runs every 5 minutes)');

    // Run immediately
    processNotifications();

    // Then every 5 minutes
    notificationProcessorInterval = setInterval(processNotifications, 5 * 60 * 1000);
};

// Process notifications
const processNotifications = async () => {
    try {
        const result = await notificationService.processPendingNotifications();
        if (result.processed > 0) {
            console.log(`✅ Processed ${result.processed} pending notifications`);
        }
    } catch (error) {
        console.error('❌ Notification processor error:', error.message);
    }
};

// Manual trigger for daily digest (for admin use)
const triggerDailyDigest = async () => {
    console.log('📬 Manually triggering daily digest...');
    return await notificationService.sendDailyDigest();
};

// Stop all schedulers
const stopSchedulers = () => {
    if (dailyDigestInterval) {
        clearInterval(dailyDigestInterval);
        dailyDigestInterval = null;
    }
    if (notificationProcessorInterval) {
        clearInterval(notificationProcessorInterval);
        notificationProcessorInterval = null;
    }
    console.log('⏹️ All schedulers stopped');
};

// Initialize all schedulers
const initSchedulers = () => {
    console.log('');
    console.log('📅 ═══════════════════════════════════════════════════════');
    console.log('📅 Initializing Notification Schedulers');
    console.log('📅 ═══════════════════════════════════════════════════════');

    scheduleDailyDigest();
    startNotificationProcessor();

    console.log('📅 ═══════════════════════════════════════════════════════');
    console.log('');
};

module.exports = {
    initSchedulers,
    stopSchedulers,
    triggerDailyDigest,
    runDailyDigest,
    processNotifications
};
