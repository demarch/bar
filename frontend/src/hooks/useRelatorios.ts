import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

// ============ TYPES ============

export interface FluxoCaixaData {
  caixas: Array<{
    id: number;
    data_abertura: string;
    data_fechamento: string | null;
    valor_abertura: string;
    valor_fechamento: string | null;
    total_vendas: string;
    total_sangrias: string;
    total_comissoes: string;
    observacoes: string | null;
  }>;
  totais: {
    total_vendas: number;
    total_sangrias: number;
    total_comissoes: number;
    lucro_liquido: number;
  };
  periodo: {
    data_inicio: string;
    data_fim: string;
  };
}

export interface ComissoesData {
  comissoes: Array<{
    acompanhante_id: number;
    acompanhante_nome: string;
    acompanhante_apelido: string | null;
    total_servicos: string;
    total_comandas: string;
    total_comissoes: string;
    total_vendido: string;
  }>;
  totais: {
    total_servicos: number;
    total_comissoes: number;
    total_vendido: number;
  };
  periodo: {
    data_inicio: string;
    data_fim: string;
  };
}

export interface VendasData {
  vendas_por_produto: Array<{
    produto_id: number;
    produto_nome: string;
    categoria_nome: string | null;
    produto_tipo: string;
    quantidade_vendida: string;
    total_unidades: string;
    total_vendido: string;
    total_comissoes: string;
  }>;
  vendas_por_categoria: Array<{
    categoria_id: number;
    categoria_nome: string;
    produtos_diferentes: string;
    total_unidades: string;
    total_vendido: string;
  }>;
  totais: {
    total_itens: number;
    total_unidades: number;
    total_vendido: number;
    total_comissoes: number;
  };
  periodo: {
    data_inicio: string;
    data_fim: string;
  };
}

export interface RentabilidadeData {
  resumo: {
    total_vendas: number;
    total_comissoes: number;
    total_sangrias: number;
    lucro_bruto: number;
    lucro_liquido: number;
    margem_liquida: number;
  };
  vendas_por_tipo: Array<{
    tipo: string;
    total: string;
    comissoes: string;
    quantidade_itens: string;
  }>;
  vendas_por_pagamento: Array<{
    forma_pagamento: string;
    quantidade_comandas: string;
    total_valor: string;
  }>;
  periodo: {
    data_inicio: string;
    data_fim: string;
  };
}

// ============ HOOKS ============

export const useFluxoCaixa = (dataInicio: string, dataFim: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['relatorio-fluxo-caixa', dataInicio, dataFim],
    queryFn: async () => {
      const response = await api.get('/relatorios/fluxo-caixa', {
        params: { data_inicio: dataInicio, data_fim: dataFim },
      });
      return response.data.data as FluxoCaixaData;
    },
    enabled: enabled && !!dataInicio && !!dataFim,
  });
};

export const useComissoes = (dataInicio: string, dataFim: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['relatorio-comissoes', dataInicio, dataFim],
    queryFn: async () => {
      const response = await api.get('/relatorios/comissoes', {
        params: { data_inicio: dataInicio, data_fim: dataFim },
      });
      return response.data.data as ComissoesData;
    },
    enabled: enabled && !!dataInicio && !!dataFim,
  });
};

export const useVendas = (dataInicio: string, dataFim: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['relatorio-vendas', dataInicio, dataFim],
    queryFn: async () => {
      const response = await api.get('/relatorios/vendas', {
        params: { data_inicio: dataInicio, data_fim: dataFim },
      });
      return response.data.data as VendasData;
    },
    enabled: enabled && !!dataInicio && !!dataFim,
  });
};

export const useRentabilidade = (dataInicio: string, dataFim: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['relatorio-rentabilidade', dataInicio, dataFim],
    queryFn: async () => {
      const response = await api.get('/relatorios/rentabilidade', {
        params: { data_inicio: dataInicio, data_fim: dataFim },
      });
      return response.data.data as RentabilidadeData;
    },
    enabled: enabled && !!dataInicio && !!dataFim,
  });
};
