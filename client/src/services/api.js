import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor — attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle token refresh and errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and we haven't retried yet, try refreshing the token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken
          });

          localStorage.setItem('access_token', data.data.access_token);
          localStorage.setItem('refresh_token', data.data.refresh_token);

          originalRequest.headers.Authorization = `Bearer ${data.data.access_token}`;
          return api(originalRequest);
        }
      } catch {
        // Refresh failed — clear tokens and redirect to login
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// ── Auth API ──
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  updateFcmToken: (token) => api.patch('/auth/fcm-token', { fcm_token: token })
};

// ── Blood Request API ──
export const requestAPI = {
  create: (data) => api.post('/requests', data),
  getById: (id) => api.get(`/requests/${id}`),
  getAll: (params) => api.get('/requests', { params }),
  updateStatus: (id, status) => api.patch(`/requests/${id}/status`, { status }),
  cancel: (id) => api.patch(`/requests/${id}/cancel`)
};

// ── Donor API ──
export const donorAPI = {
  register: (data) => api.post('/donors/register', data),
  getProfile: () => api.get('/donors/profile'),
  update: (id, data) => api.put(`/donors/${id}`, data),
  toggleAvailability: (id, isAvailable) => api.patch(`/donors/${id}/availability`, { is_available: isAvailable }),
  respond: (requestId, response) => api.post(`/donors/respond/${requestId}`, { response }),
  getAll: (params) => api.get('/donors', { params }),
  deleteAccount: (password) => api.delete('/donors/account', { data: { password } })
};

// ── Admin API ──
export const adminAPI = {
  getAnalytics: () => api.get('/admin/analytics'),
  getActiveRequests: () => api.get('/admin/requests/active'),
  getUsers: (params) => api.get('/admin/users', { params }),
  getUserById: (id) => api.get(`/admin/users/${id}`),
  updateUser: (id, data) => api.patch(`/admin/users/${id}`, data),
  getAuditLog: (params) => api.get('/admin/audit-log', { params })
};

// ── Public API ──
export const publicAPI = {
  getStats: () => api.get('/stats/public'),
  getDonorsByGroup: (bloodGroup) => api.get('/stats/public/donors', { params: { blood_group: bloodGroup } })
};

// ── Notifications API ──
export const notificationsAPI = {
  getAll: () => api.get('/notifications'),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all')
};

export default api;
