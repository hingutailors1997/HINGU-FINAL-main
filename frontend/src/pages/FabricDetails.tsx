import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import Barcode from 'react-barcode';
import { 
  fetchFabricByBarcode, 
  fetchFabricHistory,
  adjustFabric,
  fetchAiConsumptionPrediction,
  deleteFabric
} from '../lib/api';
import { 
  ArrowLeft, Edit, Trash2, Printer, QrCode, 
  Scissors, Sliders, History, Archive, Share2, 
  AlertCircle, CheckCircle2
} from 'lucide-react';
import { cn } from '../lib/utils';
import UseFabricModal from '../components/modals/UseFabricModal';
import AdjustFabricModal from '../components/modals/AdjustFabricModal';
import ReserveFabricModal from '../components/modals/ReserveFabricModal';
import PrintLabelModal from '../components/modals/PrintLabelModal';

const FabricDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [showUseModal, setShowUseModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showReserveModal, setShowReserveModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState<'barcode' | 'qr' | null>(null);

  const { data: fabric, isLoading, error, refetch } = useQuery({
    queryKey: ['fabric', id],
    queryFn: () => fetchFabricByBarcode(id as string),
    enabled: !!id
  });

  const { data: historyLogs } = useQuery({
    queryKey: ['fabricHistory', id],
    queryFn: () => fetchFabricHistory(id as string),
    enabled: !!id
  });

  if (isLoading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading</div>;
  if (error || !fabric) return <div className="p-8 text-center text-red-500 flex flex-col items-center gap-2"><AlertCircle /> Fabric not found</div>;

  const handlePrint = (type: 'barcode' | 'qr') => {
    setShowPrintModal(type);
  };

  const handleUseComplete = () => {
    refetch();
    setShowUseModal(false);
    setShowAdjustModal(false);
    setShowReserveModal(false);
  };

  const handleMarkDepleted = async () => {
    if (fabric.totalAvailable <= 0) {
      alert('Fabric is already at 0 stock.');
      return;
    }
    if (window.confirm(`Are you sure you want to mark "${fabric.name}" as depleted? This will reduce stock to 0 M.`)) {
      try {
        await adjustFabric(fabric.fabricId || fabric._id, {
          qtyChange: -fabric.totalAvailable,
          reason: 'Marked Depleted / End of Roll',
          deviceUsed: 'Web ERP Dashboard'
        });
        refetch();
      } catch (err: any) {
        alert(err.response?.data?.message || 'Failed to mark depleted');
      }
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to permanently delete fabric "${fabric.name}" (${fabric.fabricId})? This action cannot be undone.`)) {
      try {
        await deleteFabric(fabric.fabricId || fabric._id);
        alert('Fabric removed successfully.');
        navigate('/stock');
      } catch (err: any) {
        alert(err.response?.data?.message || 'Failed to delete fabric. Check user role permissions.');
      }
    }
  };

  const stockStatus = fabric.status === 'Active' ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : 
                      fabric.status === 'Depleted' ? 'text-rose-600 bg-rose-50 border-rose-200' : 'text-amber-600 bg-amber-50 border-amber-200';

  return (
    <div className="space-y-6 pb-8 animate-in fade-in duration-500 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between print:hidden">
        <div className="flex items-start gap-4">
          <button 
            onClick={() => navigate(-1)} 
            className="mt-1 p-2 bg-background border rounded-lg hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold tracking-tight">{fabric.name}</h1>
              <span className={cn("px-2.5 py-1 rounded-full text-xs font-semibold border", stockStatus)}>
                {fabric.status}
              </span>
            </div>
            <p className="text-muted-foreground text-sm font-mono">{fabric.fabricId}</p>
          </div>
        </div>

        {/* Action Buttons (10 total requested) */}
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setShowUseModal(true)} className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 shadow-sm transition-all">
            <Scissors className="w-4 h-4" /> Use Stock
          </button>
          <button onClick={() => setShowReserveModal(true)} className="flex items-center gap-2 px-3 py-2 bg-background border text-sm font-medium rounded-lg hover:bg-muted shadow-sm transition-all">
            <Archive className="w-4 h-4" /> Reserve
          </button>
          <button onClick={() => setShowAdjustModal(true)} className="flex items-center gap-2 px-3 py-2 bg-background border text-sm font-medium rounded-lg hover:bg-muted shadow-sm transition-all">
            <Sliders className="w-4 h-4" /> Adjust
          </button>
          <button onClick={() => handlePrint('barcode')} className="flex items-center gap-2 px-3 py-2 bg-background border text-sm font-medium rounded-lg hover:bg-muted shadow-sm transition-all">
            <Printer className="w-4 h-4" /> Print Barcode
          </button>
          <button onClick={() => handlePrint('qr')} className="flex items-center gap-2 px-3 py-2 bg-background border text-sm font-medium rounded-lg hover:bg-muted shadow-sm transition-all">
            <QrCode className="w-4 h-4" /> Print QR
          </button>
          <button onClick={() => navigate(`/stock/edit/${fabric.fabricId || fabric._id}`, { state: { fabric } })} className="flex items-center gap-2 px-3 py-2 bg-background border text-sm font-medium rounded-lg hover:bg-muted shadow-sm transition-all">
            <Edit className="w-4 h-4" /> Edit
          </button>
          <button onClick={handleMarkDepleted} className="flex items-center gap-2 px-3 py-2 bg-background border text-sm font-medium rounded-lg hover:bg-muted shadow-sm transition-all">
            <CheckCircle2 className="w-4 h-4" /> Mark Depleted
          </button>
          <button onClick={() => { navigator.clipboard.writeText(window.location.href); alert('Fabric link copied!'); }} className="flex items-center gap-2 px-3 py-2 bg-background border text-sm font-medium rounded-lg hover:bg-muted shadow-sm transition-all">
            <Share2 className="w-4 h-4" /> Share
          </button>
          <button onClick={handleDelete} className="flex items-center gap-2 px-3 py-2 bg-rose-50 text-rose-600 border border-rose-200 text-sm font-medium rounded-lg hover:bg-rose-100 shadow-sm transition-all">
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="lg:col-span-2 space-y-6">
          {/* Main Details Card (24 Points) */}
          <div className="bg-card border rounded-xl shadow-sm overflow-hidden print:shadow-none print:border-none">
            <div className="p-6 border-b bg-muted/20">
              <h2 className="text-lg font-semibold flex items-center gap-2">Fabric Specifications</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-6">
                
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Category</p>
                  <p className="font-medium text-foreground">{fabric.category || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Material</p>
                  <p className="font-medium text-foreground">{fabric.material || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Color</p>
                  <p className="font-medium text-foreground flex items-center gap-2">
                    {fabric.color}
                    {fabric.color && <span className="w-3 h-3 rounded-full border shadow-sm" style={{ backgroundColor: fabric.color.toLowerCase() }}></span>}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Brand</p>
                  <p className="font-medium text-foreground">{fabric.brand || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Supplier Name</p>
                  <p className="font-medium text-sm text-foreground">{fabric.supplierId?.name || fabric.supplierName || fabric.partyName || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Invoice Number</p>
                  <p className="font-medium text-sm text-foreground">{fabric.invoiceNumber || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Width</p>
                  <p className="font-medium text-foreground">{fabric.width || 'N/A'}</p>
                </div>

                <div className="col-span-full my-2 border-t"></div>

                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Total Stock</p>
                  <p className="font-bold text-lg text-indigo-600">{fabric.totalAvailable} M</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Reserved Stock</p>
                  <p className="font-medium text-foreground">{fabric.reservedStock || 0} M</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Used Stock</p>
                  <p className="font-medium text-foreground">{fabric.usedStock || 0} M</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Purchase Price</p>
                  <p className="font-medium text-foreground">₹{fabric.purchasePrice || fabric.pricePerMeter || '0.00'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Selling Price / Mtr</p>
                  <p className="font-medium text-foreground">₹{fabric.sellingPrice || fabric.pricePerMeter || fabric.purchasePrice || '0.00'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Min Stock Level</p>
                  <p className="font-medium text-foreground">{fabric.minimumStock || 10} M</p>
                </div>

                <div className="col-span-full my-2 border-t"></div>

                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Warehouse</p>
                  <p className="font-medium text-foreground">{fabric.warehouse || 'Main HQ'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Rack No.</p>
                  <p className="font-medium text-foreground">{fabric.rackNumber || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Shelf No.</p>
                  <p className="font-medium text-foreground">{fabric.shelfNumber || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Lot Number</p>
                  <p className="font-medium text-foreground">{fabric.lotNumber || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Roll Number</p>
                  <p className="font-medium text-foreground">{fabric.rollNumber || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Date Added</p>
                  <p className="font-medium text-foreground">{new Date(fabric.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </div>

          {/* History Tab */}
          <div className="bg-card border rounded-xl shadow-sm overflow-hidden print:hidden">
             <div className="p-6 border-b bg-muted/20">
              <h2 className="text-lg font-semibold flex items-center gap-2">Stock History Log</h2>
            </div>
            <div className="p-0 overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
                  <tr>
                    <th className="px-6 py-3 font-medium">Date</th>
                    <th className="px-6 py-3 font-medium">Action</th>
                    <th className="px-6 py-3 font-medium">Qty Change</th>
                    <th className="px-6 py-3 font-medium">Remaining</th>
                    <th className="px-6 py-3 font-medium">Order #</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {historyLogs && historyLogs.length > 0 ? (
                    historyLogs.map((log: any) => (
                      <tr key={log._id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4">{new Date(log.date).toLocaleString()}</td>
                        <td className="px-6 py-4">
                          <span className="font-medium">{log.reason}</span>
                          {log.deviceUsed && <p className="text-[10px] text-muted-foreground mt-0.5">{log.deviceUsed}</p>}
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn("font-bold", log.qtyChange < 0 ? "text-rose-500" : "text-emerald-500")}>
                            {log.qtyChange > 0 ? '+' : ''}{log.qtyChange} M
                          </span>
                        </td>
                        <td className="px-6 py-4 font-medium">{log.qtyRemaining} M</td>
                        <td className="px-6 py-4 text-muted-foreground">{log.orderNumber || '-'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">No history logs found for this fabric.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-card border rounded-xl shadow-sm p-6 text-center print:shadow-none print:border-none print:p-0">
            <h3 className="font-semibold text-sm text-muted-foreground mb-4 uppercase tracking-wider">Scannable Tags</h3>
            
            <div className="bg-white p-4 rounded-xl shadow-inner border mb-6 inline-block print:shadow-none print:border-none">
              <QRCodeSVG 
                value={fabric.fabricId} 
                size={180} 
                level="H"
                includeMargin={false}
              />
            </div>
            
            <div className="bg-white p-4 rounded-xl shadow-inner border flex justify-center print:shadow-none print:border-none">
              <Barcode 
                value={fabric.fabricId} 
                width={1.5}
                height={60}
                fontSize={14}
                background="#ffffff"
                lineColor="#000000"
              />
            </div>
            
            <div className="mt-6 text-xs text-muted-foreground print:hidden">
              Print these codes and attach them to the fabric roll for quick scanning.
            </div>
          </div>
        </div>
      </div>

      {showUseModal && (
        <UseFabricModal 
          fabric={fabric} 
          onClose={() => setShowUseModal(false)}
          onSuccess={handleUseComplete} 
        />
      )}
      {showAdjustModal && (
        <AdjustFabricModal
          fabric={fabric}
          onClose={() => setShowAdjustModal(false)}
          onSuccess={handleUseComplete}
        />
      )}
      {showReserveModal && (
        <ReserveFabricModal
          fabric={fabric}
          onClose={() => setShowReserveModal(false)}
          onSuccess={handleUseComplete}
        />
      )}
      {showPrintModal && (
        <PrintLabelModal
          fabrics={[fabric]}
          onClose={() => setShowPrintModal(null)}
          defaultType={showPrintModal}
        />
      )}
    </div>
  );
};

export default FabricDetails;
