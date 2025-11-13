import React, { useState } from 'react';
import { useQuartos } from '../../hooks/useQuartos';
import { useComandas } from '../../hooks/useComandas';
import { useAcompanhantesAtivas } from '../../hooks/useAcompanhantes';

interface OcuparQuartoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OcuparQuartoModal: React.FC<OcuparQuartoModalProps> = ({ isOpen, onClose }) => {
  const { ocuparQuarto } = useQuartos();
  const { comandas } = useComandas();
  const { acompanhantesAtivas } = useAcompanhantesAtivas();

  const [numeroQuarto, setNumeroQuarto] = useState('');
  const [comandaId, setComandaId] = useState('');
  const [acompanhanteId, setAcompanhanteId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!numeroQuarto || !comandaId || !acompanhanteId) {
      setError('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      setLoading(true);
      await ocuparQuarto({
        numero_quarto: parseInt(numeroQuarto),
        comanda_id: parseInt(comandaId),
        acompanhante_id: parseInt(acompanhanteId),
      });

      // Limpar e fechar
      setNumeroQuarto('');
      setComandaId('');
      setAcompanhanteId('');
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao ocupar quarto');
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
            <h2 className="text-2xl font-bold text-gray-800">Ocupar Quarto</h2>
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
            <div className="space-y-4 mb-6">
              {/* Número do Quarto */}
              <div>
                <label htmlFor="numeroQuarto" className="block text-sm font-medium text-gray-700 mb-2">
                  Número do Quarto *
                </label>
                <input
                  type="number"
                  id="numeroQuarto"
                  value={numeroQuarto}
                  onChange={(e) => setNumeroQuarto(e.target.value)}
                  className="input"
                  placeholder="Ex: 1, 2, 3..."
                  min="1"
                  required
                  autoFocus
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Informe o número do quarto a ser ocupado
                </p>
              </div>

              {/* Comanda */}
              <div>
                <label htmlFor="comandaId" className="block text-sm font-medium text-gray-700 mb-2">
                  Comanda do Cliente *
                </label>
                <select
                  id="comandaId"
                  value={comandaId}
                  onChange={(e) => setComandaId(e.target.value)}
                  className="input"
                  required
                  disabled={loading}
                >
                  <option value="">Selecione uma comanda...</option>
                  {comandas?.map((comanda) => (
                    <option key={comanda.id} value={comanda.id}>
                      #{comanda.numero}
                      {comanda.cliente_nome && ` - ${comanda.cliente_nome}`} (R${' '}
                      {parseFloat(comanda.total.toString()).toFixed(2)})
                    </option>
                  ))}
                </select>
                {comandas && comandas.length === 0 && (
                  <p className="text-xs text-yellow-600 mt-1">
                    ⚠️ Nenhuma comanda aberta. Crie uma comanda primeiro.
                  </p>
                )}
              </div>

              {/* Acompanhante */}
              <div>
                <label htmlFor="acompanhanteId" className="block text-sm font-medium text-gray-700 mb-2">
                  Acompanhante *
                </label>
                <select
                  id="acompanhanteId"
                  value={acompanhanteId}
                  onChange={(e) => setAcompanhanteId(e.target.value)}
                  className="input"
                  required
                  disabled={loading}
                >
                  <option value="">Selecione uma acompanhante...</option>
                  {acompanhantesAtivas?.map((acomp) => (
                    <option key={acomp.id} value={acomp.id}>
                      #{acomp.id} - {acomp.nome}
                    </option>
                  ))}
                </select>
                {acompanhantesAtivas && acompanhantesAtivas.length === 0 && (
                  <p className="text-xs text-yellow-600 mt-1">
                    ⚠️ Nenhuma acompanhante ativa hoje.
                  </p>
                )}
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
                  <p className="font-semibold mb-1">Informações importantes:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>O tempo começa a contar agora</li>
                    <li>O valor será calculado automaticamente ao finalizar</li>
                    <li>O valor será lançado na comanda do cliente</li>
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
              <button
                type="submit"
                className="btn-primary flex-1"
                disabled={loading || !comandas || comandas.length === 0}
              >
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
                    Ocupando...
                  </>
                ) : (
                  'Confirmar Ocupação'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
