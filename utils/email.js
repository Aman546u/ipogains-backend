const nodemailer = require('nodemailer');

// Check if email is configured
const isEmailConfigured = () => {
  return process.env.EMAIL_USER &&
    process.env.EMAIL_PASSWORD &&
    process.env.EMAIL_USER !== 'your-email@gmail.com' &&
    process.env.EMAIL_PASSWORD !== 'your-16-character-app-password';
};

// Create transporter only if email is configured
// Create transporter only if email is configured
let transporter = null;
if (isEmailConfigured()) {
  const port = parseInt(process.env.EMAIL_PORT) || 587;
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: port,
    secure: port === 465, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    },
    // Add timeouts to fail faster if connection is blocked
    connectionTimeout: 10000,
    greetingTimeout: 5000,
    socketTimeout: 10000
  });
  console.log(`✅ Email service configured on port ${port} (secure: ${port === 465})`);
} else {
  console.log('⚠️  Email service not configured - OTP emails will be skipped');
}

const sendOTP = async (email, otp) => {
  // If email not configured
  if (!transporter) {
    if (process.env.NODE_ENV === 'production') {
      console.error('❌ CRITICAL: Email service not configured in PRODUCTION. Cannot send OTP.');
      return false;
    }
    console.log(`📧 Email not configured (DEV MODE). OTP for ${email}: ${otp}`);
    console.log('💡 Configure EMAIL_USER and EMAIL_PASSWORD in .env to enable email');
    return true; // Return true in DEV so development can proceed without email
  }

  const mailOptions = {
    from: `"IPOGains" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Your OTP for IPOGains Login',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #22c55e;">IPOGains - Email Verification</h2>
        <p>Your One-Time Password (OTP) is:</p>
        <h1 style="color: #22c55e; font-size: 36px; letter-spacing: 5px;">${otp}</h1>
        <p>This OTP will expire in 10 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <hr style="border: 1px solid #eee; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">© 2024 IPOGains. All rights reserved.</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ OTP email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('❌ Email send error:', error.message);
    console.log(`📧 OTP for ${email}: ${otp}`);
    return false;
  }
};

const sendAllotmentNotification = async (email, ipoName, status) => {
  // If email not configured, just log and return
  if (!transporter) {
    console.log(`📧 Email not configured. Allotment notification for ${email} skipped`);
    return true;
  }

  const mailOptions = {
    from: `"IPOGains" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `IPO Allotment Update - ${ipoName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #22c55e;">IPOGains - Allotment Update</h2>
        <p>Dear Investor,</p>
        <p>The allotment status for <strong>${ipoName}</strong> has been updated:</p>
        <h3 style="color: ${status === 'allotted' ? '#22c55e' : '#ef4444'};">
          Status: ${status.toUpperCase()}
        </h3>
        <p>Check your dashboard for more details.</p>
        <a href="${process.env.FRONTEND_URL}/dashboard" 
           style="display: inline-block; padding: 12px 24px; background: #22c55e; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">
          View Dashboard
        </a>
        <hr style="border: 1px solid #eee; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">© 2024 IPOGains. All rights reserved.</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Allotment notification sent to ${email}`);
    return true;
  } catch (error) {
    console.error('❌ Email send error:', error.message);
    return false;
  }
};

module.exports = { sendOTP, sendAllotmentNotification, isEmailConfigured };
