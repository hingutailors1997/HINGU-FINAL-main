import React from 'react';
import { FileText, Download, Printer, CheckCircle2, DollarSign } from 'lucide-react';

interface Props {
  customerId: string;
  customer?: any;
}

export default function InvoicesTab({ customerId, customer }: Props) {
  const invoices = [
    { id: 'INV-2025-098', date: '14 May 2025', amount: '₹ 32,500', status: 'Paid in Full', method: 'UPI / Razorpay', ref: 'Order #ORD-2025-884 (Sherwani)' },
    { id: 'INV-2025-072', date: '02 May 2025', amount: '₹ 4,200', status: 'Paid in Full', method: 'Credit Card', ref: 'Order #ORD-2025-612 (Shirt)' },
    { id: 'INV-2025-045', date: '18 Apr 2025', amount: '₹ 3,800', status: 'Paid in Full', method: 'Cash on Pickup', ref: 'Order #ORD-2025-509 (Trouser)' },
    { id: 'INV-2025-019', date: '04 Mar 2025', amount: '₹ 14,500', status: 'Paid in Full', method: 'Net Banking', ref: 'Order #ORD-2025-304 (Blazer)' },
  ];

  return (
    <div className="bg-white rounded-[22px] border border-[#E5E7EB] p-6 sm:p-8 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-[#2563EB] font-black text-[11px] uppercase tracking-wider mb-1.5">
            <FileText className="h-3.5 w-3.5" />
            <span>Customer Financial Dossier</span>
          </div>
          <h3 className="text-xl font-black text-slate-900 tracking-tight">Customer Invoices (22 Records Reconciled)</h3>
          <p className="text-xs text-slate-500 font-bold mt-0.5">
            All billing records and GST fiscal statements associated directly with Customer ID: {customerId ? String(customerId).slice(-6).toUpperCase() : 'MASTER'}.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs flex items-center gap-2 transition-colors">
            <Printer className="h-4 w-4" /> Export Statement
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {invoices.map((inv, idx) => (
          <div key={idx} className="p-5 rounded-[18px] border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs font-bold hover:bg-slate-50/80 transition-colors shadow-2xs">
            <div className="flex flex-wrap items-center gap-4">
              <span className="font-mono font-black text-slate-900 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">{inv.id}</span>
              <span className="text-slate-600 font-extrabold">{inv.date}</span>
              <span className="text-slate-500 font-semibold">• {inv.ref}</span>
              <span className="text-blue-600 font-extrabold bg-blue-50 px-2.5 py-0.5 rounded border border-blue-100">{inv.method}</span>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-4">
              <span className="text-slate-900 font-black text-base">{inv.amount}</span>
              <span className="px-3 py-1 rounded-full bg-emerald-100 text-[#22C55E] font-black uppercase text-[10px] tracking-wide flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 stroke-[3]" /> {inv.status}
              </span>
              <button onClick={() => window.print()} className="text-[#2563EB] font-black hover:underline px-2 py-1">Receipt PDF</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
