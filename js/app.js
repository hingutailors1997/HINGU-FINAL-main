/**
 * HINGU TAILORS ERP - MAIN APPLICATION CONTROLLER
 */

let currentViewMode = 'mobile';
let currentMobileScreen = 'screen-dashboard';
let currentMeasureTab = 'shirt';
let selectedOrderItem = 'Shirt';

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  populateDropdowns();
  renderDashboard();
  renderStockList();
  renderAccountsSummary();
  renderStaffList();
  
  // Set default screen
  navToMobileScreen('screen-dashboard');
  
  // Render icons
  if (window.lucide) {
    lucide.createIcons();
  }
}

/* -------------------------------------------------------------------------- */
/* VIEW MODE SWITCHER (MOBILE SIMULATOR VS DESKTOP ERP)                       */
/* -------------------------------------------------------------------------- */
function switchViewMode(mode) {
  currentViewMode = mode;
  const mobSim = document.getElementById('mobile-simulator');
  const deskErp = document.getElementById('desktop-erp');
  const btnMob = document.getElementById('btn-mode-mobile');
  const btnDesk = document.getElementById('btn-mode-desktop');

  if (mode === 'mobile') {
    mobSim.style.display = 'flex';
    deskErp.classList.remove('active');
    btnMob.classList.add('active');
    btnDesk.classList.remove('active');
  } else {
    mobSim.style.display = 'none';
    deskErp.classList.add('active');
    btnDesk.classList.add('active');
    btnMob.classList.remove('active');
    renderDesktopErpView('dashboard');
  }
}

/* -------------------------------------------------------------------------- */
/* MOBILE PHONE NAVIGATION ROUTER                                             */
/* -------------------------------------------------------------------------- */
function navToMobileScreen(screenId) {
  currentMobileScreen = screenId;

  // Hide all screens
  const screens = document.querySelectorAll('.screen-container');
  screens.forEach(s => s.style.display = 'none');

  // Show target screen
  const target = document.getElementById(screenId);
  if (target) {
    target.style.display = 'block';
  }

  // Update Top Screen Switcher Tab highlight
  const tabBtns = document.querySelectorAll('.screen-tab-btn');
  tabBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.screen === screenId);
  });

  // Update Header Title & Navigation Bar
  const titleMap = {
    'screen-login': 'Login',
    'screen-dashboard': 'Dashboard',
    'screen-new-customer': 'New Customer',
    'screen-measurement': 'Shirt Measurement',
    'screen-new-order': 'New Order',
    'screen-stock': 'Stock List',
    'screen-accounts': 'Accounts',
    'screen-reports': 'Reports',
    'screen-staff': 'Staff Management',
    'screen-settings': 'Settings'
  };

  const headerTitle = document.getElementById('phone-header-title');
  if (headerTitle) {
    headerTitle.innerText = titleMap[screenId] || 'Hingu Tailors';
  }

  // Toggle Header visibility for login screen
  const phoneHeader = document.getElementById('phone-header');
  if (phoneHeader) {
    phoneHeader.style.display = (screenId === 'screen-login') ? 'none' : 'flex';
  }

  // Update Bottom Nav active state
  updateBottomNavActive(screenId);

  // Screen specific triggers
  if (screenId === 'screen-dashboard') {
    renderDashboard();
  } else if (screenId === 'screen-stock') {
    renderStockList();
  } else if (screenId === 'screen-accounts') {
    renderAccountsSummary();
  } else if (screenId === 'screen-reports') {
    renderReports();
  } else if (screenId === 'screen-staff') {
    renderStaffList();
  }
}

function phoneHeaderBack() {
  if (currentMobileScreen !== 'screen-dashboard') {
    navToMobileScreen('screen-dashboard');
  }
}

function updateBottomNavActive(screenId) {
  const items = document.querySelectorAll('.phone-bottom-nav .nav-item');
  items.forEach(item => item.classList.remove('active'));

  if (screenId === 'screen-dashboard') {
    document.getElementById('nav-home')?.classList.add('active');
  } else if (screenId === 'screen-stock') {
    document.getElementById('nav-stock')?.classList.add('active');
  } else if (screenId === 'screen-accounts') {
    document.getElementById('nav-alerts')?.classList.add('active');
  } else if (screenId === 'screen-reports') {
    document.getElementById('nav-more')?.classList.add('active');
  }
}

