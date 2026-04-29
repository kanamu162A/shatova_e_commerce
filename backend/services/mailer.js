// services/mailer.js - COMPLETE REPLACEMENT
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Email configuration from env
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.gmail.com';
const EMAIL_PORT = process.env.EMAIL_PORT || 587;

// Create transporter
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
      console.error('❌ Email transporter error:', error.message);
    } else {
      console.log('✅ Email service ready');
    }
  });
} else {
  console.warn('⚠️ Email credentials missing - emails will be logged to console');
}

// Simple email template
const simpleEmailTemplate = ({ title, heading, message, otp = null }) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }
        .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: #0F172A; color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; }
        .content { padding: 40px 30px; text-align: center; }
        .otp-code { font-size: 48px; font-family: monospace; letter-spacing: 10px; background: #F3F4F6; padding: 20px; border-radius: 10px; margin: 20px 0; font-weight: bold; color: #0F172A; }
        .button { background: #3B82F6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 20px 0; }
        .footer { background: #F9FAFB; padding: 20px; text-align: center; font-size: 12px; color: #6B7280; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🛍️ NearBuy</h1>
          <p>${title}</p>
        </div>
        <div class="content">
          <h2>${heading}</h2>
          <p>${message}</p>
          ${otp ? `<div class="otp-code">${otp}</div>` : ''}
          <p style="color: #6B7280; font-size: 14px; margin-top: 30px;">This code expires in 5 minutes for security.</p>
        </div>
        <div class="footer">
          <p>© 2026 NearBuy - Safe buying & selling platform</p>
          <p>If you didn't request this, please ignore this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Main sendMail function
export const sendMail = async ({ to, subject, html, text }) => {
  // Always log to console for debugging
  console.log(`\n📧 ========== EMAIL ==========`);
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`==============================\n`);

  // If no transporter configured, just log
  if (!transporter) {
    console.log(`⚠️ Email not sent - no transporter configured`);
    return { success: true, message: "Email logged (no transporter)" };
  }

  try {
    const info = await transporter.sendMail({
      from: `"NearBuy" <${EMAIL_USER}>`,
      to,
      subject,
      text: text || html?.replace(/<[^>]*>/g, ''),
      html: html || simpleEmailTemplate({ title: subject, heading: subject, message: text })
    });
    
    console.log(`✅ Email sent successfully to ${to}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ Failed to send email to ${to}:`, error.message);
    return { success: false, error: error.message };
  }
};

// Helper to send OTP email
export const sendOTPEmail = async (email, name, otp, purpose = 'login') => {
  const subject = purpose === 'login' 
    ? '🔐 Your Login Verification Code'
    : '🔑 Password Reset OTP';
  
  const html = simpleEmailTemplate({
    title: purpose === 'login' ? 'Login Verification' : 'Password Reset',
    heading: `Hello ${name}!`,
    message: `Use the verification code below to ${purpose === 'login' ? 'complete your login' : 'reset your password'}.`,
    otp: otp
  });
  
  return await sendMail({ to: email, subject, html });
};
