import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, CreditCard, ShoppingBag, Scissors, User, FileText } from 'lucide-react';
import { fetchCustomerTimeline } from '../../../lib/api';

interface Props {
  customerId: string;
}

export default function TimelineTab({ customerId }: Props) {
  const { data: timeline = [], isLoading } = useQuery({
    queryKey: ['customerTimeline', customerId],
    queryFn: () => fetchCustomerTimeline(customerId),
  });

  const getEventIcon = (action: string) => {
    if (action.includes('Payment')) return <CreditCard className="h-3 w-3 text-white" />;
    if (action.includes('Order')) return <ShoppingBag className="h-3 w-3 text-white" />;
    if (action.includes('Measurement')) return <Scissors className="h-3 w-3 text-white" />;
    if (action.includes('Note') || action.includes('Document')) return <FileText className="h-3 w-3 text-white" />;
    return <User className="h-3 w-3 text-white" />;
  };

  const getEventColor = (action: string) => {
    if (action.includes('Payment')) return 'bg-emerald-500';
    if (action.includes('Order')) return 'bg-primary';
    if (action.includes('Measurement')) return 'bg-amber-500';
    if (action.includes('Archive') || action.includes('Delete')) return 'bg-destructive';
    return 'bg-slate-500';
  };

  return (
    <div className="max-w-2xl mx-auto py-8 animate-in fade-in duration-300">
      <h3 className="font-bold text-lg mb-8 flex items-center gap-2"><Activity className="h-5 w-5 text-primary" /> Chronological History</h3>
      
      {isLoading ? (
        <div className="text-center p-12 text-slate-400 animate-pulse">Loading</div>
      ) : timeline.length === 0 ? (
        <div className="text-center p-12 text-slate-400 border border-dashed rounded-xl">No history found for this customer.</div>
      ) : (
        <div className="border-l-2 border-slate-200 ml-4 space-y-8 pl-8 py-2 relative">
          {timeline.map((event: any, index: number) => (
            <div key={event._id || index} className="relative group">
              <div className={`absolute -left-[41px] top-1 h-5 w-5 rounded-full ${getEventColor(event.action)} flex items-center justify-center ring-4 ring-background shadow-sm transition-transform group-hover:scale-110`}>
                {getEventIcon(event.action)}
              </div>
              
              <div className="bg-card border border-slate-200 rounded-lg p-4 shadow-sm group-hover:border-slate-300 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-sm text-slate-800">{event.action}</h4>
                  <span className="text-xs font-semibold text-slate-400">
                    {new Date(event.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">{event.description}</p>
                {event.performedBy && (
                  <p className="text-[10px] text-slate-400 mt-3 font-semibold uppercase tracking-wider">
                    By: {event.performedBy.name || 'System'}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
