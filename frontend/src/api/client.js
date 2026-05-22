import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    console.error('[API Error]', err.message);
    return Promise.reject(err);
  },
);

export const endpoints = {
  kpis: () => api.get('/kpis'),
  availability: () => api.get('/availability'),
  deliveries: (params = {}) => api.get('/deliveries', { params }),
  conflicts: () => api.get('/conflicts'),
  campusStats: () => api.get('/campus-stats'),
  health: () => axios.get(`${BASE_URL}/health`).then((r) => r.data),
};
