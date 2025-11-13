import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { MovimentoCaixa, ApiResponse } from '../types';
import socketService from '../services/socket';

export const useCaixa = () => {
  const queryClient = useQueryClient();

  // Buscar caixa aberto
  const { data: caixaAberto, isLoading, error } = useQuery({
    queryKey: ['caixa', 'aberto'],
    queryFn: async () => {
      try {
        const response = await api.get<ApiResponse<MovimentoCaixa>>('/caixa/aberto');
        return response.data.data;
      } catch (error: any) {
        if (error.response?.status === 404) {
          return null;
        }
        throw error;
      }
    },
  });

  // Abrir caixa
  const abrirCaixaMutation = useMutation({
    mutationFn: async (valor_abertura: number) => {
      const response = await api.post<ApiResponse<MovimentoCaixa>>('/caixa/abrir', {
        valor_abertura,
      });
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caixa'] });
      socketService.emit('caixa:atualizado', {});
    },
  });

  // Fechar caixa
  const fecharCaixaMutation = useMutation({
    mutationFn: async (data: { valor_fechamento: number; observacoes?: string }) => {
      const response = await api.put<ApiResponse<MovimentoCaixa>>('/caixa/fechar', data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caixa'] });
      socketService.emit('caixa:atualizado', {});
    },
  });

  // Registrar sangria
  const registrarSangriaMutation = useMutation({
    mutationFn: async (data: { valor: number; descricao: string }) => {
      const response = await api.post('/caixa/sangria', data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caixa'] });
      socketService.emit('caixa:atualizado', {});
    },
  });

  return {
    caixaAberto,
    isLoading,
    error,
    abrirCaixa: abrirCaixaMutation.mutateAsync,
    fecharCaixa: fecharCaixaMutation.mutateAsync,
    registrarSangria: registrarSangriaMutation.mutateAsync,
  };
};
