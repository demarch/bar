/**
 * Hook para gerenciamento de NF-e no frontend
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import {
  Nfe,
  NfeConfiguracao,
  NfeEmitirResponse,
  NfeStatusServico,
  NfeContingenciaStatus,
  CertificadoInfo,
  NfeHomologacaoProgresso,
  ApiResponse
} from '../types';

// =====================================================
// CONFIGURAÇÃO
// =====================================================

export function useNfeConfiguracao() {
  return useQuery<NfeConfiguracao | null>({
    queryKey: ['nfe', 'configuracao'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<NfeConfiguracao>>('/nfe/configuracao');
      return response.data.data || null;
    }
  });
}

export function useSalvarNfeConfiguracao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: Partial<NfeConfiguracao>) => {
      const response = await api.post<ApiResponse<NfeConfiguracao>>('/nfe/configuracao', config);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nfe', 'configuracao'] });
    }
  });
}

// =====================================================
// CERTIFICADO
// =====================================================

export function useValidarCertificado() {
  return useQuery<CertificadoInfo | null>({
    queryKey: ['nfe', 'certificado'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<{ valido: boolean; certificadoInfo?: CertificadoInfo }>>('/nfe/certificado/validar');
      return response.data.data?.certificadoInfo || null;
    }
  });
}

export function useUploadCertificado() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { certificado: string; senha: string }) => {
      const response = await api.post<ApiResponse<CertificadoInfo>>('/nfe/certificado', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nfe', 'certificado'] });
      queryClient.invalidateQueries({ queryKey: ['nfe', 'configuracao'] });
    }
  });
}

// =====================================================
// EMISSÃO
// =====================================================

export function useEmitirNfeComanda() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (comandaId: number) => {
      const response = await api.post<ApiResponse<NfeEmitirResponse>>(`/nfe/emitir/comanda/${comandaId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nfe', 'lista'] });
      queryClient.invalidateQueries({ queryKey: ['nfe', 'homologacao'] });
    }
  });
}

export function useEmitirNfe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post<ApiResponse<NfeEmitirResponse>>('/nfe/emitir', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nfe', 'lista'] });
      queryClient.invalidateQueries({ queryKey: ['nfe', 'homologacao'] });
    }
  });
}

// =====================================================
// CANCELAMENTO E INUTILIZAÇÃO
// =====================================================

export function useCancelarNfe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ nfeId, justificativa }: { nfeId: number; justificativa: string }) => {
      const response = await api.post<ApiResponse>(`/nfe/${nfeId}/cancelar`, { justificativa });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nfe', 'lista'] });
      queryClient.invalidateQueries({ queryKey: ['nfe', 'homologacao'] });
    }
  });
}

export function useInutilizarNumeracao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      serie: number;
      numeroInicial: number;
      numeroFinal: number;
      justificativa: string;
    }) => {
      const response = await api.post<ApiResponse>('/nfe/inutilizar', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nfe', 'inutilizacoes'] });
      queryClient.invalidateQueries({ queryKey: ['nfe', 'homologacao'] });
    }
  });
}

// =====================================================
// CONSULTAS
// =====================================================

export interface NfeListaFiltros {
  dataInicio?: string;
  dataFim?: string;
  status?: string;
  ambiente?: number;
  page?: number;
  limit?: number;
}

export function useNfeLista(filtros: NfeListaFiltros) {
  return useQuery({
    queryKey: ['nfe', 'lista', filtros],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filtros.dataInicio) params.append('dataInicio', filtros.dataInicio);
      if (filtros.dataFim) params.append('dataFim', filtros.dataFim);
      if (filtros.status) params.append('status', filtros.status);
      if (filtros.ambiente) params.append('ambiente', String(filtros.ambiente));
      if (filtros.page) params.append('page', String(filtros.page));
      if (filtros.limit) params.append('limit', String(filtros.limit));

      const response = await api.get<ApiResponse<Nfe[]>>(`/nfe?${params.toString()}`);
      return {
        data: response.data.data || [],
        pagination: (response.data as any).pagination
      };
    }
  });
}

export function useNfeById(id: number | null) {
  return useQuery<Nfe | null>({
    queryKey: ['nfe', 'detalhe', id],
    queryFn: async () => {
      if (!id) return null;
      const response = await api.get<ApiResponse<Nfe>>(`/nfe/${id}`);
      return response.data.data || null;
    },
    enabled: !!id
  });
}

export function useConsultarNfeSefaz() {
  return useMutation({
    mutationFn: async (chaveAcesso: string) => {
      const response = await api.get<ApiResponse>(`/nfe/consultar/${chaveAcesso}`);
      return response.data;
    }
  });
}

// =====================================================
// DANFE
// =====================================================

export function useGerarDanfe() {
  return useMutation({
    mutationFn: async (nfeId: number) => {
      const response = await api.post<ApiResponse<{ pdfBase64: string }>>(`/nfe/${nfeId}/danfe`);
      return response.data;
    }
  });
}

export function useDownloadDanfe() {
  return useMutation({
    mutationFn: async (nfeId: number) => {
      const response = await api.get(`/nfe/${nfeId}/danfe/download`, {
        responseType: 'blob'
      });
      return response.data;
    }
  });
}

// =====================================================
// STATUS E CONTINGÊNCIA
// =====================================================

export function useNfeStatusServico() {
  return useQuery<NfeStatusServico | null>({
    queryKey: ['nfe', 'status-servico'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<NfeStatusServico>>('/nfe/status/servico');
      return response.data.data || null;
    },
    refetchInterval: 60000 // Atualiza a cada 1 minuto
  });
}

export function useNfeContingenciaStatus() {
  return useQuery<NfeContingenciaStatus | null>({
    queryKey: ['nfe', 'contingencia-status'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<NfeContingenciaStatus>>('/nfe/contingencia/status');
      return response.data.data || null;
    }
  });
}

export function useEntrarContingencia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { forma?: number; motivo: string }) => {
      const response = await api.post<ApiResponse>('/nfe/contingencia/entrar', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nfe', 'contingencia-status'] });
    }
  });
}

export function useSairContingencia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await api.post<ApiResponse>('/nfe/contingencia/sair');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nfe', 'contingencia-status'] });
    }
  });
}

export function useNfeFilaContingencia() {
  return useQuery({
    queryKey: ['nfe', 'fila-contingencia'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<any[]>>('/nfe/contingencia/fila');
      return response.data.data || [];
    }
  });
}

export function useProcessarFilaContingencia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await api.post<ApiResponse>('/nfe/contingencia/processar');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nfe', 'fila-contingencia'] });
      queryClient.invalidateQueries({ queryKey: ['nfe', 'lista'] });
    }
  });
}

// =====================================================
// XML E BACKUP
// =====================================================

export function useExportarXmls() {
  return useMutation({
    mutationFn: async (data: { dataInicio: string; dataFim: string; status?: string[]; ambiente?: number }) => {
      const response = await api.post<ApiResponse>('/nfe/xml/exportar', data);
      return response.data;
    }
  });
}

export function useNfeStorageStats() {
  return useQuery({
    queryKey: ['nfe', 'storage-stats'],
    queryFn: async () => {
      const response = await api.get<ApiResponse>('/nfe/storage/estatisticas');
      return response.data.data;
    }
  });
}

export function useRealizarBackup() {
  return useMutation({
    mutationFn: async () => {
      const response = await api.post<ApiResponse>('/nfe/backup');
      return response.data;
    }
  });
}

// =====================================================
// RELATÓRIOS E HOMOLOGAÇÃO
// =====================================================

export function useNfeRelatorioDiario(data?: string) {
  return useQuery({
    queryKey: ['nfe', 'relatorio-diario', data],
    queryFn: async () => {
      const params = data ? `?data=${data}` : '';
      const response = await api.get<ApiResponse>(`/nfe/relatorios/diario${params}`);
      return response.data.data;
    }
  });
}

export function useNfeHomologacaoProgresso() {
  return useQuery<NfeHomologacaoProgresso | null>({
    queryKey: ['nfe', 'homologacao', 'progresso'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<NfeHomologacaoProgresso>>('/nfe/homologacao/progresso');
      return response.data.data || null;
    }
  });
}
