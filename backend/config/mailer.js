import nodemailer from "nodemailer";
import config from "../config/env.js"; 

// Debug log (remove after fixing)
console.log('📧 Email config loaded:', {
  user: config.email.user,
  hasPass: !!config.email.pass,
  passLength: config.email.pass?.length
});

const transporter = nodemailer.createTransport({
  host: config.email.host || 'smtp.gmail.com',
  port: config.email.port || 587,
  secure: false,
  auth: {
    user: config.email.user,
    pass: config.email.pass,
  },
  // Add connection timeout
  connectionTimeout: 5000,
});

// Verify transporter configuration
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Transporter verification failed:', error.message);
  } else {
    console.log('✅ Transporter ready to send emails');
  }
});

export default transporter;

export const sendMail = async ({
  to,
  subject,
  text,
  html
}) => {
  // Validate inputs
  if (!to) {
    throw new Error('Recipient email address is required');
  }
  
  if (!config.email.user || !config.email.pass) {
    throw new Error('Email credentials missing in configuration');
  }

  try {
    const info = await transporter.sendMail({
      from: `"NearBuy Support" <${config.email.user}>`, 
      to,
      subject,
      text,
      html
    });

    console.log("✅ Email sent:", info.messageId);
    return info;
  } catch (error) {
    console.error("❌ Mail Error Details:", {
      message: error.message,
      code: error.code,
      response: error.response,
      command: error.command
    });
    throw error;
  }
};
