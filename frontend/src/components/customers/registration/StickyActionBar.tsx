import React from 'react';
import { Save, FileText, RotateCcw, XCircle, FileDown, Printer } from 'lucide-react';

interface Props {
  onSave: () => void;
  onSaveDraft: () => void;
  onReset: () => void;
  onCancel: () => void;
  onGeneratePdf?: () => void;
}

export default function StickyActionBar({ onSave, onSaveDraft, onReset, onCancel, onGeneratePdf }: Props) {
  return (
    <div className="w-full bg-white border-t border-slate-200 shadow-sm px-4 py-4 sm:px-6 sm:py-5 mt-auto">
      <div className="flex flex-col sm:flex-row items-center justify-between max-w-6xl mx-auto gap-3">
        
        {/* Left Side Actions */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 w-full sm:w-auto">
          <button 
            onClick={onCancel}
            className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
          >
            <XCircle className="w-4 h-4 mr-2" />
            Cancel
          </button>
          
          <button 
            onClick={onReset}
            className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 hover:border-red-300 transition-colors whitespace-nowrap"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </button>
        </div>

        {/* Right Side Actions */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 w-full sm:w-auto">
          <button 
            onClick={() => {
              if (onGeneratePdf) {
                onGeneratePdf();
              } else {
                alert("Generate PDF functionality will be linked soon.");
              }
            }}
            className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap"
          >
            <FileDown className="w-4 h-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Generate PDF</span>
            <span className="sm:hidden">PDF</span>
          </button>

          <button 
            onClick={() => window.print()}
            className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap"
          >
            <Printer className="w-4 h-4 mr-1 sm:mr-2" />
            Print
          </button>

          <div className="hidden sm:block w-px h-6 bg-slate-300 mx-2"></div>

          <button 
            onClick={onSaveDraft}
            className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 sm:px-5 py-2.5 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors whitespace-nowrap"
          >
            <FileText className="w-4 h-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Save Draft</span>
            <span className="sm:hidden">Draft</span>
          </button>

          <button 
            onClick={onSave}
            className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm transition-colors whitespace-nowrap"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Customer
          </button>
        </div>

      </div>
    </div>
  );
}
