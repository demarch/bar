import React, { useState } from 'react';
import { useCaixa } from '../../hooks/useCaixa';

interface AbrirCaixaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AbrirCaixaModal: React.FC<AbrirCaixaModalProps> = ({ isOpen, onClose }) => {
  const { abrirCaixa } = useCaixa();
  const [valorAbertura, setValorAbertura] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const valor = parseFloat(valorAbertura);

    if (isNaN(valor) || valor < 0) {
      setError('Informe um valor válido');
      return;
    }

    try {
      setLoading(true);
      await abrirCaixa({ valor_abertura: valor });
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao abrir caixa');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Abrir Caixa</h2>
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

          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label htmlFor="valorAbertura" className="block text-sm font-medium text-gray-700 mb-2">
                Valor de Abertura *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-500">R$</span>
                <input
                  type="number"
                  id="valorAbertura"
                  value={valorAbertura}
                  onChange={(e) => setValorAbertura(e.target.value)}
                  className="input pl-12"
                  placeholder="0,00"
                  step="0.01"
                  min="0"
                  required
                  autoFocus
                  disabled={loading}
                />
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Informe o valor em dinheiro disponível no caixa para iniciar o movimento.
              </p>
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
                    <li>Confira o valor antes de confirmar</li>
                    <li>Este valor será usado como base para fechamento</li>
                    <li>Registre sangrias durante o dia se necessário</li>
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
                    Abrindo...
                  </>
                ) : (
                  'Abrir Caixa'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
