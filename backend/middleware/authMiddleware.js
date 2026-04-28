import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

// ==============================
// 🔐 VERIFY TOKEN
// ==============================
export const verifyToken = (req, res, next) => {
  try {
    const header = req.headers.authorization;

    // ❌ No header
    if (!header) {
      return res.status(401).json({
        success: false,
        message: "Access token missing",
      });
    }

    // ❌ Wrong format
    if (!header.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Invalid token format",
      });
    }

    // ✅ Extract token safely
    const token = header.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token not found",
      });
    }

    // ✅ Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "secretkey"
    );

    // ✅ Attach user to request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role || "user", // default role
    };

    next();

  } catch (err) {
    return res.status(401).json({
      success: false,
      message:
        err.name === "TokenExpiredError"
          ? "Token has expired"
          : "Invalid or expired token",
    });
  }
};

// ==============================
// 🛡️ ROLE CHECK
// ==============================
export const checkRole = (roles) => {
  const allowed = Array.isArray(roles) ? roles : [roles];

  return (req, res, next) => {
    try {
      // ❌ No user
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      // ❌ No role
      if (!req.user.role) {
        return res.status(403).json({
          success: false,
          message: "User role not assigned",
        });
      }

      // ❌ Not allowed
      if (!allowed.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: "Forbidden: insufficient permissions",
        });
      }

      next();
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Role check failed",
      });
    }
  };
};