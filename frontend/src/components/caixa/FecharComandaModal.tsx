import React, { useState, useEffect } from 'react';
import { useComandas } from '../../hooks/useComandas';
import api from '../../services/api';

interface FecharComandaModalProps {
  isOpen: boolean;
  onClose: () => void;
  comandaId: number;
}

interface ComandaDetalhada {
  id: number;
  numero: number;
  cliente_nome?: string;
  total: number;
  itens: Array<{
    id: number;
    produto_nome: string;
    quantidade: number;
    valor_unitario: number;
    valor_total: number;
    tipo_item: string;
    acompanhante_nome?: string;
  }>;
}

const formasPagamento = [
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'debito', label: 'Cartão de Débito' },
  { value: 'credito', label: 'Cartão de Crédito' },
  { value: 'pix', label: 'PIX' },
  { value: 'misto', label: 'Misto' },
];

export const FecharComandaModal: React.FC<FecharComandaModalProps> = ({
  isOpen,
  onClose,
  comandaId,
}) => {
  const { fecharComanda } = useComandas();
  const [comanda, setComanda] = useState<ComandaDetalhada | null>(null);
  const [formaPagamento, setFormaPagamento] = useState('dinheiro');
  const [loading, setLoading] = useState(false);
  const [loadingComanda, setLoadingComanda] = useState(true);
  const [error, setError] = useState('');

  // Carregar detalhes da comanda
  useEffect(() => {
    if (isOpen && comandaId) {
      loadComanda();
    }
  }, [isOpen, comandaId]);

  const loadComanda = async () => {
    try {
      setLoadingComanda(true);
      const response = await api.get(`/comandas/${comandaId}`);
      setComanda(response.data.data);
    } catch (err: any) {
      setError('Erro ao carregar comanda');
    } finally {
      setLoadingComanda(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formaPagamento) {
      setError('Selecione a forma de pagamento');
      return;
    }

    try {
      setLoading(true);
      await fecharComanda(comandaId, {
        forma_pagamento: formaPagamento,
      });
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao fechar comanda');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 my-8">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Fechar Comanda</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              disabled={loading}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {loadingComanda ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : !comanda ? (
            <div className="text-center py-12 text-red-600">
              Erro ao carregar comanda
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {/* Informações da comanda */}
              <div className="mb-6 bg-primary-50 border border-primary-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-xl font-bold text-primary-900">
                      Comanda #{comanda.numero}
                    </h3>
                    {comanda.cliente_nome && (
                      <p className="text-sm text-gray-600">{comanda.cliente_nome}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Total</p>
                    <p className="text-3xl font-bold text-primary-600">
                      R$ {parseFloat(comanda.total.toString()).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Lista de itens */}
              <div className="mb-6">
                <h4 className="font-semibold text-gray-800 mb-3">
                  Itens da Comanda ({comanda.itens?.length || 0})
                </h4>
                <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                  {comanda.itens?.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between items-center p-3 border-b border-gray-100 last:border-b-0"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{item.produto_nome}</p>
                        {item.acompanhante_nome && (
                          <p className="text-xs text-yellow-600">
                            Com: {item.acompanhante_nome}
                          </p>
                        )}
                        <p className="text-xs text-gray-500">
                          {item.quantidade}x R${' '}
                          {parseFloat(item.valor_unitario.toString()).toFixed(2)}
                        </p>
                      </div>
                      <p className="font-semibold text-gray-900">
                        R$ {parseFloat(item.valor_total.toString()).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Forma de pagamento */}
              <div className="mb-6">
                <label
                  htmlFor="formaPagamento"
                  className="block text-sm font-medium text-gray-700 mb-3"
                >
                  Forma de Pagamento *
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {formasPagamento.map((forma) => (
                    <button
                      key={forma.value}
                      type="button"
                      onClick={() => setFormaPagamento(forma.value)}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        formaPagamento === forma.value
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      disabled={loading}
                    >
                      <div className="text-center">
                        <p className="font-semibold">{forma.label}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-start">
                  <svg
                    className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div className="text-sm text-blue-800">
                    <p className="font-semibold mb-1">Importante:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Confira todos os itens antes de fechar</li>
                      <li>Certifique-se da forma de pagamento correta</li>
                      <li>Esta operação não pode ser desfeita</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-secondary flex-1"
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-success flex-1" disabled={loading}>
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
                      Fechando...
                    </>
                  ) : (
                    <>
                      Confirmar Fechamento
                      <svg
                        className="w-5 h-5 inline-block ml-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
