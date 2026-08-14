import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Package, Plus, Search, Filter, AlertTriangle, 
  ArrowDownToLine, History, QrCode, Printer, X, ScanBarcode, Camera, ChevronLeft, ChevronRight, Trash2, CheckSquare
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchInventoryPaginated, deleteFabric } from '../lib/api';
import { useGlobalSearch } from '../contexts/GlobalSearchContext';
import Scanner from '../components/Scanner';
import { useToast } from '../components/Toast';
import PrintLabelModal from '../components/modals/PrintLabelModal';

export default function Stock() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { globalSearch: searchTerm, setGlobalSearch: setSearchTerm } = useGlobalSearch();
  const [page, setPage] = useState(1);
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [selectedFabric, setSelectedFabric] = useState<any>(null);
  const [printFormat, setPrintFormat] = useState<'thermal' | 'a4'>('thermal');
  const [isScanning, setIsScanning] = useState(false);
  const [selectedForPrint, setSelectedForPrint] = useState<Set<string>>(new Set());
  const [showPrintModal, setShowPrintModal] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  const { data: inventoryData, isLoading } = useQuery({
    queryKey: ['inventoryPaginated', page, searchTerm, lowStockOnly],
    queryFn: () => fetchInventoryPaginated({ page, limit: 25, search: searchTerm, lowStockOnly })
  });

  const stock = inventoryData?.fabrics || [];
  const totalValue = inventoryData?.totalValue || 0;
  const lowStockCount = inventoryData?.lowStockCount || 0;
  const activeBarcodes = inventoryData?.totalFabrics || 0;
  const totalPages = inventoryData?.totalPages || 1;

  const handleScan = (barcode: string) => {
    setIsScanning(false);
    navigate(`/stock/${barcode}`);
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFabric(id),
    onSuccess: () => {
      toast('Fabric item removed from database!', 'success');
      queryClient.invalidateQueries({ queryKey: ['inventoryPaginated'] });
    },
    onError: (err: any) => {
      toast(err.response?.data?.message || 'Failed to delete fabric item', 'error');
    }
  });

  const handleDelete = (e: React.MouseEvent, idOrBarcode: string, name: string) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete fabric "${name}" (${idOrBarcode})?`)) {
      deleteMutation.mutate(idOrBarcode);
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedForPrint);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedForPrint(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedForPrint.size === stock.length && stock.length > 0) {
      setSelectedForPrint(new Set());
    } else {
      setSelectedForPrint(new Set(stock.map((s: any) => s.fabricId || s._id)));
    }
  };

  const selectedFabricsData = stock.filter((s: any) => selectedForPrint.has(s.fabricId || s._id));


  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fabric Inventory & Barcodes</h1>
          <p className="text-muted-foreground">Manage stock and generate printable barcode/QR labels.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {selectedForPrint.size > 0 && (
            <button 
              onClick={() => setShowPrintModal(true)}
              className="flex-1 sm:flex-none inline-flex items-center justify-center rounded-md text-sm font-medium bg-indigo-100 text-indigo-700 hover:bg-indigo-200 h-10 px-4 py-2 transition-colors border border-indigo-200 whitespace-nowrap"
            >
              <Printer className="mr-2 h-4 w-4" />
              Print Selected ({selectedForPrint.size})
            </button>
          )}
          <button 
            onClick={() => setIsScanning(true)}
            className="flex-1 sm:flex-none inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-muted h-10 px-4 py-2 transition-colors whitespace-nowrap"
          >
            <ScanBarcode className="mr-2 h-4 w-4" />
            Scan Fabric
          </button>
          <button 
            onClick={() => navigate('/stock/new')}
            className="flex-1 sm:flex-none inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 shadow-sm transition-colors whitespace-nowrap"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Fabric
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Total Inventory Value</h3>
          <div className="text-3xl font-bold">₹{totalValue.toLocaleString()}</div>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Low Stock Alerts</h3>
          <div className="flex items-center gap-2">
            <div className={cn("text-3xl font-bold", lowStockCount > 0 ? "text-rose-500" : "text-emerald-500")}>
              {lowStockCount}
            </div>
            <span className="text-sm text-muted-foreground">items</span>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Active Barcodes</h3>
          <div className="flex items-center gap-2">
            <div className="text-3xl font-bold">{activeBarcodes.toLocaleString()}</div>
            <span className="text-sm text-muted-foreground">rolls tracked</span>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow-sm flex flex-col overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between gap-4 bg-muted/20">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search fabric by SKU, Barcode, Brand, or Color..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-md border border-input bg-background pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
          </div>
          <button 
            onClick={() => setLowStockOnly(!lowStockOnly)}
            className={cn(
              "inline-flex items-center justify-center rounded-md text-sm font-medium border h-9 px-3 transition-colors",
              lowStockOnly ? "bg-rose-50 border-rose-300 text-rose-600" : "border-input bg-background hover:bg-muted"
            )}
          >
            <Filter className="mr-2 h-4 w-4" />
            {lowStockOnly ? "Showing Low Stock" : "All Stock"}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/40 border-b">
              <tr>
                <th className="px-6 py-4 w-12">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded border-input text-primary focus:ring-primary"
                    checked={stock.length > 0 && selectedForPrint.size === stock.length}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="px-6 py-4 font-medium">Fabric Details</th>
                <th className="px-6 py-4 font-medium">Supplier</th>
                <th className="px-6 py-4 font-medium text-right">Price/mtr</th>
                <th className="px-6 py-4 font-medium text-center">Stock</th>
                <th className="px-6 py-4 font-medium text-right">Labels & Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    Loading
                  </td>
                </tr>
              )}
              {!isLoading && stock.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    No fabric found in inventory matching criteria.
                  </td>
                </tr>
              )}
              {!isLoading && stock.map((item: any) => (
                <tr key={item._id} onClick={() => navigate(`/stock/${item.fabricId || item._id}`)} className="border-b last:border-0 hover:bg-muted/30 transition-colors group cursor-pointer">
                  <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                    <input 
                      type="checkbox"
                      className="w-4 h-4 rounded border-input text-primary focus:ring-primary"
                      checked={selectedForPrint.has(item.fabricId || item._id)}
                      onChange={() => toggleSelect(item.fabricId || item._id)}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center border overflow-hidden">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                        ) : (
                          <Package className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">{item.name || `${item.brand || 'Fabric'} - ${item.color || ''}`}</div>
                        <div className="text-xs text-muted-foreground font-mono mt-0.5 tracking-wider">{item.fabricId || item.barcode || item._id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">{item.supplierName || item.supplierId?.name || item.supplier || 'N/A'}</td>
                  <td className="px-6 py-4 text-right font-medium">₹{item.sellingPrice || item.purchasePrice || item.pricePerMeter || 0}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col items-center">
                      <span className="font-bold">{item.totalAvailable || 0} m</span>
                      {(item.totalAvailable <= (item.minimumStock !== undefined ? item.minimumStock : 10)) && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-rose-500 uppercase mt-1">
                          <AlertTriangle className="h-3 w-3" /> Low Stock
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSelectedFabric(item); }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary/10 text-primary text-xs font-semibold rounded-md hover:bg-primary/20 transition-colors"
                      >
                        <QrCode className="h-3.5 w-3.5" /> Barcode
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); navigate(`/stock/${item.fabricId || item._id}`); window.scrollTo({ top: 800, behavior: 'smooth' }); }} className="p-2 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors" title="History & Adjustments">
                        <History className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={(e) => handleDelete(e, item.fabricId || item._id, item.name || item.type)}
                        title="Delete Fabric Item"
                        className="p-2 hover:bg-rose-50 rounded-md text-slate-400 hover:text-rose-600 transition-colors"
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

        {/* Pagination Footer */}
        <div className="p-4 border-t flex items-center justify-between bg-muted/10">
          <div className="text-xs text-muted-foreground">
            Page <span className="font-medium">{page}</span> of <span className="font-medium">{totalPages}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1 || isLoading}
              className="inline-flex items-center px-2 py-1 border rounded text-xs font-medium hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Prev
            </button>
            <button
              onClick={() => setPage(p => (p < totalPages ? p + 1 : p))}
              disabled={page >= totalPages || isLoading}
              className="inline-flex items-center px-2 py-1 border rounded text-xs font-medium hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </button>
          </div>
        </div>
      </div>

      {/* Barcode Generation Modal */}
      {selectedFabric && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-card border shadow-xl rounded-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-2">
                <ScanBarcode className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-lg">Label Generator</h3>
              </div>
              <button onClick={() => setSelectedFabric(null)} className="p-2 hover:bg-muted rounded-full">
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-semibold mb-3">Fabric Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">SKU / ID:</span> <span className="font-mono font-medium">{selectedFabric._id}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Brand:</span> <span className="font-medium">{selectedFabric.brand}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Color:</span> <span className="font-medium">{selectedFabric.color}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Current Stock:</span> <span className="font-medium">{selectedFabric.totalAvailable} meters</span></div>
                  </div>
                </div>


              </div>

              {/* Label Preview */}
              <div className="bg-muted/20 rounded-xl border p-6 flex flex-col items-center justify-center">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-6">Live Print Preview</h4>
                
                <div className="bg-white border shadow-sm p-4 w-64 rounded-md flex flex-col items-center gap-4 text-center">
                  <div>
                    <h5 className="font-bold text-zinc-900 text-sm leading-tight">Hingu Tailors</h5>
                    <p className="text-[10px] text-zinc-500 font-medium">{selectedFabric.brand} - {selectedFabric.color}</p>
                  </div>
                  
                  {/* QR Code via public API for seamless demo */}
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${selectedFabric.fabricId || selectedFabric._id}`} alt="QR Code" className="w-24 h-24" />
                  
                  <div className="w-full space-y-1">
                    {/* Barcode via public API for seamless demo */}
                    <img src={`https://barcodeapi.org/api/code128/${selectedFabric.fabricId || selectedFabric._id}`} alt="Barcode" className="w-full h-12 object-cover" />
                    <p className="text-[10px] font-mono font-bold text-zinc-800">{selectedFabric.fabricId || selectedFabric._id}</p>
                  </div>
                  
                  <div className="w-full flex justify-between items-center pt-2 border-t text-[10px] font-bold text-zinc-800">
                    <span>₹{selectedFabric.sellingPrice || selectedFabric.purchasePrice || selectedFabric.pricePerMeter || 0}/m</span>
                    <span>{selectedFabric.totalAvailable}m</span>
                  </div>
                </div>
              </div>
            </div>


          </div>
        </div>
      )}

      {showPrintModal && (
        <PrintLabelModal
          fabrics={selectedFabricsData}
          onClose={() => setShowPrintModal(false)}
        />
      )}

      {/* Scanner Modal */}
      {isScanning && (
        <Scanner 
          onScan={handleScan} 
          onClose={() => setIsScanning(false)} 
        />
      )}
    </div>
  );
}
