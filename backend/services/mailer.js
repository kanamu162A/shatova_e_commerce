// services/mailer.js - Complete working version
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get email config from environment
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.gmail.com';
const EMAIL_PORT = process.env.EMAIL_PORT || 587;

// Create transporter if credentials exist
let transporter = null;

if (EMAIL_USER && EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    host: EMAIL_HOST,
    port: parseInt(EMAIL_PORT),
    secure: EMAIL_PORT === '465',
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
  });
  
  // Verify connection
  transporter.verify((error, success) => {
    if (error) {
      console.error('❌ Email configuration error:', error.message);
    } else {
      console.log('✅ Email service ready');
    }
  });
} else {
  console.warn('⚠️ Email credentials missing. Set EMAIL_USER and EMAIL_PASS');
}

// Simple fallback email template (in case EmailTemplateBuilder fails)
const fallbackEmailTemplate = ({ name, otp, purpose, expiryMinutes }) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${purpose === 'login' ? 'Login Verification' : 'Password Reset'}</title>
      <style>
        body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }
        .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; }
        .header { background: #0F172A; color: white; padding: 30px; text-align: center; }
        .otp { font-size: 48px; font-family: monospace; letter-spacing: 10px; background: #f0f0f0; padding: 20px; margin: 20px; text-align: center; font-weight: bold; }
        .content { padding: 30px; text-align: center; }
        .footer { background: #f9f9f9; padding: 15px; text-align: center; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🛍️ NearBuy</h1>
          <p>${purpose === 'login' ? 'Login Verification' : 'Password Reset'}</p>
        </div>
        <div class="content">
          <h2>Hello ${name}!</h2>
          <p>Your verification code is:</p>
          <div class="otp">${otp}</div>
          <p>This code expires in <strong>${expiryMinutes} minutes</strong>.</p>
          <p>If you didn't request this, please ignore this email.</p>
        </div>
        <div class="footer">
          <p>© 2025 NearBuy - Safe buying & selling platform</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Main sendMail function
export const sendMail = async ({ to, subject, html, text }) => {
  // Always log email attempts
  console.log(`\n📧 ========== EMAIL ATTEMPT ==========`);
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Time: ${new Date().toISOString()}`);
  console.log(`=====================================\n`);

  // If no transporter, just log and return success (for testing)
  if (!transporter) {
    console.log(`⚠️ No email transporter configured. Email not sent.`);
    console.log(`💡 To send real emails, set EMAIL_USER and EMAIL_PASS in environment.`);
    return { success: true, message: "Email logged (no transporter)" };
  }

  try {
    const mailOptions = {
      from: `"NearBuy" <${EMAIL_USER}>`,
      to,
      subject,
      text: text || html?.replace(/<[^>]*>/g, '') || 'Verification code',
      html: html || text,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent successfully to ${to}`);
    console.log(`📨 Message ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ Failed to send email to ${to}:`, error.message);
    return { success: false, error: error.message };
  }
};

// Helper function to send OTP emails (compatible with EmailTemplateBuilder)
export const sendOTPEmail = async (email, name, otp, purpose = 'login') => {
  const expiryMinutes = purpose === 'login' ? 5 : 10;
  const subject = purpose === 'login' 
    ? '🔐 Your Login Verification Code - NearBuy'
    : '🔑 Password Reset OTP - NearBuy';
  
  // Try to use EmailTemplateBuilder if available, otherwise use fallback
  let html;
  try {
    const EmailTemplateBuilder = (await import('./emailTemplates.js')).default;
    html = EmailTemplateBuilder.otpEmail(name, otp, expiryMinutes, purpose);
  } catch (error) {
    console.log('Using fallback email template');
    html = fallbackEmailTemplate({ name, otp, purpose, expiryMinutes });
  }
  
  return await sendMail({ to: email, subject, html });
};
