import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchOrderById, deleteOrder, generateShareLink, updateOrderStatus, fetchCustomerById, fetchMeasurements, updateOrder } from '../lib/api';
import { useToast } from '../components/Toast';
import { 
  ArrowLeft, ShoppingBag, Edit, Trash2, MessageCircle, Calendar, 
  User, Phone, Scissors, IndianRupee, Clock, CheckCircle2, AlertTriangle, Truck, Printer, X
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { generateCustomerMeasurementPDF } from '../lib/pdfExport';

export default function OrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  
  const { data: order, isLoading, error } = useQuery({
    queryKey: ['order', id],
    queryFn: () => fetchOrderById(id as string),
    enabled: !!id
  });

  const paymentMutation = useMutation({
    mutationFn: async () => {
      if (!order || !paymentAmount) return;
      const newAdvance = (order.advancePaid || 0) + Number(paymentAmount);
      return await updateOrder(order._id, { 
        advancePaid: newAdvance,
        paymentMethod: paymentMethod,
        totalAmount: order.totalAmount,
        discount: order.discount
      });
    },
    onSuccess: () => {
      showToast('Payment recorded successfully', 'success');
      setIsPaymentModalOpen(false);
      setPaymentAmount('');
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
    onError: () => {
      showToast('Failed to record payment', 'error');
    }
  });

  const handleWhatsAppShare = async () => {
    if (!order?._id) return;
    try {
      const data = await generateShareLink(order._id);
      if (data && data.phone) {
        const encodedText = encodeURIComponent(data.whatsappText);
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        const waLink = isIOS 
          ? `whatsapp://send?phone=${data.phone}&text=${encodedText}` 
          : `https://wa.me/${data.phone}?text=${encodedText}`;
        window.open(waLink, '_blank');
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
        let match = null;

        // 1. First attempt to use the exact historical version locked to this order
        if (measurementsData && measurementsData.history && item.measurementVersionId) {
          match = measurementsData.history.find((m: any) => m._id === item.measurementVersionId);
        }

        // 2. Fallback to active measurements if no specific version was linked
        if (!match && measurementsData && measurementsData.active) {
          match = measurementsData.active.find((m: any) => m.garmentType.toLowerCase() === (item.garmentType || '').toLowerCase());
          
          if (!match) {
            const lowerGarment = (item.garmentType || '').toLowerCase();
            const fuzzyMap: Record<string, string> = {
              'shirt': 'Shirt',
              'pant': 'Pant',
              'kurta': 'Kurta',
              'sherwani': 'Sherwani',
              'blazer': 'Blazer',
              'coat': 'Coat',
              'suit': 'Suit',
              'waistcoat': 'Waistcoat',
              'jacket': 'Jacket',
              't-shirt': 'T-Shirt',
              'safari': 'Safari',
              'pathani': 'Pathani'
            };
            
            for (const [key, baseType] of Object.entries(fuzzyMap)) {
              if (lowerGarment.includes(key)) {
                match = measurementsData.active.find((m: any) => m.garmentType === baseType);
                if (match) break;
              }
            }
          }
        }

        if (match && match.measurements) {
          activeMeasurements = match.measurements;
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
    <>
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
                          {Object.entries(item.measurements)
                            .filter(([_, val]) => val !== '' && val != null)
                            .map(([key, val]) => (
                            <div key={key} className="flex justify-between items-center border-b border-slate-100 pb-1">
                              <span className="text-slate-500 text-xs capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                              <strong className="text-slate-800">{String(val)}</strong>
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
          <div className="flex items-center gap-2">
            {order.advancePaid > 0 && (
              <button 
                onClick={() => {
                  setPaymentAmount(-(order.advancePaid || 0));
                  setIsPaymentModalOpen(true);
                }}
                className="h-10 w-10 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-full flex items-center justify-center transition-colors"
                title="Undo Payment (Refund)"
              >
                <Trash2 className="w-4 h-4 text-rose-600" />
              </button>
            )}
            <div className="h-10 w-10 bg-emerald-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
        </div>
        <div className={cn("rounded-xl border shadow-sm p-5 flex flex-col justify-center", order.balanceAmount > 0 ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200")}>
          <div className="flex items-center justify-between w-full">
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
          {order.balanceAmount > 0 && (
            <button 
              onClick={() => setIsPaymentModalOpen(true)}
              className="mt-4 w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <IndianRupee className="w-3.5 h-3.5" /> Record New Payment
            </button>
          )}
        </div>
      </div>
    </div>

      {/* Payment Modal */}
      {isPaymentModalOpen && order && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-card rounded-xl shadow-xl overflow-hidden animate-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between p-4 border-b bg-muted/20">
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <IndianRupee className="w-5 h-5 text-amber-600" /> Record Payment
              </h2>
              <button onClick={() => setIsPaymentModalOpen(false)} className="p-1 hover:bg-muted rounded-md transition-colors text-muted-foreground">
                <span className="sr-only">Close</span>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4 mb-2 p-4 bg-muted/30 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground font-semibold">Total Amount</p>
                  <p className="font-bold">₹{order.totalAmount?.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-semibold">Remaining Balance</p>
                  <p className="font-bold text-amber-600">₹{order.balanceAmount?.toLocaleString()}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">{Number(paymentAmount) < 0 ? 'Refund / Reversal Amount (₹)' : 'Payment Amount Received (₹)'}</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="0.00"
                  max={order.balanceAmount}
                  min={-(order.advancePaid || 0)}
                />
                {Number(paymentAmount) < 0 && <p className="text-xs text-rose-500 mt-1">This will refund the amount and increase the customer's pending balance.</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI (GPay/PhonePe)</option>
                  <option value="Card">Card</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>
            </div>
            
            <div className="p-4 border-t bg-muted/10 flex justify-end gap-2">
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="px-4 py-2 border rounded-md text-sm font-medium hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => paymentMutation.mutate()}
                disabled={paymentAmount === '' || paymentAmount === 0 || Number(paymentAmount) > order.balanceAmount || Number(paymentAmount) < -(order.advancePaid || 0) || paymentMutation.isPending}
                className={cn("px-4 py-2 text-white rounded-md text-sm font-bold transition-colors disabled:opacity-50", Number(paymentAmount) < 0 ? "bg-rose-600 hover:bg-rose-700" : "bg-amber-600 hover:bg-amber-700")}
              >
                {paymentMutation.isPending ? 'Saving...' : Number(paymentAmount) < 0 ? 'Confirm Refund' : 'Confirm Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
