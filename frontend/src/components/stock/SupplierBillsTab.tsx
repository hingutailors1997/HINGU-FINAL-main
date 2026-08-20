import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchSupplierBills, recordBillPayment } from '../../lib/api';
import { useToast } from '../Toast';
import { format, differenceInDays } from 'date-fns';
import { AlertTriangle, CheckCircle, Clock, Banknote, Calendar } from 'lucide-react';
import AddSupplierBillModal from '../modals/AddSupplierBillModal';

export default function SupplierBillsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  
  const { data: bills, isLoading } = useQuery({
    queryKey: ['supplierBills'],
    queryFn: fetchSupplierBills
  });

  const payMutation = useMutation({
    mutationFn: ({ id, amount, method }: any) => recordBillPayment(id, { paymentAmount: amount, paymentMethod: method }),
    onSuccess: () => {
      toast('Payment recorded successfully', 'success');
      queryClient.invalidateQueries({ queryKey: ['supplierBills'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
    onError: (err: any) => {
      toast(err.response?.data?.message || 'Failed to record payment', 'error');
    }
  });

  const handlePay = (bill: any) => {
    const remaining = bill.totalAmount - bill.amountPaid;
    const amountStr = window.prompt(`Enter amount to pay for Bill #${bill.billNumber} (Remaining: ₹${remaining}):`, remaining.toString());
    if (!amountStr) return;
    
    const amount = Number(amountStr);
    if (isNaN(amount) || amount <= 0) {
      toast('Invalid amount', 'error');
      return;
    }
    
    if (amount > remaining) {
      toast('Cannot pay more than remaining amount', 'error');
      return;
    }

    const method = window.prompt('Enter payment method (e.g., Bank Transfer, Cash, UPI):', 'Bank Transfer');
    if (!method) return;

    payMutation.mutate({ id: bill._id, amount, method });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Paid': return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Paid</span>;
      case 'Partial': return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 flex items-center gap-1"><Banknote className="w-3 h-3"/> Partial</span>;
      case 'Overdue': return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Overdue</span>;
      default: return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 flex items-center gap-1"><Clock className="w-3 h-3"/> Unpaid</span>;
    }
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading bills...</div>;

  const totalUnpaid = (bills || []).reduce((sum: number, b: any) => sum + (b.status !== 'Paid' ? (b.totalAmount - b.amountPaid) : 0), 0);
  const overdueCount = (bills || []).filter((b: any) => b.status === 'Overdue').length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Total Outstanding</h3>
          <div className="text-3xl font-bold text-rose-600">₹{totalUnpaid.toLocaleString()}</div>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Overdue Bills</h3>
          <div className="flex items-center gap-2">
            <div className={`text-3xl font-bold ${overdueCount > 0 ? "text-rose-500" : "text-emerald-500"}`}>
              {overdueCount}
            </div>
            <span className="text-sm text-muted-foreground">bills</span>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-sm flex items-center justify-center">
          <button 
            onClick={() => setShowAddModal(true)}
            className="w-full h-full min-h-[100px] flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 transition-colors"
          >
            <Banknote className="h-6 w-6" />
            <span className="font-semibold">Log Supplier Bill</span>
          </button>
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-semibold">
              <tr>
                <th className="px-6 py-4">Bill No</th>
                <th className="px-6 py-4">Supplier</th>
                <th className="px-6 py-4">Bill Date</th>
                <th className="px-6 py-4">Due Date (45 Days)</th>
                <th className="px-6 py-4 text-right">Total</th>
                <th className="px-6 py-4 text-right">Paid</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {bills?.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">
                    No supplier bills recorded yet.
                  </td>
                </tr>
              )}
              {bills?.map((bill: any) => {
                const daysUntilDue = differenceInDays(new Date(bill.dueDate), new Date());
                const isNearingDue = bill.status !== 'Paid' && daysUntilDue <= 7 && daysUntilDue >= 0;
                
                return (
                  <tr key={bill._id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-medium">{bill.billNumber}</td>
                    <td className="px-6 py-4 font-semibold">{bill.supplierId?.name || 'Unknown'}</td>
                    <td className="px-6 py-4 text-muted-foreground"><div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5"/> {format(new Date(bill.billDate), 'dd MMM yyyy')}</div></td>
                    <td className="px-6 py-4">
                      <div className={`flex items-center gap-1.5 font-medium ${bill.status === 'Overdue' ? 'text-rose-600' : isNearingDue ? 'text-amber-600' : ''}`}>
                        <Calendar className="w-3.5 h-3.5"/> 
                        {format(new Date(bill.dueDate), 'dd MMM yyyy')}
                        {isNearingDue && <span className="text-[10px] ml-1 bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">Due in {daysUntilDue}d</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-slate-700">₹{bill.totalAmount?.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right font-medium text-emerald-600">₹{bill.amountPaid?.toLocaleString()}</td>
                    <td className="px-6 py-4">{getStatusBadge(bill.status)}</td>
                    <td className="px-6 py-4 text-center">
                      {bill.status !== 'Paid' && (
                        <button 
                          onClick={() => handlePay(bill)}
                          disabled={payMutation.isPending}
                          className="text-xs font-semibold bg-primary text-primary-foreground px-3 py-1.5 rounded hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                          Record Pay
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && <AddSupplierBillModal onClose={() => setShowAddModal(false)} />}
    </div>
  );
}
