// utils/email.js - Native fetch version (NO PACKAGES NEEDED)
import config from "../config/env.js";

export const sendMail = async ({ to, subject, text, html }) => {
  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': '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'
      },
      body: JSON.stringify({
        sender: {
          name: 'NearBuy Support',
          email: 'supportnearbuy.ng@gmail.com'
        },
        to: [{ email: to }],
        subject: subject,
        htmlContent: html || '',
        textContent: text || ''
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log("✅ Email sent! Message ID:", data.messageId);
      return data;
    } else {
      throw new Error(data.message || 'Failed to send email');
    }
  } catch (error) {
    console.error("❌ Email failed:", error.message);
    throw error;
  }
};

export default sendMail;
