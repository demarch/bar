import React from 'react';

interface DateRangeFilterProps {
  dataInicio: string;
  dataFim: string;
  onDataInicioChange: (value: string) => void;
  onDataFimChange: (value: string) => void;
  onFilter: () => void;
}

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  dataInicio,
  dataFim,
  onDataInicioChange,
  onDataFimChange,
  onFilter,
}) => {
  const handleQuickFilter = (days: number) => {
    const fim = new Date();
    const inicio = new Date();
    inicio.setDate(inicio.getDate() - days);

    onDataInicioChange(inicio.toISOString().split('T')[0]);
    onDataFimChange(fim.toISOString().split('T')[0]);

    // Trigger filter automatically after setting dates
    setTimeout(onFilter, 100);
  };

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
      <div className="flex flex-wrap items-end gap-4">
        {/* Data Início */}
        <div className="flex-1 min-w-[200px]">
          <label htmlFor="dataInicio" className="block text-sm font-medium text-gray-700 mb-2">
            Data Início
          </label>
          <input
            type="date"
            id="dataInicio"
            value={dataInicio}
            onChange={(e) => onDataInicioChange(e.target.value)}
            className="input"
            max={dataFim || undefined}
          />
        </div>

        {/* Data Fim */}
        <div className="flex-1 min-w-[200px]">
          <label htmlFor="dataFim" className="block text-sm font-medium text-gray-700 mb-2">
            Data Fim
          </label>
          <input
            type="date"
            id="dataFim"
            value={dataFim}
            onChange={(e) => onDataFimChange(e.target.value)}
            className="input"
            min={dataInicio || undefined}
            max={new Date().toISOString().split('T')[0]}
          />
        </div>

        {/* Botão Filtrar */}
        <div>
          <button
            onClick={onFilter}
            disabled={!dataInicio || !dataFim}
            className="btn-primary"
          >
            <svg className="w-5 h-5 mr-2 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filtrar
          </button>
        </div>
      </div>

      {/* Filtros Rápidos */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-sm font-medium text-gray-700 mb-2">Filtros Rápidos:</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleQuickFilter(0)}
            className="text-sm px-3 py-1 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Hoje
          </button>
          <button
            onClick={() => handleQuickFilter(7)}
            className="text-sm px-3 py-1 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Últimos 7 dias
          </button>
          <button
            onClick={() => handleQuickFilter(30)}
            className="text-sm px-3 py-1 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Últimos 30 dias
          </button>
          <button
            onClick={() => {
              const now = new Date();
              const inicio = new Date(now.getFullYear(), now.getMonth(), 1);
              onDataInicioChange(inicio.toISOString().split('T')[0]);
              onDataFimChange(now.toISOString().split('T')[0]);
              setTimeout(onFilter, 100);
            }}
            className="text-sm px-3 py-1 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Mês Atual
          </button>
          <button
            onClick={() => {
              const now = new Date();
              const inicio = new Date(now.getFullYear(), now.getMonth() - 1, 1);
              const fim = new Date(now.getFullYear(), now.getMonth(), 0);
              onDataInicioChange(inicio.toISOString().split('T')[0]);
              onDataFimChange(fim.toISOString().split('T')[0]);
              setTimeout(onFilter, 100);
            }}
            className="text-sm px-3 py-1 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Mês Passado
          </button>
        </div>
      </div>
    </div>
  );
};
