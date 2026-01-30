const brevo = require('@getbrevo/brevo');

// Initialize Brevo API Instance
const apiInstance = new brevo.TransactionalEmailsApi();

// Helper to get API Key (checks env)
const getApiKey = () => process.env.BREVO_API_KEY;

// Check if email service is configured
const isEmailConfigured = () => {
  return !!process.env.BREVO_API_KEY;
};

// Internal helper to send email via Brevo
const sendEmail = async (to, subject, htmlContent) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    if (process.env.NODE_ENV === 'production') {
      console.error('❌ CRITICAL: BREVO_API_KEY not configured in PRODUCTION.');
      return { success: false, error: 'Email service not configured' };
    }
    console.log(`📧 Email simulation (DEV): To: ${to}, Subject: ${subject}`);
    return { success: true };
  }

  // Configure Auth
  const apiKeyInstance = apiInstance.authentications['apiKey'];
  apiKeyInstance.apiKey = apiKey;

  const emailData = new brevo.SendSmtpEmail();
  emailData.sender = { "name": "IPOGains", "email": process.env.SENDER_EMAIL || "no-reply@ipogains.com" };
  emailData.to = [{ "email": to }];
  emailData.subject = subject;
  emailData.htmlContent = htmlContent;

  try {
    await apiInstance.sendTransacEmail(emailData);
    console.log(`✅ Email sent successfully to ${to}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Brevo Email Error:', error.body || error.message);
    return { success: false, error: error.message };
  }
};

const sendOTP = async (email, otp) => {
  const subject = 'Your OTP for IPOGains Login';
  const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; border: 1px solid #eee; border-radius: 10px; padding: 20px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="https://raw.githubusercontent.com/Aman546u/ipogains/main/frontend/favicon.png" alt="IPOGains" style="width: 80px; height: 80px;">
        </div>
        <h2 style="color: #22c55e; text-align: center;">IPOGains - Email Verification</h2>
        <p>Your One-Time Password (OTP) is:</p>
        <h1 style="color: #22c55e; font-size: 36px; letter-spacing: 5px; margin: 20px 0; text-align: center;">${otp}</h1>
        <p>This OTP will expire in 10 minutes.</p>
        <p style="font-size: 14px; color: #666;">If you didn't request this, please ignore this email.</p>
        <hr style="border: 1px solid #eee; margin: 30px 0;">
        <p style="font-size: 12px; color: #999;">© 2026 IPOGains. All rights reserved.</p>
      </div>
    `;

  return await sendEmail(email, subject, htmlContent);
};

const sendAllotmentNotification = async (email, ipoName, status) => {
  const subject = `IPO Allotment Update - ${ipoName}`;
  const statusColor = status === 'allotted' ? '#22c55e' : '#ef4444';
  const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; border: 1px solid #eee; border-radius: 10px; padding: 20px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="https://raw.githubusercontent.com/Aman546u/ipogains/main/frontend/favicon.png" alt="IPOGains" style="width: 80px; height: 80px;">
        </div>
        <h2 style="color: #22c55e; text-align: center;">IPOGains - Allotment Update</h2>
        <p>Dear Investor,</p>
        <p>The allotment status for <strong>${ipoName}</strong> has been updated:</p>
        <div style="padding: 15px; border-radius: 8px; background-color: ${statusColor}15; border: 1px solid ${statusColor}; text-align: center; margin: 20px 0;">
            <h3 style="color: ${statusColor}; margin: 0;">
              Status: ${status.toUpperCase()}
            </h3>
        </div>
        <p>Check your dashboard for more details.</p>
        <a href="${process.env.FRONTEND_URL}/dashboard" 
           style="display: inline-block; padding: 12px 24px; background: #22c55e; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold;">
          View Dashboard
        </a>
        <hr style="border: 1px solid #eee; margin: 30px 0;">
        <p style="font-size: 12px; color: #999;">© 2026 IPOGains. All rights reserved.</p>
      </div>
    `;

  return await sendEmail(email, subject, htmlContent);
};

module.exports = { sendOTP, sendAllotmentNotification, isEmailConfigured, sendEmail };
