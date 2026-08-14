import React, { useState } from 'react';
import { reserveFabricStock } from '../../lib/api';
import { AlertCircle, Archive, X } from 'lucide-react';

interface ReserveFabricModalProps {
  fabric: any;
  onClose: () => void;
  onSuccess: () => void;
}

const ReserveFabricModal: React.FC<ReserveFabricModalProps> = ({ fabric, onClose, onSuccess }) => {
  const [meters, setMeters] = useState('');
  const [orderId, setOrderId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableUnreserved = Number((fabric.totalAvailable - (fabric.reservedStock || 0)).toFixed(2));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(meters);
    
    if (isNaN(qty) || qty <= 0) {
      setError("Please enter a valid reservation quantity greater than 0");
      return;
    }

    if (qty > availableUnreserved) {
      setError(`Cannot reserve more than available unreserved stock (${availableUnreserved} M)`);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      await reserveFabricStock(fabric.fabricId || fabric._id, {
        meters: qty,
        orderId: orderId || 'General Hold'
      });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reserve fabric');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-md overflow-hidden border">
        <div className="flex items-center justify-between p-4 border-b bg-muted/30">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Archive className="w-5 h-5 text-indigo-600" /> Reserve Fabric Stock
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

          <div className="p-3 bg-slate-50 border rounded-lg text-xs text-slate-700 space-y-1">
            <div className="flex justify-between"><span>Total Physical Stock:</span> <strong>{fabric.totalAvailable} M</strong></div>
            <div className="flex justify-between"><span>Currently Reserved:</span> <strong>{fabric.reservedStock || 0} M</strong></div>
            <div className="flex justify-between text-indigo-600 font-bold border-t pt-1"><span>Available to Reserve:</span> <span>{availableUnreserved} M</span></div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Meters to Reserve <span className="text-rose-500">*</span></label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                required
                max={availableUnreserved}
                value={meters}
                onChange={(e) => setMeters(e.target.value)}
                className="w-full border rounded-lg p-2.5 pr-12 focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="0.00"
              />
              <span className="absolute right-3 top-2.5 text-muted-foreground font-medium">M</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Order # or Customer Hold Ref</label>
            <input
              type="text"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none bg-background"
              placeholder="e.g. ORD-2026-042 or Wedding Suit Hold"
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
              {loading ? 'Reserving...' : 'Confirm Reservation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReserveFabricModal;
