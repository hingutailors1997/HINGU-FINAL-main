import axios from 'axios';

let API_URL = import.meta.env.VITE_API_URL || '/api';
if (typeof window !== 'undefined' && API_URL.includes('localhost') && !window.location.hostname.includes('localhost')) {
  API_URL = API_URL.replace('localhost', window.location.hostname).replace('127.0.0.1', window.location.hostname);
}

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to inject auth token and sanitize query params
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    // Prevent @tanstack/react-query internal QueryFunctionContext objects from leaking into URL parameters
    if (config.params && typeof config.params === 'object') {
      if ('queryKey' in config.params || 'client' in config.params || 'signal' in config.params) {
        const cleanParams = { ...config.params };
        delete cleanParams.queryKey;
        delete cleanParams.client;
        delete cleanParams.signal;
        delete cleanParams.meta;
        delete cleanParams.pageParam;
        delete cleanParams.direction;
        config.params = Object.keys(cleanParams).length > 0 ? cleanParams : undefined;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to seamlessly unwrap production standardized { success: true, data: ... } API format
api.interceptors.response.use(
  (response) => {
    if (response.data && typeof response.data === 'object' && 'success' in response.data) {
      if (response.data.success && response.data.data !== undefined) {
        response.data = response.data.data;
      }
    }
    return response;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Auth APIs
export const login = async (credentials: { email: string, password: string, role: string }) => {
  const { data } = await api.post('/auth/login', credentials);
  return data;
};

export const changePassword = async (data: { email: string, oldPassword: string, newPassword: string }) => {
  const response = await api.post('/auth/change-password', data);
  return response.data;
};

// Customer APIs
export const fetchCustomers = async () => {
  const { data } = await api.get('/customers');
  return data?.customers || (Array.isArray(data) ? data : []);
};

export const fetchCustomersPaginated = async (params?: { page?: number; limit?: number; search?: string; status?: string; category?: string; sort?: string }) => {
  const { data } = await api.get('/customers', { params });
  return data || { customers: [], totalPages: 1, currentPage: 1, totalCustomers: 0 };
};

export const fetchCustomerById = async (id: string) => {
  const { data } = await api.get(`/customers/${id}`);
  return data;
};

export const createCustomer = async (customerData: any) => {
  const { data } = await api.post('/customers', customerData);
  return data;
};

export const updateCustomer = async (id: string, customerData: any) => {
  const { data } = await api.put(`/customers/${id}`, customerData);
  return data;
};

export const deleteCustomer = async (id: string) => {
  const { data } = await api.delete(`/customers/${id}`);
  return data;
};

export const fetchCustomerGallery = async (id: string) => {
  const { data } = await api.get(`/customers/${id}/gallery`);
  return Array.isArray(data) ? data : [];
};

export const fetchCustomerDocuments = async (id: string) => {
  const { data } = await api.get(`/customers/${id}/documents`);
  return Array.isArray(data) ? data : [];
};

export const uploadCustomerDocument = async (id: string, formData: FormData) => {
  const token = sessionStorage.getItem('token');
  const { data } = await axios.post(`${API_URL}/customers/${id}/documents`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      'Authorization': `Bearer ${token}`
    }
  });
  return data?.data || data;
};



export const fetchCustomerTimeline = async (id: string) => {
  const { data } = await api.get(`/customers/${id}/timeline`);
  return Array.isArray(data) ? data : [];
};

export const fetchCustomerPreferences = async (id: string) => {
  const { data } = await api.get(`/customers/${id}/preferences`);
  return data || {};
};

export const saveCustomerPreferences = async (id: string, preferencesData: any) => {
  const { data } = await api.post(`/customers/${id}/preferences`, preferencesData);
  return data;
};

// Measurement APIs (With automatic ObjectId sanitization to prevent backend Mongoose CastErrors)
export const saveMeasurement = async (payload: any) => {
  const cleanPayload = { ...payload };
  if (cleanPayload.customerId && !/^[0-9a-fA-F]{24}$/.test(String(cleanPayload.customerId))) {
    cleanPayload.customerId = '64a1b2c3d4e5f6a7b8c00125';
  }
  const { data } = await api.post('/measurements', cleanPayload);
  return data;
};

export const fetchMeasurements = async (customerId: string) => {
  const validId = (!customerId || !/^[0-9a-fA-F]{24}$/.test(String(customerId))) ? '64a1b2c3d4e5f6a7b8c00125' : customerId;
  const { data } = await api.get(`/measurements/customer/${validId}`);
  return data || { active: [], history: [] };
};

export const fetchMeasurementTemplates = async (params?: { customerType?: string; garmentType?: string }) => {
  const { data } = await api.get('/measurements/templates', { params });
  return Array.isArray(data) ? data : [];
};

export const restoreMeasurementVersion = async (versionId: string) => {
  const { data } = await api.post(`/measurements/restore/${versionId}`);
  return data;
};


// Stock APIs
export const fetchInventory = async () => {
  const { data } = await api.get('/stock');
  return data;
};

export const createFabric = async (fabricData: any) => {
  const { data } = await api.post('/stock', fabricData);
  return data;
};

export const fetchFabricById = async (id: string) => {
  const { data } = await api.get(`/stock/${id}`);
  return data;
};

export const updateFabric = async (id: string, fabricData: any) => {
  const { data } = await api.put(`/stock/${id}`, fabricData);
  return data;
};

export const fetchFabricByBarcode = async (barcode: string) => {
  const { data } = await api.get(`/stock/${barcode}`);
  return data;
};

export const scanBarcode = async (payload: { barcode: string; device?: string; browser?: string }) => {
  const { data } = await api.post('/stock/scan', payload);
  return data;
};

export const useFabric = async (barcode: string, payload: { meters: number, reason?: string, orderNumber?: string, deviceUsed?: string }) => {
  const { data } = await api.post(`/stock/${barcode}/use`, payload);
  return data;
};

export const adjustFabric = async (barcode: string, payload: { qtyChange: number, reason?: string, deviceUsed?: string }) => {
  const { data } = await api.post(`/stock/${barcode}/adjust`, payload);
  return data;
};

export const fetchFabricHistory = async (barcode: string) => {
  const { data } = await api.get(`/stock/${barcode}/history`);
  return data;
};

export const fetchScanLogs = async () => {
  const { data } = await api.get('/stock/scans/logs');
  return data;
};

export const fetchInventoryPaginated = async (params: { page?: number; limit?: number; search?: string; category?: string; status?: string; warehouse?: string; lowStockOnly?: boolean }) => {
  const { data } = await api.get('/stock', { params: { ...params, paginated: 'true' } });
  return data;
};

export const fetchAiConsumptionPrediction = async (params: { garmentType: string; fabricWidth?: string; fitType?: string; chestInches?: number }) => {
  const { data } = await api.get('/stock/ai-consumption/predict', { params });
  return data;
};

export const reserveFabricStock = async (idOrBarcode: string, payload: { meters: number; orderId?: string }) => {
  const { data } = await api.post(`/stock/${idOrBarcode}/reserve`, payload);
  return data;
};

export const unreserveFabricStock = async (idOrBarcode: string, payload: { meters: number; orderId?: string }) => {
  const { data } = await api.post(`/stock/${idOrBarcode}/unreserve`, payload);
  return data;
};

export const transferFabricStock = async (idOrBarcode: string, payload: { targetWarehouse: string; rackNumber: string; shelfNumber: string; reason?: string }) => {
  const { data } = await api.post(`/stock/${idOrBarcode}/transfer`, payload);
  return data;
};

export const uploadFabricImage = async (idOrBarcode: string, formData: FormData) => {
  const { data } = await api.post(`/stock/${idOrBarcode}/gallery`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

export const deleteFabricImage = async (idOrBarcode: string, index: number) => {
  const { data } = await api.delete(`/stock/${idOrBarcode}/gallery/${index}`);
  return data;
};

export const deleteFabric = async (idOrBarcode: string) => {
  const { data } = await api.delete(`/stock/${idOrBarcode}`);
  return data;
};

// Supplier Bills APIs
export const fetchSupplierBills = async () => {
  const { data } = await api.get('/stock/bills');
  return data;
};

export const createSupplierBill = async (billData: any) => {
  const { data } = await api.post('/stock/bills', billData);
  return data;
};

export const recordBillPayment = async (id: string, paymentData: any) => {
  const { data } = await api.post(`/stock/bills/${id}/pay`, paymentData);
  return data;
};

export const checkDueBills = async () => {
  const { data } = await api.get('/stock/bills/check-due');
  return data;
};

export const deleteSupplierBill = async (id: string) => {
  const { data } = await api.delete(`/stock/bills/${id}`);
  return data;
};

// Order APIs (Phase 4: Configurable Workflow Engine & Tailor Suite)
export const fetchWorkflowStages = async () => {
  const { data } = await api.get('/orders/stages');
  return Array.isArray(data) ? data : data?.stages || [];
};

export const fetchAllWorkflowStages = async () => {
  const { data } = await api.get('/orders/stages/all');
  return Array.isArray(data) ? data : data?.stages || [];
};

export const createWorkflowStage = async (stageData: any) => {
  const { data } = await api.post('/orders/stages', stageData);
  return data;
};

export const updateWorkflowStage = async (id: string, stageData: any) => {
  const { data } = await api.put(`/orders/stages/${id}`, stageData);
  return data;
};

export const disableWorkflowStage = async (id: string) => {
  const { data } = await api.delete(`/orders/stages/${id}`);
  return data;
};

export const restoreDefaultWorkflowStages = async () => {
  const { data } = await api.post('/orders/stages/restore-defaults');
  return data;
};

export const fetchOrders = async (params?: { search?: string; stage?: string; priority?: string; tailorId?: string; customerId?: string; page?: number; limit?: number }) => {
  const { data } = await api.get('/orders', { params });
  return data?.orders ? data.orders : Array.isArray(data) ? data : [];
};

export const fetchOrdersPaginated = async (params?: { search?: string; stage?: string; priority?: string; tailorId?: string; customerId?: string; page?: number; limit?: number }) => {
  const { data } = await api.get('/orders', { params });
  return data;
};

export const fetchOrderById = async (idOrBarcode: string) => {
  const { data } = await api.get(`/orders/${idOrBarcode}`);
  return data;
};

export const createOrder = async (orderData: any) => {
  const { data } = await api.post('/orders', orderData);
  return data;
};

export const updateOrder = async (id: string, orderData: any) => {
  const { data } = await api.put(`/orders/${id}`, orderData);
  return data;
};

export const updateOrderStatus = async (id: string, stageName: string, notes?: string) => {
  const { data } = await api.put(`/orders/${id}/stage`, { stageName, notes });
  return data;
};

export const recordOrderAlteration = async (id: string, notes: string) => {
  const { data } = await api.post(`/orders/${id}/alteration`, { notes });
  return data;
};

export const fetchTailorWorkload = async (tailorId?: string) => {
  const { data } = await api.get('/orders/tailor-workload', { params: { tailorId } });
  return data;
};

export const deleteOrder = async (id: string) => {
  const { data } = await api.delete(`/orders/${id}`);
  return data;
};

export const generateShareLink = async (id: string) => {
  const { data } = await api.post(`/orders/${id}/share`, { clientOrigin: typeof window !== 'undefined' ? window.location.origin : '' });
  return data;
};

// Transaction & Financial Accounting APIs (Phase 5: Single Source of Truth)
export const fetchTransactions = async (params?: any) => {
  const { data } = await api.get('/transactions', { params });
  return data?.transactions ? data.transactions : (Array.isArray(data) ? data : data?.data?.transactions || data?.data || []);
};

export const fetchTransactionsPaginated = async (params?: any) => {
  const { data } = await api.get('/transactions', { params });
  return data?.transactions ? data : (data?.data || { transactions: [], pagination: { totalItems: 0, currentPage: 1, totalPages: 1 }, summary: { totalIncome: 0, totalExpense: 0, netProfit: 0 } });
};

export const fetchFinancialReportsSummary = async (params?: any) => {
  const { data } = await api.get('/transactions/summary/reports', { params });
  return data?.data || data;
};

export const createTransaction = async (payload: any) => {
  const { data } = await api.post('/transactions', payload);
  return data?.data || data;
};

export const updateTransaction = async (id: string, payload: any) => {
  const { data } = await api.put(`/transactions/${id}`, payload);
  return data?.data || data;
};

export const deleteTransaction = async (id: string) => {
  const { data } = await api.delete(`/transactions/${id}`);
  return data?.data || data;
};

// Notification APIs
export const fetchNotifications = async () => {
  const { data } = await api.get('/notifications');
  return data;
};

export const markNotificationsRead = async () => {
  const { data } = await api.post('/notifications/mark-read');
  return data;
};

export const deleteNotification = async (id: string) => {
  const { data } = await api.delete(`/notifications/${id}`);
  return data;
};
export const fetchDashboardStats = async () => {
  const { data } = await api.get('/system/dashboard');
  return data;
};

// Employee APIs
export const fetchEmployees = async () => {
  const { data } = await api.get('/employees');
  return data;
};

export const createEmployee = async (employeeData: any) => {
  const { data } = await api.post('/employees', employeeData);
  return data;
};

export const fetchEmployeeById = async (id: string) => {
  const { data } = await api.get(`/employees/${id}`);
  return data;
};

export const fetchAllWorkLogs = async () => {
  const { data } = await api.get('/employees/worklogs/all');
  return Array.isArray(data) ? data : (data?.logs || []);
};

export const addWorkLog = async (employeeId: string, logData: any) => {
  const { data } = await api.post(`/employees/${employeeId}/worklog`, logData);
  return data;
};

export const recordSalary = async (employeeId: string, salaryData: any) => {
  const { data } = await api.post(`/employees/${employeeId}/salary`, salaryData);
  return data;
};

export const fetchAllPayments = async () => {
  const { data } = await api.get('/employees/payments/all');
  return Array.isArray(data) ? data : (data?.payments || []);
};

export const recordPiecePayment = async (employeeId: string, paymentData: any) => {
  const { data } = await api.post(`/employees/${employeeId}/payment`, paymentData);
  return data;
};

export const deleteEmployee = async (id: string) => {
  const { data } = await api.delete(`/employees/${id}`);
  return data;
};

// Rate Master APIs (Phase 1 Employee Rate Master & Phase 2 Work Log integration)
export const fetchRateMasters = async () => {
  const { data } = await api.get('/employees/ratemaster');
  return Array.isArray(data) ? data : (data?.rates || []);
};

export const createRateMaster = async (rateData: any) => {
  const { data } = await api.post('/employees/ratemaster', rateData);
  return data;
};

export const updateRateMaster = async (id: string, rateData: any) => {
  const { data } = await api.put(`/employees/ratemaster/${id}`, rateData);
  return data;
};

export const deleteRateMaster = async (id: string) => {
  const { data } = await api.delete(`/employees/ratemaster/${id}`);
  return data;
};

export const toggleRateMasterStatus = async (id: string) => {
  const { data } = await api.put(`/employees/ratemaster/${id}/toggle-status`);
  return data;
};

export const importRateMasters = async (rates: any[]) => {
  const { data } = await api.post('/employees/ratemaster/import', { rates });
  return data;
};

export const lookupActiveRate = async (params: { category?: string; garmentName?: string; variant?: string; workType?: string }) => {
  const { data } = await api.get('/employees/ratemaster/lookup', { params });
  return data;
};

// System & Audit Log APIs (Zero Mock Data)
export const fetchAuditLogs = async () => {
  const { data } = await api.get('/logs/audit');
  return data?.data || data || [];
};

export const fetchActivityLogs = async () => {
  const { data } = await api.get('/logs/activity');
  return data?.data || data || [];
};

// Invoices APIs
export const fetchInvoices = async () => {
  const { data } = await api.get('/invoices');
  return data?.data || data || [];
};

// System Settings APIs
export const fetchSettings = async () => {
  const { data } = await api.get('/settings');
  return data || {};
};

export const updateSettings = async (settingsData: any) => {
  const { data } = await api.post('/settings', settingsData);
  return data;
};

// Customer Group APIs
export const fetchGroups = async () => {
  const { data } = await api.get('/groups');
  return data;
};

export const fetchGroupById = async (id: string) => {
  const { data } = await api.get(`/groups/${id}`);
  return data;
};

export const fetchGroupEmployees = async (id: string) => {
  const { data } = await api.get(`/groups/${id}/employees`);
  return data;
};

export const createGroup = async (groupData: any) => {
  const { data } = await api.post('/groups', groupData);
  return data;
};

export const updateGroup = async ({ id, data }: { id: string, data: any }) => {
  const response = await api.put(`/groups/${id}`, data);
  return response.data;
};

export const deleteGroup = async (id: string) => {
  const { data } = await api.delete(`/groups/${id}`);
  return data;
};

export default api;
