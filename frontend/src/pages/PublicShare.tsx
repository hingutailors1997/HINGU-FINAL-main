import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { FileText, User, Receipt, Download, ShieldCheck, MapPin, Phone, Mail } from 'lucide-react';
import axios from 'axios';
import { generateCustomerDetailsPdf } from '../lib/pdf/customerPdf';
import { generateOrderDetailsPdf } from '../lib/pdf/orderPdf';
import { generateInvoicePdf } from '../lib/pdf/invoicePdf';
import { getLogoBase64 } from '../lib/pdf/logoLoader';
import { cn } from '../lib/utils';
import Logo from '../assets/hingu-logo.jpeg';

export default function PublicShare() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    const fetchPayload = async () => {
      try {
        setLoading(true);
        const API_URL = import.meta.env.VITE_API_URL || '/api';
        const res = await axios.get(`${API_URL}/public/share/${token}`);
        if (res.data?.success) {
          setData(res.data.data);
        } else {
          setError('Invalid Link');
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'Invalid Link');
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchPayload();
  }, [token]);

  const handleDownload = async (type: 'customer' | 'order' | 'invoice') => {
    if (!data) return;
    setDownloading(type);
    
    try {
      const logoBase64 = await getLogoBase64();
      const pdfData = { ...data, logoBase64 };

      if (type === 'customer') {
        await generateCustomerDetailsPdf(pdfData);
      } else if (type === 'order') {
        await generateOrderDetailsPdf(pdfData);
      } else if (type === 'invoice') {
        await generateInvoicePdf(pdfData);
      }
    } catch (err) {
      console.error(`Failed to generate ${type} PDF`, err);
      alert('Failed to generate document. Please try again.');
    } finally {
      setDownloading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-gray-500">Retrieving secure documents...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">404</h1>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Invalid Link</h2>
          <p className="text-gray-500 text-sm">
            This secure document link is invalid or has expired. Please contact Hingu Tailors for a new link.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-blue-100 selection:text-blue-900 pb-12">
      {/* Top Branding Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-6 text-center space-y-4">
          <div className="flex flex-col items-center justify-center gap-2">
            <img src={Logo} alt="Logo" className="h-16 w-auto object-contain" />
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight uppercase" style={{ fontFamily: "'Outfit', sans-serif" }}>
              {data.settings?.businessName || 'HINGU TAILORS'}
            </h1>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-500 font-medium">
            <div className="flex items-start gap-1.5 max-w-lg text-left">
              <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" /> 
              <span>{data.settings?.shopAddress || '123 Tailor Street, Fashion City'} {data.settings?.shopAddress2 || ''}</span>
            </div>
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <Phone className="w-4 h-4 flex-shrink-0" /> 
              <span>{data.settings?.contactPhone || '8655717013 | 9892074570'}</span>
            </div>
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <Mail className="w-4 h-4 flex-shrink-0" /> 
              <span>{data.settings?.contactEmail || 'contact@hingutailors.com'}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 mt-8 space-y-8">
        
        {/* Customer & Order Context */}
        <div className="text-center space-y-3">
          <p className="text-sm font-semibold tracking-wider text-blue-600 uppercase">Your Documents Are Ready</p>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-800">
            Hi, {data.customer?.fullName || data.order?.customerName}!
          </h2>
          <p className="text-slate-500">
            Order Reference: <span className="font-mono font-bold text-slate-700 bg-slate-200 px-2 py-0.5 rounded">{data.order?.orderNumber}</span>
          </p>
        </div>

        {/* Download Cards */}
        <div className="grid gap-4 mt-8">
          
          {/* Card 1: Customer Details */}
          <div className="bg-white rounded-2xl p-6 border shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 transition-all hover:shadow-md hover:border-blue-200 group">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                <User className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Customer Details</h3>
                <p className="text-sm text-slate-500 mt-0.5">View Customer Details & Complete Measurement Profiles</p>
              </div>
            </div>
            <button 
              onClick={() => handleDownload('customer')}
              disabled={downloading === 'customer'}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white px-6 py-3 rounded-xl font-medium shadow-sm transition-all active:scale-95"
            >
              {downloading === 'customer' ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Download className="w-5 h-5" />}
              {downloading === 'customer' ? 'Generating...' : 'Download PDF'}
            </button>
          </div>

          {/* Card 2: Order Details */}
          <div className="bg-white rounded-2xl p-6 border shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 transition-all hover:shadow-md hover:border-blue-200 group">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                <FileText className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Order Details</h3>
                <p className="text-sm text-slate-500 mt-0.5">View Order Items, Timeline, and Selected Garments</p>
              </div>
            </div>
            <button 
              onClick={() => handleDownload('order')}
              disabled={downloading === 'order'}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-900 hover:bg-black disabled:opacity-70 text-white px-6 py-3 rounded-xl font-medium shadow-sm transition-all active:scale-95"
            >
              {downloading === 'order' ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Download className="w-5 h-5" />}
              {downloading === 'order' ? 'Generating...' : 'Download PDF'}
            </button>
          </div>

          {/* Card 3: Invoice */}
          <div className="bg-white rounded-2xl p-6 border shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 transition-all hover:shadow-md hover:border-blue-200 group">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                <Receipt className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Invoice / Bill</h3>
                <p className="text-sm text-slate-500 mt-0.5">View Professional Invoice & Payment QR</p>
              </div>
            </div>
            <button 
              onClick={() => handleDownload('invoice')}
              disabled={downloading === 'invoice'}
              className={cn(
                "w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium shadow-sm transition-all active:scale-95",
                "bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-70"
              )}
            >
              {downloading === 'invoice' ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Download className="w-5 h-5" />
              )}
              {downloading === 'invoice' ? 'Generating...' : 'Download PDF'}
            </button>
          </div>

        </div>
        
        {/* Security Badge */}
        <div className="flex items-center justify-center gap-2 mt-12 text-slate-400 text-xs font-medium">
          <ShieldCheck className="w-4 h-4" />
          <span>Secure Document Portal • Hingu Tailors</span>
        </div>

      </main>
    </div>
  );
}
