import bcrypt from "bcrypt";
import pool from "../config/db.js";
import { sendMail } from "../services/mailer.js";
import EmailTemplateBuilder from "../services/emailTemplates.js";
import crypto from "crypto";
import jwt from "jsonwebtoken";

// INCREASE OTP EXPIRY for better user experience
const OTP_EXPIRY_MINUTES = 5;  // Changed from 1 to 5 minutes
const RESET_TOKEN_EXPIRY_MINUTES = 10;  // 10 minutes for reset

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

    // Validate phone number
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

    // Send welcome email (non-blocking)
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
// LOGIN - SEND OTP (OPTIMIZED)
// ============================
export const loginUser = async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required"
      });
    }

    // Quick user lookup with index
    const result = await pool.query(
      "SELECT id, email, name, password_hash FROM users WHERE email = $1",
      [email]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Password comparison
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    // Clean up old OTPs first
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

    // Send email asynchronously (don't await)
    const emailPromise = sendMail({
      to: user.email,
      subject: "🔐 Your Login Verification Code - NearBuy",
      html: EmailTemplateBuilder.otpEmail(
        user.name,
        otp,
        OTP_EXPIRY_MINUTES,
        "login"
      )
    });

    // Calculate response time
    const elapsedTime = Date.now() - startTime;
    console.log(`Login processed in ${elapsedTime}ms for user: ${user.email}`);

    // Return response immediately (email sends in background)
    return res.status(200).json({
      success: true,
      message: "OTP sent to your email",
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      expiresIn: OTP_EXPIRY_MINUTES * 60
    });
    
  } catch (error) {
    console.error("Login error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error. Please try again."
    });
  }
};

// ============================
// VERIFY OTP (OPTIMIZED)
// ============================
export const verifyLoginOTP = async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { userId, otp } = req.body;

    if (!userId || !otp) {
      return res.status(400).json({
        success: false,
        message: "User ID and OTP are required"
      });
    }

    // Single query to get user and verify OTP
    const result = await pool.query(
      `SELECT u.id, u.email, u.name, u.role, o.id as otp_id, o.expires_at
       FROM users u
       JOIN otp_codes o ON u.id = o.user_id
       WHERE u.id = $1 
       AND o.otp = $2 
       AND o.purpose = 'login'
       AND o.expires_at > NOW()
       ORDER BY o.expires_at DESC
       LIMIT 1`,
      [userId, otp]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP"
      });
    }

    const user = result.rows[0];

    // Delete used OTP
    await pool.query("DELETE FROM otp_codes WHERE id = $1", [user.otp_id]);

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        name: user.name, 
        role: user.role || 'user' 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Send welcome back email (non-blocking)
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

    const elapsedTime = Date.now() - startTime;
    console.log(`OTP verified in ${elapsedTime}ms for user: ${user.email}`);

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
      message: "Server error. Please try again."
    });
  }
};

// ============================
// RESEND OTP (OPTIMIZED)
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
      message: "New OTP sent to your email",
      expiresIn: OTP_EXPIRY_MINUTES * 60
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
// FORGOT PASSWORD - SEND OTP
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
    const expires = new Date(Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000);

    await pool.query(
      `INSERT INTO password_resets (user_id, otp, expires_at, created_at)
       VALUES ($1, $2, $3, NOW())`,
      [user.id, otp, expires]
    );

    await sendMail({
      to: email,
      subject: "🔑 Password Reset OTP - NearBuy",
      html: EmailTemplateBuilder.otpEmail(
        user.name,
        otp,
        RESET_TOKEN_EXPIRY_MINUTES,
        "reset"
      )
    });

    return res.status(200).json({
      success: true,
      message: "Password reset OTP sent to your email",
      userId: user.id,
      expiresIn: RESET_TOKEN_EXPIRY_MINUTES * 60
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
// RESET PASSWORD WITH OTP
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

    // Find valid OTP in password_resets table
    const otpResult = await pool.query(
      `SELECT pr.*, u.name, u.email 
       FROM password_resets pr
       JOIN users u ON pr.user_id = u.id
       WHERE pr.user_id = $1
       AND pr.otp = $2
       AND pr.expires_at > NOW()
       ORDER BY pr.expires_at DESC
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

    // Send password reset success email
    sendMail({
      to: record.email,
      subject: "✅ Password Reset Successful - NearBuy",
      html: EmailTemplateBuilder.passwordResetSuccessEmail(record.name)
    }).catch(emailError => {
      console.error("Password reset email failed:", emailError.message);
    });

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
    const { userId } = req.user;
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

    // Send security alert (non-blocking)
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
};

// ============================
// HEALTH CHECK ENDPOINT
// ============================
export const healthCheck = async (req, res) => {
  try {
    // Test database connection
    await pool.query('SELECT NOW()');
    
    res.status(200).json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      error: error.message
    });
  }
};
