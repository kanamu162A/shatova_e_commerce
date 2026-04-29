// services/mailer.js - Fixed version with better error handling
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Get email configuration
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.gmail.com';
const EMAIL_PORT = process.env.EMAIL_PORT || 587;

console.log('📧 Email Configuration:');
console.log(`  Host: ${EMAIL_HOST}`);
console.log(`  Port: ${EMAIL_PORT}`);
console.log(`  User: ${EMAIL_USER ? EMAIL_USER : '❌ NOT SET'}`);
console.log(`  Pass: ${EMAIL_PASS ? '✅ SET' : '❌ NOT SET'}`);

// Create transporter
let transporter = null;

if (EMAIL_USER && EMAIL_PASS) {
  try {
    transporter = nodemailer.createTransport({
      host: EMAIL_HOST,
      port: parseInt(EMAIL_PORT),
      secure: EMAIL_PORT === '465',
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },
      // Add timeout and debug options
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });
    
    // Verify connection
    transporter.verify((error, success) => {
      if (error) {
        console.error('❌ Email transporter verification failed:', error.message);
      } else {
        console.log('✅ Email transporter ready');
      }
    });
  } catch (error) {
    console.error('❌ Failed to create email transporter:', error.message);
  }
} else {
  console.warn('⚠️ Email credentials missing. Set EMAIL_USER and EMAIL_PASS in .env');
}

// Simple email template
const simpleEmailTemplate = (name, otp, expiryMinutes) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Verification Code</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }
    .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { background: #0F172A; color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 40px 30px; text-align: center; }
    .otp { font-size: 48px; font-family: monospace; letter-spacing: 10px; background: #f0f0f0; padding: 20px; margin: 20px 0; border-radius: 8px; font-weight: bold; }
    .footer { background: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🛍️ NearBuy</h1>
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

export const sendMail = async ({ to, subject, html, text }) => {
  console.log(`\n📧 Attempting to send email to: ${to}`);
  console.log(`Subject: ${subject}`);
  
  if (!transporter) {
    console.error('❌ No email transporter available. Email not sent.');
    console.log('💡 Please check your EMAIL_USER and EMAIL_PASS environment variables.');
    return { success: false, error: 'No email transporter configured' };
  }

  try {
    const mailOptions = {
      from: `"NearBuy" <${EMAIL_USER}>`,
      to,
      subject,
      text: text || html?.replace(/<[^>]*>/g, '') || 'Your verification code',
      html: html || simpleEmailTemplate('User', '000000', 5),
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent successfully! Message ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ Failed to send email:`);
    console.error(`   Error: ${error.message}`);
    console.error(`   Code: ${error.code}`);
    console.error(`   Command: ${error.command}`);
    if (error.response) console.error(`   Response: ${error.response}`);
    return { success: false, error: error.message };
  }
};
