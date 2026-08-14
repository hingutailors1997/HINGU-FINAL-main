import { useState, useEffect } from 'react';
import { Save, Store, Globe, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchSettings, updateSettings } from '../lib/api';
import { useToast } from '../components/Toast';

export default function Settings() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [businessName, setBusinessName] = useState('Hingu Tailors');
  const [contactEmail, setContactEmail] = useState('admin@hingutailors.com');
  const [contactPhone, setContactPhone] = useState('8655717013 | 9892074570');
  const [shopAddress, setShopAddress] = useState('Shop No. 4, Ronak Bhavan, Bachani Nagar, Daftari Road,');
  const [shopAddress2, setShopAddress2] = useState('Malad (East), Mumbai - 400 097.');

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: fetchSettings,
  });

  useEffect(() => {
    if (settings) {
      if (settings.businessName) setBusinessName(settings.businessName);
      if (settings.contactEmail) setContactEmail(settings.contactEmail);
      if (settings.contactPhone) setContactPhone(settings.contactPhone);
      if (settings.shopAddress) setShopAddress(settings.shopAddress);
      if (settings.shopAddress2) setShopAddress2(settings.shopAddress2);
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      showToast('Settings saved successfully', 'success');
    },
    onError: (err: any) => {
      showToast(err?.response?.data?.message || 'Failed to save settings', 'error');
    }
  });

  const handleSave = () => {
    updateMutation.mutate({
      businessName,
      contactEmail,
      contactPhone,
      shopAddress,
      shopAddress2
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
        <p className="text-muted-foreground">Manage your business profile and app preferences.</p>
      </div>

      <div className="grid md:grid-cols-4 gap-6 mt-8">
        <div className="md:col-span-1 flex flex-col gap-1">
          <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-primary/10 text-primary rounded-md">
            <Store className="h-4 w-4" /> Business Profile
          </button>
        </div>

        <div className="md:col-span-3 space-y-6">
          <div className="rounded-xl border bg-card shadow-sm p-6 space-y-6">
            <h3 className="text-lg font-semibold border-b pb-4">Business Details</h3>
            
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Business Name</label>
                <input 
                  type="text" 
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:border-primary" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Contact Phone(s)</label>
                <input 
                  type="text" 
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:border-primary" 
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium">Contact Email</label>
                <input 
                  type="email" 
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:border-primary" 
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium">Shop Address (Line 1)</label>
                <input 
                  type="text" 
                  value={shopAddress}
                  onChange={(e) => setShopAddress(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:border-primary" 
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium">Shop Address (Line 2)</label>
                <input 
                  type="text" 
                  value={shopAddress2}
                  onChange={(e) => setShopAddress2(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:border-primary" 
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button 
                onClick={handleSave}
                disabled={updateMutation.isPending || isLoading}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-6 shadow-sm transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {updateMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
