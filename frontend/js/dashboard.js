// ===============================
// DASHBOARD MODULE - Complete Functionality
// ===============================

// State Management
let currentUser = {
  id: 1,
  name: "John Doe",
  email: "john@example.com",
  phone: "+2348012345678",
  role: "buyer",
  kycStatus: "pending",
  walletBalance: 1250.75,
  totalDeposited: 2000,
  totalWithdrawn: 749.25
};

let orders = [
  { id: "ORD-001", products: [{ name: "Wireless Headphones", price: 89.99, quantity: 1 }], total: 89.99, status: "completed", date: "2024-01-15" },
  { id: "ORD-002", products: [{ name: "Smart Watch", price: 199.99, quantity: 1 }], total: 199.99, status: "processing", date: "2024-01-18" },
  { id: "ORD-003", products: [{ name: "Phone Case", price: 19.99, quantity: 2 }], total: 39.98, status: "pending", date: "2024-01-20" }
];

let transactions = [
  { id: "TXN-001", type: "credit", amount: 500, description: "Wallet Deposit", date: "2024-01-10", status: "completed" },
  { id: "TXN-002", type: "debit", amount: 89.99, description: "Order Payment - ORD-001", date: "2024-01-15", status: "completed" },
  { id: "TXN-003", type: "credit", amount: 1500, description: "Wallet Deposit", date: "2024-01-16", status: "completed" },
  { id: "TXN-004", type: "debit", amount: 199.99, description: "Order Payment - ORD-002", date: "2024-01-18", status: "pending" }
];

let products = [
  { id: 1, name: "Premium Headphones", price: 99.99, stock: 15, category: "electronics", status: "active" },
  { id: 2, name: "Smart Watch Pro", price: 249.99, stock: 8, category: "electronics", status: "active" }
];

let charts = {};

// DOM Elements
const pages = document.querySelectorAll('.page');
const navItems = document.querySelectorAll('.nav-item');
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const sidebar = document.querySelector('.sidebar');

// ===============================
// HELPER FUNCTIONS
// ===============================

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.style.background = type === 'success' ? '#00c853' : '#ff4444';
  toast.style.color = '#ffffff';
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function updateWalletDisplay() {
  document.getElementById('quickWalletBalance').textContent = formatCurrency(currentUser.walletBalance);
  document.getElementById('walletBalance').textContent = formatCurrency(currentUser.walletBalance);
  document.getElementById('totalDeposited').textContent = formatCurrency(currentUser.totalDeposited);
  document.getElementById('totalWithdrawn').textContent = formatCurrency(currentUser.totalWithdrawn);
  document.getElementById('totalWalletSpent').textContent = formatCurrency(currentUser.totalDeposited - currentUser.walletBalance);
}

function updateStats() {
  const completedOrders = orders.filter(o => o.status === 'completed').length;
  const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'processing').length;
  const totalSpent = orders.filter(o => o.status === 'completed').reduce((sum, o) => sum + o.total, 0);
  
  document.getElementById('totalOrders').textContent = orders.length;
  document.getElementById('totalSpent').textContent = formatCurrency(totalSpent);
  document.getElementById('pendingOrders').textContent = pendingOrders;
  document.getElementById('completedOrders').textContent = completedOrders;
}

function updateKYCStatus() {
  const statusMap = {
    'pending': { text: 'Verification Pending', progress: 50, icon: 'fa-clock' },
    'verified': { text: 'Verified ✓', progress: 100, icon: 'fa-check-circle' },
    'rejected': { text: 'Verification Failed', progress: 0, icon: 'fa-times-circle' },
    'not_started': { text: 'Not Started', progress: 0, icon: 'fa-id-card' }
  };
  
  const status = currentUser.kycStatus || 'not_started';
  const data = statusMap[status];
  
  document.getElementById('kycProgressBar').style.width = `${data.progress}%`;
  document.getElementById('kycStatusText').textContent = data.text;
  
  // Update seller button based on KYC
  const sellerBtn = document.getElementById('becomeSellerBtn');
  if (currentUser.role === 'seller') {
    sellerBtn.disabled = true;
    sellerBtn.textContent = 'Seller Account Active';
    document.getElementById('sellerRequirementMsg').textContent = 'You are already a seller!';
  } else if (status === 'verified') {
    sellerBtn.disabled = false;
    document.getElementById('sellerRequirementMsg').textContent = 'Complete KYC to start selling';
  } else {
    sellerBtn.disabled = true;
    document.getElementById('sellerRequirementMsg').textContent = 'Complete KYC verification to start selling';
  }
}

// ===============================
// ORDER FUNCTIONS
// ===============================

