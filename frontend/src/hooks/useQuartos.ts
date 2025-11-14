import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { ApiResponse } from '../types';
import socketService from '../services/socket';
import { useEffect } from 'react';

interface ConfiguracaoQuarto {
  id: number;
  minutos: number;
  descricao: string;
  valor: number;
  ativo: boolean;
}

interface QuartoOcupado {
  id: number;
  comanda_id: number;
  comanda_numero: number;
  acompanhante_id: number;
  acompanhante_nome: string;
  numero_quarto: number;
  hora_inicio: string;
  minutos_decorridos: number;
  status: string;
}

interface QuartoDisponivel {
  numero: number;
  nome: string;
  ocupado: boolean;
  disponivel: boolean;
}

export const useQuartos = () => {
  const queryClient = useQueryClient();

  // Configurar listeners do socket
  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;

    const handleQuartoAtualizado = () => {
      queryClient.invalidateQueries({ queryKey: ['quartos-ocupados'] });
      queryClient.invalidateQueries({ queryKey: ['comandas'] });
    };

    socket.on('quarto:atualizado', handleQuartoAtualizado);

    return () => {
      socket.off('quarto:atualizado', handleQuartoAtualizado);
    };
  }, [queryClient]);

  // Buscar configurações de quartos
  const { data: configuracoes, isLoading: loadingConfiguracoes } = useQuery({
    queryKey: ['quartos-configuracoes'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<ConfiguracaoQuarto[]>>(
        '/quartos/configuracoes'
      );
      return response.data.data || [];
    },
  });

  // Buscar quartos disponíveis
  const { data: quartosDisponiveis, isLoading: loadingDisponiveis } = useQuery({
    queryKey: ['quartos-disponiveis'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<QuartoDisponivel[]>>('/quartos/disponiveis');
      return response.data.data || [];
    },
  });

  // Buscar quartos ocupados
  const {
    data: quartosOcupados,
    isLoading: loadingOcupados,
    refetch: refetchOcupados,
  } = useQuery({
    queryKey: ['quartos-ocupados'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<QuartoOcupado[]>>('/quartos/ocupados');
      return response.data.data || [];
    },
    refetchInterval: 30000, // Refetch a cada 30 segundos para atualizar tempo
  });

  // Ocupar quarto
  const ocuparQuartoMutation = useMutation({
    mutationFn: async (data: {
      comanda_id: number;
      numero_quarto: number;
      acompanhante_id: number;
    }) => {
      const response = await api.post('/quartos/ocupar', data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quartos-ocupados'] });
      queryClient.invalidateQueries({ queryKey: ['comandas'] });
      socketService.emit('quarto:atualizado', { action: 'ocupar' });
    },
  });

  // Finalizar ocupação
  const finalizarOcupacaoMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await api.put(`/quartos/${id}/finalizar`);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quartos-ocupados'] });
      queryClient.invalidateQueries({ queryKey: ['comandas'] });
      queryClient.invalidateQueries({ queryKey: ['caixa-aberto'] });
      socketService.emit('quarto:atualizado', { action: 'finalizar' });
    },
  });

  // Cancelar ocupação
  const cancelarOcupacaoMutation = useMutation({
    mutationFn: async (data: { id: number; observacoes: string }) => {
      const response = await api.put(`/quartos/${data.id}/cancelar`, {
        observacoes: data.observacoes,
      });
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quartos-ocupados'] });
      queryClient.invalidateQueries({ queryKey: ['comandas'] });
      socketService.emit('quarto:atualizado', { action: 'cancelar' });
    },
  });

  return {
    configuracoes,
    loadingConfiguracoes,
    quartosDisponiveis,
    loadingDisponiveis,
    quartosOcupados,
    loadingOcupados,
    refetchOcupados,
    ocuparQuarto: ocuparQuartoMutation.mutateAsync,
    finalizarOcupacao: finalizarOcupacaoMutation.mutateAsync,
    cancelarOcupacao: cancelarOcupacaoMutation.mutateAsync,
  };
};
