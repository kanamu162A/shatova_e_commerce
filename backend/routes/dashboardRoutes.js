import express from 'express';
import { verifyToken, checkRole } from '../middleware/authMiddleware.js';
import {
  getDashboardStats,
  getOrders,
  getOrderDetails,
  getTransactions,
  getWalletDetails,
  addFunds,
  withdrawFunds,
  sendMoney,
  getSellerProducts,
  addProduct,
  updateProduct,
  submitKYC,
  getKYCStatus,
  updateProfile,
  becomeSeller
} from '../controllers/dashboardController.js';

const router = express.Router();

// All dashboard routes require authentication
router.use(verifyToken);

// Dashboard Overview
router.get('/stats', getDashboardStats);

// Orders
router.get('/orders', getOrders);
router.get('/orders/:orderId', getOrderDetails);

// Wallet & Transactions
router.get('/wallet', getWalletDetails);
router.get('/transactions', getTransactions);

// Only admin and CEO can manually add money to any user's wallet
router.post(
  '/wallet/add-funds',
  checkRole(['admin', 'ceo']),
  addFunds
);

// Normal authenticated users can use these
router.post('/wallet/withdraw',checkRole(['admin', 'ceo']), withdrawFunds);
router.post('/wallet/send', sendMoney);

// Seller Products
router.get('/products', getSellerProducts);
router.post('/products', addProduct);
router.put('/products/:productId', updateProduct);

// KYC
router.get('/kyc', getKYCStatus);
router.post('/kyc', submitKYC);

// Profile
router.put('/profile', updateProfile);

// Become Seller
router.post('/become-seller', becomeSeller);

export default router;
