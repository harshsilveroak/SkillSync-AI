const nodemailer = require('nodemailer');

/**
 * Configure Nodemailer Transporter using SMTP environment variables
 */
function createTransporter() {
  const host = process.env.EMAIL_HOST;
  const port = parseInt(process.env.EMAIL_PORT || '587', 10);
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASSWORD;
  const secure = process.env.EMAIL_SECURE === 'true' || port === 465;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    tls: {
      rejectUnauthorized: process.env.EMAIL_TLS_REJECT_UNAUTHORIZED !== 'false'
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000
  });
}

/**
 * Verify Transporter SMTP Connection
 */
async function verifyTransporter() {
  try {
    const transporter = createTransporter();
    if (!transporter) {
      console.log('[EMAIL SMTP]: SMTP environment variables not configured. Email features running in fallback mode.');
      return false;
    }
    await transporter.verify();
    console.log(`[EMAIL SMTP VERIFIED]: Successfully connected to ${process.env.EMAIL_HOST}:${process.env.EMAIL_PORT || 587}`);
    return true;
  } catch (err) {
    console.error(`[EMAIL SMTP VERIFICATION FAILED]: ${err.message}`);
    return false;
  }
}

/**
 * Send Password Reset Link Email (No OTP)
 */
async function sendPasswordResetEmail({ to, resetToken, resetUrl }) {
  const transporter = createTransporter();
  if (!transporter) {
    console.log(`[EMAIL FALLBACK]: Password reset token generated for ${to}: ${resetToken}`);
    return { success: true, fallback: true };
  }

  const from = process.env.EMAIL_FROM || '"SkillSync AI" <auth@skillsync.ai>';
  const subject = 'Reset Your SkillSync AI Password';
  const url = resetUrl || `http://localhost:8080/#reset-password?token=${resetToken}&email=${encodeURIComponent(to)}`;

  const htmlBody = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background-color: #07070b; color: #f4f4f5; margin: 0; padding: 0; }
        .container { max-width: 540px; margin: 30px auto; background-color: #0e0e17; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 20px; padding: 40px; }
        .logo { font-size: 20px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px; margin-bottom: 24px; text-align: center; }
        .logo span { color: #00f0ff; }
        .badge { display: inline-block; padding: 4px 12px; background: rgba(99, 102, 241, 0.15); border: 1px solid rgba(99, 102, 241, 0.4); border-radius: 999px; color: #00f0ff; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 16px; }
        h1 { font-size: 22px; font-weight: 800; color: #ffffff; margin: 0 0 12px 0; text-align: center; }
        p { font-size: 14px; color: #94a3b8; line-height: 1.6; margin: 0 0 24px 0; text-align: center; }
        .btn-box { text-align: center; margin: 28px 0; }
        .btn { display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #ffffff; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 14px; box-shadow: 0 10px 25px rgba(99, 102, 241, 0.4); }
        .footer { border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 20px; margin-top: 30px; text-align: center; font-size: 12px; color: #64748b; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">SkillSync <span>AI</span></div>
        <div style="text-align: center;"><span class="badge">Password Reset</span></div>
        <h1>Reset Your Password</h1>
        <p>You requested a password reset for your SkillSync AI account. Click the button below to set a new password:</p>
        
        <div class="btn-box">
          <a href="${url}" class="btn">Reset Password</a>
        </div>

        <p>If you did not request this password reset, you can safely ignore this email.</p>

        <div class="footer">
          <strong>SkillSync AI Platform</strong><br />
          Build better teams. Build better projects.
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html: htmlBody,
      text: `Reset your SkillSync AI password by visiting: ${url}`
    });
    console.log(`[EMAIL SUCCESS] Password reset email delivered to ${to}. MessageId: ${info.messageId}`);
    return info;
  } catch (err) {
    console.error(`[EMAIL ERROR] Password reset delivery failed for ${to}:`, err.message);
    return { success: false, error: err.message };
  }
}

module.exports = {
  sendPasswordResetEmail,
  verifyTransporter
};
