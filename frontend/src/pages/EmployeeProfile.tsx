import { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, UserCog, Calendar, CreditCard, Clock, Check, Plus, AlertCircle, Trash2, DollarSign, Award, TrendingUp } from 'lucide-react';
import { fetchEmployeeById, addWorkLog, deleteEmployee, fetchRateMasters } from '../lib/api';
import { cn } from '../lib/utils';
import { useToast } from '../components/Toast';
import PaymentsTab from '../components/employees/PaymentsTab';

export default function EmployeeProfile() {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'work' | 'salary'>('work');
  
  const { data: allRates = [] } = useQuery({
    queryKey: ['rateMasters'],
    queryFn: fetchRateMasters
  });
  const activeRates = allRates.filter((r: any) => r.status === 'Active');

  // Forms state
  const [showWorkModal, setShowWorkModal] = useState(false);
  const [workData, setWorkData] = useState({ 
    date: new Date().toISOString().split('T')[0], 
    rateMasterId: '',
    category: '',
    garmentName: '',
    variant: '',
    workType: '',
    productType: '',
    quantity: 1, 
    rateSnapshot: 0,
    total: 0,
    details: '', 
    garmentsCompleted: 1, 
    baseRatePerPiece: 0,
    pieceRateEarned: 0 
  });

  const { data, isLoading } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => fetchEmployeeById(id as string),
    enabled: !!id
  });

  const workMutation = useMutation({
    mutationFn: (payload: any) => addWorkLog(id as string, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', id] });
      setShowWorkModal(false);
      toast('Work log added successfully', 'success');
    },
    onError: () => toast('Failed to log work', 'error')
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteEmployee(id as string),
    onSuccess: () => {
      toast('Employee deleted successfully', 'success');
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      navigate('/employees');
    },
    onError: (err: any) => {
      toast(err.response?.data?.message || 'Failed to delete employee', 'error');
    }
  });

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to completely delete this employee?')) {
      deleteMutation.mutate();
    }
  };

  const { employee, workLogs = [], salaries = [], payments = [] } = data || {};

  // Real-time piece rate calculation engine (Zero Base Salary concept)
  const stats = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    const day = now.getDay();
    const diffToMon = now.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), diffToMon, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    
    let lifetimeEarned = 0;
    let todayEarned = 0;
    let todayWorkQty = 0;
    let weekEarned = 0;
    let monthEarned = 0;

    workLogs.forEach((log: any) => {
      const logDate = new Date(log.date);
      const qty = log.quantity !== undefined ? log.quantity : (log.garmentsCompleted || 1);
      const rate = log.rateSnapshot !== undefined ? log.rateSnapshot : (log.baseRatePerPiece || 0);
      const total = log.total !== undefined ? log.total : (log.pieceRateEarned || (qty * rate));
      
      lifetimeEarned += total;
      
      if (logDate.toISOString().split('T')[0] === todayStr) {
        todayEarned += total;
        todayWorkQty += qty;
      }
      if (logDate >= startOfWeek) {
        weekEarned += total;
      }
      if (logDate >= startOfMonth) {
        monthEarned += total;
      }
    });

    let totalPaid = 0;
    let lastPayDate: Date | null = null;
    
    const allPayRecords = [...payments, ...salaries];
    allPayRecords.forEach((p: any) => {
      const amt = Number(p.paymentAmount || p.netPayable || 0);
      totalPaid += amt;
      const pDate = new Date(p.createdAt || p.paymentDate);
      if (!lastPayDate || pDate > lastPayDate) {
        lastPayDate = pDate;
      }
    });

    const outstanding = Math.max(0, lifetimeEarned - totalPaid);

    const joinDate = new Date(employee?.joinDate || Date.now());
    const weeksJoined = Math.max(1, Math.ceil((now.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24 * 7)));
    const avgWeekly = Math.round(lifetimeEarned / weeksJoined);

    return {
      lifetimeEarned,
      totalPaid,
      outstanding,
      todayEarned,
      todayWorkQty,
      weekEarned,
      monthEarned,
      avgWeekly,
      lastPaymentDateStr: lastPayDate ? lastPayDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'None yet'
    };
  }, [workLogs, payments, salaries, employee]);

  if (isLoading) return <div className="p-8 text-center">Loading</div>;
  if (!data?.employee) return <div className="p-8 text-center text-destructive">Employee not found.</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b pb-4">
        <div className="flex flex-wrap items-center gap-4">
          <button onClick={() => navigate('/employees')} className="p-2 hover:bg-muted rounded-full shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3 shrink-0">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20 text-primary">
              <UserCog className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{employee.firstName} {employee.lastName}</h1>
              <p className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                {employee.employeeId} <span className="w-1 h-1 rounded-full bg-border"></span> {employee.role}
              </p>
            </div>
          </div>

          {/* Contact & Joining Details moved beside Employee Name */}
          <div className="flex items-center gap-3 sm:pl-4 sm:border-l border-border/60">
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg border bg-card shadow-2xs">
              <div className="h-7 w-7 rounded bg-muted flex items-center justify-center shrink-0">
                <UserCog className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground leading-tight">{employee.mobile}</p>
                <p className="text-[10px] font-semibold text-muted-foreground">Mobile</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg border bg-card shadow-2xs">
              <div className="h-7 w-7 rounded bg-muted flex items-center justify-center shrink-0">
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground leading-tight">{new Date(employee.joinDate).toLocaleDateString()}</p>
                <p className="text-[10px] font-semibold text-muted-foreground">Joined</p>
              </div>
            </div>
          </div>
        </div>

        <button 
          onClick={handleDelete} 
          disabled={deleteMutation.isPending} 
          className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-destructive bg-destructive/5 text-destructive hover:bg-destructive/10 h-9 px-3.5 transition-colors shrink-0"
        >
          <Trash2 className="mr-2 h-4 w-4" /> Delete Employee
        </button>
      </div>

      {/* Full Width Main Content Area */}
      <div className="space-y-6 w-full">
          {/* Dashboard Widget: Real-time Shop Floor Tracker */}
          <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3 bg-gradient-to-r from-primary/5 via-card to-card">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4" /> Real-time Shop Floor Dashboard Widget
              </span>
              <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">Piece-Rate Only</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
              <div className="p-2 rounded-lg bg-muted/30">
                <span className="text-[11px] font-semibold text-muted-foreground block">Today's Work</span>
                <span className="text-lg font-extrabold text-foreground">{stats.todayWorkQty} pc</span>
              </div>
              <div className="p-2 rounded-lg bg-muted/30">
                <span className="text-[11px] font-semibold text-muted-foreground block">Today's Earnings</span>
                <span className="text-lg font-extrabold text-emerald-600">₹{stats.todayEarned.toLocaleString()}</span>
              </div>
              <div className="p-2 rounded-lg bg-muted/30">
                <span className="text-[11px] font-semibold text-muted-foreground block">Weekly Earnings</span>
                <span className="text-lg font-extrabold text-sky-600">₹{stats.weekEarned.toLocaleString()}</span>
              </div>
              <div className="p-2 rounded-lg bg-amber-500/5 border border-amber-500/20">
                <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 block">Pending Payment</span>
                <span className="text-lg font-extrabold text-amber-600 dark:text-amber-400">₹{stats.outstanding.toLocaleString()}</span>
              </div>
              <div className="p-2 rounded-lg bg-muted/30">
                <span className="text-[11px] font-semibold text-muted-foreground block">Last Payment Date</span>
                <span className="text-sm font-bold text-foreground block mt-1">{stats.lastPaymentDateStr}</span>
              </div>
            </div>
          </div>

          {/* Employee Profile Financials & Lifetime Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3 rounded-xl border bg-card shadow-sm">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase block">Lifetime Earnings</span>
              <span className="text-xl font-extrabold text-foreground mt-1 block">₹{stats.lifetimeEarned.toLocaleString()}</span>
            </div>
            <div className="p-3 rounded-xl border bg-card shadow-sm">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase block">Total Paid</span>
              <span className="text-xl font-extrabold text-emerald-600 mt-1 block">₹{stats.totalPaid.toLocaleString()}</span>
            </div>
            <div className="p-3 rounded-xl border bg-card shadow-sm border-l-4 border-l-rose-500">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase block">Outstanding</span>
              <span className="text-xl font-extrabold text-rose-500 mt-1 block">₹{stats.outstanding.toLocaleString()}</span>
            </div>
            <div className="p-3 rounded-xl border bg-card shadow-sm">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase block">Avg Weekly Earn</span>
              <span className="text-xl font-extrabold text-foreground mt-1 block">₹{stats.avgWeekly.toLocaleString()}</span>
            </div>
            <div className="p-3 rounded-xl border bg-card shadow-sm">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase block">This Month Earn</span>
              <span className="text-xl font-extrabold text-primary mt-1 block">₹{stats.monthEarned.toLocaleString()}</span>
            </div>
          </div>

          <div className="border-b flex gap-6 pt-2">
            <button 
              onClick={() => setActiveTab('work')}
              className={cn("pb-3 text-sm font-semibold border-b-2 transition-colors", activeTab === 'work' ? "border-primary text-foreground" : "border-transparent text-muted-foreground")}
            >
              Daily Work Logs
            </button>
            <button 
              onClick={() => setActiveTab('salary')}
              className={cn("pb-3 text-sm font-semibold border-b-2 transition-colors", activeTab === 'salary' ? "border-primary text-foreground" : "border-transparent text-muted-foreground")}
            >
              Salary & Payments
            </button>
          </div>

          {activeTab === 'work' && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-lg">Work History & Piece Rates</h3>
                <button 
                  onClick={() => {
                    const defaultRate = activeRates.length > 0 ? activeRates[0] : null;
                    const initialQty = 1;
                    const initialRate = defaultRate ? Number(defaultRate.rate) : 0;
                    const initialTotal = initialQty * initialRate;
                    setWorkData({
                      date: new Date().toISOString().split('T')[0],
                      rateMasterId: defaultRate ? defaultRate._id : '',
                      category: defaultRate ? defaultRate.category : '',
                      garmentName: defaultRate ? defaultRate.garmentName : '',
                      variant: defaultRate ? (defaultRate.variant || 'Standard') : 'Standard',
                      workType: defaultRate ? (defaultRate.workType || 'Stitching') : 'Stitching',
                      productType: defaultRate ? `${defaultRate.category} → ${defaultRate.garmentName}` : '',
                      quantity: initialQty,
                      rateSnapshot: initialRate,
                      total: initialTotal,
                      garmentsCompleted: initialQty,
                      baseRatePerPiece: initialRate,
                      pieceRateEarned: initialTotal,
                      details: defaultRate ? `${initialQty}x ${defaultRate.category} → ${defaultRate.garmentName} (${defaultRate.variant || 'Standard'}, ${defaultRate.workType || 'Stitching'})` : ''
                    });
                    setShowWorkModal(true);
                  }}
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 h-9 px-4 shadow-sm"
                >
                  <Plus className="mr-2 h-4 w-4" /> Log Today's Work
                </button>
              </div>
              <div className="border rounded-xl bg-card overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/40 border-b">
                    <tr>
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium">Garment & Work Type</th>
                      <th className="px-4 py-3 font-medium text-center">Qty</th>
                      <th className="px-4 py-3 font-medium text-right">Rate Snapshot (₹)</th>
                      <th className="px-4 py-3 font-medium">Job Notes / Details</th>
                      <th className="px-4 py-3 font-medium text-right">Total Earned (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workLogs.length === 0 ? (
                      <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No work logs recorded yet.</td></tr>
                    ) : workLogs.map((log: any) => {
                      const displayQty = log.quantity !== undefined ? log.quantity : (log.garmentsCompleted || 1);
                      const displayRate = log.rateSnapshot !== undefined ? log.rateSnapshot : (log.baseRatePerPiece || 0);
                      const displayTotal = log.total !== undefined ? log.total : (log.pieceRateEarned || (displayQty * displayRate));
                      const productLabel = (log.category && log.garmentName) ? `${log.category} → ${log.garmentName}` : (log.productType || 'Garment Work');
                      
                      return (
                        <tr key={log._id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3 font-semibold text-foreground whitespace-nowrap">{new Date(log.date).toLocaleDateString()}</td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-foreground">{productLabel}</div>
                            {(log.variant || log.workType) && (
                              <div className="flex items-center gap-1.5 mt-1">
                                {log.variant && <span className="text-[11px] font-medium bg-secondary px-1.5 py-0.5 rounded text-secondary-foreground">{log.variant}</span>}
                                {log.workType && <span className="text-[11px] font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded">{log.workType}</span>}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center justify-center bg-muted font-bold text-foreground px-2.5 py-0.5 rounded-full text-xs">
                              {displayQty} pc
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-muted-foreground">₹{displayRate}</td>
                          <td className="px-4 py-3 text-muted-foreground text-xs max-w-xs truncate" title={log.details}>{log.details || '—'}</td>
                          <td className="px-4 py-3 text-right font-extrabold text-emerald-600">₹{displayTotal}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'salary' && (
            <div className="animate-in fade-in duration-300">
              <PaymentsTab initialEmployeeId={employee._id} isFixedEmployee={true} />
            </div>
          )}
      </div>

      {/* Work Modal */}
      {showWorkModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-lg rounded-xl border shadow-lg flex flex-col max-h-[88vh] overflow-hidden animate-in fade-in duration-200">
            <div className="p-3.5 px-4 border-b flex items-center justify-between bg-muted/20 flex-shrink-0">
              <div>
                <span className="font-bold text-base text-foreground block">Log Daily Work</span>
                <span className="text-[11px] text-muted-foreground">Rate Master is the Single Source of Truth.</span>
              </div>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">Auto-Rate Sync</span>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); workMutation.mutate(workData); }} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-4 space-y-3 overflow-y-auto flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-foreground">Date *</label>
                    <input type="date" required value={workData.date} onChange={e => setWorkData({ ...workData, date: e.target.value })} className="w-full rounded-md border border-input h-9 px-2.5 text-xs bg-background focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-xs font-bold text-foreground">Product Type *</label>
                    <select 
                      required 
                      value={workData.rateMasterId} 
                      onChange={e => {
                        const rateItem = activeRates.find((r: any) => r._id === e.target.value);
                        if (!rateItem) return;
                        const qty = workData.quantity || 1;
                        const rateSnap = Number(rateItem.rate) || 0;
                        const totalVal = qty * rateSnap;
                        setWorkData({
                          ...workData,
                          rateMasterId: rateItem._id,
                          category: rateItem.category,
                          garmentName: rateItem.garmentName,
                          variant: rateItem.variant || 'Standard',
                          workType: rateItem.workType || 'Stitching',
                          productType: `${rateItem.category} → ${rateItem.garmentName}`,
                          rateSnapshot: rateSnap,
                          baseRatePerPiece: rateSnap,
                          total: totalVal,
                          pieceRateEarned: totalVal,
                          details: `${qty}x ${rateItem.category} → ${rateItem.garmentName} (${rateItem.variant || 'Standard'}, ${rateItem.workType || 'Stitching'})`
                        });
                      }} 
                      className="w-full rounded-md border border-input h-9 px-2.5 text-xs bg-background font-semibold text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {activeRates.length === 0 ? (
                        <option value="">No Active Rates Available in Rate Master</option>
                      ) : (
                        <>
                          {!workData.rateMasterId && <option value="">Select Product...</option>}
                          {activeRates.map((r: any) => (
                            <option key={r._id} value={r._id}>
                              {r.category} → {r.garmentName} ({r.variant || 'Standard'}) - ₹{r.rate}
                            </option>
                          ))}
                        </>
                      )}
                    </select>
                  </div>
                </div>

                {workData.rateMasterId ? (
                  <div className="p-2.5 rounded-lg border bg-muted/20 border-border grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                    <div>
                      <span className="text-muted-foreground block font-medium">Category</span>
                      <span className="font-bold text-foreground truncate block">{workData.category || '—'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block font-medium">Garment Name</span>
                      <span className="font-bold text-foreground truncate block">{workData.garmentName || '—'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block font-medium">Variant</span>
                      <span className="font-bold text-foreground truncate block">{workData.variant || 'Standard'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block font-medium">Work Type</span>
                      <span className="font-bold text-primary truncate block">{workData.workType || 'Stitching'}</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-lg border border-dashed text-center text-xs text-muted-foreground">
                    Select a Product Type above to auto-fetch details & piece rate.
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-foreground">Quantity (Pieces) *</label>
                    <input 
                      type="number" 
                      required 
                      min={1} 
                      value={workData.quantity} 
                      onChange={e => {
                        const qty = Math.max(1, Number(e.target.value) || 0);
                        const rateSnap = workData.rateSnapshot || 0;
                        const totalVal = qty * rateSnap;
                        setWorkData({ 
                          ...workData, 
                          quantity: qty, 
                          garmentsCompleted: qty,
                          total: totalVal,
                          pieceRateEarned: totalVal,
                          details: `${qty}x ${workData.category || ''} → ${workData.garmentName || 'Garment'} (${workData.variant || 'Standard'}, ${workData.workType || 'Stitching'})`
                        });
                      }} 
                      className="w-full rounded-md border border-input h-9 px-2.5 text-sm font-extrabold bg-background text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-muted-foreground flex items-center justify-between">
                      <span>Rate Per Piece (₹)</span>
                      <span className="text-[9px] uppercase font-extrabold text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded">Read Only</span>
                    </label>
                    <div className="w-full rounded-md border border-input h-9 bg-muted/50 px-2.5 text-sm font-bold text-muted-foreground cursor-not-allowed flex items-center justify-between" title="Rate is locked to Rate Master single source of truth and cannot be modified by employees">
                      <span>₹{workData.rateSnapshot || 0}</span>
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-foreground block">Total Calculated Amount</span>
                    <span className="text-[11px] text-muted-foreground font-medium">Qty ({workData.quantity}) × Rate (₹{workData.rateSnapshot})</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-extrabold text-emerald-600">₹{workData.total || 0}</span>
                    <span className="text-[9px] text-muted-foreground block font-bold">Immutable Snapshot</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">Optional Job Notes</label>
                  <textarea 
                    value={workData.details} 
                    onChange={e => setWorkData({ ...workData, details: e.target.value })} 
                    className="w-full rounded-md border border-input p-2 text-xs h-12 bg-background resize-none focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" 
                    placeholder="Add optional notes about stitches, fabric, or tailoring instructions..." 
                  />
                </div>
              </div>

              <div className="p-3 px-4 flex gap-2 justify-end border-t bg-card flex-shrink-0">
                <button type="button" onClick={() => setShowWorkModal(false)} className="px-4 py-1.5 text-xs font-bold hover:bg-muted rounded-md transition-colors">Cancel</button>
                <button type="submit" disabled={workMutation.isPending || !workData.rateMasterId} className="px-5 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-bold shadow-sm hover:bg-primary/90 transition-all disabled:opacity-50">Save Daily Work Log</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
