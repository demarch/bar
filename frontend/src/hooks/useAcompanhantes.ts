import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Acompanhante, ApiResponse } from '../types';

// Tipos específicos
export interface AcompanhantePresente {
  acompanhante_id: number;
  nome: string;
  apelido?: string;
  tipo_acompanhante: 'fixa' | 'rotativa';
  numero_pulseira_fixa?: number;
  percentual_comissao: number;
  numero_pulseira?: number;
  periodo_ativo_id?: number;
  hora_ativacao_atual?: string;
  status_atual?: 'ativa' | 'encerrada_pendente' | 'encerrada_paga';
  total_ativacoes_dia: number;
  periodos_ativos: number;
  periodos_pendentes: number;
  periodos_pagos: number;
  comissoes_periodo_atual: number;
  comissoes_pendentes: number;
  comissoes_pagas: number;
  comissoes_total_dia: number;
}

export interface HistoricoAtivacao {
  id: number;
  acompanhante_id: number;
  acompanhante_nome: string;
  acompanhante_apelido?: string;
  tipo_acompanhante: string;
  data: string;
  numero_pulseira?: number;
  hora_ativacao: string;
  hora_desativacao?: string;
  status_periodo: 'ativa' | 'encerrada_pendente' | 'encerrada_paga';
  valor_comissoes_periodo: number;
  data_pagamento?: string;
  observacoes_pagamento?: string;
  duracao_minutos: number;
}

export interface EstatisticasDia {
  total_acompanhantes: number;
  total_ativacoes: number;
  periodos_ativos: number;
  periodos_pendentes: number;
  periodos_pagos: number;
  comissoes_ativas: number;
  comissoes_pendentes: number;
  comissoes_pagas: number;
  comissoes_total: number;
}

export const useAcompanhantes = () => {
  const { data: acompanhantes, isLoading, error } = useQuery({
    queryKey: ['acompanhantes'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<Acompanhante[]>>('/acompanhantes');
      return response.data.data || [];
    },
  });

  return { acompanhantes, isLoading, error };
};

export const useAcompanhantesAtivas = () => {
  const { data: acompanhantesAtivas, isLoading, error } = useQuery({
    queryKey: ['acompanhantes', 'ativas'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<Acompanhante[]>>('/acompanhantes/ativas');
      return response.data.data || [];
    },
  });

  return { acompanhantesAtivas, isLoading, error };
};

// Hook para acompanhantes presentes hoje (com status de comissões)
export const useAcompanhantesPresentes = () => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['acompanhantes', 'presentes'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<AcompanhantePresente[]>>('/acompanhantes/presentes');
      return response.data.data || [];
    },
    refetchInterval: 30000, // Atualiza a cada 30 segundos
  });

  return {
    acompanhantesPresentes: data,
    isLoading,
    error,
    refetch
  };
};

// Hook para histórico de ativações do dia
export const useHistoricoAtivacoes = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['acompanhantes', 'historico'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<HistoricoAtivacao[]>>('/acompanhantes/historico');
      return response.data.data || [];
    },
    refetchInterval: 30000,
  });

  return { historico: data, isLoading, error };
};

// Hook para estatísticas do dia
export const useEstatisticasDia = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['acompanhantes', 'estatisticas-dia'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<EstatisticasDia>>('/acompanhantes/estatisticas-dia');
      return response.data.data;
    },
    refetchInterval: 30000,
  });

  return { estatisticas: data, isLoading, error };
};

// Hook para encerrar período
export const useEncerrarPeriodo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ periodoId, marcarComoPaga }: { periodoId: number; marcarComoPaga: boolean }) => {
      const response = await api.post(`/acompanhantes/periodo/${periodoId}/encerrar`, {
        marcar_como_paga: marcarComoPaga,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['acompanhantes', 'presentes'] });
      queryClient.invalidateQueries({ queryKey: ['acompanhantes', 'historico'] });
      queryClient.invalidateQueries({ queryKey: ['acompanhantes', 'estatisticas-dia'] });
    },
  });
};

// Hook para marcar comissões como pagas
export const useMarcarComissoesPagas = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ periodoId, observacoes }: { periodoId: number; observacoes?: string }) => {
      const response = await api.post(`/acompanhantes/periodo/${periodoId}/pagar`, {
        observacoes,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['acompanhantes', 'presentes'] });
      queryClient.invalidateQueries({ queryKey: ['acompanhantes', 'historico'] });
      queryClient.invalidateQueries({ queryKey: ['acompanhantes', 'estatisticas-dia'] });
    },
  });
};
