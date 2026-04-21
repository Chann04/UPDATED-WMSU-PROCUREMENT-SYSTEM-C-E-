import axios from 'axios';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me')
};

// Users API
export const usersAPI = {
  getAll: () => api.get('/users'),
  getById: (id) => api.get(`/users/${id}`),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`)
};

// Categories API
export const categoriesAPI = {
  getAll: () => api.get('/categories'),
  getById: (id) => api.get(`/categories/${id}`),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`)
};

// Vendors API
export const vendorsAPI = {
  getAll: () => api.get('/vendors'),
  getById: (id) => api.get(`/vendors/${id}`),
  create: (data) => api.post('/vendors', data),
  update: (id, data) => api.put(`/vendors/${id}`, data),
  delete: (id) => api.delete(`/vendors/${id}`)
};

// Requests API
export const requestsAPI = {
  getAll: (params) => api.get('/requests', { params }),
  getPending: () => api.get('/requests/pending'),
  getById: (id) => api.get(`/requests/${id}`),
  create: (data) => api.post('/requests', data),
  update: (id, data) => api.put(`/requests/${id}`, data),
  delete: (id) => api.delete(`/requests/${id}`),
  submit: (id) => api.post(`/requests/${id}/submit`),
  approve: (id) => api.post(`/requests/${id}/approve`),
  reject: (id, reason) => api.post(`/requests/${id}/reject`, { reason }),
  order: (id) => api.post(`/requests/${id}/order`),
  receive: (id) => api.post(`/requests/${id}/receive`),
  complete: (id) => api.post(`/requests/${id}/complete`)
};

// Budget API
export const budgetAPI = {
  getAll: () => api.get('/budget'),
  getCurrent: () => api.get('/budget/current'),
  getByYear: (year) => api.get(`/budget/${year}`),
  create: (data) => api.post('/budget', data),
  update: (year, data) => api.put(`/budget/${year}`, data),
  getReport: (year) => api.get(`/budget/${year}/report`)
};

// Dashboard API
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
  getMyRequests: () => api.get('/dashboard/my-requests')
};

export default api;
