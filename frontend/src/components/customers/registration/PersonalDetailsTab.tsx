import React, { useState } from 'react';
import WebcamCapture from '../../WebcamCapture';

interface Props {
  data: any;
  onChange: (data: any) => void;
}

export default function PersonalDetailsTab({ data, onChange }: Props) {
  const [showWebcam, setShowWebcam] = useState(false);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    onChange({ ...data, [name]: value });
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Basic client-side resolution check
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.src = objectUrl;
    img.onload = () => {
      // require at least 300x300 for verification
      if (img.width < 300 || img.height < 300) {
        // set an inline error flag in data so UI can show message
        onChange({ ...data, photoError: 'Select a high-resolution portrait photo for client verification.' });
        URL.revokeObjectURL(objectUrl);
        return;
      }
      // Read file as data URL for preview
      const reader = new FileReader();
      reader.onload = () => {
        onChange({ ...data, photo: reader.result, photoError: undefined });
        URL.revokeObjectURL(objectUrl);
      };
      reader.readAsDataURL(file);
    };
    img.onerror = () => {
      onChange({ ...data, photoError: 'Unable to read photo file.' });
      URL.revokeObjectURL(objectUrl);
    };
  };

  const handleWebcamCapture = (dataUrl: string) => {
    onChange({ ...data, photo: dataUrl, photoError: undefined });
    setShowWebcam(false);
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    onChange({ ...data, address: { ...data.address, [name]: value } });
  };

  return (
    <div className="p-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Core Details (V3 Enterprise Mandated Intake) */}
        <div className="space-y-6">
          <h3 className="text-lg font-black text-slate-900 border-b border-slate-200 pb-2 flex items-center justify-between">
            <span>Core Details</span>
            <span className="text-xs text-[#2563EB] font-bold">Step 1 of 1 (Onboarding)</span>
          </h3>
          
          {/* Photo Upload & Customer ID Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-2xl bg-blue-50/50 border border-blue-100">
            <div className="flex-shrink-0 mx-auto sm:mx-0 w-32 sm:w-auto">
              <label className="relative block h-24 w-24 sm:h-20 sm:w-20 mx-auto rounded-2xl bg-white border-2 border-dashed border-[#2563EB] hover:bg-blue-50 flex items-center justify-center text-center cursor-pointer transition-colors shadow-2xs overflow-hidden">
                {data.photo ? (
                  <img 
                    src={data.photo} 
                    alt="Customer" 
                    className="h-full w-full object-cover" 
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%2394a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>`;
                    }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-2xl">📸</span>
                    <span className="text-[10px] font-black text-[#2563EB] group-hover:underline">Add Photo</span>
                  </div>
                )}
                <button type="button" onClick={() => setShowWebcam(true)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" aria-label="Open Camera"></button>
              </label>
              <div className="flex flex-wrap gap-2 mt-2 justify-center">
                <button 
                  type="button" 
                  onClick={() => setShowWebcam(true)}
                  className="text-[10px] bg-primary text-primary-foreground px-2 py-1.5 rounded shadow-sm flex-1 font-medium hover:bg-primary/90 transition-colors text-center whitespace-nowrap"
                >
                  Live Capture
                </button>
                <label className="text-[10px] bg-secondary text-secondary-foreground px-2 py-1.5 rounded shadow-sm flex-1 font-medium hover:bg-secondary/80 transition-colors text-center cursor-pointer whitespace-nowrap">
                  Upload File
                  <input accept="image/*" type="file" onChange={handlePhotoSelect} className="hidden" />
                </label>
              </div>
              {data.photoError && <div className="text-rose-600 text-xs mt-1 text-center">{data.photoError}</div>}
            </div>
            {!data.companyGroupId && (
              <div className="flex-1 space-y-2 w-full mt-2 sm:mt-0">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-black text-slate-800 uppercase tracking-wider">Customer ID</label>
                  <span className="text-[10px] bg-white px-2 py-0.5 rounded font-mono font-bold text-slate-500 border border-slate-200">Auto-Assigned</span>
                </div>
                <input 
                  type="text" 
                  name="customerId" 
                  value={data.customerId || 'Pending...'} 
                  readOnly 
                  className="w-full px-3.5 py-1.5 bg-white border border-slate-200 rounded-xl font-mono font-black text-sm text-[#2563EB] focus:outline-none cursor-default shadow-2xs" 
                />
              </div>
            )}
          </div>

          {/* Customer Category and Customer Since removed per preference */}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-black text-slate-800 mb-1 uppercase tracking-wider">Full Name *</label>
              <input type="text" name="fullName" value={data.fullName} onChange={handleChange} placeholder="Rahul Rajput" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-black text-sm text-slate-900 focus:outline-none focus:border-[#2563EB] shadow-2xs" />
            </div>
            {data.companyGroupId && (
              <div>
                <label className="block text-xs font-black text-slate-800 mb-1 uppercase tracking-wider">Employee Code</label>
                <input type="text" name="employeeCode" value={data.employeeCode || ''} onChange={handleChange} placeholder="EMP001" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-black text-sm text-slate-900 focus:outline-none focus:border-[#2563EB] shadow-2xs" />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Gender</label>
              <select name="gender" value={data.gender} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Kids">Kids</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-2">Contact Information</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Mobile Number *</label>
              <input type="tel" name="mobile" value={data.mobile} onChange={handleChange} placeholder="+91 98765 43210" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">WhatsApp Number</label>
              <input type="tel" name="whatsapp" value={data.whatsapp} onChange={handleChange} placeholder="Same if blank" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
            <input type="email" name="email" value={data.email} onChange={handleChange} placeholder="john@example.com" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
          </div>
          
          {/* Date of Birth and Anniversary removed per preference */}
        </div>

      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Address */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-2">Address</h3>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Street / Area</label>
            <input type="text" name="area" value={data.address?.area || ''} onChange={handleAddressChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
              <input type="text" name="city" value={data.address?.city || ''} onChange={handleAddressChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">State</label>
              <input type="text" name="state" value={data.address?.state || ''} onChange={handleAddressChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
            </div>
          </div>

            <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Country</label>
              <input type="text" name="country" value={data.address?.country || 'India'} readOnly disabled className="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-700" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Pincode</label>
              <input type="text" name="pincode" value={data.address?.pincode || ''} onChange={handleAddressChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
            </div>
          </div>
        </div>

        {/* Other Info */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-2">Other Info</h3>
          

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Internal Notes</label>
            <textarea name="notes" value={data.notes} onChange={handleChange} rows={4} placeholder="Special requirements, behavior, etc." className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"></textarea>
          </div>
        </div>
      </div>

      {showWebcam && (
        <WebcamCapture 
          onCapture={handleWebcamCapture} 
          onClose={() => setShowWebcam(false)} 
        />
      )}
    </div>
  );
}