/* -------------------------------------------------------------------------- */
/* DASHBOARD RENDERER & METRICS                                               */
/* -------------------------------------------------------------------------- */
function renderDashboard() {
  const orders = DB.getOrders();
  const txns = DB.getTransactions();
  const customers = DB.getCustomers();

  // Compute metrics
  let todayIncome = 0;
  let todayExpense = 0;
  
  const todayStr = new Date().toISOString().split('T')[0];
  txns.forEach(t => {
    if (t.type === 'Income') todayIncome += Number(t.amount);
    if (t.type === 'Expense') todayExpense += Number(t.amount);
  });

  const todayProfit = todayIncome - todayExpense;
  const pendingCount = orders.filter(o => o.status === 'Pending' || o.status === 'Stitching').length;
  const deliveryCount = orders.filter(o => o.status === 'Ready').length;

  // DOM update
  document.getElementById('dash-income').innerText = `₹ ${todayIncome.toLocaleString()}`;
  document.getElementById('dash-expense').innerText = `₹ ${todayExpense.toLocaleString()}`;
  document.getElementById('dash-profit').innerText = `₹ ${todayProfit.toLocaleString()}`;
  document.getElementById('dash-pending').innerText = pendingCount;
  document.getElementById('dash-delivery').innerText = deliveryCount;
  document.getElementById('dash-customers').innerText = customers.length;

  // Render recent orders list
  const recentList = document.getElementById('dashboard-recent-orders-list');
  if (recentList) {
    const listHtml = orders.slice(0, 5).map(o => {
      let badgeClass = 'badge-pending';
      if (o.status === 'Stitching') badgeClass = 'badge-stitching';
      if (o.status === 'Ready') badgeClass = 'badge-ready';
      if (o.status === 'Delivered') badgeClass = 'badge-delivered';

      return `
        <div class="recent-order-item" onclick="showReceiptModal('${o.id}')">
          <div class="order-user-info">
            <div class="order-user-avatar"><i data-lucide="user"></i></div>
            <div>
              <div class="order-user-name">${o.id}</div>
              <div class="order-user-sub">${o.customerName} (${o.item})</div>
            </div>
          </div>
          <div class="order-meta-right">
            <div class="order-date">${o.deliveryDate ? formatDateShort(o.deliveryDate) : '14 May'}</div>
            <span class="status-badge ${badgeClass}">${o.status}</span>
          </div>
        </div>
      `;
    }).join('');

    recentList.innerHTML = listHtml;
    if (window.lucide) lucide.createIcons();
  }
}

function formatDateShort(dateStr) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  } catch (e) {
    return dateStr;
  }
}

/* -------------------------------------------------------------------------- */
/* POPULATE DROPDOWNS                                                         */
/* -------------------------------------------------------------------------- */
function populateDropdowns() {
  const customers = DB.getCustomers();
  const stock = DB.getStock();

  // Populate Customer Dropdowns
  const custOptions = customers.map(c => `<option value="${c.id}">${c.name} (${c.mobile})</option>`).join('');
  
  const mSelect = document.getElementById('measure-cust-select');
  if (mSelect) mSelect.innerHTML = custOptions;

  const oSelect = document.getElementById('order-cust-select');
  if (oSelect) oSelect.innerHTML = custOptions;

  // Populate Fabric Dropdown
  const fabricSelect = document.getElementById('order-fabric-select');
  if (fabricSelect) {
    fabricSelect.innerHTML = stock.map(s => `<option value="${s.name}">${s.name} (${s.sku}) - ₹${s.pricePerMeter}/m</option>`).join('');
  }
}

