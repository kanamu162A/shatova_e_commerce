// utils/email.js - Using your existing templates
import EmailTemplateBuilder from './email.template.js'; // Import your templates
import config from "../config/env.js";

export const sendMail = async ({ to, subject, text, html, templateName, templateData }) => {
  try {
    // Generate HTML from templates if templateName is provided
    let finalHtml = html;
    let finalText = text;
    
    if (templateName && templateData) {
      switch(templateName) {
        case 'welcome':
          finalHtml = EmailTemplateBuilder.welcomeEmail(templateData.name, {
            verificationLink: templateData.verificationLink,
            role: templateData.role || 'member'
          });
          finalText = `Welcome ${templateData.name}! Your account has been created.`;
          break;
          
        case 'welcomeBack':
          finalHtml = EmailTemplateBuilder.welcomeBackEmail(templateData.name, templateData.loginDetails);
          finalText = `Welcome back ${templateData.name}! You've signed in from ${templateData.loginDetails?.device || 'a new device'}.`;
          break;
          
        case 'otp':
          finalHtml = EmailTemplateBuilder.otpEmail(templateData.name, templateData.otp, templateData.expiryMinutes, templateData.purpose);
          finalText = `Your verification code is: ${templateData.otp}. Valid for ${templateData.expiryMinutes || 10} minutes.`;
          break;
          
        case 'forgotPassword':
          finalHtml = EmailTemplateBuilder.forgotPasswordEmail(templateData.name, templateData.resetToken, templateData.expiryMinutes);
          finalText = `Reset your password using this link: ${process.env.WEBSITE_URL}/reset-password?token=${templateData.resetToken}`;
          break;
          
        case 'passwordResetSuccess':
          finalHtml = EmailTemplateBuilder.passwordResetSuccessEmail(templateData.name);
          finalText = `Hello ${templateData.name}, your password has been successfully changed.`;
          break;
          
        case 'securityAlert':
          finalHtml = EmailTemplateBuilder.securityAlert(templateData.name, templateData.alertType, templateData.details);
          finalText = `Security alert: ${templateData.details?.message || 'Suspicious activity detected on your account'}`;
          break;
          
        case 'transaction':
          finalHtml = EmailTemplateBuilder.transactionEmail(templateData.name, templateData.transactionDetails);
          finalText = `Your ${templateData.transactionDetails?.type || 'transaction'} has been ${templateData.transactionDetails?.status || 'completed'}.`;
          break;
          
        default:
          finalHtml = html || EmailTemplateBuilder.baseTemplate({
            title: subject,
            content: `<p>${text || html}</p>`,
            headerIcon: "📧"
          });
      }
    }
    
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
          email: config.email.user || 'supportnearbuy.ng@gmail.com'
        },
        to: [{ email: to }],
        subject: subject,
        htmlContent: finalHtml || '',
        textContent: finalText || ''
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log("✅ Email sent! Message ID:", data.messageId);
      return data;
    } else {
      console.error("Brevo API Error:", data);
      throw new Error(data.message || 'Failed to send email');
    }
  } catch (error) {
    console.error("❌ Email failed:", error.message);
    throw error;
  }
};

export default sendMail;
