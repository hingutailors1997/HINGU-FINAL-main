import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchInvoices, fetchSettings, generateShareLink, fetchGroups } from '../lib/api';
import { generateInvoicePdf } from '../lib/pdf/invoicePdf';
import { getLogoBase64 } from '../lib/pdf/logoLoader';
import { useToast } from '../components/Toast';
import { FileText, Download, Link as LinkIcon, User, Calendar, IndianRupee, Loader2, Copy, MessageCircle, Search, Folder, FolderOpen, ChevronDown, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

export default function Invoices() {
  const { showToast } = useToast();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});

  const toggleFolder = (groupId: string) => {
    setOpenFolders(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: fetchInvoices
  });

  const { data: settings = {} } = useQuery({
    queryKey: ['settings'],
    queryFn: fetchSettings
  });

  const { data: allGroups = [] } = useQuery({
    queryKey: ['groups'],
    queryFn: fetchGroups // Re-using existing function from api.ts
  });

  // Group invoices by customer or corporate group
  const groupedInvoices = useMemo(() => {
    const groups: Record<string, { groupTitle: string; groupSubtitle: string; isCorporate: boolean; invoices: any[] }> = {};
    
    invoices.forEach((inv: any) => {
      const customerObj = inv.customerId;
      const orderObj = inv.orderId;
      
      const corporateGroupId = customerObj?.companyGroupId?._id || customerObj?.companyGroupId || orderObj?.companyGroupId;
      
      let groupId, groupTitle, groupSubtitle, isCorporate;
      
      if (corporateGroupId) {
        groupId = typeof corporateGroupId === 'object' ? corporateGroupId._id : corporateGroupId;
        const foundGroup = allGroups.find((g: any) => g._id === groupId);
        
        groupTitle = foundGroup ? `${foundGroup.groupName}` : (customerObj?.companyGroupId?.groupName || 'Corporate Group');
        groupSubtitle = foundGroup?.mobile || customerObj?.companyGroupId?.mobile || 'Corporate Account';
        isCorporate = true;
      } else {
        const rawName = customerObj?.fullName 
          ? customerObj.fullName.trim()
          : orderObj?.customerName;
        
        groupTitle = rawName || 'Unknown Customer';
        groupSubtitle = customerObj?.mobile || orderObj?.customerPhone || 'No Phone';
        groupId = customerObj?._id || groupSubtitle;
        isCorporate = false;
      }
      
      if (!groups[groupId]) {
        groups[groupId] = {
          groupId,
          groupTitle,
          groupSubtitle,
          isCorporate,
          invoices: []
        };
      }
      
      // Store individual employee name for display in corporate groups
      let employeeName = 'Unknown Employee';
      if (isCorporate && orderObj?.items?.length > 0 && orderObj.items[0].employeeId) {
        employeeName = orderObj.items[0].employeeName || orderObj.items[0].employeeId.fullName || 'Unknown Employee';
      } else {
        employeeName = customerObj?.fullName?.trim() || orderObj?.customerName || 'Unknown Employee';
      }
      
      inv._employeeName = employeeName;
      
      groups[groupId].invoices.push(inv);
    });
    
    const groupedArray = Object.values(groups);
    groupedArray.sort((a, b) => a.groupTitle.localeCompare(b.groupTitle));
    
    const filteredGroups = groupedArray.filter(g => {
      if (!searchTerm) return true;
      const lowerSearch = searchTerm.toLowerCase();
      // match group/customer name
      if (g.groupTitle.toLowerCase().includes(lowerSearch)) return true;
      // match group/customer mobile
      if (g.groupSubtitle.includes(lowerSearch)) return true;
      // match invoice numbers, order numbers, or employee names
      return g.invoices.some(inv => 
        inv.invoiceNumber?.toLowerCase().includes(lowerSearch) ||
        inv.orderId?.orderNumber?.toLowerCase().includes(lowerSearch) ||
        (g.isCorporate && inv._employeeName.toLowerCase().includes(lowerSearch))
      );
    });

    return filteredGroups;
  }, [invoices, searchTerm, allGroups]);

  const handleDownloadPdf = async (invoice: any) => {
    try {
      setDownloadingId(invoice._id);
      const logoBase64 = await getLogoBase64();
      
      const pdfData = {
        invoice,
        order: invoice.orderId,
        customer: invoice.customerId,
        logoBase64,
        settings
      };
      
      await generateInvoicePdf(pdfData);
      showToast('Invoice PDF generated successfully', 'success');
    } catch (error) {
      console.error('Failed to generate PDF', error);
      showToast('Failed to generate invoice PDF', 'error');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleWhatsAppShare = async (orderId: string) => {
    if (!orderId) {
      showToast('Order reference missing for this invoice', 'error');
      return;
    }
    try {
      const data = await generateShareLink(orderId);
      if (data) {
        const { whatsappText, phone } = data;
        if (!phone) {
          showToast('No WhatsApp number found for this customer.', 'error');
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
      showToast('Failed to generate secure share link.', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground mt-1">
            View and manage customer bills and invoices.
          </p>
        </div>
        
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search by name, invoice, or order..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-background border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : groupedInvoices.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-lg border border-dashed">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground opacity-50 mb-4" />
          <h3 className="text-lg font-medium text-foreground">No invoices found</h3>
          <p className="text-sm text-muted-foreground">Generated invoices will appear here.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {groupedInvoices.map((group, idx) => (
            <div key={idx} className="bg-card rounded-xl border shadow-sm overflow-hidden">
              {/* Customer Header */}
              <div 
                className={`bg-muted/30 px-6 py-4 flex items-center justify-between ${group.isCorporate ? 'cursor-pointer hover:bg-muted/50 transition-colors' : 'border-b'}`}
                onClick={() => group.isCorporate && toggleFolder(group.groupId)}
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
                    <p className="text-sm text-muted-foreground">{group.groupSubtitle} • {group.invoices.length} Invoice(s)</p>
                  </div>
                </div>
                {group.isCorporate && (
                  <div className="text-muted-foreground">
                    {openFolders[group.groupId] ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  </div>
                )}
              </div>
              
              {/* Invoices List */}
              {(!group.isCorporate || openFolders[group.groupId]) && (
                <div className={group.isCorporate ? "divide-y border-t" : "divide-y"}>
                {group.invoices.map(invoice => (
                  <div key={invoice._id} className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-muted/10 transition-colors">
                    
                    <div className="flex-1 grid grid-cols-2 sm:grid-cols-5 gap-4 w-full items-center">
                      <div className="sm:col-span-2">
                        <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Invoice No</p>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{invoice.invoiceNumber}</p>
                          {group.isCorporate && (
                            <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-semibold border truncate max-w-[120px]">
                              👤 {invoice._employeeName}
                            </span>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Order Ref</p>
                        <p className="font-medium text-primary">{invoice.orderId?.orderNumber}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Date</p>
                        <div className="flex items-center gap-1.5 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                          {invoice.issueDate ? format(new Date(invoice.issueDate), 'dd MMM yyyy') : 'N/A'}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Amount</p>
                        <div className="flex items-center gap-1 font-semibold text-green-600">
                          <IndianRupee className="w-4 h-4" />
                          {invoice.totalAmount}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 w-full md:w-auto">
                      <button
                        onClick={() => handleWhatsAppShare(invoice.orderId?._id)}
                        title="Share on WhatsApp"
                        className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 h-9 px-4 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md text-sm font-medium transition-colors"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>WhatsApp</span>
                      </button>
                      
                      <button
                        onClick={() => handleDownloadPdf(invoice)}
                        disabled={downloadingId === invoice._id}
                        className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 h-9 px-4 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                        {downloadingId === invoice._id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                        <span>Download PDF</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