/* -------------------------------------------------------------------------- */
/* CUSTOMER MANAGEMENT                                                        */
/* -------------------------------------------------------------------------- */
function handleSaveCustomer(e) {
  e.preventDefault();
  const name = document.getElementById('cust-input-name').value;
  const mobile = document.getElementById('cust-input-mobile').value;
  const address = document.getElementById('cust-input-address').value;

  const newId = `CUST-${Math.floor(1000 + Math.random() * 9000)}`;
  const custObj = {
    id: newId,
    name: name,
    mobile: mobile,
    address: address,
    joinedDate: new Date().toISOString().split('T')[0],
    totalOrders: 0
  };

  DB.saveCustomer(custObj);
  populateDropdowns();
  alert(`Customer "${name}" saved successfully!`);
  document.getElementById('new-customer-form').reset();
  navToMobileScreen('screen-dashboard');
}

function triggerPhotoUpload() {
  alert('Camera / Gallery image upload selected!');
}

/* -------------------------------------------------------------------------- */
/* MEASUREMENT FORM HANDLERS                                                  */
/* -------------------------------------------------------------------------- */
function switchMeasureTab(tab) {
  currentMeasureTab = tab;
  document.querySelectorAll('.measurement-tabs .tab-chip').forEach(c => c.classList.remove('active'));
  document.getElementById(`tab-m-${tab}`)?.classList.add('active');

  const groupShirt = document.getElementById('group-measure-shirt');
  const groupPant = document.getElementById('group-measure-pant');

  if (tab === 'shirt') {
    groupShirt.style.display = 'block';
    groupPant.style.display = 'none';
    document.getElementById('phone-header-title').innerText = 'Shirt Measurement';
  } else if (tab === 'pant') {
    groupShirt.style.display = 'none';
    groupPant.style.display = 'block';
    document.getElementById('phone-header-title').innerText = 'Pant Measurement';
  } else {
    groupShirt.style.display = 'block';
    groupPant.style.display = 'none';
    document.getElementById('phone-header-title').innerText = `${tab.toUpperCase()} Measurement`;
  }
}

function loadCustomerMeasurements(custVal) {
  const data = DB.getMeasurements(custVal);
  if (data && data.shirt) {
    document.getElementById('m-shirt-chest').value = data.shirt.chest || '38';
    document.getElementById('m-shirt-waist').value = data.shirt.waist || '34';
    document.getElementById('m-shirt-shoulder').value = data.shirt.shoulder || '17';
    document.getElementById('m-shirt-sleeve').value = data.shirt.sleeveLength || '24.5';
    document.getElementById('m-shirt-length').value = data.shirt.shirtLength || '27.5';
    document.getElementById('m-shirt-collar').value = data.shirt.collar || '15';
    document.getElementById('m-shirt-notes').value = data.shirt.notes || 'Regular Fit';
  }
}

function handleSaveMeasurement(e) {
  e.preventDefault();
  const custId = document.getElementById('measure-cust-select').value;
  
  const mData = {
    type: currentMeasureTab,
    shirt: {
      chest: document.getElementById('m-shirt-chest').value,
      waist: document.getElementById('m-shirt-waist').value,
      shoulder: document.getElementById('m-shirt-shoulder').value,
      sleeveLength: document.getElementById('m-shirt-sleeve').value,
      shirtLength: document.getElementById('m-shirt-length').value,
      collar: document.getElementById('m-shirt-collar').value,
      pocket: document.getElementById('m-shirt-pocket').value,
      notes: document.getElementById('m-shirt-notes').value
    },
    pant: {
      length: document.getElementById('m-pant-length').value,
      waist: document.getElementById('m-pant-waist').value,
      hip: document.getElementById('m-pant-hip').value,
      thigh: document.getElementById('m-pant-thigh').value,
      bottom: document.getElementById('m-pant-bottom').value,
      pocketStyle: document.getElementById('m-pant-pocket-style').value
    }
  };

  DB.saveMeasurements(custId, mData);
  alert('Customer Measurements Saved Successfully!');
}

/* -------------------------------------------------------------------------- */
/* NEW ORDER HANDLER & BALANCES                                               */
/* -------------------------------------------------------------------------- */
function selectOrderItemPill(item) {
  selectedOrderItem = item;
  document.querySelectorAll('.item-pill-selector .pill-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.item === item);
  });
  document.getElementById('order-item-hidden').value = item;
}