function renderRecentOrders() {
  const tbody = document.getElementById('recentOrdersList');
  const recentOrders = orders.slice(0, 5);
  
  tbody.innerHTML = recentOrders.map(order => `
    <tr>
      <td>${order.id}</td>
      <td>${order.products.map(p => p.name).join(', ')}</td>
      <td>${formatCurrency(order.total)}</td>
      <td><span class="status-badge status-${order.status}">${order.status}</span></td>
      <td>${order.date}</td>
    </tr>
  `).join('');
}

function renderAllOrders(filter = 'all') {
  const container = document.getElementById('ordersList');
  let filteredOrders = orders;
  
  if (filter !== 'all') {
    filteredOrders = orders.filter(o => o.status === filter);
  }
  
  if (filteredOrders.length === 0) {
    container.innerHTML = '<div class="empty-state">No orders found</div>';
    return;
  }
  
  container.innerHTML = filteredOrders.map(order => `
    <div class="order-card">
      <div class="order-header">
        <span><strong>Order #${order.id}</strong></span>
        <span class="status-badge status-${order.status}">${order.status}</span>
      </div>
      <div class="order-products">
        ${order.products.map(p => `
          <div class="order-product">
            <span>${p.name} x ${p.quantity}</span>
            <span>${formatCurrency(p.price * p.quantity)}</span>
          </div>
        `).join('')}
      </div>
      <div class="order-footer">
        <span>Total: <strong>${formatCurrency(order.total)}</strong></span>
        <span>Date: ${order.date}</span>
      </div>
    </div>
  `).join('');
}

// ===============================
// TRANSACTION FUNCTIONS
// ===============================

function renderTransactions(filter = 'all') {
  const container = document.getElementById('transactionsList');
  let filtered = transactions;
  
  if (filter !== 'all') {
    filtered = transactions.filter(t => t.type === filter);
  }
  
  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty-state">No transactions found</div>';
    return;
  }
  
  container.innerHTML = filtered.map(tx => `
    <div class="transaction-item">
      <div class="transaction-left">
        <div class="transaction-icon ${tx.type}">
          <i class="fas ${tx.type === 'credit' ? 'fa-arrow-down' : 'fa-arrow-up'}"></i>
        </div>
        <div class="transaction-details">
          <h4>${tx.description}</h4>
          <p>${tx.date}</p>
        </div>
      </div>
      <div class="transaction-amount ${tx.type}">
        ${tx.type === 'credit' ? '+' : '-'} ${formatCurrency(tx.amount)}
      </div>
    </div>
  `).join('');
}

// ===============================
// SELLER FUNCTIONS
// ===============================

function renderSellerProducts() {
  const container = document.getElementById('productsList');
  if (!container) return;
  
  if (currentUser.role !== 'seller') {
    container.innerHTML = '';
    return;
  }
  
  container.innerHTML = products.map(product => `
    <div class="product-card">
      <div class="product-image">
        <i class="fas fa-box"></i>
      </div>
      <div class="product-info">
        <h4 class="product-title">${product.name}</h4>
        <div class="product-price">${formatCurrency(product.price)}</div>
        <div class="product-stock">Stock: ${product.stock} units</div>
      </div>
    </div>
  `).join('');
}

function updateSellerUI() {
  const sellerStats = document.getElementById('sellerStats');
  const sellerActions = document.getElementById('sellerActions');
  const becomeSellerBtn = document.getElementById('becomeSellerBtn');
  
  if (currentUser.role === 'seller') {
    sellerStats.style.display = 'grid';
    sellerActions.style.display = 'flex';
    becomeSellerBtn.style.display = 'none';
    document.getElementById('sellerRequirementMsg').style.display = 'none';
    
    document.getElementById('totalProducts').textContent = products.length;
    document.getElementById('totalSales').textContent = formatCurrency(products.reduce((sum, p) => sum + (p.price * (20 - p.stock)), 0));
    document.getElementById('activeListings').textContent = products.filter(p => p.status === 'active').length;
    
    renderSellerProducts();
  } else {
    sellerStats.style.display = 'none';
    sellerActions.style.display = 'none';
    becomeSellerBtn.style.display = 'block';
  }
}

function becomeSeller() {
  if (currentUser.kycStatus === 'verified') {
    currentUser.role = 'seller';
    document.getElementById('userRole').textContent = 'Seller';
    updateSellerUI();
    showToast('Congratulations! You are now a seller!', 'success');
    renderSellerProducts();
  } else {
    showToast('Please complete KYC verification first', 'error');
  }
}

// ===============================
// WALLET FUNCTIONS
// ===============================

function addFunds(amount) {
  if (amount && amount > 0) {
    currentUser.walletBalance += amount;
    currentUser.totalDeposited += amount;
    transactions.unshift({
      id: `TXN-${Date.now()}`,
      type: 'credit',
      amount: amount,
      description: 'Wallet Deposit',
      date: new Date().toISOString().split('T')[0],
      status: 'completed'
    });
    updateWalletDisplay();
    renderTransactions();
    showToast(`$${amount} added to your wallet!`, 'success');
  }
}

