import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import socketService from '../services/socket';
import { Usuario, LoginResponse, TipoUsuario } from '../types';

interface AuthContextData {
  user: Usuario | null;
  token: string | null;
  loading: boolean;
  login: (login: string, senha: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isCaixa: boolean;
  isAtendente: boolean;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Usuario | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Carregar dados do localStorage ao montar
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      socketService.connect();
    }

    setLoading(false);
  }, []);

  const login = async (login: string, senha: string): Promise<void> => {
    try {
      const response = await api.post<LoginResponse>('/auth/login', { login, senha });
      const { token: newToken, refreshToken, usuario } = response.data;

      // Salvar no localStorage
      localStorage.setItem('token', newToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(usuario));

      // Atualizar estado
      setToken(newToken);
      setUser(usuario);

      // Conectar socket
      socketService.connect();
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      throw error;
    }
  };

  const logout = (): void => {
    // Limpar localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');

    // Limpar estado
    setToken(null);
    setUser(null);

    // Desconectar socket
    socketService.disconnect();
  };

  const isAuthenticated = !!user && !!token;
  const isAdmin = user?.tipo === TipoUsuario.ADMIN;
  const isCaixa = user?.tipo === TipoUsuario.CAIXA || isAdmin;
  const isAtendente = user?.tipo === TipoUsuario.ATENDENTE;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        isAuthenticated,
        isAdmin,
        isCaixa,
        isAtendente,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextData => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