function recalcOrderBalance() {
  const advance = Number(document.getElementById('order-advance').value) || 0;
  const total = Number(document.getElementById('order-total').value) || 0;
  const balance = total - advance;
  document.getElementById('order-balance-val').innerText = `₹ ${balance.toLocaleString()}`;
}

function handleSaveOrder(e) {
  e.preventDefault();
  const custId = document.getElementById('order-cust-select').value;
  const customers = DB.getCustomers();
  const custObj = customers.find(c => c.id === custId) || { name: 'Customer' };

  const fabric = document.getElementById('order-fabric-select').value;
  const deliveryDate = document.getElementById('order-delivery-date').value;
  const trialDate = document.getElementById('order-trial-date').value;
  const advance = Number(document.getElementById('order-advance').value) || 0;
  const total = Number(document.getElementById('order-total').value) || 0;
  const notes = document.getElementById('order-notes').value;

  const orderId = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
  const newOrder = {
    id: orderId,
    customerId: custId,
    customerName: custObj.name,
    item: selectedOrderItem,
    fabric: fabric,
    orderDate: new Date().toISOString().split('T')[0],
    trialDate: trialDate,
    deliveryDate: deliveryDate,
    totalAmount: total,
    advance: advance,
    balance: total - advance,
    status: 'Stitching',
    notes: notes
  };

  DB.saveOrder(newOrder);

  // Auto record advance transaction
  if (advance > 0) {
    DB.saveTransaction({
      id: `TXN-${Math.floor(100 + Math.random() * 900)}`,
      type: 'Income',
      category: 'Order Advance',
      subLedger: 'UPI Payments',
      amount: advance,
      date: new Date().toISOString().split('T')[0],
      description: `Advance for ${orderId} (${custObj.name})`
    });
  }

  renderDashboard();
  showReceiptModal(orderId);
}

/* -------------------------------------------------------------------------- */
/* STOCK LIST RENDERER                                                        */
/* -------------------------------------------------------------------------- */
function renderStockList(filterQuery = '') {
  const stock = DB.getStock();
  const container = document.getElementById('stock-list-container');
  if (!container) return;

  const filtered = stock.filter(s => 
    s.name.toLowerCase().includes(filterQuery.toLowerCase()) || 
    s.sku.toLowerCase().includes(filterQuery.toLowerCase())
  );

  const html = filtered.map(s => `
    <div class="stock-item-card">
      <div style="display:flex; align-items:center;">
        ${s.image ? `<img src="${s.image}" class="fabric-swatch" alt="${s.name}">` : `<div class="fabric-swatch" style="background-color: ${s.color || '#333'};"></div>`}
        <div class="stock-details">
          <div class="stock-name">${s.name}</div>
          <div class="stock-sku">SKU: ${s.sku}</div>
          <div class="stock-meters">Meter: ${s.meters.toFixed(2)}</div>
        </div>
      </div>
      <div class="stock-price">₹ ${s.pricePerMeter.toFixed(2)}</div>
    </div>
  `).join('');

  container.innerHTML = html;
}

function filterStockList(query) {
  renderStockList(query);
}

/* -------------------------------------------------------------------------- */
/* HISAB & ACCOUNTS                                                           */
/* -------------------------------------------------------------------------- */
function renderAccountsSummary() {
  const txns = DB.getTransactions();
  let totalIncome = 0;
  let totalExpense = 0;

  txns.forEach(t => {
    if (t.type === 'Income') totalIncome += Number(t.amount);
    if (t.type === 'Expense') totalExpense += Number(t.amount);
  });

  const incEl = document.getElementById('acc-total-income');
  const expEl = document.getElementById('acc-total-expense');

  if (incEl) incEl.innerText = `₹ ${totalIncome.toLocaleString()}`;
  if (expEl) expEl.innerText = `₹ ${totalExpense.toLocaleString()}`;
}

function openNewTransactionModal() {
  document.getElementById('txn-modal')?.classList.add('active');
}

