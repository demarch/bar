import React, { useState } from 'react';
import { useRentabilidade } from '../../hooks/useRelatorios';
import { DateRangeFilter } from './DateRangeFilter';

export const RentabilidadeReport: React.FC = () => {
  const [dataInicio, setDataInicio] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [dataFim, setDataFim] = useState(() => new Date().toISOString().split('T')[0]);
  const [enabled, setEnabled] = useState(true);

  const { data, isLoading, error } = useRentabilidade(dataInicio, dataFim, enabled);

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
      <h2 className="text-xl font-bold text-gray-800 mb-4">Análise de Rentabilidade</h2>

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
          {/* Cards de Resumo Financeiro */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Receita Total</p>
                  <p className="text-3xl font-bold mt-1">R$ {data.resumo.total_vendas.toFixed(2)}</p>
                </div>
                <svg className="w-12 h-12 text-green-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm">Despesas (Comissões)</p>
                  <p className="text-3xl font-bold mt-1">R$ {data.resumo.total_comissoes.toFixed(2)}</p>
                </div>
                <svg className="w-12 h-12 text-orange-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Lucro Líquido</p>
                  <p className="text-3xl font-bold mt-1">R$ {data.resumo.lucro_liquido.toFixed(2)}</p>
                </div>
                <svg className="w-12 h-12 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Margem Líquida */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Margem de Lucro Líquida</h3>
              <span className={`text-3xl font-bold ${
                data.resumo.margem_liquida >= 50 ? 'text-green-600' :
                data.resumo.margem_liquida >= 30 ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {data.resumo.margem_liquida.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className={`h-4 rounded-full transition-all ${
                  data.resumo.margem_liquida >= 50 ? 'bg-green-600' :
                  data.resumo.margem_liquida >= 30 ? 'bg-yellow-600' :
                  'bg-red-600'
                }`}
                style={{ width: `${Math.min(data.resumo.margem_liquida, 100)}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Margem de lucro líquida de <strong>{data.resumo.margem_liquida.toFixed(1)}%</strong> sobre o faturamento total
            </p>
          </div>

          {/* Análise DRE Simplificado */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-800">DRE Simplificado (Demonstração do Resultado)</h3>
            </div>
            <div className="p-6 space-y-3">
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-700 font-medium">Receita Bruta</span>
                <span className="text-lg font-bold text-green-600">R$ {data.resumo.total_vendas.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-t border-gray-200">
                <span className="text-gray-700 font-medium">(-) Comissões</span>
                <span className="text-lg font-bold text-red-600">R$ {data.resumo.total_comissoes.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between py-3 border-t-2 border-gray-300 bg-blue-50 -mx-6 px-6">
                <span className="text-gray-900 font-bold">Lucro Líquido</span>
                <span className="text-2xl font-bold text-blue-600">R$ {data.resumo.lucro_liquido.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Vendas por Tipo */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-800">Vendas por Tipo</h3>
              </div>
              <div className="p-6">
                {data.vendas_por_tipo.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">Nenhum dado disponível</p>
                ) : (
                  <div className="space-y-4">
                    {data.vendas_por_tipo.map((item) => {
                      const total = parseFloat(item.total);
                      const comissoes = parseFloat(item.comissoes);
                      const lucro = total - comissoes;
                      const margem = total > 0 ? (lucro / total) * 100 : 0;

                      return (
                        <div key={item.tipo} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                              item.tipo === 'produto'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-purple-100 text-purple-800'
                            }`}>
                              {item.tipo === 'produto' ? 'Produtos' : 'Serviços'}
                            </span>
                            <span className="text-lg font-bold text-gray-900">
                              R$ {total.toFixed(2)}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            <div className="flex justify-between">
                              <span>Itens vendidos:</span>
                              <span className="font-semibold">{item.quantidade_itens}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Comissões:</span>
                              <span className="font-semibold text-red-600">R$ {comissoes.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Lucro:</span>
                              <span className="font-semibold text-green-600">R$ {lucro.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Margem:</span>
                              <span className="font-semibold text-blue-600">{margem.toFixed(1)}%</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Vendas por Forma de Pagamento */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-800">Vendas por Forma de Pagamento</h3>
              </div>
              <div className="p-6">
                {data.vendas_por_pagamento.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">Nenhum dado disponível</p>
                ) : (
                  <div className="space-y-3">
                    {data.vendas_por_pagamento.map((item) => {
                      const total = parseFloat(item.total_valor);
                      const percentual = data.resumo.total_vendas > 0
                        ? (total / data.resumo.total_vendas) * 100
                        : 0;

                      const formasPagamento: Record<string, { label: string, color: string }> = {
                        dinheiro: { label: 'Dinheiro', color: 'bg-green-500' },
                        debito: { label: 'Débito', color: 'bg-blue-500' },
                        credito: { label: 'Crédito', color: 'bg-purple-500' },
                        pix: { label: 'PIX', color: 'bg-cyan-500' },
                        misto: { label: 'Misto', color: 'bg-orange-500' },
                      };

                      const info = formasPagamento[item.forma_pagamento] || { label: item.forma_pagamento, color: 'bg-gray-500' };

                      return (
                        <div key={item.forma_pagamento} className="flex items-center justify-between">
                          <div className="flex items-center flex-1">
                            <div className={`w-3 h-3 rounded-full ${info.color} mr-3`}></div>
                            <span className="text-sm font-medium text-gray-700">{info.label}</span>
                          </div>
                          <div className="text-right ml-4">
                            <div className="text-sm font-bold text-gray-900">
                              R$ {total.toFixed(2)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {item.quantidade_comandas} comandas ({percentual.toFixed(1)}%)
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
