import axios from 'axios';

const BASE_URL = import.meta.env.PROD
  ? (import.meta.env.VITE_API_URL || '') + '/api'
  : '/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000,
});

api.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem('admin-auth');
    if (token) {
      const parsed = JSON.parse(token);
      if (parsed.state?.token) {
        config.headers.Authorization = `Bearer ${parsed.state.token}`;
      }
    }
  } catch {
    localStorage.removeItem('admin-auth');
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('admin-auth');
      window.location.href = '/login';
    }
    if (error.response?.status === 403) {
      localStorage.removeItem('admin-auth');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