function handleSaveTransaction(e) {
  e.preventDefault();
  const type = document.getElementById('txn-type').value;
  const subledger = document.getElementById('txn-subledger').value;
  const amount = Number(document.getElementById('txn-amount').value) || 0;
  const desc = document.getElementById('txn-desc').value;

  const newTxn = {
    id: `TXN-${Math.floor(100 + Math.random() * 900)}`,
    type: type,
    category: type,
    subLedger: subledger,
    amount: amount,
    date: new Date().toISOString().split('T')[0],
    description: desc
  };

  DB.saveTransaction(newTxn);
  closeModal('txn-modal');
  renderAccountsSummary();
  renderDashboard();
  alert('Transaction Logged Successfully!');
}

function openLedgerDetailModal(ledgerName) {
  const txns = DB.getTransactions().filter(t => t.subLedger === ledgerName || ledgerName === 'Income Report');
  let listText = txns.map(t => `${t.date} | ${t.type}: ₹${t.amount} - ${t.description}`).join('\n');
  alert(`--- ${ledgerName} Ledger ---\n\n${listText || 'No recent entries for this ledger.'}`);
}

/* -------------------------------------------------------------------------- */
/* REPORTS & CANVAS CHART                                                     */
/* -------------------------------------------------------------------------- */
function renderReports() {
  setTimeout(renderReportsChart, 100);
}

function renderReportsChart() {
  const canvas = document.getElementById('reports-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May'];
  const incomeData = [25000, 32000, 28000, 39000, 45250];
  const expenseData = [12000, 15000, 14000, 16000, 18650];

  const padding = 30;
  const width = canvas.width - padding * 2;
  const height = canvas.height - padding * 2;

  // Draw Bars
  const barWidth = width / (months.length * 2.5);

  months.forEach((m, i) => {
    const x = padding + i * (barWidth * 2.2) + 10;
    
    // Income Bar (Green)
    const incHeight = (incomeData[i] / 50000) * height;
    ctx.fillStyle = '#1E8E3E';
    ctx.fillRect(x, canvas.height - padding - incHeight, barWidth, incHeight);

    // Expense Bar (Red)
    const expHeight = (expenseData[i] / 50000) * height;
    ctx.fillStyle = '#D93025';
    ctx.fillRect(x + barWidth + 2, canvas.height - padding - expHeight, barWidth, expHeight);

    // Month Label
    ctx.fillStyle = '#64748B';
    ctx.font = '10px sans-serif';
    ctx.fillText(m, x + 4, canvas.height - 10);
  });
}

function openReportDetail(reportTitle) {
  alert(`Generating detailed PDF export for ${reportTitle}...`);
}

/* -------------------------------------------------------------------------- */
/* STAFF LIST                                                                 */
/* -------------------------------------------------------------------------- */
function renderStaffList() {
  const staff = DB.getStaff();
  const container = document.getElementById('staff-list-container');
  if (!container) return;

  const html = staff.map(s => `
    <div class="recent-order-item" style="margin-bottom:10px;">
      <div class="order-user-info">
        <div class="order-user-avatar" style="background:#e2e8f0;"><i data-lucide="user-check"></i></div>
        <div>
          <div class="order-user-name">${s.name}</div>
          <div class="order-user-sub">${s.role} | ${s.phone}</div>
        </div>
      </div>
      <div class="order-meta-right">
        <div style="font-weight:700; color:var(--navy-main); font-size:0.8rem;">${s.wageRate}</div>
        <span class="status-badge badge-ready">${s.assignedOrders} Active Orders</span>
      </div>
    </div>
  `).join('');

  container.innerHTML = html;
  if (window.lucide) lucide.createIcons();
}

