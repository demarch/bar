import React, { useState } from 'react';
import { useQuartos } from '../../hooks/useQuartos';

interface CancelarOcupacaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  ocupacaoId: number;
}

export const CancelarOcupacaoModal: React.FC<CancelarOcupacaoModalProps> = ({
  isOpen,
  onClose,
  ocupacaoId,
}) => {
  const { cancelarOcupacao } = useQuartos();
  const [observacoes, setObservacoes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!observacoes.trim()) {
      setError('Informe o motivo do cancelamento');
      return;
    }

    try {
      setLoading(true);
      await cancelarOcupacao({
        id: ocupacaoId,
        observacoes: observacoes.trim(),
      });

      setObservacoes('');
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao cancelar ocupação');
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
            <h2 className="text-2xl font-bold text-gray-800">Cancelar Ocupação</h2>
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
              <label htmlFor="observacoes" className="block text-sm font-medium text-gray-700 mb-2">
                Motivo do Cancelamento *
              </label>
              <textarea
                id="observacoes"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                className="input min-h-[120px] resize-none"
                placeholder="Descreva o motivo do cancelamento (erro de lançamento, desistência, etc.)"
                required
                autoFocus
                disabled={loading}
                maxLength={200}
              />
              <p className="text-xs text-gray-500 mt-1">{observacoes.length}/200 caracteres</p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <svg
                  className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <div className="text-sm text-yellow-800">
                  <p className="font-semibold mb-1">Atenção:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>O quarto será liberado imediatamente</li>
                    <li>Nenhum valor será cobrado do cliente</li>
                    <li>O cancelamento será registrado para auditoria</li>
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
                Voltar
              </button>
              <button type="submit" className="btn-danger flex-1" disabled={loading}>
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
                    Cancelando...
                  </>
                ) : (
                  'Confirmar Cancelamento'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
