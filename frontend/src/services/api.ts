import axios, { AxiosError } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Importante para enviar cookies
});

// Request interceptor (não precisa mais adicionar token manualmente)
api.interceptors.request.use(
  (config) => {
    // Cookies são enviados automaticamente com withCredentials: true
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor para tratar erros
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    // Se o erro for 401 e não for retry
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Tentar renovar token (refresh token está no cookie)
        const refreshResponse = await axios.post<{ success: boolean; data: { token: string } }>(
          `${API_URL}/api/auth/refresh`,
          {},
          { withCredentials: true }
        );

        // Atualizar token no sessionStorage para WebSocket
        const newToken = refreshResponse.data.data?.token;
        if (newToken) {
          sessionStorage.setItem('wsToken', newToken);
        }

        // Cookie atualizado automaticamente, tentar request novamente
        return api(originalRequest);
      } catch (err) {
        // Limpar user do storage e redirecionar para login
        localStorage.removeItem('user');
        sessionStorage.removeItem('wsToken');
        window.location.href = '/login';
        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
