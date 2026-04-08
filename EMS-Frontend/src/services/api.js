import axios from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
export const API_URL = BASE_URL.replace('/api', '');

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' }
});

// Request interceptor — attach token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('ems_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// Response interceptor — handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('ems_token');
      localStorage.removeItem('ems_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ---- Auth ----
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  registerCompany: (data) => api.post('/auth/register-company', data),
  getMe: () => api.get('/auth/me'),
  forgotPassword: (data) => api.post('/auth/forgotpassword', data),
  resetPassword: (data) => api.post('/auth/resetpassword', data),
  verifyEmail: (data) => api.post('/auth/verifyemail', data),
  sendVerification: () => api.post('/auth/sendverification'),
  updatePassword: (data) => api.put('/auth/updatepassword', data),
  updateProfile: (data) => api.put('/auth/profile', data),
  uploadAvatar: (formData) => api.post('/auth/profile/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  logout: () => api.post('/auth/logout')
};

// ---- Employees ----
export const employeeAPI = {
  getAll: (params) => api.get('/employees', { params }),
  getOne: (id) => api.get(`/employees/${id}`),
  create: (data) => api.post('/employees', data),
  update: (id, data) => api.put(`/employees/${id}`, data),
  delete: (id) => api.delete(`/employees/${id}`),
  getStats: () => api.get('/employees/stats'),
  uploadDocument: (id, formData) => api.post(`/employees/${id}/documents`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
};

// ---- Attendance ----
export const attendanceAPI = {
  checkIn: (data) => api.post('/attendance/checkin', data),
  checkOut: (data) => api.post('/attendance/checkout', data),
  getAll: (params) => api.get('/attendance', { params }),
  markAttendance: (data) => api.post('/attendance/mark', data),
  getToday: () => api.get('/attendance/today'),
  getMyToday: () => api.get('/attendance/my-today')
};

// ---- Leaves ----
export const leaveAPI = {
  getAll: (params) => api.get('/leaves', { params }),
  apply: (data) => api.post('/leaves', data),
  updateStatus: (id, data) => api.put(`/leaves/${id}/status`, data),
  getBalance: (params) => api.get('/leaves/balance', { params }),
  cancel: (id) => api.put(`/leaves/${id}/cancel`),
  update: (id, data) => api.put(`/leaves/${id}`, data)
};

// ---- Payroll ----
export const payrollAPI = {
  generate: (data) => api.post('/payroll/generate', data),
  getAll: (params) => api.get('/payroll', { params }),
  getOne: (id) => api.get(`/payroll/${id}`),
  updateStatus: (id, data) => api.put(`/payroll/${id}/status`, data),
  getReport: (params) => api.get('/payroll/report', { params })
};

// ---- Projects ----
export const projectAPI = {
  getAll: (params) => api.get('/projects', { params }),
  getOne: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.put(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`),
  getAllTasks: (params) => api.get('/projects/tasks/all', { params }),
  createTask: (data) => api.post('/projects/tasks', data),
  updateTask: (id, data) => api.put(`/projects/tasks/${id}`, data),
  deleteTask: (id) => api.delete(`/projects/tasks/${id}`),
  addComment: (id, data) => api.post(`/projects/tasks/${id}/comments`, data)
};

// ---- ERP ----
export const erpAPI = {
  // Clients
  getClients: (params) => api.get('/erp/clients', { params }),
  createClient: (data) => api.post('/erp/clients', data, { headers: { 'Content-Type': data instanceof FormData ? 'multipart/form-data' : 'application/json' } }),
  updateClient: (id, data) => api.put(`/erp/clients/${id}`, data, { headers: { 'Content-Type': data instanceof FormData ? 'multipart/form-data' : 'application/json' } }),
  deleteClient: (id) => api.delete(`/erp/clients/${id}`),
  // Vendors
  getVendors: (params) => api.get('/erp/vendors', { params }),
  createVendor: (data) => api.post('/erp/vendors', data, { headers: { 'Content-Type': data instanceof FormData ? 'multipart/form-data' : 'application/json' } }),
  updateVendor: (id, data) => api.put(`/erp/vendors/${id}`, data, { headers: { 'Content-Type': data instanceof FormData ? 'multipart/form-data' : 'application/json' } }),
  deleteVendor: (id) => api.delete(`/erp/vendors/${id}`),
  // Invoices
  getInvoices: (params) => api.get('/erp/invoices', { params }),
  createInvoice: (data) => api.post('/erp/invoices', data),
  updateInvoice: (id, data) => api.put(`/erp/invoices/${id}`, data),
  deleteInvoice: (id) => api.delete(`/erp/invoices/${id}`),
  // Expenses
  getExpenses: (params) => api.get('/erp/expenses', { params }),
  createExpense: (data) => api.post('/erp/expenses', data, { headers: { 'Content-Type': data instanceof FormData ? 'multipart/form-data' : 'application/json' } }),
  updateExpense: (id, data) => api.put(`/erp/expenses/${id}`, data, { headers: { 'Content-Type': data instanceof FormData ? 'multipart/form-data' : 'application/json' } }),
  deleteExpense: (id) => api.delete(`/erp/expenses/${id}`),
  // Inventory
  getInventory: (params) => api.get('/erp/inventory', { params }),
  createInventoryItem: (data) => api.post('/erp/inventory', data),
  updateInventoryItem: (id, data) => api.put(`/erp/inventory/${id}`, data),
  deleteInventoryItem: (id) => api.delete(`/erp/inventory/${id}`),
  // Sales
  getSales: (params) => api.get('/erp/sales', { params }),
  getSaleById: (id) => api.get(`/erp/sales/${id}`),
  createSale: (data) => api.post('/erp/sales', data),
  deleteSale: (id) => api.delete(`/erp/sales/${id}`),
  // Purchases
  getPurchases: (params) => api.get('/erp/purchases', { params }),
  createPurchase: (data) => api.post('/erp/purchases', data),
  deletePurchase: (id) => api.delete(`/erp/purchases/${id}`)
};

// ---- System ----
export const systemAPI = {
  getDashboard: () => api.get('/dashboard'),
  getReport: (type, params) => api.get(`/reports/${type}`, { params }),
  // Notifications
  getNotifications: () => api.get('/notifications'),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  sendDirectMessage: (data) => api.post('/direct-message', data),
  // Announcements
  getAnnouncements: () => api.get('/announcements'),
  createAnnouncement: (data) => api.post('/announcements', data),
  deleteAnnouncement: (id) => api.delete(`/announcements/${id}`),
  // Tickets
  getTickets: (params) => api.get('/tickets', { params }),
  createTicket: (data) => api.post('/tickets', data),
  replyTicket: (id, data) => api.post(`/tickets/${id}/reply`, data),
  // Holidays
  getHolidays: () => api.get('/holidays'),
  createHoliday: (data) => api.post('/holidays', data),
  deleteHoliday: (id) => api.delete(`/holidays/${id}`),
  // Company / Branches Management
  getAllCompanies: () => api.get('/auth/companies'),
  updateCompanyStatus: (id, status) => api.put(`/auth/companies/${id}/status`, { status }),
  getCompaniesPublic: () => api.get('/auth/companies-public'),
  getCompany: () => api.get('/companies'),
  createCompany: (data) => api.post('/companies', data),
  updateCompany: (id, data) => {
    // If only one argument is provided, it's the data, and we use the default route
    if (typeof id === 'object' && !data) {
      return api.put('/companies', id);
    }
    return api.put(`/companies/${id}`, data);
  },
  getBranches: () => api.get('/branches'),
  createBranch: (data) => api.post('/branches', data),
  updateBranch: (id, data) => api.put(`/branches/${id}`, data),
  deleteBranch: (id) => api.delete(`/branches/${id}`),
  // Audit Logs
  getAuditLogs: (params) => api.get('/audit-logs', { params })
};

export default api;
