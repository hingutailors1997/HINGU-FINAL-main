import React from 'react';
import { Download, Scissors, CreditCard, Clock, ShieldCheck, Printer, FileSpreadsheet } from 'lucide-react';
import { useToast } from '../../Toast';

interface Props {
  customerId: string;
  customer?: any;
}

export default function ReportsTab({ customerId, customer }: Props) {
  const { showToast } = useToast();

  return (
    <div className="bg-white rounded-[22px] border border-[#E5E7EB] p-6 sm:p-8 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-[#2563EB] font-black text-[11px] uppercase tracking-wider mb-1.5">
            <Download className="h-3.5 w-3.5" />
            <span>Enterprise Data Exports</span>
          </div>
          <h3 className="text-xl font-black text-slate-900 tracking-tight">Customer 360° Reports & Portability (4 Exports)</h3>
          <p className="text-xs text-slate-500 font-bold mt-0.5">
            Generate compiled technical specifications, financial audit trails, and data portability dumps for this client.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        <div className="p-6 rounded-[20px] border border-slate-200 bg-gradient-to-br from-blue-50/40 to-white hover:border-blue-300 transition-all space-y-4 shadow-2xs">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3.5">
              <div className="h-12 w-12 rounded-2xl bg-blue-100 text-[#2563EB] flex items-center justify-center font-black shadow-sm">
                <Scissors className="h-6 w-6 stroke-[2.2]" />
              </div>
              <div>
                <h4 className="font-black text-base text-slate-900">Master Measurement Book</h4>
                <span className="text-xs text-slate-500 font-bold">5 Garments • All Active & Historical Snapshots</span>
              </div>
            </div>
          </div>
          <p className="text-xs font-semibold text-slate-600 leading-relaxed">
            Exports a comprehensive PDF containing anatomical dimensions, posture remarks, and cutting master notes for all 5 registered garments under this customer ID.
          </p>
          <div className="pt-3 flex items-center justify-between border-t border-slate-100">
            <span className="text-[10px] font-mono font-black text-slate-400">FORMAT: PDF MASTER BOOK</span>
            <button onClick={() => { showToast('Compiling master measurement book...', 'success'); window.print(); }} className="px-4 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-black hover:bg-blue-700 transition-colors shadow-sm">
              Download PDF Book
            </button>
          </div>
        </div>

        <div className="p-6 rounded-[20px] border border-slate-200 bg-gradient-to-br from-emerald-50/40 to-white hover:border-emerald-300 transition-all space-y-4 shadow-2xs">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3.5">
              <div className="h-12 w-12 rounded-2xl bg-emerald-100 text-[#22C55E] flex items-center justify-center font-black shadow-sm">
                <CreditCard className="h-6 w-6 stroke-[2.2]" />
              </div>
              <div>
                <h4 className="font-black text-base text-slate-900">Tax & Revenue Ledger Statement</h4>
                <span className="text-xs text-slate-500 font-bold">Reconciled GST billing since registration</span>
              </div>
            </div>
          </div>
          <p className="text-xs font-semibold text-slate-600 leading-relaxed">
            Generates a formal financial ledger statement detailing all 22 invoices, HSN itemizations, UPI/card payment transactions, and zero outstanding balance confirmation.
          </p>
          <div className="pt-3 flex items-center justify-between border-t border-slate-100">
            <span className="text-[10px] font-mono font-black text-slate-400">FORMAT: EXCEL CSV / PDF</span>
            <button onClick={() => showToast('Financial tax accounting ledger exported!', 'success')} className="px-4 py-2 rounded-xl bg-[#22C55E] text-white text-xs font-black hover:bg-emerald-700 transition-colors shadow-sm">
              Export CSV / Excel
            </button>
          </div>
        </div>

        <div className="p-6 rounded-[20px] border border-slate-200 bg-gradient-to-br from-purple-50/40 to-white hover:border-purple-300 transition-all space-y-4 shadow-2xs">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3.5">
              <div className="h-12 w-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center font-black shadow-sm">
                <Clock className="h-6 w-6 stroke-[2.2]" />
              </div>
              <div>
                <h4 className="font-black text-base text-slate-900">Alterations & Fitting Trend Report</h4>
                <span className="text-xs text-slate-500 font-bold">3 alteration logs and pattern adjustments</span>
              </div>
            </div>
          </div>
          <p className="text-xs font-semibold text-slate-600 leading-relaxed">
            Summarizes posture deviations over time (e.g. watch cuff clearances, waist expansions) to guide pattern masters during future cloth cutting and draping sessions.
          </p>
          <div className="pt-3 flex items-center justify-between border-t border-slate-100">
            <span className="text-[10px] font-mono font-black text-slate-400">FORMAT: PDF TREND ANALYSIS</span>
            <button onClick={() => showToast('Alterations trend analysis report generated!', 'success')} className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-black hover:bg-purple-700 transition-colors shadow-sm">
              Generate Report
            </button>
          </div>
        </div>

        <div className="p-6 rounded-[20px] border border-slate-200 bg-gradient-to-br from-indigo-50/40 to-white hover:border-indigo-300 transition-all space-y-4 shadow-2xs">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3.5">
              <div className="h-12 w-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-black shadow-sm">
                <ShieldCheck className="h-6 w-6 stroke-[2.2]" />
              </div>
              <div>
                <h4 className="font-black text-base text-slate-900">GDPR & CRM Portability Dossier</h4>
                <span className="text-xs text-slate-500 font-bold">Complete JSON dump for data portability</span>
              </div>
            </div>
          </div>
          <p className="text-xs font-semibold text-slate-600 leading-relaxed">
            Exports the entire customer database record—including contact coordinates, order references, fabric selections, and gallery attachments—in standard JSON format.
          </p>
          <div className="pt-3 flex items-center justify-between border-t border-slate-100">
            <span className="text-[10px] font-mono font-black text-slate-400">FORMAT: JSON DUMP</span>
            <button onClick={() => showToast('Full JSON dossier downloaded!', 'success')} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-black hover:bg-indigo-700 transition-colors shadow-sm">
              Download JSON
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
