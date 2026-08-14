import React from 'react';
import { CreditCard, CheckCircle2, DollarSign, ArrowUpRight, ShieldCheck } from 'lucide-react';

interface Props {
  customerId: string;
  customer?: any;
}

export default function PaymentsTab({ customerId, customer }: Props) {
  const payments = [
    { id: 'PAY-TXN-9021', date: '14 May 2025', mode: 'Razorpay UPI (GPay)', amount: '₹ 32,500', status: 'Settled to Bank', invoice: 'INV-2025-098' },
    { id: 'PAY-TXN-8843', date: '02 May 2025', mode: 'HDFC Swipe Terminal (POS)', amount: '₹ 4,200', status: 'Settled to Bank', invoice: 'INV-2025-072' },
    { id: 'PAY-TXN-8102', date: '18 Apr 2025', mode: 'Shop Register Cash', amount: '₹ 3,800', status: 'Reconciled', invoice: 'INV-2025-045' },
    { id: 'PAY-TXN-7401', date: '04 Mar 2025', mode: 'NEFT Direct Transfer', amount: '₹ 14,500', status: 'Settled to Bank', invoice: 'INV-2025-019' },
  ];

  return (
    <div className="bg-white rounded-[22px] border border-[#E5E7EB] p-6 sm:p-8 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-[#22C55E] font-black text-[11px] uppercase tracking-wider mb-1.5">
            <CreditCard className="h-3.5 w-3.5 stroke-[2.5]" />
            <span>Reconciled Payment History</span>
          </div>
          <h3 className="text-xl font-black text-slate-900 tracking-tight">Payment Transactions (100% On Time)</h3>
          <p className="text-xs text-slate-500 font-bold mt-0.5">
            Complete verification audit log of digital and physical funds received against customer tailoring invoices.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200">
          <span className="text-xs font-black text-slate-600">Outstanding Due:</span>
          <span className="text-sm font-black text-[#22C55E]">₹ 0 (Zero Balance)</span>
        </div>
      </div>

      <div className="space-y-3">
        {payments.map((p, idx) => (
          <div key={idx} className="p-5 rounded-[18px] border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs font-bold hover:bg-slate-50/80 transition-colors shadow-2xs">
            <div className="flex flex-wrap items-center gap-4">
              <span className="font-mono font-black text-emerald-950 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200">{p.id}</span>
              <span className="text-slate-600 font-extrabold">{p.date}</span>
              <span className="text-slate-700 font-black">{p.mode}</span>
              <span className="text-slate-400">Ref: {p.invoice}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-slate-900 font-black text-base">{p.amount}</span>
              <span className="px-3 py-1 rounded-full bg-emerald-100 text-[#22C55E] font-black uppercase text-[10px] tracking-wide">
                {p.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
