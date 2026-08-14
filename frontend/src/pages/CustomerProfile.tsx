import React, { useState, Suspense, lazy } from 'react';
import WebcamCapture from '../components/WebcamCapture';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, User, Scissors, ShoppingBag, CreditCard,
  FileText, Clock, Image as ImageIcon, Settings, MoreHorizontal,
  MessageCircle, Printer, Plus, Download, LayoutDashboard,
  Phone, Mail, MapPin, Sparkles, Edit, ChevronDown, CheckCircle2, AlertTriangle,
  Layers, Zap, RefreshCw, Award, ShieldCheck, ArrowRight, ExternalLink, Scan, QrCode, Search
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchCustomerById, deleteCustomer, fetchMeasurements } from '../lib/api';
import { generateCustomerMeasurementPDF } from '../lib/pdfExport';
import { useToast } from '../components/Toast';
import { Camera } from 'lucide-react';
import axios from 'axios';

// Stable Vite Lazy Loaded Tab Modules (Phase 1, 2, 4, 6 - Consistently using relative imports)
const OverviewTab = lazy(() => import('../components/customers/profile/OverviewTab'));
const MeasurementsTab = lazy(() => import('../components/customers/profile/MeasurementsTab'));
const OrdersTab = lazy(() => import('../components/customers/profile/OrdersTab'));
const GarmentsTab = lazy(() => import('../components/customers/profile/GarmentsTab'));
const AlterationsTab = lazy(() => import('../components/customers/profile/AlterationsTab'));
const InvoicesTab = lazy(() => import('../components/customers/profile/InvoicesTab'));
const PaymentsTab = lazy(() => import('../components/customers/profile/PaymentsTab'));
const ReportsTab = lazy(() => import('../components/customers/profile/ReportsTab'));
const TimelineTab = lazy(() => import('../components/customers/profile/TimelineTab'));
const GalleryTab = lazy(() => import('../components/customers/profile/GalleryTab'));
const DocumentsTab = lazy(() => import('../components/customers/profile/DocumentsTab'));
const NotesTab = lazy(() => import('../components/customers/profile/NotesTab'));
const AIInsightsTab = lazy(() => import('../components/customers/profile/AIInsightsTab'));
const PreferencesTab = lazy(() => import('../components/customers/profile/PreferencesTab'));

