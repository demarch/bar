import React from 'react';
import { useQuartos } from '../../hooks/useQuartos';
import { QuartosSection } from './QuartosSection';

export const ConfiguracoesTab: React.FC = () => {
  const { configuracoes } = useQuartos();

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Configurações do Sistema</h2>
        <p className="text-gray-600 mt-1">Gerencie quartos e configurações gerais do sistema</p>
      </div>

      {/* Quartos Disponíveis */}
      <QuartosSection />

      {/* Configurações de Tempo/Preço dos Quartos */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="flex items-center mb-4">
          <svg className="w-6 h-6 text-primary-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <h3 className="text-xl font-bold text-gray-800">Tabela de Preços - Quartos</h3>
        </div>

        {!configuracoes || configuracoes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>Nenhuma configuração de quarto cadastrada</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Faixa de Tempo</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Descrição</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {configuracoes.map((config) => {
                  const horas = Math.floor(config.minutos / 60);
                  const mins = config.minutos % 60;
                  const tempoFormatado = horas > 0
                    ? `${horas}h${mins > 0 ? ` ${mins}min` : ''}`
                    : `${mins}min`;

                  return (
                    <tr key={config.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-primary-600">
                          Até {tempoFormatado}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-700">{config.descricao}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-bold text-green-600">
                          R$ {parseFloat(config.valor.toString()).toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">Como funciona:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>O sistema calcula automaticamente o valor com base no tempo de ocupação</li>
                <li>Se o tempo ultrapassar todas as faixas, será cobrado o valor da faixa mais alta</li>
                <li>O valor é lançado automaticamente na comanda ao finalizar a ocupação</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Outras Configurações */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <svg className="w-6 h-6 text-primary-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <h3 className="text-xl font-bold text-gray-800">Configurações Gerais</h3>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-200">
            <div>
              <p className="font-medium text-gray-800">Nome do Estabelecimento</p>
              <p className="text-sm text-gray-600">Sistema de Gestão - Bar</p>
            </div>
            <span className="badge-info">Configurado</span>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-gray-200">
            <div>
              <p className="font-medium text-gray-800">Comissão Padrão (Acompanhantes)</p>
              <p className="text-sm text-gray-600">40% sobre serviços</p>
            </div>
            <span className="badge-info">Configurado</span>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium text-gray-800">Versão do Sistema</p>
              <p className="text-sm text-gray-600">1.0.0</p>
            </div>
            <span className="badge-success">Atualizado</span>
          </div>
        </div>
      </div>
    </div>
  );
};
