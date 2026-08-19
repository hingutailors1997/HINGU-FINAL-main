import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { ArrowLeft, Save, User, Scissors, DollarSign, Calendar, Plus, Trash2 } from 'lucide-react';
import { createOrder, updateOrder, fetchCustomers, fetchGroups, fetchGroupEmployees, fetchRateMasters, fetchOrderById, fetchMeasurements, saveMeasurement, fetchCustomerById, fetchCustomerMeasurements } from '../lib/api';
import { cn } from '../lib/utils';
import { GARMENT_REGISTRY, ANATOMICAL_PARAMETERS, getDefaultGarmentSpecs } from '../components/customers/profile/measurements/garmentRegistry';

const orderItemSchema = z.object({
  garmentType: z.string().min(2, 'Garment type is required'),
  employeeId: z.string().optional(),
  quantity: z.string().min(1, 'Quantity is required'),
  unitPrice: z.string().min(1, 'Unit price is required'),
  notes: z.string().optional(),
  measurements: z.record(z.any()).optional(),
  measurementProfileToUse: z.string().optional(),
});

const orderSchema = z.object({
  clientType: z.enum(['individual', 'corporate']).default('individual'),
  customerId: z.string().optional(),
  companyGroupId: z.string().optional(),
  dueDate: z.string().min(2, 'Due date is required'),
  items: z.array(orderItemSchema).min(1, 'At least one item is required'),
  advancePaid: z.string().optional(),
}).refine(data => {
  if (data.clientType === 'individual') return !!data.customerId && data.customerId.length > 2;
  if (data.clientType === 'corporate') return !!data.companyGroupId && data.companyGroupId.length > 2;
  return false;
}, {
  message: "Client selection is required",
  path: ["clientSelection"] // Setting path triggers error on form, we'll manually handle below
});

type OrderFormValues = z.infer<typeof orderSchema>;

