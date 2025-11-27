import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { ServicoTempoLivreEmAndamento } from '../../types';
import { FinalizarTempoLivreModal } from './FinalizarTempoLivreModal';

interface ServicosTempoLivreListProps {
  onFinalizarSuccess: () => void;
}

export const ServicosTempoLivreList: React.FC<ServicosTempoLivreListProps> = ({
  onFinalizarSuccess,
}) => {
  const [selectedServico, setSelectedServico] = useState<ServicoTempoLivreEmAndamento | null>(null);
  const [showFinalizarModal, setShowFinalizarModal] = useState(false);

  // Timestamp de quando os dados foram buscados
  const [dataFetchedAt, setDataFetchedAt] = useState<number>(Date.now());

  // Query para buscar servicos em andamento
  const { data: servicos, refetch } = useQuery({
    queryKey: ['servicos-tempo-livre'],
    queryFn: async () => {
      const response = await api.get('/comandas/tempo-livre');
      setDataFetchedAt(Date.now());
      return response.data.data as ServicoTempoLivreEmAndamento[];
    },
    refetchInterval: 30000, // Atualiza a cada 30 segundos
  });

  // Segundos decorridos desde a última busca (para atualização em tempo real)
  const [secondsSinceFetch, setSecondsSinceFetch] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsSinceFetch(Math.floor((Date.now() - dataFetchedAt) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [dataFetchedAt]);

  const formatarTempo = (minutos: number): string => {
    const horas = Math.floor(minutos / 60);
    const mins = Math.round(minutos % 60);
    if (horas > 0) {
      return `${horas}h ${mins.toString().padStart(2, '0')}min`;
    }
    return `${mins}min`;
  };

  const formatarHorario = (data: string): string => {
    // O horário vem do banco já em horário de Brasília (sem timezone)
    // Precisamos extrair diretamente sem conversão de timezone
    const match = data.match(/(\d{2}):(\d{2})/);
    if (match) {
      return `${match[1]}:${match[2]}`;
    }
    // Fallback: tentar parse normal
    return new Date(data).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calcularTempoDecorrido = (servico: ServicoTempoLivreEmAndamento): number => {
    // Usar minutos_decorridos do backend como base (já calculado corretamente com timezone)
    // e adicionar o tempo desde a última atualização dos dados
    const minutosBase = servico.minutos_decorridos || 0;
    const minutosAdicionais = secondsSinceFetch / 60;
    return Math.ceil(minutosBase + minutosAdicionais);
  };

  const handleFinalizar = (servico: ServicoTempoLivreEmAndamento) => {
    setSelectedServico(servico);
    setShowFinalizarModal(true);
  };

  const handleFinalizarSuccess = () => {
    refetch();
    onFinalizarSuccess();
  };

  if (!servicos || servicos.length === 0) {
    return null;
  }

  return (
    <>
      <div className="card bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="font-bold text-green-800">Tempo Livre em Andamento</h3>
          </div>
          <span className="bg-green-600 text-white text-xs font-bold px-2 py-1 rounded-full">
            {servicos.length}
          </span>
        </div>

        <div className="space-y-3">
          {servicos.map((servico) => {
            const tempoDecorrido = calcularTempoDecorrido(servico);
            const tempoAlerta = tempoDecorrido > 60; // Alerta se passou de 1 hora

            return (
              <div
                key={servico.item_id}
                className={`bg-white rounded-lg border p-4 ${
                  tempoAlerta ? 'border-yellow-400' : 'border-green-200'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-gray-900">
                        Quarto {servico.numero_quarto}
                      </span>
                      <span className="text-xs text-gray-500">
                        Comanda #{servico.comanda_numero}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      <span>Entrada: {formatarHorario(servico.hora_entrada)}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {servico.acompanhantes?.map((a) => a.nome).join(', ')}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={`text-2xl font-bold ${
                      tempoAlerta ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {formatarTempo(tempoDecorrido)}
                    </div>
                    <button
                      onClick={() => handleFinalizar(servico)}
                      className="mt-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Finalizar
                    </button>
                  </div>
                </div>

                {tempoAlerta && (
                  <div className="mt-2 flex items-center gap-1 text-yellow-600 text-xs">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>Tempo excedido - verifique se precisa finalizar</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal de Finalizacao */}
      {selectedServico && (
        <FinalizarTempoLivreModal
          isOpen={showFinalizarModal}
          onClose={() => {
            setShowFinalizarModal(false);
            setSelectedServico(null);
          }}
          itemId={selectedServico.item_id}
          numeroQuarto={selectedServico.numero_quarto}
          horaEntrada={selectedServico.hora_entrada}
          acompanhantes={selectedServico.acompanhantes || []}
          onSuccess={handleFinalizarSuccess}
        />
      )}
    </>
  );
};
