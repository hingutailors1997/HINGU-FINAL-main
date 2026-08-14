import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchOrderById, deleteOrder, generateShareLink, updateOrderStatus, fetchCustomerById, fetchMeasurements } from '../lib/api';
import { useToast } from '../components/Toast';
import { 
  ArrowLeft, ShoppingBag, Edit, Trash2, MessageCircle, Calendar, 
  User, Phone, Scissors, IndianRupee, Clock, CheckCircle2, AlertTriangle, Truck, Printer
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { generateCustomerMeasurementPDF } from '../lib/pdfExport';

export default function OrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const { data: order, isLoading, error } = useQuery({
    queryKey: ['order', id],
    queryFn: () => fetchOrderById(id as string),
    enabled: !!id
  });

  const handleWhatsAppShare = async () => {
    if (!order?._id) return;
    try {
      const data = await generateShareLink(order._id);
      if (data && data.phone) {
        const encodedText = encodeURIComponent(data.whatsappText);
        window.open(`https://api.whatsapp.com/send?phone=${data.phone}&text=${encodedText}`, '_blank');
      } else {
        showToast('No WhatsApp number found for this customer.', 'error');
      }
    } catch (err) {
      showToast('Failed to generate secure share link.', 'error');
    }
  };

  const handleDelete = async () => {
    if (!order?._id) return;
    if (window.confirm(`Are you sure you want to delete order ${order.orderNumber}?`)) {
      try {
        await deleteOrder(order._id);
        showToast('Order deleted successfully', 'success');
        navigate('/orders');
      } catch (err) {
        showToast('Failed to delete order', 'error');
      }
    }
  };
  
  const handleStageChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!order?._id) return;
    const newStage = e.target.value;
    try {
      await updateOrderStatus(order._id, newStage, 'Manually updated from Order Details');
      showToast(`Order status updated to ${newStage}`, 'success');
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      showToast('Failed to update status', 'error');
    }
  };

  const handlePrintMeasurements = async (item: any) => {
    if (!order) return;
    
    // Fetch latest customer details for measurements
    let activeMeasurements = item.measurements || {};
    
    // Check if item has actual populated measurements (not just empty strings from default specs)
    const hasValidMeasurements = Object.values(activeMeasurements).some(val => val !== '' && val !== null && val !== undefined);
    
    // Fallback: If no item measurements, try to fetch the latest from the customer/employee profile
    let targetId = order.customerId?._id;
    if (order.companyGroupId && item.employeeId) {
      targetId = item.employeeId._id || item.employeeId;
    }

    if (!hasValidMeasurements && targetId) {
      try {
        const measurementsData = await fetchMeasurements(targetId);
        if (measurementsData && measurementsData.active) {
          const match = measurementsData.active.find((m: any) => m.garmentType.toLowerCase() === (item.garmentType || '').toLowerCase());
          if (match && match.measurements) {
            activeMeasurements = match.measurements;
          }
        }
      } catch (err) {
        console.error("Failed to fetch latest customer measurements:", err);
      }
    }

    try {
      showToast('Generating PDF...', 'success');
      // Create a single measurement object in the array format expected by the PDF generator
      const measurementObj = {
        garmentType: item.garmentType,
        measurements: activeMeasurements,
        notes: item.notes || ''
      };
      
      let printCustomer = order.customerId;
      
      if (order.companyGroupId) {
        printCustomer = {
          companyName: order.companyGroupId.groupName,
          fullName: item.employeeName || (item.employeeId as any)?.fullName || 'Unknown Employee',
          customerCode: order.companyGroupId.groupCode || 'Corporate',
          mobile: order.companyGroupId.phone || 'N/A'
        };
      } else if (!printCustomer) {
        printCustomer = { 
          fullName: order.customerName, 
          mobile: order.customerPhone,
          customerCode: 'N/A'
        };
      }

      await generateCustomerMeasurementPDF(
        printCustomer, 
        [measurementObj],
        item.garmentType
      );
    } catch (err) {
      console.error(err);
      showToast('Failed to generate PDF', 'error');
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  if (error || !order) {
    return (
      <div className="p-8 text-center bg-card rounded-xl border">
        <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">Order Not Found</h2>
        <p className="text-muted-foreground mb-6">This order may have been deleted or does not exist.</p>
        <button onClick={() => navigate('/orders')} className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium">Go Back to Orders</button>
      </div>
    );
  }

  const isDelivered = ['Delivered', 'Completed'].includes(order.currentStage);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <button 
          onClick={() => navigate(-1)}
          className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </button>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleWhatsAppShare}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
          </button>
          <button 
            onClick={() => navigate(`/orders/edit/${order._id}`)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors"
          >
            <Edit className="w-3.5 h-3.5" /> Edit
          </button>
          <button 
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
        </div>
      </div>

      {/* Main Order Header */}
      <div className="bg-card rounded-xl border shadow-sm p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-black tracking-tight">{order.orderNumber}</h1>
            <span className={cn(
              "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm",
              isDelivered ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
            )}>
              {order.currentStage || 'Order Created'}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground font-medium">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              Created: {format(new Date(order.createdAt), 'MMM dd, yyyy')}
            </div>
            <div className="flex items-center gap-1.5 text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
              <Clock className="w-4 h-4" />
              Due: {order.dueDate ? format(new Date(order.dueDate), 'MMM dd, yyyy') : 'Unscheduled'}
            </div>
          </div>
        </div>
        
        <div className="flex flex-col items-end">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Total Order Value</p>
          <p className="text-3xl font-black text-foreground flex items-center">
            <IndianRupee className="w-6 h-6 mr-1" />
            {(order.totalAmount || 0).toLocaleString()}
          </p>
          <div className="mt-2 text-xs font-semibold bg-muted px-3 py-1 rounded-md">
            Priority: <span className={order.priority === 'Urgent' ? 'text-rose-600 font-bold' : ''}>{order.priority || 'Normal'}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Customer Details */}
        <div className="col-span-1 bg-card rounded-xl border shadow-sm p-6 space-y-4">
          <h3 className="font-bold text-lg flex items-center gap-2 border-b pb-3">
            <User className="w-5 h-5 text-primary" /> {order.companyGroupId ? 'Corporate Group Info' : 'Customer Info'}
          </h3>
          {order.companyGroupId ? (
            <div 
              className="group cursor-pointer hover:bg-muted/50 p-3 -mx-3 rounded-lg transition-colors"
              onClick={() => navigate(`/customers/group/${order.companyGroupId._id}`)}
            >
              <div className="flex items-center gap-2">
                <p className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">{order.companyGroupId.groupName}</p>
                <span className="px-1.5 py-0.5 rounded bg-blue-100 text-[10px] uppercase tracking-wider font-black text-blue-800">Corporate</span>
              </div>
              <div className="flex flex-col gap-1.5 mt-3 text-muted-foreground text-sm font-medium">
                {order.items && order.items.length > 0 && order.items[0].employeeId && (
                  <div className="flex items-center gap-2 text-slate-700 bg-slate-100 p-2 rounded-md -mx-1 border border-slate-200">
                    <User className="w-4 h-4 text-slate-500" />
                    <span>Employee: <strong className="text-foreground">{order.items[0].employeeName || (order.items[0].employeeId as any).fullName || 'Unknown Employee'}</strong></span>
                  </div>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <Phone className="w-4 h-4" />
                  {order.companyGroupId.phone || 'No Phone'}
                </div>
              </div>
              <p className="text-xs text-primary mt-2 font-semibold">View Corporate Profile &rarr;</p>
            </div>
          ) : order.customerId ? (
            <div 
              className="group cursor-pointer hover:bg-muted/50 p-3 -mx-3 rounded-lg transition-colors"
              onClick={() => navigate(`/customers/${order.customerId._id}`)}
            >
              <p className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">{order.customerId.fullName || order.customerName}</p>
              <div className="flex items-center gap-2 mt-2 text-muted-foreground text-sm font-medium">
                <Phone className="w-4 h-4" />
                {order.customerId.mobile || order.customerPhone}
              </div>
              <p className="text-xs text-primary mt-2 font-semibold">View Full Profile &rarr;</p>
            </div>
          ) : (
            <div>
              <p className="font-bold text-lg">{order.customerName || 'Unknown Customer'}</p>
              <div className="flex items-center gap-2 mt-2 text-muted-foreground text-sm font-medium">
                <Phone className="w-4 h-4" />
                {order.customerPhone || 'No Phone'}
              </div>
            </div>
          )}
          {/* Update Stage Removed as per requirements */}
        </div>

        {/* Order Items */}
        <div className="col-span-1 md:col-span-2 bg-card rounded-xl border shadow-sm p-6">
          <h3 className="font-bold text-lg flex items-center gap-2 border-b pb-3 mb-4">
            <ShoppingBag className="w-5 h-5 text-primary" /> Order Items ({order.items?.length || 0})
          </h3>
          
          <div className="space-y-4">
            {order.items?.map((item: any, idx: number) => (
              <div key={idx} className="bg-slate-50/50 rounded-lg border p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center gap-3">
                      <h4 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                        {item.garmentType || 'Custom Garment'}
                        {item.employeeId && (
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 border text-xs font-semibold text-slate-600 flex items-center gap-1 shadow-sm">
                            <User className="w-3 h-3" /> {item.employeeId.fullName}
                          </span>
                        )}
                      </h4>
                      <button 
                        onClick={() => handlePrintMeasurements(item)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 bg-primary/10 px-2 py-1 rounded transition-colors"
                        title="Print Measurements"
                      >
                        <Printer className="w-3.5 h-3.5" /> Print Measurement
                      </button>
                    </div>
                    <p className="text-sm text-slate-500 font-medium mt-1">Quantity: {item.quantity || 1}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-800">₹{(item.totalPrice || item.unitPrice * (item.quantity || 1) || 0).toLocaleString()}</p>
                    <p className="text-xs text-slate-400 mt-0.5">₹{(item.unitPrice || 0).toLocaleString()} each</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-200">
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Measurements</p>
                    <div className="text-sm font-medium text-slate-700 bg-white p-3 rounded border shadow-sm">
                      {item.measurements && Object.keys(item.measurements).length > 0 ? (
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                          {Object.entries(item.measurements).map(([key, val]) => (
                            <div key={key} className="flex justify-between items-center border-b border-slate-100 pb-1">
                              <span className="text-slate-500 text-xs capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                              <strong className="text-slate-800">{String(val) || '-'}</strong>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Scissors className="w-4 h-4 text-slate-400" />
                          <span className="italic text-slate-500">Standard Sizing</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Fabric & Style Notes</p>
                    <p className="text-sm font-medium text-slate-700 bg-white p-3 rounded border shadow-sm whitespace-pre-wrap">
                      {item.notes || 'No specific notes'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            
            {(!order.items || order.items.length === 0) && (
              <p className="text-center text-muted-foreground py-8">No items found in this order.</p>
            )}
          </div>
        </div>
      </div>

      {/* Financials Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border shadow-sm p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Subtotal</p>
            <p className="text-xl font-black mt-1">₹{(order.totalAmount || 0).toLocaleString()}</p>
          </div>
          <div className="h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center">
            <IndianRupee className="w-5 h-5 text-slate-500" />
          </div>
        </div>
        <div className="bg-card rounded-xl border shadow-sm p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-emerald-600/70 uppercase tracking-wider">Advance Paid</p>
            <p className="text-xl font-black mt-1 text-emerald-600">₹{(order.advancePaid || 0).toLocaleString()}</p>
          </div>
          <div className="h-10 w-10 bg-emerald-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
        </div>
        <div className={cn("rounded-xl border shadow-sm p-5 flex items-center justify-between", order.balanceAmount > 0 ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200")}>
          <div>
            <p className={cn("text-xs font-bold uppercase tracking-wider", order.balanceAmount > 0 ? "text-amber-700/70" : "text-emerald-700/70")}>
              Remaining Balance
            </p>
            <p className={cn("text-xl font-black mt-1", order.balanceAmount > 0 ? "text-amber-700" : "text-emerald-700")}>
              ₹{(order.balanceAmount || 0).toLocaleString()}
            </p>
          </div>
          <div className={cn("h-10 w-10 rounded-full flex items-center justify-center", order.balanceAmount > 0 ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600")}>
            {order.balanceAmount > 0 ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
          </div>
        </div>
      </div>
    </div>
  );
}
