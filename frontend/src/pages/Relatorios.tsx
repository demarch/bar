import React, { useState } from 'react';
import { Layout } from '../components/Layout';
import { FluxoCaixaReport } from '../components/relatorios/FluxoCaixaReport';
import { ComissoesReport } from '../components/relatorios/ComissoesReport';
import { VendasReport } from '../components/relatorios/VendasReport';
import { RentabilidadeReport } from '../components/relatorios/RentabilidadeReport';

type TabType = 'fluxo-caixa' | 'comissoes' | 'vendas' | 'rentabilidade';

export const Relatorios: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('fluxo-caixa');

  const tabs = [
    {
      id: 'fluxo-caixa' as TabType,
      label: 'Fluxo de Caixa',
      icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
    },
    {
      id: 'comissoes' as TabType,
      label: 'Comissões',
      icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z'
    },
    {
      id: 'vendas' as TabType,
      label: 'Vendas',
      icon: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z'
    },
    {
      id: 'rentabilidade' as TabType,
      label: 'Rentabilidade',
      icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
    },
  ];

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Relatórios</h1>
          <p className="text-gray-600 mt-2">Análises financeiras e operacionais do estabelecimento</p>
        </div>

        {/* Tabs Navigation */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                  </svg>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'fluxo-caixa' && <FluxoCaixaReport />}
            {activeTab === 'comissoes' && <ComissoesReport />}
            {activeTab === 'vendas' && <VendasReport />}
            {activeTab === 'rentabilidade' && <RentabilidadeReport />}
          </div>
        </div>
      </div>
    </Layout>
  );
};
