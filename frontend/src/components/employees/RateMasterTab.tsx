import React, { useState, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, Search, Filter, ArrowUpDown, FileSpreadsheet, Download, Upload, 
  Eye, Edit, Copy, Power, Trash2, History, CheckCircle2, XCircle, AlertCircle 
} from 'lucide-react';
import { 
  fetchRateMasters, createRateMaster, updateRateMaster, 
  deleteRateMaster, toggleRateMasterStatus, importRateMasters 
} from '../../lib/api';
import { useToast } from '../Toast';
import { useGlobalSearch } from '../../contexts/GlobalSearchContext';

export default function RateMasterTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Search, Filter, and Sort States
  const { globalSearch: searchTerm, setGlobalSearch: setSearchTerm } = useGlobalSearch();
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [workTypeFilter, setWorkTypeFilter] = useState('All');
  const [sortBy, setSortBy] = useState('Alphabetical');

  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedRateForHistory, setSelectedRateForHistory] = useState<any>(null);

  // Form Initial State
  const defaultFormState = {
    category: 'Shirt',
    garmentName: '',
    variant: 'Standard',
    workType: 'Stitching',
    rate: 100,
    effectiveDate: new Date().toISOString().split('T')[0],
    status: 'Active',
    remarks: ''
  };
  const [formData, setFormData] = useState(defaultFormState);

  // Fetch data
  const { data: rates = [], isLoading } = useQuery({
    queryKey: ['rateMasters'],
    queryFn: fetchRateMasters
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: createRateMaster,
    onSuccess: () => {
      toast('Rate Master entry created successfully!', 'success');
      queryClient.invalidateQueries({ queryKey: ['rateMasters'] });
      closeModal();
    },
    onError: (err: any) => {
      toast(err.response?.data?.message || 'Failed to create rate entry', 'error');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateRateMaster(id, data),
    onSuccess: () => {
      toast('Rate Master entry updated successfully!', 'success');
      queryClient.invalidateQueries({ queryKey: ['rateMasters'] });
      closeModal();
    },
    onError: (err: any) => {
      toast(err.response?.data?.message || 'Failed to update rate entry', 'error');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteRateMaster,
    onSuccess: () => {
      toast('Rate removed successfully!', 'success');
      queryClient.invalidateQueries({ queryKey: ['rateMasters'] });
    },
    onError: (err: any) => {
      toast(err.response?.data?.message || 'Failed to delete rate', 'error');
    }
  });

  const toggleStatusMutation = useMutation({
    mutationFn: toggleRateMasterStatus,
    onSuccess: (data) => {
      toast(`Rate marked as ${data.status || 'updated'}`, 'success');
      queryClient.invalidateQueries({ queryKey: ['rateMasters'] });
    },
    onError: () => {
      toast('Failed to change status', 'error');
    }
  });

  const importMutation = useMutation({
    mutationFn: importRateMasters,
    onSuccess: (data: any) => {
      toast(data?.message || 'Rates imported successfully!', 'success');
      queryClient.invalidateQueries({ queryKey: ['rateMasters'] });
    },
    onError: (err: any) => {
      toast(err.response?.data?.message || 'Failed to import rates', 'error');
    }
  });

  const closeModal = () => {
    setShowModal(false);
    setIsEditing(false);
    setEditingId(null);
    setFormData(defaultFormState);
  };

  const handleOpenAdd = () => {
    setFormData(defaultFormState);
    setIsEditing(false);
    setEditingId(null);
    setShowModal(true);
  };

  const handleOpenEdit = (item: any) => {
    setFormData({
      category: item.category || 'Shirt',
      garmentName: item.garmentName || '',
      variant: item.variant || 'Standard',
      workType: item.workType || 'Stitching',
      rate: item.rate || 0,
      effectiveDate: item.effectiveDate ? new Date(item.effectiveDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      status: item.status || 'Active',
      remarks: item.remarks || ''
    });
    setIsEditing(true);
    setEditingId(item._id);
    setShowModal(true);
  };

  const handleDuplicate = (item: any) => {
    setFormData({
      category: item.category || 'Shirt',
      garmentName: `${item.garmentName} (Copy)`,
      variant: item.variant || 'Standard',
      workType: item.workType || 'Stitching',
      rate: item.rate || 0,
      effectiveDate: new Date().toISOString().split('T')[0],
      status: 'Active',
      remarks: `Duplicated from ${item.garmentName}`
    });
    setIsEditing(false);
    setEditingId(null);
    setShowModal(true);
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to completely delete "${name}" from Rate Master? Historical calculation logs will remain unaffected.`)) {
      deleteMutation.mutate(id);
    }
  };

  const handleToggleStatus = (id: string) => {
    toggleStatusMutation.mutate(id);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing && editingId) {
      updateMutation.mutate({ id: editingId, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  // Excel Export feature (Generates CSV formatted cleanly)
  const handleExportExcel = () => {
    if (filteredAndSortedRates.length === 0) {
      toast('No data available to export', 'error');
      return;
    }
    const headers = ['Category', 'Garment Name', 'Variant / Design', 'Work Type', 'Rate Per Piece (INR)', 'Effective From', 'Status', 'Created By', 'Updated On', 'Remarks'];
    const rows = filteredAndSortedRates.map((item: any) => [
      item.category,
      item.garmentName,
      item.variant,
      item.workType,
      item.rate,
      item.effectiveDate ? new Date(item.effectiveDate).toLocaleDateString() : '',
      item.status,
      item.createdBy || 'Owner/Admin',
      item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : '',
      `"${(item.remarks || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Hingu_Tailors_Rate_Master_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast('Rate Master table exported successfully as Excel/CSV', 'success');
  };

  // Excel Import feature (Parses CSV files)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim() !== '');
        if (lines.length < 2) {
          toast('Invalid CSV file format. Please ensure headers and data rows exist.', 'error');
          return;
        }
        const importedItems: any[] = [];
        // skip line 0 assuming header
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
          if (cols.length >= 5 && cols[0] && cols[1]) {
            importedItems.push({
              category: cols[0],
              garmentName: cols[1],
              variant: cols[2] || 'Standard',
              workType: cols[3] || 'Stitching',
              rate: Number(cols[4]) || 100,
              effectiveDate: cols[5] ? new Date(cols[5]) : new Date(),
              status: (cols[6] === 'Inactive') ? 'Inactive' : 'Active',
              remarks: cols[9] || 'Imported from Excel/CSV'
            });
          }
        }
        if (importedItems.length > 0) {
          if (window.confirm(`Found ${importedItems.length} valid rate rows in Excel/CSV. Proceed to import into Rate Master?`)) {
            importMutation.mutate(importedItems);
          }
        } else {
          toast('No valid rate rows recognized in file.', 'error');
        }
      } catch (error) {
        toast('Error reading file structure.', 'error');
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  // Filter and Sort processing
  const filteredAndSortedRates = useMemo(() => {
    let list = rates.filter((item: any) => {
      const matchesSearch = searchTerm === '' || 
        (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.garmentName && item.garmentName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.variant && item.variant.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.workType && item.workType.toLowerCase().includes(searchTerm.toLowerCase())) ||
        String(item.rate).includes(searchTerm);

      const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
      const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
      const matchesWorkType = workTypeFilter === 'All' || item.workType === workTypeFilter;

      return matchesSearch && matchesCategory && matchesStatus && matchesWorkType;
    });

    return list.sort((a: any, b: any) => {
      if (sortBy === 'Newest') return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      if (sortBy === 'Oldest') return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      if (sortBy === 'Highest Rate') return (b.rate || 0) - (a.rate || 0);
      if (sortBy === 'Lowest Rate') return (a.rate || 0) - (b.rate || 0);
      // Default: Alphabetical by Category then Garment Name
      if (a.category !== b.category) return (a.category || '').localeCompare(b.category || '');
      return (a.garmentName || '').localeCompare(b.garmentName || '');
    });
  }, [rates, searchTerm, categoryFilter, statusFilter, workTypeFilter, sortBy]);

  const categories = ['Shirt', 'Pant', 'Kurta', 'Sherwani', 'Blazer', 'Coat', 'Waistcoat', 'Jacket', 'Custom'];
  const workTypes = ['Stitching', 'Alteration', 'Embroidery', 'Finishing', 'Pattern Work', 'Custom Work'];
  const variantSuggestions = ['Standard', 'Premium', 'Slim Fit', 'Regular', 'Designer', 'Wedding', 'Royal', 'Classic'];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Page Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight">Rate Master</h2>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Manage garment-wise labour rates used automatically inside Daily Work Logs for employee payment calculations.
          </p>
        </div>

        {/* Top Right Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={handleExportExcel} 
            className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-muted/50 h-9 px-3 transition-colors text-foreground"
            title="Export Rate Master table"
          >
            <Download className="mr-2 h-4 w-4 text-blue-600" />
            Export Excel
          </button>

          <button 
            onClick={handleOpenAdd}
            className="inline-flex items-center justify-center rounded-md text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 shadow-sm transition-colors"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Rate
          </button>
        </div>
      </div>

      {/* Business Rule Information Alert */}
      <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 flex items-start gap-3 text-blue-900 shadow-2xs">
        <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed">
          <span className="font-extrabold uppercase tracking-wider block text-[11px] text-blue-700">Enterprise Payroll Integrity Rule</span>
          Historical calculations never mutate. If an owner updates a rate (e.g. Regular Shirt changing from ₹100 to ₹120 on Aug 10), all work logs logged prior continue using ₹100 via immutable Rate Snapshots. Only new daily logs automatically inherit ₹120.
        </div>
      </div>

      {/* Search and Filters Card */}
      <div className="rounded-xl border bg-card shadow-sm flex flex-col overflow-hidden">
        <div className="p-4 border-b flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-muted/20">
          
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search category, garment, variant, work type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-md border border-input bg-background pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
          </div>

          {/* Filters and Sorting */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
              <Filter className="h-3.5 w-3.5" />
              <span>Filters:</span>
            </div>
            
            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="All">All Categories</option>
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>

            {/* Work Type Filter */}
            <select
              value={workTypeFilter}
              onChange={(e) => setWorkTypeFilter(e.target.value)}
              className="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="All">All Work Types</option>
              {workTypes.map(wt => <option key={wt} value={wt}>{wt}</option>)}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="All">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>

            <div className="h-4 w-[1px] bg-border mx-1 hidden sm:block"></div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <ArrowUpDown className="h-3.5 w-3.5" />
              <span>Sort:</span>
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="Alphabetical">Alphabetical</option>
              <option value="Newest">Newest First</option>
              <option value="Oldest">Oldest First</option>
              <option value="Highest Rate">Highest Rate (₹)</option>
              <option value="Lowest Rate">Lowest Rate (₹)</option>
            </select>
          </div>
        </div>

        {/* Rate Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/40 border-b">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Category</th>
                <th className="px-5 py-3.5 font-semibold">Garment Name</th>
                <th className="px-5 py-3.5 font-semibold">Variant / Design</th>
                <th className="px-5 py-3.5 font-semibold">Work Type</th>
                <th className="px-5 py-3.5 font-semibold text-right">Rate / Piece (₹)</th>
                <th className="px-5 py-3.5 font-semibold">Effective From</th>
                <th className="px-5 py-3.5 font-semibold">Status</th>
                <th className="px-5 py-3.5 font-semibold">Updated On</th>
                <th className="px-5 py-3.5 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center">
                      <div className="h-6 w-6 rounded-full border-4 border-primary/20 border-t-primary animate-spin mb-3"></div>
                      <span className="font-semibold text-xs">Loading</span>
                    </div>
                  </td>
                </tr>
              ) : filteredAndSortedRates.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-muted-foreground">
                    <div className="max-w-xs mx-auto space-y-2">
                      <FileSpreadsheet className="h-8 w-8 mx-auto text-slate-300" />
                      <p className="font-semibold text-sm">No Rate Master records found.</p>
                      <p className="text-xs text-slate-500">Click '+ Add Rate' or 'Import Excel' above to start setting labour piece rates.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAndSortedRates.map((item: any) => (
                  <tr 
                    key={item._id} 
                    className="border-b last:border-0 hover:bg-muted/30 transition-colors group"
                  >
                    <td className="px-5 py-3.5 font-bold text-slate-900">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-slate-100 border text-slate-800 text-xs font-bold">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-foreground">
                      {item.garmentName}
                      {item.remarks && (
                        <div className="text-[11px] text-muted-foreground truncate max-w-[200px]" title={item.remarks}>{item.remarks}</div>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center rounded-full bg-purple-500/10 px-2.5 py-0.5 text-xs font-semibold text-purple-700 border border-purple-200">
                        {item.variant || 'Standard'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-medium text-slate-700">
                      {item.workType || 'Stitching'}
                    </td>
                    <td className="px-5 py-3.5 text-right font-black text-emerald-700 text-base">
                      ₹{(item.rate || 0).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-muted-foreground font-medium">
                      {item.effectiveDate ? new Date(item.effectiveDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Immediate'}
                    </td>
                    <td className="px-5 py-3.5">
                      <button 
                        onClick={() => handleToggleStatus(item._id)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold transition-colors cursor-pointer border shadow-2xs ${
                          item.status === 'Active' 
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100' 
                            : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                        }`}
                        title="Click to toggle Active/Inactive status"
                      >
                        {item.status === 'Active' ? <CheckCircle2 className="h-3 w-3 text-emerald-600" /> : <XCircle className="h-3 w-3 text-slate-400" />}
                        {item.status || 'Active'}
                      </button>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-muted-foreground">
                      {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Today'}
                      <div className="text-[10px] text-slate-400">by {item.createdBy || 'Owner'}</div>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button 
                          onClick={() => { setSelectedRateForHistory(item); setShowHistoryModal(true); }} 
                          title="View Audit & Rate History" 
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-500 hover:text-blue-600 transition-colors"
                        >
                          <History className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleOpenEdit(item)} 
                          title="Edit Rate Specification" 
                          className="p-1.5 rounded-lg hover:bg-amber-50 text-slate-500 hover:text-amber-600 transition-colors"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleDuplicate(item)} 
                          title="Duplicate Rate Record" 
                          className="p-1.5 rounded-lg hover:bg-purple-50 text-slate-500 hover:text-purple-600 transition-colors"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleToggleStatus(item._id)} 
                          title={item.status === 'Active' ? "Deactivate Rate" : "Activate Rate"} 
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
                        >
                          <Power className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(item._id, `${item.garmentName} (${item.variant})`)} 
                          title="Delete Rate" 
                          className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==================== ADD / EDIT RATE MODAL ==================== */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200 p-4">
          <div className="bg-card w-full max-w-lg rounded-2xl border shadow-xl animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="p-6 border-b bg-muted/10 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-foreground">{isEditing ? 'Edit Garment Labour Rate' : 'Add New Labour Rate'}</h2>
                <p className="text-xs text-muted-foreground">Set shop-floor billing piece rate for this garment style.</p>
              </div>
              <span className="px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 font-extrabold text-xs">
                Owner Only
              </span>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Category * */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Category *</label>
                  <select 
                    required 
                    value={formData.category} 
                    onChange={e => setFormData({ ...formData, category: e.target.value })} 
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-semibold focus:border-primary"
                  >
                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>

                {/* Work Type * */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Work Type *</label>
                  <select 
                    required 
                    value={formData.workType} 
                    onChange={e => setFormData({ ...formData, workType: e.target.value })} 
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-semibold focus:border-primary"
                  >
                    {workTypes.map(wt => <option key={wt} value={wt}>{wt}</option>)}
                  </select>
                </div>
              </div>

              {/* Garment Name * */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Garment Name *</label>
                <input 
                  required 
                  type="text" 
                  placeholder="e.g., Regular Shirt, Royal Sherwani, Formal Pant" 
                  value={formData.garmentName} 
                  onChange={e => setFormData({ ...formData, garmentName: e.target.value })} 
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-semibold focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Variant / Design */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Variant / Design</label>
                  <input 
                    type="text" 
                    list="variant-suggestions"
                    placeholder="Standard, Premium, Wedding..." 
                    value={formData.variant} 
                    onChange={e => setFormData({ ...formData, variant: e.target.value })} 
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-semibold focus:border-primary"
                  />
                  <datalist id="variant-suggestions">
                    {variantSuggestions.map(v => <option key={v} value={v} />)}
                  </datalist>
                </div>

                {/* Rate Per Piece (₹) * */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Rate Per Piece (₹) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-500">₹</span>
                    <input 
                      required 
                      type="number" 
                      min="0" 
                      step="1"
                      value={formData.rate} 
                      onChange={e => setFormData({ ...formData, rate: Number(e.target.value) })} 
                      className="w-full rounded-lg border border-emerald-300 bg-emerald-50/20 pl-8 pr-3 py-2 text-sm font-black text-emerald-900 focus:border-emerald-600"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Effective Date */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Effective Date</label>
                  <input 
                    type="date" 
                    value={formData.effectiveDate} 
                    onChange={e => setFormData({ ...formData, effectiveDate: e.target.value })} 
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-semibold focus:border-primary"
                  />
                </div>

                {/* Status */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Status</label>
                  <select 
                    value={formData.status} 
                    onChange={e => setFormData({ ...formData, status: e.target.value })} 
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-semibold focus:border-primary"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Remarks */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Remarks (Optional)</label>
                <textarea 
                  rows={2}
                  placeholder="Additional tailoring specifications or stitch complexity notes..." 
                  value={formData.remarks} 
                  onChange={e => setFormData({ ...formData, remarks: e.target.value })} 
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary"
                />
              </div>

              <div className="pt-4 border-t flex items-center justify-end gap-2">
                <button 
                  type="button" 
                  onClick={closeModal} 
                  className="px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending} 
                  className="inline-flex items-center justify-center rounded-lg text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-5 shadow-sm transition-colors cursor-pointer"
                >
                  {createMutation.isPending || updateMutation.isPending ? 'Saving Rate...' : isEditing ? 'Update Rate Specification' : 'Save Labour Rate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== VIEW HISTORY MODAL ==================== */}
      {showHistoryModal && selectedRateForHistory && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200 p-4">
          <div className="bg-card w-full max-w-2xl rounded-2xl border shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b bg-muted/10 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold">{selectedRateForHistory.garmentName} ({selectedRateForHistory.variant})</h3>
                  <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">{selectedRateForHistory.workType}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Historical audit trail and rate snapshot revisions</p>
              </div>
              <button 
                onClick={() => setShowHistoryModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 font-bold text-sm"
              >
                ✕ Close
              </button>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
              {(!selectedRateForHistory.history || selectedRateForHistory.history.length === 0) ? (
                <p className="text-sm text-center text-slate-500 py-4 font-semibold">No revision history recorded for this entry yet.</p>
              ) : (
                <div className="space-y-3">
                  {selectedRateForHistory.history.slice().reverse().map((h: any, idx: number) => (
                    <div key={idx} className="p-4 rounded-xl border bg-slate-50/70 space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                        <span className="font-bold text-sm text-slate-900 flex items-center gap-2">
                          <History className="h-4 w-4 text-blue-600" />
                          {h.action || 'Rate modification recorded'}
                        </span>
                        <span className="font-black text-emerald-700 text-sm bg-emerald-100/60 px-2.5 py-0.5 rounded">
                          ₹{(h.rate || selectedRateForHistory.rate).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
                        <span>Effective Date: <strong className="text-slate-700">{h.effectiveDate ? new Date(h.effectiveDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Immediate'}</strong></span>
                        <span>Changed By: <strong className="text-slate-700">{h.changedBy || 'Owner/Admin'}</strong></span>
                        <span>Logged On: <span className="text-slate-600">{h.changedAt ? new Date(h.changedAt).toLocaleString() : 'N/A'}</span></span>
                      </div>
                      {h.remarks && <p className="text-xs text-slate-600 font-medium pt-1 italic">"{h.remarks}"</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t bg-muted/20 flex items-center justify-between text-xs text-slate-500">
              <span>Past payroll logs linked to old timestamps remain completely unchanged.</span>
              <button 
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-900 text-white font-bold hover:bg-slate-800"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
