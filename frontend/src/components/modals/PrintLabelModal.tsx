import React, { useState } from 'react';
import { X, Printer, QrCode, ScanBarcode } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { PrintableItem, LabelType, PrintMode, LayoutPreset } from '../../lib/print/types';
import { LayoutEngine } from '../../lib/print/LayoutEngine';

interface PrintLabelModalProps {
  fabrics: any[];
  onClose: () => void;
  defaultType?: LabelType;
}

export default function PrintLabelModal({ fabrics, onClose, defaultType = 'barcode' }: PrintLabelModalProps) {
  const navigate = useNavigate();
  const [type, setType] = useState<LabelType>(defaultType);
  const [mode, setMode] = useState<PrintMode>('perFabric');
  const [quantityStr, setQuantityStr] = useState<string>('1');

  const preset = LayoutEngine.getPreset(type);
  const labelsPerPage = LayoutEngine.getLabelsPerPage(preset);

  const handlePrint = () => {
    let qty = parseInt(quantityStr, 10);
    if (isNaN(qty) || qty < 1) qty = 1;
    
    // If user clicked "Full Page" mode, wait we didn't add the preset buttons for quantity yet.
    // The user requested: "Total Labels" vs "Copies per Fabric"
    
    const items: PrintableItem[] = fabrics.map(f => ({
      id: f.fabricId || f._id,
      barcodeValue: f.fabricId || f._id,
      qrValue: f.fabricId || f._id,
      title: f.name || f.brand || 'Fabric'
    }));

    navigate('/print-preview', {
      state: {
        items,
        type,
        mode,
        quantity: qty,
        preset
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b flex items-center justify-between bg-neutral-50">
          <div className="flex items-center gap-2">
            <Printer className="h-5 w-5 text-indigo-600" />
            <h3 className="font-bold text-lg">Print Labels</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-neutral-200 rounded-full transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-semibold">Label Format</label>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setType('barcode')}
                className={cn("px-4 py-3 border-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2", type === 'barcode' ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-neutral-200 hover:border-indigo-300")}
              >
                <ScanBarcode className="w-4 h-4" /> Barcode
              </button>
              <button 
                onClick={() => setType('qr')}
                className={cn("px-4 py-3 border-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2", type === 'qr' ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-neutral-200 hover:border-indigo-300")}
              >
                <QrCode className="w-4 h-4" /> QR Code
              </button>
            </div>
            <p className="text-xs text-neutral-500">Labels per page: {labelsPerPage}</p>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-semibold">Print Distribution</label>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setMode('perFabric')}
                className={cn("px-4 py-3 border-2 rounded-lg text-sm font-medium transition-all", mode === 'perFabric' ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-neutral-200 hover:border-indigo-300")}
              >
                Copies Per Fabric
              </button>
              <button 
                onClick={() => setMode('total')}
                className={cn("px-4 py-3 border-2 rounded-lg text-sm font-medium transition-all", mode === 'total' ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-neutral-200 hover:border-indigo-300")}
              >
                Total Labels
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-semibold">Quantity</label>
            <div className="flex gap-2">
              <input 
                type="number" 
                value={quantityStr}
                onChange={e => setQuantityStr(e.target.value)}
                className="flex-1 rounded-md border-neutral-300 border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                min="1"
              />
              <button onClick={() => setQuantityStr(labelsPerPage.toString())} className="px-3 py-2 bg-neutral-100 border rounded-md text-sm hover:bg-neutral-200">
                1 Full Page
              </button>
            </div>
            <p className="text-xs text-neutral-500">
              {mode === 'perFabric' 
                ? `Will print ${quantityStr || 0} labels for each of the ${fabrics.length} selected fabrics.`
                : `Will print exactly ${quantityStr || 0} labels total, distributed evenly.`}
            </p>
          </div>
        </div>

        <div className="px-6 py-4 border-t bg-neutral-50 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-neutral-600 hover:text-black">Cancel</button>
          <button onClick={handlePrint} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium text-sm flex items-center gap-2 shadow-sm transition-colors">
            Generate Preview
          </button>
        </div>
      </div>
    </div>
  );
}
