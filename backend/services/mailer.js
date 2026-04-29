import transporter from "../config/mailer.js";
import pool from "../config/db.js";

const OTP_EXPIRY = 300; // seconds

// Reusable beautiful email template
const emailTemplate = ({ title, heading, message }) => {
  return `
    <div style="font-family: Arial, sans-serif; background:#f4f4f4; padding:30px;">
      <div style="max-width:600px; margin:auto; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 2px 10px rgba(0,0,0,0.1);">

        <div style="background:#111827; color:white; padding:20px; text-align:center;">
          <h1 style="margin:0;">NearBuy</h1>
          <p style="margin:5px 0 0;">${title}</p>
        </div>

        <div style="padding:30px; color:#333;">
          <h2 style="margin-top:0;">${heading}</h2>
          <p style="line-height:1.7;">
            ${message}
          </p>
        </div>

        <div style="background:#f9fafb; padding:15px; text-align:center; font-size:12px; color:#777;">
          © 2026 NearBuy • Safe buying & selling
        </div>
      </div>
    </div>
  `;
};

// General mail sender
export const sendMail = async ({ to, subject, text, html }) => {
  try {
    const info = await transporter.sendMail({
      from: `"NearBuy Support" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html
    });

    console.log("Email sent successfully:", info.messageId);

    return {
      success: true,
      messageId: info.messageId
    };
  } catch (error) {
    console.error("Mail Error:", error.message);

    return {
      success: false,
      error: error.message
    };
  }
};

// Create OTP, save to DB, send beautiful email
export const createAndSendOTP = async (userId, email) => {
  try {
    const otp = Math.floor(100000 + Math.random() * 900000);

    const expiresAt = new Date(
      Date.now() + OTP_EXPIRY * 1000
    );

    await pool.query(
      `
      INSERT INTO user_otps (user_id, otp_code, expires_at)
      VALUES ($1, $2, $3)
      `,
      [userId, otp, expiresAt]
    );

    const emailResult = await sendMail({
      to: email,
      subject: "Your Login OTP Code",
      text: `Your OTP is ${otp}. It expires in 30 seconds.`,
      html: emailTemplate({
        title: "Login Verification",
        heading: "Your One-Time Password",
        message: `
          Use the code below to complete your login:<br><br>
          <strong style="font-size:32px; letter-spacing:5px;">${otp}</strong>
          <br><br>
          This OTP will expire in <strong>${OTP_EXPIRY} seconds</strong>.
          <br><br>
          If this was not you, please ignore this email.
        `
      })
    });

    if (!emailResult.success) {
      throw new Error("Failed to send OTP email");
    }

    return {
      success: true
    };
  } catch (error) {
    console.error("OTP Error:", error.message);

    return {
      success: false,
      error: error.message
    };
  }
};

// Verify OTP
export const verifyOTP = async (userId, otp) => {
  try {
    const result = await pool.query(
      `
      SELECT * FROM user_otps
      WHERE user_id = $1 AND otp_code = $2
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [userId, otp]
    );

    const otpRecord = result.rows[0];

    if (!otpRecord) {
      return {
        success: false,
        message: "Invalid OTP"
      };
    }

    const now = new Date();

    if (now > otpRecord.expires_at) {
      return {
        success: false,
        message: "OTP expired"
      };
    }

    await pool.query(
      "DELETE FROM user_otps WHERE id = $1",
      [otpRecord.id]
    );

    return {
      success: true,
      message: "OTP verified successfully"
    };
  } catch (error) {
    console.error("Verify OTP Error:", error.message);

    return {
      success: false,
      message: "Server error"
    };
  }
};
