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
      await api.post('/comandas/servico-quarto', {
        comanda_id: comandaId,
        numero_quarto: numeroQuarto,
        configuracao_quarto_id: configuracaoId,
        acompanhante_ids: acompanhantesSelecionadas,
      });

      onSuccess();
      handleClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao lançar serviço de quarto');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setNumeroQuarto('');
    setConfiguracaoId(undefined);
    setAcompanhantesSelecionadas([]);
    setError(null);
    onClose();
  };

  const configuracaoSelecionada = configuracoes?.find((c) => c.id === configuracaoId);

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
              <h3 className="text-2xl font-bold text-gray-800">Lançar Serviço de Quarto</h3>
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
            {/* Selecionar Quarto */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Número do Quarto *
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
                  Nenhum quarto disponível. Configure quartos na área administrativa.
                </p>
              )}
            </div>

            {/* Selecionar Tempo/Preço */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Tempo / Preço *
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
            {configuracaoSelecionada && numeroQuarto && acompanhantesSelecionadas.length > 0 && (
              <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
                <h4 className="font-bold text-primary-800 mb-3">Resumo do Lançamento</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-700">Quarto:</span>
                    <span className="font-bold text-gray-900">{numeroQuarto}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Tempo:</span>
                    <span className="font-bold text-gray-900">{configuracaoSelecionada.descricao}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Acompanhantes:</span>
                    <span className="font-bold text-gray-900">{acompanhantesSelecionadas.length}</span>
                  </div>
                  <div className="flex justify-between border-t border-primary-300 pt-2 mt-2">
                    <span className="text-gray-700 font-semibold">Valor Total:</span>
                    <span className="font-bold text-green-600 text-lg">
                      R$ {parseFloat(configuracaoSelecionada.valor.toString()).toFixed(2)}
                    </span>
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
              className="btn-primary flex-1"
              disabled={
                loading ||
                !numeroQuarto ||
                !configuracaoId ||
                acompanhantesSelecionadas.length === 0
              }
            >
              {loading ? 'Lançando...' : 'Lançar Serviço'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
