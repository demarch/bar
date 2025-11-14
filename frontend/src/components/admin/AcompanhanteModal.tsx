import React, { useState, useEffect } from 'react';
import { useAdmin, Acompanhante } from '../../hooks/useAdmin';

interface AcompanhanteModalProps {
  acompanhante: Acompanhante | null;
  onClose: () => void;
}

export const AcompanhanteModal: React.FC<AcompanhanteModalProps> = ({ acompanhante, onClose }) => {
  const { criarAcompanhante, atualizarAcompanhante } = useAdmin();

  const [formData, setFormData] = useState({
    nome: '',
    apelido: '',
    telefone: '',
    documento: '',
    percentual_comissao: '40',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (acompanhante) {
      setFormData({
        nome: acompanhante.nome,
        apelido: acompanhante.apelido || '',
        telefone: acompanhante.telefone || '',
        documento: acompanhante.documento || '',
        percentual_comissao: acompanhante.percentual_comissao.toString(),
      });
    }
  }, [acompanhante]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.nome) {
      setError('Nome é obrigatório');
      return;
    }

    const comissao = parseFloat(formData.percentual_comissao);
    if (isNaN(comissao) || comissao < 0 || comissao > 100) {
      setError('Comissão deve estar entre 0 e 100%');
      return;
    }

    try {
      setLoading(true);

      const data = {
        nome: formData.nome.trim(),
        apelido: formData.apelido.trim() || undefined,
        telefone: formData.telefone.trim() || undefined,
        documento: formData.documento.trim() || undefined,
        percentual_comissao: comissao,
      };

      if (acompanhante) {
        await atualizarAcompanhante({ id: acompanhante.id, ...data });
      } else {
        await criarAcompanhante(data);
      }

      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao salvar acompanhante');
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
              {acompanhante ? 'Editar Acompanhante' : 'Nova Acompanhante'}
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
                  Nome Completo *
                </label>
                <input
                  type="text"
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="input"
                  placeholder="Ex: Maria Silva"
                  required
                  autoFocus
                  disabled={loading}
                  maxLength={100}
                />
              </div>

              {/* Apelido */}
              <div>
                <label htmlFor="apelido" className="block text-sm font-medium text-gray-700 mb-2">
                  Apelido / Nome Artístico
                </label>
                <input
                  type="text"
                  id="apelido"
                  value={formData.apelido}
                  onChange={(e) => setFormData({ ...formData, apelido: e.target.value })}
                  className="input"
                  placeholder="Ex: Mari"
                  disabled={loading}
                  maxLength={50}
                />
              </div>

              {/* Telefone */}
              <div>
                <label htmlFor="telefone" className="block text-sm font-medium text-gray-700 mb-2">
                  Telefone
                </label>
                <input
                  type="tel"
                  id="telefone"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  className="input"
                  placeholder="Ex: (11) 98765-4321"
                  disabled={loading}
                  maxLength={20}
                />
              </div>

              {/* Documento */}
              <div>
                <label htmlFor="documento" className="block text-sm font-medium text-gray-700 mb-2">
                  CPF / RG / Documento
                </label>
                <input
                  type="text"
                  id="documento"
                  value={formData.documento}
                  onChange={(e) => setFormData({ ...formData, documento: e.target.value })}
                  className="input"
                  placeholder="Ex: 123.456.789-00"
                  disabled={loading}
                  maxLength={20}
                />
              </div>

              {/* Comissão */}
              <div>
                <label htmlFor="percentual_comissao" className="block text-sm font-medium text-gray-700 mb-2">
                  Percentual de Comissão (%) *
                </label>
                <input
                  type="number"
                  id="percentual_comissao"
                  value={formData.percentual_comissao}
                  onChange={(e) => setFormData({ ...formData, percentual_comissao: e.target.value })}
                  className="input"
                  placeholder="40"
                  step="0.01"
                  min="0"
                  max="100"
                  required
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Percentual padrão de comissão sobre os serviços
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
                ) : acompanhante ? (
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
