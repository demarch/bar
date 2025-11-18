import React from 'react';
import { useQuartos } from '../../hooks/useQuartos';

interface QuartosOcupadosProps {
  onFinalizarClick?: (ocupacaoId: number) => void;
}

export const QuartosOcupados: React.FC<QuartosOcupadosProps> = ({ onFinalizarClick }) => {
  const { quartosOcupados, loadingOcupados, configuracoes } = useQuartos();

  const calcularPrevisaoValor = (minutosDecorridos: number): number => {
    if (!configuracoes || configuracoes.length === 0) return 0;

    // Encontrar a configuração adequada baseada no tempo decorrido
    const configOrdenada = [...configuracoes].sort((a, b) => a.minutos - b.minutos);

    // Se o tempo decorrido for menor que o primeiro intervalo
    if (minutosDecorridos < configOrdenada[0].minutos) {
      return configOrdenada[0].valor;
    }

    // Encontrar a faixa apropriada
    for (let i = configOrdenada.length - 1; i >= 0; i--) {
      if (minutosDecorridos >= configOrdenada[i].minutos) {
        return configOrdenada[i].valor;
      }
    }

    // Se ultrapassar o tempo máximo, usar o valor mais alto
    return configOrdenada[configOrdenada.length - 1].valor;
  };

  const formatarTempo = (minutosDecorridos: number): string => {
    const horas = Math.floor(minutosDecorridos / 60);
    const minutos = Math.floor(minutosDecorridos % 60);
    return `${horas}h ${minutos}min`;
  };

  const formatarHorario = (dataHora: string): string => {
    const data = new Date(dataHora);
    return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const getCorPorTempo = (minutosDecorridos: number): string => {
    if (minutosDecorridos < 30) return 'bg-green-50 border-green-200';
    if (minutosDecorridos < 60) return 'bg-yellow-50 border-yellow-200';
    if (minutosDecorridos < 120) return 'bg-orange-50 border-orange-200';
    return 'bg-red-50 border-red-200';
  };

  const getCorTextoPorTempo = (minutosDecorridos: number): string => {
    if (minutosDecorridos < 30) return 'text-green-700';
    if (minutosDecorridos < 60) return 'text-yellow-700';
    if (minutosDecorridos < 120) return 'text-orange-700';
    return 'text-red-700';
  };

  if (loadingOcupados) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Quartos Ocupados</h2>
        <div className="flex justify-center items-center py-8">
          <svg
            className="animate-spin h-8 w-8 text-blue-600"
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
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">Quartos Ocupados</h2>
        <span className="bg-blue-100 text-blue-800 text-sm font-semibold px-3 py-1 rounded-full">
          {quartosOcupados?.length || 0} ocupado(s)
        </span>
      </div>

      {!quartosOcupados || quartosOcupados.length === 0 ? (
        <div className="text-center py-8">
          <svg
            className="w-16 h-16 text-gray-300 mx-auto mb-4"
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
          <p className="text-gray-500 text-lg">Nenhum quarto ocupado no momento</p>
          <p className="text-gray-400 text-sm mt-2">
            Os quartos ocupados aparecerão aqui automaticamente
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {quartosOcupados.map((ocupacao) => {
            const minutosDecorridos = ocupacao.minutos_decorridos;
            const previsaoValor = calcularPrevisaoValor(minutosDecorridos);

            return (
              <div
                key={ocupacao.id}
                className={`border rounded-lg p-4 ${getCorPorTempo(minutosDecorridos)} transition-colors`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-bold text-gray-800">
                        Quarto {ocupacao.numero_quarto}
                      </h3>
                      <span className={`text-xs font-semibold ${getCorTextoPorTempo(minutosDecorridos)}`}>
                        {formatarTempo(minutosDecorridos)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Acompanhante:</span> {ocupacao.acompanhante_nome}
                    </p>
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Comanda:</span> #{ocupacao.comanda_numero}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <p className="text-gray-600">
                      <span className="font-medium">Início:</span> {formatarHorario(ocupacao.hora_inicio)}
                    </p>
                    <p className="text-gray-800 font-semibold mt-1">
                      Previsão: R$ {previsaoValor.toFixed(2)}
                    </p>
                  </div>

                  <button
                    onClick={() => onFinalizarClick?.(ocupacao.id)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                  >
                    Finalizar
                  </button>
                </div>

                {/* Alerta de tempo */}
                {minutosDecorridos >= 105 && minutosDecorridos < 120 && (
                  <div className="mt-3 bg-yellow-100 border border-yellow-300 rounded-lg p-2 flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-yellow-600 flex-shrink-0"
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
                    <span className="text-xs text-yellow-800 font-medium">
                      Atenção: Aproximando de 2 horas
                    </span>
                  </div>
                )}

                {minutosDecorridos >= 120 && (
                  <div className="mt-3 bg-red-100 border border-red-300 rounded-lg p-2 flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-red-600 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span className="text-xs text-red-800 font-medium">
                      Ultrapassou 2 horas de ocupação!
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