export default function NewOrder() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const prefilledCustomerId = searchParams.get('customerId');
  const queryClient = useQueryClient();
  const [employeeMeasurementsCache, setEmployeeMeasurementsCache] = useState<Record<string, any[]>>({});

  const { data: orderToEdit } = useQuery({
    queryKey: ['order', id],
    queryFn: () => fetchOrderById(id as string),
    enabled: !!id
  });

  const { data: customers = [], isLoading: isLoadingCustomers } = useQuery({
    queryKey: ['customers'],
    queryFn: () => fetchCustomers()
  });
  
  const { data: specificPrefilledCustomer } = useQuery({
    queryKey: ['customer', prefilledCustomerId],
    queryFn: () => fetchCustomerById(prefilledCustomerId as string),
    enabled: !!prefilledCustomerId
  });

  const { data: groups = [] } = useQuery({
    queryKey: ['groups'],
    queryFn: () => fetchGroups()
  });

  const { data: rateMasters = [] } = useQuery({
    queryKey: ['rateMasters'],
    queryFn: () => fetchRateMasters()
  });

  const { register, control, handleSubmit, watch, setValue, getValues, reset, formState: { errors } } = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      clientType: 'individual',
      customerId: '',
      companyGroupId: '',
      items: [{ garmentType: '', employeeId: '', quantity: '1', unitPrice: '', notes: '', measurementProfileToUse: '' }],
      advancePaid: '0'
    }
  });

  const selectedCustomerId = watch('customerId') || prefilledCustomerId;
  
  const { data: measurementData } = useQuery({
    queryKey: ['measurements', selectedCustomerId],
    queryFn: () => fetchMeasurements(selectedCustomerId as string),
    enabled: !!selectedCustomerId,
  });
  
  const customerActiveMeasurements = measurementData?.active || [];

  const selectedCompanyGroupId = watch('companyGroupId');

  const { data: groupEmployees = [] } = useQuery({
    queryKey: ['groupEmployees', selectedCompanyGroupId],
    queryFn: () => fetchGroupEmployees(selectedCompanyGroupId as string),
    enabled: !!selectedCompanyGroupId
  });

  useEffect(() => {
    if (orderToEdit) {
      reset({
        clientType: orderToEdit.companyGroupId ? 'corporate' : 'individual',
        customerId: orderToEdit.customerId?._id || orderToEdit.customerId || '',
        companyGroupId: orderToEdit.companyGroupId?._id || orderToEdit.companyGroupId || '',
        dueDate: orderToEdit.dueDate ? new Date(orderToEdit.dueDate).toISOString().split('T')[0] : '',
        items: orderToEdit.items?.map((i: any) => ({
          garmentType: i.garmentType,
          employeeId: i.employeeId?._id || i.employeeId || '',
          quantity: String(i.quantity),
          unitPrice: String(i.unitPrice),
          notes: i.notes || '',
          measurements: i.measurements || {}
        })) || [{ garmentType: '', employeeId: '', quantity: '1', unitPrice: '', notes: '', measurements: {} }],
        advancePaid: String(orderToEdit.advancePaid || 0)
      });
    } else if (prefilledCustomerId && specificPrefilledCustomer) {
      if (specificPrefilledCustomer.companyGroupId) {
        setValue('clientType', 'corporate');
        const groupId = specificPrefilledCustomer.companyGroupId._id || specificPrefilledCustomer.companyGroupId;
        setValue('companyGroupId', groupId);
        
        // Pre-fill the employeeId in the first item
        const currentItems = getValues('items');
        if (currentItems && currentItems.length > 0) {
          setValue('items.0.employeeId', prefilledCustomerId);
        }
      } else {
        setValue('clientType', 'individual');
        setValue('customerId', prefilledCustomerId);
      }
    }
  }, [orderToEdit, prefilledCustomerId, specificPrefilledCustomer, reset, setValue, getValues]);

  // Ensure the employee is selected once the groupEmployees dropdown populates
  useEffect(() => {
    if (prefilledCustomerId && watch('clientType') === 'corporate' && groupEmployees.length > 0) {
      const currentItems = getValues('items');
      if (currentItems && currentItems.length > 0 && currentItems[0].employeeId !== prefilledCustomerId) {
        setValue('items.0.employeeId', prefilledCustomerId);
      }
    }
  }, [groupEmployees, prefilledCustomerId, setValue, getValues, watch]);

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items"
  });

  const watchItems = watch("items") || [];
  const watchAdvance = watch("advancePaid") || "0";

  const totalAmount = watchItems.reduce((acc, item) => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.unitPrice) || 0;
    return acc + (qty * price);
  }, 0);
  
  const advance = parseFloat(watchAdvance as string) || 0;
  const balanceAmount = Math.max(0, totalAmount - advance);

  const mutation = useMutation({
    mutationFn: (data: any) => id ? updateOrder(id, data) : createOrder(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      navigate('/orders');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || `Failed to ${id ? 'update' : 'create'} order.`);
    }
  });

  const onSubmit = async (data: OrderFormValues) => {
    // 1. Save measurements for each item back to the customer profile
    if (prefilledCustomerId) {
      for (const item of data.items) {
        if (item.garmentType && item.measurements && Object.keys(item.measurements).length > 0) {
          try {
            await saveMeasurement({
              customerId: prefilledCustomerId,
              garmentType: item.garmentType,
              measurements: item.measurements,
              notes: `Auto-saved from Order Creation`,
              source: 'Order Pipeline'
            });
          } catch (err) {
            console.error('Failed to sync measurements for', item.garmentType, err);
          }
        }
      }
    }

    // 2. Reformat for the backend
    const items = data.items.map(item => ({
      garmentType: item.garmentType,
      employeeId: item.employeeId || undefined,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      totalPrice: Number(item.quantity) * Number(item.unitPrice),
      notes: item.notes,
      measurements: item.measurements
    }));

    const orderData: any = {
      dueDate: data.dueDate,
      items,
      totalAmount,
      advancePaid: Number(data.advancePaid || 0),
      balanceAmount
    };

    if (data.clientType === 'corporate') {
      orderData.companyGroupId = data.companyGroupId;
    } else {
      orderData.customerId = data.customerId;
    }

    mutation.mutate(orderData);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/orders')}
          className="p-2 hover:bg-muted rounded-full transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{id ? 'Edit Order' : 'Create New Order'}</h1>
          <p className="text-muted-foreground text-sm">{id ? 'Update the details for this customer order.' : 'Add a new customer order to the workflow pipeline.'}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        
        {/* Customer & Timeline Card */}
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b bg-muted/20 flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Customer & Timeline</h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className={cn("space-y-4", (prefilledCustomerId || id) ? "md:col-span-1" : "md:col-span-2")}>
              <div className="flex items-center gap-4 border-b pb-3">
                <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
                  <input type="radio" value="individual" {...register('clientType')} disabled={!!id || !!prefilledCustomerId} className="text-primary focus:ring-primary h-4 w-4" />
                  Individual Customer
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
                  <input type="radio" value="corporate" {...register('clientType')} disabled={!!id || !!prefilledCustomerId} className="text-primary focus:ring-primary h-4 w-4" />
                  Corporate Group
                </label>
              </div>

              {(prefilledCustomerId || id) ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Selected Client *</label>
                  <div className="w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-slate-700 font-semibold shadow-sm flex items-center">
                    {watch('clientType') === 'corporate' 
                      ? groups.find((g: any) => g._id === watch('companyGroupId'))?.groupName || 'Corporate Group'
                      : customers.find((c: any) => c._id === (prefilledCustomerId || watch('customerId')))?.fullName || 'Selected Customer'
                    }
                  </div>
                </div>
              ) : watch('clientType') === 'corporate' ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Corporate Group *</label>
                  <select
                    {...register('companyGroupId')}
                    className={cn(
                      "w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all",
                      errors.companyGroupId ? "border-destructive focus:ring-destructive" : "border-input"
                    )}
                  >
                    <option value="">-- Choose a Corporate Group --</option>
                    {groups.map((g: any) => (
                      <option key={g._id} value={g._id}>{g.groupName}</option>
                    ))}
                  </select>
                  {errors.companyGroupId && <p className="text-xs text-destructive">{errors.companyGroupId.message}</p>}
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Customer *</label>
                  <select
                    {...register('customerId')}
                    className={cn(
                      "w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all",
                      errors.customerId ? "border-destructive focus:ring-destructive" : "border-input"
                    )}
                  >
                    <option value="">-- Choose a Customer --</option>
                    {customers.filter((c:any) => !c.companyGroupId).map((c: any) => (
                      <option key={c._id} value={c._id}>{c.fullName} ({c.mobile})</option>
                    ))}
                  </select>
                  {errors.customerId && <p className="text-xs text-destructive">{errors.customerId.message}</p>}
                </div>
              )}
              {errors.root?.clientSelection && <p className="text-xs text-destructive">{errors.root.clientSelection.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground" /> Due Date *</label>
              <input
                type="date"
                {...register('dueDate')}
                className={cn(
                  "w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all",
                  errors.dueDate ? "border-destructive focus:ring-destructive" : "border-input"
                )}
              />
              {errors.dueDate && <p className="text-xs text-destructive">{errors.dueDate.message}</p>}
            </div>

          </div>
        </div>

        {/* Garment Items Card */}
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b bg-muted/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scissors className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm">Garment Items</h3>
            </div>
            <div className="flex items-center gap-4">
              <p className="hidden md:block text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                ✨ Measurements automatically pulled from profile
              </p>
              <button
                type="button"
                onClick={() => append({ garmentType: '', quantity: '1', unitPrice: '', notes: '' })}
                className="text-xs flex items-center gap-1 font-medium text-primary hover:text-primary/80 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> Add Item
              </button>
            </div>
          </div>
          
          <div className="px-6 pt-4 md:hidden">
            <p className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md text-center">
              ✨ Measurements automatically pulled from profile
            </p>
          </div>
          
          <div className="p-6 space-y-6">
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start p-4 bg-muted/30 rounded-lg border">
                <div className="md:col-span-3 space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Garment Type *</label>
                  <select
                    {...register(`items.${index}.garmentType` as const)}
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                    onChange={(e) => {
                      // Optionally auto-fill unit price when garment is selected
                      const selectedRate = rateMasters.find((rm: any) => rm.garmentName === e.target.value);
                      if (selectedRate) {
                        setValue(`items.${index}.unitPrice`, String(selectedRate.defaultSellingPrice || selectedRate.rate || 0));
                      }
                      // Pre-fill measurements
                      let targetCustomerId = watch('clientType') === 'corporate' ? watchItems[index]?.employeeId : watch('customerId');
                      targetCustomerId = targetCustomerId || prefilledCustomerId;
                      if (targetCustomerId) {
                         const savedGarment = customerActiveMeasurements.find((m: any) => m.garmentType.toLowerCase() === e.target.value.toLowerCase());
                         if (savedGarment && savedGarment.measurements) {
                           setValue(`items.${index}.measurements`, savedGarment.measurements);
                           setValue(`items.${index}.measurementProfileToUse`, savedGarment.garmentType);
                         } else if (GARMENT_REGISTRY[e.target.value]) {
                           setValue(`items.${index}.measurements`, getDefaultGarmentSpecs(e.target.value));
                           setValue(`items.${index}.measurementProfileToUse`, '');
                         } else {
                           setValue(`items.${index}.measurements`, {});
                           setValue(`items.${index}.measurementProfileToUse`, '');
                         }
                      } else {
                        if (GARMENT_REGISTRY[e.target.value]) {
                           setValue(`items.${index}.measurements`, getDefaultGarmentSpecs(e.target.value));
                           setValue(`items.${index}.measurementProfileToUse`, '');
                         } else {
                           setValue(`items.${index}.measurements`, {});
                           setValue(`items.${index}.measurementProfileToUse`, '');
                         }
                      }
                    }}
                  >
                    <option value="">-- Select Garment --</option>
                    {rateMasters.map((rm: any) => (
                      <option key={rm._id || rm.id} value={rm.garmentName}>{rm.garmentName}</option>
                    ))}
                  </select>
                  {errors.items?.[index]?.garmentType && <p className="text-[10px] text-destructive">{errors.items[index]?.garmentType?.message}</p>}
                </div>

                <div className="md:col-span-3 space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Base Measurements</label>
                  <select
                    {...register(`items.${index}.measurementProfileToUse` as const)}
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                    onChange={(e) => {
                      const selectedProfile = e.target.value;
                      const activeList = watch('clientType') === 'corporate' && watchItems[index]?.employeeId 
                        ? (employeeMeasurementsCache[watchItems[index].employeeId] || []) 
                        : customerActiveMeasurements;
                        
                      const savedGarment = activeList.find((m: any) => m.garmentType === selectedProfile);
                      if (savedGarment && savedGarment.measurements) {
                        const filledMeasurements = Object.fromEntries(
                          Object.entries(savedGarment.measurements).filter(([_, v]) => v !== '' && v != null)
                        );
                        setValue(`items.${index}.measurements`, filledMeasurements);
                      } else {
                        // Revert to default for the current garmentType
                        const currentGarment = watchItems[index]?.garmentType;
                        if (currentGarment && GARMENT_REGISTRY[currentGarment]) {
                          setValue(`items.${index}.measurements`, getDefaultGarmentSpecs(currentGarment));
                        } else {
                          setValue(`items.${index}.measurements`, {});
                        }
                      }
                    }}
                  >
                    <option value="">-- Blank / Default --</option>
                    {(watch('clientType') === 'corporate' && watchItems[index]?.employeeId 
                        ? (employeeMeasurementsCache[watchItems[index].employeeId] || []) 
                        : customerActiveMeasurements
                    ).map((m: any) => (
                      <option key={m._id || m.garmentType} value={m.garmentType}>{m.garmentType} Profile</option>
                    ))}
                  </select>
                </div>

                {watch('clientType') === 'corporate' && (
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">For Employee</label>
                    <select
                      {...register(`items.${index}.employeeId` as const)}
                      className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                      onChange={async (e) => {
                        const empId = e.target.value;
                        setValue(`items.${index}.employeeId`, empId);
                        if (empId && !employeeMeasurementsCache[empId]) {
                          try {
                            const data = await fetchMeasurements(empId);
                            if (data && data.active) {
                              setEmployeeMeasurementsCache(prev => ({ ...prev, [empId]: data.active }));
                            }
                          } catch (err) {
                            console.error('Failed to fetch employee measurements');
                          }
                        }
                      }}
                    >
                      <option value="">-- Employee --</option>
                      {groupEmployees.map((c: any) => (
                        <option key={c._id} value={c._id}>{c.fullName}</option>
                      ))}
                    </select>
                  </div>
                )}
                
                <div className={cn("space-y-1.5", watch('clientType') === 'corporate' ? "md:col-span-1" : "md:col-span-2")}>
                  <label className="text-xs font-medium text-muted-foreground">Qty *</label>
                  <input
                    type="number"
                    {...register(`items.${index}.quantity` as const)}
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  />
                </div>

                <div className="md:col-span-3 space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Unit Price (₹) *</label>
                  <input
                    type="number"
                    {...register(`items.${index}.unitPrice` as const)}
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  />
                  {errors.items?.[index]?.unitPrice && <p className="text-[10px] text-destructive">{errors.items[index]?.unitPrice?.message}</p>}
                </div>

                <div className="md:col-span-3 space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Item Total</label>
                  <div className="px-3 py-1.5 text-sm font-semibold border border-transparent bg-background/50 rounded-md">
                    ₹{((parseFloat(watchItems[index]?.quantity || '0')) * (parseFloat(watchItems[index]?.unitPrice || '0'))).toLocaleString()}
                  </div>
                </div>

                <div className="md:col-span-1 flex items-end h-full pb-1">
                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-md transition-colors"
                      title="Remove Item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="md:col-span-12 space-y-1.5">
                  <input
                    {...register(`items.${index}.notes` as const)}
                    placeholder="Specific design notes, styling requirements, or fabric details for this item..."
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  />
                </div>

                {/* Garment Measurements Grid */}
                {watchItems[index]?.garmentType && (
                  <div className="md:col-span-12 mt-4 space-y-3 p-4 bg-white rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Scissors className="h-4 w-4 text-[#2563EB]" />
                        <h4 className="text-sm font-bold text-slate-800">{watchItems[index].garmentType} Measurements</h4>
                        <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold ml-2 hidden sm:inline-block">Will sync to profile</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const customKey = window.prompt("Enter new measurement name (e.g., Height, Shoulder Angle):");
                          if (customKey && customKey.trim()) {
                            const key = customKey.trim().toLowerCase().replace(/\s+/g, '_');
                            const currentMeasurements = watchItems[index].measurements || {};
                            setValue(`items.${index}.measurements`, {
                              ...currentMeasurements,
                              [key]: ''
                            });
                          }
                        }}
                        className="text-[10px] font-bold text-primary hover:text-primary/80 bg-primary/10 px-2 py-1 rounded-md transition-colors"
                      >
                        + Add Custom
                      </button>
                    </div>
                    {watchItems[index]?.measurements && Object.keys(watchItems[index].measurements).length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3">
                        {Object.keys(watchItems[index].measurements).map((paramId: string) => {
                          const param = ANATOMICAL_PARAMETERS[paramId] || { label: paramId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), description: '' };
                          return (
                            <div key={paramId} className="relative group bg-slate-50/70 p-3 rounded-xl border border-slate-200/80 hover:border-blue-300 transition-colors focus-within:border-[#2563EB] focus-within:bg-white focus-within:shadow-xs space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <label className="text-xs font-black text-slate-900 tracking-tight block truncate pr-6" title={param.label}>{param.label}</label>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (window.confirm(`Remove ${param.label}?`)) {
                                      const currentMeasurements = { ...watchItems[index].measurements };
                                      delete currentMeasurements[paramId];
                                      setValue(`items.${index}.measurements`, currentMeasurements);
                                    }
                                  }}
                                  className="absolute right-2 top-2 text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Remove parameter"
                                >
                                  &times;
                                </button>
                                <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 bg-slate-200/80 text-slate-600 rounded">
                                  INCH
                                </span>
                              </div>
                              <div className="relative">
                                <input
                                  type="number"
                                  step="0.25"
                                  {...register(`items.${index}.measurements.${paramId}` as const)}
                                  className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2563EB] transition-all"
                                />
                              </div>
                              {param.description && (
                                <p className="text-[10px] text-slate-500 leading-snug line-clamp-2" title={param.description}>
                                  {param.description}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-4 bg-slate-50 rounded border border-dashed border-slate-200">
                        <p className="text-xs text-slate-500">No measurements specified. Select a Base Spec above or add custom measurements.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Financials Card */}
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b bg-muted/20 flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Financial Summary</h3>
          </div>
          <div className="p-6">
            <div className="max-w-sm ml-auto space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground font-medium">Subtotal</span>
                <span className="font-semibold">₹{totalAmount.toLocaleString()}</span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground font-medium">Advance Paid (₹)</span>
                <input
                  type="number"
                  {...register('advancePaid')}
                  className="w-32 rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all text-right"
                  placeholder="0"
                />
              </div>
              
              <div className="pt-4 border-t flex items-center justify-between">
                <span className="font-bold text-base">Balance Due</span>
                <span className={cn("font-bold text-lg", balanceAmount > 0 ? "text-amber-600" : "text-emerald-600")}>
                  ₹{balanceAmount.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-4 pt-2">
          <button 
            type="button"
            onClick={() => navigate(prefilledCustomerId ? `/customers/${prefilledCustomerId}` : '/')}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button 
            type="submit"
            disabled={mutation.isPending}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-8 shadow-sm transition-all disabled:opacity-50"
          >
            {mutation.isPending ? 'Saving...' : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {id ? 'Update Order' : 'Confirm Order'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
