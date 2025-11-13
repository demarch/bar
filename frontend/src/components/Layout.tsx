import React from 'react';
import { useAuthStore } from '../contexts/AuthContext';
import { useCaixa } from '../hooks/useCaixa';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuthStore();
  const { caixaAberto } = useCaixa();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-primary-600 text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Sistema de Gestão - Bar</h1>
              {caixaAberto && (
                <p className="text-sm text-primary-100">
                  Caixa #{caixaAberto.id} - Aberto às{' '}
                  {new Date(caixaAberto.data_abertura).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              )}
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="font-medium">{user?.nome}</p>
                <p className="text-sm text-primary-100 capitalize">{user?.tipo}</p>
              </div>
              <button
                onClick={logout}
                className="btn bg-primary-700 hover:bg-primary-800 text-white"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">{children}</main>
    </div>
  );
};