/* -------------------------------------------------------------------------- */
/* RECEIPT MODAL & PRINTING                                                   */
/* -------------------------------------------------------------------------- */
function showReceiptModal(orderId) {
  const orders = DB.getOrders();
  const order = orders.find(o => o.id === orderId) || orders[0];
  const settings = DB.getSettings();

  const printArea = document.getElementById('receipt-print-area');
  if (!printArea) return;

  printArea.innerHTML = `
    <div class="thermal-receipt">
      <div class="receipt-header">
        <h3>${settings.shopName}</h3>
        <p>${settings.tagline}</p>
        <p>Ph: ${settings.phone}</p>
      </div>

      <p><strong>Receipt #:</strong> ${order.id}</p>
      <p><strong>Date:</strong> ${order.orderDate}</p>
      <p><strong>Customer:</strong> ${order.customerName}</p>
      
      <div class="receipt-divider"></div>

      <table class="receipt-table">
        <tr>
          <th>Item</th>
          <th>Fabric</th>
          <th style="text-align:right;">Amt</th>
        </tr>
        <tr>
          <td>${order.item}</td>
          <td>${order.fabric}</td>
          <td style="text-align:right;">₹${order.totalAmount}</td>
        </tr>
      </table>

      <div class="receipt-divider"></div>

      <div style="display:flex; justify-content:space-between;">
        <span>Total:</span>
        <strong>₹ ${order.totalAmount}</strong>
      </div>
      <div style="display:flex; justify-content:space-between;">
        <span>Advance Paid:</span>
        <span>₹ ${order.advance}</span>
      </div>
      <div style="display:flex; justify-content:space-between; font-weight:bold; font-size:1rem; margin-top:4px;">
        <span>Balance Due:</span>
        <span>₹ ${order.balance}</span>
      </div>

      <div class="receipt-divider"></div>

      <p style="font-size:0.75rem;"><strong>Trial Date:</strong> ${order.trialDate}</p>
      <p style="font-size:0.75rem;"><strong>Delivery Date:</strong> ${order.deliveryDate}</p>

      <div class="receipt-footer">
        <p>Thank you for choosing Hingu Tailors!</p>
        <p>Quality Fitting Guaranteed</p>
      </div>
    </div>
  `;

  document.getElementById('receipt-modal')?.classList.add('active');
}

function closeModal(modalId) {
  document.getElementById(modalId)?.classList.remove('active');
}

function printReceipt() {
  window.print();
}

function sendReceiptWhatsApp() {
  alert('WhatsApp notification link generated! Sending order confirmation details to customer mobile number.');
}

/* -------------------------------------------------------------------------- */
/* DESKTOP ERP WIDESCREEN RENDERER                                            */
/* -------------------------------------------------------------------------- */
function switchErpTab(tabName) {
  document.querySelectorAll('.sidebar-nav-btn').forEach(btn => btn.classList.remove('active'));
  event?.currentTarget?.classList.add('active');

  const titleMap = {
    'dashboard': 'Dashboard Overview',
    'customers': 'Customer Directory',
    'measurements': 'Customer Measurement Database',
    'orders': 'Order Management & Delivery Pipeline',
    'stock': 'Fabric & Stock Inventory',
    'accounts': 'Accounts, Income & Expense Ledger',
    'reports': 'Business Analytics & Reports',
    'staff': 'Staff & Tailor Management',
    'settings': 'System Settings & Data Management'
  };

  document.getElementById('erp-page-title').innerText = titleMap[tabName] || 'Dashboard';
  renderDesktopErpView(tabName);
}

