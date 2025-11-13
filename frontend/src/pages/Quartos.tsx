import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { useQuartos } from '../hooks/useQuartos';
import { OcuparQuartoModal } from '../components/quartos/OcuparQuartoModal';
import { FinalizarOcupacaoModal } from '../components/quartos/FinalizarOcupacaoModal';
import { CancelarOcupacaoModal } from '../components/quartos/CancelarOcupacaoModal';

export const Quartos: React.FC = () => {
  const { quartosOcupados, configuracoes, loadingOcupados, loadingConfiguracoes } = useQuartos();
  const [showOcuparModal, setShowOcuparModal] = useState(false);
  const [showFinalizarModal, setShowFinalizarModal] = useState(false);
  const [showCancelarModal, setShowCancelarModal] = useState(false);
  const [quartoSelecionado, setQuartoSelecionado] = useState<number | null>(null);

  // Calcular estatísticas
  const totalOcupados = quartosOcupados?.length || 0;
  const tempoMedio =
    quartosOcupados && quartosOcupados.length > 0
      ? Math.round(
          quartosOcupados.reduce((sum, q) => sum + q.minutos_decorridos, 0) /
            quartosOcupados.length
        )
      : 0;

  // Função para calcular cor baseado no tempo
  const getTimeColor = (minutos: number) => {
    if (minutos < 30) return 'text-green-600';
    if (minutos < 60) return 'text-yellow-600';
    if (minutos < 90) return 'text-orange-600';
    return 'text-red-600';
  };

  // Função para calcular borda baseado no tempo
  const getTimeBorderColor = (minutos: number) => {
    if (minutos < 30) return 'border-green-200';
    if (minutos < 60) return 'border-yellow-200';
    if (minutos < 90) return 'border-orange-200';
    return 'border-red-200';
  };

  // Função para formatar tempo
  const formatarTempo = (minutos: number) => {
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    if (horas > 0) {
      return `${horas}h ${mins}min`;
    }
    return `${mins}min`;
  };

  const handleFinalizar = (id: number) => {
    setQuartoSelecionado(id);
    setShowFinalizarModal(true);
  };

  const handleCancelar = (id: number) => {
    setQuartoSelecionado(id);
    setShowCancelarModal(true);
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Gerenciamento de Quartos</h1>
            <p className="text-gray-600 mt-1">Controle de ocupação e tempo</p>
          </div>
          <button onClick={() => setShowOcuparModal(true)} className="btn-primary">
            <svg
              className="w-5 h-5 inline-block mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Ocupar Quarto
          </button>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card bg-blue-50 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Quartos Ocupados</p>
                <p className="text-3xl font-bold text-blue-600">{totalOcupados}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="card bg-purple-50 border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Tempo Médio</p>
                <p className="text-3xl font-bold text-purple-600">{formatarTempo(tempoMedio)}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="card bg-green-50 border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Quartos Disponíveis</p>
                <p className="text-3xl font-bold text-green-600">∞</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Tabela de Preços */}
        <div className="card">
          <h2 className="text-xl font-bold mb-4">Tabela de Preços</h2>
          {loadingConfiguracoes ? (
            <div className="text-center py-4">Carregando...</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {configuracoes?.map((config) => (
                <div key={config.id} className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-sm text-gray-600 mb-1">{config.descricao}</p>
                  <p className="text-2xl font-bold text-primary-600">
                    R$ {parseFloat(config.valor.toString()).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Lista de Quartos Ocupados */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Quartos Ocupados</h2>
            <span className="badge badge-primary">
              {totalOcupados} {totalOcupados === 1 ? 'quarto' : 'quartos'}
            </span>
          </div>

          {loadingOcupados ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            </div>
          ) : !quartosOcupados || quartosOcupados.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <svg
                className="w-16 h-16 mx-auto mb-4 text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
              <p>Nenhum quarto ocupado no momento</p>
              <button
                onClick={() => setShowOcuparModal(true)}
                className="btn-primary mt-4"
              >
                Ocupar Primeiro Quarto
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {quartosOcupados.map((quarto) => (
                <div
                  key={quarto.id}
                  className={`flex items-center justify-between p-4 bg-white border-2 rounded-lg transition-all ${getTimeBorderColor(
                    quarto.minutos_decorridos
                  )}`}
                >
                  <div className="flex items-center gap-4 flex-1">
                    {/* Número do Quarto */}
                    <div className="w-16 h-16 bg-primary-100 rounded-lg flex items-center justify-center">
                      <span className="text-2xl font-bold text-primary-600">
                        {quarto.numero_quarto}
                      </span>
                    </div>

                    {/* Informações */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-bold text-gray-800">
                          Comanda #{quarto.comanda_numero}
                        </span>
                        <span className="badge badge-info">{quarto.acompanhante_nome}</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        Início:{' '}
                        {new Date(quarto.hora_inicio).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>

                    {/* Tempo Decorrido */}
                    <div className="text-center px-4">
                      <p className="text-sm text-gray-600 mb-1">Tempo</p>
                      <p className={`text-2xl font-bold ${getTimeColor(quarto.minutos_decorridos)}`}>
                        {formatarTempo(quarto.minutos_decorridos)}
                      </p>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleFinalizar(quarto.id)}
                      className="btn-success"
                      title="Finalizar e cobrar"
                    >
                      <svg
                        className="w-5 h-5"
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
                    </button>
                    <button
                      onClick={() => handleCancelar(quarto.id)}
                      className="btn-danger"
                      title="Cancelar ocupação"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Alertas de Tempo */}
        {quartosOcupados && quartosOcupados.some((q) => q.minutos_decorridos >= 90) && (
          <div className="card bg-red-50 border-red-200">
            <div className="flex items-start">
              <svg
                className="w-6 h-6 text-red-600 mt-0.5 mr-3 flex-shrink-0"
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
              <div>
                <p className="font-semibold text-red-800 mb-1">Atenção: Quartos próximos do limite!</p>
                <p className="text-sm text-red-700">
                  Existem quartos ocupados há mais de 1h30min. Considere finalizar a ocupação.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modais */}
      {showOcuparModal && (
        <OcuparQuartoModal
          isOpen={showOcuparModal}
          onClose={() => setShowOcuparModal(false)}
        />
      )}

      {showFinalizarModal && quartoSelecionado && (
        <FinalizarOcupacaoModal
          isOpen={showFinalizarModal}
          onClose={() => {
            setShowFinalizarModal(false);
            setQuartoSelecionado(null);
          }}
          ocupacaoId={quartoSelecionado}
        />
      )}

      {showCancelarModal && quartoSelecionado && (
        <CancelarOcupacaoModal
          isOpen={showCancelarModal}
          onClose={() => {
            setShowCancelarModal(false);
            setQuartoSelecionado(null);
          }}
          ocupacaoId={quartoSelecionado}
        />
      )}
    </Layout>
  );
};
