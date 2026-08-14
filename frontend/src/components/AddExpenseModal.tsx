import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import { createTransaction } from '../lib/api';
import { useToast } from './Toast';

const expenseSchema = z.object({
  amount: z.number().min(1, 'Amount must be greater than 0'),
  category: z.string().min(1, 'Category is required'),
  description: z.string().min(1, 'Description is required'),
  referenceId: z.string().optional(),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

interface AddExpenseModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddExpenseModal({ onClose, onSuccess }: AddExpenseModalProps) {
  const { showToast } = useToast();
  
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema)
  });

  const onSubmit = async (data: ExpenseFormData) => {
    try {
      await createTransaction({
        type: 'Expense',
        ...data
      });
      showToast('Expense recorded successfully', 'success');
      onSuccess();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to record expense', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md bg-card rounded-xl shadow-xl overflow-hidden animate-in slide-in-from-bottom-4">
        <div className="flex items-center justify-between p-4 border-b bg-muted/20">
          <h2 className="font-semibold text-lg">Add New Expense</h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-md transition-colors">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Amount (₹)</label>
            <input 
              type="number" 
              {...register('amount', { valueAsNumber: true })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="0.00"
            />
            {errors.amount && <p className="text-xs text-rose-500 mt-1">{errors.amount.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select 
              {...register('category')}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select Category</option>
              <option value="Supplies">Supplies & Materials</option>
              <option value="Salaries">Employee Salaries</option>
              <option value="Utilities">Utilities & Rent</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Marketing">Marketing</option>
              <option value="Other">Other Expenses</option>
            </select>
            {errors.category && <p className="text-xs text-rose-500 mt-1">{errors.category.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea 
              {...register('description')}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              placeholder="What was this expense for?"
            />
            {errors.description && <p className="text-xs text-rose-500 mt-1">{errors.description.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Reference ID (Optional)</label>
            <input 
              type="text" 
              {...register('referenceId')}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Bill No. / Receipt No."
            />
          </div>

          <div className="pt-4 border-t flex justify-end gap-2">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 border rounded-md text-sm font-medium hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Record Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
