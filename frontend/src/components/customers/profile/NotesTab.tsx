import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Save, Loader2 } from 'lucide-react';
import { fetchCustomerById, updateCustomer } from '../../../lib/api';
import { useToast } from '../../../components/Toast';

interface Props {
  customerId: string;
}

export default function NotesTab({ customerId }: Props) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState('');

  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => fetchCustomerById(customerId)
  });

  useEffect(() => {
    if (customer) {
      setNotes(customer.notes || '');
    }
  }, [customer]);

  const saveMutation = useMutation({
    mutationFn: () => updateCustomer(customerId, { notes }),
    onSuccess: () => {
      showToast('Internal staff notes saved successfully!', 'success');
      queryClient.invalidateQueries({ queryKey: ['customer', customerId] });
      queryClient.invalidateQueries({ queryKey: ['customerTimeline', customerId] });
    },
    onError: () => {
      showToast('Failed to save internal notes.', 'error');
    }
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="rounded-xl border bg-card p-6 shadow-sm border-amber-200 bg-amber-500/5">
        <h3 className="font-semibold text-lg flex items-center gap-2 text-amber-700">
          <FileText className="h-5 w-5" /> 
          Internal Staff Notes
        </h3>
        <p className="text-sm mt-1 text-amber-900/70 mb-4">
          These notes are private and stored securely. They will never appear on customer invoices or public documents.
        </p>

        {isLoading ? (
          <div className="flex items-center justify-center h-48 text-amber-800/60 animate-pulse gap-2">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading
          </div>
        ) : (
          <textarea 
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full h-64 p-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white resize-none shadow-inner text-sm text-slate-800"
            placeholder="Enter behavioral notes, collar stiffness preference, hidden VIP instructions, etc."
          />
        )}

        <div className="mt-4 flex justify-end">
          <button 
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || isLoading}
            className="inline-flex items-center justify-center px-6 py-2.5 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 shadow-sm transition-colors disabled:opacity-50"
          >
            {saveMutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
            ) : (
              <><Save className="w-4 h-4 mr-2" /> Save Notes</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