export default function CustomerProfile() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('overview');
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scannedTagData, setScannedTagData] = useState<any | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showWebcam, setShowWebcam] = useState(false);

  const handleBarcodeScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const tagToProcess = barcodeInput.trim();
    if (!tagToProcess) {
      showToast('Please scan or enter a valid tag code', 'error');
      return;
    }
    setScannedTagData({
      code: tagToProcess.toUpperCase(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'Tag scanned — awaiting backend verification'
    });
    showToast(`Scanned tag: ${tagToProcess.toUpperCase()}`, 'success');
    setBarcodeInput('');
  };

  // Alterations data is now fetched from the backend via order alteration history

  const { data: customer, isLoading, isError } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => fetchCustomerById(id as string),
    enabled: !!id,
  });

  const { data: measurementData } = useQuery({
    queryKey: ['measurements', id],
    queryFn: () => fetchMeasurements(id as string),
    enabled: !!id,
  });

  const activeMeasList = measurementData?.active || [];

  const deleteMutation = useMutation({
    mutationFn: deleteCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      navigate('/customers');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to delete customer');
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="h-10 w-10 rounded-full border-4 border-blue-500/20 border-t-blue-600 animate-spin"></div>
          <p className="text-sm font-semibold text-slate-500 tracking-wide animate-pulse">Loading</p>
        </div>
      </div>
    );
  }

  if (isError || !customer) {
    return (
      <div className="text-center py-16 bg-white rounded-[16px] border shadow-sm max-w-lg mx-auto mt-12">
        <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-3" />
        <h3 className="text-xl font-bold text-slate-800">Customer Profile Not Found</h3>
        <p className="text-slate-500 text-sm mt-1 mb-6">The requested customer record does not exist or has been archived.</p>
        <button onClick={() => navigate('/customers')} className="px-5 py-2 bg-blue-600 text-white font-semibold text-sm rounded-lg hover:bg-blue-700 transition-colors shadow-sm">Return to Customer Directory</button>
      </div>
    );
  }

  const fullName = customer.fullName || `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Unknown Customer';
  const initials = fullName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || '??';
  const customerCode = customer.customerId || (customer.companyGroupId && customer.employeeCode ? `EMP: ${customer.employeeCode}` : null);


  const handleWebcamCapture = async (dataUrl: string) => {
    setShowWebcam(false);
    try {
      setUploadingPhoto(true);
      
      const API_URL = import.meta.env.VITE_API_URL || '/api';
      const token = sessionStorage.getItem('token');
      
      await axios.put(`${API_URL}/customers/${id}`, 
        { photo: dataUrl }, 
        {
          headers: { 
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      showToast('Profile photo updated successfully', 'success');
      queryClient.invalidateQueries({ queryKey: ['customer', id] });
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to update photo', 'error');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingPhoto(true);
      const formData = new FormData();
      formData.append('photo', file);

      const API_URL = import.meta.env.VITE_API_URL || '/api';
      const token = sessionStorage.getItem('token');
      await axios.post(`${API_URL}/customers/${id}/photo`, formData, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      showToast('Profile photo updated successfully', 'success');
      queryClient.invalidateQueries({ queryKey: ['customer', id] });
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to update photo', 'error');
    } finally {
      setUploadingPhoto(false);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300 pb-12 bg-[#F8FAFC] min-h-screen font-sans">
      
      {/* Breadcrumbs & Navigation */}
      <div className="flex items-center justify-between px-1 pt-1">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
          <button onClick={() => navigate('/customers')} className="hover:text-blue-600 transition-colors flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" /> Customers Directory
          </button>
          <span className="text-slate-300">&gt;</span>
          <span className="text-slate-600">Customer 360° Workspace</span>
          <span className="text-slate-300">&gt;</span>
          <span className="text-[#2563EB] capitalize">{activeTab.replace('_', ' ')}</span>
        </div>
      </div>

      {/* ==================== CUSTOMER DASHBOARD TOP HEADER ==================== */}
      <div className="bg-white rounded-[20px] border border-[#E5E7EB] shadow-[0_2px_16px_rgba(0,0,0,0.02)] p-6 transition-all space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          
          {/* Left: Avatar, Name, VIP, Contact, Since, Outstanding, Loyalty */}
          <div className="flex items-start gap-4 flex-1 min-w-[300px]">
            <div className="relative flex-shrink-0 group">
              {customer.profilePhotoUrl ? (
                <img 
                  src={
                    customer.profilePhotoUrl.startsWith('data:image') 
                      ? customer.profilePhotoUrl 
                      : customer.profilePhotoUrl.startsWith('http')
                        ? `${customer.profilePhotoUrl}?t=${new Date(customer.updatedAt || Date.now()).getTime()}`
                        : `${(import.meta.env.VITE_API_URL || '/api').replace('/api', '')}${customer.profilePhotoUrl.startsWith('/') ? '' : '/'}${customer.profilePhotoUrl}?t=${new Date(customer.updatedAt || Date.now()).getTime()}`
                  } 
                  alt={fullName} 
                  className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl object-cover shadow-lg select-none bg-slate-100 border border-slate-200"
                  onError={(e) => {
                    // Fallback to avatar if image fails to load
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLImageElement).parentElement?.classList.add('fallback-avatar');
                  }}
                />
              ) : (
                <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-gradient-to-tr from-[#2563EB] to-indigo-600 text-white font-black text-2xl flex items-center justify-center shadow-lg select-none">
                  {initials}
                </div>
              )}
              
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity gap-2 p-2">
                {uploadingPhoto ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> 
                ) : (
                  <>
                    <button 
                      onClick={() => setShowWebcam(true)}
                      className="text-[10px] font-bold bg-primary hover:bg-primary/90 text-primary-foreground py-1 px-2 rounded w-full flex items-center justify-center gap-1"
                    >
                      <Camera className="w-3 h-3" /> Live
                    </button>
                    <label className="text-[10px] font-bold bg-white/20 hover:bg-white/30 text-white py-1 px-2 rounded w-full cursor-pointer text-center">
                      Upload
                      <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploadingPhoto} />
                    </label>
                  </>
                )}
              </div>

              {!customer.companyGroupId && (
                <span className="absolute -bottom-1 -right-1 h-5 w-5 bg-[#22C55E] rounded-full border-4 border-white shadow-sm flex items-center justify-center z-10" title="Permanent Unique Customer ID">
                  <CheckCircle2 className="h-2.5 w-2.5 text-white" />
                </span>
              )}
            </div>

            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight truncate">{fullName}</h1>
                <span className="px-2.5 py-0.5 rounded-[8px] bg-[#2563EB] text-white text-[10px] font-black uppercase tracking-wider shadow-2xs flex items-center gap-1">
                  <Award className="h-3 w-3 fill-amber-300 text-amber-300" /> {customer.companyGroupId ? 'Corporate' : 'Regular'}
                </span>
                {customerCode && (
                  <span className="px-2 py-0.5 rounded-[8px] bg-slate-100 font-mono font-black text-[11px] text-slate-700 border border-slate-200">
                    {customerCode}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs font-bold text-slate-600">
                <div className="flex items-center gap-1.5 truncate">
                  <Phone className="h-3.5 w-3.5 text-[#2563EB] flex-shrink-0" />
                  <span>{customer.mobile || 'Not provided'}</span>
                </div>
                <div className="flex items-center gap-1.5 truncate">
                  <MapPin className="h-3.5 w-3.5 text-[#2563EB] flex-shrink-0" />
                  <span>{customer.address ? (typeof customer.address === 'object' ? `${customer.address.city || ''}, ${customer.address.state || ''}`.trim().replace(/^,/, '') || 'Not provided' : customer.address) : 'Not provided'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Quick Action Controls */}
          <div className="flex flex-col items-end gap-3 flex-shrink-0">
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button onClick={() => navigate(`/orders/new?customerId=${customer._id}`)} className="h-9 px-4 bg-[#2563EB] hover:bg-blue-700 text-white rounded-[12px] font-black text-xs flex items-center gap-1.5 shadow-md transition-all transform hover:-translate-y-0.5 cursor-pointer">
                <ShoppingBag className="h-3.5 w-3.5 stroke-[3]" /> New Order
              </button>
              <button onClick={() => setActiveTab('measurements')} className="h-9 px-4 bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-800 rounded-[12px] font-black text-xs flex items-center gap-1.5 shadow-2xs transition-all transform hover:-translate-y-0.5 cursor-pointer">
                <Plus className="h-3.5 w-3.5 stroke-[3]" /> New Measurement
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => navigate(`/customers/edit/${customer._id}`)} 
                title="Edit Customer Details" 
                className="h-9 px-3 bg-white border border-slate-200 rounded-[12px] hover:bg-slate-50 text-slate-800 font-black text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
              >
                <Edit className="h-3.5 w-3.5 text-slate-600" /> Edit
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ==================== TAB NAVIGATION ==================== */}
      <div className="flex overflow-x-auto space-x-2 border-b border-slate-200 pb-2 mb-4 scrollbar-hide">
        {['overview', 'orders'].map((tab) => (
           <button
             key={tab}
             onClick={() => setActiveTab(tab)}
             className={`px-4 py-2 flex-shrink-0 rounded-xl text-[11px] font-black capitalize transition-all ${
               activeTab === tab 
                 ? 'bg-[#2563EB] text-white shadow-md'
                 : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
             }`}
           >
             {tab.replace('_', ' ')}
           </button>
        ))}
      </div>

      {/* ==================== TAB WORKSPACE CONTENT (V3 Lazy Loaded Vault) ==================== */}
      <div className="flex-1 space-y-4">
        <Suspense fallback={
          <div className="flex items-center justify-center h-96 bg-white rounded-[20px] border border-slate-200 shadow-sm text-slate-400">
            <div className="animate-pulse flex items-center gap-3">
              <div className="h-6 w-6 rounded-full border-3 border-blue-500 border-t-transparent animate-spin"></div>
              <span className="font-black text-slate-600 text-sm">Loading</span>
            </div>
          </div>
        }>
          {activeTab === 'overview' && <OverviewTab customer={customer} measurements={activeMeasList} onNavigateTab={(tab) => setActiveTab(tab)} />}
          {activeTab === 'measurements' && <MeasurementsTab customerId={customer._id} customerType={customer.gender || 'Male'} customer={customer} />}
          {activeTab === 'orders' && <OrdersTab customerId={customer._id} customer={customer} onNavigateTab={(tab) => setActiveTab(tab)} />}
          {activeTab === 'garments' && <GarmentsTab customerId={customer._id} customer={customer} onNavigateTab={(tab) => setActiveTab(tab)} />}
          {activeTab === 'alterations' && <AlterationsTab customerId={customer._id} customer={customer} onNavigateTab={(tab) => setActiveTab(tab)} />}
          {activeTab === 'invoices' && <InvoicesTab customerId={customer._id} customer={customer} />}
          {activeTab === 'payments' && <PaymentsTab customerId={customer._id} customer={customer} />}
          {activeTab === 'reports' && <ReportsTab customerId={customer._id} customer={customer} />}
          {activeTab === 'timeline' && <TimelineTab customerId={customer._id} />}
          {activeTab === 'documents' && <DocumentsTab customerId={customer._id} />}
          {activeTab === 'gallery' && <GalleryTab customerId={customer._id} />}
          {activeTab === 'notes' && <NotesTab customerId={customer._id} />}
          {activeTab === 'ai_insights' && <AIInsightsTab customerId={customer._id} customer={customer} />}
          {activeTab === 'preferences' && <PreferencesTab customerId={customer._id} />}
        </Suspense>
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
