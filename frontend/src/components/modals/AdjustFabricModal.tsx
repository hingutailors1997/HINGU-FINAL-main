import React, { useState } from 'react';
import { adjustFabric } from '../../lib/api';
import { AlertCircle, Sliders, X } from 'lucide-react';

interface AdjustFabricModalProps {
  fabric: any;
  onClose: () => void;
  onSuccess: () => void;
}

const AdjustFabricModal: React.FC<AdjustFabricModalProps> = ({ fabric, onClose, onSuccess }) => {
  const [qtyChange, setQtyChange] = useState('');
  const [reason, setReason] = useState('Manual Stock Reconciliation');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(qtyChange);
    
    if (isNaN(qty) || qty === 0) {
      setError("Please enter a non-zero quantity change (+ or -)");
      return;
    }

    if (fabric.totalAvailable + qty < 0) {
      setError(`Adjustment cannot reduce available stock below 0 (Current: ${fabric.totalAvailable} M)`);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      await adjustFabric(fabric.fabricId || fabric._id, {
        qtyChange: qty,
        reason,
        deviceUsed: 'Web ERP Client'
      });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to adjust stock');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-md overflow-hidden border">
        <div className="flex items-center justify-between p-4 border-b bg-muted/30">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-600" /> Adjust Stock Quantity
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-md transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 text-rose-600 rounded-lg text-sm flex items-start gap-2 border border-rose-200">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-lg text-xs text-indigo-950">
            Current Available Stock: <strong>{fabric.totalAvailable} meters</strong>.<br />
            Use positive numbers (e.g. 10) to add newly received rolls, or negative numbers (e.g. -5) to record audit loss or damage.
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Quantity Change <span className="text-rose-500">*</span></label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                required
                value={qtyChange}
                onChange={(e) => setQtyChange(e.target.value)}
                className="w-full border rounded-lg p-2.5 pr-12 focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="e.g. 15 or -3.5"
              />
              <span className="absolute right-3 top-2.5 text-muted-foreground font-medium">M</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Reason / Note <span className="text-rose-500">*</span></label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none bg-background"
              placeholder="e.g. Audit correction, supplementary shipment"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-indigo-600 text-white font-medium rounded-lg text-sm hover:bg-indigo-700 shadow-sm transition-all disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Apply Adjustment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdjustFabricModal;
