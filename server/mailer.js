const nodemailer = require('nodemailer');

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.hostinger.com';
const SMTP_PORT = Number(process.env.SMTP_PORT) || 465;
const SMTP_USER = process.env.SMTP_USER || 'ccna-dumps@hassanagro.com';
const SMTP_PASS = process.env.SMTP_PASS || 'z?Y3:HBBa6^';
const SMTP_FROM = process.env.SMTP_FROM || '"Cisco CCNA Exam Prep" <ccna-dumps@hassanagro.com>';

// Create reusable transporter object using SSL (Port 465)
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

// Verify transporter on startup
transporter.verify((error, success) => {
  if (error) {
    console.warn('⚠️ SMTP Transporter Connection Warning:', error.message);
  } else {
    console.log('✅ SMTP Mailer Connected successfully to Hostinger (ccna-dumps@hassanagro.com)');
  }
});

/**
 * Send 6-digit verification email
 */
async function sendVerificationEmail(toEmail, recipientName, otpCode) {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Email Verification Code</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; margin: 0; padding: 20px; color: #f8fafc; }
        .email-container { max-width: 540px; margin: 0 auto; background-color: #1e293b; border-radius: 12px; border: 1px solid #334155; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
        .email-header { background: #090d16; padding: 24px 30px; border-bottom: 1px solid #334155; text-align: center; }
        .brand-badge { font-size: 20px; font-weight: 800; color: #22c55e; letter-spacing: 0.5px; }
        .email-body { padding: 30px; text-align: center; }
        .greeting { font-size: 18px; font-weight: 700; color: #ffffff; margin-bottom: 12px; }
        .lead-text { font-size: 15px; color: #94a3b8; line-height: 1.5; margin-bottom: 24px; }
        .otp-box { background: #0f172a; border: 2px dashed #22c55e; border-radius: 10px; padding: 18px 24px; margin: 20px auto; display: inline-block; }
        .otp-digits { font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 12px; color: #4ade80; margin: 0; }
        .otp-expiry { font-size: 13px; color: #64748b; margin-top: 14px; }
        .notice-box { background: rgba(56, 189, 248, 0.08); border-left: 3px solid #38bdf8; padding: 12px 16px; margin-top: 24px; text-align: left; border-radius: 0 6px 6px 0; }
        .notice-text { font-size: 13px; color: #cbd5e1; margin: 0; line-height: 1.4; }
        .email-footer { background-color: #090d16; padding: 16px 30px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #334155; }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="email-header">
          <span class="brand-badge">⫸ Cisco 200-301 CCNA Simulator</span>
        </div>
        <div class="email-body">
          <h2 class="greeting">Verify Your Candidate Account</h2>
          <p class="lead-text">Hello <strong>${recipientName || 'Candidate'}</strong>,<br/>Thank you for registering. Use the 6-digit verification code below to activate your CCNA practice account and sync your exam progress:</p>
          
          <div class="otp-box">
            <h1 class="otp-digits">${otpCode}</h1>
          </div>
          
          <div class="otp-expiry">⏱️ This code is valid for <strong>15 minutes</strong>. Do not share it with anyone.</div>
          
          <div class="notice-box">
            <p class="notice-text">💡 <strong>Tip:</strong> If you did not sign up for the Cisco CCNA 200-301 Exam Simulator, you can safely ignore this message.</p>
          </div>
        </div>
        <div class="email-footer">
          © ${new Date().getFullYear()} CCNA Exam Simulator • Automated Verification Service
        </div>
      </div>
    </body>
    </html>
  `;

  return transporter.sendMail({
    from: SMTP_FROM,
    to: toEmail,
    subject: `🔐 ${otpCode} is your Cisco CCNA Verification Code`,
    text: `Your Cisco CCNA verification code is: ${otpCode}. It is valid for 15 minutes.`,
    html: htmlContent,
  });
}

/**
 * Send Password Reset email
 */
async function sendPasswordResetEmail(toEmail, recipientName, resetCode) {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Password Reset Code</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; margin: 0; padding: 20px; color: #f8fafc; }
        .email-container { max-width: 540px; margin: 0 auto; background-color: #1e293b; border-radius: 12px; border: 1px solid #334155; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
        .email-header { background: #090d16; padding: 24px 30px; border-bottom: 1px solid #334155; text-align: center; }
        .brand-badge { font-size: 20px; font-weight: 800; color: #38bdf8; letter-spacing: 0.5px; }
        .email-body { padding: 30px; text-align: center; }
        .greeting { font-size: 18px; font-weight: 700; color: #ffffff; margin-bottom: 12px; }
        .lead-text { font-size: 15px; color: #94a3b8; line-height: 1.5; margin-bottom: 24px; }
        .otp-box { background: #0f172a; border: 2px dashed #38bdf8; border-radius: 10px; padding: 18px 24px; margin: 20px auto; display: inline-block; }
        .otp-digits { font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 12px; color: #38bdf8; margin: 0; }
        .otp-expiry { font-size: 13px; color: #64748b; margin-top: 14px; }
        .email-footer { background-color: #090d16; padding: 16px 30px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #334155; }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="email-header">
          <span class="brand-badge">⫸ Cisco CCNA Password Recovery</span>
        </div>
        <div class="email-body">
          <h2 class="greeting">Reset Your Account Password</h2>
          <p class="lead-text">Hello <strong>${recipientName || 'Candidate'}</strong>,<br/>We received a request to reset the password for your CCNA simulator account. Enter the 6-digit recovery code below:</p>
          
          <div class="otp-box">
            <h1 class="otp-digits">${resetCode}</h1>
          </div>
          
          <div class="otp-expiry">⏱️ This code is valid for <strong>15 minutes</strong>. If you did not request a password reset, please secure your account.</div>
        </div>
        <div class="email-footer">
          © ${new Date().getFullYear()} CCNA Exam Simulator • Security Service
        </div>
      </div>
    </body>
    </html>
  `;

  return transporter.sendMail({
    from: SMTP_FROM,
    to: toEmail,
    subject: `🔑 ${resetCode} is your CCNA Password Reset Code`,
    text: `Your password reset code is: ${resetCode}. It is valid for 15 minutes.`,
    html: htmlContent,
  });
}

module.exports = {
  transporter,
  sendVerificationEmail,
  sendPasswordResetEmail,
};
