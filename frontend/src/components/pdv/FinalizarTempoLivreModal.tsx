import React, { useState, useEffect } from 'react';
import { useQuartos } from '../../hooks/useQuartos';
import api from '../../services/api';
import { CalculoTempoLivre, ConfiguracaoQuarto } from '../../types';

interface FinalizarTempoLivreModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: number;
  numeroQuarto: string;
  horaEntrada: string;
  acompanhantes: Array<{ id: number; nome: string; apelido?: string }>;
  onSuccess: () => void;
}

export const FinalizarTempoLivreModal: React.FC<FinalizarTempoLivreModalProps> = ({
  isOpen,
  onClose,
  itemId,
  numeroQuarto,
  horaEntrada,
  acompanhantes,
  onSuccess,
}) => {
  const { configuracoes } = useQuartos();

  const [calculo, setCalculo] = useState<CalculoTempoLivre | null>(null);
  const [valorFinal, setValorFinal] = useState<number>(0);
  const [configuracaoSelecionada, setConfiguracaoSelecionada] = useState<ConfiguracaoQuarto | null>(null);
  const [loading, setLoading] = useState(false);
  const [calculando, setCalculando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'calcular' | 'confirmar'>('calcular');

  useEffect(() => {
    if (isOpen && itemId) {
      setStep('calcular');
      setCalculo(null);
      setValorFinal(0);
      setConfiguracaoSelecionada(null);
      setError(null);
    }
  }, [isOpen, itemId]);

  const handleCalcular = async () => {
    setCalculando(true);
    setError(null);

    try {
      const response = await api.put(`/comandas/tempo-livre/${itemId}/calcular`);
      const data = response.data.data as CalculoTempoLivre;
      setCalculo(data);
      setValorFinal(data.valor_sugerido);

      // Encontrar a configuracao sugerida
      const config = configuracoes?.find((c) => c.id === data.configuracao_sugerida.id);
      setConfiguracaoSelecionada(config || null);

      setStep('confirmar');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao calcular valor');
    } finally {
      setCalculando(false);
    }
  };

  const handleConfirmar = async () => {
    setLoading(true);
    setError(null);

    try {
      await api.put(`/comandas/tempo-livre/${itemId}/confirmar`, {
        valor_final: valorFinal,
        configuracao_quarto_id: configuracaoSelecionada?.id,
      });

      onSuccess();
      handleClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao confirmar servico');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelarCalculo = async () => {
    setLoading(true);
    setError(null);

    try {
      await api.put(`/comandas/tempo-livre/${itemId}/cancelar-calculo`);
      setStep('calcular');
      setCalculo(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao cancelar calculo');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCalculo(null);
    setStep('calcular');
    setValorFinal(0);
    setError(null);
    onClose();
  };

  const handleSelectConfiguracao = (config: ConfiguracaoQuarto) => {
    setConfiguracaoSelecionada(config);
    setValorFinal(parseFloat(config.valor.toString()));
  };

  const formatarTempo = (minutos: number): string => {
    const horas = Math.floor(minutos / 60);
    const mins = Math.round(minutos % 60);
    if (horas > 0) {
      return `${horas}h ${mins}min`;
    }
    return `${mins}min`;
  };

  const formatarHorario = (data: string): string => {
    return new Date(data).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Calcular tempo decorrido em tempo real
  const calcularTempoDecorrido = (): number => {
    const entrada = new Date(horaEntrada);
    const agora = new Date();
    return Math.ceil((agora.getTime() - entrada.getTime()) / 60000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-2xl font-bold text-gray-800">Finalizar Tempo Livre</h3>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
              disabled={loading || calculando}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
              {error}
            </div>
          )}

          {/* Informacoes do servico */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
            <h4 className="font-bold text-gray-800 mb-3">Informacoes do Servico</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Quarto:</span>
                <span className="font-bold text-gray-900 ml-2">{numeroQuarto}</span>
              </div>
              <div>
                <span className="text-gray-600">Entrada:</span>
                <span className="font-bold text-gray-900 ml-2">{formatarHorario(horaEntrada)}</span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-600">Acompanhantes:</span>
                <span className="font-bold text-gray-900 ml-2">
                  {acompanhantes.map((a) => a.nome).join(', ')}
                </span>
              </div>
            </div>
          </div>

          {step === 'calcular' && (
            <>
              {/* Tempo decorrido atual */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6 text-center">
                <p className="text-sm text-yellow-700 mb-2">Tempo decorrido atual</p>
                <p className="text-4xl font-bold text-yellow-800">
                  {formatarTempo(calcularTempoDecorrido())}
                </p>
                <p className="text-xs text-yellow-600 mt-2">
                  O valor sera calculado no momento do clique em "Calcular Valor"
                </p>
              </div>

              <button
                onClick={handleCalcular}
                disabled={calculando}
                className="w-full btn-success py-4 text-lg"
              >
                {calculando ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Calculando...
                  </span>
                ) : (
                  'Calcular Valor'
                )}
              </button>
            </>
          )}

          {step === 'confirmar' && calculo && (
            <>
              {/* Resultado do calculo */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                <h4 className="font-bold text-green-800 mb-4 text-center">Calculo do Sistema</h4>

                <div className="grid grid-cols-3 gap-4 text-center mb-4">
                  <div className="bg-white rounded-lg p-3 border border-green-200">
                    <p className="text-xs text-gray-600">Entrada</p>
                    <p className="font-bold text-gray-900">{formatarHorario(calculo.hora_entrada)}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-green-200">
                    <p className="text-xs text-gray-600">Saida</p>
                    <p className="font-bold text-gray-900">{formatarHorario(calculo.hora_saida)}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-green-200">
                    <p className="text-xs text-gray-600">Tempo Total</p>
                    <p className="font-bold text-gray-900">{formatarTempo(calculo.minutos_decorridos)}</p>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 border border-green-300">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-600">Faixa aplicada:</p>
                      <p className="font-bold text-gray-900">{calculo.configuracao_sugerida.descricao}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Valor sugerido:</p>
                      <p className="text-2xl font-bold text-green-600">
                        R$ {calculo.valor_sugerido.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ajuste de valor */}
              <div className="mb-6">
                <h4 className="font-bold text-gray-800 mb-3">Ajustar Valor (opcional)</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Selecione uma faixa diferente ou digite um valor personalizado:
                </p>

                {/* Faixas de preco */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {configuracoes?.map((config) => {
                    const horas = Math.floor(config.minutos / 60);
                    const mins = config.minutos % 60;
                    const tempoFormatado =
                      horas > 0
                        ? `${horas}h${mins > 0 ? ` ${mins}min` : ''}`
                        : `${mins}min`;

                    const isSelected = configuracaoSelecionada?.id === config.id;
                    const isSugerido = config.id === calculo.configuracao_sugerida.id;

                    return (
                      <button
                        key={config.id}
                        type="button"
                        onClick={() => handleSelectConfiguracao(config)}
                        className={`p-3 rounded-lg border-2 transition-all text-left relative ${
                          isSelected
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {isSugerido && (
                          <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                            Sugerido
                          </span>
                        )}
                        <p className="font-bold text-sm">{tempoFormatado}</p>
                        <p className="text-lg font-bold text-green-600">
                          R$ {parseFloat(config.valor.toString()).toFixed(2)}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {/* Valor personalizado */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Valor Final (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={valorFinal}
                    onChange={(e) => {
                      setValorFinal(parseFloat(e.target.value) || 0);
                      setConfiguracaoSelecionada(null);
                    }}
                    className="input-field text-2xl font-bold text-center"
                  />
                  {valorFinal !== calculo.valor_sugerido && (
                    <p className="text-sm text-yellow-600 mt-2">
                      Valor diferente do sugerido pelo sistema
                    </p>
                  )}
                </div>
              </div>

              {/* Acoes */}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={handleCancelarCalculo}
                  className="btn-secondary flex-1"
                  disabled={loading}
                >
                  Voltar
                </button>
                <button
                  onClick={handleConfirmar}
                  disabled={loading || valorFinal <= 0}
                  className="btn-success flex-1"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Confirmando...
                    </span>
                  ) : (
                    `Confirmar R$ ${valorFinal.toFixed(2)}`
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
