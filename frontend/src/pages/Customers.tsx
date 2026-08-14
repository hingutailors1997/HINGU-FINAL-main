import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Search, Plus, Filter, MoreHorizontal, Download, 
  ChevronLeft, ChevronRight, UserCircle, Trash2, Phone, Edit
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchCustomersPaginated, fetchGroups, deleteCustomer, deleteGroup } from '../lib/api';
import { useToast } from '../components/Toast';
import { useGlobalSearch } from '../contexts/GlobalSearchContext';
import GroupRegistrationModal from '../components/customers/GroupRegistrationModal';

export default function Customers() {
  const { globalSearch: searchTerm, setGlobalSearch: setSearchTerm } = useGlobalSearch();
  const [page, setPage] = useState(1);
  const navigate = useNavigate();

  // Reset page when search term changes globally
  useEffect(() => {
    setPage(1);
  }, [searchTerm]);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState<'individuals' | 'groups'>('individuals');
  const [showGroupModal, setShowGroupModal] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCustomer(id),
    onSuccess: () => {
      toast('Customer deleted from database successfully!', 'success');
      queryClient.invalidateQueries({ queryKey: ['customersPaginated'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
    onError: (err: any) => {
      toast(err.response?.data?.message || 'Failed to delete customer', 'error');
    }
  });

  const handleDeleteGroup = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete corporate group "${name}"?`)) {
      try {
        await deleteGroup(id);
        queryClient.invalidateQueries({ queryKey: ['corporateGroups'] });
        toast('Group deleted successfully', 'success');
      } catch (err: any) {
        toast(err.response?.data?.message || 'Failed to delete group', 'error');
      }
    }
  };
  
  const handleDelete = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to completely remove customer "${name}"? This cannot be undone.`)) {
      deleteMutation.mutate(id);
    }
  };

  const { data: result = { customers: [], totalPages: 1, currentPage: 1, totalCustomers: 0 }, isLoading, isError } = useQuery({
    queryKey: ['customersPaginated', page, searchTerm],
    queryFn: () => fetchCustomersPaginated({ 
      page, 
      limit: 15, 
      search: searchTerm 
    }),
    placeholderData: (previousData) => previousData
  });

  const customers = result.customers || [];

  const { data: groups = [], isLoading: isGroupsLoading } = useQuery({
    queryKey: ['corporateGroups'],
    queryFn: fetchGroups,
  });

  const handleExport = () => {
    const csvContent = [
      ['Customer ID', 'First Name', 'Last Name', 'Mobile', 'Orders', 'Total Bill Amount', 'Balance Left to Paid', 'Tags'].join(','),
      ...customers.map((c: any) => [
        c.customerId,
        c.firstName || '',
        c.lastName || '',
        c.mobile || '',
        c.totalOrders || 0,
        c.totalAmount || c.totalSpent || 0,
        c.pendingBalance || 0,
        (c.tags || []).join(';')
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'customers_directory_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customers & Groups</h1>
          <p className="text-muted-foreground">Manage your client directory and corporate accounts.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {activeTab === 'individuals' ? (
            <>
              <button onClick={handleExport} className="flex-1 sm:flex-none inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-muted h-10 px-4 py-2 transition-colors whitespace-nowrap">
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </button>
              <Link 
                to="/customers/new"
                className="flex-1 sm:flex-none inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 shadow-sm transition-colors whitespace-nowrap"
              >
                <Plus className="mr-2 h-4 w-4" />
                New Customer
              </Link>
            </>
          ) : (
            <button 
              onClick={() => setShowGroupModal(true)}
              className="flex-1 sm:flex-none inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 shadow-sm transition-colors whitespace-nowrap"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Corporate Group
            </button>
          )}
        </div>
      </div>
      
      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('individuals')}
          className={cn(
            "px-6 py-3 text-sm font-medium transition-colors relative",
            activeTab === 'individuals' ? "text-primary" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Individuals
          {activeTab === 'individuals' && (
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full"></span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('groups')}
          className={cn(
            "px-6 py-3 text-sm font-medium transition-colors relative",
            activeTab === 'groups' ? "text-primary" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Corporate Groups
          {activeTab === 'groups' && (
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full"></span>
          )}
        </button>
      </div>

      {/* Table Container */}
      <div className="rounded-xl border bg-card shadow-sm flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b flex flex-col sm:flex-row items-center justify-between gap-4 bg-muted/20">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder={activeTab === 'individuals' ? "Search by Name, Mobile, WhatsApp, Customer ID, or Email..." : "Search corporate groups..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2 text-xs font-extrabold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all shadow-2xs"
            />
          </div>
        </div>

        {/* Dynamic Content based on Active Tab */}
        {activeTab === 'individuals' ? (
          <>
            {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/40 border-b">
              <tr>
                <th className="px-6 py-4 font-medium">Customer Details</th>
                <th className="px-6 py-4 font-medium">Contact</th>
                <th className="px-6 py-4 font-medium text-center">Orders</th>
                <th className="px-6 py-4 font-medium text-right">Balance</th>
                <th className="px-6 py-4 font-medium text-center">Call</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center">
                      <div className="h-8 w-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin mb-4"></div>
                      <p>Loading</p>
                    </div>
                  </td>
                </tr>
              )}
              {!isLoading && customers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-8 py-14 text-center bg-slate-50/50">
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="h-12 w-12 rounded-2xl bg-blue-100 text-[#2563EB] flex items-center justify-center mx-auto shadow-sm border border-blue-200">
                        <UserCircle className="h-6 w-6 stroke-[2.2]" />
                      </div>
                      <h4 className="text-base font-black text-slate-900">
                        {searchTerm ? `Customer "${searchTerm}" Not Found` : "No Customers Found"}
                      </h4>
                      <div className="pt-2">
                        <Link
                          to={searchTerm ? `/customers/new?prefill=${encodeURIComponent(searchTerm)}` : '/customers/new'}
                          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-black text-xs shadow-lg transition-transform transform hover:-translate-y-0.5 cursor-pointer"
                        >
                          <Plus className="h-4 w-4 stroke-[3]" />
                          <span>Create New Customer</span>
                        </Link>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
              {!isLoading && customers.map((customer: any) => (
                <tr key={customer._id} onClick={() => navigate(`/customers/${customer._id}`)} className="border-b last:border-0 hover:bg-muted/30 transition-colors group cursor-pointer">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center text-primary border shadow-sm">
                        <img 
                          src={customer.profilePhotoUrl ? (
                            customer.profilePhotoUrl.startsWith('data:image') 
                              ? customer.profilePhotoUrl 
                              : customer.profilePhotoUrl.startsWith('http')
                                ? `${customer.profilePhotoUrl}?t=${new Date().getTime()}`
                                : `${(import.meta.env.VITE_API_URL || '/api').replace('/api', '')}${customer.profilePhotoUrl.startsWith('/') ? '' : '/'}${customer.profilePhotoUrl}?t=${new Date().getTime()}`
                          ) : customer.imageUrl || customer.image || customer.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(customer.firstName + ' ' + (customer.lastName || ''))}&background=eff6ff&color=2563eb&size=100`} 
                          alt={customer.firstName} 
                          className="h-full w-full object-cover" 
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(customer.firstName + ' ' + (customer.lastName || ''))}&background=eff6ff&color=2563eb&size=100`;
                          }}
                        />
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">{customer.firstName} {customer.lastName}</div>
                        <div className="text-xs text-muted-foreground font-mono">{customer.customerId}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground font-medium">{customer.mobile}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center justify-center bg-secondary text-secondary-foreground h-6 w-6 rounded-full font-bold text-xs">
                      {customer.totalOrders || 0}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={cn(
                      "font-semibold",
                      (customer.pendingBalance || 0) > 0 ? "text-rose-500" : "text-emerald-500"
                    )}>
                      ₹{(customer.pendingBalance || 0).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {customer.mobile ? (
                      <a 
                        href={`tel:${customer.mobile}`} 
                        onClick={(e) => e.stopPropagation()} 
                        title={`Call ${customer.mobile}`}
                        className="inline-flex items-center justify-center p-2 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 transition-colors shadow-sm border border-blue-100"
                      >
                        <Phone className="h-4 w-4" />
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right flex items-center justify-end gap-1">
                    <button 
                      onClick={(e) => handleDelete(e, customer._id, `${customer.firstName} ${customer.lastName}`)}
                      title="Delete Customer"
                      className="p-2 hover:bg-rose-50 rounded-md text-slate-400 hover:text-rose-600 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); navigate(`/customers/edit/${customer._id}`); }}
                      title="Edit Customer"
                      className="p-2 hover:bg-slate-100 rounded-md text-slate-500 hover:text-slate-800 transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="p-4 border-t flex items-center justify-between text-sm text-muted-foreground bg-muted/10">
          <div>
            Showing {customers.length === 0 ? 0 : (result.currentPage - 1) * 15 + 1} to {(result.currentPage - 1) * 15 + customers.length} of {result.totalCustomers} customers
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold mr-2">Page {result.currentPage} of {result.totalPages}</span>
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1 || isLoading}
              className="p-2 border rounded-md hover:bg-muted disabled:opacity-50 transition-colors shadow-sm bg-card text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button 
              onClick={() => setPage(p => Math.min(result.totalPages, p + 1))}
              disabled={page >= result.totalPages || isLoading}
              className="p-2 border rounded-md hover:bg-muted disabled:opacity-50 transition-colors shadow-sm bg-card text-foreground"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
          </>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/40 border-b">
                <tr>
                  <th className="px-6 py-4 font-semibold tracking-wider">Group Name</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">Contact Person</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">Mobile</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">GST Number</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">Status</th>
                  <th className="px-6 py-4 font-semibold tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {isGroupsLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                      <div className="animate-pulse flex items-center justify-center gap-2">
                        <div className="h-4 w-4 rounded-full bg-primary/20"></div>
                        <span>Loading corporate groups...</span>
                      </div>
                    </td>
                  </tr>
                ) : groups.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <UserCircle className="h-12 w-12 mb-4 text-slate-300" />
                        <p className="text-lg font-medium text-slate-600 mb-1">No Corporate Groups Found</p>
                        <p className="text-sm">Create a corporate group to start grouping employees.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  groups.filter((g: any) => g.groupName.toLowerCase().includes(searchTerm.toLowerCase())).map((group: any) => (
                    <tr 
                      key={group._id} 
                      onClick={() => navigate(`/customers/group/${group._id}`)}
                      className="hover:bg-muted/30 transition-colors cursor-pointer group"
                    >
                      <td className="px-6 py-4">
                        <div className="font-semibold text-primary group-hover:underline">{group.groupName}</div>
                      </td>
                      <td className="px-6 py-4">{group.contactPerson || '-'}</td>
                      <td className="px-6 py-4">{group.mobile || '-'}</td>
                      <td className="px-6 py-4 text-xs font-mono">{group.gstNumber || '-'}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700">
                          {group.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={(e) => handleDeleteGroup(e, group._id, group.groupName)}
                          className="p-2 text-destructive hover:bg-destructive/10 rounded-full transition-colors"
                          title="Delete Group"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showGroupModal && (
        <GroupRegistrationModal onClose={() => setShowGroupModal(false)} />
      )}
    </div>
  );
}

