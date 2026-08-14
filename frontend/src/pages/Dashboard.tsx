import { useState, useEffect, useMemo } from 'react';
import { 
  AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend
} from 'recharts';
import { 
  TrendingUp, TrendingDown, DollarSign, ShoppingBag, Users, Clock, 
  AlertCircle, CheckCircle2, Download, Maximize, Brain, Calendar, 
  Scissors, Package, CreditCard, ChevronDown, Activity, X
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useQuery } from '@tanstack/react-query';
import { fetchOrders, fetchTransactions, fetchCustomers, scanBarcode } from '../lib/api';
import Scanner from '../components/Scanner';
import { generateDashboardPDF } from '../lib/pdfExport';
import html2canvas from 'html2canvas';
function KPICard({ title, value, change, trend, icon: Icon, color = "primary" }: any) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium text-muted-foreground tracking-tight uppercase">{title}</h3>
        <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", 
          color === 'emerald' ? 'bg-emerald-500/10 text-emerald-500' :
          color === 'rose' ? 'bg-rose-500/10 text-rose-500' :
          color === 'amber' ? 'bg-amber-500/10 text-amber-500' :
          'bg-primary/10 text-primary'
        )}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight text-foreground">{value}</span>
      </div>
      <div className="mt-2 flex items-center gap-1 text-[11px] font-medium">
        {trend === 'up' ? (
          <span className="text-emerald-500 flex items-center gap-0.5"><TrendingUp className="h-3 w-3" /> {change}</span>
        ) : (
          <span className="text-rose-500 flex items-center gap-0.5"><TrendingDown className="h-3 w-3" /> {change}</span>
        )}
        <span className="text-muted-foreground ml-1">Live data</span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [timeRange, setTimeRange] = useState('30days'); // 'today', '7days', '30days', 'year', 'all', 'custom'
  const [chartTimeRange, setChartTimeRange] = useState('6months');
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [scannedFabric, setScannedFabric] = useState<any>(null);



  const { data: ordersData, isLoading: isOrdersLoading } = useQuery({ queryKey: ['orders'], queryFn: fetchOrders });
  const { data: txsData, isLoading: isTxsLoading } = useQuery({ queryKey: ['transactions'], queryFn: fetchTransactions });
  const { data: customersData, isLoading: isCustomersLoading } = useQuery({ queryKey: ['customers'], queryFn: fetchCustomers });
  
  const isLoading = isOrdersLoading || isTxsLoading || isCustomersLoading;

  const allOrders = Array.isArray(ordersData) ? ordersData : [];
  const allTxs = Array.isArray(txsData) ? txsData : [];
  const allCustomers = Array.isArray(customersData) ? customersData : [];

  const filterByDate = (items: any[]) => {
    return items.filter(item => {
      if (!item.createdAt) return true;
      const date = new Date(item.createdAt);
      const now = new Date();
      
      if (timeRange === 'today') {
        return date.toDateString() === now.toDateString();
      } else if (timeRange === '7days') {
        const past = new Date();
        past.setDate(past.getDate() - 7);
        return date >= past;
      } else if (timeRange === '30days') {
        const past = new Date();
        past.setDate(past.getDate() - 30);
        return date >= past;
      } else if (timeRange === 'year') {
        const past = new Date();
        past.setDate(past.getDate() - 365);
        return date >= past;
      } else if (timeRange === 'custom') {
        if (startDate && endDate) {
          const start = new Date(startDate);
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          return date >= start && date <= end;
        }
      }
      return true; // 'all' or default
    });
  };

  const orders = filterByDate(allOrders);
  const txs = filterByDate(allTxs);
  const customers = filterByDate(allCustomers);

  const totalSales = orders.reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0);
  const totalExpenses = txs.filter((t: any) => t.type === 'Expense').reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
  const pendingOrders = orders.filter((o: any) => o.status !== 'Delivered' && o.status !== 'Cancelled').length;
  const readyOrders = orders.filter((o: any) => o.status === 'Ready').length;
  const avgOrderValue = orders.length > 0 ? Math.round(totalSales / orders.length) : 0;
  
  // Compute chart data dynamically
  const typeCount: Record<string, number> = {};
  orders.forEach((o: any) => {
    o.items?.forEach((i: any) => {
      typeCount[i.garmentType] = (typeCount[i.garmentType] || 0) + i.quantity;
    });
  });
  
  const colors = ['#0A2A66', '#133E87', '#2563EB', '#60A5FA', '#10b981', '#f59e0b'];
  const garmentDistribution = Object.keys(typeCount).map((k, i) => ({
    name: k,
    value: typeCount[k],
    color: colors[i % colors.length]
  }));

  const revenueData = useMemo(() => {
    let dataPoints: any[] = [];
    const now = new Date();
    
    if (chartTimeRange === '6months') {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        dataPoints.push({
          label: `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`,
          match: (date: Date) => date.getMonth() === d.getMonth() && date.getFullYear() === d.getFullYear(),
          revenue: 0, profit: 0, expenses: 0
        });
      }
    } else if (chartTimeRange === '1month') {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        dataPoints.push({
          label: `${d.getDate()} ${monthNames[d.getMonth()]}`,
          match: (date: Date) => date.getDate() === d.getDate() && date.getMonth() === d.getMonth() && date.getFullYear() === d.getFullYear(),
          revenue: 0, profit: 0, expenses: 0
        });
      }
    } else if (chartTimeRange === 'daywise') {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        dataPoints.push({
          label: days[d.getDay()],
          match: (date: Date) => date.getDate() === d.getDate() && date.getMonth() === d.getMonth() && date.getFullYear() === d.getFullYear(),
          revenue: 0, profit: 0, expenses: 0
        });
      }
    }

    orders.forEach((o: any) => {
      if (o.createdAt) {
        const d = new Date(o.createdAt);
        const point = dataPoints.find(p => p.match(d));
        if (point) point.revenue += (o.totalAmount || 0);
      }
    });

    allTxs.forEach((t: any) => {
      if (t.date && t.type === 'Expense') {
        const d = new Date(t.date);
        const point = dataPoints.find(p => p.match(d));
        if (point) point.expenses += (t.amount || 0);
      }
    });

    return dataPoints.map(p => ({
      name: p.label,
      revenue: p.revenue,
      expenses: p.expenses,
      profit: p.revenue - p.expenses
    }));
  }, [orders, allTxs, chartTimeRange]);

  // Yearly Sales Chart
  const yearlyData = useMemo(() => {
    let minYear = new Date().getFullYear();
    orders.forEach((o: any) => {
      if (o.createdAt) {
        const y = new Date(o.createdAt).getFullYear();
        if (y < minYear) minYear = y;
      }
    });

    const years = [];
    for (let y = minYear; y <= new Date().getFullYear(); y++) {
      years.push(y);
    }
    
    const data = years.map(y => ({ year: y.toString(), sales: 0 }));
    
    orders.forEach((o: any) => {
      if (o.createdAt) {
        const d = new Date(o.createdAt);
        const point = data.find(p => p.year === d.getFullYear().toString());
        if (point) point.sales += (o.totalAmount || 0);
      }
    });
    return data;
  }, [orders]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full w-full min-h-[400px] animate-in fade-in">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Activity className="h-8 w-8 animate-pulse text-primary" />
          <p className="text-sm font-medium">Loading</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8 animate-in fade-in duration-500">
      {/* Header & Controls */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between print:hidden">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Executive Dashboard</h1>
          <p className="text-muted-foreground mt-1">Real-time business intelligence and performance metrics.</p>
        </div>
        <div className="flex flex-col lg:items-end gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-muted/50 rounded-lg p-1 border">
              <button onClick={() => { setTimeRange('today'); setShowCustomDate(false); }} className={cn("px-3 py-1.5 text-xs font-medium rounded-md", timeRange === 'today' ? "bg-background shadow-sm border" : "text-muted-foreground hover:text-foreground")}>Today</button>
              <button onClick={() => { setTimeRange('7days'); setShowCustomDate(false); }} className={cn("px-3 py-1.5 text-xs font-medium rounded-md", timeRange === '7days' ? "bg-background shadow-sm border" : "text-muted-foreground hover:text-foreground")}>7 Days</button>
              <button onClick={() => { setTimeRange('30days'); setShowCustomDate(false); }} className={cn("px-3 py-1.5 text-xs font-medium rounded-md", timeRange === '30days' ? "bg-background shadow-sm border" : "text-muted-foreground hover:text-foreground")}>30 Days</button>
              <button onClick={() => { setTimeRange('year'); setShowCustomDate(false); }} className={cn("px-3 py-1.5 text-xs font-medium rounded-md", timeRange === 'year' ? "bg-background shadow-sm border" : "text-muted-foreground hover:text-foreground")}>Year</button>
              <button onClick={() => { setTimeRange('all'); setShowCustomDate(false); }} className={cn("px-3 py-1.5 text-xs font-medium rounded-md", timeRange === 'all' ? "bg-background shadow-sm border" : "text-muted-foreground hover:text-foreground")}>All Time</button>
            </div>
            
            <button 
              onClick={() => { setShowCustomDate(!showCustomDate); setTimeRange(showCustomDate ? '30days' : 'custom'); }}
              className={cn("inline-flex items-center justify-center rounded-lg text-xs font-medium border h-8 px-3 transition-colors", showCustomDate || timeRange === 'custom' ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted")}
            >
              <Calendar className="mr-2 h-3.5 w-3.5" /> Custom Dates
            </button>
            <button onClick={async () => {
                try {
                  const captureChart = async (id: string) => {
                    const el = document.getElementById(id);
                    if (!el) return null;
                    const canvas = await html2canvas(el, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' });
                    return canvas.toDataURL('image/png');
                  };
                  
                  // Temporarily disable buttons for capturing
                  document.body.style.cursor = 'wait';
                  const revenueImg = await captureChart('chart-revenue');
                  const salesImg = await captureChart('chart-sales');
                  const categoryImg = await captureChart('chart-category');
                  
                  await generateDashboardPDF(orders, txs, totalSales, totalSales - totalExpenses, {
                    revenue: revenueImg,
                    sales: salesImg,
                    category: categoryImg
                  });
                } catch(err) {
                  alert("PDF export failed. Ensure jspdf and html2canvas are installed.");
                } finally {
                  document.body.style.cursor = 'default';
                }
              }} className="inline-flex items-center justify-center rounded-lg text-xs font-medium border bg-background hover:bg-muted h-8 px-3 transition-colors">
              <Download className="mr-2 h-3.5 w-3.5" /> Export PDF
            </button>
            <button onClick={() => setShowScanner(true)} className="inline-flex items-center justify-center rounded-lg text-xs font-medium border bg-indigo-600 text-white hover:bg-indigo-700 h-8 px-3 transition-colors shadow-sm">
              📷 Scan Fabric
            </button>
          </div>
          
          {showCustomDate && (
            <div className="flex items-center gap-2 animate-in slide-in-from-top-2 mt-2">
              <input 
                type={startDate ? "date" : "text"}
                onFocus={(e) => (e.target.type = "date")}
                onBlur={(e) => { if (!e.target.value) e.target.type = "text"; }}
                placeholder="dd-mm-yyyy"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-xs rounded border border-input bg-background px-2 py-1.5 w-32"
              />
              <span className="text-muted-foreground text-xs">to</span>
              <input 
                type={endDate ? "date" : "text"}
                onFocus={(e) => (e.target.type = "date")}
                onBlur={(e) => { if (!e.target.value) e.target.type = "text"; }}
                placeholder="dd-mm-yyyy"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-xs rounded border border-input bg-background px-2 py-1.5 w-32"
              />
            </div>
          )}
        </div>
      </div>
      
      {showScanner && (
        <Scanner 
          onClose={() => setShowScanner(false)} 
          onScan={async (barcode) => {
            try {
              const res = await scanBarcode({ barcode, device: 'Browser', browser: 'Chrome/Web' });
              setScannedFabric(res);
              setShowScanner(false);
            } catch (err: any) {
              alert(err?.response?.data?.message || 'Fabric not found');
            }
          }} 
        />
      )}
      
      {scannedFabric && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-card w-full max-w-3xl rounded-xl shadow-xl border overflow-hidden relative my-auto">
             <div className="flex justify-between items-start mb-4 border-b p-6 bg-muted/20">
                <h2 className="text-xl font-bold flex items-center gap-2"><Package className="h-5 w-5"/> Fabric Details: {scannedFabric.fabricId}</h2>
                <button onClick={() => setScannedFabric(null)} className="p-2 hover:bg-muted rounded-md"><X className="h-5 w-5"/></button>
             </div>
             
             <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="col-span-1 border rounded-lg p-2 bg-muted/10 flex items-center justify-center min-h-[200px]">
                  {scannedFabric.imageUrl ? (
                    <img src={scannedFabric.imageUrl} alt={scannedFabric.name} className="w-full h-full object-cover rounded-md" />
                  ) : (
                    <div className="text-muted-foreground flex flex-col items-center">
                      <Package className="h-12 w-12 mb-2 opacity-50" />
                      No Image Available
                    </div>
                  )}
                </div>
                
                <div className="col-span-1 md:col-span-2 space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="text-muted-foreground block text-xs uppercase tracking-wider">Fabric Name</span> <span className="font-medium text-base">{scannedFabric.name || 'N/A'}</span></div>
                    <div><span className="text-muted-foreground block text-xs uppercase tracking-wider">Status</span> <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold", scannedFabric.status === 'In Stock' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800')}>{scannedFabric.status || 'Unknown'}</span></div>
                    
                    <div><span className="text-muted-foreground block text-xs uppercase tracking-wider">Category</span> {scannedFabric.category || 'N/A'}</div>
                    <div><span className="text-muted-foreground block text-xs uppercase tracking-wider">Brand</span> {scannedFabric.brand || 'N/A'}</div>
                    
                    <div><span className="text-muted-foreground block text-xs uppercase tracking-wider">Supplier</span> {scannedFabric.supplierId ? (scannedFabric.supplierId.name || scannedFabric.supplierId) : 'N/A'}</div>
                    <div><span className="text-muted-foreground block text-xs uppercase tracking-wider">Location</span> Rack {scannedFabric.location?.rack || '-'}, Shelf {scannedFabric.location?.shelf || '-'}, {scannedFabric.location?.warehouse || 'Main'}</div>
                    
                    <div><span className="text-muted-foreground block text-xs uppercase tracking-wider">Purchase Price</span> ₹{scannedFabric.purchasePrice || scannedFabric.purchasePricePerMeter || scannedFabric.pricePerMeter || 0}/m</div>
                    <div><span className="text-muted-foreground block text-xs uppercase tracking-wider">Selling Price</span> ₹{scannedFabric.sellingPrice || scannedFabric.sellingPricePerMeter || scannedFabric.pricePerMeter || scannedFabric.purchasePrice || 0}/m</div>
                  </div>
                  
                  <div className="border-t pt-4 grid grid-cols-3 gap-4 mt-2">
                     <div className="bg-primary/5 p-3 rounded-lg border border-primary/10">
                        <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider mb-1">Total Stock</span>
                        <span className="text-xl font-bold">{scannedFabric.totalAvailable || 0} m</span>
                     </div>
                     <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                        <span className="text-amber-800 block text-[10px] uppercase font-bold tracking-wider mb-1">Reserved Stock</span>
                        <span className="text-xl font-bold text-amber-900">{scannedFabric.reservedStock || 0} m</span>
                     </div>
                     <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                        <span className="text-emerald-800 block text-[10px] uppercase font-bold tracking-wider mb-1">Available Stock</span>
                        <span className="text-xl font-bold text-emerald-900">{Math.max(0, (scannedFabric.totalAvailable || 0) - (scannedFabric.reservedStock || 0))} m</span>
                     </div>
                  </div>
                </div>
             </div>
             
             <div className="p-4 bg-muted/10 border-t flex justify-end">
                <button onClick={() => setScannedFabric(null)} className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 text-sm font-medium transition-colors">Close</button>
             </div>
          </div>
        </div>
      )}
      {/* KPI Grid - Massive Array */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4 xl:grid-cols-4">
        <KPICard title="Total Sales" value={`₹${totalSales.toLocaleString()}`} change="" trend="up" icon={DollarSign} color="primary" />
        <KPICard title="Total Orders" value={orders.length} change="" trend="up" icon={ShoppingBag} color="primary" />
        <KPICard title="Avg Order Value" value={`₹${avgOrderValue.toLocaleString()}`} change="" trend="up" icon={CreditCard} color="primary" />
        <KPICard title="Customers" value={customers.length} change="" trend="up" icon={Users} color="primary" />
      </div>

      <div className="grid gap-6 md:grid-cols-12">
        {/* Main Revenue Chart */}
        <div id="chart-revenue" className="rounded-xl border bg-card p-6 shadow-sm md:col-span-8 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold tracking-tight text-lg">Revenue vs Profit Trend</h3>
              <p className="text-xs text-muted-foreground mt-1">Financial performance over time.</p>
            </div>
            <select 
              value={chartTimeRange} 
              onChange={(e) => setChartTimeRange(e.target.value)}
              className="text-sm font-medium border rounded-md px-2 py-1 bg-background text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="6months">Last 6 Months</option>
              <option value="1month">Last Month</option>
              <option value="daywise">Day Wise (Last 7 Days)</option>
            </select>
          </div>
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(val) => `₹${val / 1000}k`} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                  formatter={(value: number) => `₹${value.toLocaleString()}`}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                <Area type="monotone" name="Revenue" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={3} fill="url(#colorRevenue)" />
                <Area type="monotone" name="Net Profit" dataKey="profit" stroke="#10b981" strokeWidth={3} fill="url(#colorProfit)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Yearly Sales Chart */}
        <div id="chart-sales" className="rounded-xl border bg-card p-6 shadow-sm md:col-span-4 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold tracking-tight text-lg">Yearly Sales</h3>
              <p className="text-xs text-muted-foreground mt-1">Total revenue by year.</p>
            </div>
          </div>
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={yearlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(val) => `₹${val / 1000}k`} />
                <RechartsTooltip 
                  cursor={{ fill: 'hsl(var(--muted))' }}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                  formatter={(value: number) => `₹${value.toLocaleString()}`}
                />
                <Bar dataKey="sales" name="Sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tertiary Row */}
      <div className="grid gap-6 md:grid-cols-12">

        {/* Garment Category Distribution */}
        <div id="chart-category" className="rounded-xl border bg-card p-6 shadow-sm md:col-span-6 flex flex-col">
          <h3 className="font-semibold tracking-tight text-lg mb-1">Sales by Category</h3>
          <p className="text-xs text-muted-foreground mb-4">Total garments stitched YTD.</p>
          <div className="flex-1 min-h-[220px] flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={garmentDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                  {garmentDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={{ borderRadius: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4">
            {garmentDistribution.map((cat) => (
              <div key={cat.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                <span className="text-xs font-medium">{cat.name} <span className="text-muted-foreground ml-1">({cat.value})</span></span>
              </div>
            ))}
          </div>
        </div>

        

      </div>
    </div>
  );
}
