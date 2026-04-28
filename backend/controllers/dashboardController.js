import pool from "../config/db.js";

// ===============================
// DASHBOARD CONTROLLER
// ===============================

// Get Dashboard Overview Stats
export const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get user data
    const userResult = await pool.query(
      `SELECT id, email, name, phone, role, is_verified, is_active, 
              COALESCE(transaction_limit, 0) as transaction_limit,
              created_at 
       FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const user = userResult.rows[0];

    // Get wallet balance
    const walletResult = await pool.query(
      `SELECT available_balance, locked_balance, currency 
       FROM wallets WHERE user_id = $1`,
      [userId]
    );

    const walletBalance = walletResult.rows[0]?.available_balance || 0;
    const currency = walletResult.rows[0]?.currency || 'USD';

    // Get order stats
    const orderStats = await pool.query(
      `SELECT 
        COUNT(*) as total_orders,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_orders,
        SUM(CASE WHEN status = 'pending' OR status = 'processing' THEN 1 ELSE 0 END) as pending_orders,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN total_amount ELSE 0 END), 0) as total_spent
       FROM orders WHERE user_id = $1`,
      [userId]
    );

    // Get recent orders
    const recentOrders = await pool.query(
      `SELECT id, order_number, total_amount, status, created_at 
       FROM orders 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 5`,
      [userId]
    );

    // Get recent transactions
    const recentTransactions = await pool.query(
      `SELECT id, type, amount, description, status, created_at 
       FROM transactions 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 10`,
      [userId]
    );

    // Get KYC status
    const kycResult = await pool.query(
      `SELECT status, submitted_at, verified_at 
       FROM kyc_verifications 
       WHERE user_id = $1 
       ORDER BY submitted_at DESC LIMIT 1`,
      [userId]
    );

    const kycStatus = kycResult.rows[0]?.status || 'not_started';

    // Get seller stats if user has products
    let sellerStats = null;
    const productsResult = await pool.query(
      `SELECT 
        COUNT(*) as total_products,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_listings,
        COALESCE(SUM(price * (100 - stock)), 0) as total_sales
       FROM products WHERE seller_id = $1`,
      [userId]
    );
    
    if (productsResult.rows[0]?.total_products > 0) {
      sellerStats = productsResult.rows[0];
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          isVerified: user.is_verified,
          isActive: user.is_active,
          walletBalance: parseFloat(walletBalance),
          currency: currency,
          createdAt: user.created_at
        },
        kycStatus: kycStatus,
        stats: {
          totalOrders: parseInt(orderStats.rows[0].total_orders) || 0,
          completedOrders: parseInt(orderStats.rows[0].completed_orders) || 0,
          pendingOrders: parseInt(orderStats.rows[0].pending_orders) || 0,
          totalSpent: parseFloat(orderStats.rows[0].total_spent) || 0
        },
        recentOrders: recentOrders.rows,
        recentTransactions: recentTransactions.rows,
        sellerStats: sellerStats
      }
    });
  } catch (error) {
    console.error("Dashboard stats error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// Get All Orders
export const getOrders = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { status } = req.query;

    let query = `SELECT id, order_number, total_amount, status, shipping_address, 
                        payment_method, created_at, updated_at
                 FROM orders WHERE user_id = $1`;
    let params = [userId];

    if (status && status !== 'all') {
      query += ` AND status = $2`;
      params.push(status);
    }

    query += ` ORDER BY created_at DESC`;

    const result = await pool.query(query, params);

    // Get order items for each order
    const ordersWithItems = await Promise.all(
      result.rows.map(async (order) => {
        const items = await pool.query(
          `SELECT oi.*, p.name as product_name, p.price as product_price
           FROM order_items oi
           JOIN products p ON oi.product_id = p.id
           WHERE oi.order_id = $1`,
          [order.id]
        );
        return {
          ...order,
          total_amount: parseFloat(order.total_amount),
          items: items.rows
        };
      })
    );

    res.status(200).json({
      success: true,
      data: ordersWithItems
    });
  } catch (error) {
    console.error("Get orders error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// Get Order Details
export const getOrderDetails = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { orderId } = req.params;

    const orderResult = await pool.query(
      `SELECT * FROM orders WHERE id = $1 AND user_id = $2`,
      [orderId, userId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    const order = orderResult.rows[0];
    order.total_amount = parseFloat(order.total_amount);

    const items = await pool.query(
      `SELECT oi.*, p.name as product_name, p.price as product_price, p.images
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = $1`,
      [orderId]
    );

    res.status(200).json({
      success: true,
      data: {
        ...order,
        items: items.rows
      }
    });
  } catch (error) {
    console.error("Get order details error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// Get All Transactions
export const getTransactions = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { type } = req.query;

    let query = `SELECT id, type, amount, description, status, reference, created_at 
                 FROM transactions 
                 WHERE user_id = $1`;
    let params = [userId];

    if (type && type !== 'all') {
      query += ` AND type = $2`;
      params.push(type);
    }

    query += ` ORDER BY created_at DESC`;

    const result = await pool.query(query, params);

    result.rows.forEach(row => {
      row.amount = parseFloat(row.amount);
    });

    res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error("Get transactions error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// Get Wallet Details
export const getWalletDetails = async (req, res) => {
  try {
    const userId = req.user.userId;

    const walletResult = await pool.query(
      `SELECT id, available_balance, locked_balance, currency, wallet_status, created_at, updated_at
       FROM wallets WHERE user_id = $1`,
      [userId]
    );

    if (walletResult.rows.length === 0) {
      // Create wallet if doesn't exist
      const newWallet = await pool.query(
        `INSERT INTO wallets (user_id, available_balance, locked_balance, currency, wallet_status)
         VALUES ($1, 0, 0, 'USD', 'active')
         RETURNING *`,
        [userId]
      );
      return res.status(200).json({
        success: true,
        data: {
          ...newWallet.rows[0],
          available_balance: parseFloat(newWallet.rows[0].available_balance)
        }
      });
    }

    res.status(200).json({
      success: true,
      data: {
        ...walletResult.rows[0],
        available_balance: parseFloat(walletResult.rows[0].available_balance),
        locked_balance: parseFloat(walletResult.rows[0].locked_balance)
      }
    });
  } catch (error) {
    console.error("Get wallet error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// Add Funds to Wallet
export const addFunds = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const userId = req.user.userId;
    const { amount, paymentMethod, reference } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid amount"
      });
    }

    await client.query('BEGIN');

    // Get or create wallet
    let walletResult = await client.query(
      `SELECT id, available_balance FROM wallets WHERE user_id = $1 FOR UPDATE`,
      [userId]
    );

    let walletId;
    let oldBalance = 0;

    if (walletResult.rows.length === 0) {
      const newWallet = await client.query(
        `INSERT INTO wallets (user_id, available_balance, locked_balance, currency, wallet_status)
         VALUES ($1, 0, 0, 'USD', 'active')
         RETURNING id, available_balance`,
        [userId]
      );
      walletId = newWallet.rows[0].id;
      oldBalance = 0;
    } else {
      walletId = walletResult.rows[0].id;
      oldBalance = parseFloat(walletResult.rows[0].available_balance);
    }

    const newBalance = oldBalance + amount;

    // Update wallet balance
    await client.query(
      `UPDATE wallets 
       SET available_balance = $1, updated_at = NOW()
       WHERE id = $2`,
      [newBalance, walletId]
    );

    // Create wallet transaction record
    const walletTxResult = await client.query(
      `INSERT INTO wallet_transactions (wallet_id, reference, transaction_type, amount, 
                                        balance_before, balance_after, description, status, created_at)
       VALUES ($1, $2, 'credit', $3, $4, $5, $6, 'completed', NOW())
       RETURNING id`,
      [walletId, reference || `DEPOSIT_${Date.now()}`, amount, oldBalance, newBalance, 
       `Wallet deposit via ${paymentMethod || 'bank transfer'}`]
    );

    // Create main transaction record
    await client.query(
      `INSERT INTO transactions (user_id, type, amount, description, status, reference, created_at)
       VALUES ($1, 'credit', $2, $3, 'completed', $4, NOW())`,
      [userId, amount, `Wallet deposit via ${paymentMethod || 'bank transfer'}`, reference || `DEPOSIT_${Date.now()}`]
    );

    await client.query('COMMIT');

    res.status(200).json({
      success: true,
      message: "Funds added successfully",
      data: {
        transactionId: walletTxResult.rows[0].id,
        newBalance: newBalance
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Add funds error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  } finally {
    client.release();
  }
};

// Withdraw Funds
export const withdrawFunds = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const userId = req.user.userId;
    const { amount, bankDetails } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid amount"
      });
    }

    await client.query('BEGIN');

    // Get wallet with lock
    const walletResult = await client.query(
      `SELECT id, available_balance FROM wallets WHERE user_id = $1 FOR UPDATE`,
      [userId]
    );

    if (walletResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Wallet not found"
      });
    }

    const walletId = walletResult.rows[0].id;
    const currentBalance = parseFloat(walletResult.rows[0].available_balance);
    
    if (amount > currentBalance) {
      return res.status(400).json({
        success: false,
        message: "Insufficient balance"
      });
    }

    const newBalance = currentBalance - amount;

    // Update wallet balance
    await client.query(
      `UPDATE wallets 
       SET available_balance = $1, updated_at = NOW()
       WHERE id = $2`,
      [newBalance, walletId]
    );

    // Create wallet transaction record
    await client.query(
      `INSERT INTO wallet_transactions (wallet_id, reference, transaction_type, amount, 
                                        balance_before, balance_after, description, status, created_at)
       VALUES ($1, $2, 'debit', $3, $4, $5, 'Withdrawal request submitted', 'pending', NOW())`,
      [walletId, `WITHDRAW_${Date.now()}`, amount, currentBalance, newBalance]
    );

    // Create main transaction record (pending)
    const transactionResult = await client.query(
      `INSERT INTO transactions (user_id, type, amount, description, status, reference, created_at)
       VALUES ($1, 'debit', $2, $3, 'pending', $4, NOW())
       RETURNING id`,
      [userId, amount, `Withdrawal request to bank`, `WITHDRAW_${Date.now()}`]
    );

    await client.query('COMMIT');

    res.status(200).json({
      success: true,
      message: "Withdrawal request submitted successfully",
      data: {
        transactionId: transactionResult.rows[0].id,
        newBalance: newBalance
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Withdraw funds error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  } finally {
    client.release();
  }
};

// Send Money to Another User
export const sendMoney = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const senderId = req.user.userId;
    const { recipientEmail, amount, note } = req.body;

    if (!recipientEmail || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid recipient or amount"
      });
    }

    // Get recipient
    const recipientResult = await client.query(
      `SELECT id, name, email FROM users WHERE email = $1 AND is_active = true`,
      [recipientEmail]
    );

    if (recipientResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Recipient not found"
      });
    }

    const recipient = recipientResult.rows[0];

    // Check if trying to send to self
    if (recipient.id === senderId) {
      return res.status(400).json({
        success: false,
        message: "Cannot send money to yourself"
      });
    }

    await client.query('BEGIN');

    // Get sender wallet with lock
    const senderWallet = await client.query(
      `SELECT id, available_balance FROM wallets WHERE user_id = $1 FOR UPDATE`,
      [senderId]
    );

    if (senderWallet.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Sender wallet not found"
      });
    }

    const senderWalletId = senderWallet.rows[0].id;
    const senderBalance = parseFloat(senderWallet.rows[0].available_balance);
    
    if (amount > senderBalance) {
      return res.status(400).json({
        success: false,
        message: "Insufficient balance"
      });
    }

    // Get or create recipient wallet
    let recipientWallet = await client.query(
      `SELECT id, available_balance FROM wallets WHERE user_id = $1 FOR UPDATE`,
      [recipient.id]
    );

    let recipientWalletId;
    let recipientOldBalance = 0;

    if (recipientWallet.rows.length === 0) {
      const newWallet = await client.query(
        `INSERT INTO wallets (user_id, available_balance, locked_balance, currency, wallet_status)
         VALUES ($1, 0, 0, 'USD', 'active')
         RETURNING id, available_balance`,
        [recipient.id]
      );
      recipientWalletId = newWallet.rows[0].id;
      recipientOldBalance = 0;
    } else {
      recipientWalletId = recipientWallet.rows[0].id;
      recipientOldBalance = parseFloat(recipientWallet.rows[0].available_balance);
    }

    const senderNewBalance = senderBalance - amount;
    const recipientNewBalance = recipientOldBalance + amount;

    // Update sender wallet
    await client.query(
      `UPDATE wallets SET available_balance = $1, updated_at = NOW() WHERE id = $2`,
      [senderNewBalance, senderWalletId]
    );

    // Update recipient wallet
    await client.query(
      `UPDATE wallets SET available_balance = $1, updated_at = NOW() WHERE id = $2`,
      [recipientNewBalance, recipientWalletId]
    );

    // Create sender wallet transaction
    await client.query(
      `INSERT INTO wallet_transactions (wallet_id, reference, transaction_type, amount, 
                                        balance_before, balance_after, description, status, created_at)
       VALUES ($1, $2, 'debit', $3, $4, $5, $6, 'completed', NOW())`,
      [senderWalletId, `SEND_${Date.now()}`, amount, senderBalance, senderNewBalance, 
       `Sent to ${recipient.email}${note ? ` - ${note}` : ''}`]
    );

    // Create recipient wallet transaction
    await client.query(
      `INSERT INTO wallet_transactions (wallet_id, reference, transaction_type, amount, 
                                        balance_before, balance_after, description, status, created_at)
       VALUES ($1, $2, 'credit', $3, $4, $5, $6, 'completed', NOW())`,
      [recipientWalletId, `RECEIVE_${Date.now()}`, amount, recipientOldBalance, recipientNewBalance, 
       `Received from ${req.user.email}${note ? ` - ${note}` : ''}`]
    );

    // Create sender transaction record
    await client.query(
      `INSERT INTO transactions (user_id, type, amount, description, status, reference, created_at)
       VALUES ($1, 'debit', $2, $3, 'completed', $4, NOW())`,
      [senderId, amount, `Sent to ${recipient.email}${note ? ` - ${note}` : ''}`, `SEND_${Date.now()}`]
    );

    // Create recipient transaction record
    await client.query(
      `INSERT INTO transactions (user_id, type, amount, description, status, reference, created_at)
       VALUES ($1, 'credit', $2, $3, 'completed', $4, NOW())`,
      [recipient.id, amount, `Received from ${req.user.email}${note ? ` - ${note}` : ''}`, `RECEIVE_${Date.now()}`]
    );

    await client.query('COMMIT');

    res.status(200).json({
      success: true,
      message: "Money sent successfully",
      data: {
        recipient: recipient.name,
        amount: amount,
        newBalance: senderNewBalance
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Send money error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  } finally {
    client.release();
  }
};

// Get Seller Products
export const getSellerProducts = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      `SELECT id, name, price, stock, category, description, images, status, created_at, updated_at
       FROM products 
       WHERE seller_id = $1 
       ORDER BY created_at DESC`,
      [userId]
    );

    result.rows.forEach(row => {
      row.price = parseFloat(row.price);
    });

    res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error("Get products error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// Add Product
export const addProduct = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, price, stock, category, description, images } = req.body;

    if (!name || !price || !stock) {
      return res.status(400).json({
        success: false,
        message: "Name, price, and stock are required"
      });
    }

    const result = await pool.query(
      `INSERT INTO products (seller_id, name, price, stock, category, description, images, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', NOW())
       RETURNING id, name, price, stock`,
      [userId, name, price, stock, category || 'general', description || '', images || []]
    );

    res.status(201).json({
      success: true,
      message: "Product added successfully",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("Add product error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// Update Product
export const updateProduct = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { productId } = req.params;
    const { name, price, stock, category, description, status } = req.body;

    const productCheck = await pool.query(
      `SELECT id FROM products WHERE id = $1 AND seller_id = $2`,
      [productId, userId]
    );

    if (productCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    await pool.query(
      `UPDATE products 
       SET name = COALESCE($1, name),
           price = COALESCE($2, price),
           stock = COALESCE($3, stock),
           category = COALESCE($4, category),
           description = COALESCE($5, description),
           status = COALESCE($6, status),
           updated_at = NOW()
       WHERE id = $7`,
      [name, price, stock, category, description, status, productId]
    );

    res.status(200).json({
      success: true,
      message: "Product updated successfully"
    });
  } catch (error) {
    console.error("Update product error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// Submit KYC
export const submitKYC = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { fullName, idType, idNumber, idDocumentUrl, addressProofUrl, address } = req.body;

    if (!fullName || !idType || !idNumber) {
      return res.status(400).json({
        success: false,
        message: "Full name, ID type, and ID number are required"
      });
    }

    // Check if KYC already submitted
    const existingKYC = await pool.query(
      `SELECT id, status FROM kyc_verifications WHERE user_id = $1`,
      [userId]
    );

    if (existingKYC.rows.length > 0) {
      if (existingKYC.rows[0].status === 'pending') {
        return res.status(400).json({
          success: false,
          message: "KYC already pending verification"
        });
      }
      if (existingKYC.rows[0].status === 'verified') {
        return res.status(400).json({
          success: false,
          message: "KYC already verified"
        });
      }
    }

    const result = await pool.query(
      `INSERT INTO kyc_verifications (user_id, full_name, id_type, id_number, id_document_url, 
                                      address_proof_url, status, submitted_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW())
       ON CONFLICT (user_id) DO UPDATE 
       SET full_name = EXCLUDED.full_name,
           id_type = EXCLUDED.id_type,
           id_number = EXCLUDED.id_number,
           id_document_url = EXCLUDED.id_document_url,
           address_proof_url = EXCLUDED.address_proof_url,
           status = 'pending',
           submitted_at = NOW()
       RETURNING id`,
      [userId, fullName, idType, idNumber, idDocumentUrl || null, addressProofUrl || null]
    );

    res.status(200).json({
      success: true,
      message: "KYC submitted successfully. Please wait for verification."
    });
  } catch (error) {
    console.error("KYC submission error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// Get KYC Status
export const getKYCStatus = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      `SELECT status, full_name, id_type, submitted_at, verified_at, admin_remarks
       FROM kyc_verifications 
       WHERE user_id = $1 
       ORDER BY submitted_at DESC LIMIT 1`,
      [userId]
    );

    res.status(200).json({
      success: true,
      data: result.rows[0] || { status: 'not_started' }
    });
  } catch (error) {
    console.error("Get KYC status error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// Update User Profile
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, phone } = req.body;

    await pool.query(
      `UPDATE users 
       SET name = COALESCE($1, name),
           phone = COALESCE($2, phone),
           updated_at = NOW()
       WHERE id = $3`,
      [name, phone, userId]
    );

    res.status(200).json({
      success: true,
      message: "Profile updated successfully"
    });
  } catch (error) {
    console.error("Update profile error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// Become Seller
export const becomeSeller = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Check if KYC is verified
    const kycResult = await pool.query(
      `SELECT status FROM kyc_verifications WHERE user_id = $1`,
      [userId]
    );

    const kycStatus = kycResult.rows[0]?.status;

    if (kycStatus !== 'verified') {
      return res.status(400).json({
        success: false,
        message: "KYC verification required to become a seller"
      });
    }

    // Check if already a seller (by checking if user has products)
    const productsResult = await pool.query(
      `SELECT COUNT(*) FROM products WHERE seller_id = $1`,
      [userId]
    );

    if (parseInt(productsResult.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: "You are already a seller"
      });
    }

    // Update user role
    await pool.query(
      `UPDATE users SET role = 'seller', updated_at = NOW() WHERE id = $1`,
      [userId]
    );

    res.status(200).json({
      success: true,
      message: "You are now a seller!"
    });
  } catch (error) {
    console.error("Become seller error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};