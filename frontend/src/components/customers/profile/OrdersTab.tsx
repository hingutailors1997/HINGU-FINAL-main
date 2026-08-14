import React from 'react';
import { ShoppingBag, Plus, ExternalLink, Scissors, CheckCircle2, AlertTriangle, ShieldCheck, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchOrders } from '../../../lib/api';

interface Props {
  customerId: string;
  customer?: any;
  onNavigateTab?: (tab: string) => void;
}

export default function OrdersTab({ customerId, customer, onNavigateTab }: Props) {
  const navigate = useNavigate();

  const { data: realOrders = [], isLoading } = useQuery({
    queryKey: ['ordersByCustomer', customerId],
    queryFn: () => fetchOrders({ customerId })
  });

  return (
    <div className="bg-white rounded-[22px] border border-[#E5E7EB] p-6 sm:p-8 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-[#2563EB] font-black text-[11px] uppercase tracking-wider mb-1.5">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Single Source of Truth Architecture</span>
          </div>
          <h3 className="text-xl font-black text-slate-900 tracking-tight">Customer Bespoke Orders ({realOrders.length} Total)</h3>
          <p className="text-xs text-slate-500 font-bold mt-0.5">
            Every order is permanently linked to an exact measurement version ID for zero-redundancy production traceability.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => onNavigateTab && onNavigateTab('measurements')}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs transition-colors"
          >
            Inspect Measurement Versions
          </button>
          <button 
            onClick={() => navigate(`/orders/new?customerId=${customerId}`)}
            className="px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-black text-xs flex items-center gap-2 shadow-md transition-all transform hover:-translate-y-0.5"
          >
            <Plus className="h-4 w-4 stroke-[3]" /> New Order
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center p-8 text-slate-400 font-bold">Loading</div>
        ) : realOrders.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-300 text-center space-y-3">
            <ShoppingBag className="h-8 w-8 text-slate-300 mx-auto" />
            <div className="max-w-md mx-auto">
              <h4 className="font-black text-slate-800 text-sm">No Orders Found</h4>
              <p className="text-xs font-semibold text-slate-500 mt-1">
                This customer doesn't have any bespoke orders yet. Click "New Order" to start their first commission.
              </p>
            </div>
          </div>
        ) : (
          realOrders.map((ord: any, idx: number) => {
            const firstItem = ord.items?.[0] || {};
            const itemGarment = firstItem.garmentType || 'Custom Garment';
            const itemFabric = firstItem.notes || 'No specific fabric noted';
            const itemStyle = `${ord.items?.length || 1} Item(s) in this order`;
            const isDelivered = (ord.currentStage || '').toLowerCase().includes('deliver') || (ord.currentStage || '').toLowerCase().includes('complet');

            return (
              <div 
                key={ord._id || idx}
                onClick={() => navigate(`/orders/${ord._id}`)}
                className="p-6 rounded-[20px] bg-slate-50/70 hover:bg-white border border-slate-200/80 hover:border-blue-300 transition-all shadow-2xs space-y-4 cursor-pointer"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/60 pb-4">
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 rounded-lg bg-white font-mono font-black text-xs text-slate-900 border border-slate-200 shadow-2xs">
                      {ord.orderNumber || 'ORD-UNKNOWN'}
                    </span>
                    <span className="text-xs font-black text-slate-700">{itemGarment}</span>
                    <span className="text-slate-400">•</span>
                    <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> Due: {ord.dueDate ? new Date(ord.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Unscheduled'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wide ${
                      isDelivered ? 'bg-emerald-100 text-[#22C55E]' : 'bg-blue-100 text-[#2563EB]'
                    }`}>
                      {ord.currentStage || 'Order Created'}
                    </span>
                    <span className="text-base font-black text-slate-900">₹ {(ord.totalAmount || 0).toLocaleString()}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Measurement Snapshot</span>
                    <div className="flex items-center gap-1.5 text-[#2563EB] font-mono font-black bg-blue-50/80 p-2 rounded-xl border border-blue-100">
                      <Scissors className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>{firstItem.measurements && Object.keys(firstItem.measurements).length > 0 ? 'Custom Specs Attached' : 'Standard Defaults'}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Selected Fabric & Styling</span>
                    <p className="font-bold text-slate-800 leading-snug truncate">{itemFabric}</p>
                    <p className="text-[11px] text-slate-500 font-medium">{itemStyle}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Payment Status</span>
                    <p className={`font-bold ${ord.balanceAmount <= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {ord.balanceAmount <= 0 ? 'Fully Paid ✓' : `Balance: ₹ ${ord.balanceAmount.toLocaleString()}`}
                    </p>
                    <p className="text-[11px] text-slate-500 font-semibold">Priority: {ord.priority || 'Normal'}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
