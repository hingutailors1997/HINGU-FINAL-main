import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Image as ImageIcon, Plus, Download, Camera } from 'lucide-react';
import axios from 'axios';
import { useToast } from '../../../components/Toast';
import { fetchCustomerGallery } from '../../../lib/api';

interface Props {
  customerId: string;
}

export default function GalleryTab({ customerId }: Props) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('All');

  const { data: gallery = [], isLoading, refetch } = useQuery({
    queryKey: ['customerGallery', customerId],
    queryFn: () => fetchCustomerGallery(customerId),
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('media', file);
      // Let backend default category or user can select it
      formData.append('category', 'Reference Design'); 
      const token = sessionStorage.getItem('token');
      await axios.post(`${import.meta.env.VITE_API_URL || '/api'}/customers/${customerId}/gallery`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });
    },
    onSuccess: () => {
      showToast('Image uploaded successfully!', 'success');
      refetch();
    },
    onError: () => {
      showToast('Failed to upload image.', 'error');
    }
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadMutation.mutate(e.target.files[0]);
    }
  };

  const filteredGallery = filter === 'All' ? gallery : gallery.filter((item: any) => item.category === filter);

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-lg flex items-center gap-2"><ImageIcon className="h-5 w-5 text-primary" /> Images & References</h3>
          <p className="text-sm text-slate-500 mt-1">Manage customer photos, reference designs, and fitting pictures.</p>
        </div>
        
        <div className="flex gap-2">
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-1.5 text-sm font-semibold rounded-lg border bg-card focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="All">All Categories</option>
            <option value="Front">Front Profile</option>
            <option value="Back">Back Profile</option>
            <option value="Reference Design">Reference Design</option>
            <option value="Fabric">Fabric</option>
          </select>
          
          <label className="cursor-pointer px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 shadow-sm transition-colors">
            {uploadMutation.isPending ? 'Uploading...' : <><Plus className="h-4 w-4"/> Upload Media</>}
            <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={uploadMutation.isPending} />
          </label>
        </div>
      </div>
      
      {isLoading ? (
        <div className="text-center p-12 text-slate-400 animate-pulse">Loading</div>
      ) : filteredGallery.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card/50 p-16 text-center">
          <ImageIcon className="h-10 w-10 text-muted-foreground mx-auto mb-4 opacity-30" />
          <h3 className="font-semibold text-lg text-slate-500">No Media Found</h3>
          <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto">Upload reference images, fitting photos, or fabric snapshots to build the customer's visual profile.</p>
        </div>
      ) : (
        <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
          {filteredGallery.map((item: any) => (
            <div key={item._id} className="rounded-xl relative overflow-hidden group cursor-pointer w-full break-inside-avoid shadow-sm bg-zinc-800 border border-zinc-200">
              <img src={item.fileUrl} alt={item.fileName || 'Gallery Image'} className="w-full h-auto object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-between p-4 opacity-0 group-hover:opacity-100 transition-all duration-300">
                <span className="text-[10px] font-bold uppercase tracking-wider text-white bg-black/60 self-start px-2 py-1 rounded backdrop-blur-sm shadow-sm">{item.category}</span>
                <div className="flex justify-between items-end">
                  <span className="text-white/90 text-xs font-semibold truncate max-w-[70%]">{item.fileName || 'image.jpg'}</span>
                  <button onClick={() => window.open(item.fileUrl, '_blank')} className="h-8 w-8 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center backdrop-blur-md transition-colors">
                    <Download className="h-4 w-4 text-white" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
