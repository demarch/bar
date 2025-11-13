import React, { useState, useEffect } from 'react';
import { useQuartos } from '../../hooks/useQuartos';
import api from '../../services/api';

interface FinalizarOcupacaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  ocupacaoId: number;
}

interface OcupacaoDetalhada {
  id: number;
  comanda_numero: number;
  acompanhante_nome: string;
  numero_quarto: number;
  hora_inicio: string;
  minutos_decorridos: number;
}

export const FinalizarOcupacaoModal: React.FC<FinalizarOcupacaoModalProps> = ({
  isOpen,
  onClose,
  ocupacaoId,
}) => {
  const { finalizarOcupacao, configuracoes } = useQuartos();
  const [ocupacao, setOcupacao] = useState<OcupacaoDetalhada | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && ocupacaoId) {
      loadOcupacao();
    }
  }, [isOpen, ocupacaoId]);

  const loadOcupacao = async () => {
    try {
      setLoadingData(true);
      const response = await api.get(`/quartos/ocupados`);
      const ocupacaoEncontrada = response.data.data.find(
        (o: OcupacaoDetalhada) => o.id === ocupacaoId
      );
      setOcupacao(ocupacaoEncontrada || null);
    } catch (err) {
      setError('Erro ao carregar dados da ocupação');
    } finally {
      setLoadingData(false);
    }
  };

  const calcularValor = () => {
    if (!ocupacao || !configuracoes) return 0;

    // Encontrar configuração adequada
    const configsOrdenadas = [...configuracoes].sort((a, b) => a.minutos - b.minutos);

    for (const config of configsOrdenadas) {
      if (ocupacao.minutos_decorridos <= config.minutos) {
        return parseFloat(config.valor.toString());
      }
    }

    // Se ultrapassou todos, usar o maior
    const maior = configsOrdenadas[configsOrdenadas.length - 1];
    return parseFloat(maior.valor.toString());
  };

  const getConfiguracaoAplicada = () => {
    if (!ocupacao || !configuracoes) return null;

    const configsOrdenadas = [...configuracoes].sort((a, b) => a.minutos - b.minutos);

    for (const config of configsOrdenadas) {
      if (ocupacao.minutos_decorridos <= config.minutos) {
        return config;
      }
    }

    return configsOrdenadas[configsOrdenadas.length - 1];
  };

  const formatarTempo = (minutos: number) => {
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    if (horas > 0) {
      return `${horas}h ${mins}min`;
    }
    return `${mins}min`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      setLoading(true);
      await finalizarOcupacao(ocupacaoId);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao finalizar ocupação');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const valor = calcularValor();
  const configAplicada = getConfiguracaoAplicada();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Finalizar Ocupação</h2>
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

          {loadingData ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : !ocupacao ? (
            <div className="text-center py-12 text-red-600">Ocupação não encontrada</div>
          ) : (
            <form onSubmit={handleSubmit}>
              {/* Informações da Ocupação */}
              <div className="mb-6 bg-primary-50 border border-primary-200 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Quarto</p>
                    <p className="text-2xl font-bold text-primary-600">#{ocupacao.numero_quarto}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Comanda</p>
                    <p className="text-lg font-bold text-gray-800">#{ocupacao.comanda_numero}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-gray-600">Acompanhante</p>
                    <p className="font-semibold text-gray-800">{ocupacao.acompanhante_nome}</p>
                  </div>
                </div>
              </div>

              {/* Cálculo de Tempo e Valor */}
              <div className="mb-6 space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Hora de Início:</span>
                    <span className="font-semibold">
                      {new Date(ocupacao.hora_inicio).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Tempo Decorrido:</span>
                    <span className="font-bold text-lg text-blue-600">
                      {formatarTempo(ocupacao.minutos_decorridos)}
                    </span>
                  </div>
                  {configAplicada && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Faixa de Cobrança:</span>
                      <span className="font-semibold">{configAplicada.descricao}</span>
                    </div>
                  )}
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-800 font-semibold">Valor a Cobrar:</span>
                    <span className="text-3xl font-bold text-green-600">
                      R$ {valor.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
                    Este valor será lançado automaticamente na comanda #{ocupacao.comanda_numero}
                  </p>
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
                    <p className="font-semibold mb-1">Ao confirmar:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>O quarto será liberado</li>
                      <li>O valor será lançado na comanda</li>
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
                      Finalizando...
                    </>
                  ) : (
                    'Finalizar e Cobrar'
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
