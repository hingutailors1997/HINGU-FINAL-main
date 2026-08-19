import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, FileText, Clock, AlertCircle, Check, UserCog } from 'lucide-react';
import { fetchAllWorkLogs, fetchEmployees, fetchRateMasters, addWorkLog } from '../../lib/api';
import { useToast } from '../Toast';

export default function DailyWorkLogsTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);

  // Queries for data sources (Single Source of Truth)
  const { data: logs = [], isLoading: loadingLogs } = useQuery({
    queryKey: ['allWorkLogs'],
    queryFn: fetchAllWorkLogs
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: fetchEmployees
  });

  const { data: allRates = [] } = useQuery({
    queryKey: ['rateMasters'],
    queryFn: fetchRateMasters
  });

  const activeRates = allRates.filter((r: any) => r.status === 'Active');
  const activeEmployees = employees.filter((e: any) => e.status === 'Active' || !e.status);

  // Form state for logging work
  const [formData, setFormData] = useState({
    employeeId: '',
    date: new Date().toISOString().split('T')[0],
    rateMasterId: '',
    category: '',
    garmentName: '',
    variant: '',
    workType: '',
    productType: '',
    quantity: 1,
    rateSnapshot: 0,
    total: 0,
    details: '',
    garmentsCompleted: 1,
    baseRatePerPiece: 0,
    pieceRateEarned: 0
  });

  const workMutation = useMutation({
    mutationFn: (payload: any) => addWorkLog(payload.employeeId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allWorkLogs'] });
      queryClient.invalidateQueries({ queryKey: ['employee'] });
      setShowModal(false);
      toast('Daily work log added successfully with immutable rate snapshot', 'success');
    },
    onError: (err: any) => {
      toast(err.response?.data?.message || 'Failed to log daily work', 'error');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employeeId) {
      toast('Please select an employee', 'error');
      return;
    }
    if (!formData.rateMasterId) {
      toast('Please select a product from Rate Master', 'error');
      return;
    }
    workMutation.mutate(formData);
  };

  // Filter logs by search query
  const filteredLogs = logs.filter((log: any) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const empName = log.employeeId ? `${log.employeeId.firstName || ''} ${log.employeeId.lastName || ''} ${log.employeeId.employeeId || ''}`.toLowerCase() : '';
    const product = (log.category && log.garmentName ? `${log.category} ${log.garmentName} ${log.variant || ''} ${log.workType || ''}` : log.productType || '').toLowerCase();
    const details = (log.details || '').toLowerCase();
    return empName.includes(q) || product.includes(q) || details.includes(q);
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Shop-Floor Daily Work Logs</h2>
          <p className="text-xs text-muted-foreground">
            Piece rate calculations are dynamically powered by active Rate Master items. Historical records remain unchanged if Owner modifies base rates later.
          </p>
        </div>
        <button 
          onClick={() => {
            const defaultRate = activeRates.length > 0 ? activeRates[0] : null;
            const defaultEmp = activeEmployees.length > 0 ? activeEmployees[0] : null;
            const initialQty = 1;
            const initialRate = defaultRate ? Number(defaultRate.employeePieceRate) : 0;
            const initialTotal = initialQty * initialRate;

            setFormData({
              employeeId: defaultEmp ? defaultEmp._id : '',
              date: new Date().toISOString().split('T')[0],
              rateMasterId: defaultRate ? defaultRate._id : '',
              category: defaultRate ? defaultRate.category : '',
              garmentName: defaultRate ? defaultRate.garmentName : '',
              variant: defaultRate ? (defaultRate.variant || 'Standard') : 'Standard',
              workType: defaultRate ? (defaultRate.workType || 'Stitching') : 'Stitching',
              productType: defaultRate ? `${defaultRate.category} → ${defaultRate.garmentName}` : '',
              quantity: initialQty,
              rateSnapshot: initialRate,
              total: initialTotal,
              garmentsCompleted: initialQty,
              baseRatePerPiece: initialRate,
              pieceRateEarned: initialTotal,
              details: defaultRate ? `${initialQty}x ${defaultRate.category} → ${defaultRate.garmentName} (${defaultRate.variant || 'Standard'}, ${defaultRate.workType || 'Stitching'})` : ''
            });
            setShowModal(true);
          }}
          className="inline-flex items-center justify-center rounded-md text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 shadow-sm transition-all shrink-0"
        >
          <Plus className="mr-2 h-4 w-4" /> Log Daily Work
        </button>
      </div>

      {/* Search Filter Bar */}
      <div className="flex items-center justify-between gap-4 bg-card p-3.5 rounded-xl border shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search by employee name, garment type, variant, or notes..." 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)} 
            className="w-full pl-9 pr-4 py-1.5 rounded-md border border-input text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
          />
        </div>
        <div className="text-xs font-semibold text-muted-foreground">
          Showing <span className="text-foreground font-bold">{filteredLogs.length}</span> work log entries
        </div>
      </div>

      {/* Table of Daily Work Logs */}
      <div className="border rounded-xl bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/40 border-b text-xs uppercase font-semibold text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Garment & Work Type</th>
                <th className="px-4 py-3 text-center">Quantity</th>
                <th className="px-4 py-3 text-right">Rate Snapshot (₹)</th>
                <th className="px-4 py-3">Job Notes / Details</th>
                <th className="px-4 py-3 text-right font-bold text-foreground">Total Earned (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loadingLogs ? (
                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground animate-pulse">Loading</td></tr>
              ) : filteredLogs.length === 0 ? (
                <tr><td colSpan={7} className="p-12 text-center text-muted-foreground font-medium">No work log entries match your filter or none recorded yet.</td></tr>
              ) : filteredLogs.map((log: any) => {
                const displayQty = log.quantity !== undefined ? log.quantity : (log.garmentsCompleted || 1);
                const displayRate = log.rateSnapshot !== undefined ? log.rateSnapshot : (log.baseRatePerPiece || 0);
                const displayTotal = log.total !== undefined ? log.total : (log.pieceRateEarned || (displayQty * displayRate));
                const productLabel = (log.category && log.garmentName) ? `${log.category} → ${log.garmentName}` : (log.productType || 'Garment Work');

                return (
                  <tr key={log._id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-semibold text-foreground whitespace-nowrap">{new Date(log.date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {log.employeeId ? (
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                            {(log.employeeId.firstName || 'E')[0]}
                          </div>
                          <div>
                            <span className="font-semibold text-foreground block">{log.employeeId.firstName} {log.employeeId.lastName || ''}</span>
                            <span className="text-[11px] text-muted-foreground">{log.employeeId.employeeId || 'Staff'} ({log.employeeId.role || 'Tailor'})</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic">Former Employee</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-foreground">{productLabel}</div>
                      {(log.variant || log.workType) && (
                        <div className="flex items-center gap-1.5 mt-1">
                          {log.variant && <span className="text-[11px] font-medium bg-secondary px-1.5 py-0.5 rounded text-secondary-foreground">{log.variant}</span>}
                          {log.workType && <span className="text-[11px] font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded">{log.workType}</span>}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center bg-muted font-bold text-foreground px-2.5 py-1 rounded-full text-xs">
                        {displayQty} pc
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-muted-foreground">₹{displayRate.toLocaleString()}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs max-w-xs truncate" title={log.details}>{log.details || '—'}</td>
                    <td className="px-4 py-3 text-right font-extrabold text-emerald-600">₹{displayTotal.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Daily Work Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-lg rounded-xl border shadow-lg flex flex-col max-h-[88vh] overflow-hidden animate-in fade-in duration-200">
            <div className="p-3.5 px-4 border-b flex items-center justify-between bg-muted/20 flex-shrink-0">
              <div>
                <span className="font-bold text-base text-foreground block">Log Shop-Floor Work</span>
                <span className="text-[11px] text-muted-foreground">Rate Master serves as Single Source of Truth.</span>
              </div>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">Auto-Rate Sync</span>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-4 space-y-3 overflow-y-auto flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-xs font-bold text-foreground">Select Employee *</label>
                    <select 
                      required 
                      value={formData.employeeId} 
                      onChange={e => setFormData({ ...formData, employeeId: e.target.value })} 
                      className="w-full rounded-md border border-input h-9 px-2.5 text-xs bg-background font-semibold text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {activeEmployees.length === 0 ? (
                        <option value="">No Active Employees Found</option>
                      ) : (
                        <>
                          {!formData.employeeId && <option value="">Select Employee...</option>}
                          {activeEmployees.map((emp: any) => (
                            <option key={emp._id} value={emp._id}>
                              {emp.firstName} {emp.lastName || ''} ({emp.employeeId} - {emp.role})
                            </option>
                          ))}
                        </>
                      )}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-foreground">Date *</label>
                    <input 
                      type="date" 
                      required 
                      value={formData.date} 
                      onChange={e => setFormData({ ...formData, date: e.target.value })} 
                      className="w-full rounded-md border border-input h-9 px-2.5 text-xs bg-background focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" 
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">Product Type *</label>
                  <select 
                    required 
                    value={formData.rateMasterId} 
                    onChange={e => {
                      const rateItem = activeRates.find((r: any) => r._id === e.target.value);
                      if (!rateItem) return;
                      const qty = formData.quantity || 1;
                      const rateSnap = Number(rateItem.employeePieceRate) || 0;
                      const totalVal = qty * rateSnap;
                      setFormData({
                        ...formData,
                        rateMasterId: rateItem._id,
                        category: rateItem.category,
                        garmentName: rateItem.garmentName,
                        variant: rateItem.variant || 'Standard',
                        workType: rateItem.workType || 'Stitching',
                        productType: `${rateItem.category} → ${rateItem.garmentName}`,
                        rateSnapshot: rateSnap,
                        baseRatePerPiece: rateSnap,
                        total: totalVal,
                        pieceRateEarned: totalVal,
                        details: `${qty}x ${rateItem.category} → ${rateItem.garmentName} (${rateItem.variant || 'Standard'}, ${rateItem.workType || 'Stitching'})`
                      });
                    }} 
                    className="w-full rounded-md border border-input h-9 px-2.5 text-xs bg-background font-semibold text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {activeRates.length === 0 ? (
                      <option value="">No Active Rates Available in Rate Master</option>
                    ) : (
                      <>
                        {!formData.rateMasterId && <option value="">Select Product...</option>}
                        {activeRates.map((r: any) => (
                          <option key={r._id} value={r._id}>
                            {r.category} → {r.garmentName} ({r.variant || 'Standard'}) - ₹{r.employeePieceRate}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                </div>

                {formData.rateMasterId ? (
                  <div className="p-2.5 rounded-lg border bg-muted/20 border-border grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                    <div>
                      <span className="text-muted-foreground block font-medium">Category</span>
                      <span className="font-bold text-foreground truncate block">{formData.category || '—'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block font-medium">Garment Name</span>
                      <span className="font-bold text-foreground truncate block">{formData.garmentName || '—'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block font-medium">Variant</span>
                      <span className="font-bold text-foreground truncate block">{formData.variant || 'Standard'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block font-medium">Work Type</span>
                      <span className="font-bold text-primary truncate block">{formData.workType || 'Stitching'}</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-lg border border-dashed text-center text-xs text-muted-foreground">
                    Select a Product Type above to auto-fetch details & piece rate.
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-foreground">Quantity (Pieces) *</label>
                    <input 
                      type="number" 
                      required 
                      min={1} 
                      value={formData.quantity} 
                      onChange={e => {
                        const qty = Math.max(1, Number(e.target.value) || 0);
                        const rateSnap = formData.rateSnapshot || 0;
                        const totalVal = qty * rateSnap;
                        setFormData({ 
                          ...formData, 
                          quantity: qty, 
                          garmentsCompleted: qty,
                          total: totalVal,
                          pieceRateEarned: totalVal,
                          details: `${qty}x ${formData.category || ''} → ${formData.garmentName || 'Garment'} (${formData.variant || 'Standard'}, ${formData.workType || 'Stitching'})`
                        });
                      }} 
                      className="w-full rounded-md border border-input h-9 px-2.5 text-sm font-extrabold bg-background text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-muted-foreground flex items-center justify-between">
                      <span>Rate Per Piece (₹)</span>
                      <span className="text-[9px] uppercase font-extrabold text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded">Read Only</span>
                    </label>
                    <div className="w-full rounded-md border border-input h-9 bg-muted/50 px-2.5 text-sm font-bold text-muted-foreground cursor-not-allowed flex items-center justify-between" title="Rate is locked to Rate Master single source of truth and cannot be modified by employees">
                      <span>₹{formData.rateSnapshot || 0}</span>
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-foreground block">Total Calculated Amount</span>
                    <span className="text-[11px] text-muted-foreground font-medium">Qty ({formData.quantity}) × Rate (₹{formData.rateSnapshot})</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-extrabold text-emerald-600">₹{formData.total || 0}</span>
                    <span className="text-[9px] text-muted-foreground block font-bold">Immutable Snapshot</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">Optional Job Notes</label>
                  <textarea 
                    value={formData.details} 
                    onChange={e => setFormData({ ...formData, details: e.target.value })} 
                    className="w-full rounded-md border border-input p-2 text-xs h-12 bg-background resize-none focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" 
                    placeholder="Add optional notes about stitches, fabric, or tailoring instructions..." 
                  />
                </div>
              </div>

              <div className="p-3 px-4 flex gap-2 justify-end border-t bg-card flex-shrink-0">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-1.5 text-xs font-bold hover:bg-muted rounded-md transition-colors">Cancel</button>
                <button type="submit" disabled={workMutation.isPending || !formData.rateMasterId || !formData.employeeId} className="px-5 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-bold shadow-sm hover:bg-primary/90 transition-all disabled:opacity-50">Save Daily Work Log</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
