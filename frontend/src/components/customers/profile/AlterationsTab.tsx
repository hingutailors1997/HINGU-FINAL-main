import React from 'react';
import { Scissors, AlertTriangle, CheckCircle2, ShieldCheck, ArrowRight, Plus } from 'lucide-react';
import { useToast } from '../../Toast';

interface Props {
  customerId: string;
  customer?: any;
  onNavigateTab?: (tab: string) => void;
}

export default function AlterationsTab({ customerId, customer, onNavigateTab }: Props) {
  const { showToast } = useToast();

  const alterations = [
    {
      id: 'ALT-2025-03',
      date: '18 Jun 2025',
      orderRef: 'Order #ORD-2025-612 (Shirt)',
      issue: 'Left wrist watch cuff felt slightly snug around newly purchased chronograph watch.',
      resolution: 'Widened left sleeve cuffs by +0.35" and shortened inseam sleeve by -0.5".',
      oldVersion: 'Shirt v2',
      newVersion: 'Shirt v3 (Generated automatically without overwriting v2)',
      status: 'Resolved & Verified ✓'
    },
    {
      id: 'ALT-2025-02',
      date: '05 May 2025',
      orderRef: 'Order #ORD-2025-509 (Pant)',
      issue: 'Client requested slight break at bottom Oxford laces.',
      resolution: 'Adjusted outer inseam length by +0.25".',
      oldVersion: 'Pant v1',
      newVersion: 'Pant v2 (Promoted to Active)',
      status: 'Resolved & Verified ✓'
    },
    {
      id: 'ALT-2025-01',
      date: '14 Jan 2025',
      orderRef: 'Order #ORD-2024-912 (Shirt)',
      issue: 'Post-holiday midriff expansion check.',
      resolution: 'Expanded stomach ease allowance from 2.0" to 2.5".',
      oldVersion: 'Shirt v1',
      newVersion: 'Shirt v2',
      status: 'Resolved & Verified ✓'
    }
  ];

  return (
    <div className="bg-white rounded-[22px] border border-[#E5E7EB] p-6 sm:p-8 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 text-purple-600 font-black text-[11px] uppercase tracking-wider mb-1.5">
            <Scissors className="h-3.5 w-3.5" />
            <span>Non-Destructive Alteration Protocol</span>
          </div>
          <h3 className="text-xl font-black text-slate-900 tracking-tight">Bespoke Alteration Logs & Pattern Corrections</h3>
          <p className="text-xs text-slate-500 font-bold mt-0.5">
            Alterations trigger automatic promotion to a new measurement version (e.g. creating Version 4 instead of editing Version 3).
          </p>
        </div>
        <button 
          onClick={() => {
            showToast('Initializing new alteration protocol from current active version...', 'info');
            if (onNavigateTab) onNavigateTab('measurements');
          }}
          className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs flex items-center gap-2 shadow-md transition-all transform hover:-translate-y-0.5"
        >
          <Plus className="h-4 w-4 stroke-[3]" /> Log New Alteration
        </button>
      </div>

      <div className="space-y-4">
        {alterations.map((alt, idx) => (
          <div key={idx} className="p-6 rounded-[20px] bg-slate-50/70 hover:bg-white border border-slate-200/80 hover:border-purple-300 transition-all shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-lg bg-white font-mono font-black text-xs text-slate-900 border border-slate-200 shadow-2xs">
                  {alt.id}
                </span>
                <span className="text-xs font-black text-slate-800">{alt.orderRef}</span>
                <span className="text-slate-400">•</span>
                <span className="text-xs font-semibold text-slate-500">{alt.date}</span>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-100 text-[#22C55E] font-black text-[11px]">
                {alt.status}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div className="space-y-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Client Feedback / Issue</span>
                <p className="font-bold text-slate-800 bg-amber-50/60 p-3 rounded-xl border border-amber-200/60 text-amber-900">
                  {alt.issue}
                </p>
              </div>
              <div className="space-y-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Master Tailor Resolution & Version Upgrade</span>
                <p className="font-bold text-slate-800 bg-emerald-50/60 p-3 rounded-xl border border-emerald-200/60 text-emerald-950">
                  {alt.resolution}
                </p>
                <div className="flex items-center gap-2 pt-1 font-mono font-black text-[11px]">
                  <span className="text-slate-400 line-through">{alt.oldVersion}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-purple-600" />
                  <span className="text-purple-700 bg-purple-100 px-2 py-0.5 rounded border border-purple-200">{alt.newVersion}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
