import React from 'react';
import { 
  User, Phone, Mail, MapPin, Calendar, MessageCircle, FileText, Globe, Scissors, PlusCircle
} from 'lucide-react';

interface Props {
  customer: any;
  measurements?: any[];
  onNavigateTab?: (tab: string) => void;
}

export default function OverviewTab({ customer, measurements, onNavigateTab }: Props) {
  return (
    <div className="space-y-8 animate-in fade-in duration-300 font-sans pb-8">
      
      {/* ==================== ACTIVE GARMENT MEASUREMENT SPECIFICATIONS ==================== */}
      <div className="rounded-[22px] border border-[#E5E7EB] bg-white p-7 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center">
              <Scissors className="h-4 w-4 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-black text-lg text-slate-900">Active Garment Measurement Specifications</h3>
              <p className="text-xs font-bold text-slate-500">Master tailoring specifications ready for shop-floor pattern drafting and cutting</p>
            </div>
          </div>
          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('measurements')}
              className="px-4 py-2 rounded-xl bg-[#2563EB] text-white hover:bg-blue-700 font-black text-xs transition-all shadow-md flex items-center gap-1.5 flex-shrink-0 cursor-pointer"
            >
              <span>Open Measurement Studio</span>
              <span className="text-blue-200">→</span>
            </button>
          )}
        </div>

        {(!measurements || measurements.length === 0) ? (
          <div className="p-8 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-300 text-center space-y-3">
            <Scissors className="h-8 w-8 text-slate-300 mx-auto" />
            <div className="max-w-md mx-auto">
              <h4 className="font-black text-slate-800 text-sm">No Active Measurements Recorded</h4>
              <p className="text-xs font-semibold text-slate-500 mt-1">
                There are no saved measurement dimensions for this customer yet. Open the Measurement Studio to select a garment and record measurements.
              </p>
            </div>
            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab('measurements')}
                className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-black text-xs hover:bg-slate-800 transition-colors inline-flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <PlusCircle className="h-4 w-4" /> Create New Measurement
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {measurements.map((record: any, idx: number) => {
              const measObj = record.measurements || {};
              const keys = Object.keys(measObj).filter(k => !k.startsWith('_') && measObj[k] !== undefined && measObj[k] !== '');

              return (
                <div key={idx} className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/80 hover:border-blue-300 transition-all space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 border-b border-slate-200/60 pb-2.5">
                      <span className="font-black text-slate-900 text-base flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        {record.garmentType || 'Garment Spec'}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-blue-100/80 text-[#2563EB] font-extrabold text-[11px]">
                        v{record.versionNumber || 1}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {keys.length === 0 ? (
                        <span className="text-xs font-bold text-slate-400">Standard defaults applied</span>
                      ) : (
                        keys.slice(0, 8).map(k => (
                          <span key={k} className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 text-[11px] font-bold shadow-2xs">
                            <span className="text-slate-400 font-normal capitalize">{k.replace(/([A-Z])/g, ' $1').trim()}:</span> <strong className="text-slate-900">{measObj[k]}"</strong>
                          </span>
                        ))
                      )}
                      {keys.length > 8 && (
                        <span className="px-2 py-1 rounded-lg bg-slate-200/70 text-slate-600 text-[10px] font-black self-center">
                          +{keys.length - 8} more
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-200/50 flex items-center justify-between text-[11px] font-extrabold text-slate-500">
                    <span>Updated: {new Date(record.updatedAt || record.createdAt || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    {onNavigateTab && (
                      <button
                        onClick={() => onNavigateTab('measurements')}
                        className="text-[#2563EB] hover:underline cursor-pointer font-black"
                      >
                        Edit Spec →
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ==================== PERSONAL INFORMATION & BILLING DOSSIER ==================== */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="rounded-[22px] border border-[#E5E7EB] bg-white p-7 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h3 className="font-black text-lg text-slate-900 flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center">
                <User className="h-4 w-4 stroke-[2.5]" />
              </div>
              <span>Personal Identification Dossier</span>
            </h3>
            <span className="px-2.5 py-1 rounded-[8px] bg-emerald-50 text-emerald-800 font-extrabold text-[10px] uppercase tracking-wider">
              Verified Profile
            </span>
          </div>

          <div className="grid grid-cols-2 gap-y-6 gap-x-4">
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">Full Legal Name</span>
              <span className="font-black text-slate-900 text-sm">{customer.fullName || `${customer.firstName} ${customer.lastName}`}</span>
            </div>
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">Gender Specification</span>
              <span className="font-black text-slate-800 text-sm">{customer.gender || 'Not specified'}</span>
            </div>
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">Mobile Contact</span>
              <span className="font-extrabold text-sm flex items-center gap-1.5 text-slate-800">
                <Phone className="h-3.5 w-3.5 text-[#2563EB]"/> {customer.mobile}
              </span>
            </div>
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">WhatsApp Channel</span>
              <span className="font-extrabold text-sm flex items-center gap-1.5 text-[#22C55E]">
                <MessageCircle className="h-3.5 w-3.5 fill-emerald-100"/> {customer.whatsapp || customer.mobile}
              </span>
            </div>
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">Preferred Language</span>
              <span className="font-black text-xs sm:text-sm flex items-center gap-1.5 text-indigo-700">
                <Globe className="h-3.5 w-3.5 text-indigo-600 flex-shrink-0"/> {customer.preferredLanguage || 'Not set'}
              </span>
            </div>
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">Date of Birth</span>
              <span className="font-bold text-sm flex items-center gap-1.5 text-slate-700">
                <Calendar className="h-3.5 w-3.5 text-slate-400"/> {customer.dob ? new Date(customer.dob).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Not provided'}
              </span>
            </div>
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">Occupation & Style Note</span>
              <span className="font-black text-sm text-slate-800">{customer.occupation || 'Not specified'}</span>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[22px] border border-[#E5E7EB] bg-white p-7 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="font-black text-lg text-slate-900 flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center">
                  <MapPin className="h-4 w-4 stroke-[2.5]" />
                </div>
                <span>Address & Retail Tax Compliance</span>
              </h3>
            </div>

            <div className="space-y-5">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">Permanent Dispatch & Delivery Address</span>
                <span className="font-extrabold text-slate-800 text-sm leading-relaxed block bg-slate-50 p-4 rounded-xl border border-slate-200">
                  {customer.address ? (typeof customer.address === 'object' ? `${customer.address.area || ''}, ${customer.address.city || ''}, ${customer.address.state || ''} - ${customer.address.pincode || ''}`.replace(/^[, ]+/, '').replace(/- $/, '') : customer.address) : 'No address on file'}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">Registered GSTIN Number</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-black text-sm text-[#2563EB] bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
                    {customer.gstNumber || 'Not registered'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[22px] border border-amber-200 bg-amber-50/50 p-6 shadow-sm">
            <h3 className="font-black text-base flex items-center gap-2 text-amber-900">
              <FileText className="h-5 w-5 text-amber-600" /> Master Tailor Fitting Preferences & Notes
            </h3>
            <p className="text-xs mt-2.5 leading-relaxed text-amber-900/90 font-extrabold">
              {customer.notes || 'No fitting notes recorded for this customer.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

