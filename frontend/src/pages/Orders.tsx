import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { 
  ShoppingBag, Plus, Search, Filter,
  ChevronRight, ChevronDown, AlertCircle, Clock, MessageCircle, Edit, Trash2, CheckCircle2, User, Folder, FolderOpen, FileText
} from 'lucide-react';
import { fetchOrders, deleteOrder, generateShareLink, updateOrderStatus } from '../lib/api';
import { cn } from '../lib/utils';

export default function Orders() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});

  const toggleFolder = (groupId: string) => {
    setOpenFolders(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const { data: orders = [], isLoading, error } = useQuery({
    queryKey: ['orders'],
    queryFn: () => fetchOrders()
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Urgent':
      case 'Express Wedding':
        return 'text-rose-700 bg-rose-100 border-rose-200';
      case 'High':
        return 'text-amber-700 bg-amber-100 border-amber-200';
      default:
        return 'text-slate-700 bg-slate-100 border-slate-200';
    }
  };

  const getStageColor = (stage: string) => {
    if (stage === 'Delivered' || stage === 'Completed') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (stage === 'Order Created') return 'bg-blue-100 text-blue-700 border-blue-200';
    return 'bg-indigo-100 text-indigo-700 border-indigo-200';
  };

  const handleWhatsAppShare = async (e: React.MouseEvent, orderId: string) => {
    e.stopPropagation();
    try {
      const data = await generateShareLink(orderId);
      if (data) {
        const { whatsappText, phone } = data;
        
        if (!phone) {
          alert('No WhatsApp number found for this customer.');
          return;
        }

        const encodedText = encodeURIComponent(whatsappText);
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        const waLink = isIOS 
          ? `whatsapp://send?phone=${phone}&text=${encodedText}` 
          : `https://wa.me/${phone}?text=${encodedText}`;
        
        if (isIOS) {
          window.location.href = waLink;
        } else {
          window.open(waLink, '_blank');
        }
      }
    } catch (err) {
      console.error(err);
      alert('Failed to generate secure share link.');
    }
  };

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>, orderId: string) => {
    e.stopPropagation();
    const newStage = e.target.value === 'Done' ? 'Completed' : 'Order Created';
    try {
      await updateOrderStatus(orderId, newStage);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    } catch (err) {
      alert('Failed to update status');
    }
  };

  // Group orders similarly to Invoices
  let groupedOrders: any[] = [];
  
  if (Array.isArray(orders)) {
    const groups: Record<string, any> = {};
    
    orders.forEach((order: any) => {
      let groupId = '';
      let groupTitle = '';
      let groupSubtitle = '';
      let isCorporate = false;
      
      if (order.companyGroupId) {
        groupId = order.companyGroupId._id || order.companyGroupId;
        groupTitle = order.companyGroupId.groupName || 'Corporate Group';
        groupSubtitle = order.companyGroupId.phone || 'Corporate Account';
        isCorporate = true;
      } else {
        const rawName = order.customerId?.fullName || order.customerName || 'Unknown Customer';
        groupTitle = rawName;
        groupSubtitle = order.customerId?.mobile || order.customerPhone || 'No Phone';
        groupId = order.customerId?._id || groupSubtitle;
        isCorporate = false;
      }
      
      if (!groups[groupId]) {
        groups[groupId] = {
          groupId,
          groupTitle,
          groupSubtitle,
          isCorporate,
          orders: []
        };
      }
      
      groups[groupId].orders.push(order);
    });
    
    const groupedArray = Object.values(groups);
    groupedArray.sort((a, b) => a.groupTitle.localeCompare(b.groupTitle));
    
    groupedOrders = groupedArray.filter(g => {
      if (!searchTerm) return true;
      const lowerSearch = searchTerm.toLowerCase();
      // match group/customer name
      if (g.groupTitle.toLowerCase().includes(lowerSearch)) return true;
      // match group/customer mobile
      if (g.groupSubtitle.toLowerCase().includes(lowerSearch)) return true;
      // match order numbers
      return g.orders.some((o: any) => 
        o.orderNumber?.toLowerCase().includes(lowerSearch) ||
        (o.items && o.items.some((item: any) => 
          (item.employeeName?.toLowerCase() || '').includes(lowerSearch) || 
          (item.employeeId?.fullName?.toLowerCase() || '').includes(lowerSearch)
        ))
      );
    });
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ShoppingBag className="h-6 w-6 text-primary" />
            Orders Management
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Track and manage customer orders across the workflow.</p>
        </div>
        <button 
          onClick={() => navigate('/orders/new')}
          className="w-full sm:w-auto inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 shadow-sm transition-colors"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create New Order
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card p-4 rounded-xl border shadow-sm">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by order number or customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground bg-card rounded-xl border border-dashed">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
          <p>Loading</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-destructive/10 text-destructive rounded-lg border border-destructive/20 flex items-center gap-3">
          <AlertCircle className="h-5 w-5" />
          <p>Error loading orders. Please try again.</p>
        </div>
      ) : groupedOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-card rounded-xl border border-dashed shadow-sm">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <ShoppingBag className="h-8 w-8 text-primary/60" />
          </div>
          <h3 className="text-lg font-semibold mb-1">No Orders Found</h3>
          <p className="text-muted-foreground text-sm max-w-sm mb-6">
            {searchTerm ? 'No orders match your search criteria.' : 'You haven\'t created any orders yet. Start by creating your first order.'}
          </p>
          {!searchTerm && (
            <button 
              onClick={() => navigate('/orders/new')}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 shadow-sm transition-colors"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create First Order
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {groupedOrders.map((group, idx) => (
            <div key={idx} className="bg-card rounded-xl border shadow-sm overflow-hidden">
              {/* Folder Header */}
              <div 
                className={`bg-muted/30 px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors border-b`}
                onClick={() => toggleFolder(group.groupId)}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${group.isCorporate ? 'bg-blue-100 text-blue-600' : 'bg-primary/10 text-primary'}`}>
                    {group.isCorporate ? (openFolders[group.groupId] ? <FolderOpen className="w-5 h-5" /> : <Folder className="w-5 h-5" />) : <User className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      {group.groupTitle} 
                      {group.isCorporate && (
                        <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Corporate</span>
                      )}
                    </h3>
                    <p className="text-sm text-muted-foreground">{group.groupSubtitle} • {group.orders.length} Order(s)</p>
                  </div>
                </div>
                <div className="text-muted-foreground">
                  {openFolders[group.groupId] ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                </div>
              </div>
              
              {/* Nested Orders List */}
              {openFolders[group.groupId] && (
                <div className="overflow-x-auto divide-y divide-border">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted/10 text-muted-foreground uppercase text-[10px] tracking-wider font-semibold">
                      <tr>
                        <th className="px-6 py-4 w-[25%]">Order Details</th>
                        <th className="px-6 py-4 w-[25%]">{group.isCorporate ? 'Employee' : 'Customer'}</th>
                        <th className="px-6 py-4 w-[20%]">Status & Timeline</th>
                        <th className="px-6 py-4 w-[15%] text-center">Progress</th>
                        <th className="px-6 py-4 w-[15%] text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-card">
                      {group.orders.map((order: any) => (
                        <tr 
                          key={order._id || order.orderNumber}
                          className="hover:bg-muted/20 transition-colors group cursor-pointer"
                          onClick={() => navigate(`/orders/${order._id}`)}
                        >
                          <td className="px-6 py-4">
                            <div className="font-semibold text-foreground">{order.orderNumber}</div>
                            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                              <span className={cn("px-2 py-0.5 rounded-full border text-[10px] font-medium", getPriorityColor(order.priority))}>
                                {order.priority || 'Normal'}
                              </span>
                              <span>• {order.items?.length || 0} items</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {group.isCorporate ? (
                              <>
                                <div className="font-medium text-slate-700 flex items-center gap-1.5">
                                  <User className="w-3.5 h-3.5 text-slate-400" />
                                  {order.items && order.items.length > 0 && order.items[0].employeeId ? (
                                    order.items[0].employeeName || (order.items[0].employeeId as any).fullName || 'Unknown Employee'
                                  ) : (
                                    'Unknown Employee'
                                  )}
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="font-medium">
                                  {order.customerId?.fullName || 
                                   (order.customerName && !order.customerName.includes('undefined') ? order.customerName : 'Unknown Customer')}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {order.customerId?.mobile || order.customerPhone || 'N/A'}
                                </div>
                              </>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className={cn("px-2.5 py-1 rounded-full border text-xs font-semibold shadow-sm", getStageColor(order.currentStage))}>
                                {order.currentStage || 'Order Created'}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5" />
                              Due: {order.dueDate ? format(new Date(order.dueDate), 'MMM dd, yyyy') : 'Unscheduled'}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <select 
                              value={['Ready', 'Delivered', 'Completed'].includes(order.currentStage) ? 'Done' : 'Not Done'}
                              onChange={(e) => handleStatusChange(e, order._id)}
                              className={cn(
                                "text-xs font-bold rounded-full px-2.5 py-1 cursor-pointer border shadow-sm transition-colors text-center appearance-none",
                                ['Ready', 'Delivered', 'Completed'].includes(order.currentStage)
                                  ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                                  : "bg-amber-100 text-amber-700 border-amber-200"
                              )}
                              style={{ textAlignLast: 'center' }}
                            >
                              <option value="Not Done" className="bg-background text-foreground font-semibold">Not Done</option>
                              <option value="Done" className="bg-background text-foreground font-semibold">Done</option>
                            </select>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2 transition-opacity">
                              <button 
                                onClick={(e) => handleWhatsAppShare(e, order._id)}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors"
                                title="Share on WhatsApp"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/orders/edit/${order._id}`);
                                }}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                title="Edit Order"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button 
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (window.confirm(`Are you sure you want to delete order ${order.orderNumber}?`)) {
                                    try {
                                      await deleteOrder(order._id);
                                      queryClient.invalidateQueries({ queryKey: ['orders'] });
                                      queryClient.invalidateQueries({ queryKey: ['invoices'] });
                                    } catch (err) {
                                      alert('Failed to delete order');
                                    }
                                  }
                                }}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                                title="Delete Order"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
