import React, { useState } from 'react';
import {
  useAcompanhantesPresentes,
  useEstatisticasDia,
  useEncerrarPeriodo,
  useMarcarComissoesPagas,
  AcompanhantePresente,
} from '../hooks/useAcompanhantes';

const DashboardAcompanhantes: React.FC = () => {
  const { acompanhantesPresentes, isLoading, refetch } = useAcompanhantesPresentes();
  const { estatisticas } = useEstatisticasDia();
  const encerrarPeriodo = useEncerrarPeriodo();
  const marcarPagas = useMarcarComissoesPagas();

  const [selectedPeriodo, setSelectedPeriodo] = useState<number | null>(null);
  const [observacoes, setObservacoes] = useState('');

  const handleEncerrar = async (acomp: AcompanhantePresente, pagar: boolean) => {
    if (!acomp.periodo_ativo_id) return;

    try {
      await encerrarPeriodo.mutateAsync({
        periodoId: acomp.periodo_ativo_id,
        marcarComoPaga: pagar,
      });
      refetch();
      alert(pagar ? 'Período encerrado e pago!' : 'Período encerrado!');
    } catch (error) {
      alert('Erro ao encerrar período');
    }
  };

  const handlePagar = async (periodoId: number) => {
    try {
      await marcarPagas.mutateAsync({ periodoId, observacoes });
      setSelectedPeriodo(null);
      setObservacoes('');
      refetch();
      alert('Comissões marcadas como pagas!');
    } catch (error) {
      alert('Erro ao marcar como pago');
    }
  };

  const getStatusBadge = (status?: string) => {
    const styles = {
      ativa: 'bg-green-100 text-green-800 border border-green-300',
      encerrada_pendente: 'bg-yellow-100 text-yellow-800 border border-yellow-300',
      encerrada_paga: 'bg-blue-100 text-blue-800 border border-blue-300',
    };

    const labels = {
      ativa: '🟢 Ativa',
      encerrada_pendente: '🟡 Pendente',
      encerrada_paga: '🔵 Paga',
    };

    const style = styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800';
    const label = labels[status as keyof typeof labels] || 'N/A';

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${style}`}>
        {label}
      </span>
    );
  };

  if (isLoading) return <div className="p-8">Carregando...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Dashboard de Acompanhantes</h1>

      {/* Estatísticas */}
      {estatisticas && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Presentes Hoje</div>
            <div className="text-2xl font-bold">{estatisticas.total_acompanhantes}</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg shadow">
            <div className="text-sm text-green-700">Comissões Ativas</div>
            <div className="text-2xl font-bold text-green-800">
              R$ {parseFloat(String(estatisticas.comissoes_ativas || 0)).toFixed(2)}
            </div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg shadow">
            <div className="text-sm text-yellow-700">Comissões Pendentes</div>
            <div className="text-2xl font-bold text-yellow-800">
              R$ {parseFloat(String(estatisticas.comissoes_pendentes || 0)).toFixed(2)}
            </div>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg shadow">
            <div className="text-sm text-blue-700">Comissões Pagas</div>
            <div className="text-2xl font-bold text-blue-800">
              R$ {parseFloat(String(estatisticas.comissoes_pagas || 0)).toFixed(2)}
            </div>
          </div>
        </div>
      )}

      {/* Lista de Acompanhantes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {acompanhantesPresentes?.map((acomp) => (
          <div key={acomp.acompanhante_id} className="bg-white rounded-lg shadow-lg p-4">
            {/* Cabeçalho */}
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-bold text-lg">{acomp.nome}</h3>
                {acomp.apelido && <p className="text-sm text-gray-600">{acomp.apelido}</p>}
              </div>
              {getStatusBadge(acomp.status_atual)}
            </div>

            {/* Pulseira */}
            <div className="mb-3 p-2 bg-gray-50 rounded">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Pulseira:</span>
                <span className="font-bold text-lg">
                  {acomp.numero_pulseira || acomp.numero_pulseira_fixa || '-'}
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {acomp.tipo_acompanhante === 'fixa' ? '📌 Fixa' : '🔄 Rotativa'}
              </div>
            </div>

            {/* Comissões */}
            <div className="space-y-2 mb-4 text-sm">
              {acomp.status_atual === 'ativa' && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Período atual:</span>
                  <span className="font-semibold text-green-700">
                    R$ {parseFloat(String(acomp.comissoes_periodo_atual)).toFixed(2)}
                  </span>
                </div>
              )}
              {acomp.periodos_pendentes > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Pendente ({acomp.periodos_pendentes}x):</span>
                  <span className="font-semibold text-yellow-700">
                    R$ {parseFloat(String(acomp.comissoes_pendentes)).toFixed(2)}
                  </span>
                </div>
              )}
              {acomp.periodos_pagos > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Pago ({acomp.periodos_pagos}x):</span>
                  <span className="font-semibold text-blue-700">
                    R$ {parseFloat(String(acomp.comissoes_pagas)).toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t">
                <span className="font-bold">Total do dia:</span>
                <span className="font-bold text-purple-700">
                  R$ {parseFloat(String(acomp.comissoes_total_dia)).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Ações */}
            <div className="flex gap-2">
              {acomp.status_atual === 'ativa' && (
                <>
                  <button
                    onClick={() => handleEncerrar(acomp, false)}
                    className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-2 rounded text-sm font-semibold"
                  >
                    Encerrar
                  </button>
                  <button
                    onClick={() => handleEncerrar(acomp, true)}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded text-sm font-semibold"
                  >
                    Encerrar e Pagar
                  </button>
                </>
              )}
              {acomp.periodos_pendentes > 0 && acomp.status_atual !== 'ativa' && (
                <button
                  onClick={() => setSelectedPeriodo(acomp.acompanhante_id)}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded text-sm font-semibold"
                >
                  Marcar como Pago
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal simples para pagamento */}
      {selectedPeriodo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Confirmar Pagamento</h3>
            <textarea
              className="w-full border rounded p-2 mb-4"
              placeholder="Observações (opcional)"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={3}
            />
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedPeriodo(null)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 px-4 py-2 rounded"
              >
                Cancelar
              </button>
              <button
                onClick={() => handlePagar(selectedPeriodo)}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
              >
                Confirmar Pagamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardAcompanhantes;
