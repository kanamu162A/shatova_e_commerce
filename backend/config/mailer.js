// utils/email.js
import Brevo from '@getbrevo/brevo';
import dotenv from 'dotenv';
dotenv.config();

// Initialize Brevo API
let apiInstance = new Brevo.TransactionalEmailsApi();
let apiKey = apiInstance.authentications['apiKey'];
apiKey.apiKey = process.env.BREVO_API_KEY;

export const sendMail = async ({ to, subject, text, html }) => {
  try {
    let sendSmtpEmail = new Brevo.SendSmtpEmail();
    
    sendSmtpEmail.sender = {
      name: 'NearBuy Support',
      email: process.env.EMAIL_USER || 'supportnearbuy.ng@gmail.com'
    };
    
    sendSmtpEmail.to = [{ email: to }];
    sendSmtpEmail.subject = subject;
    sendSmtpEmail.textContent = text || '';
    sendSmtpEmail.htmlContent = html || '';
    
    const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
    
    console.log("✅ Email sent! Message ID:", response.messageId);
    return response;
    
  } catch (error) {
    console.error("❌ Email failed:", error.response?.body?.message || error.message);
    throw error;
  }
};

export default sendMail;
