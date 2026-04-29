// services/mailer.js - Simple version for testing
import nodemailer from 'nodemailer';

// For testing - just log emails to console
const isDevelopment = process.env.NODE_ENV === 'development';

export const sendMail = async ({ to, subject, html }) => {
  // Always log to console for debugging
  console.log(`\n📧 ========== EMAIL ==========`);
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Content: ${html.replace(/<[^>]*>/g, '').substring(0, 200)}...`);
  console.log(`==============================\n`);

  // For development, don't actually send emails
  if (isDevelopment) {
    console.log(`🔧 Development mode - Email not actually sent`);
    return { success: true, message: "Email logged to console" };
  }

  // For production, configure real email
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const info = await transporter.sendMail({
    from: `"NearBuy" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });

  return info;
};
