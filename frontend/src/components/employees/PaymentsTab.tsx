import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CreditCard, Calendar, Check, AlertCircle, Clock, Plus, ChevronLeft, ChevronRight, UserCog, DollarSign, ShieldAlert, FileText } from 'lucide-react';
import { fetchEmployees, fetchAllWorkLogs, fetchAllPayments, recordPiecePayment, fetchEmployeeById } from '../../lib/api';
import { useToast } from '../Toast';

interface PaymentsTabProps {
  initialEmployeeId?: string;
  isFixedEmployee?: boolean;
}

export default function PaymentsTab({ initialEmployeeId = '', isFixedEmployee = false }: PaymentsTabProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [selectedEmpId, setSelectedEmpId] = useState<string>(initialEmployeeId);
  const [cycleType, setCycleType] = useState<'Weekly' | 'Bi-Weekly' | 'Monthly'>('Weekly');
  const [cycleOffset, setCycleOffset] = useState<number>(0); // 0 = current period, -1 = previous, +1 = next

  const [showModal, setShowModal] = useState(false);
  const [paymentData, setPaymentData] = useState({
    paymentAmount: 0,
    paymentMethod: 'Cash',
    referenceNumber: '',
    notes: ''
  });

  // Fetch all employees if not fixed, or just use list
  const { data: employees = [], isLoading: loadingEmployees } = useQuery({
    queryKey: ['employees'],
    queryFn: fetchEmployees
  });

  // Fetch work logs and payments (Single Source of Truth)
  const { data: allLogs = [], isLoading: loadingLogs } = useQuery({
    queryKey: ['allWorkLogs'],
    queryFn: fetchAllWorkLogs
  });

  const { data: allPayments = [], isLoading: loadingPayments } = useQuery({
    queryKey: ['allPayments'],
    queryFn: fetchAllPayments
  });

  const activeEmployees = useMemo(() => {
    return employees.filter((e: any) => e.status === 'Active' || !e.status);
  }, [employees]);

  // Set default selected employee if none selected
  const currentEmpId = useMemo(() => {
    if (isFixedEmployee && initialEmployeeId) return initialEmployeeId;
    if (selectedEmpId) return selectedEmpId;
    if (activeEmployees.length > 0) return activeEmployees[0]._id;
    return '';
  }, [isFixedEmployee, initialEmployeeId, selectedEmpId, activeEmployees]);

  const currentEmployee = useMemo(() => {
    return employees.find((e: any) => e._id === currentEmpId || e.employeeId === currentEmpId) || null;
  }, [employees, currentEmpId]);

  // Calculate Start and End Date for chosen Payment Cycle & Offset
  const { periodStart, periodEnd, periodLabel } = useMemo(() => {
    const now = new Date();
    let start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let end = new Date();

    if (cycleType === 'Weekly') {
      // Default Monday -> Sunday
      const day = start.getDay();
      const diffToMon = start.getDate() - day + (day === 0 ? -6 : 1);
      start = new Date(start.setDate(diffToMon + (cycleOffset * 7)));
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    } else if (cycleType === 'Bi-Weekly') {
      // 14 days Monday -> Sunday
      const day = start.getDay();
      const diffToMon = start.getDate() - day + (day === 0 ? -6 : 1);
      start = new Date(start.setDate(diffToMon + (cycleOffset * 14)));
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setDate(start.getDate() + 13);
      end.setHours(23, 59, 59, 999);
    } else {
      // Monthly
      start = new Date(now.getFullYear(), now.getMonth() + cycleOffset, 1);
      start.setHours(0, 0, 0, 0);
      end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
    }

    const startStr = start.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const endStr = end.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    return {
      periodStart: start,
      periodEnd: end,
      periodLabel: { start: startStr, end: endStr }
    };
  }, [cycleType, cycleOffset]);

  // Filter Work Logs & Payments for current employee in selected period
  const periodWorkLogs = useMemo(() => {
    if (!currentEmpId) return [];
    return allLogs.filter((log: any) => {
      const empMatch = log.employeeId && (log.employeeId === currentEmpId || log.employeeId._id === currentEmpId);
      if (!empMatch) return false;
      const logDate = new Date(log.date);
      return logDate >= periodStart && logDate <= periodEnd;
    });
  }, [allLogs, currentEmpId, periodStart, periodEnd]);

  const periodPayments = useMemo(() => {
    if (!currentEmpId) return [];
    return allPayments.filter((p: any) => {
      const empMatch = p.employeeId && (p.employeeId === currentEmpId || p.employeeId._id === currentEmpId);
      if (!empMatch) return false;
      // Check if payment falls in period or was created for this period
      const pStart = new Date(p.paymentPeriodStart || p.createdAt);
      return (pStart >= periodStart && pStart <= periodEnd) || (new Date(p.createdAt) >= periodStart && new Date(p.createdAt) <= periodEnd);
    });
  }, [allPayments, currentEmpId, periodStart, periodEnd]);

  // All time payment history for this employee
  const employeePayments = useMemo(() => {
    if (!currentEmpId) return [];
    return allPayments
      .filter((p: any) => p.employeeId && (p.employeeId === currentEmpId || p.employeeId._id === currentEmpId))
      .sort((a: any, b: any) => new Date(b.createdAt || b.paymentPeriodStart).getTime() - new Date(a.createdAt || a.paymentPeriodStart).getTime());
  }, [allPayments, currentEmpId]);

  // Auto Calculation of Financials from Daily Work Logs
  const { totalGarments, grossEarnings, alreadyPaid, remainingBalance, paymentStatus } = useMemo(() => {
    let garments = 0;
    let gross = 0;

    periodWorkLogs.forEach((log: any) => {
      const qty = log.quantity !== undefined ? log.quantity : (log.garmentsCompleted || 1);
      const rate = log.rateSnapshot !== undefined ? log.rateSnapshot : (log.baseRatePerPiece || 0);
      const total = log.total !== undefined ? log.total : (log.pieceRateEarned || (qty * rate));
      garments += qty;
      gross += total;
    });

    let paid = 0;
    periodPayments.forEach((p: any) => {
      paid += Number(p.paymentAmount || 0);
    });

    const rem = gross - paid;

    let status = 'No Work';
    if (gross > 0) {
      if (paid === 0) status = 'Unpaid';
      else if (rem > 0) status = 'Partially Paid';
      else if (rem < 0) status = 'Advance Paid';
      else status = 'Paid';
    } else if (paid > 0) {
      status = 'Advance Paid';
    }

    return {
      totalGarments: garments,
      grossEarnings: gross,
      alreadyPaid: paid,
      remainingBalance: rem,
      paymentStatus: status
    };
  }, [periodWorkLogs, periodPayments]);

  // Work Breakdown summary grouped by Garment Name / Product Type
  const workBreakdown = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; rate: number; amount: number }>();
    periodWorkLogs.forEach((log: any) => {
      const product = (log.category && log.garmentName) ? `${log.category} → ${log.garmentName}` : (log.productType || 'General Work');
      const qty = log.quantity !== undefined ? log.quantity : (log.garmentsCompleted || 1);
      const rate = log.rateSnapshot !== undefined ? log.rateSnapshot : (log.baseRatePerPiece || 0);
      const amount = log.total !== undefined ? log.total : (log.pieceRateEarned || (qty * rate));

      if (!map.has(product)) {
        map.set(product, { name: product, qty: 0, rate, amount: 0 });
      }
      const existing = map.get(product)!;
      existing.qty += qty;
      existing.amount += amount;
    });
    return Array.from(map.values());
  }, [periodWorkLogs]);

  // Mutation to record piece-rate payment
  const payMutation = useMutation({
    mutationFn: (payload: any) => recordPiecePayment(currentEmpId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allPayments'] });
      queryClient.invalidateQueries({ queryKey: ['employee'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setShowModal(false);
      toast('Payment transaction recorded successfully in database!', 'success');
    },
    onError: (err: any) => {
      toast(err.response?.data?.message || 'Failed to record payment', 'error');
    }
  });

  const handleOpenModal = () => {
    if (remainingBalance === 0 && grossEarnings === 0) {
      toast('No earnings recorded for this period yet.', 'info');
    }
    setPaymentData({
      paymentAmount: remainingBalance > 0 ? remainingBalance : 0,
      paymentMethod: 'Cash',
      referenceNumber: '',
      notes: `Payment for week: ${periodLabel.start} - ${periodLabel.end}`
    });
    setShowModal(true);
  };

  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentData.paymentAmount <= 0) {
      toast('Payment amount must be greater than ₹0', 'error');
      return;
    }

    payMutation.mutate({
      employeeId: currentEmpId,
      paymentPeriodStart: periodStart,
      paymentPeriodEnd: periodEnd,
      grossAmount: grossEarnings,
      alreadyPaidBefore: alreadyPaid,
      paymentAmount: paymentData.paymentAmount,
      remainingAfterPayment: remainingBalance - paymentData.paymentAmount,
      paymentMethod: paymentData.paymentMethod,
      referenceNumber: paymentData.referenceNumber,
      notes: paymentData.notes,
      payrollCycle: cycleType
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Top Header & Selector Bar */}
      <div className="flex flex-col gap-4 bg-card p-4 rounded-xl border shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-foreground">Piece-Rate Payment Engine</h2>
              <p className="text-xs text-muted-foreground">
                Workshop payments calculated strictly from Daily Work Logs without monthly base salary concepts.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
            {!isFixedEmployee && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground">Employee:</span>
                <select
                  value={currentEmpId}
                  onChange={e => setSelectedEmpId(e.target.value)}
                  className="rounded-md border border-input bg-background px-3 py-1.5 text-sm font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {activeEmployees.map((emp: any) => (
                    <option key={emp._id} value={emp._id}>
                      {emp.firstName} {emp.lastName || ''} ({emp.role})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg border">
              {(['Weekly', 'Bi-Weekly', 'Monthly'] as const).map(cycle => (
                <button
                  key={cycle}
                  type="button"
                  onClick={() => { setCycleType(cycle); setCycleOffset(0); }}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                    cycleType === cycle
                      ? 'bg-background text-primary shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {cycle}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Payment Period Navigator */}
        <div className="flex items-center justify-between pt-3 border-t text-sm font-semibold">
          <button
            onClick={() => setCycleOffset(prev => prev - 1)}
            className="inline-flex items-center text-xs font-bold text-muted-foreground hover:text-foreground transition-colors py-1 px-2.5 rounded hover:bg-muted"
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Previous {cycleType} Period
          </button>
          <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 px-3.5 py-1.5 rounded-lg text-primary">
            <Calendar className="h-4 w-4 shrink-0" />
            <span className="font-extrabold text-foreground">{periodLabel.start}</span>
            <span className="text-muted-foreground font-bold">↓</span>
            <span className="font-extrabold text-foreground">{periodLabel.end}</span>
          </div>
          <button
            onClick={() => setCycleOffset(prev => prev + 1)}
            disabled={cycleOffset >= 0}
            className="inline-flex items-center text-xs font-bold text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors py-1 px-2.5 rounded hover:bg-muted"
          >
            Next {cycleType} Period <ChevronRight className="h-4 w-4 ml-1" />
          </button>
        </div>
      </div>

      {/* TOP PAYMENT SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border bg-card shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Garments Completed</span>
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-foreground">{totalGarments}</span>
            <span className="text-xs text-muted-foreground font-medium">pcs stitched</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border bg-card shadow-sm flex flex-col justify-between border-l-4 border-l-sky-500">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Gross Earnings</span>
            <span className="text-[10px] font-bold bg-sky-500/10 text-sky-600 px-1.5 py-0.5 rounded">Auto from Work Logs</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-foreground">₹{grossEarnings.toLocaleString()}</span>
            <span className="text-xs text-emerald-600 font-bold">Single Source</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border bg-card shadow-sm flex flex-col justify-between border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Already Paid</span>
            <Check className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-emerald-600">₹{alreadyPaid.toLocaleString()}</span>
            <span className="text-xs text-muted-foreground">This period</span>
          </div>
        </div>

        <div className={`p-4 rounded-xl border bg-card shadow-sm flex flex-col justify-between border-l-4 ${remainingBalance < 0 ? 'border-l-blue-500' : 'border-l-amber-500'} relative overflow-hidden`}>
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">{remainingBalance < 0 ? 'Advance' : 'Remaining Balance'}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
              paymentStatus === 'Paid' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' :
              paymentStatus === 'Partially Paid' ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20' :
              paymentStatus === 'Advance Paid' ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20' :
              paymentStatus === 'Unpaid' ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20' :
              'bg-muted text-muted-foreground'
            }`}>
              {paymentStatus}
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className={`text-3xl font-extrabold ${remainingBalance < 0 ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-400'}`}>
              ₹{Math.abs(remainingBalance).toLocaleString()}
            </span>
            <button
              onClick={handleOpenModal}
              disabled={remainingBalance === 0 && grossEarnings === 0}
              className="inline-flex items-center justify-center rounded-md text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-1.5 shadow-sm transition-all disabled:opacity-40"
            >
              Record Payment
            </button>
          </div>
        </div>
      </div>

      {/* WORK BREAKDOWN & PAYMENT HISTORY SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* WORK BREAKDOWN TABLE */}
        <div className="border rounded-xl bg-card shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b bg-muted/20 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-foreground">Work Breakdown</h3>
              <p className="text-[11px] text-muted-foreground">Garments completed during {periodLabel.start} - {periodLabel.end}</p>
            </div>
            <span className="text-xs font-semibold bg-muted px-2.5 py-1 rounded-md">{workBreakdown.length} Garment Types</span>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/40 border-b text-xs font-semibold text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-2.5">Garment</th>
                  <th className="px-4 py-2.5 text-center">Qty</th>
                  <th className="px-4 py-2.5 text-right">Rate</th>
                  <th className="px-4 py-2.5 text-right font-bold text-foreground">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {workBreakdown.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-muted-foreground text-xs">
                      No daily work logs recorded for this employee during the selected week.
                    </td>
                  </tr>
                ) : (
                  <>
                    {workBreakdown.map((item, idx) => (
                      <tr key={idx} className="hover:bg-muted/20">
                        <td className="px-4 py-2.5 font-semibold text-foreground">{item.name}</td>
                        <td className="px-4 py-2.5 text-center font-bold">{item.qty} pc</td>
                        <td className="px-4 py-2.5 text-right text-muted-foreground">₹{item.rate}</td>
                        <td className="px-4 py-2.5 text-right font-extrabold text-foreground">₹{item.amount.toLocaleString()}</td>
                      </tr>
                    ))}
                    <tr className="bg-muted/40 border-t font-extrabold text-foreground">
                      <td className="px-4 py-3">Total Work Period Earnings</td>
                      <td className="px-4 py-3 text-center">{totalGarments} pc</td>
                      <td className="px-4 py-3 text-right">—</td>
                      <td className="px-4 py-3 text-right text-emerald-600 text-base">₹{grossEarnings.toLocaleString()}</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* PAYMENT HISTORY TABLE */}
        <div className="border rounded-xl bg-card shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b bg-muted/20 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-foreground">Payment Transaction History</h3>
              <p className="text-[11px] text-muted-foreground">Verified disbursements & audit log</p>
            </div>
            <button
              onClick={handleOpenModal}
              className="inline-flex items-center text-xs font-semibold bg-secondary text-secondary-foreground hover:bg-secondary/80 px-2.5 py-1 rounded shadow-sm"
            >
              + New Payment
            </button>
          </div>
          <div className="overflow-x-auto flex-1 max-h-[350px]">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/40 border-b text-xs font-semibold text-muted-foreground uppercase sticky top-0 bg-card">
                <tr>
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5 text-right">Amount</th>
                  <th className="px-4 py-2.5">Method</th>
                  <th className="px-4 py-2.5">Reference / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {employeePayments.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-muted-foreground text-xs">
                      No payment transactions recorded for this employee yet.
                    </td>
                  </tr>
                ) : (
                  employeePayments.map((pay: any) => (
                    <tr key={pay._id} className="hover:bg-muted/20">
                      <td className="px-4 py-2.5 font-semibold text-foreground whitespace-nowrap">
                        {new Date(pay.createdAt || pay.paymentDate).toLocaleDateString('en-GB')}
                      </td>
                      <td className="px-4 py-2.5 text-right font-extrabold text-emerald-600 whitespace-nowrap">
                        ₹{Number(pay.paymentAmount || pay.netPayable || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-primary/10 text-primary">
                          {pay.paymentMethod || 'Cash'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-xs truncate" title={pay.notes || pay.referenceNumber}>
                        {pay.referenceNumber ? `[Ref: ${pay.referenceNumber}] ` : ''}{pay.notes || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* RECORD PAYMENT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm overflow-y-auto">
          <div className="flex min-h-full items-start justify-center p-4 sm:p-6">
            <div className="bg-card w-full max-w-md rounded-xl border shadow-lg overflow-hidden animate-in fade-in duration-200 mt-4 mb-4 sm:mt-10 sm:mb-10">
            <div className="p-4 border-b flex items-center justify-between bg-muted/20">
              <div>
                <span className="font-bold text-lg text-foreground block">Record Piece-Rate Payment</span>
                <span className="text-xs text-muted-foreground">
                  {currentEmployee ? `${currentEmployee.firstName} ${currentEmployee.lastName || ''} (${currentEmployee.role})` : 'Workshop Staff'}
                </span>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-primary/10 text-primary uppercase">No Base Salary</span>
            </div>

            <form onSubmit={handleSavePayment} className="p-5 space-y-4">
              {/* Read-only Financial Summary */}
              <div className="p-3.5 rounded-xl border bg-muted/20 space-y-2 text-xs">
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-muted-foreground font-semibold">Payment Period:</span>
                  <span className="font-extrabold text-foreground">{periodLabel.start} ↓ {periodLabel.end} ({cycleType})</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center pt-1">
                  <div>
                    <span className="text-muted-foreground block text-[10px] font-semibold uppercase">Gross Earnings</span>
                    <span className="font-bold text-foreground text-sm">₹{grossEarnings.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] font-semibold uppercase">Already Paid</span>
                    <span className="font-bold text-emerald-600 text-sm">₹{alreadyPaid.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] font-semibold uppercase">{remainingBalance < 0 ? 'Advance' : 'Remaining'}</span>
                    <span className={`font-extrabold text-sm ${remainingBalance < 0 ? 'text-blue-600' : 'text-amber-600'}`}>₹{Math.abs(remainingBalance).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-foreground flex items-center justify-between">
                  <span>Payment Amount (₹) *</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-bold text-emerald-600">₹</span>
                  <input
                    type="number"
                    required
                    min={1}
                    step="any"
                    value={paymentData.paymentAmount || ''}
                    onChange={e => setPaymentData({ ...paymentData, paymentAmount: Number(e.target.value) || 0 })}
                    className={`w-full pl-8 pr-4 py-2 rounded-md border text-lg font-extrabold bg-background focus:outline-none focus:ring-1 border-input text-foreground focus:border-primary focus:ring-primary`}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-foreground">Payment Method *</label>
                <select
                  value={paymentData.paymentMethod}
                  onChange={e => setPaymentData({ ...paymentData, paymentMethod: e.target.value })}
                  className="w-full rounded-md border border-input px-3 py-2 text-sm font-bold bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI / GPay / PhonePe</option>
                  <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-foreground">Reference Number (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g., UPI txn ID, Cheque number, or receipt receipt ref"
                  value={paymentData.referenceNumber}
                  onChange={e => setPaymentData({ ...paymentData, referenceNumber: e.target.value })}
                  className="w-full rounded-md border border-input px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                >
                </input>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-foreground">Notes / Remarks</label>
                <textarea
                  value={paymentData.notes}
                  onChange={e => setPaymentData({ ...paymentData, notes: e.target.value })}
                  className="w-full rounded-md border border-input px-3 py-2 text-sm h-16 bg-background resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Add optional payment context or settlement notes..."
                />
              </div>

              <div className="pt-3 flex gap-2 justify-end border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-semibold hover:bg-muted rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={payMutation.isPending || paymentData.paymentAmount <= 0}
                  className="px-5 py-2 bg-primary text-primary-foreground rounded-md text-sm font-bold shadow-sm hover:bg-primary/90 transition-all disabled:opacity-40"
                >
                  {payMutation.isPending ? 'Saving...' : `Save Payment (₹${paymentData.paymentAmount.toLocaleString()})`}
                </button>
              </div>
            </form>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}
