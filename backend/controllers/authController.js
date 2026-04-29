import bcrypt from "bcrypt";
import pool from "../config/db.js";
import { sendMail } from "../services/mailer.js";
import EmailTemplateBuilder from "../services/emailTemplates.js";
import crypto from "crypto";
import jwt from "jsonwebtoken";

// Change from 10 minutes to 1 minute
const OTP_EXPIRY_MINUTES = 5;  // 1 minute expiry (60 seconds)
const RESET_TOKEN_EXPIRY_MINUTES = 5;  // Also 1 minute for reset OTP

const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

const generateResetToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// ============================
// REGISTER USER
// ============================
export const registerUser = async (req, res) => {
  try {
    const { email, phone, name, password } = req.body;

    // Log incoming request for debugging
    console.log("Registration attempt for:", { email, phone, name });

    if (!email || !phone || !name || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields required"
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format"
      });
    }

    // Validate phone number (basic validation)
    const phoneRegex = /^[0-9]{10,15}$/;
    if (!phoneRegex.test(phone.replace(/[\s\-\(\)\+]/g, ''))) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone number format"
      });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters"
      });
    }

    // Check if user exists
    const existing = await pool.query(
      "SELECT id, email, phone FROM users WHERE email = $1 OR phone = $2",
      [email, phone]
    );

    if (existing.rows.length > 0) {
      const existingUser = existing.rows[0];
      let conflictMessage = "";
      
      if (existingUser.email === email && existingUser.phone === phone) {
        conflictMessage = "User already exists with this email and phone";
      } else if (existingUser.email === email) {
        conflictMessage = "User already exists with this email";
      } else {
        conflictMessage = "User already exists with this phone number";
      }
      
      return res.status(409).json({
        success: false,
        message: conflictMessage
      });
    }

    const hashed = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (email, phone, name, password_hash, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING id, email, name, phone, created_at`,
      [email, phone, name, hashed]
    );

    if (result.rows.length === 0) {
      throw new Error("Failed to create user");
    }

    const user = result.rows[0];

    // Send enhanced welcome email (don't await to avoid blocking response)
    sendMail({
      to: email,
      subject: "🎉 Welcome to NearBuy - Let's Get Started!",
      html: EmailTemplateBuilder.welcomeEmail(name, {
        verificationLink: `${process.env.FRONTEND_URL}/verify/${user.id}`,
        role: "member"
      })
    }).catch(emailError => {
      console.error("Welcome email failed but user was created:", emailError.message);
    });

    res.status(201).json({
      success: true,
      message: "Registration successful",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone
      }
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during registration",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================
// LOGIN - SEND OTP
// ============================
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required"
      });
    }

    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    // Get device info from request headers
    const device = req.headers['user-agent'] || "Unknown Device";
    const ip = req.ip || req.headers['x-forwarded-for'] || "Unable to detect";

    // Delete any existing unused OTPs for this user
    await pool.query(
      "DELETE FROM otp_codes WHERE user_id = $1 AND purpose = 'login' AND expires_at < NOW()",
      [user.id]
    );

    const otp = generateOTP();
    const expires = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await pool.query(
      `INSERT INTO otp_codes (user_id, otp, purpose, expires_at, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [user.id, otp, "login", expires]
    );

    // Send enhanced OTP email
    await sendMail({
      to: user.email,
      subject: "🔐 Your Login Verification Code - NearBuy",
      html: EmailTemplateBuilder.otpEmail(
        user.name,
        otp,
        OTP_EXPIRY_MINUTES,
        "login"
      )
    });

    return res.status(200).json({
      success: true,
      message: "OTP sent to your email",
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });
  } catch (error) {
    console.error("Login error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// ============================
// VERIFY OTP
// ============================
export const verifyLoginOTP = async (req, res) => {
  try {
    const { userId, otp } = req.body;

    if (!userId || !otp) {
      return res.status(400).json({
        success: false,
        message: "User ID and OTP are required"
      });
    }

    // Get user details
    const userResult = await pool.query(
      "SELECT id, email, name, role FROM users WHERE id = $1",
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const user = userResult.rows[0];

    // Find valid OTP
    const otpResult = await pool.query(
      `SELECT * FROM otp_codes
       WHERE user_id = $1
       AND otp = $2
       AND purpose = 'login'
       AND expires_at > NOW()
       ORDER BY expires_at DESC
       LIMIT 1`,
      [userId, otp]
    );

    if (otpResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP"
      });
    }

    const record = otpResult.rows[0];

    // Delete used OTP
    await pool.query("DELETE FROM otp_codes WHERE id = $1", [record.id]);

    // Send welcome back email with login details (don't await)
    const device = req.headers['user-agent'] || "Unknown Device";
    const ip = req.ip || req.headers['x-forwarded-for'] || "Unable to detect";
    
    sendMail({
      to: user.email,
      subject: "👋 Welcome Back to NearBuy!",
      html: EmailTemplateBuilder.welcomeBackEmail(user.name, {
        ip: ip,
        device: device,
        location: "Location services unavailable",
        browser: req.headers['user-agent']?.split(' ')[0] || "Unknown",
        os: req.headers['user-agent']?.match(/\(([^)]+)\)/)?.[1] || "Unknown"
      })
    }).catch(emailError => {
      console.error("Welcome back email failed:", emailError.message);
    });

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, name: user.name, role: user.role || 'user' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      token: token
    });
  } catch (error) {
    console.error("OTP verification error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// ============================
// RESEND OTP
// ============================
export const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required"
      });
    }

    const userResult = await pool.query(
      "SELECT id, name, email FROM users WHERE email = $1",
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const user = userResult.rows[0];

    // Delete old OTPs
    await pool.query(
      "DELETE FROM otp_codes WHERE user_id = $1 AND purpose = 'login'",
      [user.id]
    );

    const otp = generateOTP();
    const expires = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await pool.query(
      `INSERT INTO otp_codes (user_id, otp, purpose, expires_at, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [user.id, otp, "login", expires]
    );

    await sendMail({
      to: user.email,
      subject: "🔄 New Login Verification Code - NearBuy",
      html: EmailTemplateBuilder.otpEmail(
        user.name,
        otp,
        OTP_EXPIRY_MINUTES,
        "login"
      )
    });

    return res.status(200).json({
      success: true,
      message: "New OTP sent to your email"
    });
  } catch (error) {
    console.error("Resend OTP error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// ============================
// FORGOT PASSWORD - SEND OTP (Using your existing table structure)
// ============================
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
 
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required"
      });
    }

    const result = await pool.query(
      "SELECT id, name, email FROM users WHERE email = $1",
      [email]
    );

    const user = result.rows[0];

    if (!user) {
      // Don't reveal that user doesn't exist for security
      return res.status(200).json({
        success: true,
        message: "If an account exists with this email, you will receive a password reset OTP"
      });
    }

    // Delete old password reset entries
    await pool.query(
      "DELETE FROM password_resets WHERE user_id = $1",
      [user.id]
    );

    const otp = generateOTP();
    const expires = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // Insert into your existing password_resets table
    await pool.query(
      `INSERT INTO password_resets (user_id, otp, expires_at, created_at)
       VALUES ($1, $2, $3, NOW())`,
      [user.id, otp, expires]
    );

    // Send OTP email for password reset
    await sendMail({
      to: email,
      subject: "🔑 Password Reset OTP - NearBuy",
      html: EmailTemplateBuilder.otpEmail(
        user.name,
        otp,
        OTP_EXPIRY_MINUTES,
        "reset"
      )
    });

    return res.status(200).json({
      success: true,
      message: "Password reset OTP sent to your email",
      userId: user.id
    });
  } catch (error) {
    console.error("Forgot password error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// ============================
// RESET PASSWORD WITH OTP (Using your existing table)
// ============================
export const resetPassword = async (req, res) => {
  try {
    const { userId, otp, newPassword } = req.body;

    if (!userId || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "User ID, OTP, and new password are required"
      });
    }

    // Validate password strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters and contain at least 1 uppercase, 1 lowercase, 1 number, and 1 special character"
      });
    }

    const userResult = await pool.query(
      "SELECT id FROM users WHERE id = $1",
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Find valid OTP in password_resets table
    const otpResult = await pool.query(
      `SELECT * FROM password_resets
       WHERE user_id = $1
       AND otp = $2
       AND expires_at > NOW()
       ORDER BY expires_at DESC
       LIMIT 1`,
      [userId, otp]
    );

    if (otpResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP"
      });
    }

    const record = otpResult.rows[0];
    const hashed = await bcrypt.hash(newPassword, 10);

    // Update password
    await pool.query(
      "UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2",
      [hashed, userId]
    );

    // Delete used OTP record
    await pool.query("DELETE FROM password_resets WHERE id = $1", [record.id]);

    // Get user details for success email
    const userEmailResult = await pool.query(
      "SELECT name, email FROM users WHERE id = $1",
      [userId]
    );

    if (userEmailResult.rows.length > 0) {
      // Send password reset success email
      await sendMail({
        to: userEmailResult.rows[0].email,
        subject: "✅ Password Reset Successful - NearBuy",
        html: EmailTemplateBuilder.passwordResetSuccessEmail(userEmailResult.rows[0].name)
      });
    }

    return res.status(200).json({
      success: true,
      message: "Password reset successful! You can now login with your new password."
    });
  } catch (error) {
    console.error("Reset password error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// ============================
// GET USER BY ID
// ============================
export const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await pool.query(
      "SELECT id, email, name, phone, created_at, updated_at FROM users WHERE id = $1",
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    res.status(200).json({
      success: true,
      user: result.rows[0]
    });
  } catch (error) {
    console.error("Get user error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// ============================
// CHANGE PASSWORD (authenticated user)
// ============================
export const changePassword = async (req, res) => {
  try {
    const { userId } = req.user; // From auth middleware
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required"
      });
    }

    // Validate new password strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters and contain at least 1 uppercase, 1 lowercase, 1 number, and 1 special character"
      });
    }

    const userResult = await pool.query(
      "SELECT password_hash, name, email FROM users WHERE id = $1",
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, userResult.rows[0].password_hash);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect"
      });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    
    await pool.query(
      "UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2",
      [hashed, userId]
    );

    // Send security alert for password change
    sendMail({
      to: userResult.rows[0].email,
      subject: "🔐 Your Password Has Been Changed - NearBuy",
      html: EmailTemplateBuilder.securityAlert(
        userResult.rows[0].name,
        "changed",
        {
          message: "Your password was successfully changed. If you didn't make this change, please contact support immediately.",
          actionRequired: false,
          timestamp: new Date()
        }
      )
    }).catch(emailError => {
      console.error("Password change alert email failed:", emailError.message);
    });

    return res.status(200).json({
      success: true,
      message: "Password changed successfully"
    });
  } catch (error) {
    console.error("Change password error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
}; // <-- This is the correct closing brace for changePassword function
