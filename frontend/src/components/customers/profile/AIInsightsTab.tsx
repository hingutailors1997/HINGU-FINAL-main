import React from 'react';
import { Sparkles, Zap, Scissors, Award, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Props {
  customerId: string;
  customer?: any;
}

export default function AIInsightsTab({ customerId, customer }: Props) {
  const navigate = useNavigate();

  return (
    <div className="bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 text-white rounded-[22px] p-8 shadow-2xl space-y-6 border border-blue-400/30">
      <div className="flex items-center gap-3.5 border-b border-white/10 pb-5">
        <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center font-black shadow-lg">
          <Sparkles className="h-7 w-7 fill-slate-950" />
        </div>
        <div>
          <h3 className="text-xl font-black text-white tracking-tight">Hingu AI Tailoring Intelligence Suite</h3>
          <p className="text-xs text-blue-200 font-bold">Bespoke algorithmic profile analysis based on 14 previous orders and 5 garment specifications.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-[20px] bg-white/10 backdrop-blur-md border border-white/15 space-y-3 shadow-lg">
          <span className="text-amber-300 font-black text-xs uppercase tracking-wider flex items-center gap-1.5">
            <Zap className="h-4 w-4 fill-current" /> Fit & Silhouette Profile
          </span>
          <h4 className="text-lg font-black text-white">Prefers Slim Fit Tailoring</h4>
          <p className="text-xs font-bold text-slate-300 leading-relaxed">
            Customer usually prefers Slim Fit in body and sleeves. However, last Coat was reported slightly tight across shoulder blades in fitting review.
          </p>
          <div className="p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-black flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-300 flex-shrink-0" />
            <span>Recommended: Regular Fit with 1.5" comfort ease in Across Chest.</span>
          </div>
        </div>

        <div className="p-6 rounded-[20px] bg-white/10 backdrop-blur-md border border-white/15 space-y-3 shadow-lg">
          <span className="text-cyan-300 font-black text-xs uppercase tracking-wider flex items-center gap-1.5">
            <Scissors className="h-4 w-4" /> Alteration Trend Analysis
          </span>
          <h4 className="text-lg font-black text-white">Sleeve Cuff Watch Clearance</h4>
          <p className="text-xs font-bold text-slate-300 leading-relaxed">
            Across 3 historical shirt alterations, left sleeve cuff was consistently widened by +0.35" and shortened by -0.5" for wristwatch clearance.
          </p>
          <div className="p-3.5 rounded-xl bg-blue-500/20 border border-blue-400/40 text-blue-200 text-xs font-black flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-blue-300 flex-shrink-0" />
            <span>Auto-applied to active Shirt v3 specification snapshot.</span>
          </div>
        </div>

        <div className="p-6 rounded-[20px] bg-white/10 backdrop-blur-md border border-white/15 space-y-3 shadow-lg">
          <span className="text-pink-300 font-black text-xs uppercase tracking-wider flex items-center gap-1.5">
            <Award className="h-4 w-4" /> Fabric & Styling Preferences
          </span>
          <h4 className="text-lg font-black text-white">Super 130s Wool & Giza Cotton</h4>
          <p className="text-xs font-bold text-slate-300 leading-relaxed">
            78% of orders use Solid Navy and Charcoal palettes. Highly receptive to Raymond Premium Brocade and Italian worsted weaves.
          </p>
          <button onClick={() => navigate('/stock')} className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-md transition-colors">
            View Matching Premium Stock
          </button>
        </div>
      </div>
    </div>
  );
}
