import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import PersonalDetailsTab from '../components/customers/registration/PersonalDetailsTab';
import StickyActionBar from '../components/customers/registration/StickyActionBar';
import { createCustomer, fetchSettings, fetchMeasurements } from '../lib/api';
import { useToast } from '../components/Toast';
import axios from 'axios';
import { generateCustomerDetailsPdf } from '../lib/pdf/customerPdf';
import { getLogoBase64 } from '../lib/pdf/logoLoader';

export default function CustomerRegistration() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const [personalDetails, setPersonalDetails] = useState({
    fullName: '', mobile: '', whatsapp: '', email: '', gender: 'Male',
    occupation: '', gstNumber: '', referenceBy: '',
    companyGroupId: '', employeeCode: '',
    address: { area: '', city: '', state: '', country: 'India', pincode: '' },
    notes: ''
  });

  // Auto-fill from Receptionist search prefill parameter
  useEffect(() => {
    const prefill = searchParams.get('prefill');
    if (prefill) {
      if (/^\d{5,15}$/.test(prefill.trim())) {
        setPersonalDetails(prev => ({ ...prev, mobile: prefill.trim(), whatsapp: prefill.trim() }));
        toast(`Pre-filled mobile & WhatsApp number: ${prefill}`, 'info');
      } else if (prefill.includes('@')) {
        setPersonalDetails(prev => ({ ...prev, email: prefill.trim() }));
      } else {
        setPersonalDetails(prev => ({ ...prev, fullName: prefill.trim() }));
        toast(`Pre-filled client full name: ${prefill}`, 'info');
      }
    }
    
    const prefillGroupId = searchParams.get('groupId');
    if (prefillGroupId) {
      setPersonalDetails(prev => ({ ...prev, companyGroupId: prefillGroupId }));
      toast('Pre-filled Corporate Group mapping', 'info');
    }
  }, [searchParams]);

  // Fetch existing customer if editing
  useEffect(() => {
    if (id) {
      const fetchCustomer = async () => {
        try {
          const API_URL = import.meta.env.VITE_API_URL || '/api';
          const token = sessionStorage.getItem('token');
          const { data } = await axios.get(`${API_URL}/customers/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const cust = data.data || data;
          setPersonalDetails({
            fullName: cust.fullName || `${cust.firstName || ''} ${cust.lastName || ''}`.trim(),
            mobile: cust.mobile || '',
            whatsapp: cust.whatsapp || '',
            email: cust.email || '',
            gender: cust.gender || 'Male',
            occupation: cust.occupation || '',
            companyGroupId: cust.companyGroupId || '',
            employeeCode: cust.employeeCode || '',
            address: cust.address || { area: '', city: '', state: '', country: 'India', pincode: '' },
            notes: cust.notes || '',
            photo: cust.profilePhotoUrl 
              ? (cust.profilePhotoUrl.startsWith('data:image') 
                  ? cust.profilePhotoUrl 
                  : cust.profilePhotoUrl.startsWith('http')
                    ? `${cust.profilePhotoUrl}?t=${new Date(cust.updatedAt || Date.now()).getTime()}`
                    : `${(import.meta.env.VITE_API_URL || '/api').replace('/api', '')}${cust.profilePhotoUrl.startsWith('/') ? '' : '/'}${cust.profilePhotoUrl}?t=${new Date(cust.updatedAt || Date.now()).getTime()}`)
              : null
          });
        } catch (err) {
          toast('Failed to load customer details for editing', 'error');
        }
      };
      fetchCustomer();
    } else {
      const draft = localStorage.getItem('customerRegistrationDraft');
      if (draft) {
        try {
          const parsed = JSON.parse(draft);
          if (parsed.personalDetails) setPersonalDetails(parsed.personalDetails);
          toast('Draft loaded automatically.', 'info');
        } catch (err) {
          console.error("Failed to parse draft", err);
        }
      }
    }
  }, [id]);



  const handleSaveDraft = () => {
    localStorage.setItem('customerRegistrationDraft', JSON.stringify({
      personalDetails
    }));
    toast('Draft saved securely in your browser.', 'success');
  };

  const handleReset = () => {
    if (window.confirm("Are you sure you want to reset all fields? Unsaved changes will be lost.")) {
      localStorage.removeItem('customerRegistrationDraft');
      window.location.reload();
    }
  };

  const validatePersonalDetails = () => {
    if (!personalDetails.fullName.trim()) return "Full Name is required.";
    if (!personalDetails.mobile.trim()) return "Mobile Number is required.";
    if (personalDetails.email && !/^\S+@\S+\.\S+$/.test(personalDetails.email)) return "Invalid Email Address.";
    return null;
  };

  const handleSave = async () => {
    const personalErr = validatePersonalDetails();
    if (personalErr) {
      toast(personalErr, 'error');
      return;
    }

    try {
      const token = sessionStorage.getItem('token');
      const API_URL = import.meta.env.VITE_API_URL || '/api';
      
      let response;
      if (id) {
        response = await axios.put(`${API_URL}/customers/${id}`, personalDetails, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        toast('Customer updated successfully!', 'success');
      } else {
        response = await axios.post(`${API_URL}/customers/register`, {
          personalDetails,
          measurementDetails: { garmentType: 'Shirt', measurements: {} }
        }, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        toast('Customer registered successfully!', 'success');
      }
      
      localStorage.removeItem('customerRegistrationDraft');
      const resData = response.data?.data || response.data;
      const newCustomerId = resData?._id || resData?.data?._id || resData?.id || id || '64a1b2c3d4e5f6a7b8c00125';
      navigate(`/customers/${newCustomerId}`); // Navigate to new 360 profile
    } catch (error: any) {
      console.error(error);
      const errorMsg = error.response?.data?.message || error.message || 'An error occurred during registration';
      toast(errorMsg, 'error');
    }
  };

  const handleGeneratePdf = async () => {
    try {
      const logoBase64 = await getLogoBase64();
      
      let fetchedSettings = null;
      try {
        fetchedSettings = await fetchSettings();
      } catch(e) {
        console.warn('Failed to fetch settings for PDF');
      }

      let garments: any[] = [];
      if (id) {
        try {
          const measurementsData = await fetchMeasurements(id);
          garments = measurementsData?.active || [];
        } catch (e) {
          console.warn('Failed to fetch measurements for PDF');
        }
      }
      
      const pdfData = {
        customer: personalDetails,
        garments: garments, 
        logoBase64,
        settings: fetchedSettings || {
          businessName: 'HINGU TAILORS',
          shopAddress: '123 Tailor Street, Fashion City',
          contactEmail: 'contact@hingutailors.com'
        }
      };
      await generateCustomerDetailsPdf(pdfData);
      toast('PDF Generated successfully!', 'success');
    } catch (err) {
      toast('Failed to generate PDF', 'error');
    }
  };

  return (
    <div className="flex flex-col h-full min-h-screen bg-[#F8FAFC] pb-12">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">{id ? 'Edit Customer Details' : 'New Customer Registration'}</h1>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">Capture core personal details. Garments, measurements, and orders belong in the permanent 360° Profile after registration.</p>
        </div>
        
      </div>

      {/* Content Area */}
      <div className="flex-1 p-4 sm:p-6">
        <div className="max-w-4xl mx-auto bg-white rounded-[20px] border border-[#E5E7EB] shadow-[0_2px_20px_rgba(0,0,0,0.03)] overflow-hidden p-2 min-h-[550px]">
          <PersonalDetailsTab data={personalDetails} onChange={setPersonalDetails} />
        </div>
      </div>

      {/* Sticky Action Bar */}
      <StickyActionBar 
        onSave={handleSave} 
        onSaveDraft={handleSaveDraft} 
        onCancel={() => navigate('/customers')}
        onReset={handleReset}
        onGeneratePdf={handleGeneratePdf}
      />
    </div>
  );
}
