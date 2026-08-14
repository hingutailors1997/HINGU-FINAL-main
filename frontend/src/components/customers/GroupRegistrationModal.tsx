import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createGroup } from '../../lib/api';
import { useToast } from '../Toast';
import { X, Building2, User, Phone, Mail, FileText } from 'lucide-react';

interface GroupRegistrationModalProps {
  onClose: () => void;
}

export default function GroupRegistrationModal({ onClose }: GroupRegistrationModalProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    groupName: '',
    contactPerson: '',
    mobile: '',
    email: '',
    gstNumber: ''
  });

  const createMutation = useMutation({
    mutationFn: createGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast('Group created successfully!', 'success');
      onClose();
    },
    onError: (err: any) => {
      toast(err.response?.data?.message || 'Failed to create group', 'error');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.groupName) {
      toast('Group Name is required', 'error');
      return;
    }
    createMutation.mutate(formData);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="bg-card w-full max-w-lg rounded-xl border shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between p-4 border-b bg-muted/20">
            <div className="flex items-center gap-2 text-primary">
              <Building2 className="h-5 w-5" />
              <h2 className="text-lg font-bold">New Corporate Group</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-md hover:bg-muted text-muted-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Company / Group Name *</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  required
                  value={formData.groupName}
                  onChange={(e) => setFormData({ ...formData, groupName: e.target.value })}
                  className="w-full pl-9 pr-4 py-2 rounded-md border border-input bg-background focus:ring-1 focus:ring-primary focus:border-primary"
                  placeholder="e.g. Veena Developers"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Contact Person</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                  className="w-full pl-9 pr-4 py-2 rounded-md border border-input bg-background focus:ring-1 focus:ring-primary focus:border-primary"
                  placeholder="e.g. John Doe"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">Mobile</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="tel"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    className="w-full pl-9 pr-4 py-2 rounded-md border border-input bg-background focus:ring-1 focus:ring-primary focus:border-primary"
                    placeholder="9876543210"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-9 pr-4 py-2 rounded-md border border-input bg-background focus:ring-1 focus:ring-primary focus:border-primary"
                    placeholder="contact@company.com"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold">GST Number</label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={formData.gstNumber}
                  onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value.toUpperCase() })}
                  className="w-full pl-9 pr-4 py-2 rounded-md border border-input bg-background focus:ring-1 focus:ring-primary focus:border-primary uppercase"
                  placeholder="27AAAAA0000A1Z5"
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-semibold rounded-md hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-md text-sm font-bold shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {createMutation.isPending ? 'Creating...' : 'Create Group'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
