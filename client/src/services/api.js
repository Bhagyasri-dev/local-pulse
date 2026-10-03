/**
 * api.js – Axios instance for all backend calls.
 * SRS §7.2: Frontend to Backend – REST API requests.
 * Falls back gracefully when server is unreachable (demo mode).
 */
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('lp_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Global response error handler
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const isLoginRequest = err.config?.url?.includes('/auth/login');
    if (err.response?.status === 401 && !isLoginRequest) {
      // Token expired – clear storage and redirect
      localStorage.removeItem('lp_token');
      localStorage.removeItem('lp_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── Auth (SRS FR1) ────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login:    (data) => api.post('/auth/login', data),
  me:       ()     => api.get('/auth/me'),
};

// ── Reports (SRS FR2, FR6, FR15) ─────────────────────────────────────────────
export const reportAPI = {
  create:        (formData) => api.post('/reports', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getMyReports:  ()         => api.get('/reports/my'),
  getNearby:     (lat, lng, radius) => api.get(`/reports/nearby?latitude=${lat}&longitude=${lng}&radius=${radius || 5000}`),
  getById:       (id)       => api.get(`/reports/${id}`),
  getAll:        (params)   => api.get('/reports', { params }),
  saveAiResult:  (id, data) => api.patch(`/reports/${id}/ai-analysis`, { aiAnalysis: data }),
};

// ── Verification (SRS FR10) ───────────────────────────────────────────────────
export const verifyAPI = {
  submit:  (id, data) => api.post(`/reports/${id}/verify`, data),
  getAll:  (id)       => api.get(`/reports/${id}/verifications`),
};

// ── Authority (SRS FR11–FR14) ─────────────────────────────────────────────────
export const authorityAPI = {
  getReports:    (params)   => api.get('/authority/reports', { params }),
  updateStatus:  (id, data) => api.patch(`/authority/reports/${id}/status`, data),
  assign:        (id, data) => api.patch(`/authority/reports/${id}/assign`, data),
  resolve:       (id, data) => api.patch(`/authority/reports/${id}/resolve`, data),
  getHistory:    (id)       => api.get(`/authority/reports/${id}/history`),
};

// ── AI (SRS FR7, FR16) ────────────────────────────────────────────────────────
export const aiAPI = {
  analyse:      (data) => api.post('/ai/analyse', data),
  askAssistant: (q)    => api.post('/ai/assistant', { question: q }),
};

export default api;
