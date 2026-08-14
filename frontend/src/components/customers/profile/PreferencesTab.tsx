import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, Save, Scissors } from 'lucide-react';
import { fetchCustomerPreferences, saveCustomerPreferences } from '../../../lib/api';
import { useToast } from '../../../components/Toast';

interface Props {
  customerId: string;
}

export default function PreferencesTab({ customerId }: Props) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  
  const [preferences, setPreferences] = useState({
    shirtFit: 'Regular',
    shirtCollar: 'Classic',
    shirtCuffs: 'Button',
    shirtPocket: 'Yes',
    pantFit: 'Regular',
    pantPleats: 'Flat Front',
    pantCuff: 'No',
    pantPocket: 'Cross',
    suitLapel: 'Notch',
    suitVents: 'Double',
    defaultDeliveryMethod: 'In-Store',
    stitchingPriority: 'Normal',
    generalNotes: ''
  });

  const { data: savedPrefs, isLoading } = useQuery({
    queryKey: ['customerPreferences', customerId],
    queryFn: () => fetchCustomerPreferences(customerId),
  });

  useEffect(() => {
    if (savedPrefs && Object.keys(savedPrefs).length > 0) {
      setPreferences(prev => ({ ...prev, ...savedPrefs }));
    }
  }, [savedPrefs]);

  const saveMutation = useMutation({
    mutationFn: () => saveCustomerPreferences(customerId, preferences),
    onSuccess: () => {
      showToast('Preferences saved successfully!', 'success');
      queryClient.invalidateQueries({ queryKey: ['customerPreferences', customerId] });
      queryClient.invalidateQueries({ queryKey: ['customerTimeline', customerId] });
    },
    onError: () => {
      showToast('Failed to save preferences.', 'error');
    }
  });

  const handleChange = (field: string, value: string) => {
    setPreferences(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return <div className="text-center p-12 text-slate-400 animate-pulse">Loading</div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300">
      
      <div className="flex justify-between items-end">
        <div>
          <h3 className="font-bold text-lg flex items-center gap-2"><Settings className="h-5 w-5 text-primary" /> Tailoring Preferences</h3>
          <p className="text-sm text-slate-500 mt-1">Set defaults for this customer. These will automatically apply to their new orders.</p>
        </div>
        <button 
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="px-6 py-2 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
        >
          <Save className="h-4 w-4" /> {saveMutation.isPending ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        
        {/* Shirt Preferences */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h4 className="font-semibold text-sm uppercase tracking-wider text-slate-500 mb-6 flex items-center gap-2"><Scissors className="h-4 w-4" /> Shirt Defaults</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Fit Type</label>
              <select value={preferences.shirtFit} onChange={(e) => handleChange('shirtFit', e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-primary/20">
                <option>Slim</option><option>Regular</option><option>Loose</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Collar Style</label>
              <select value={preferences.shirtCollar} onChange={(e) => handleChange('shirtCollar', e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-primary/20">
                <option>Classic</option><option>Cut-away</option><option>Mandarin (Chinese)</option><option>Button-down</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Cuffs</label>
                <select value={preferences.shirtCuffs} onChange={(e) => handleChange('shirtCuffs', e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-primary/20">
                  <option>Button</option><option>French (Cufflinks)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Pocket</label>
                <select value={preferences.shirtPocket} onChange={(e) => handleChange('shirtPocket', e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-primary/20">
                  <option>Yes</option><option>No</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Pant Preferences */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h4 className="font-semibold text-sm uppercase tracking-wider text-slate-500 mb-6 flex items-center gap-2"><Scissors className="h-4 w-4" /> Pant Defaults</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Fit Type</label>
              <select value={preferences.pantFit} onChange={(e) => handleChange('pantFit', e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-primary/20">
                <option>Skinny</option><option>Slim</option><option>Regular</option><option>Loose</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Pleats</label>
              <select value={preferences.pantPleats} onChange={(e) => handleChange('pantPleats', e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-primary/20">
                <option>Flat Front</option><option>Single Pleat</option><option>Double Pleat</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Bottom Cuff</label>
                <select value={preferences.pantCuff} onChange={(e) => handleChange('pantCuff', e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-primary/20">
                  <option>No</option><option>Yes (Folded)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Pocket Style</label>
                <select value={preferences.pantPocket} onChange={(e) => handleChange('pantPocket', e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-primary/20">
                  <option>Cross</option><option>Straight</option>
                </select>
              </div>
            </div>
          </div>
        </div>

      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h4 className="font-semibold text-sm uppercase tracking-wider text-slate-500 mb-6 flex items-center gap-2">General Directives</h4>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Default Delivery Method</label>
              <select value={preferences.defaultDeliveryMethod} onChange={(e) => handleChange('defaultDeliveryMethod', e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-primary/20">
                <option>In-Store</option><option>Home Delivery</option><option>Courier</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Stitching Priority</label>
              <select value={preferences.stitchingPriority} onChange={(e) => handleChange('stitchingPriority', e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-primary/20">
                <option>Normal</option><option>Urgent (VIP)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Master Tailor Persistent Notes</label>
            <textarea 
              value={preferences.generalNotes} 
              onChange={(e) => handleChange('generalNotes', e.target.value)} 
              className="w-full h-28 px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-primary/20 resize-none"
              placeholder="E.g., Customer always wears watch on right hand. Add 0.5in to right cuff."
            />
          </div>
        </div>
      </div>

    </div>
  );
}
