import { create } from 'zustand';
import { User, AuthResponse } from '../types';
import api from '../services/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (login: string, senha: string) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => void;
  setToken: (token: string | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (login: string, senha: string) => {
    try {
      const response = await api.post<{ success: boolean; data: AuthResponse & { token: string } }>(
        '/auth/login',
        { login, senha }
      );

      const { user, token } = response.data.data;

      // Salvar user no localStorage (tokens httpOnly nos cookies para requisições HTTP)
      // Token também salvo em sessionStorage para uso no WebSocket
      localStorage.setItem('user', JSON.stringify(user));
      sessionStorage.setItem('wsToken', token);

      set({ user, token, isAuthenticated: true, isLoading: false });
    } catch (error) {
      console.error('Erro no login:', error);
      throw error;
    }
  },

  logout: async () => {
    try {
      // Chamar endpoint de logout para limpar cookies no servidor
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Erro no logout:', error);
    } finally {
      // Limpar user do localStorage e token do sessionStorage
      localStorage.removeItem('user');
      sessionStorage.removeItem('wsToken');
      set({ user: null, token: null, isAuthenticated: false });
    }
  },

  loadUser: () => {
    const userStr = localStorage.getItem('user');
    const token = sessionStorage.getItem('wsToken');

    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        set({ user, token, isAuthenticated: true, isLoading: false });
      } catch (error) {
        console.error('Erro ao carregar usuário:', error);
        localStorage.removeItem('user');
        sessionStorage.removeItem('wsToken');
        set({ isLoading: false });
      }
    } else {
      set({ isLoading: false });
    }
  },

  setToken: (token: string | null) => {
    if (token) {
      sessionStorage.setItem('wsToken', token);
    } else {
      sessionStorage.removeItem('wsToken');
    }
    set({ token });
  },
}));
