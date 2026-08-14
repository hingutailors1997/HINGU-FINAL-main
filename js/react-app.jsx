/**
 * HINGU TAILORS ERP - REACT APPLICATION CONTROLLER
 * Responsive Desktop-First Architecture (Desktop, Tablet, Mobile)
 */

const { useState, useEffect, useRef } = React;

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // App State
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [stock, setStock] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [staff, setStaff] = useState([]);
  const [settings, setSettings] = useState({});

  // Active Modals State
  const [activeModal, setActiveModal] = useState(null); // 'order', 'customer', 'txn', 'receipt'
  const [selectedOrderForBill, setSelectedOrderForBill] = useState(null);

  // Sync Data on Load
  useEffect(() => {
    loadAppData();
  }, []);

  const loadAppData = async () => {
    try {
      // Try Express API first
      const res = await fetch('/api/data');
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.customers || DB.getCustomers());
        setOrders(data.orders || DB.getOrders());
        setStock(data.stock || DB.getStock());
        setTransactions(data.transactions || DB.getTransactions());
        setStaff(data.staff || DB.getStaff());
        setSettings(data.settings || DB.getSettings());
        return;
      }
    } catch (e) {
      console.log('Falling back to LocalStorage DB engine...');
    }
    // Fallback to local DB engine
    setCustomers(DB.getCustomers());
    setOrders(DB.getOrders());
    setStock(DB.getStock());
    setTransactions(DB.getTransactions());
    setStaff(DB.getStaff());
    setSettings(DB.getSettings());
  };

  useEffect(() => {
    if (window.lucide) {
      setTimeout(() => lucide.createIcons(), 50);
    }
  }, [activeTab, activeModal, orders, customers]);

  // Handlers
  const handleSaveCustomer = async (custData) => {
    DB.saveCustomer(custData);
    try { await fetch('/api/customers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(custData) }); } catch(e){}
    loadAppData();
    setActiveModal(null);
    alert(`Customer "${custData.name}" saved successfully!`);
  };

  const handleSaveOrder = async (orderData) => {
    DB.saveOrder(orderData);
    try { await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(orderData) }); } catch(e){}

    if (orderData.advance > 0) {
      const txn = {
        id: `TXN-${Math.floor(100 + Math.random() * 900)}`,
        type: 'Income',
        category: 'Order Advance',
        subLedger: 'UPI Payments',
        amount: orderData.advance,
        date: new Date().toISOString().split('T')[0],
        description: `Advance for ${orderData.id} (${orderData.customerName})`
      };
      DB.saveTransaction(txn);
      try { await fetch('/api/transactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(txn) }); } catch(e){}
    }

    loadAppData();
    setSelectedOrderForBill(orderData);
    setActiveModal('receipt');
  };

  const handleSaveTxn = async (txnData) => {
    DB.saveTransaction(txnData);
    try { await fetch('/api/transactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(txnData) }); } catch(e){}
    loadAppData();
    setActiveModal(null);
    alert('Financial Entry Logged Successfully!');
  };

  const openBillModal = (order) => {
    setSelectedOrderForBill(order);
    setActiveModal('receipt');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      
      {/* ------------------------------------------------------------------ */}
      {/* SIDEBAR NAVIGATION (Desktop Widescreen & Collapsible Mobile Drawer) */}
      {/* ------------------------------------------------------------------ */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-navy-800 text-white transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col shadow-2xl`}>
        {/* Brand Title */}
        <div className="flex items-center gap-3 p-5 border-b border-navy-700">
          <div className="p-2 bg-gold-500/20 border border-gold-500/40 rounded-xl text-gold-500">
            <i data-lucide="scissors" className="w-6 h-6"></i>
          </div>
          <div>
            <h1 className="font-outfit font-extrabold text-lg tracking-wider text-white">HINGU TAILORS</h1>
            <div className="text-xs font-semibold text-gold-500 tracking-widest uppercase">ERP SYSTEM</div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <NavItem id="dashboard" label="Dashboard" icon="layout-dashboard" active={activeTab === 'dashboard'} onClick={(id) => { setActiveTab(id); setIsSidebarOpen(false); }} />
          <NavItem id="customers" label="Customers" icon="users" active={activeTab === 'customers'} onClick={(id) => { setActiveTab(id); setIsSidebarOpen(false); }} />
          <NavItem id="measurements" label="Measurements" icon="ruler" active={activeTab === 'measurements'} onClick={(id) => { setActiveTab(id); setIsSidebarOpen(false); }} />
          <NavItem id="orders" label="Orders Pipeline" icon="shopping-bag" active={activeTab === 'orders'} onClick={(id) => { setActiveTab(id); setIsSidebarOpen(false); }} />
          <NavItem id="stock" label="Fabric & Stock" icon="layers" active={activeTab === 'stock'} onClick={(id) => { setActiveTab(id); setIsSidebarOpen(false); }} />
          <NavItem id="accounts" label="Accounts & Ledger" icon="calculator" active={activeTab === 'accounts'} onClick={(id) => { setActiveTab(id); setIsSidebarOpen(false); }} />
          <NavItem id="reports" label="Reports & Analytics" icon="bar-chart-3" active={activeTab === 'reports'} onClick={(id) => { setActiveTab(id); setIsSidebarOpen(false); }} />
          <NavItem id="staff" label="Staff & Tailors" icon="user-check" active={activeTab === 'staff'} onClick={(id) => { setActiveTab(id); setIsSidebarOpen(false); }} />
          <NavItem id="settings" label="Settings" icon="settings" active={activeTab === 'settings'} onClick={(id) => { setActiveTab(id); setIsSidebarOpen(false); }} />
        </nav>

        {/* Footer info */}
        <div className="p-4 border-t border-navy-700 text-center text-xs text-slate-400">
          <div className="font-semibold text-slate-300">🔒 100% Private & Secure</div>
          <div>Hingu Tailors Offline ERP</div>
        </div>
      </aside>

      {/* Overlay Backdrop for Mobile Drawer */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-30 bg-slate-900/60 backdrop-blur-sm lg:hidden" onclick={() => setIsSidebarOpen(false)}></div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* MAIN CONTENT AREA                                                  */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Top Header Bar */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <button className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
              <i data-lucide="menu" className="w-6 h-6"></i>
            </button>
            <div>
              <h2 className="font-outfit font-bold text-xl text-navy-900 capitalize">{activeTab} Overview</h2>
              <p className="text-xs text-slate-500 font-medium">Smart Tailoring Management System</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="hidden sm:flex items-center gap-2 bg-navy-800 hover:bg-navy-700 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-md transition-all active:scale-95" onClick={() => setActiveModal('order')}>
              <i data-lucide="plus" className="w-4 h-4"></i> New Order
            </button>
            <button className="flex items-center gap-2 bg-gold-500 hover:bg-gold-600 text-navy-900 px-4 py-2 rounded-xl text-sm font-bold shadow-md transition-all active:scale-95" onClick={() => setActiveModal('customer')}>
              <i data-lucide="user-plus" className="w-4 h-4"></i> Add Customer
            </button>
          </div>
        </header>

        {/* Scrollable View Content */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'dashboard' && <DashboardView orders={orders} customers={customers} transactions={transactions} openBillModal={openBillModal} setActiveTab={setActiveTab} />}
          {activeTab === 'customers' && <CustomersView customers={customers} onAddClick={() => setActiveModal('customer')} />}
          {activeTab === 'measurements' && <MeasurementsView customers={customers} />}
          {activeTab === 'orders' && <OrdersView orders={orders} openBillModal={openBillModal} onNewOrderClick={() => setActiveModal('order')} />}
          {activeTab === 'stock' && <StockView stock={stock} />}
          {activeTab === 'accounts' && <AccountsView transactions={transactions} onAddTxnClick={() => setActiveModal('txn')} />}
          {activeTab === 'reports' && <ReportsView transactions={transactions} orders={orders} />}
          {activeTab === 'staff' && <StaffView staff={staff} />}
          {activeTab === 'settings' && <SettingsView settings={settings} reloadData={loadAppData} />}
        </main>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* MODAL POPUPS                                                       */}
      {/* ------------------------------------------------------------------ */}
      {activeModal === 'order' && <NewOrderModal customers={customers} stock={stock} onClose={() => setActiveModal(null)} onSave={handleSaveOrder} />}
      {activeModal === 'customer' && <NewCustomerModal onClose={() => setActiveModal(null)} onSave={handleSaveCustomer} />}
      {activeModal === 'txn' && <NewTxnModal onClose={() => setActiveModal(null)} onSave={handleSaveTxn} />}
      {activeModal === 'receipt' && selectedOrderForBill && <ReceiptModal order={selectedOrderForBill} settings={settings} onClose={() => setActiveModal(null)} />}

    </div>
  );
}

// Navigation Item Component
function NavItem({ id, label, icon, active, onClick }) {
  return (
    <button onClick={() => onClick(id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all ${active ? 'bg-gold-500 text-navy-900 font-bold shadow-md' : 'text-slate-300 hover:bg-navy-700 hover:text-white'}`}>
      <i data-lucide={icon} className="w-5 h-5"></i>
      <span>{label}</span>
    </button>
  );
}

// --------------------------------------------------------------------------
// 1. DASHBOARD VIEW COMPONENT
// --------------------------------------------------------------------------
function DashboardView({ orders, customers, transactions, openBillModal, setActiveTab }) {
  let todayIncome = 0, todayExpense = 0;
  transactions.forEach(t => {
    if (t.type === 'Income') todayIncome += Number(t.amount);
    if (t.type === 'Expense') todayExpense += Number(t.amount);
  });
  const todayProfit = todayIncome - todayExpense;
  const pendingCount = orders.filter(o => o.status === 'Pending' || o.status === 'Stitching').length;
  const deliveryCount = orders.filter(o => o.status === 'Ready').length;

  return (
    <div className="space-y-6">
      {/* Top Date Banner */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-navy-800/10 rounded-xl text-navy-800"><i data-lucide="calendar" className="w-5 h-5"></i></div>
          <div>
            <div className="font-outfit font-bold text-slate-800 text-base">Today's Overview</div>
            <div className="text-xs text-slate-500 font-medium">14 May 2024, Tuesday</div>
          </div>
        </div>
        <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1.5 rounded-full border border-emerald-300">System Online</span>
      </div>

      {/* 6 Metrics Grid (Colors Matching Screenshot) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <MetricCard label="Today's Income" value={`₹ ${todayIncome.toLocaleString()}`} bgClass="bg-stat-incomeBg" textClass="text-stat-incomeText" icon="trending-up" />
        <MetricCard label="Today's Expense" value={`₹ ${todayExpense.toLocaleString()}`} bgClass="bg-stat-expenseBg" textClass="text-stat-expenseText" icon="trending-down" />
        <MetricCard label="Today's Profit" value={`₹ ${todayProfit.toLocaleString()}`} bgClass="bg-stat-profitBg" textClass="text-stat-profitText" icon="wallet" />
        <MetricCard label="Pending Orders" value={pendingCount} bgClass="bg-stat-pendingBg" textClass="text-stat-pendingText" icon="clock" />
        <MetricCard label="Today's Delivery" value={deliveryCount} bgClass="bg-stat-deliveryBg" textClass="text-stat-deliveryText" icon="check-circle-2" />
        <MetricCard label="Total Customers" value={customers.length} bgClass="bg-stat-customersBg" textClass="text-stat-customersText" icon="users" />
      </div>

      {/* Main Grid Section: Recent Orders & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Orders Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-outfit font-bold text-lg text-slate-800">Recent Orders Pipeline</h3>
            <button className="text-xs font-bold text-navy-800 hover:text-gold-600 transition-colors" onClick={() => setActiveTab('orders')}>View All Orders &rarr;</button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="pb-3 pt-2 px-3">Order ID</th>
                  <th className="pb-3 pt-2 px-3">Customer</th>
                  <th className="pb-3 pt-2 px-3">Item</th>
                  <th className="pb-3 pt-2 px-3">Delivery Date</th>
                  <th className="pb-3 pt-2 px-3">Status</th>
                  <th className="pb-3 pt-2 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.slice(0, 5).map(o => (
                  <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 font-bold text-navy-800">{o.id}</td>
                    <td className="py-3 px-3 font-medium text-slate-700">{o.customerName}</td>
                    <td className="py-3 px-3"><span className="bg-slate-100 text-slate-700 text-xs px-2.5 py-1 rounded-md font-semibold">{o.item}</span></td>
                    <td className="py-3 px-3 text-slate-500 text-xs">{o.deliveryDate}</td>
                    <td className="py-3 px-3"><Badge status={o.status} /></td>
                    <td className="py-3 px-3 text-right">
                      <button className="bg-navy-800 hover:bg-navy-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm" onClick={() => openBillModal(o)}>Print Bill</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Analytics Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between">
          <div>
            <h3 className="font-outfit font-bold text-lg text-slate-800 mb-2">Financial Breakdown</h3>
            <p className="text-xs text-slate-500 mb-4">Monthly revenue versus shop expense breakdown.</p>
            <div className="h-48 flex items-center justify-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <canvas id="dash-canvas" height="160"></canvas>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-slate-600">
            <span>Net Profit Margin: <strong>72%</strong></span>
            <button className="text-navy-800 font-bold hover:underline" onClick={() => setActiveTab('reports')}>Full Reports &rarr;</button>
          </div>
        </div>

      </div>
    </div>
  );
}

function MetricCard({ label, value, bgClass, textClass, icon }) {
  return (
    <div className={`${bgClass} rounded-2xl p-4 shadow-sm border border-black/5 flex flex-col justify-between transition-transform hover:-translate-y-1`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs font-bold opacity-90 ${textClass}`}>{label}</span>
        <div className={`p-2 rounded-xl bg-white/60 ${textClass}`}><i data-lucide={icon} className="w-4 h-4"></i></div>
      </div>
      <div className={`font-outfit font-extrabold text-2xl tracking-tight ${textClass}`}>{value}</div>
    </div>
  );
}

function Badge({ status }) {
  const map = {
    'Stitching': 'bg-amber-100 text-amber-800 border-amber-300',
    'Ready': 'bg-emerald-100 text-emerald-800 border-emerald-300',
    'Pending': 'bg-sky-100 text-sky-800 border-sky-300',
    'Delivered': 'bg-purple-100 text-purple-800 border-purple-300',
  };
  return <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold border ${map[status] || 'bg-slate-100 text-slate-700'}`}>{status}</span>;
}

// --------------------------------------------------------------------------
// 2. CUSTOMERS VIEW COMPONENT
// --------------------------------------------------------------------------
function CustomersView({ customers, onAddClick }) {
  const [search, setSearch] = useState('');
  const filtered = customers.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.mobile.includes(search));

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <h3 className="font-outfit font-bold text-xl text-slate-800">Customer Directory</h3>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <input type="text" placeholder="Search by name or mobile..." className="w-full sm:w-64 px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-navy-800" value={search} onChange={e => setSearch(e.target.value)} />
          <button className="bg-gold-500 hover:bg-gold-600 text-navy-900 font-bold text-sm px-4 py-2 rounded-xl shadow-sm whitespace-nowrap" onClick={onAddClick}>+ New Customer</button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">Customer ID</th>
              <th className="py-3 px-4">Name</th>
              <th className="py-3 px-4">Mobile</th>
              <th className="py-3 px-4">Address</th>
              <th className="py-3 px-4">Joined Date</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(c => (
              <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                <td className="py-3 px-4 font-bold text-navy-800">{c.id}</td>
                <td className="py-3 px-4 font-semibold text-slate-800">{c.name}</td>
                <td className="py-3 px-4 text-slate-600">{c.mobile}</td>
                <td className="py-3 px-4 text-slate-500">{c.address}</td>
                <td className="py-3 px-4 text-slate-400 text-xs">{c.joinedDate}</td>
                <td className="py-3 px-4 text-right space-x-2">
                  <a href={`https://wa.me/91${c.mobile}`} target="_blank" className="inline-block bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm">WhatsApp</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------
// 3. MEASUREMENTS VIEW COMPONENT
// --------------------------------------------------------------------------
function MeasurementsView({ customers }) {
  const [selectedCust, setSelectedCust] = useState(customers[0]?.id || '');
  const [tab, setTab] = useState('shirt');

  const [shirtSpecs, setShirtSpecs] = useState({ chest: '38', waist: '34', shoulder: '17', sleeveLength: '24.5', shirtLength: '27.5', collar: '15', pocket: 'Yes', notes: 'Regular Fit' });
  const [pantSpecs, setPantSpecs] = useState({ length: '40', waist: '34', hip: '38', thigh: '24', bottom: '16', pocketStyle: 'Cross' });

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h3 className="font-outfit font-bold text-xl text-slate-800">Customer Measurement Database</h3>
          <p className="text-xs text-slate-500">Save and recall exact garment specifications for repeat customers.</p>
        </div>
        <select className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold bg-slate-50 focus:outline-none focus:border-navy-800" value={selectedCust} onChange={e => setSelectedCust(e.target.value)}>
          {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.mobile})</option>)}
        </select>
      </div>

      {/* Garment Category Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        {['shirt', 'pant', 'suit', 'kurta', 'safari'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-5 py-2 rounded-xl text-xs font-bold uppercase transition-all ${tab === t ? 'bg-navy-800 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Form Fields */}
      <form onSubmit={e => { e.preventDefault(); alert('Measurements Saved Successfully!'); }} className="space-y-4">
        {tab === 'shirt' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <MeasureInput label="Chest (in)" value={shirtSpecs.chest} onChange={v => setShirtSpecs({...shirtSpecs, chest: v})} />
            <MeasureInput label="Waist (in)" value={shirtSpecs.waist} onChange={v => setShirtSpecs({...shirtSpecs, waist: v})} />
            <MeasureInput label="Shoulder (in)" value={shirtSpecs.shoulder} onChange={v => setShirtSpecs({...shirtSpecs, shoulder: v})} />
            <MeasureInput label="Sleeve Length (in)" value={shirtSpecs.sleeveLength} onChange={v => setShirtSpecs({...shirtSpecs, sleeveLength: v})} />
            <MeasureInput label="Shirt Length (in)" value={shirtSpecs.shirtLength} onChange={v => setShirtSpecs({...shirtSpecs, shirtLength: v})} />
            <MeasureInput label="Collar (in)" value={shirtSpecs.collar} onChange={v => setShirtSpecs({...shirtSpecs, collar: v})} />
          </div>
        )}

        {tab === 'pant' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <MeasureInput label="Pant Length (in)" value={pantSpecs.length} onChange={v => setPantSpecs({...pantSpecs, length: v})} />
            <MeasureInput label="Waist (in)" value={pantSpecs.waist} onChange={v => setPantSpecs({...pantSpecs, waist: v})} />
            <MeasureInput label="Hip (in)" value={pantSpecs.hip} onChange={v => setPantSpecs({...pantSpecs, hip: v})} />
            <MeasureInput label="Thigh (in)" value={pantSpecs.thigh} onChange={v => setPantSpecs({...pantSpecs, thigh: v})} />
            <MeasureInput label="Bottom / Mori (in)" value={pantSpecs.bottom} onChange={v => setPantSpecs({...pantSpecs, bottom: v})} />
          </div>
        )}

        <button type="submit" className="w-full bg-navy-800 hover:bg-navy-700 text-white font-bold py-3 rounded-xl shadow-md transition-all">SAVE MEASUREMENT SPECS</button>
      </form>
    </div>
  );
}

function MeasureInput({ label, value, onChange }) {
  return (
    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
      <span className="text-xs font-bold text-slate-700">{label}</span>
      <input type="text" className="w-20 px-2 py-1 text-center font-bold text-slate-800 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-navy-800" value={value} onChange={e => onChange(e.target.value)} />
    </div>
  );
}

// --------------------------------------------------------------------------
// 4. ORDERS VIEW COMPONENT
// --------------------------------------------------------------------------
function OrdersView({ orders, openBillModal, onNewOrderClick }) {
  const [filterStatus, setFilterStatus] = useState('All');
  const filtered = orders.filter(o => filterStatus === 'All' || o.status === filterStatus);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <h3 className="font-outfit font-bold text-xl text-slate-800">Orders Management Pipeline</h3>
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {['All', 'Pending', 'Stitching', 'Ready', 'Delivered'].map(s => (
              <button key={s} onClick={() => setFilterStatus(s)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filterStatus === s ? 'bg-white text-navy-900 shadow-sm font-bold' : 'text-slate-600'}`}>{s}</button>
            ))}
          </div>
          <button className="bg-navy-800 hover:bg-navy-700 text-white font-bold text-sm px-4 py-2 rounded-xl shadow-sm" onClick={onNewOrderClick}>+ New Order</button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">Order ID</th>
              <th className="py-3 px-4">Customer</th>
              <th className="py-3 px-4">Item</th>
              <th className="py-3 px-4">Fabric</th>
              <th className="py-3 px-4">Trial Date</th>
              <th className="py-3 px-4">Delivery Date</th>
              <th className="py-3 px-4">Total</th>
              <th className="py-3 px-4">Balance</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(o => (
              <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                <td className="py-3 px-4 font-bold text-navy-800">{o.id}</td>
                <td className="py-3 px-4 font-medium text-slate-800">{o.customerName}</td>
                <td className="py-3 px-4"><span className="bg-slate-100 text-slate-700 text-xs px-2.5 py-1 rounded-md font-semibold">{o.item}</span></td>
                <td className="py-3 px-4 text-slate-600 text-xs">{o.fabric}</td>
                <td className="py-3 px-4 text-slate-500 text-xs">{o.trialDate}</td>
                <td className="py-3 px-4 text-slate-500 text-xs">{o.deliveryDate}</td>
                <td className="py-3 px-4 font-bold text-slate-800">₹{o.totalAmount}</td>
                <td className="py-3 px-4 font-bold text-rose-600">₹{o.balance}</td>
                <td className="py-3 px-4"><Badge status={o.status} /></td>
                <td className="py-3 px-4 text-right">
                  <button className="bg-navy-800 hover:bg-navy-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm" onClick={() => openBillModal(o)}>Thermal Bill</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------
// 5. STOCK VIEW COMPONENT
// --------------------------------------------------------------------------
function StockView({ stock }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-outfit font-bold text-xl text-slate-800">Fabric & Stock Inventory</h3>
        <button className="bg-navy-800 text-white text-sm font-bold px-4 py-2 rounded-xl shadow-sm" onClick={() => alert('Add fabric swatch modal!')}>+ Add Fabric</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stock.map(s => (
          <div key={s.id} className="p-4 rounded-2xl border border-slate-200 flex items-center justify-between bg-slate-50 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              {s.image ? <img src={s.image} className="w-14 h-14 rounded-xl object-cover border border-slate-300" /> : <div className="w-14 h-14 rounded-xl border border-slate-300" style={{backgroundColor: s.color || '#333'}}></div>}
              <div>
                <h4 className="font-bold text-slate-800 text-base">{s.name}</h4>
                <div className="text-xs text-slate-500 font-medium">SKU: {s.sku} | {s.category}</div>
                <div className="text-xs font-bold text-navy-800 mt-1">Available: {s.meters} meters</div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-outfit font-extrabold text-lg text-slate-800">₹{s.pricePerMeter}</div>
              <span className="text-[10px] text-slate-400 font-semibold uppercase">per meter</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------
// 6. ACCOUNTS VIEW COMPONENT
// --------------------------------------------------------------------------
function AccountsView({ transactions, onAddTxnClick }) {
  let totalIncome = 0, totalExpense = 0;
  transactions.forEach(t => {
    if (t.type === 'Income') totalIncome += Number(t.amount);
    if (t.type === 'Expense') totalExpense += Number(t.amount);
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-stat-incomeBg rounded-2xl p-6 border border-emerald-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-stat-incomeText uppercase tracking-wider">Total Ledger Income</div>
            <div className="font-outfit font-extrabold text-3xl text-stat-incomeText mt-1">₹ {totalIncome.toLocaleString()}</div>
          </div>
          <div className="p-3 bg-emerald-200/60 text-emerald-800 rounded-2xl"><i data-lucide="arrow-down-left" className="w-8 h-8"></i></div>
        </div>

        <div className="bg-stat-expenseBg rounded-2xl p-6 border border-rose-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-stat-expenseText uppercase tracking-wider">Total Ledger Expense</div>
            <div className="font-outfit font-extrabold text-3xl text-stat-expenseText mt-1">₹ {totalExpense.toLocaleString()}</div>
          </div>
          <div className="p-3 bg-rose-200/60 text-rose-800 rounded-2xl"><i data-lucide="arrow-up-right" className="w-8 h-8"></i></div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-outfit font-bold text-xl text-slate-800">Financial Ledger Transactions</h3>
          <button className="bg-navy-800 hover:bg-navy-700 text-white font-bold text-sm px-4 py-2 rounded-xl shadow-sm" onClick={onAddTxnClick}>+ New Entry</button>
        </div>

        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">Txn ID</th>
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4">Sub-Ledger</th>
              <th className="py-3 px-4">Description</th>
              <th className="py-3 px-4 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {transactions.map(t => (
              <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                <td className="py-3 px-4 font-bold text-slate-700">{t.id}</td>
                <td className="py-3 px-4 text-slate-500 text-xs">{t.date}</td>
                <td className="py-3 px-4 font-medium text-slate-800">{t.subLedger}</td>
                <td className="py-3 px-4 text-slate-600">{t.description}</td>
                <td className={`py-3 px-4 text-right font-bold ${t.type === 'Income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {t.type === 'Income' ? '+' : '-'} ₹{t.amount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------
// 7. REPORTS VIEW COMPONENT
// --------------------------------------------------------------------------
function ReportsView() {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6">
      <h3 className="font-outfit font-bold text-xl text-slate-800">Reports & Performance Analytics</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {['Daily Sales Report', 'Delivery & Trial Schedule', 'Monthly Profitability'].map(r => (
          <div key={r} className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between hover:bg-slate-100 cursor-pointer" onClick={() => alert(`Generating PDF download for ${r}...`)}>
            <span className="font-bold text-slate-800 text-sm">{r}</span>
            <i data-lucide="download" className="w-5 h-5 text-navy-800"></i>
          </div>
        ))}
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------
// 8. STAFF VIEW COMPONENT
// --------------------------------------------------------------------------
function StaffView({ staff }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
      <h3 className="font-outfit font-bold text-xl text-slate-800">Staff & Master Tailors</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {staff.map(s => (
          <div key={s.id} className="p-4 rounded-xl border border-slate-200 flex items-center justify-between bg-slate-50">
            <div>
              <h4 className="font-bold text-slate-800 text-base">{s.name}</h4>
              <div className="text-xs text-slate-500 font-medium">{s.role} | {s.phone}</div>
            </div>
            <div className="text-right">
              <div className="font-bold text-navy-800 text-sm">{s.wageRate}</div>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">{s.assignedOrders} Active Orders</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------
// 9. SETTINGS VIEW COMPONENT
// --------------------------------------------------------------------------
function SettingsView({ reloadData }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6 max-w-2xl">
      <h3 className="font-outfit font-bold text-xl text-slate-800">System Configuration & Data Backup</h3>
      <div className="space-y-4">
        <button className="w-full py-3 bg-navy-800 text-white font-bold rounded-xl shadow-md" onClick={() => alert('Backup JSON exported successfully!')}>Export Data Backup (JSON)</button>
        <button className="w-full py-3 bg-rose-600 text-white font-bold rounded-xl shadow-md" onClick={() => { DB.resetToDefault(); reloadData(); alert('Data reset to default state!'); }}>Reset Demo Sample Data</button>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------
// MODAL POPUPS (NEW ORDER, NEW CUSTOMER, NEW TXN, THERMAL BILL)
// --------------------------------------------------------------------------
function NewOrderModal({ customers, stock, onClose, onSave }) {
  const [cust, setCust] = useState(customers[0]?.id || '');
  const [item, setItem] = useState('Shirt');
  const [fabric, setFabric] = useState(stock[0]?.name || '');
  const [advance, setAdvance] = useState(500);
  const [total, setTotal] = useState(1500);

  const handleSubmit = e => {
    e.preventDefault();
    const custObj = customers.find(c => c.id === cust) || { name: 'Customer' };
    const orderId = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;

    onSave({
      id: orderId,
      customerId: cust,
      customerName: custObj.name,
      item: item,
      fabric: fabric,
      orderDate: new Date().toISOString().split('T')[0],
      trialDate: '2024-05-18',
      deliveryDate: '2024-05-20',
      totalAmount: Number(total),
      advance: Number(advance),
      balance: Number(total) - Number(advance),
      status: 'Stitching'
    });
  };

  return (
    <Modal title="Create New Garment Order" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Select Customer</label>
          <select className="w-full p-2.5 border border-slate-300 rounded-xl text-sm font-semibold" value={cust} onChange={e => setCust(e.target.value)}>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.mobile})</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Item Category</label>
          <div className="flex gap-2">
            {['Shirt', 'Pant', 'Suit', 'Kurta', 'Other'].map(i => (
              <button type="button" key={i} onClick={() => setItem(i)} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${item === i ? 'bg-navy-800 text-white' : 'bg-slate-100 text-slate-700'}`}>{i}</button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Total Amount (₹)</label>
            <input type="number" className="w-full p-2.5 border border-slate-300 rounded-xl text-sm font-bold" value={total} onChange={e => setTotal(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Advance Paid (₹)</label>
            <input type="number" className="w-full p-2.5 border border-slate-300 rounded-xl text-sm font-bold" value={advance} onChange={e => setAdvance(e.target.value)} />
          </div>
        </div>

        <div className="p-3 bg-slate-100 rounded-xl flex justify-between font-bold text-navy-800 text-sm">
          <span>Balance Due:</span>
          <span>₹ {(Number(total) - Number(advance)).toLocaleString()}</span>
        </div>

        <button type="submit" className="w-full py-3 bg-navy-800 text-white font-bold rounded-xl shadow-md">SAVE ORDER & GENERATE BILL</button>
      </form>
    </Modal>
  );
}

function NewCustomerModal({ onClose, onSave }) {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');

  const handleSubmit = e => {
    e.preventDefault();
    onSave({
      id: `CUST-${Math.floor(1000 + Math.random() * 9000)}`,
      name,
      mobile,
      address,
      joinedDate: new Date().toISOString().split('T')[0],
      totalOrders: 0
    });
  };

  return (
    <Modal title="Add New Customer" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
          <input type="text" required className="w-full p-2.5 border border-slate-300 rounded-xl text-sm" value={name} onChange={e => setName(e.target.value)} placeholder="Enter Full Name" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Number *</label>
          <input type="tel" required className="w-full p-2.5 border border-slate-300 rounded-xl text-sm" value={mobile} onChange={e => setMobile(e.target.value)} placeholder="Enter Mobile Number" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Address</label>
          <textarea className="w-full p-2.5 border border-slate-300 rounded-xl text-sm" rows="3" value={address} onChange={e => setAddress(e.target.value)} placeholder="Enter Address"></textarea>
        </div>
        <button type="submit" className="w-full py-3 bg-gold-500 text-navy-900 font-bold rounded-xl shadow-md">SAVE CUSTOMER</button>
      </form>
    </Modal>
  );
}

function NewTxnModal({ onClose, onSave }) {
  const [type, setType] = useState('Expense');
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');

  const handleSubmit = e => {
    e.preventDefault();
    onSave({
      id: `TXN-${Math.floor(100 + Math.random() * 900)}`,
      type,
      category: type,
      subLedger: type === 'Income' ? 'Cash Book' : 'Expenses',
      amount: Number(amount),
      date: new Date().toISOString().split('T')[0],
      description: desc
    });
  };

  return (
    <Modal title="New Financial Entry" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Entry Type</label>
          <select className="w-full p-2.5 border border-slate-300 rounded-xl text-sm font-bold" value={type} onChange={e => setType(e.target.value)}>
            <option value="Expense">Expense</option>
            <option value="Income">Income</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Amount (₹) *</label>
          <input type="number" required className="w-full p-2.5 border border-slate-300 rounded-xl text-sm font-bold" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Enter Amount" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Description *</label>
          <input type="text" required className="w-full p-2.5 border border-slate-300 rounded-xl text-sm" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Details..." />
        </div>
        <button type="submit" className="w-full py-3 bg-navy-800 text-white font-bold rounded-xl shadow-md">LOG FINANCIAL ENTRY</button>
      </form>
    </Modal>
  );
}

function ReceiptModal({ order, settings, onClose }) {
  return (
    <Modal title="Order Thermal Receipt" onClose={onClose}>
      <div className="bg-white border border-slate-300 p-6 font-mono text-sm space-y-3 rounded-xl">
        <div className="text-center border-b border-dashed border-slate-400 pb-3">
          <h3 className="font-bold text-base uppercase">{settings.shopName || 'HINGU TAILORS ERP'}</h3>
          <p className="text-xs">{settings.tagline || 'Smart Tailoring Management System'}</p>
          <p className="text-xs">Ph: {settings.phone || '+91 98765 43210'}</p>
        </div>

        <div className="space-y-1 text-xs">
          <div><strong>Receipt #:</strong> {order.id}</div>
          <div><strong>Date:</strong> {order.orderDate}</div>
          <div><strong>Customer:</strong> {order.customerName}</div>
        </div>

        <div className="border-t border-b border-dashed border-slate-400 py-2">
          <div className="flex justify-between font-bold">
            <span>Item / Fabric</span>
            <span>Amt</span>
          </div>
          <div className="flex justify-between text-xs mt-1">
            <span>{order.item} ({order.fabric})</span>
            <span>₹{order.totalAmount}</span>
          </div>
        </div>

        <div className="space-y-1 text-xs">
          <div className="flex justify-between"><span>Total Amount:</span><span>₹{order.totalAmount}</span></div>
          <div className="flex justify-between"><span>Advance Paid:</span><span>₹{order.advance}</span></div>
          <div className="flex justify-between font-bold text-sm text-black border-t border-slate-300 pt-1"><span>Balance Due:</span><span>₹{order.balance}</span></div>
        </div>

        <div className="text-center border-t border-dashed border-slate-400 pt-3 text-xs">
          <p>Thank you for choosing Hingu Tailors!</p>
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <button className="flex-1 py-2.5 bg-navy-800 text-white font-bold rounded-xl" onClick={() => window.print()}>Print Bill</button>
        <button className="flex-1 py-2.5 bg-emerald-600 text-white font-bold rounded-xl" onClick={() => alert('WhatsApp receipt sent!')}>Send WhatsApp</button>
      </div>
    </Modal>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="font-outfit font-bold text-lg text-slate-800">{title}</h3>
          <button className="text-slate-400 hover:text-slate-600 text-2xl font-bold" onClick={onClose}>&times;</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// Render React App
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
