import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Comanda, ComandaDetalhada, ApiResponse } from '../types';
import socketService from '../services/socket';
import { useEffect } from 'react';

export const useComandas = () => {
  const queryClient = useQueryClient();

  // Configurar listeners do socket
  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;

    const handleComandaAtualizada = (data: Comanda) => {
      queryClient.invalidateQueries({ queryKey: ['comandas'] });
    };

    const handleComandaCriada = (data: Comanda) => {
      queryClient.invalidateQueries({ queryKey: ['comandas'] });
    };

    const handleComandaFechada = (data: Comanda) => {
      queryClient.invalidateQueries({ queryKey: ['comandas'] });
    };

    socket.on('comanda:atualizada', handleComandaAtualizada);
    socket.on('comanda:criada', handleComandaCriada);
    socket.on('comanda:fechada', handleComandaFechada);

    return () => {
      socket.off('comanda:atualizada', handleComandaAtualizada);
      socket.off('comanda:criada', handleComandaCriada);
      socket.off('comanda:fechada', handleComandaFechada);
    };
  }, [queryClient]);

  // Listar comandas abertas
  const { data: comandas, isLoading, error } = useQuery({
    queryKey: ['comandas'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<Comanda[]>>('/comandas');
      return response.data.data || [];
    },
  });

  // Buscar comanda por número
  const buscarComanda = async (numero: number): Promise<ComandaDetalhada | null> => {
    try {
      const response = await api.get<ApiResponse<ComandaDetalhada>>(`/comandas/${numero}`);
      return response.data.data || null;
    } catch (error) {
      console.error('Erro ao buscar comanda:', error);
      return null;
    }
  };

  // Criar comanda
  const criarComandaMutation = useMutation({
    mutationFn: async (data: { numero: number; cliente_nome?: string }) => {
      const response = await api.post<ApiResponse<Comanda>>('/comandas', data);
      return response.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['comandas'] });
      socketService.emit('comanda:criada', data);
    },
  });

  // Adicionar item à comanda
  const adicionarItemMutation = useMutation({
    mutationFn: async (data: {
      comanda_id: number;
      produto_id: number;
      quantidade: number;
      acompanhante_id?: number;
    }) => {
      const response = await api.post('/comandas/itens', data);
      return response.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['comandas'] });
      queryClient.invalidateQueries({ queryKey: ['comanda', variables.comanda_id] });
      socketService.emit('comanda:atualizada', { id: variables.comanda_id });
    },
  });

  // Fechar comanda
  const fecharComandaMutation = useMutation({
    mutationFn: async (data: {
      id: number;
      forma_pagamento: string;
      observacoes?: string;
    }) => {
      const response = await api.put(`/comandas/${data.id}/fechar`, {
        forma_pagamento: data.forma_pagamento,
        observacoes: data.observacoes,
      });
      return response.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['comandas'] });
      socketService.emit('comanda:fechada', data);
    },
  });

  return {
    comandas,
    isLoading,
    error,
    buscarComanda,
    criarComanda: criarComandaMutation.mutateAsync,
    adicionarItem: adicionarItemMutation.mutateAsync,
    fecharComanda: fecharComandaMutation.mutateAsync,
  };
};
