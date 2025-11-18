import { create } from 'zustand';
import { User, AuthResponse } from '../types';
import api from '../services/api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (login: string, senha: string) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (login: string, senha: string) => {
    try {
      const response = await api.post<{ success: boolean; data: AuthResponse }>(
        '/auth/login',
        { login, senha }
      );

      const { user } = response.data.data;

      // Salvar apenas o user no localStorage (tokens ficam em httpOnly cookies)
      localStorage.setItem('user', JSON.stringify(user));

      set({ user, isAuthenticated: true, isLoading: false });
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
      // Limpar user do localStorage
      localStorage.removeItem('user');
      set({ user: null, isAuthenticated: false });
    }
  },

  loadUser: () => {
    const userStr = localStorage.getItem('user');

    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        set({ user, isAuthenticated: true, isLoading: false });
      } catch (error) {
        console.error('Erro ao carregar usuário:', error);
        localStorage.removeItem('user');
        set({ isLoading: false });
      }
    } else {
      set({ isLoading: false });
    }
  },
}));
