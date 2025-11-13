import React, { useState } from 'react';
import { useComissoes } from '../../hooks/useRelatorios';
import { DateRangeFilter } from './DateRangeFilter';

export const ComissoesReport: React.FC = () => {
  const [dataInicio, setDataInicio] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [dataFim, setDataFim] = useState(() => new Date().toISOString().split('T')[0]);
  const [enabled, setEnabled] = useState(true);

  const { data, isLoading, error } = useComissoes(dataInicio, dataFim, enabled);

  const handleFilter = () => {
    setEnabled(false);
    setTimeout(() => setEnabled(true), 100);
  };

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600">Erro ao carregar relatório. Tente novamente.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-4">Relatório de Comissões</h2>

      <DateRangeFilter
        dataInicio={dataInicio}
        dataFim={dataFim}
        onDataInicioChange={setDataInicio}
        onDataFimChange={setDataFim}
        onFilter={handleFilter}
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : !data ? (
        <div className="text-center py-12 text-gray-500">
          <p>Selecione um período e clique em Filtrar</p>
        </div>
      ) : (
        <>
          {/* Cards de Totais */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Total Serviços</p>
                  <p className="text-3xl font-bold mt-1">{data.totais.total_servicos}</p>
                </div>
                <svg className="w-12 h-12 text-purple-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Total Vendido</p>
                  <p className="text-3xl font-bold mt-1">R$ {data.totais.total_vendido.toFixed(2)}</p>
                </div>
                <svg className="w-12 h-12 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Total Comissões</p>
                  <p className="text-3xl font-bold mt-1">R$ {data.totais.total_comissoes.toFixed(2)}</p>
                </div>
                <svg className="w-12 h-12 text-green-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Tabela de Comissões por Acompanhante */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-800">Comissões por Acompanhante</h3>
            </div>

            {data.comissoes.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>Nenhuma comissão encontrada no período selecionado</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acompanhante</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Serviços</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Comandas</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Vendido</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Comissões</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">% Comissão</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data.comissoes.map((item) => {
                      const vendido = parseFloat(item.total_vendido || '0');
                      const comissao = parseFloat(item.total_comissoes || '0');
                      const percentual = vendido > 0 ? (comissao / vendido) * 100 : 0;

                      return (
                        <tr key={item.acompanhante_id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{item.acompanhante_nome}</div>
                              {item.acompanhante_apelido && (
                                <div className="text-sm text-gray-500">{item.acompanhante_apelido}</div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <span className="text-sm text-gray-900">{item.total_servicos}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <span className="text-sm text-gray-900">{item.total_comandas}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <span className="text-sm font-semibold text-blue-600">
                              R$ {vendido.toFixed(2)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <span className="text-sm font-bold text-green-600">
                              R$ {comissao.toFixed(2)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                              {percentual.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td className="px-6 py-4 text-sm font-bold text-gray-900">TOTAL</td>
                      <td className="px-6 py-4 text-right text-sm font-bold text-gray-900">
                        {data.totais.total_servicos}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-bold text-gray-900">-</td>
                      <td className="px-6 py-4 text-right text-sm font-bold text-blue-600">
                        R$ {data.totais.total_vendido.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-bold text-green-600">
                        R$ {data.totais.total_comissoes.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-bold text-purple-600">
                        {data.totais.total_vendido > 0
                          ? ((data.totais.total_comissoes / data.totais.total_vendido) * 100).toFixed(1)
                          : '0.0'}%
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
