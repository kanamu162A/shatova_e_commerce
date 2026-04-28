// routes/authRoutes.js
import express from 'express';
import {
  registerUser,
  loginUser,
  verifyLoginOTP,
  resendOTP,
  forgotPassword,
  resetPassword,
  getUserById,
  changePassword
} from '../controllers/authController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/verify-otp', verifyLoginOTP);
router.post('/resend-otp', resendOTP);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/user/:userId',verifyLoginOTP, getUserById);

// Protected routes
router.post('/change-password', verifyToken, changePassword);

export default router;