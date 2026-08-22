import React from 'react';
import { useForm } from 'react-query-form'; // Let's just use regular react-hook-form
import { useForm as useRHF } from 'react-hook-form';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { createSupplierBill } from '../../lib/api';
import { useToast } from '../Toast';
import { X, Receipt } from 'lucide-react';
import api from '../../lib/api';

export default function AddSupplierBillModal({ onClose }: { onClose: () => void }) {
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useRHF();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: inventoryData } = useQuery({
    queryKey: ['inventoryPaginated', 1, '', false],
    queryFn: async () => {
      const res = await api.get('/stock?paginated=true&limit=100');
      return res.data;
    }
  });
  
  // We need to fetch suppliers as well if they exist, but for now we might not have a dedicated supplier route on frontend.
  // We can just get unique suppliers from existing inventory or create a new route.
  // Wait, the Inventory.js model has Supplier. Does it have an endpoint?
  // Let's check stock.js routes. Wait, we don't need a select for now, we can just use an input or a list.
  // Actually, wait, SupplierBill requires a `supplierId` (ObjectId). So we need to fetch suppliers or create one.
  // Let me quickly check if `/api/stock/suppliers` exists in `stock.js`. I can write a quick query to fetch unique suppliers from stock.
  // Or I can add a route for `/api/stock/suppliers`.
  const { data: suppliers } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      try {
        const res = await api.get('/stock/suppliers');
        return Array.isArray(res.data) ? res.data : (res.data?.data || []);
      } catch (err) {
        return [];
      }
    }
  });

  const mutation = useMutation({
    mutationFn: createSupplierBill,
    onSuccess: () => {
      toast('Supplier bill added successfully', 'success');
      queryClient.invalidateQueries({ queryKey: ['supplierBills'] });
      onClose();
    },
    onError: (err: any) => {
      toast(err.response?.data?.message || 'Failed to add bill', 'error');
    }
  });

  const onSubmit = (data: any) => {
    // If the selected value is a fabric ID, extract its supplier name to send to backend
    const fabricsList = inventoryData?.fabrics || (Array.isArray(inventoryData) ? inventoryData : []);
    const selectedFabric = fabricsList.find((f: any) => f._id === data.supplierId);
    const finalSupplierId = selectedFabric 
      ? (selectedFabric.supplierName || selectedFabric.partyName || selectedFabric.supplierId?.name || data.supplierId) 
      : data.supplierId;

    mutation.mutate({
      billNumber: data.billNumber,
      supplierId: finalSupplierId,
      billDate: data.billDate,
      totalAmount: Number(data.totalAmount),
      amountPaid: Number(data.amountPaid) || 0
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-md rounded-xl shadow-lg border overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b bg-muted/20">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" />
            Log Supplier Bill
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-md transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Bill Number</label>
            <input 
              {...register('billNumber', { required: 'Bill number is required' })}
              className="w-full p-2 border rounded-md"
              placeholder="e.g. INV-2023-001"
            />
            {errors.billNumber && <p className="text-xs text-rose-500">{errors.billNumber.message as string}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Supplier</label>
            <select 
              {...register('supplierId', { required: 'Supplier is required' })}
              className="w-full p-2 border rounded-md"
              onChange={(e) => {
                const fabricId = e.target.value;
                register('supplierId').onChange(e); // keep RHF sync
                
                const fabricsList = inventoryData?.fabrics || (Array.isArray(inventoryData) ? inventoryData : []);
                if (fabricId && fabricsList.length > 0) {
                  const selectedFabric = fabricsList.find((f: any) => f._id === fabricId);
                  if (selectedFabric) {
                    if (selectedFabric.invoiceNumber) {
                      setValue('billNumber', selectedFabric.invoiceNumber, { shouldValidate: true, shouldDirty: true });
                      toast(`Found invoice: ${selectedFabric.invoiceNumber}`, 'success');
                    } else {
                      setValue('billNumber', '', { shouldValidate: true, shouldDirty: true });
                      toast(`No invoice number saved for this fabric`, 'error');
                    }
                  }
                }
              }}
            >
              <option value="">Select Fabric Supplier...</option>
              {(inventoryData?.fabrics || (Array.isArray(inventoryData) ? inventoryData : []))?.filter((f: any) => f.supplierName || f.partyName || f.supplierId)?.map((f: any) => {
                const supName = f.supplierName || f.partyName || f.supplierId?.name || 'Unknown Supplier';
                return (
                  <option key={f._id} value={f._id}>
                    {supName} ({f.name})
                  </option>
                );
              })}
            </select>
            {errors.supplierId && <p className="text-xs text-rose-500">{errors.supplierId.message as string}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Bill Date</label>
            <input 
              type="date"
              {...register('billDate', { required: 'Bill date is required' })}
              className="w-full p-2 border rounded-md"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Total Amount (₹)</label>
              <input 
                type="number"
                {...register('totalAmount', { required: 'Total amount is required', min: 1 })}
                className="w-full p-2 border rounded-md"
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Amount Paid (₹)</label>
              <input 
                type="number"
                {...register('amountPaid')}
                className="w-full p-2 border rounded-md"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium bg-muted text-muted-foreground rounded-md hover:bg-muted/80 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Bill'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
