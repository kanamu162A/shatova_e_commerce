// utils/email.js
import nodemailer from "nodemailer";
import config from "../config/env.js";

// Use Brevo SMTP (free, works on Render)
const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false, // TLS required
  auth: {
    user: 'a9b843001@smtp-brevo.com', // Your Brevo SMTP login
    pass: 'xsmtpsib-4a5971da2ccce59845e11b7a0db54e643c20b4213d32a89a461f6261fef5fd92-Rl6J3hx6qbDUoHF1', // Your SMTP key
  },
  family: 4, // Force IPv4 for Render
  tls: {
    ciphers: 'SSLv3',
    rejectUnauthorized: false,
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
});

// Verify connection on startup
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Brevo SMTP connection failed:', error.message);
  } else {
    console.log('✅ Brevo SMTP ready - 300 free emails/day');
  }
});

export const sendMail = async ({ to, subject, text, html }) => {
  try {
    const info = await transporter.sendMail({
      from: `"NearBuy Support" <supportnearbuy.ng@gmail.com>`,
      to: to,
      subject: subject,
      text: text || '',
      html: html || '',
    });

    console.log("✅ Email sent! Message ID:", info.messageId);
    return info;
  } catch (error) {
    console.error("❌ Email failed:", error.message);
    throw error;
  }
};

export default sendMail;
