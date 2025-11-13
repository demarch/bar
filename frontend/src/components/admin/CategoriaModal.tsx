import React, { useState, useEffect } from 'react';
import { useAdmin, Categoria } from '../../hooks/useAdmin';

interface CategoriaModalProps {
  categoria: Categoria | null;
  onClose: () => void;
}

export const CategoriaModal: React.FC<CategoriaModalProps> = ({ categoria, onClose }) => {
  const { criarCategoria, atualizarCategoria } = useAdmin();

  const [formData, setFormData] = useState({
    nome: '',
    ordem: '0',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (categoria) {
      setFormData({
        nome: categoria.nome,
        ordem: categoria.ordem.toString(),
      });
    }
  }, [categoria]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.nome) {
      setError('Nome é obrigatório');
      return;
    }

    const ordem = parseInt(formData.ordem);
    if (isNaN(ordem)) {
      setError('Ordem inválida');
      return;
    }

    try {
      setLoading(true);

      const data = {
        nome: formData.nome.trim(),
        ordem,
      };

      if (categoria) {
        await atualizarCategoria({ id: categoria.id, ...data });
      } else {
        await criarCategoria(data);
      }

      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao salvar categoria');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              {categoria ? 'Editar Categoria' : 'Nova Categoria'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              disabled={loading}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="space-y-4 mb-6">
              {/* Nome */}
              <div>
                <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-2">
                  Nome *
                </label>
                <input
                  type="text"
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="input"
                  placeholder="Ex: Bebidas, Alimentos, Serviços"
                  required
                  autoFocus
                  disabled={loading}
                  maxLength={50}
                />
              </div>

              {/* Ordem */}
              <div>
                <label htmlFor="ordem" className="block text-sm font-medium text-gray-700 mb-2">
                  Ordem de Exibição *
                </label>
                <input
                  type="number"
                  id="ordem"
                  value={formData.ordem}
                  onChange={(e) => setFormData({ ...formData, ordem: e.target.value })}
                  className="input"
                  placeholder="0"
                  min="0"
                  required
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Categorias com ordem menor aparecem primeiro no menu
                </p>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary flex-1"
                disabled={loading}
              >
                Cancelar
              </button>
              <button type="submit" className="btn-primary flex-1" disabled={loading}>
                {loading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-5 w-5 text-white inline-block"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Salvando...
                  </>
                ) : categoria ? (
                  'Atualizar'
                ) : (
                  'Criar'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
