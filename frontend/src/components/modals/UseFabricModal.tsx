import React, { useState } from 'react';
import { useFabric } from '../../lib/api';
import { AlertCircle, CheckCircle2, Scissors, X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface UseFabricModalProps {
  fabric: any;
  onClose: () => void;
  onSuccess: () => void;
}

const UseFabricModal: React.FC<UseFabricModalProps> = ({ fabric, onClose, onSuccess }) => {
  const [meters, setMeters] = useState('');
  const [reason, setReason] = useState('Used for Custom Order');
  const [orderNumber, setOrderNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(meters);
    
    if (isNaN(qty) || qty <= 0) {
      setError("Please enter a valid quantity greater than 0");
      return;
    }
    
    if (qty > fabric.totalAvailable) {
      setError(`Quantity cannot exceed available stock (${fabric.totalAvailable} M)`);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      await useFabric(fabric.fabricId, {
        meters: qty,
        reason,
        orderNumber,
        deviceUsed: navigator.userAgent
      });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to deduct stock');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b bg-muted/30">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Scissors className="w-5 h-5 text-indigo-600" /> Use Fabric
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-md transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 text-rose-600 rounded-lg text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Meters to Deduct <span className="text-rose-500">*</span></label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                required
                max={fabric.totalAvailable}
                value={meters}
                onChange={(e) => setMeters(e.target.value)}
                className="w-full border rounded-lg p-2.5 pr-12 focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="0.00"
              />
              <span className="absolute right-3 top-2.5 text-muted-foreground font-medium">M</span>
            </div>
            <div className="flex justify-between items-center text-xs text-muted-foreground mt-1.5">
              <span>Rate: <strong className="text-foreground">₹{fabric.sellingPrice || fabric.pricePerMeter || fabric.purchasePrice || 0}/m</strong></span>
              <span>Total Price: <strong className="text-indigo-600 font-bold">₹{((parseFloat(meters) || 0) * (fabric.sellingPrice || fabric.pricePerMeter || fabric.purchasePrice || 0)).toFixed(2)}</strong></span>
              <span>Available: {fabric.totalAvailable} M</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Reason <span className="text-rose-500">*</span></label>
            <select
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none bg-background"
            >
              <option value="Used for Custom Order">Used for Custom Order</option>
              <option value="Sold Raw Fabric">Sold Raw Fabric</option>
              <option value="Damaged/Wastage">Damaged / Wastage</option>
              <option value="Sample Cut">Sample Cut</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Order Number (Optional)</label>
            <input
              type="text"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="e.g. ORD-2023-001"
            />
          </div>

          <div className="pt-4 border-t flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 font-medium border rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? 'Deducting...' : <><CheckCircle2 className="w-4 h-4" /> Confirm Usage</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UseFabricModal;
