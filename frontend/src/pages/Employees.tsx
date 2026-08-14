import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import WebcamCapture from '../components/WebcamCapture';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, UserCog, MoreHorizontal, Trash2 } from 'lucide-react';
import { fetchEmployees, createEmployee, deleteEmployee } from '../lib/api';
import { useToast } from '../components/Toast';
import { useGlobalSearch } from '../contexts/GlobalSearchContext';

export default function Employees() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { globalSearch: searchTerm, setGlobalSearch: setSearchTerm } = useGlobalSearch();
  const [showNewModal, setShowNewModal] = useState(false);
  const [showWebcam, setShowWebcam] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    mobile: '',
    role: 'Tailor',
    baseSalary: 0,
    photoBase64: ''
  });

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setFormData(prev => ({ ...prev, photoBase64: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleWebcamCapture = (dataUrl: string) => {
    setFormData(prev => ({ ...prev, photoBase64: dataUrl }));
    setShowWebcam(false);
  };

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: fetchEmployees
  });

  const createMutation = useMutation({
    mutationFn: createEmployee,
    onSuccess: (data) => {
      toast('Employee created successfully!', 'success');
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setShowNewModal(false);
      if (data && data._id) {
        navigate(`/employees/${data._id}`);
      }
    },
    onError: (err: any) => {
      toast(err.response?.data?.message || 'Failed to create employee', 'error');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteEmployee(id),
    onSuccess: () => {
      toast('Employee removed successfully!', 'success');
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
    onError: (err: any) => {
      toast(err.response?.data?.message || 'Failed to delete employee', 'error');
    }
  });

  const handleDeleteEmployee = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to completely remove employee "${name}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const filteredEmployees = employees.filter((emp: any) => 
    `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.mobile.includes(searchTerm)
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Employees</h1>
          <p className="text-muted-foreground">Manage employee information, personal details, contact, role, and joining status.</p>
        </div>
        <button 
          onClick={() => setShowNewModal(true)}
          className="w-full sm:w-auto inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 shadow-sm transition-colors"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Employee
        </button>
      </div>

      <div className="rounded-xl border bg-card shadow-sm flex flex-col overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between bg-muted/20">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name or mobile..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-md border border-input bg-background pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/40 border-b">
              <tr>
                <th className="px-6 py-4 font-medium">Employee</th>
                <th className="px-6 py-4 font-medium">Role</th>
                <th className="px-6 py-4 font-medium">Mobile</th>
                <th className="px-6 py-4 font-medium text-right">Pay Structure</th>
                <th className="px-6 py-4 font-medium text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center">
                      <div className="h-6 w-6 rounded-full border-4 border-primary/20 border-t-primary animate-spin mb-4"></div>
                      Loading
                    </div>
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                    No employees found matching your search.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp: any) => (
                  <tr 
                    key={emp._id} 
                    onClick={() => navigate(`/employees/${emp._id}`)}
                    className="border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                          <UserCog className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">{emp.firstName} {emp.lastName}</div>
                          <div className="text-xs text-muted-foreground">{emp.employeeId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-600">
                        {emp.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-muted-foreground">{emp.mobile}</td>
                    <td className="px-6 py-4 text-right font-semibold"><span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 border border-emerald-500/20">Piece Rate</span></td>
                    <td className="px-6 py-4 text-center flex items-center justify-center gap-1">
                      <button 
                        onClick={(e) => handleDeleteEmployee(e, emp._id, `${emp.firstName} ${emp.lastName}`)}
                        title="Delete Employee"
                        className="p-2 hover:bg-rose-50 rounded-full text-slate-400 hover:text-rose-600 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <button className="p-2 hover:bg-muted rounded-full transition-colors">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-md rounded-xl border shadow-lg animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">Add New Employee</h2>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate(formData);
            }} className="p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-2xl bg-blue-50/50 border border-blue-100 mb-4">
                <div className="flex-shrink-0 mx-auto sm:mx-0 w-32 sm:w-auto">
                  <label className="relative block h-24 w-24 sm:h-20 sm:w-20 mx-auto rounded-2xl bg-white border-2 border-dashed border-[#2563EB] hover:bg-blue-50 flex items-center justify-center text-center cursor-pointer transition-colors shadow-2xs overflow-hidden">
                    {formData.photoBase64 ? (
                      <img 
                        src={formData.photoBase64} 
                        alt="Employee" 
                        className="h-full w-full object-cover" 
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center">
                        <span className="text-2xl">📸</span>
                        <span className="text-[10px] font-black text-[#2563EB] group-hover:underline">Add Photo</span>
                      </div>
                    )}
                    <button type="button" onClick={() => setShowWebcam(true)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" aria-label="Open Camera"></button>
                  </label>
                  <div className="flex flex-wrap gap-2 mt-2 justify-center">
                    <button 
                      type="button" 
                      onClick={() => setShowWebcam(true)}
                      className="text-[10px] bg-primary text-primary-foreground px-2 py-1.5 rounded shadow-sm flex-1 font-medium hover:bg-primary/90 transition-colors text-center whitespace-nowrap"
                    >
                      Live Capture
                    </button>
                    <label className="text-[10px] bg-secondary text-secondary-foreground px-2 py-1.5 rounded shadow-sm flex-1 font-medium hover:bg-secondary/80 transition-colors text-center cursor-pointer whitespace-nowrap">
                      Upload File
                      <input accept="image/*" type="file" onChange={handlePhotoSelect} className="hidden" />
                    </label>
                  </div>
                </div>
                <div className="text-xs text-slate-500 sm:max-w-[200px]">
                  <p className="font-semibold text-slate-700 mb-1">Employee Photo (Optional)</p>
                  <p>Upload a clear photo or use your camera to capture their image.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold">First Name</label>
                  <input required type="text" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Last Name</label>
                  <input type="text" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Mobile Number</label>
                <input required type="tel" value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Role</label>
                <select required value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary">
                  <option value="Tailor">Tailor</option>
                  <option value="Master">Master</option>
                  <option value="Cutter">Cutter</option>
                  <option value="Finisher">Finisher</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="pt-4 flex items-center justify-end gap-2">
                <button type="button" onClick={() => setShowNewModal(false)} className="px-4 py-2 text-sm font-semibold">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 transition-colors">
                  {createMutation.isPending ? 'Saving...' : 'Add Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showWebcam && (
        <WebcamCapture 
          onCapture={handleWebcamCapture} 
          onClose={() => setShowWebcam(false)} 
        />
      )}
    </div>
  );
}
