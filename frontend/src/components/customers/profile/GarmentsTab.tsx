import React from 'react';
import { Layers, Scissors, CheckCircle2, Clock, Plus, Shield, ArrowRight } from 'lucide-react';

interface Props {
  customerId: string;
  customer?: any;
  onNavigateTab?: (tab: string) => void;
}

export default function GarmentsTab({ customerId, customer, onNavigateTab }: Props) {
  // Garment-wise immutable version history per V3 Master Prompt Phase 7 specification
  const garmentHistories = [
    {
      garment: 'Shirt',
      activeVersion: 'v3',
      totalVersions: 3,
      lastUpdated: '18 Jun 2025',
      versions: [
        { ver: 'v3 (Active)', date: '18 Jun 2025', reason: 'Sleeve cuff shortened -0.5" for watch clearance after trial.', status: 'Production Active' },
        { ver: 'v2 (Archive)', date: '14 Jan 2025', reason: 'Waist expanded +0.5" during annual post-holiday fitting.', status: 'Archived Snapshot' },
        { ver: 'v1 (Archive)', date: '12 Aug 2024', reason: 'Initial onboarding bespoke Master Pattern drafted.', status: 'Archived Snapshot' }
      ]
    },
    {
      garment: 'Pant',
      activeVersion: 'v2',
      totalVersions: 2,
      lastUpdated: '05 May 2025',
      versions: [
        { ver: 'v2 (Active)', date: '05 May 2025', reason: 'Inseam lengthened +0.25" for formal Oxford shoe break.', status: 'Production Active' },
        { ver: 'v1 (Archive)', date: '12 Aug 2024', reason: 'Original trouser pattern recorded.', status: 'Archived Snapshot' }
      ]
    },
    {
      garment: 'Sherwani',
      activeVersion: 'v1',
      totalVersions: 1,
      lastUpdated: '12 Jul 2025',
      versions: [
        { ver: 'v1 (Active)', date: '12 Jul 2025', reason: 'Royal wedding ceremonial Sherwani drafting.', status: 'Production Active' }
      ]
    },
    {
      garment: 'Coat',
      activeVersion: 'v1',
      totalVersions: 1,
      lastUpdated: '19 Nov 2024',
      versions: [
        { ver: 'v1 (Active)', date: '19 Nov 2024', reason: 'Two-button bespoke lounge coat drafted.', status: 'Production Active' }
      ]
    },
    {
      garment: 'Kurta',
      activeVersion: 'v1',
      totalVersions: 1,
      lastUpdated: '04 Oct 2024',
      versions: [
        { ver: 'v1 (Active)', date: '04 Oct 2024', reason: 'Festive silk kurta specification.', status: 'Production Active' }
      ]
    }
  ];

  return (
    <div className="bg-white rounded-[22px] border border-[#E5E7EB] p-6 sm:p-8 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-[#2563EB] font-black text-[11px] uppercase tracking-wider mb-1.5">
            <Layers className="h-3.5 w-3.5" />
            <span>Garment-Wise Version Controlled Vault</span>
          </div>
          <h3 className="text-xl font-black text-slate-900 tracking-tight">Customer Garment Repository (5 Garment Classes)</h3>
          <p className="text-xs text-slate-500 font-bold mt-0.5">
            Each garment retains an independent version history. Old versions remain permanently; nothing gets overwritten.
          </p>
        </div>
        <button 
          onClick={() => onNavigateTab && onNavigateTab('measurements')}
          className="px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-black text-xs flex items-center gap-2 shadow-md transition-all transform hover:-translate-y-0.5"
        >
          <Scissors className="h-4 w-4 stroke-[2.5]" /> Open Measurement Studio
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {garmentHistories.map((g, idx) => (
          <div key={idx} className="p-6 rounded-[20px] bg-slate-50/70 border border-slate-200 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[#2563EB] text-white font-black flex items-center justify-center text-sm shadow-sm">
                  {g.garment.charAt(0)}
                </div>
                <div>
                  <h4 className="text-lg font-black text-slate-900 tracking-tight">{g.garment}</h4>
                  <span className="text-xs font-bold text-slate-500">Last updated: {g.lastUpdated}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-blue-100 text-[#2563EB] font-black text-xs">
                  Active Spec: {g.activeVersion}
                </span>
                <button 
                  onClick={() => onNavigateTab && onNavigateTab('measurements')}
                  className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-blue-400 text-slate-800 font-extrabold text-xs transition-colors flex items-center gap-1 shadow-2xs"
                >
                  <span>Modify & Draft v{g.totalVersions + 1}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-[#2563EB]" />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Immutable Version Log ({g.totalVersions} Snapshot{g.totalVersions > 1 ? 's' : ''})</span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {g.versions.map((v, vIdx) => (
                  <div key={vIdx} className="p-3.5 rounded-xl bg-white border border-slate-200/80 flex flex-col justify-between shadow-2xs space-y-2">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono font-black text-xs text-[#2563EB]">{v.ver}</span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded ${v.ver.includes('Active') ? 'bg-emerald-100 text-[#22C55E]' : 'bg-slate-100 text-slate-500'}`}>
                          {v.ver.includes('Active') ? 'Active' : 'Archived'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 font-bold leading-relaxed">{v.reason}</p>
                    </div>
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-extrabold">
                      <span>Recorded on {v.date}</span>
                      <button onClick={() => onNavigateTab && onNavigateTab('measurements')} className="text-[#2563EB] font-black hover:underline">Inspect</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
