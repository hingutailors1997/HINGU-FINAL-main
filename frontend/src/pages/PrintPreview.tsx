import React, { useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutEngine } from '../lib/print/LayoutEngine';
import { PrintService } from '../lib/print/PrintService';
import LabelRenderer from '../components/print/LabelRenderer';
import { ArrowLeft, Printer } from 'lucide-react';
import { PrintableItem, LabelType, PrintMode, LayoutPreset } from '../lib/print/types';

export default function PrintPreview() {
  const location = useLocation();
  const navigate = useNavigate();

  const state = location.state as {
    items: PrintableItem[];
    type: LabelType;
    mode: PrintMode;
    quantity: number;
    preset: LayoutPreset;
  };

  useEffect(() => {
    if (!state || !state.items || state.items.length === 0) {
      navigate('/stock');
    }
  }, [state, navigate]);

  if (!state) return null;

  const { items, type, mode, quantity, preset } = state;

  const labels = useMemo(() => {
    return PrintService.generatePrintQueue(items, mode, quantity);
  }, [items, mode, quantity]);

  const labelsPerPage = LayoutEngine.getLabelsPerPage(preset);
  
  // Chunk labels into pages
  const pages = useMemo(() => {
    const chunked = [];
    for (let i = 0; i < labels.length; i += labelsPerPage) {
      chunked.push(labels.slice(i, i + labelsPerPage));
    }
    return chunked;
  }, [labels, labelsPerPage]);

  return (
    <div className="print-container min-h-screen bg-neutral-100 font-sans">
      {/* Screen-only Controls Header */}
      <div className="print:hidden bg-white border-b shadow-sm sticky top-0 z-10 p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-neutral-100 rounded-md">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-bold text-lg">Print Preview</h1>
            <p className="text-xs text-neutral-500">
              {labels.length} Total Labels • {pages.length} Pages • A4 Portrait
            </p>
          </div>
        </div>
        <button 
          onClick={() => window.print()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium text-sm flex items-center gap-2 shadow-sm transition-colors"
        >
          <Printer className="w-4 h-4" /> Print Labels
        </button>
      </div>

      {/* Pages Container */}
      <div className="print:p-0 p-8 flex flex-col items-center gap-8 overflow-auto">
        {pages.map((pageLabels, pageIdx) => (
          <div 
            key={pageIdx}
            className="print:shadow-none print:m-0 print:border-none print:w-[210mm] print:h-[297mm] shadow-lg bg-white border box-border"
            style={{ 
              width: '210mm', 
              minHeight: '297mm', 
              padding: '5mm', 
              pageBreakAfter: 'always',
              display: 'grid',
              gridTemplateColumns: `repeat(${preset.columns}, 1fr)`,
              gridAutoRows: 'max-content',
              gap: '4mm',
              alignContent: 'start',
              justifyItems: 'center'
            }}
          >
            {pageLabels.map((lbl, i) => (
              <LabelRenderer key={lbl.id + i} item={lbl} type={type} preset={preset} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