function withdrawFunds(amount) {
  if (amount && amount > 0 && amount <= currentUser.walletBalance) {
    currentUser.walletBalance -= amount;
    currentUser.totalWithdrawn += amount;
    transactions.unshift({
      id: `TXN-${Date.now()}`,
      type: 'debit',
      amount: amount,
      description: 'Withdrawal',
      date: new Date().toISOString().split('T')[0],
      status: 'completed'
    });
    updateWalletDisplay();
    renderTransactions();
    showToast(`$${amount} withdrawn successfully!`, 'success');
  } else {
    showToast('Insufficient balance or invalid amount', 'error');
  }
}

function sendMoney(recipientEmail, amount, note) {
  if (amount && amount > 0 && amount <= currentUser.walletBalance) {
    currentUser.walletBalance -= amount;
    transactions.unshift({
      id: `TXN-${Date.now()}`,
      type: 'debit',
      amount: amount,
      description: `Sent to ${recipientEmail}${note ? ` - ${note}` : ''}`,
      date: new Date().toISOString().split('T')[0],
      status: 'completed'
    });
    updateWalletDisplay();
    renderTransactions();
    showToast(`$${amount} sent to ${recipientEmail}!`, 'success');
  } else {
    showToast('Insufficient balance or invalid amount', 'error');
  }
}

// ===============================
// CHART INITIALIZATION
// ===============================

function initCharts() {
  const ordersCtx = document.getElementById('ordersChart')?.getContext('2d');
  const spendingCtx = document.getElementById('spendingChart')?.getContext('2d');
  
  if (ordersCtx) {
    charts.orders = new Chart(ordersCtx, {
      type: 'line',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [{
          label: 'Orders',
          data: [5, 8, 12, 10, 15, 20],
          borderColor: '#ffffff',
          backgroundColor: 'rgba(255,255,255,0.1)',
          fill: true
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { labels: { color: '#ffffff' } } }
      }
    });
  }
  
  if (spendingCtx) {
    charts.spending = new Chart(spendingCtx, {
      type: 'doughnut',
      data: {
        labels: ['Electronics', 'Fashion', 'Home', 'Food'],
        datasets: [{
          data: [45, 25, 20, 10],
          backgroundColor: ['#ffffff', '#666666', '#333333', '#999999']
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { labels: { color: '#ffffff' } } }
      }
    });
  }
}

// ===============================
// KYC FUNCTIONS
// ===============================

function submitKYC() {
  const fullName = document.getElementById('kycFullName')?.value;
  const idType = document.getElementById('kycIdType')?.value;
  const idNumber = document.getElementById('kycIdNumber')?.value;
  
  if (!fullName || !idType || !idNumber) {
    showToast('Please fill all KYC fields', 'error');
    return;
  }
  
  currentUser.kycStatus = 'pending';
  updateKYCStatus();
  showToast('KYC submitted for verification!', 'success');
}

// ===============================
// SETTINGS FUNCTIONS
// ===============================

function loadSettings() {
  document.getElementById('settingsName').value = currentUser.name;
  document.getElementById('settingsEmail').value = currentUser.email;
  document.getElementById('settingsPhone').value = currentUser.phone;
}

function saveSettings() {
  currentUser.name = document.getElementById('settingsName').value;
  currentUser.phone = document.getElementById('settingsPhone').value;
  document.getElementById('userName').textContent = currentUser.name;
  showToast('Settings saved successfully!', 'success');
}

// ===============================
// PAGE NAVIGATION
// ===============================

function switchPage(pageId) {
  pages.forEach(page => page.classList.remove('active'));
  const targetPage = document.getElementById(`${pageId}Page`);
  if (targetPage) targetPage.classList.add('active');
  
  navItems.forEach(item => item.classList.remove('active'));
  const activeNav = document.querySelector(`[data-page="${pageId}"]`);
  if (activeNav) activeNav.classList.add('active');
  
  document.getElementById('pageTitle').textContent = 
    pageId === 'overview' ? 'Dashboard Overview' :
    pageId === 'orders' ? 'My Orders' :
    pageId === 'wallet' ? 'Wallet' :
    pageId === 'transactions' ? 'Transaction History' :
    pageId === 'sell' ? 'Sell Center' :
    pageId === 'kyc' ? 'KYC Verification' : 'Settings';
  
  if (pageId === 'overview') {
    updateStats();
    renderRecentOrders();
  } else if (pageId === 'orders') {
    renderAllOrders();
  } else if (pageId === 'transactions') {
    renderTransactions();
  } else if (pageId === 'sell') {
    updateSellerUI();
  }
  
  if (window.innerWidth <= 768) {
    sidebar.classList.remove('mobile-open');
  }
}

// ===============================
// MODAL HANDLERS
// ===============================

function setupModals() {
  // Add Funds Modal
  document.getElementById('addFundsBtn')?.addEventListener('click', () => {
    document.getElementById('addFundsModal').classList.add('active');
  });
  
  document.getElementById('confirmAddFunds')?.addEventListener('click', () => {
    const amount = parseFloat(document.getElementById('fundAmount').value);
    addFunds(amount);
    document.getElementById('addFundsModal').classList.remove('active');
    document.getElementById('fundAmount').value = '';
  });
  
  // Withdraw Modal
  document.getElementById('withdrawBtn')?.addEventListener('click', () => {
    document.getElementById('withdrawModal').classList.add('active');
  });
  
  document.getElementById('confirmWithdraw')?.addEventListener('click', () => {
    const amount = parseFloat(document.getElementById('withdrawAmount').value);
    withdrawFunds(amount);
    document.getElementById('withdrawModal').classList.remove('active');
    document.getElementById('withdrawAmount').value = '';
  });
  
  // Send Money Modal
  document.getElementById('sendMoneyBtn')?.addEventListener('click', () => {
    document.getElementById('sendMoneyModal').classList.add('active');
  });
  
  document.getElementById('confirmSend')?.addEventListener('click', () => {
    const email = document.getElementById('recipientEmail').value;
    const amount = parseFloat(document.getElementById('sendAmount').value);
    const note = document.getElementById('sendNote').value;
    sendMoney(email, amount, note);
    document.getElementById('sendMoneyModal').classList.remove('active');
    document.getElementById('recipientEmail').value = '';
    document.getElementById('sendAmount').value = '';
    document.getElementById('sendNote').value = '';
  });
  
  // Close modals
  document.querySelectorAll('.close-modal, .cancel-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.modal').forEach(modal => modal.classList.remove('active'));
    });
  });
}

