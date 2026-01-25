const nodemailer = require('nodemailer');
const Subscriber = require('../models/Subscriber');
const Notification = require('../models/Notification');

// Check if email is configured
const isEmailConfigured = () => {
    return process.env.EMAIL_USER &&
        process.env.EMAIL_PASSWORD &&
        process.env.EMAIL_USER !== 'your-email@gmail.com' &&
        process.env.EMAIL_PASSWORD !== 'your-16-character-app-password';
};

// Create transporter
let transporter = null;
if (isEmailConfigured()) {
    transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: process.env.EMAIL_PORT || 587,
        secure: false,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        }
    });
    console.log('✅ Notification email service configured');
}

// Get site URL
const getSiteUrl = () => {
    return process.env.FRONTEND_URL || 'http://localhost:3000';
};

// Email templates
const emailTemplates = {
    // New IPO Added
    newIPO: (ipo, unsubscribeToken) => ({
        subject: `🚀 New IPO Alert: ${ipo.companyName} - IPOGains`,
        html: `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a2e; color: #ffffff; border-radius: 10px; overflow: hidden;">
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center;">
                    <h1 style="margin: 0; font-size: 24px;">🚀 New IPO Alert!</h1>
                    <p style="margin: 10px 0 0; opacity: 0.9;">A new IPO has been added to IPOGains</p>
                </div>
                
                <!-- Content -->
                <div style="padding: 30px;">
                    <div style="background: #252542; border-radius: 10px; padding: 20px; margin-bottom: 20px;">
                        <h2 style="color: #10b981; margin: 0 0 15px;">${ipo.companyName}</h2>
                        <table style="width: 100%; color: #a0a0a0;">
                            <tr>
                                <td style="padding: 8px 0;"><strong>Category:</strong></td>
                                <td style="padding: 8px 0; color: #fff;">${ipo.category}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0;"><strong>Sector:</strong></td>
                                <td style="padding: 8px 0; color: #fff;">${ipo.sector}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0;"><strong>Price Range:</strong></td>
                                <td style="padding: 8px 0; color: #fff;">₹${ipo.priceRange.min} - ₹${ipo.priceRange.max}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0;"><strong>Lot Size:</strong></td>
                                <td style="padding: 8px 0; color: #fff;">${ipo.lotSize} shares</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0;"><strong>Min Investment:</strong></td>
                                <td style="padding: 8px 0; color: #fff;">₹${ipo.minInvestment?.toLocaleString('en-IN')}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0;"><strong>Issue Size:</strong></td>
                                <td style="padding: 8px 0; color: #fff;">₹${ipo.issueSize?.toLocaleString('en-IN')} Cr</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0;"><strong>Open Date:</strong></td>
                                <td style="padding: 8px 0; color: #10b981;">${new Date(ipo.openDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0;"><strong>Close Date:</strong></td>
                                <td style="padding: 8px 0; color: #ef4444;">${new Date(ipo.closeDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                            </tr>
                        </table>
                    </div>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${getSiteUrl()}/ipos.html" 
                           style="display: inline-block; padding: 15px 40px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                            View IPO Details →
                        </a>
                    </div>
                </div>
                
                <!-- Footer -->
                <div style="background: #0f0f1a; padding: 20px; text-align: center; font-size: 12px; color: #666;">
                    <p style="margin: 0 0 10px;">You received this email because you subscribed to IPOGains notifications.</p>
                    <a href="${getSiteUrl()}/api/subscribers/unsubscribe/${unsubscribeToken}" style="color: #10b981; text-decoration: none;">Unsubscribe</a>
                    <p style="margin: 15px 0 0;">© 2026 IPOGains. All rights reserved.</p>
                </div>
            </div>
        `
    }),

    // IPO Status Change
    statusChange: (ipo, oldStatus, newStatus, unsubscribeToken) => ({
        subject: `📊 IPO Update: ${ipo.companyName} is now ${newStatus.toUpperCase()} - IPOGains`,
        html: `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a2e; color: #ffffff; border-radius: 10px; overflow: hidden;">
                <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 30px; text-align: center;">
                    <h1 style="margin: 0; font-size: 24px;">📊 IPO Status Update</h1>
                </div>
                
                <div style="padding: 30px;">
                    <h2 style="color: #10b981; margin: 0 0 20px;">${ipo.companyName}</h2>
                    
                    <div style="display: flex; justify-content: center; align-items: center; margin: 20px 0;">
                        <span style="padding: 10px 20px; background: #374151; border-radius: 5px; color: #9ca3af;">${oldStatus?.toUpperCase() || 'N/A'}</span>
                        <span style="padding: 0 20px; font-size: 24px;">→</span>
                        <span style="padding: 10px 20px; background: #10b981; border-radius: 5px; color: white; font-weight: 600;">${newStatus.toUpperCase()}</span>
                    </div>
                    
                    ${newStatus === 'open' ? `
                        <p style="text-align: center; color: #10b981; font-size: 18px; margin: 20px 0;">
                            🎉 This IPO is now open for subscription!
                        </p>
                    ` : ''}
                    
                    ${newStatus === 'listed' && ipo.listingGain ? `
                        <div style="background: #252542; border-radius: 10px; padding: 20px; margin: 20px 0; text-align: center;">
                            <p style="margin: 0 0 10px; color: #a0a0a0;">Listing Performance</p>
                            <p style="margin: 0; font-size: 28px; color: ${ipo.listingGain.percentage >= 0 ? '#10b981' : '#ef4444'};">
                                ${ipo.listingGain.percentage >= 0 ? '+' : ''}${ipo.listingGain.percentage?.toFixed(2)}%
                            </p>
                        </div>
                    ` : ''}
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${getSiteUrl()}/ipos.html" 
                           style="display: inline-block; padding: 15px 40px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
                            View Details →
                        </a>
                    </div>
                </div>
                
                <div style="background: #0f0f1a; padding: 20px; text-align: center; font-size: 12px; color: #666;">
                    <a href="${getSiteUrl()}/api/subscribers/unsubscribe/${unsubscribeToken}" style="color: #10b981; text-decoration: none;">Unsubscribe</a>
                    <p style="margin: 15px 0 0;">© 2026 IPOGains. All rights reserved.</p>
                </div>
            </div>
        `
    }),

    // Daily Digest
    dailyDigest: (ipos, changes, unsubscribeToken) => ({
        subject: `📬 Your Daily IPO Digest - IPOGains`,
        html: `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a2e; color: #ffffff; border-radius: 10px; overflow: hidden;">
                <div style="background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%); padding: 30px; text-align: center;">
                    <h1 style="margin: 0; font-size: 24px;">📬 Daily IPO Digest</h1>
                    <p style="margin: 10px 0 0; opacity: 0.9;">${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
                
                <div style="padding: 30px;">
                    ${ipos.open?.length > 0 ? `
                        <div style="margin-bottom: 25px;">
                            <h3 style="color: #10b981; margin: 0 0 15px;">🟢 Currently Open (${ipos.open.length})</h3>
                            ${ipos.open.map(ipo => `
                                <div style="background: #252542; border-radius: 8px; padding: 15px; margin-bottom: 10px;">
                                    <strong style="color: #fff;">${ipo.companyName}</strong>
                                    <span style="float: right; color: #10b981;">₹${ipo.priceRange.min}-${ipo.priceRange.max}</span>
                                    <p style="margin: 5px 0 0; color: #9ca3af; font-size: 13px;">
                                        Closes: ${new Date(ipo.closeDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} 
                                        | Subscription: ${ipo.subscription?.total?.toFixed(2) || 0}x
                                    </p>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                    
                    ${ipos.upcoming?.length > 0 ? `
                        <div style="margin-bottom: 25px;">
                            <h3 style="color: #f59e0b; margin: 0 0 15px;">🟡 Upcoming (${ipos.upcoming.length})</h3>
                            ${ipos.upcoming.slice(0, 5).map(ipo => `
                                <div style="background: #252542; border-radius: 8px; padding: 15px; margin-bottom: 10px;">
                                    <strong style="color: #fff;">${ipo.companyName}</strong>
                                    <p style="margin: 5px 0 0; color: #9ca3af; font-size: 13px;">
                                        Opens: ${new Date(ipo.openDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </p>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                    
                    ${changes?.length > 0 ? `
                        <div style="margin-bottom: 25px;">
                            <h3 style="color: #3b82f6; margin: 0 0 15px;">📝 Recent Updates</h3>
                            ${changes.map(change => `
                                <div style="background: #252542; border-radius: 8px; padding: 15px; margin-bottom: 10px; border-left: 3px solid #3b82f6;">
                                    <strong style="color: #fff;">${change.title}</strong>
                                    <p style="margin: 5px 0 0; color: #9ca3af; font-size: 13px;">${change.message}</p>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${getSiteUrl()}/ipos.html" 
                           style="display: inline-block; padding: 15px 40px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
                            Explore All IPOs →
                        </a>
                    </div>
                </div>
                
                <div style="background: #0f0f1a; padding: 20px; text-align: center; font-size: 12px; color: #666;">
                    <a href="${getSiteUrl()}/api/subscribers/unsubscribe/${unsubscribeToken}" style="color: #10b981; text-decoration: none;">Unsubscribe</a>
                    <p style="margin: 15px 0 0;">© 2026 IPOGains. All rights reserved.</p>
                </div>
            </div>
        `
    }),

    // Welcome email
    welcome: (email, unsubscribeToken) => ({
        subject: `✅ Welcome to IPOGains - Subscription Confirmed!`,
        html: `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a2e; color: #ffffff; border-radius: 10px; overflow: hidden;">
                <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px; text-align: center;">
                    <h1 style="margin: 0; font-size: 28px;">✅ Subscription Confirmed!</h1>
                </div>
                
                <div style="padding: 30px; text-align: center;">
                    <h2 style="color: #fff; margin: 0 0 20px;">Welcome to IPOGains!</h2>
                    <p style="color: #a0a0a0; line-height: 1.6;">
                        Thank you for subscribing to our IPO notifications. You'll now receive:
                    </p>
                    
                    <div style="text-align: left; background: #252542; border-radius: 10px; padding: 20px; margin: 20px 0;">
                        <p style="margin: 10px 0; color: #fff;">✓ New IPO alerts</p>
                        <p style="margin: 10px 0; color: #fff;">✓ IPO status updates (Open/Closed/Listed)</p>
                        <p style="margin: 10px 0; color: #fff;">✓ GMP updates</p>
                        <p style="margin: 10px 0; color: #fff;">✓ Daily digest with all IPO activity</p>
                    </div>
                    
                    <div style="margin: 30px 0;">
                        <a href="${getSiteUrl()}" 
                           style="display: inline-block; padding: 15px 40px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
                            Explore IPOs →
                        </a>
                    </div>
                </div>
                
                <div style="background: #0f0f1a; padding: 20px; text-align: center; font-size: 12px; color: #666;">
                    <a href="${getSiteUrl()}/api/subscribers/unsubscribe/${unsubscribeToken}" style="color: #10b981; text-decoration: none;">Unsubscribe</a>
                    <p style="margin: 15px 0 0;">© 2026 IPOGains. All rights reserved.</p>
                </div>
            </div>
        `
    })
};

// Send email to a single subscriber
const sendEmail = async (to, template) => {
    if (!transporter) {
        console.log(`📧 Email not configured. Would send to ${to}: ${template.subject}`);
        return { success: true, skipped: true };
    }

    try {
        await transporter.sendMail({
            from: `"IPOGains" <${process.env.EMAIL_USER}>`,
            to: to,
            subject: template.subject,
            html: template.html
        });
        return { success: true };
    } catch (error) {
        console.error(`❌ Failed to send email to ${to}:`, error.message);
        return { success: false, error: error.message };
    }
};

// Send welcome email to new subscriber
const sendWelcomeEmail = async (email, unsubscribeToken) => {
    const template = emailTemplates.welcome(email, unsubscribeToken);
    return await sendEmail(email, template);
};

// Create notification for IPO changes
const createNotification = async (type, ipo, previousValue = null, newValue = null, customTitle = null, customMessage = null) => {
    try {
        let title = customTitle;
        let message = customMessage;

        if (!title || !message) {
            switch (type) {
                case 'new_ipo':
                    title = `New IPO Added: ${ipo.companyName}`;
                    message = `${ipo.companyName} IPO has been added. Price: ₹${ipo.priceRange.min}-${ipo.priceRange.max}. Opens: ${new Date(ipo.openDate).toLocaleDateString('en-IN')}`;
                    break;
                case 'status_change':
                    title = `${ipo.companyName} is now ${newValue.toUpperCase()}`;
                    message = `IPO status changed from ${previousValue || 'N/A'} to ${newValue}`;
                    break;
                case 'gmp_update':
                    title = `GMP Update: ${ipo.companyName}`;
                    message = `GMP changed from ₹${previousValue || 0} to ₹${newValue}`;
                    break;
                default:
                    title = `${ipo.companyName} Update`;
                    message = 'IPO information has been updated';
            }
        }

        const notification = new Notification({
            type,
            ipoId: ipo._id,
            ipoName: ipo.companyName,
            title,
            message,
            previousValue,
            newValue
        });

        await notification.save();
        console.log(`📝 Notification created: ${title}`);
        return notification;
    } catch (error) {
        console.error('❌ Error creating notification:', error.message);
        return null;
    }
};

// Send notifications to all active subscribers
const sendBulkNotification = async (notification, ipo = null) => {
    try {
        const subscribers = await Subscriber.find({ isActive: true });

        if (subscribers.length === 0) {
            console.log('📭 No active subscribers found');
            return { sent: 0, failed: 0 };
        }

        let sent = 0;
        let failed = 0;

        for (const subscriber of subscribers) {
            let template;

            switch (notification.type) {
                case 'new_ipo':
                    if (!subscriber.preferences.newIPO) continue;
                    template = emailTemplates.newIPO(ipo, subscriber.unsubscribeToken);
                    break;
                case 'status_change':
                    if (!subscriber.preferences.ipoStatusChange) continue;
                    template = emailTemplates.statusChange(ipo, notification.previousValue, notification.newValue, subscriber.unsubscribeToken);
                    break;
                default:
                    continue;
            }

            const result = await sendEmail(subscriber.email, template);

            if (result.success) {
                sent++;
                subscriber.lastNotificationSent = new Date();
                subscriber.notificationCount += 1;
                await subscriber.save();
            } else {
                failed++;
            }

            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Update notification status
        notification.isProcessed = true;
        notification.processedAt = new Date();
        notification.emailsSent = sent;
        notification.emailsFailed = failed;
        await notification.save();

        console.log(`📧 Bulk notification sent: ${sent} success, ${failed} failed`);
        return { sent, failed };
    } catch (error) {
        console.error('❌ Error sending bulk notification:', error.message);
        return { sent: 0, failed: 0, error: error.message };
    }
};

// Send daily digest to all subscribers
const sendDailyDigest = async () => {
    try {
        const IPO = require('../models/IPO');

        // Get current IPOs
        const openIPOs = await IPO.find({ status: 'open' }).sort({ closeDate: 1 });
        const upcomingIPOs = await IPO.find({ status: 'upcoming' }).sort({ openDate: 1 });

        // Get recent notifications from last 24 hours
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const recentChanges = await Notification.find({
            createdAt: { $gte: yesterday }
        }).sort({ createdAt: -1 }).limit(10);

        // Only send if there's something to report
        if (openIPOs.length === 0 && upcomingIPOs.length === 0 && recentChanges.length === 0) {
            console.log('📭 No IPO activity to report in daily digest');
            return { sent: 0, skipped: 'no_activity' };
        }

        const subscribers = await Subscriber.find({
            isActive: true,
            'preferences.dailyDigest': true
        });

        if (subscribers.length === 0) {
            console.log('📭 No subscribers opted for daily digest');
            return { sent: 0, skipped: 'no_subscribers' };
        }

        let sent = 0;
        let failed = 0;

        for (const subscriber of subscribers) {
            const template = emailTemplates.dailyDigest(
                { open: openIPOs, upcoming: upcomingIPOs },
                recentChanges,
                subscriber.unsubscribeToken
            );

            const result = await sendEmail(subscriber.email, template);

            if (result.success) {
                sent++;
                subscriber.lastNotificationSent = new Date();
                subscriber.notificationCount += 1;
                await subscriber.save();
            } else {
                failed++;
            }

            // Small delay
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        console.log(`📬 Daily digest sent: ${sent} success, ${failed} failed`);
        return { sent, failed };
    } catch (error) {
        console.error('❌ Error sending daily digest:', error.message);
        return { sent: 0, failed: 0, error: error.message };
    }
};

// Process pending notifications
const processPendingNotifications = async () => {
    try {
        const IPO = require('../models/IPO');
        const pendingNotifications = await Notification.find({ isProcessed: false }).sort({ createdAt: 1 });

        if (pendingNotifications.length === 0) {
            return { processed: 0 };
        }

        let processed = 0;

        for (const notification of pendingNotifications) {
            const ipo = await IPO.findById(notification.ipoId);
            if (ipo) {
                await sendBulkNotification(notification, ipo);
                processed++;
            } else {
                notification.isProcessed = true;
                notification.processedAt = new Date();
                await notification.save();
            }
        }

        return { processed };
    } catch (error) {
        console.error('❌ Error processing notifications:', error.message);
        return { processed: 0, error: error.message };
    }
};

module.exports = {
    isEmailConfigured,
    sendEmail,
    sendWelcomeEmail,
    createNotification,
    sendBulkNotification,
    sendDailyDigest,
    processPendingNotifications,
    emailTemplates
};
