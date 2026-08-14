import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchGroupById, fetchGroupEmployees } from '../lib/api';
import { Building2, Plus, ArrowLeft, Phone, Mail, FileText, MapPin, Search } from 'lucide-react';
import { useGlobalSearch } from '../contexts/GlobalSearchContext';

export default function GroupProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { globalSearch: searchTerm, setGlobalSearch: setSearchTerm } = useGlobalSearch();

  const { data: group, isLoading: isGroupLoading } = useQuery({
    queryKey: ['group', id],
    queryFn: () => fetchGroupById(id!),
    enabled: !!id
  });

  const { data: employees = [], isLoading: isEmployeesLoading } = useQuery({
    queryKey: ['groupEmployees', id],
    queryFn: () => fetchGroupEmployees(id!),
    enabled: !!id
  });

  if (isGroupLoading) {
    return <div className="flex items-center justify-center h-64">Loading group details...</div>;
  }

  if (!group) {
    return <div className="flex items-center justify-center h-64 text-rose-500">Group not found</div>;
  }

  const filteredEmployees = employees.filter((e: any) => {
    const name = e.fullName || `${e.firstName || ''} ${e.lastName || ''}`.trim() || '';
    return name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.mobile && e.mobile.includes(searchTerm)) ||
      (e.employeeCode && e.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()));
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/customers')}
          className="p-2 hover:bg-muted rounded-full transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{group.groupName}</h1>
          <p className="text-muted-foreground">Corporate Group Profile</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="col-span-1 border bg-card rounded-xl shadow-sm p-6 space-y-6 self-start">
          <div className="flex items-center gap-3 border-b pb-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-bold text-lg leading-tight">{group.groupName}</h2>
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700">
                {group.status}
              </span>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            {group.contactPerson && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-muted flex items-center justify-center shrink-0">
                  <span className="font-bold text-muted-foreground">C</span>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs font-semibold uppercase">Contact Person</div>
                  <div className="font-medium">{group.contactPerson}</div>
                </div>
              </div>
            )}
            
            {group.mobile && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-muted flex items-center justify-center shrink-0">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <div className="text-muted-foreground text-xs font-semibold uppercase">Mobile</div>
                  <a href={`tel:${group.mobile}`} className="font-medium text-primary hover:underline">{group.mobile}</a>
                </div>
              </div>
            )}

            {group.email && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-muted flex items-center justify-center shrink-0">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <div className="text-muted-foreground text-xs font-semibold uppercase">Email</div>
                  <a href={`mailto:${group.email}`} className="font-medium text-primary hover:underline">{group.email}</a>
                </div>
              </div>
            )}

            {group.gstNumber && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-muted flex items-center justify-center shrink-0">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <div className="text-muted-foreground text-xs font-semibold uppercase">GST Number</div>
                  <div className="font-medium font-mono uppercase">{group.gstNumber}</div>
                </div>
              </div>
            )}

            {group.address?.city && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-muted flex items-center justify-center shrink-0">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <div className="text-muted-foreground text-xs font-semibold uppercase">Location</div>
                  <div className="font-medium">{group.address.city}, {group.address.state}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="col-span-1 md:col-span-2 border bg-card rounded-xl shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b flex flex-col sm:flex-row items-center justify-between gap-4 bg-muted/20">
            <h3 className="font-bold text-lg flex items-center gap-2">
              Registered Employees
              <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs">{employees.length}</span>
            </h3>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-md border border-input bg-background pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <Link
                to={`/customers/new?groupId=${group._id}`}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 shadow-sm transition-colors whitespace-nowrap"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Employee
              </Link>
            </div>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/40 border-b">
                <tr>
                  <th className="px-6 py-4 font-semibold tracking-wider">Employee Name</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">Employee Code</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">Mobile</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">Total Orders</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {isEmployeesLoading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">Loading employees...</td>
                  </tr>
                ) : filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                      No employees registered yet.
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp: any) => (
                    <tr 
                      key={emp._id} 
                      onClick={() => navigate(`/customers/${emp._id}`)}
                      className="hover:bg-muted/30 transition-colors cursor-pointer group"
                    >
                      <td className="px-6 py-4">
                        <div className="font-semibold text-primary group-hover:underline">
                          {emp.fullName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Unknown Employee'}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono">{emp.employeeCode || '-'}</td>
                      <td className="px-6 py-4">{emp.mobile || '-'}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center justify-center bg-secondary text-secondary-foreground h-6 w-6 rounded-full font-bold text-xs">
                          {emp.totalOrders || 0}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