// ===============================
// EVENT LISTENERS
// ===============================

function initEventListeners() {
  // Navigation
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const page = item.dataset.page;
      if (page) switchPage(page);
    });
  });
  
  // Mobile menu
  mobileMenuBtn?.addEventListener('click', () => {
    sidebar.classList.toggle('mobile-open');
  });
  
  // Order filters
  document.querySelectorAll('[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.filter;
      document.querySelectorAll('.order-filters .filter-btn, .transaction-filters .filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (btn.closest('.order-filters')) {
        renderAllOrders(filter);
      } else if (btn.closest('.transaction-filters')) {
        renderTransactions(filter);
      }
    });
  });
  
  // Transaction filters
  document.querySelectorAll('[data-tx-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.txFilter;
      document.querySelectorAll('.transaction-filters .filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderTransactions(filter);
    });
  });
  
  // View all buttons
  document.querySelectorAll('.view-all-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = btn.dataset.page;
      if (page) switchPage(page);
    });
  });
  
  // Become seller
  document.getElementById('becomeSellerBtn')?.addEventListener('click', becomeSeller);
  
  // Add product
  document.getElementById('addProductBtn')?.addEventListener('click', () => {
    document.getElementById('addProductModal').classList.add('active');
  });
  
  document.getElementById('confirmAddProduct')?.addEventListener('click', () => {
    const name = document.getElementById('productName').value;
    const price = parseFloat(document.getElementById('productPrice').value);
    const stock = parseInt(document.getElementById('productStock').value);
    
    if (name && price && stock) {
      products.push({ id: products.length + 1, name, price, stock, category: 'general', status: 'active' });
      renderSellerProducts();
      document.getElementById('addProductModal').classList.remove('active');
      showToast('Product added successfully!', 'success');
    } else {
      showToast('Please fill all product fields', 'error');
    }
  });
  
  // KYC submit
  document.getElementById('submitKycBtn')?.addEventListener('click', submitKYC);
  
  // Settings save
  document.getElementById('saveSettingsBtn')?.addEventListener('click', saveSettings);
  
  // Logout
  document.getElementById('logoutBtn')?.addEventListener('click', () => {
    localStorage.clear();
    window.location.href = 'login.html';
  });
}

// ===============================
// INITIALIZATION
// ===============================

function init() {
  updateWalletDisplay();
  updateStats();
  updateKYCStatus();
  updateSellerUI();
  loadSettings();
  initCharts();
  setupModals();
  initEventListeners();
  renderRecentOrders();
  renderAllOrders();
  renderTransactions();
  
  // Set default user display
  document.getElementById('userName').textContent = currentUser.name;
  document.getElementById('userAvatar').textContent = currentUser.name.split(' ').map(n => n[0]).join('');
  document.getElementById('userRole').textContent = currentUser.role === 'seller' ? 'Seller' : 'Buyer';
}

// Start the dashboard
init();