function renderDesktopErpView(tabName) {
  const container = document.getElementById('erp-view-content');
  if (!container) return;

  if (tabName === 'dashboard' || !tabName) {
    const orders = DB.getOrders();
    const customers = DB.getCustomers();

    container.innerHTML = `
      <div class="metrics-grid-2col" style="grid-template-columns: repeat(4, 1fr); margin-bottom:24px;">
        <div class="metric-card income">
          <span class="metric-label">Today's Income</span>
          <span class="metric-value">₹ 8,450</span>
        </div>
        <div class="metric-card expense">
          <span class="metric-label">Today's Expense</span>
          <span class="metric-value">₹ 2,350</span>
        </div>
        <div class="metric-card profit">
          <span class="metric-label">Today's Profit</span>
          <span class="metric-value">₹ 6,100</span>
        </div>
        <div class="metric-card pending">
          <span class="metric-label">Pending Orders</span>
          <span class="metric-value">18</span>
        </div>
      </div>

      <div style="background:#fff; border-radius:12px; padding:20px; box-shadow:var(--shadow-sm);">
        <div class="section-header">
          <h3 class="section-title">All Customer Orders</h3>
          <button class="btn-primary" onclick="navToMobileScreen('screen-new-order')">+ New Order</button>
        </div>

        <table style="width:100%; border-collapse:collapse; margin-top:12px; font-size:0.88rem;">
          <thead>
            <tr style="background:#f8fafc; text-align:left; border-bottom:2px solid #e2e8f0;">
              <th style="padding:10px;">Order ID</th>
              <th style="padding:10px;">Customer</th>
              <th style="padding:10px;">Item</th>
              <th style="padding:10px;">Fabric</th>
              <th style="padding:10px;">Delivery Date</th>
              <th style="padding:10px;">Total</th>
              <th style="padding:10px;">Balance</th>
              <th style="padding:10px;">Status</th>
              <th style="padding:10px;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${orders.map(o => `
              <tr style="border-bottom:1px solid #f1f5f9;">
                <td style="padding:10px; font-weight:700;">${o.id}</td>
                <td style="padding:10px;">${o.customerName}</td>
                <td style="padding:10px;">${o.item}</td>
                <td style="padding:10px;">${o.fabric}</td>
                <td style="padding:10px;">${o.deliveryDate}</td>
                <td style="padding:10px;">₹${o.totalAmount}</td>
                <td style="padding:10px; color:#ef4444; font-weight:700;">₹${o.balance}</td>
                <td style="padding:10px;"><span class="status-badge badge-${o.status.toLowerCase()}">${o.status}</span></td>
                <td style="padding:10px;"><button class="btn-secondary" style="padding:4px 8px; font-size:0.75rem;" onclick="showReceiptModal('${o.id}')">Print Bill</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } else if (tabName === 'customers') {
    const customers = DB.getCustomers();
    container.innerHTML = `
      <div style="background:#fff; border-radius:12px; padding:20px; box-shadow:var(--shadow-sm);">
        <div class="section-header">
          <h3 class="section-title">Customer Database</h3>
          <button class="btn-primary" onclick="navToMobileScreen('screen-new-customer')">+ Add Customer</button>
        </div>

        <table style="width:100%; border-collapse:collapse; margin-top:12px; font-size:0.88rem;">
          <thead>
            <tr style="background:#f8fafc; text-align:left; border-bottom:2px solid #e2e8f0;">
              <th style="padding:10px;">ID</th>
              <th style="padding:10px;">Name</th>
              <th style="padding:10px;">Mobile</th>
              <th style="padding:10px;">Address</th>
              <th style="padding:10px;">Joined</th>
            </tr>
          </thead>
          <tbody>
            ${customers.map(c => `
              <tr style="border-bottom:1px solid #f1f5f9;">
                <td style="padding:10px; font-weight:700;">${c.id}</td>
                <td style="padding:10px;">${c.name}</td>
                <td style="padding:10px;">${c.mobile}</td>
                <td style="padding:10px;">${c.address}</td>
                <td style="padding:10px;">${c.joinedDate}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } else {
    container.innerHTML = `
      <div style="background:#fff; border-radius:12px; padding:30px; text-align:center;">
        <h3 style="font-size:1.2rem; font-weight:700; margin-bottom:10px;">${tabName.toUpperCase()} Module Active</h3>
        <p style="color:var(--text-muted);">Access complete records via sidebar menu options or switch to Mobile Simulator view.</p>
      </div>
    `;
  }
}

/* -------------------------------------------------------------------------- */
/* DATA EXPORT & IMPORT                                                       */
/* -------------------------------------------------------------------------- */
function exportDataJSON() {
  const data = {
    customers: DB.getCustomers(),
    orders: DB.getOrders(),
    stock: DB.getStock(),
    transactions: DB.getTransactions()
  };
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `hingu_tailors_backup_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
}

function triggerRestoreJSON() {
  alert('Backup JSON uploaded & database restored successfully!');
}

function resetDatabaseDefault() {
  if (confirm('Are you sure you want to reset all data to default demo state?')) {
    DB.resetToDefault();
    location.reload();
  }
}
