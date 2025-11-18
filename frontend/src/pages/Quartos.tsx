import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { useQuartos } from '../hooks/useQuartos';
import { useQuartoNotifications } from '../hooks/useQuartoNotifications';
import { QuartosOcupados } from '../components/quartos/QuartosOcupados';
import { OcuparQuarto } from '../components/quartos/OcuparQuarto';
import { FinalizarOcupacaoModal } from '../components/quartos/FinalizarOcupacaoModal';
import { CancelarOcupacaoModal } from '../components/quartos/CancelarOcupacaoModal';

export const Quartos: React.FC = () => {
  const { quartosOcupados, quartosDisponiveis, configuracoes, loadingConfiguracoes } = useQuartos();
  const { requestNotificationPermission } = useQuartoNotifications();
  const [showFinalizarModal, setShowFinalizarModal] = useState(false);
  const [showCancelarModal, setShowCancelarModal] = useState(false);
  const [quartoSelecionado, setQuartoSelecionado] = useState<number | null>(null);

  // Solicitar permissão de notificação ao montar o componente
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Calcular estatísticas
  const totalOcupados = quartosOcupados?.length || 0;
  const totalDisponiveis = quartosDisponiveis?.filter((q) => q.disponivel).length || 0;
  const tempoMedio =
    quartosOcupados && quartosOcupados.length > 0
      ? Math.round(
          quartosOcupados.reduce((sum, q) => sum + q.minutos_decorridos, 0) /
            quartosOcupados.length
        )
      : 0;

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

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Gerenciamento de Quartos</h1>
          <p className="text-gray-600 mt-1">Controle de ocupação e tempo em tempo real</p>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-500">
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

          <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-purple-500">
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

          <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Quartos Disponíveis</p>
                <p className="text-3xl font-bold text-green-600">{totalDisponiveis}</p>
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
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">Tabela de Preços</h2>
          {loadingConfiguracoes ? (
            <div className="text-center py-4">Carregando...</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {configuracoes?.map((config) => (
                <div key={config.id} className="bg-gray-50 rounded-lg p-4 text-center border border-gray-200">
                  <p className="text-sm text-gray-600 mb-1">{config.descricao}</p>
                  <p className="text-2xl font-bold text-blue-600">
                    R$ {parseFloat(config.valor.toString()).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Layout de 2 Colunas: Quartos Ocupados | Ocupar Quarto */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Coluna Esquerda: QuartosOcupados */}
          <div className="space-y-4">
            <QuartosOcupados onFinalizarClick={handleFinalizar} />
          </div>

          {/* Coluna Direita: OcuparQuarto */}
          <div className="space-y-4">
            <OcuparQuarto />
          </div>
        </div>

        {/* Alertas de Tempo */}
        {quartosOcupados && quartosOcupados.some((q) => q.minutos_decorridos >= 105) && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
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
                  Existem quartos ocupados há mais de 1h45min. Considere finalizar a ocupação.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modais */}

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
