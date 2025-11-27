import React, { useState, useEffect } from 'react';
import { useQuartos } from '../../hooks/useQuartos';
import { useAcompanhantesAtivas } from '../../hooks/useAcompanhantes';
import api from '../../services/api';

interface Quarto {
  id: number;
  numero: string;
  descricao?: string;
  ativo: boolean;
}

type TipoServico = 'fixo' | 'tempo_livre';

interface ServicoQuartoModalProps {
  isOpen: boolean;
  onClose: () => void;
  comandaId: number;
  onSuccess: () => void;
}

export const ServicoQuartoModal: React.FC<ServicoQuartoModalProps> = ({
  isOpen,
  onClose,
  comandaId,
  onSuccess,
}) => {
  const { configuracoes } = useQuartos();
  const { acompanhantesAtivas } = useAcompanhantesAtivas();

  const [quartos, setQuartos] = useState<Quarto[]>([]);
  const [tipoServico, setTipoServico] = useState<TipoServico>('fixo');
  const [numeroQuarto, setNumeroQuarto] = useState('');
  const [configuracaoId, setConfiguracaoId] = useState<number | undefined>();
  const [acompanhantesSelecionadas, setAcompanhantesSelecionadas] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      carregarQuartos();
    }
  }, [isOpen]);

  const carregarQuartos = async () => {
    try {
      const response = await api.get('/admin/quartos/ativos');
      setQuartos(response.data.data || []);
    } catch (err) {
      console.error('Erro ao carregar quartos:', err);
    }
  };

  const handleToggleAcompanhante = (id: number) => {
    setAcompanhantesSelecionadas((prev) =>
      prev.includes(id) ? prev.filter((aId) => aId !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (tipoServico === 'tempo_livre') {
        // Serviço de tempo livre
        await api.post('/comandas/tempo-livre', {
          comanda_id: comandaId,
          numero_quarto: numeroQuarto,
          acompanhante_ids: acompanhantesSelecionadas,
        });
      } else {
        // Serviço com tempo fixo (comportamento original)
        await api.post('/comandas/servico-quarto', {
          comanda_id: comandaId,
          numero_quarto: numeroQuarto,
          configuracao_quarto_id: configuracaoId,
          acompanhante_ids: acompanhantesSelecionadas,
        });
      }

      onSuccess();
      handleClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao lancar servico de quarto');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setNumeroQuarto('');
    setTipoServico('fixo');
    setConfiguracaoId(undefined);
    setAcompanhantesSelecionadas([]);
    setError(null);
    onClose();
  };

  const configuracaoSelecionada = configuracoes?.find((c) => c.id === configuracaoId);

  // Validacao do formulario
  const isFormValid = () => {
    if (!numeroQuarto || acompanhantesSelecionadas.length === 0) return false;
    if (tipoServico === 'fixo' && !configuracaoId) return false;
    return true;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <h3 className="text-2xl font-bold text-gray-800">Lancar Servico de Quarto</h3>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
              {error}
            </div>
          )}

          <div className="space-y-6">
            {/* TESTE - REMOVER DEPOIS */}
            <div className="bg-red-500 text-white p-4 text-xl font-bold text-center">
              TESTE: Se voce ve isso, o build esta funcionando!
            </div>

            {/* Tipo de Servico - DESTAQUE */}
            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
              <label className="block text-sm font-bold text-yellow-800 mb-3">
                Escolha o Tipo de Servico *
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setTipoServico('fixo');
                    setConfiguracaoId(undefined);
                  }}
                  className={`p-5 rounded-lg border-3 transition-all text-left ${
                    tipoServico === 'fixo'
                      ? 'border-primary-500 bg-primary-100 shadow-lg ring-2 ring-primary-300'
                      : 'border-gray-300 bg-white hover:border-primary-300 hover:bg-primary-50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <svg className={`w-6 h-6 ${tipoServico === 'fixo' ? 'text-primary-600' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className={`font-bold text-lg ${tipoServico === 'fixo' ? 'text-primary-700' : 'text-gray-700'}`}>Tempo Fixo</span>
                  </div>
                  <p className="text-sm text-gray-600">Selecione um tempo pre-definido</p>
                  <p className="text-xs text-gray-500 mt-1">(30min, 1h, 1h30, 2h)</p>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTipoServico('tempo_livre');
                    setConfiguracaoId(undefined);
                  }}
                  className={`p-5 rounded-lg border-3 transition-all text-left ${
                    tipoServico === 'tempo_livre'
                      ? 'border-green-500 bg-green-100 shadow-lg ring-2 ring-green-300'
                      : 'border-gray-300 bg-white hover:border-green-300 hover:bg-green-50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <svg className={`w-6 h-6 ${tipoServico === 'tempo_livre' ? 'text-green-600' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className={`font-bold text-lg ${tipoServico === 'tempo_livre' ? 'text-green-700' : 'text-gray-700'}`}>Tempo Livre</span>
                  </div>
                  <p className="text-sm text-gray-600">Sem tempo definido</p>
                  <p className="text-xs text-gray-500 mt-1">(valor calculado na saida)</p>
                </button>
              </div>
            </div>

            {/* Selecionar Quarto */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Numero do Quarto *
              </label>
              <select
                value={numeroQuarto}
                onChange={(e) => setNumeroQuarto(e.target.value)}
                className="input-field"
                required
              >
                <option value="">Selecione o quarto...</option>
                {quartos.map((quarto) => (
                  <option key={quarto.id} value={quarto.numero}>
                    {quarto.numero} {quarto.descricao ? `- ${quarto.descricao}` : ''}
                  </option>
                ))}
              </select>
              {quartos.length === 0 && (
                <p className="text-sm text-gray-500 mt-1">
                  Nenhum quarto disponivel. Configure quartos na area administrativa.
                </p>
              )}
            </div>

            {/* Selecionar Tempo/Preco (apenas para tempo fixo) */}
            {tipoServico === 'fixo' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tempo / Preco *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {configuracoes?.map((config) => {
                    const horas = Math.floor(config.minutos / 60);
                    const mins = config.minutos % 60;
                    const tempoFormatado =
                      horas > 0
                        ? `${horas}h${mins > 0 ? ` ${mins}min` : ''}`
                        : `${mins}min`;

                    return (
                      <button
                        key={config.id}
                        type="button"
                        onClick={() => setConfiguracaoId(config.id)}
                        className={`p-4 rounded-lg border-2 transition-all text-left ${
                          configuracaoId === config.id
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <p className="font-bold text-primary-600">{tempoFormatado}</p>
                        <p className="text-sm text-gray-600 mt-1">{config.descricao}</p>
                        <p className="text-lg font-bold text-green-600 mt-2">
                          R$ {parseFloat(config.valor.toString()).toFixed(2)}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Info sobre tempo livre */}
            {tipoServico === 'tempo_livre' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h4 className="font-bold text-green-800">Servico de Tempo Livre</h4>
                    <p className="text-sm text-green-700 mt-1">
                      O sistema registrara o horario de inicio. Quando o servico terminar,
                      volte ao PDV para finalizar e o valor sera calculado automaticamente
                      com base no tempo decorrido.
                    </p>
                    <p className="text-sm text-green-700 mt-2">
                      <strong>Tolerancia:</strong> 10 minutos apos cada faixa de tempo
                      (ex: 41 min cobra 1 hora, 1h20 cobra 1h30).
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Selecionar Acompanhantes */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Acompanhantes * (selecione pelo menos uma)
              </label>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-60 overflow-y-auto">
                {!acompanhantesAtivas || acompanhantesAtivas.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    Nenhuma acompanhante ativa no momento
                  </p>
                ) : (
                  <div className="space-y-2">
                    {acompanhantesAtivas.map((acomp) => (
                      <label
                        key={acomp.id}
                        className="flex items-center p-3 rounded-lg cursor-pointer hover:bg-white border border-transparent hover:border-gray-300 transition-all"
                      >
                        <input
                          type="checkbox"
                          checked={acompanhantesSelecionadas.includes(acomp.id)}
                          onChange={() => handleToggleAcompanhante(acomp.id)}
                          className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                        />
                        <span className="ml-3 font-medium text-gray-800">
                          {acomp.nome}
                          {acomp.apelido && (
                            <span className="text-gray-500 ml-2">({acomp.apelido})</span>
                          )}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              {acompanhantesSelecionadas.length > 0 && (
                <p className="text-sm text-gray-600 mt-2">
                  {acompanhantesSelecionadas.length} acompanhante(s) selecionada(s)
                </p>
              )}
            </div>

            {/* Resumo */}
            {numeroQuarto && acompanhantesSelecionadas.length > 0 && (
              <div className={`border rounded-lg p-4 ${
                tipoServico === 'tempo_livre'
                  ? 'bg-green-50 border-green-200'
                  : 'bg-primary-50 border-primary-200'
              }`}>
                <h4 className={`font-bold mb-3 ${
                  tipoServico === 'tempo_livre' ? 'text-green-800' : 'text-primary-800'
                }`}>
                  Resumo do Lancamento
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-700">Quarto:</span>
                    <span className="font-bold text-gray-900">{numeroQuarto}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Tipo:</span>
                    <span className={`font-bold ${
                      tipoServico === 'tempo_livre' ? 'text-green-600' : 'text-primary-600'
                    }`}>
                      {tipoServico === 'tempo_livre' ? 'Tempo Livre' : 'Tempo Fixo'}
                    </span>
                  </div>
                  {tipoServico === 'fixo' && configuracaoSelecionada && (
                    <div className="flex justify-between">
                      <span className="text-gray-700">Tempo:</span>
                      <span className="font-bold text-gray-900">{configuracaoSelecionada.descricao}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-700">Acompanhantes:</span>
                    <span className="font-bold text-gray-900">{acompanhantesSelecionadas.length}</span>
                  </div>
                  <div className={`flex justify-between border-t pt-2 mt-2 ${
                    tipoServico === 'tempo_livre' ? 'border-green-300' : 'border-primary-300'
                  }`}>
                    <span className="text-gray-700 font-semibold">Valor Total:</span>
                    {tipoServico === 'tempo_livre' ? (
                      <span className="font-bold text-green-600 text-lg">
                        A calcular
                      </span>
                    ) : configuracaoSelecionada ? (
                      <span className="font-bold text-green-600 text-lg">
                        R$ {parseFloat(configuracaoSelecionada.valor.toString()).toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-gray-400">Selecione o tempo</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-6 pt-6 border-t">
            <button
              type="button"
              onClick={handleClose}
              className="btn-secondary flex-1"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={`flex-1 ${
                tipoServico === 'tempo_livre'
                  ? 'btn-success'
                  : 'btn-primary'
              }`}
              disabled={loading || !isFormValid()}
            >
              {loading
                ? 'Lancando...'
                : tipoServico === 'tempo_livre'
                  ? 'Iniciar Tempo Livre'
                  : 'Lancar Servico'
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
