import React, { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Save, Package, Camera, Upload, Trash2, Image as ImageIcon, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createFabric, updateFabric } from '../lib/api';

const fabricSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  category: z.string().min(2, 'Category is required'),
  material: z.string().optional(),
  color: z.string().optional(),
  brand: z.string().optional(),
  partyName: z.string().optional(),
  width: z.string().optional(),
  purchasePrice: z.string().optional(),
  sellingPrice: z.string().optional(),
  currentStock: z.string().min(1, 'Initial stock is required'),
  minimumStock: z.string().optional(),
});

type FabricFormValues = z.infer<typeof fabricSchema>;

export default function NewFabric() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const editFabric = state?.fabric;
  const isEditMode = !!editFabric;

  const { register, handleSubmit, formState: { errors } } = useForm<FabricFormValues>({
    defaultValues: isEditMode ? {
      name: editFabric.name,
      category: editFabric.category,
      material: editFabric.material,
      color: editFabric.color,
      brand: editFabric.brand,
      partyName: editFabric.partyName,
      width: editFabric.width,
      purchasePrice: editFabric.purchasePrice ? String(editFabric.purchasePrice) : '',
      sellingPrice: editFabric.sellingPrice ? String(editFabric.sellingPrice) : '',
      currentStock: editFabric.totalAvailable ? String(editFabric.totalAvailable) : '',
      minimumStock: editFabric.minimumStock ? String(editFabric.minimumStock) : '',
    } : {}
  });
  const queryClient = useQueryClient();

  const [imageUrl, setImageUrl] = useState<string | null>(isEditMode && editFabric.gallery?.length > 0 ? editFabric.gallery[0] : null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const startCamera = async () => {
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      alert("Unable to access camera. Please check browser permissions or switch to device file upload.");
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setImageUrl(dataUrl);
        stopCamera();
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setImageUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const mutation = useMutation({
    mutationFn: (data: any) => isEditMode ? updateFabric(editFabric.fabricId || editFabric._id, data) : createFabric(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['fabric', editFabric?.fabricId || editFabric?._id] });
      // navigate to the new fabric's details page
      if (data && data.fabricId) {
        navigate(`/stock/${data.fabricId}`);
      } else {
        navigate('/stock');
      }
    },
    onError: (err: any) => {
      if (err.response?.status === 401) {
        alert('Your session has expired. Please log out and log in again.');
      } else {
        alert(err.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'add'} fabric.`);
      }
    }
  });

  const onSubmit = (data: FabricFormValues) => {
    mutation.mutate({
      name: data.name,
      category: data.category,
      material: data.material,
      color: data.color,
      brand: data.brand,
      partyName: data.partyName,
      width: data.width,
      purchasePrice: data.purchasePrice ? Number(data.purchasePrice) : 0,
      sellingPrice: data.sellingPrice ? Number(data.sellingPrice) : (data.purchasePrice ? Number(data.purchasePrice) : 0),
      pricePerMeter: data.sellingPrice ? Number(data.sellingPrice) : (data.purchasePrice ? Number(data.purchasePrice) : 0),
      totalAvailable: Number(data.currentStock),
      minimumStock: data.minimumStock ? Number(data.minimumStock) : 10,
      imageUrl: imageUrl || undefined,
      gallery: imageUrl ? [imageUrl] : []
    } as any);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-muted rounded-full transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{isEditMode ? 'Edit Fabric' : 'Add New Fabric'}</h1>
          <p className="text-muted-foreground text-sm">{isEditMode ? 'Update existing fabric details.' : 'Create a new inventory listing.'}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b bg-muted/20 flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Fabric Details</h3>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">            <div className="space-y-2">
              <label className="text-sm font-medium">Fabric Name *</label>
              <input
                {...register('name')}
                className={cn(
                  "w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all",
                  errors.name ? "border-destructive focus:ring-destructive" : "border-input"
                )}
                placeholder="e.g. Premium White Cotton"
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Category *</label>
              <select
                {...register('category')}
                className={cn(
                  "w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all",
                  errors.category ? "border-destructive focus:ring-destructive" : "border-input"
                )}
              >
                <option value="Shirting">Shirting</option>
                <option value="Suiting">Suiting</option>
                <option value="Kurta">Kurta</option>
                <option value="Lining">Lining</option>
                <option value="Other">Other</option>
              </select>
              {errors.category && <p className="text-xs text-destructive">{errors.category.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Material</label>
              <input
                {...register('material')}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                placeholder="e.g. 100% Cotton"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Color</label>
              <input
                {...register('color')}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                placeholder="e.g. White"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Brand</label>
              <input
                {...register('brand')}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                placeholder="e.g. Raymond"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Party Name</label>
              <input
                {...register('partyName')}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                placeholder="e.g. ABC Textiles"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Width</label>
              <input
                {...register('width')}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                placeholder="e.g. 58 inches"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Purchase Price (per meter)</label>
              <input
                {...register('purchasePrice')}
                type="number"
                step="any"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                placeholder="e.g. 250"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Selling Price (per meter)</label>
              <input
                {...register('sellingPrice')}
                type="number"
                step="any"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                placeholder="e.g. 450"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Initial Stock (meters) *</label>
              <input
                {...register('currentStock')}
                type="number"
                step="any"
                className={cn(
                  "w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all",
                  errors.currentStock ? "border-destructive focus:ring-destructive" : "border-input"
                )}
                placeholder="e.g. 50"
              />
              {errors.currentStock && <p className="text-xs text-destructive">{errors.currentStock.message}</p>}
            </div>
            
          </div>
        </div>

        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b bg-muted/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm">Fabric Image & Visual Reference</h3>
            </div>
            {imageUrl && (
              <button
                type="button"
                onClick={() => setImageUrl(null)}
                className="text-xs text-rose-500 hover:text-rose-600 flex items-center gap-1 font-medium"
              >
                <Trash2 className="h-3.5 w-3.5" /> Remove Image
              </button>
            )}
          </div>
          
          <div className="p-6">
            {imageUrl ? (
              <div className="flex flex-col items-center sm:items-start gap-4">
                <div className="relative rounded-lg overflow-hidden border border-input max-w-sm max-h-64 shadow-sm">
                  <img src={imageUrl} alt="Fabric Preview" className="w-full h-full object-cover" />
                </div>
                <p className="text-xs text-muted-foreground">Image successfully captured/uploaded and ready to save with fabric record.</p>
              </div>
            ) : isCameraActive ? (
              <div className="space-y-4 flex flex-col items-center">
                <div className="relative rounded-lg overflow-hidden border-2 border-primary/20 bg-black max-w-md w-full aspect-video flex items-center justify-center">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm flex items-center gap-2 shadow"
                  >
                    <Camera className="w-4 h-4" /> Capture Snapshot
                  </button>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="px-4 py-2.5 border rounded-lg hover:bg-muted font-medium text-sm text-muted-foreground"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={startCamera}
                  className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-primary/20 rounded-xl hover:border-primary hover:bg-primary/5 transition-all group cursor-pointer"
                >
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                    <Camera className="h-6 w-6 text-primary" />
                  </div>
                  <h4 className="font-semibold text-sm">Take Photo with Camera</h4>
                  <p className="text-xs text-muted-foreground mt-1 text-center">Use webcam or mobile device camera to snapshot fabric pattern</p>
                </button>

                <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-input rounded-xl hover:border-primary/50 hover:bg-muted/30 transition-all group cursor-pointer">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                    <Upload className="h-6 w-6 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                  <h4 className="font-semibold text-sm">Upload from Device</h4>
                  <p className="text-xs text-muted-foreground mt-1 text-center">Select an existing image file (JPG, PNG, WEBP)</p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>
        </div>

        <div className="flex items-center justify-end gap-4 pt-4 border-t">
          <button 
            type="button"
            onClick={() => navigate('/stock')}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button 
            type="submit"
            disabled={mutation.isPending}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-6 shadow-sm transition-all disabled:opacity-50"
          >
            {mutation.isPending ? 'Saving...' : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {isEditMode ? 'Update Fabric' : 'Add Fabric'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
