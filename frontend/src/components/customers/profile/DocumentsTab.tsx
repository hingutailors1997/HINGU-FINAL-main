import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Plus, Download, FileArchive, Loader2 } from 'lucide-react';
import { fetchCustomerDocuments, uploadCustomerDocument } from '../../../lib/api';
import { useToast } from '../../../components/Toast';

interface Props {
  customerId: string;
}

export default function DocumentsTab({ customerId }: Props) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [docType, setDocType] = useState('Reference PDF');

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['customerDocuments', customerId],
    queryFn: () => fetchCustomerDocuments(customerId),
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', docType);
      formData.append('documentName', file.name);
      return await uploadCustomerDocument(customerId, formData);
    },
    onSuccess: () => {
      showToast('Document uploaded successfully!', 'success');
      queryClient.invalidateQueries({ queryKey: ['customerDocuments', customerId] });
      queryClient.invalidateQueries({ queryKey: ['customerTimeline', customerId] });
    },
    onError: () => {
      showToast('Failed to upload document. Please try again.', 'error');
    }
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadMutation.mutate(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-lg flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /> Documents Library</h3>
          <p className="text-sm text-slate-500 mt-1">Securely manage identity documents, invoices, and design PDFs.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <select 
            value={docType} 
            onChange={(e) => setDocType(e.target.value)}
            className="px-3 py-2 text-xs font-semibold rounded-lg border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="Reference PDF">Reference PDF</option>
            <option value="Aadhaar">Aadhaar</option>
            <option value="GST">GST Certificate</option>
            <option value="Invoice">Invoice / Bill</option>
            <option value="Other">Other</option>
          </select>

          <label className="cursor-pointer px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 shadow-sm transition-colors">
            {uploadMutation.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</>
            ) : (
              <><Plus className="h-4 w-4"/> Upload Document</>
            )}
            <input 
              type="file" 
              className="hidden" 
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" 
              onChange={handleFileUpload} 
              disabled={uploadMutation.isPending} 
            />
          </label>
        </div>
      </div>
      
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="text-center p-12 text-slate-400 animate-pulse flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" /> Loading
          </div>
        ) : documents.length === 0 ? (
          <div className="rounded-xl p-16 text-center bg-slate-50/50">
            <FileArchive className="h-10 w-10 text-muted-foreground mx-auto mb-4 opacity-30" />
            <h3 className="font-semibold text-lg text-slate-500">No Documents Found</h3>
            <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto">Upload GST certificates, reference PDFs, or customer identification to maintain a complete verified record.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50/80 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 font-semibold">Document Name</th>
                  <th className="px-6 py-4 font-semibold">Type</th>
                  <th className="px-6 py-4 font-semibold">Date Uploaded</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {documents.map((doc: any) => (
                  <tr key={doc._id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                          <FileArchive className="h-5 w-5" />
                        </div>
                        <span className="font-medium text-slate-700">{doc.documentName || 'Unnamed Document'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-600">
                        {doc.documentType || 'General'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(doc.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => window.open(doc.fileUrl, '_blank')}
                        className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                        title="Download / View"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

